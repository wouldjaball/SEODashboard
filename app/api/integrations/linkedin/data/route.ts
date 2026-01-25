import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { LinkedInSheetsService } from '@/lib/services/linkedin-sheets-service'

// GET - Fetch LinkedIn analytics data from configured Google Sheets
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get company_id from query params
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Verify user has access to this company
    const { data: userCompany, error: accessError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (accessError || !userCompany) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Get the sheet configuration for this company
    const { data: config, error: configError } = await supabase
      .from('linkedin_sheet_configs')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    if (configError) {
      throw configError
    }

    // If no sheet config exists, return null (frontend will use mock data)
    if (!config) {
      return NextResponse.json({
        data: null,
        message: 'No LinkedIn sheet configuration found for this company'
      })
    }

    // Check if any sheets are configured
    if (!config.page_analytics_sheet_id && !config.post_analytics_sheet_id && !config.campaign_analytics_sheet_id) {
      return NextResponse.json({
        data: null,
        message: 'No sheets configured. Please add sheet IDs in the admin settings.'
      })
    }

    // Fetch data from Google Sheets using the LinkedIn Sheets Service
    try {
      const linkedInData = await LinkedInSheetsService.fetchAllLinkedInData(user.id, {
        id: config.id,
        companyId: config.company_id,
        pageAnalyticsSheetId: config.page_analytics_sheet_id,
        pageAnalyticsRange: config.page_analytics_range,
        postAnalyticsSheetId: config.post_analytics_sheet_id,
        postAnalyticsRange: config.post_analytics_range,
        campaignAnalyticsSheetId: config.campaign_analytics_sheet_id,
        campaignAnalyticsRange: config.campaign_analytics_range,
      })

      if (!linkedInData) {
        return NextResponse.json({
          data: null,
          message: 'No data could be fetched from configured sheets'
        })
      }

      return NextResponse.json({ data: linkedInData })
    } catch (sheetError) {
      console.error('Error fetching from Google Sheets:', sheetError)
      const errorMessage = sheetError instanceof Error ? sheetError.message : 'Unknown error'

      // Return a structured error so frontend can handle gracefully
      return NextResponse.json({
        data: null,
        error: 'Failed to fetch data from Google Sheets',
        details: errorMessage,
        hint: errorMessage.includes('403')
          ? 'Please ensure the Google account has access to the specified sheets'
          : errorMessage.includes('404')
          ? 'Sheet not found. Please verify the sheet ID is correct'
          : 'Check the sheet ID and ensure it contains data in the expected format'
      }, { status: 200 }) // Return 200 so frontend can show graceful fallback
    }
  } catch (error) {
    console.error('LinkedIn data fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Failed to fetch LinkedIn data',
      details: errorMessage
    }, { status: 500 })
  }
}
