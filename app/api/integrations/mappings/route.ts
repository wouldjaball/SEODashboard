import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hasAdminAccess } from '@/lib/auth/check-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await hasAdminAccess(user.id)

    // Admin users: fetch mappings for ALL companies (bypasses RLS)
    // Non-admin users: fetch mappings only for their assigned companies
    let companyIds: string[]

    if (isAdmin) {
      const serviceClient = createServiceClient()
      const { data: allCompanies } = await serviceClient
        .from('companies')
        .select('id')
      companyIds = (allCompanies || []).map(c => c.id)
    } else {
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
      companyIds = (userCompanies || []).map(c => c.company_id)
    }

    if (companyIds.length === 0) {
      return NextResponse.json({ mappings: {} })
    }

    // Use service client for admin to bypass RLS on mapping tables
    const queryClient = isAdmin ? createServiceClient() : supabase

    const mappings: Record<string, { gaPropertyId: string; gscSiteId: string; youtubeChannelId: string; linkedinPageId: string }> = {}

    for (const company_id of companyIds) {
      const { data: gaMapping } = await queryClient
        .from('company_ga_mappings')
        .select('ga_property_id')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: gscMapping } = await queryClient
        .from('company_gsc_mappings')
        .select('gsc_site_id')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: youtubeMapping } = await queryClient
        .from('company_youtube_mappings')
        .select('youtube_channel_id')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: linkedinMapping } = await queryClient
        .from('company_linkedin_mappings')
        .select('linkedin_page_id')
        .eq('company_id', company_id)
        .maybeSingle()

      mappings[company_id] = {
        gaPropertyId: gaMapping?.ga_property_id || '',
        gscSiteId: gscMapping?.gsc_site_id || '',
        youtubeChannelId: youtubeMapping?.youtube_channel_id || '',
        linkedinPageId: linkedinMapping?.linkedin_page_id || ''
      }
    }

    return NextResponse.json({ mappings })
  } catch (error) {
    console.error('Fetch mappings error:', error)
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  console.log('=== POST /api/integrations/mappings called ===')
  try {
    const supabase = await createClient()
    console.log('Supabase client created')

    const { data: { user } } = await supabase.auth.getUser()
    console.log('User auth check:', user ? `User ID: ${user.id}` : 'No user')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received mappings request:', JSON.stringify(body, null, 2))

    const { mappings } = body

    if (!mappings || typeof mappings !== 'object') {
      return NextResponse.json({ error: 'Invalid mappings format' }, { status: 400 })
    }

    const isAdmin = await hasAdminAccess(user.id)
    const companyIds = Object.keys(mappings)

    if (!isAdmin) {
      // Non-admin users: verify they have owner/admin role for all companies
      const { data: userCompanies, error: roleError } = await supabase
        .from('user_companies')
        .select('company_id, role')
        .eq('user_id', user.id)
        .in('company_id', companyIds)

      console.log('User company roles:', userCompanies, 'Error:', roleError)

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
            details: 'You are not assigned to this company'
          }, { status: 403 })
        }
        if (!['owner', 'admin'].includes(role)) {
          return NextResponse.json({
            error: `Insufficient permissions for company ${companyId}`,
            details: `Your role is "${role}" but owner/admin is required to manage mappings`
          }, { status: 403 })
        }
      }
    }

    // Admin users: use service client to bypass RLS for mapping operations
    const writeClient = isAdmin ? createServiceClient() : supabase

    // Save mappings for each company using upsert to preserve existing mappings
    for (const [companyId, mapping] of Object.entries(mappings)) {
      console.log(`Processing company ${companyId}:`, mapping)

      const { gaPropertyId, gscSiteId, youtubeChannelId, linkedinPageId } = mapping as {
        gaPropertyId: string;
        gscSiteId: string;
        youtubeChannelId: string;
        linkedinPageId: string
      }

      // GA Property mapping - upsert if set, delete if cleared
      if (gaPropertyId) {
        console.log(`Upserting GA mapping: company_id=${companyId}, ga_property_id=${gaPropertyId}`)

        // Verify the property exists
        const { data: gaProperty, error: gaLookupError } = await writeClient
          .from('ga_properties')
          .select('id')
          .eq('id', gaPropertyId)
          .single()

        if (gaLookupError || !gaProperty) {
          console.error(`GA property not found for id ${gaPropertyId}:`, gaLookupError)
          throw new Error(`GA property with ID "${gaPropertyId}" not found. Please refresh the properties list.`)
        }

        // Delete then insert (upsert doesn't work well with non-unique company_id)
        await writeClient.from('company_ga_mappings').delete().eq('company_id', companyId)
        const { error: gaError } = await writeClient.from('company_ga_mappings').insert({
          company_id: companyId,
          ga_property_id: gaPropertyId
        })
        if (gaError) {
          console.error(`Failed to save GA mapping for company ${companyId}:`, gaError)
          throw gaError
        }
        console.log(`Successfully saved GA mapping for company ${companyId}`)
      } else {
        // Only delete if explicitly cleared (empty string means user selected "None")
        console.log(`Clearing GA mapping for company ${companyId}`)
        await writeClient.from('company_ga_mappings').delete().eq('company_id', companyId)
      }

      // GSC Site mapping
      if (gscSiteId) {
        console.log(`Upserting GSC mapping: company_id=${companyId}, gsc_site_id=${gscSiteId}`)

        // Verify the site exists
        const { data: gscSite, error: gscLookupError } = await writeClient
          .from('gsc_sites')
          .select('id')
          .eq('id', gscSiteId)
          .single()

        if (gscLookupError || !gscSite) {
          console.error(`GSC site not found for id ${gscSiteId}:`, gscLookupError)
          throw new Error(`GSC site with ID "${gscSiteId}" not found. Please refresh the sites list.`)
        }

        await writeClient.from('company_gsc_mappings').delete().eq('company_id', companyId)
        const { error: gscError } = await writeClient.from('company_gsc_mappings').insert({
          company_id: companyId,
          gsc_site_id: gscSiteId
        })
        if (gscError) {
          console.error(`Failed to save GSC mapping for company ${companyId}:`, gscError)
          throw gscError
        }
        console.log(`Successfully saved GSC mapping for company ${companyId}`)
      } else {
        console.log(`Clearing GSC mapping for company ${companyId}`)
        await writeClient.from('company_gsc_mappings').delete().eq('company_id', companyId)
      }

      // YouTube Channel mapping
      if (youtubeChannelId) {
        console.log(`Upserting YouTube mapping: company_id=${companyId}, youtube_channel_id=${youtubeChannelId}`)

        // Verify the channel exists
        const { data: ytChannel, error: ytLookupError } = await writeClient
          .from('youtube_channels')
          .select('id')
          .eq('id', youtubeChannelId)
          .single()

        if (ytLookupError || !ytChannel) {
          console.error(`YouTube channel not found for id ${youtubeChannelId}:`, ytLookupError)
          throw new Error(`YouTube channel with ID "${youtubeChannelId}" not found. Please refresh the channels list.`)
        }

        await writeClient.from('company_youtube_mappings').delete().eq('company_id', companyId)
        const { error: ytError } = await writeClient.from('company_youtube_mappings').insert({
          company_id: companyId,
          youtube_channel_id: youtubeChannelId
        })
        if (ytError) {
          console.error(`Failed to save YouTube mapping for company ${companyId}:`, ytError)
          throw ytError
        }
        console.log(`Successfully saved YouTube mapping for company ${companyId}`)
      } else {
        console.log(`Clearing YouTube mapping for company ${companyId}`)
        await writeClient.from('company_youtube_mappings').delete().eq('company_id', companyId)
      }

      // LinkedIn Page mapping
      if (linkedinPageId) {
        console.log(`Upserting LinkedIn mapping: company_id=${companyId}, linkedin_page_id=${linkedinPageId}`)

        // Verify the page exists
        const { data: liPage, error: liLookupError } = await writeClient
          .from('linkedin_pages')
          .select('id')
          .eq('id', linkedinPageId)
          .single()

        if (liLookupError || !liPage) {
          console.error(`LinkedIn page not found for id ${linkedinPageId}:`, liLookupError)
          throw new Error(`LinkedIn page with ID "${linkedinPageId}" not found. Please add it first.`)
        }

        await writeClient.from('company_linkedin_mappings').delete().eq('company_id', companyId)
        const { error: liError } = await writeClient.from('company_linkedin_mappings').insert({
          company_id: companyId,
          linkedin_page_id: linkedinPageId
        })
        if (liError) {
          console.error(`Failed to save LinkedIn mapping for company ${companyId}:`, liError)
          throw liError
        }
        console.log(`Successfully saved LinkedIn mapping for company ${companyId}`)
      } else {
        console.log(`Clearing LinkedIn mapping for company ${companyId}`)
        await writeClient.from('company_linkedin_mappings').delete().eq('company_id', companyId)
      }
    }

    console.log('All mappings saved successfully')

    // Fire-and-forget: trigger targeted sync for the saved companies
    const savedCompanyIds = Object.keys(mappings)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && savedCompanyIds.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const syncUrl = `${baseUrl}/api/cron/sync-analytics?secret=${cronSecret}&companyIds=${savedCompanyIds.join(',')}&force=true`
      fetch(syncUrl, { method: 'GET' }).catch(err => {
        console.error('[Mappings] Background sync trigger failed:', err)
      })
      console.log(`[Mappings] Triggered sync for companies: ${savedCompanyIds.join(', ')}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('=== Save mappings error ===')
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('Error message:', errorMessage)
    console.error('Error stack:', errorDetails)

    return NextResponse.json({
      error: 'Failed to save mappings',
      details: errorMessage,
      message: errorMessage,
      fullError: String(error)
    }, { status: 500 })
  }
}
