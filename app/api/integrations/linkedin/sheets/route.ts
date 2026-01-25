import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Fetch LinkedIn sheet configurations for user's companies
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all companies the user has access to
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json({ configs: {} })
    }

    const companyIds = userCompanies.map(uc => uc.company_id)

    // Fetch sheet configs for all user's companies
    const { data: configs, error } = await supabase
      .from('linkedin_sheet_configs')
      .select('*')
      .in('company_id', companyIds)

    if (error) {
      throw error
    }

    // Convert to a map by company_id for easier lookup
    const configsMap: Record<string, {
      id: string
      pageAnalyticsSheetId: string
      pageAnalyticsRange: string
      postAnalyticsSheetId: string
      postAnalyticsRange: string
      campaignAnalyticsSheetId: string
      campaignAnalyticsRange: string
      demographicsSheetId: string
      demographicsRange: string
    }> = {}

    for (const config of configs || []) {
      configsMap[config.company_id] = {
        id: config.id,
        pageAnalyticsSheetId: config.page_analytics_sheet_id || '',
        pageAnalyticsRange: config.page_analytics_range || 'A:Z',
        postAnalyticsSheetId: config.post_analytics_sheet_id || '',
        postAnalyticsRange: config.post_analytics_range || 'A:Z',
        campaignAnalyticsSheetId: config.campaign_analytics_sheet_id || '',
        campaignAnalyticsRange: config.campaign_analytics_range || 'A:Z',
        demographicsSheetId: config.demographics_sheet_id || '',
        demographicsRange: config.demographics_range || 'A:Z',
      }
    }

    return NextResponse.json({ configs: configsMap })
  } catch (error) {
    console.error('Fetch LinkedIn sheet configs error:', error)
    return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 })
  }
}

// POST - Save LinkedIn sheet configurations
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configs } = body

    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({ error: 'Invalid configs format' }, { status: 400 })
    }

    // Verify user has admin/owner role for all companies
    const companyIds = Object.keys(configs)
    const { data: userCompanies, error: roleError } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)
      .in('company_id', companyIds)

    if (roleError) {
      return NextResponse.json({
        error: 'Failed to verify permissions',
        details: roleError.message
      }, { status: 500 })
    }

    const userRolesMap = new Map(
      (userCompanies || []).map(uc => [uc.company_id, uc.role])
    )

    for (const companyId of companyIds) {
      const role = userRolesMap.get(companyId)
      if (!role) {
        return NextResponse.json({
          error: `No access to company ${companyId}`,
        }, { status: 403 })
      }
      if (!['owner', 'admin'].includes(role)) {
        return NextResponse.json({
          error: `Insufficient permissions for company ${companyId}`,
          details: `Your role is "${role}" but owner/admin is required`
        }, { status: 403 })
      }
    }

    // Save/update configs for each company
    for (const [companyId, config] of Object.entries(configs)) {
      const {
        pageAnalyticsSheetId,
        pageAnalyticsRange,
        postAnalyticsSheetId,
        postAnalyticsRange,
        campaignAnalyticsSheetId,
        campaignAnalyticsRange,
        demographicsSheetId,
        demographicsRange,
      } = config as {
        pageAnalyticsSheetId?: string
        pageAnalyticsRange?: string
        postAnalyticsSheetId?: string
        postAnalyticsRange?: string
        campaignAnalyticsSheetId?: string
        campaignAnalyticsRange?: string
        demographicsSheetId?: string
        demographicsRange?: string
      }

      const { error: upsertError } = await supabase
        .from('linkedin_sheet_configs')
        .upsert({
          company_id: companyId,
          page_analytics_sheet_id: pageAnalyticsSheetId || null,
          page_analytics_range: pageAnalyticsRange || 'A:Z',
          post_analytics_sheet_id: postAnalyticsSheetId || null,
          post_analytics_range: postAnalyticsRange || 'A:Z',
          campaign_analytics_sheet_id: campaignAnalyticsSheetId || null,
          campaign_analytics_range: campaignAnalyticsRange || 'A:Z',
          demographics_sheet_id: demographicsSheetId || null,
          demographics_range: demographicsRange || 'A:Z',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id'
        })

      if (upsertError) {
        console.error(`Failed to save LinkedIn sheet config for company ${companyId}:`, upsertError)
        throw upsertError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save LinkedIn sheet configs error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Failed to save configurations',
      details: errorMessage
    }, { status: 500 })
  }
}
