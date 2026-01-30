import { createClient } from '@/lib/supabase/server'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { LinkedInSheetsService } from '@/lib/services/linkedin-sheets-service'
import { LinkedInAnalyticsService } from '@/lib/services/linkedin-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

// Import LinkedIn mock data for fallback
import {
  liVisitorMetrics,
  liFollowerMetrics,
  liContentMetrics,
  liVisitorDaily,
  liFollowerDaily,
  liImpressionDaily,
  liIndustryDemographics,
  liSeniorityDemographics,
  liJobFunctionDemographics,
  liCompanySizeDemographics,
  liUpdates
} from '@/lib/mock-data/linkedin'

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

    // Verify user has access to this company
    const { data: userCompanyAccess } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!userCompanyAccess) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You do not have access to this company'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let startDate = searchParams.get('startDate') || format(subDays(new Date(), 30), 'yyyy-MM-dd')
    let endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd')
    
    // Validate dates - don't allow future dates beyond today
    const today = new Date()
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    if (endDateObj > today) {
      console.warn('[Analytics API] End date is in the future, adjusting to today:', { originalEnd: endDate, adjustedEnd: format(today, 'yyyy-MM-dd') })
      endDate = format(today, 'yyyy-MM-dd')
    }
    
    if (startDateObj > today) {
      console.warn('[Analytics API] Start date is in the future, adjusting to 30 days ago:', { originalStart: startDate, adjustedStart: format(subDays(today, 30), 'yyyy-MM-dd') })
      startDate = format(subDays(today, 30), 'yyyy-MM-dd')
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = {}

    // Fetch GA data if mapped
    if (gaMappings && gaMappings.ga_properties) {
      try {
        const gaProperty = gaMappings.ga_properties as { property_id: string; user_id: string }
        const propertyId = gaProperty.property_id
        const gaOwnerUserId = gaProperty.user_id  // Use the integration owner's user_id

        console.log('=== GA FETCH DEBUG ===')
        console.log('Logged-in User ID:', user.id)
        console.log('GA Owner User ID:', gaOwnerUserId)
        console.log('GA Property from DB:', JSON.stringify(gaProperty))
        console.log('Property ID being used:', propertyId)
        console.log('Date range:', { startDate, endDate, previousStartDate, previousEndDate })
        
        // Validate OAuth token scopes
        const tokenData = await OAuthTokenService.getTokens(gaOwnerUserId)
        if (tokenData) {
          console.log('GA OAuth token scopes:', tokenData.scope)
          const hasAnalyticsScope = tokenData.scope.includes('analytics.readonly')
          console.log('Has analytics.readonly scope:', hasAnalyticsScope)
          if (!hasAnalyticsScope) {
            throw new Error('OAuth token missing required Google Analytics scope: analytics.readonly')
          }
        }

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
            gaOwnerUserId,
            propertyId,
            startDate,
            endDate,
            previousStartDate,
            previousEndDate
          ),
          GoogleAnalyticsService.fetchWeeklyData(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchChannelData(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchTrafficShare(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchSourcePerformance(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchLandingPages(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchRegions(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchDevices(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchGender(gaOwnerUserId, propertyId, startDate, endDate),
          GoogleAnalyticsService.fetchAge(gaOwnerUserId, propertyId, startDate, endDate)
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
      } catch (error: unknown) {
        const err = error as Error | undefined
        const errorMessage = err?.message || String(error) || 'Unknown error'
        console.error('GA fetch error:', errorMessage)
        console.error('GA fetch error stack:', err?.stack)
        results.gaError = errorMessage
        results.gaErrorDetails = {
          message: errorMessage,
          stack: err?.stack,
          name: err?.name
        }
        // Check if this is a token refresh failure that requires re-authentication
        if (errorMessage.includes('TOKEN_REFRESH_FAILED') || errorMessage.includes('NO_TOKENS')) {
          results.gaRequiresReauth = true
          results.gaErrorType = 'auth_required'
          console.log('[Analytics] GA requires re-authentication for user')
        } else if (errorMessage.includes('missing required Google Analytics scope')) {
          results.gaErrorType = 'scope_missing'
        } else {
          results.gaErrorType = 'api_error'
        }
        
        // Set GA metrics to null when there's an error
        results.gaMetrics = null
        results.gaWeeklyData = []
        results.gaChannelData = []
        results.gaTrafficShare = []
        results.gaSourcePerformance = []
        results.gaLandingPages = []
        results.gaRegions = []
        results.gaDevices = []
        results.gaGender = []
        results.gaAge = []
      }
    }

    // Fetch GSC data if mapped
    if (gscMappings && gscMappings.gsc_sites) {
      try {
        const gscSite = gscMappings.gsc_sites as { site_url: string; user_id: string }
        const gscOwnerUserId = gscSite.user_id  // Use the integration owner's user_id
        
        console.log('=== GSC FETCH DEBUG ===')
        console.log('Logged-in User ID:', user.id)
        console.log('GSC Owner User ID:', gscOwnerUserId)
        console.log('GSC Site URL:', gscSite.site_url)
        console.log('Date range:', { startDate, endDate, previousStartDate, previousEndDate })
        
        // Validate OAuth token scopes
        const tokenData = await OAuthTokenService.getTokens(gscOwnerUserId)
        if (tokenData) {
          console.log('GSC OAuth token scopes:', tokenData.scope)
          const hasWebmastersScope = tokenData.scope.includes('webmasters.readonly')
          console.log('Has webmasters.readonly scope:', hasWebmastersScope)
          if (!hasWebmastersScope) {
            throw new Error('OAuth token missing required Google Search Console scope: webmasters.readonly')
          }
        }
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
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate,
            previousStartDate,
            previousEndDate
          ),
          GoogleSearchConsoleService.fetchWeeklyData(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchKeywords(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate,
            10
          ),
          GoogleSearchConsoleService.fetchCountries(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate,
            10
          ),
          GoogleSearchConsoleService.fetchDevices(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchIndexData(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchLandingPages(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate,
            20
          ),
          // Fetch total counts for KPI cards
          GoogleSearchConsoleService.fetchKeywordCount(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate
          ),
          GoogleSearchConsoleService.fetchIndexedPageCount(
            gscOwnerUserId,
            gscSite.site_url,
            startDate,
            endDate
          ),
          // Fetch previous period counts for comparison
          GoogleSearchConsoleService.fetchKeywordCount(
            gscOwnerUserId,
            gscSite.site_url,
            previousStartDate,
            previousEndDate
          ),
          GoogleSearchConsoleService.fetchIndexedPageCount(
            gscOwnerUserId,
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
      } catch (error: unknown) {
        const err = error as Error | undefined
        const errorMessage = err?.message || String(error) || 'Unknown error'
        console.error('GSC fetch error:', errorMessage)
        results.gscError = errorMessage
        // Check if this is a token refresh failure that requires re-authentication
        if (errorMessage.includes('TOKEN_REFRESH_FAILED') || errorMessage.includes('NO_TOKENS')) {
          results.gscRequiresReauth = true
          results.gscErrorType = 'auth_required'
          console.log('[Analytics] GSC requires re-authentication for user')
        } else if (errorMessage.includes('missing required Google Search Console scope')) {
          results.gscErrorType = 'scope_missing'
        } else {
          results.gscErrorType = 'api_error'
        }
        
        // Set GSC metrics to null when there's an error
        results.gscMetrics = null
        results.gscWeeklyData = []
        results.gscKeywords = []
        results.gscCountries = []
        results.gscDevices = []
        results.gscIndexData = []
        results.gscLandingPages = []
      }
    }

    // Fetch YouTube data if mapped
    if (ytMappings && ytMappings.youtube_channels) {
      try {
        const ytChannel = ytMappings.youtube_channels as { channel_id: string; user_id: string }
        const channelId = ytChannel.channel_id
        const ytOwnerUserId = ytChannel.user_id  // Use the integration owner's user_id

        console.log('=== YouTube FETCH DEBUG ===')
        console.log('Logged-in User ID:', user.id)
        console.log('YouTube Owner User ID:', ytOwnerUserId)
        console.log('YouTube Channel from DB:', JSON.stringify(ytChannel))
        console.log('Channel ID being used:', channelId)

        // Use fallback methods that try Analytics API first, then fall back to public Data API
        const [ytMetrics, ytVideos, ytDailyData] = await Promise.all([
          YouTubeAnalyticsService.fetchMetricsWithFallback(
            ytOwnerUserId,
            channelId,
            startDate,
            endDate,
            previousStartDate,
            previousEndDate
          ),
          YouTubeAnalyticsService.fetchTopVideosWithFallback(
            ytOwnerUserId,
            channelId,
            startDate,
            endDate,
            10
          ),
          YouTubeAnalyticsService.fetchDailyDataWithFallback(
            ytOwnerUserId,
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
      } catch (error: unknown) {
        const err = error as Error | undefined
        const errorMessage = err?.message || String(error) || 'Unknown error'
        console.error('YouTube fetch error:', errorMessage)
        results.ytError = errorMessage
        // Check if this is a token refresh failure that requires re-authentication
        if (errorMessage.includes('TOKEN_REFRESH_FAILED') || errorMessage.includes('NO_TOKENS')) {
          results.ytRequiresReauth = true
          console.log('[Analytics] YouTube requires re-authentication for user')
        }
      }
    }

    // Fetch LinkedIn data - try API first, then Google Sheets, then mock data
    let linkedInDataFetched = false

    // First, try LinkedIn Community Management API
    try {
      // Check for LinkedIn page mapping with OAuth connection
      const { data: linkedinMapping } = await supabase
        .from('company_linkedin_mappings')
        .select('linkedin_page_id')
        .eq('company_id', companyId)
        .maybeSingle()

      if (linkedinMapping?.linkedin_page_id) {
        const { data: linkedinPage } = await supabase
          .from('linkedin_pages')
          .select('*')
          .eq('id', linkedinMapping.linkedin_page_id)
          .single()

        if (linkedinPage?.page_id) {
          const liOwnerUserId = linkedinPage.user_id  // Use the integration owner's user_id

          // Check if the integration owner has LinkedIn OAuth tokens
          const hasLinkedInTokens = await OAuthTokenService.hasValidLinkedInTokens(liOwnerUserId)

          if (hasLinkedInTokens) {
            console.log('=== LinkedIn API FETCH DEBUG ===')
            console.log('Logged-in User ID:', user.id)
            console.log('LinkedIn Owner User ID:', liOwnerUserId)
            console.log('Organization ID:', linkedinPage.page_id)
            
            // Validate LinkedIn OAuth token scopes
            const tokenData = await OAuthTokenService.getLinkedInTokens(liOwnerUserId)
            if (tokenData) {
              console.log('LinkedIn OAuth token scopes:', tokenData.scope)
              const requiredScopes = ['r_organization_social', 'r_organization_followers']
              const hasRequiredScopes = requiredScopes.every(scope => 
                tokenData.scope.includes(scope)
              )
              console.log('Has required LinkedIn scopes:', hasRequiredScopes)
              if (!hasRequiredScopes) {
                throw new Error(`LinkedIn OAuth token missing required scopes: ${requiredScopes.join(', ')}`)
              }
            }

            console.log('=== LINKEDIN API FETCH DEBUG ===')
            console.log('LinkedIn Owner User ID:', liOwnerUserId)
            console.log('LinkedIn Page ID:', linkedinPage.page_id)
            console.log('Date range (after validation):', { startDate, endDate, previousStartDate, previousEndDate })
            
            const linkedInData = await LinkedInAnalyticsService.fetchAllMetrics(
              liOwnerUserId,
              linkedinPage.page_id,
              startDate,
              endDate,
              previousStartDate,
              previousEndDate
            )
            
            console.log('LinkedIn API Response Summary:')
            console.log('- Page Views:', linkedInData.visitorMetrics?.pageViews || 0)
            console.log('- Unique Visitors:', linkedInData.visitorMetrics?.uniqueVisitors || 0)
            console.log('- Custom Button Clicks:', linkedInData.visitorMetrics?.customButtonClicks || 0)
            console.log('- Total Followers:', linkedInData.followerMetrics?.totalFollowers || 0)

            results.liVisitorMetrics = linkedInData.visitorMetrics
            results.liFollowerMetrics = linkedInData.followerMetrics
            results.liContentMetrics = linkedInData.contentMetrics
            results.liVisitorDaily = linkedInData.visitorDaily
            results.liFollowerDaily = linkedInData.followerDaily
            results.liImpressionDaily = linkedInData.impressionDaily
            results.liIndustryDemographics = linkedInData.industryDemographics
            results.liSeniorityDemographics = linkedInData.seniorityDemographics
            results.liJobFunctionDemographics = linkedInData.jobFunctionDemographics
            results.liCompanySizeDemographics = linkedInData.companySizeDemographics
            results.liUpdates = linkedInData.updates
            results.liDataSource = 'api'
            linkedInDataFetched = true
            console.log('[LinkedIn] Successfully fetched data from Community Management API for company:', companyId)
            console.log('[LinkedIn] Data summary - Visitors:', linkedInData.visitorMetrics?.pageViews || 0, 'Followers:', linkedInData.followerMetrics?.totalFollowers || 0)
          }
        }
      }
    } catch (error: unknown) {
      const err = error as Error | undefined
      const errorMessage = err?.message || String(error) || 'Unknown error'
      console.error('LinkedIn API fetch error for company', companyId + ':', errorMessage)
      
      // Set specific error information
      results.liError = errorMessage
      if (errorMessage.includes('missing required scopes')) {
        results.liErrorType = 'scope_missing'
      } else if (errorMessage.includes('TOKEN_REFRESH_FAILED') || errorMessage.includes('NO_TOKENS')) {
        results.liErrorType = 'auth_required'
      } else {
        results.liErrorType = 'api_error'
      }
      
      // Continue to try other sources
    }

    // If API didn't work, try Google Sheets (Power My Analytics)
    if (!linkedInDataFetched) {
      try {
        const { data: linkedinSheetConfig, error: liConfigError } = await supabase
          .from('linkedin_sheet_configs')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle()

        console.log('LinkedIn sheet config lookup:', { linkedinSheetConfig, liConfigError })

        if (linkedinSheetConfig &&
            (linkedinSheetConfig.page_analytics_sheet_id || linkedinSheetConfig.post_analytics_sheet_id)) {
          // Find the company owner's user_id to use their Google OAuth tokens
          const { data: companyOwner } = await supabase
            .from('user_companies')
            .select('user_id')
            .eq('company_id', companyId)
            .eq('role', 'owner')
            .limit(1)
            .maybeSingle()

          const sheetsOwnerUserId = companyOwner?.user_id || user.id  // Fallback to current user

          console.log('=== LinkedIn Sheets FETCH DEBUG ===')
          console.log('Logged-in User ID:', user.id)
          console.log('Sheets Owner User ID:', sheetsOwnerUserId)
          console.log('Config:', JSON.stringify(linkedinSheetConfig))

          const linkedInData = await LinkedInSheetsService.fetchAllLinkedInData(sheetsOwnerUserId, {
            id: linkedinSheetConfig.id,
            companyId: linkedinSheetConfig.company_id,
            pageAnalyticsSheetId: linkedinSheetConfig.page_analytics_sheet_id,
            pageAnalyticsRange: linkedinSheetConfig.page_analytics_range,
            postAnalyticsSheetId: linkedinSheetConfig.post_analytics_sheet_id,
            postAnalyticsRange: linkedinSheetConfig.post_analytics_range,
            campaignAnalyticsSheetId: linkedinSheetConfig.campaign_analytics_sheet_id,
            campaignAnalyticsRange: linkedinSheetConfig.campaign_analytics_range,
          })

          if (linkedInData) {
            results.liVisitorMetrics = linkedInData.visitorMetrics
            results.liFollowerMetrics = linkedInData.followerMetrics
            results.liContentMetrics = linkedInData.contentMetrics
            results.liVisitorDaily = linkedInData.visitorDaily
            results.liFollowerDaily = linkedInData.followerDaily
            results.liImpressionDaily = linkedInData.impressionDaily
            results.liIndustryDemographics = linkedInData.industryDemographics
            results.liSeniorityDemographics = linkedInData.seniorityDemographics
            results.liJobFunctionDemographics = linkedInData.jobFunctionDemographics
            results.liCompanySizeDemographics = linkedInData.companySizeDemographics
            results.liUpdates = linkedInData.updates
            results.liDataSource = 'sheets'
            linkedInDataFetched = true
            console.log('[LinkedIn] Successfully fetched data from Google Sheets')
          }
        }
      } catch (error: unknown) {
        console.error('LinkedIn sheets fetch error:', error)
        const err = error as Error | undefined
        results.liError = err?.message || 'Failed to fetch LinkedIn data from sheets'
      }
    }

    // If still no data, indicate no LinkedIn data available
    if (!linkedInDataFetched) {
      console.log('[LinkedIn] No data source available for company:', companyId)
      results.liError = 'No LinkedIn data configured for this company'
      results.liDataSource = 'none'
      // Set all LinkedIn metrics to null to indicate no data
      results.liVisitorMetrics = null
      results.liFollowerMetrics = null
      results.liContentMetrics = null
      results.liVisitorDaily = []
      results.liFollowerDaily = []
      results.liImpressionDaily = []
      results.liIndustryDemographics = []
      results.liSeniorityDemographics = []
      results.liJobFunctionDemographics = []
      results.liCompanySizeDemographics = []
      results.liUpdates = []
    }

    // Cache the results (1 hour expiry)
    await cacheData(supabase, companyId, startDate, endDate, results)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Fetch analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  startDate: string,
  endDate: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Helper to add LinkedIn mock data as fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addLinkedInMockData(results: any) {
  results.liVisitorMetrics = liVisitorMetrics
  results.liFollowerMetrics = liFollowerMetrics
  results.liContentMetrics = liContentMetrics
  results.liVisitorDaily = liVisitorDaily
  results.liFollowerDaily = liFollowerDaily
  results.liImpressionDaily = liImpressionDaily
  results.liIndustryDemographics = liIndustryDemographics
  results.liSeniorityDemographics = liSeniorityDemographics
  results.liJobFunctionDemographics = liJobFunctionDemographics
  results.liCompanySizeDemographics = liCompanySizeDemographics
  results.liUpdates = liUpdates
}
