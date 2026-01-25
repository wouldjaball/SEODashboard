import { createClient } from '@/lib/supabase/server'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
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

    // Check cache first
    const cached = await checkCache(supabase, companyId, startDate, endDate)
    if (cached) {
      return NextResponse.json(cached)
    }

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

    // Get YouTube mapping
    const { data: ytMapping, error: ytMappingError } = await supabase
      .from('company_youtube_mappings')
      .select('youtube_channel_id')
      .eq('company_id', companyId)
      .maybeSingle()

    console.log('YouTube mapping lookup:', { ytMapping, ytMappingError })

    let ytMappings = null
    if (ytMapping?.youtube_channel_id) {
      const { data: ytChannel, error: ytChannelError } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('id', ytMapping.youtube_channel_id)
        .single()

      console.log('YouTube channel lookup:', { ytChannel, ytChannelError })

      if (ytChannel) {
        ytMappings = {
          youtube_channel_id: ytMapping.youtube_channel_id,
          youtube_channels: ytChannel
        }
      }
    }

    console.log('Final mappings:', { gaMappings, gscMappings, ytMappings })

    if (!gaMappings && !gscMappings && !ytMappings) {
      console.log('No mappings found - returning 404')
      return NextResponse.json({
        error: 'No analytics, search console, or YouTube accounts mapped to this company',
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
        const [
          gscMetrics,
          gscWeeklyData,
          gscKeywords,
          gscCountries,
          gscDevices,
          gscIndexData,
          gscLandingPages,
          totalKeywords,
          totalIndexedPages,
          prevKeywords,
          prevIndexedPages
        ] = await Promise.all([
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
          ),
          GoogleSearchConsoleService.fetchCountries(
            user.id,
            gscSite.site_url,
            startDate,
            endDate,
            10
          ),
          GoogleSearchConsoleService.fetchDevices(
            user.id,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchIndexData(
            user.id,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchLandingPages(
            user.id,
            gscSite.site_url,
            startDate,
            endDate,
            20
          ),
          // Fetch total counts for KPI cards
          GoogleSearchConsoleService.fetchKeywordCount(
            user.id,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchIndexedPageCount(
            user.id,
            gscSite.site_url,
            startDate,
            endDate
          ),
          // Fetch previous period counts for comparison
          GoogleSearchConsoleService.fetchKeywordCount(
            user.id,
            gscSite.site_url,
            previousStartDate,
            previousEndDate
          ),
          GoogleSearchConsoleService.fetchIndexedPageCount(
            user.id,
            gscSite.site_url,
            previousStartDate,
            previousEndDate
          )
        ])

        // Enrich gscMetrics with actual total counts
        const enrichedGscMetrics = {
          ...gscMetrics,
          indexedPages: totalIndexedPages,
          rankingKeywords: totalKeywords,
          previousPeriod: gscMetrics.previousPeriod ? {
            ...gscMetrics.previousPeriod,
            indexedPages: prevIndexedPages,
            rankingKeywords: prevKeywords,
          } : undefined
        }

        results.gscMetrics = enrichedGscMetrics
        results.gscWeeklyData = gscWeeklyData
        results.gscKeywords = gscKeywords
        results.gscCountries = gscCountries
        results.gscDevices = gscDevices
        results.gscIndexData = gscIndexData
        results.gscLandingPages = gscLandingPages
      } catch (error) {
        console.error('GSC fetch error:', error)
        results.gscError = 'Failed to fetch GSC data'
      }
    }

    // Fetch YouTube data if mapped
    if (ytMappings && ytMappings.youtube_channels) {
      try {
        const ytChannel = ytMappings.youtube_channels as any
        const channelId = ytChannel.channel_id

        console.log('=== YouTube FETCH DEBUG ===')
        console.log('User ID:', user.id)
        console.log('YouTube Channel from DB:', JSON.stringify(ytChannel))
        console.log('Channel ID being used:', channelId)

        // Use fallback methods that try Analytics API first, then fall back to public Data API
        const [ytMetrics, ytVideos, ytDailyData] = await Promise.all([
          YouTubeAnalyticsService.fetchMetricsWithFallback(
            user.id,
            channelId,
            startDate,
            endDate,
            previousStartDate,
            previousEndDate
          ),
          YouTubeAnalyticsService.fetchTopVideosWithFallback(
            user.id,
            channelId,
            startDate,
            endDate,
            10
          ),
          YouTubeAnalyticsService.fetchDailyDataWithFallback(
            user.id,
            channelId,
            startDate,
            endDate
          )
        ])

        results.ytMetrics = ytMetrics
        results.ytVideos = ytVideos
        results.ytIsPublicDataOnly = ytMetrics.isPublicDataOnly || false

        // Extract sparkline data from daily data (may be empty if using public fallback)
        results.ytViewsSparkline = ytDailyData.map(d => d.views)
        results.ytWatchTimeSparkline = ytDailyData.map(d => d.watchTime)
        results.ytSharesSparkline = ytDailyData.map(d => d.shares)
        results.ytLikesSparkline = ytDailyData.map(d => d.likes)

        if (ytMetrics.isPublicDataOnly) {
          console.log('[YouTube] Using public Data API fallback - limited metrics available')
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error) || 'Unknown error'
        console.error('YouTube fetch error:', errorMessage)
        results.ytError = errorMessage
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
