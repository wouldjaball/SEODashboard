import { createClient } from '@/lib/supabase/server'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd')

    // Calculate previous period dates
    const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    const previousStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(endDate), daysDiff), 'yyyy-MM-dd')

    // Skip cache temporarily for debugging
    // const cached = await checkCache(supabase, companyId, startDate, endDate)
    // if (cached) {
    //   return NextResponse.json(cached)
    // }

    // Get company mappings
    console.log(`Fetching mappings for company ${companyId}`)

    // First, get the mapping IDs
    const { data: gaMapping, error: gaMappingError } = await supabase
      .from('company_ga_mappings')
      .select('ga_property_id')
      .eq('company_id', companyId)
      .maybeSingle()

    console.log('GA mapping lookup:', { gaMapping, gaMappingError })

    let gaMappings = null
    if (gaMapping?.ga_property_id) {
      // Then fetch the property details
      const { data: gaProperty, error: gaPropError } = await supabase
        .from('ga_properties')
        .select('*')
        .eq('id', gaMapping.ga_property_id)
        .single()

      console.log('GA property lookup:', { gaProperty, gaPropError })

      if (gaProperty) {
        gaMappings = {
          ga_property_id: gaMapping.ga_property_id,
          ga_properties: gaProperty
        }
      }
    }

    const { data: gscMapping, error: gscMappingError } = await supabase
      .from('company_gsc_mappings')
      .select('gsc_site_id')
      .eq('company_id', companyId)
      .maybeSingle()

    console.log('GSC mapping lookup:', { gscMapping, gscMappingError })

    let gscMappings = null
    if (gscMapping?.gsc_site_id) {
      const { data: gscSite, error: gscSiteError } = await supabase
        .from('gsc_sites')
        .select('*')
        .eq('id', gscMapping.gsc_site_id)
        .single()

      console.log('GSC site lookup:', { gscSite, gscSiteError })

      if (gscSite) {
        gscMappings = {
          gsc_site_id: gscMapping.gsc_site_id,
          gsc_sites: gscSite
        }
      }
    }

    console.log('Final mappings:', { gaMappings, gscMappings })

    if (!gaMappings && !gscMappings) {
      console.log('No mappings found - returning 404')
      return NextResponse.json({
        error: 'No analytics or search console accounts mapped to this company',
        message: 'Please configure your integrations in the Accounts page'
      }, { status: 404 })
    }

    const results: any = {}

    // Fetch GA data if mapped
    if (gaMappings && gaMappings.ga_properties) {
      try {
        const gaProperty = gaMappings.ga_properties as any
        const propertyId = gaProperty.property_id

        console.log('=== GA FETCH DEBUG ===')
        console.log('User ID:', user.id)
        console.log('GA Property from DB:', JSON.stringify(gaProperty))
        console.log('Property ID being used:', propertyId)
        console.log('Date range:', { startDate, endDate, previousStartDate, previousEndDate })

        const [
          gaMetrics,
          gaWeeklyData,
          gaChannelData,
          gaTrafficShare,
          gaSourcePerformance,
          gaLandingPages,
          gaRegions,
          gaDevices,
          gaGender,
          gaAge
        ] = await Promise.all([
          GoogleAnalyticsService.fetchMetrics(
            user.id,
            propertyId,
            startDate,
            endDate,
            previousStartDate,
            previousEndDate
          ),
          GoogleAnalyticsService.fetchWeeklyData(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchChannelData(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchTrafficShare(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchSourcePerformance(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchLandingPages(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchRegions(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchDevices(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchGender(user.id, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchAge(user.id, propertyId, startDate, endDate)
        ])

        results.gaMetrics = gaMetrics
        results.gaWeeklyData = gaWeeklyData
        results.gaChannelData = gaChannelData
        results.gaTrafficShare = gaTrafficShare
        results.gaSourcePerformance = gaSourcePerformance
        results.gaLandingPages = gaLandingPages
        results.gaRegions = gaRegions
        results.gaDevices = gaDevices
        results.gaGender = gaGender
        results.gaAge = gaAge
      } catch (error: any) {
        const errorMessage = error?.message || String(error) || 'Unknown error'
        console.error('GA fetch error:', errorMessage)
        console.error('GA fetch error stack:', error?.stack)
        results.gaError = errorMessage
        results.gaErrorDetails = {
          message: errorMessage,
          stack: error?.stack,
          name: error?.name
        }
      }
    }

    // Fetch GSC data if mapped
    if (gscMappings && gscMappings.gsc_sites) {
      try {
        const gscSite = gscMappings.gsc_sites as any
        const [gscMetrics, gscWeeklyData, gscKeywords] = await Promise.all([
          GoogleSearchConsoleService.fetchMetrics(
            user.id,
            gscSite.site_url,
            startDate,
            endDate,
            previousStartDate,
            previousEndDate
          ),
          GoogleSearchConsoleService.fetchWeeklyData(
            user.id,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchKeywords(
            user.id,
            gscSite.site_url,
            startDate,
            endDate,
            10
          )
        ])

        results.gscMetrics = gscMetrics
        results.gscWeeklyData = gscWeeklyData
        results.gscKeywords = gscKeywords
      } catch (error) {
        console.error('GSC fetch error:', error)
        results.gscError = 'Failed to fetch GSC data'
      }
    }

    // Cache the results (1 hour expiry)
    await cacheData(supabase, companyId, startDate, endDate, results)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Fetch analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

async function checkCache(supabase: any, companyId: string, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('analytics_cache')
    .select('*')
    .eq('company_id', companyId)
    .eq('data_type', 'all')
    .eq('date_range_start', startDate)
    .eq('date_range_end', endDate)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data?.data || null
}

async function cacheData(
  supabase: any,
  companyId: string,
  startDate: string,
  endDate: string,
  data: any
) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour cache

  await supabase.from('analytics_cache').insert({
    company_id: companyId,
    data_type: 'all',
    date_range_start: startDate,
    date_range_end: endDate,
    data,
    expires_at: expiresAt.toISOString()
  })
}
