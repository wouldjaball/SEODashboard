import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LIVisitorDaily,
  LIDemographic,
  LIUpdate,
  LIFollowerDaily,
  LIImpressionDaily,
} from '@/lib/types'

interface ManualLinkedInData {
  visitorMetrics: LIVisitorMetrics
  followerMetrics: LIFollowerMetrics
  contentMetrics: LIContentMetrics
  visitorDaily: LIVisitorDaily[]
  followerDaily: LIFollowerDaily[]
  impressionDaily: LIImpressionDaily[]
  industryDemographics: LIDemographic[]
  seniorityDemographics: LIDemographic[]
  jobFunctionDemographics: LIDemographic[]
  companySizeDemographics: LIDemographic[]
  updates: LIUpdate[]
}

/**
 * GET: Fetch manual LinkedIn data for a company and date range
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!companyId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, let's return empty data until we can create the table
    // This ensures the API endpoint works and the UI can load
    const emptyData: ManualLinkedInData = {
      visitorMetrics: {
        pageViews: 0,
        uniqueVisitors: 0,
        customButtonClicks: 0,
        previousPeriod: {
          pageViews: 0,
          uniqueVisitors: 0,
          customButtonClicks: 0
        }
      },
      followerMetrics: {
        totalFollowers: 0,
        newFollowers: 0,
        previousPeriod: {
          totalFollowers: 0,
          newFollowers: 0
        }
      },
      contentMetrics: {
        reactions: 0,
        comments: 0,
        reposts: 0,
        previousPeriod: {
          reactions: 0,
          comments: 0,
          reposts: 0
        }
      },
      visitorDaily: [],
      followerDaily: [],
      impressionDaily: [],
      industryDemographics: [],
      seniorityDemographics: [],
      jobFunctionDemographics: [],
      companySizeDemographics: [],
      updates: []
    }

    return NextResponse.json({ data: emptyData, hasManualData: false })

    // TODO: Uncomment when table is created
    /*
    const { data: manualData, error } = await supabase
      .from('linkedin_manual_data')
      .select('*')
      .eq('company_id', companyId)
      .eq('date_range_start', startDate)
      .eq('date_range_end', endDate)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error fetching manual LinkedIn data:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    if (!manualData) {
      return NextResponse.json({ data: emptyData, hasManualData: false })
    }

    const data: ManualLinkedInData = {
      visitorMetrics: manualData.visitor_metrics || emptyData.visitorMetrics,
      followerMetrics: manualData.follower_metrics || emptyData.followerMetrics,
      contentMetrics: manualData.content_metrics || emptyData.contentMetrics,
      visitorDaily: manualData.visitor_daily || [],
      followerDaily: manualData.follower_daily || [],
      impressionDaily: manualData.impression_daily || [],
      industryDemographics: manualData.demographics?.industry || [],
      seniorityDemographics: manualData.demographics?.seniority || [],
      jobFunctionDemographics: manualData.demographics?.jobFunction || [],
      companySizeDemographics: manualData.demographics?.companySize || [],
      updates: manualData.updates || []
    }

    return NextResponse.json({ data, hasManualData: true })
    */
  } catch (error) {
    console.error('Error in GET /api/linkedin-data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST: Save manual LinkedIn data for a company and date range
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { companyId, dateRangeStart, dateRangeEnd, data } = body

    if (!companyId || !dateRangeStart || !dateRangeEnd || !data) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, just return success until we can create the table
    console.log('Manual LinkedIn data save request:', { companyId, dateRangeStart, dateRangeEnd })
    console.log('Data:', JSON.stringify(data, null, 2))
    
    return NextResponse.json({ success: true, message: 'Data saved successfully (simulated)' })

    // TODO: Uncomment when table is created
    /*
    // Deactivate any existing manual data for this company and date range
    await supabase
      .from('linkedin_manual_data')
      .update({ is_active: false })
      .eq('company_id', companyId)
      .eq('date_range_start', dateRangeStart)
      .eq('date_range_end', dateRangeEnd)

    // Insert new manual data
    const { error } = await supabase
      .from('linkedin_manual_data')
      .insert({
        company_id: companyId,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        visitor_metrics: data.visitorMetrics,
        follower_metrics: data.followerMetrics,
        content_metrics: data.contentMetrics,
        visitor_daily: data.visitorDaily,
        follower_daily: data.followerDaily,
        impression_daily: data.impressionDaily,
        demographics: {
          industry: data.industryDemographics,
          seniority: data.seniorityDemographics,
          jobFunction: data.jobFunctionDemographics,
          companySize: data.companySizeDemographics
        },
        updates: data.updates,
        is_active: true
      })

    if (error) {
      console.error('Error saving manual LinkedIn data:', error)
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    */
  } catch (error) {
    console.error('Error in POST /api/linkedin-data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE: Remove manual LinkedIn data
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!companyId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, just return success
    return NextResponse.json({ success: true, message: 'Data removed successfully (simulated)' })

    // TODO: Uncomment when table is created
    /*
    const { error } = await supabase
      .from('linkedin_manual_data')
      .update({ is_active: false })
      .eq('company_id', companyId)
      .eq('date_range_start', startDate)
      .eq('date_range_end', endDate)

    if (error) {
      console.error('Error deleting manual LinkedIn data:', error)
      return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    */
  } catch (error) {
    console.error('Error in DELETE /api/linkedin-data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}