import { createClient, createServiceClient } from '@/lib/supabase/server'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { LinkedInSheetsService } from '@/lib/services/linkedin-sheets-service'
import { LinkedInAnalyticsService } from '@/lib/services/linkedin-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { assembleCompanyAnalytics } from '@/lib/analytics/normalized-aggregation'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

// Import LinkedIn mock data for fallback
import {
  liVisitorMetrics,
  liFollowerMetrics,
  liContentMetrics,
  liSearchAppearanceMetrics,
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
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await params

    console.log('[Analytics API] === COMPANY ACCESS VALIDATION ===')
    console.log('[Analytics API] User ID:', user.id)
    console.log('[Analytics API] User email:', user.email)
    console.log('[Analytics API] Requested company ID:', companyId)

    // First, let's get the company details to verify it exists
    const { data: companyData, error: companyError } = await serviceClient
      .from('companies')
      .select('id, name, industry')
      .eq('id', companyId)
      .maybeSingle()

    console.log('[Analytics API] Company lookup result:')
    console.log('[Analytics API] - Error:', companyError)
    console.log('[Analytics API] - Company data:', companyData)

    if (companyError) {
      console.error('[Analytics API] Error looking up company:', companyError)
    }

    if (!companyData) {
      console.warn('[Analytics API] Company not found in database:', companyId)
      return NextResponse.json({
        error: 'Company not found',
        message: 'The requested company does not exist in the database'
      }, { status: 404 })
    }

    // Verify user has access to this company
    const { data: userCompanyAccess, error: accessError } = await serviceClient
      .from('user_companies')
      .select('role, company_id, user_id')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    console.log('[Analytics API] User access validation result:')
    console.log('[Analytics API] - Error:', accessError)
    console.log('[Analytics API] - Access data:', userCompanyAccess)

    // Let's also check what companies this user DOES have access to
    const { data: allUserCompanies, error: allAccessError } = await serviceClient
      .from('user_companies')
      .select('company_id, role, companies(id, name)')
      .eq('user_id', user.id)

    console.log('[Analytics API] User\'s all company access:')
    console.log('[Analytics API] - Error:', allAccessError)
    console.log('[Analytics API] - All companies:', allUserCompanies?.map(uc => ({
      companyId: uc.company_id,
      role: uc.role,
      companyName: (uc.companies as any)?.name
    })))

    if (!userCompanyAccess) {
      console.error('[Analytics API] === ACCESS DENIED ===')
      console.error('[Analytics API] User', user.email, 'does not have access to company', companyId, '(', companyData.name, ')')
      console.error('[Analytics API] User has access to', allUserCompanies?.length || 0, 'companies total')
      
      return NextResponse.json({
        error: 'Access denied',
        message: `You do not have access to ${companyData.name}. You have access to ${allUserCompanies?.length || 0} companies. Please check with your administrator.`,
        debug: {
          requestedCompany: { id: companyId, name: companyData.name },
          userCompanies: allUserCompanies?.map(uc => ({
            id: uc.company_id,
            name: (uc.companies as any)?.name,
            role: uc.role
          })) || []
        }
      }, { status: 403 })
    }

    console.log('[Analytics API] === ACCESS GRANTED ===')
    console.log('[Analytics API] User', user.email, 'has', userCompanyAccess.role, 'access to', companyData.name)

    const { searchParams } = new URL(request.url)

    // Optional platform filter (e.g. ?platforms=linkedin or ?platforms=ga,gsc)
    const platformsParam = searchParams.get('platforms')
    const platforms = platformsParam ? platformsParam.split(',') : null

    // Get current date and default to last 30 days
    const today = new Date()
    const defaultEndDate = today
    const defaultStartDate = subDays(defaultEndDate, 30)
    
    let startDate = searchParams.get('startDate') || format(defaultStartDate, 'yyyy-MM-dd')
    let endDate = searchParams.get('endDate') || format(defaultEndDate, 'yyyy-MM-dd')
    
    // Parse and validate dates
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const currentYear = today.getFullYear()
    
    console.log('[Analytics API] Date processing:', { 
      currentYear,
      today: format(today, 'yyyy-MM-dd'),
      requestedStart: startDate, 
      requestedEnd: endDate,
      userProvidedDates: {
        hasStartDate: !!searchParams.get('startDate'),
        hasEndDate: !!searchParams.get('endDate')
      }
    })
    
    // Only validate for reasonable date bounds (not business logic restrictions)
    const minValidDate = new Date('2020-01-01') // Reasonable minimum
    const maxValidDate = new Date()
    maxValidDate.setDate(maxValidDate.getDate() + 1) // Allow today + 1 day
    
    // Only adjust dates if they're completely unreasonable
    if (endDateObj > maxValidDate) {
      endDate = format(today, 'yyyy-MM-dd')
      console.log('[Analytics API] End date adjusted to today (was future):', { originalEnd: format(endDateObj, 'yyyy-MM-dd'), adjustedEnd: endDate })
    }
    
    if (startDateObj < minValidDate) {
      startDate = format(subDays(new Date(endDate), 30), 'yyyy-MM-dd')
      console.log('[Analytics API] Start date adjusted (was too old):', { originalStart: format(startDateObj, 'yyyy-MM-dd'), adjustedStart: startDate })
    }
    
    // Ensure start date is before end date
    if (new Date(startDate) > new Date(endDate)) {
      startDate = format(subDays(new Date(endDate), 30), 'yyyy-MM-dd')
      console.log('[Analytics API] Start date adjusted to be before end date:', { adjustedStart: startDate, endDate })
    }

    // Calculate previous period dates
    const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    const previousStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(endDate), daysDiff), 'yyyy-MM-dd')

    // Pre-fetch LinkedIn and YouTube mappings in parallel with normalized tables query
    // These run concurrently so they're ready if we need to supplement missing data
    const linkedinMappingPromise = supabase
      .from('company_linkedin_mappings')
      .select('linkedin_page_id')
      .eq('company_id', companyId)
      .maybeSingle()

    const ytMappingPromise = serviceClient
      .from('company_youtube_mappings')
      .select('youtube_channel_id')
      .eq('company_id', companyId)
      .maybeSingle()

    // ============================================
    // NORMALIZED TABLES PATH (always try first)
    // ============================================
    console.log(`[Analytics] Trying normalized tables for ${companyId} (${startDate} to ${endDate})`)
    const normalizedResult = await fetchFromNormalizedTables(serviceClient, companyId, startDate, endDate, previousStartDate, previousEndDate)
    if (normalizedResult) {
      // Only use normalized result if it has actual metric data
      const hasData = normalizedResult.gaMetrics || normalizedResult.gscMetrics ||
                      normalizedResult.ytMetrics || normalizedResult.liVisitorMetrics
      if (hasData) {
        // Fetch sync_status to determine data availability and freshness
        const { data: syncRows } = await supabase
          .from('sync_status')
          .select('platform, last_success_at, data_end_date, sync_state, consecutive_failures')
          .eq('company_id', companyId)

        // Check if LinkedIn sync has ever succeeded — trust synced data even if all zeros
        const liSyncStatus = syncRows?.find((s: any) => s.platform === 'linkedin')
        const hasLinkedInData = liSyncStatus?.last_success_at != null
        if (!hasLinkedInData) {
          // LinkedIn has never been synced — try cache supplement (fast DB query)
          const cachedLiData = await getCachedServiceData(serviceClient, companyId, 'linkedin')
          if (cachedLiData) {
            Object.assign(normalizedResult, cachedLiData)
            console.log(`[Analytics] LinkedIn data supplemented from cache for ${companyId}`)
          } else {
            // No cache either — try live LinkedIn API call as last resort
            console.log(`[Analytics] No LinkedIn sync history or cache for ${companyId} — trying live API`)
            try {
              const { data: liMapping } = await linkedinMappingPromise
              if (liMapping?.linkedin_page_id) {
                const { data: liPage } = await supabase
                  .from('linkedin_pages')
                  .select('page_id, user_id')
                  .eq('id', liMapping.linkedin_page_id)
                  .single()

                if (liPage?.page_id && liPage?.user_id) {
                  const hasTokens = await OAuthTokenService.hasValidLinkedInTokens(liPage.user_id)
                  if (hasTokens) {
                    const li = await LinkedInAnalyticsService.fetchAllMetrics(
                      liPage.user_id,
                      liPage.page_id,
                      startDate,
                      endDate,
                      previousStartDate,
                      previousEndDate
                    )
                    normalizedResult.liVisitorMetrics = li.visitorMetrics
                    normalizedResult.liFollowerMetrics = li.followerMetrics
                    normalizedResult.liContentMetrics = li.contentMetrics
                    normalizedResult.liSearchAppearanceMetrics = li.searchAppearanceMetrics
                    normalizedResult.liVisitorDaily = li.visitorDaily
                    normalizedResult.liFollowerDaily = li.followerDaily
                    normalizedResult.liImpressionDaily = li.impressionDaily
                    normalizedResult.liIndustryDemographics = li.industryDemographics
                    normalizedResult.liSeniorityDemographics = li.seniorityDemographics
                    normalizedResult.liJobFunctionDemographics = li.jobFunctionDemographics
                    normalizedResult.liCompanySizeDemographics = li.companySizeDemographics
                    normalizedResult.liUpdates = li.updates
                    normalizedResult.liDataSource = 'api'
                    console.log(`[Analytics] LinkedIn data fetched live for ${companyId}`)
                  } else {
                    console.log(`[Analytics] No valid LinkedIn tokens for ${companyId}`)
                  }
                }
              }
            } catch (liError) {
              console.error(`[Analytics] Live LinkedIn API fallback failed for ${companyId}:`, liError)
            }
          }
        }

        // Check if YouTube data is missing from normalized results — supplement if needed
        const hasYouTubeData = normalizedResult.ytMetrics != null
        if (!hasYouTubeData) {
          const cachedYtData = await getCachedServiceData(serviceClient, companyId, 'youtube')
          if (cachedYtData) {
            Object.assign(normalizedResult, cachedYtData)
            console.log(`[Analytics] YouTube data supplemented from cache for ${companyId}`)
          } else {
            // No cache — try live YouTube API as last resort
            console.log(`[Analytics] No YouTube sync history or cache for ${companyId} — trying live API`)
            try {
              const { data: ytMapping } = await ytMappingPromise
              if (ytMapping?.youtube_channel_id) {
                const { data: ytChannel } = await serviceClient
                  .from('youtube_channels')
                  .select('channel_id, user_id')
                  .eq('id', ytMapping.youtube_channel_id)
                  .single()

                if (ytChannel?.channel_id && ytChannel?.user_id) {
                  const [metrics, videos, dailyData] = await Promise.all([
                    YouTubeAnalyticsService.fetchMetricsWithFallback(
                      ytChannel.user_id, ytChannel.channel_id,
                      startDate, endDate, previousStartDate, previousEndDate
                    ),
                    YouTubeAnalyticsService.fetchTopVideosWithFallback(
                      ytChannel.user_id, ytChannel.channel_id,
                      startDate, endDate, 10
                    ),
                    YouTubeAnalyticsService.fetchDailyDataWithFallback(
                      ytChannel.user_id, ytChannel.channel_id,
                      startDate, endDate
                    )
                  ])
                  normalizedResult.ytMetrics = metrics
                  normalizedResult.ytVideos = videos
                  normalizedResult.ytIsPublicDataOnly = metrics.isPublicDataOnly || false
                  normalizedResult.ytViewsSparkline = dailyData.map((d: any) => d.views)
                  normalizedResult.ytWatchTimeSparkline = dailyData.map((d: any) => d.watchTime)
                  normalizedResult.ytSharesSparkline = dailyData.map((d: any) => d.shares)
                  normalizedResult.ytLikesSparkline = dailyData.map((d: any) => d.likes)
                  console.log(`[Analytics] YouTube data fetched live for ${companyId}`)
                }
              }
            } catch (ytError) {
              console.error(`[Analytics] Live YouTube API fallback failed for ${companyId}:`, ytError)
            }
          }
        }

        const platformFreshness = (platform: string) => {
          const row = syncRows?.find((s: any) => s.platform === platform)
          return row ? {
            lastSync: row.last_success_at,
            dataThrough: row.data_end_date,
            state: row.sync_state || 'unknown',
            failures: row.consecutive_failures || 0
          } : undefined
        }

        normalizedResult.dataFreshness = {
          source: 'normalized' as const,
          fetchedAt: new Date().toISOString(),
          ga: platformFreshness('ga'),
          gsc: platformFreshness('gsc'),
          youtube: platformFreshness('youtube'),
          linkedin: platformFreshness('linkedin')
        }

        return NextResponse.json(normalizedResult)
      }
      console.log(`[Analytics] Normalized tables returned empty data for ${companyId}, falling back`)
    }

    // No normalized data — fall through to legacy cache + API path
    console.log(`[Analytics] No normalized data for ${companyId}, falling back to cache/API`)

    // Check cache first (but allow bypass for debugging or platform-scoped requests)
    const bypassCache = searchParams.get('nocache') === 'true' || !!platforms
    const cached = bypassCache ? null : await checkCache(serviceClient, companyId, startDate, endDate)

    if (cached && !bypassCache) {
      console.log(`[Analytics] Serving cached data for ${companyId} (${startDate} to ${endDate})`)
      cached.dataFreshness = { source: 'cache', cachedAt: new Date().toISOString() }
      return NextResponse.json(cached)
    } else if (platforms) {
      console.log(`[Analytics] Platform-scoped request (${platforms.join(',')}), skipping cache`)
    } else if (bypassCache) {
      console.log(`[Analytics] Cache bypass requested for ${companyId}`)
    } else {
      console.log(`[Analytics] No cache found for ${companyId} (${startDate} to ${endDate})`)
    }

    console.log(`[Analytics] Fetching fresh data for ${companyId} (${startDate} to ${endDate})`)

    // ============================================
    // PARALLEL DB QUERIES - Fetch all mappings at once
    // ============================================
    console.log(`[Analytics] Fetching all mappings in parallel for ${companyId}`)
    const startMappingTime = Date.now()

    const [
      gaMappingResult,
      gscMappingResult,
      ytMappingResult,
      linkedinMappingResult
    ] = await Promise.all([
      serviceClient.from('company_ga_mappings').select('ga_property_id').eq('company_id', companyId).maybeSingle(),
      serviceClient.from('company_gsc_mappings').select('gsc_site_id').eq('company_id', companyId).maybeSingle(),
      serviceClient.from('company_youtube_mappings').select('youtube_channel_id').eq('company_id', companyId).maybeSingle(),
      linkedinMappingPromise // Reuse the already-started LinkedIn mapping query
    ])

    const { data: gaMapping } = gaMappingResult
    const { data: gscMapping } = gscMappingResult
    const { data: ytMapping } = ytMappingResult
    const { data: linkedinMapping } = linkedinMappingResult

    console.log(`[Analytics] Mapping IDs fetched in ${Date.now() - startMappingTime}ms`)

    // Fetch all property/site/channel details in parallel (only for mappings that exist)
    const detailFetchers: (() => Promise<{key: string, data: any}>)[] = []

    if (gaMapping?.ga_property_id) {
      detailFetchers.push(async () => {
        const { data } = await serviceClient.from('ga_properties').select('*').eq('id', gaMapping.ga_property_id).single()
        return { key: 'ga', data }
      })
    }
    if (gscMapping?.gsc_site_id) {
      detailFetchers.push(async () => {
        const { data } = await serviceClient.from('gsc_sites').select('*').eq('id', gscMapping.gsc_site_id).single()
        return { key: 'gsc', data }
      })
    }
    if (ytMapping?.youtube_channel_id) {
      detailFetchers.push(async () => {
        const { data } = await serviceClient.from('youtube_channels').select('*').eq('id', ytMapping.youtube_channel_id).single()
        return { key: 'yt', data }
      })
    }
    if (linkedinMapping?.linkedin_page_id) {
      detailFetchers.push(async () => {
        const { data } = await serviceClient.from('linkedin_pages').select('*').eq('id', linkedinMapping.linkedin_page_id).single()
        return { key: 'linkedin', data }
      })
    }

    const detailResults = await Promise.all(detailFetchers.map(fn => fn()))
    
    // Map results back to their keys
    let gaMappings: { ga_property_id: string; ga_properties: any } | null = null
    let gscMappings: { gsc_site_id: string; gsc_sites: any } | null = null
    let ytMappings: { youtube_channel_id: string; youtube_channels: any } | null = null
    let linkedinPageData: any = null

    detailResults.forEach(({ key, data }) => {
      if (key === 'ga' && data) {
        gaMappings = { ga_property_id: gaMapping!.ga_property_id, ga_properties: data }
      } else if (key === 'gsc' && data) {
        gscMappings = { gsc_site_id: gscMapping!.gsc_site_id, gsc_sites: data }
      } else if (key === 'yt' && data) {
        ytMappings = { youtube_channel_id: ytMapping!.youtube_channel_id, youtube_channels: data }
      } else if (key === 'linkedin' && data) {
        linkedinPageData = data
      }
    })

    console.log(`[Analytics] All mappings resolved in ${Date.now() - startMappingTime}ms`, { 
      hasGA: !!gaMappings, 
      hasGSC: !!gscMappings, 
      hasYT: !!ytMappings,
      hasLinkedIn: !!linkedinPageData 
    })

    if (!gaMappings && !gscMappings && !ytMappings && !linkedinPageData) {
      console.log('No mappings found - returning 404')
      return NextResponse.json({
        error: 'No analytics, search console, YouTube, or LinkedIn accounts mapped to this company',
        message: 'Please configure your integrations in the Accounts page'
      }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = {}

    // ============================================
    // PARALLEL SERVICE CALLS - Fetch all data sources simultaneously
    // ============================================
    console.log('[Analytics] Starting parallel service fetches...')
    const startServiceTime = Date.now()

    // Define async fetchers for each service
    const fetchGA = async () => {
      if (!gaMappings?.ga_properties) return null
      const gaProperty = gaMappings.ga_properties as { property_id: string; user_id: string }
      const propertyId = gaProperty.property_id
      const gaOwnerUserId = gaProperty.user_id
      
      // Validate token
      const tokenData = await OAuthTokenService.getTokens(gaOwnerUserId)
      if (tokenData && !tokenData.scope.includes('analytics.readonly')) {
        throw new Error('OAuth token missing required Google Analytics scope')
      }

      const [metrics, weeklyData, channelData, trafficShare, sourcePerformance, landingPages, regions, devices, gender, age] = await Promise.all([
        GoogleAnalyticsService.fetchMetrics(gaOwnerUserId, propertyId, startDate, endDate, previousStartDate, previousEndDate),
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
      return { metrics, weeklyData, channelData, trafficShare, sourcePerformance, landingPages, regions, devices, gender, age }
    }

    const fetchGSC = async () => {
      if (!gscMappings?.gsc_sites) return { notConfigured: true }
      const gscSite = gscMappings.gsc_sites as { site_url: string; user_id: string }
      const gscOwnerUserId = gscSite.user_id
      
      const tokenData = await OAuthTokenService.getTokens(gscOwnerUserId)
      if (tokenData && !tokenData.scope.includes('webmasters.readonly')) {
        throw new Error('OAuth token missing required Google Search Console scope')
      }

      const [metrics, weeklyData, keywords, countries, devices, indexData, landingPages, totalKeywords, totalIndexedPages, prevKeywords, prevIndexedPages] = await Promise.all([
        GoogleSearchConsoleService.fetchMetrics(gscOwnerUserId, gscSite.site_url, startDate, endDate, previousStartDate, previousEndDate),
        GoogleSearchConsoleService.fetchWeeklyData(gscOwnerUserId, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchKeywords(gscOwnerUserId, gscSite.site_url, startDate, endDate, 10),
        GoogleSearchConsoleService.fetchCountries(gscOwnerUserId, gscSite.site_url, startDate, endDate, 10),
        GoogleSearchConsoleService.fetchDevices(gscOwnerUserId, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchIndexData(gscOwnerUserId, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchLandingPages(gscOwnerUserId, gscSite.site_url, startDate, endDate, 20),
        GoogleSearchConsoleService.fetchKeywordCount(gscOwnerUserId, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchIndexedPageCount(gscOwnerUserId, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchKeywordCount(gscOwnerUserId, gscSite.site_url, previousStartDate, previousEndDate),
        GoogleSearchConsoleService.fetchIndexedPageCount(gscOwnerUserId, gscSite.site_url, previousStartDate, previousEndDate)
      ])
      return { metrics, weeklyData, keywords, countries, devices, indexData, landingPages, totalKeywords, totalIndexedPages, prevKeywords, prevIndexedPages }
    }

    const fetchYouTube = async () => {
      if (!ytMappings?.youtube_channels) return null
      const ytChannel = ytMappings.youtube_channels as { channel_id: string; user_id: string }
      const ytOwnerUserId = ytChannel.user_id
      const channelId = ytChannel.channel_id

      const [metrics, videos, dailyData] = await Promise.all([
        YouTubeAnalyticsService.fetchMetricsWithFallback(ytOwnerUserId, channelId, startDate, endDate, previousStartDate, previousEndDate),
        YouTubeAnalyticsService.fetchTopVideosWithFallback(ytOwnerUserId, channelId, startDate, endDate, 10),
        YouTubeAnalyticsService.fetchDailyDataWithFallback(ytOwnerUserId, channelId, startDate, endDate)
      ])
      return { metrics, videos, dailyData }
    }

    const fetchLinkedIn = async () => {
      if (!linkedinPageData?.page_id) return null
      const liOwnerUserId = linkedinPageData.user_id
      
      const hasTokens = await OAuthTokenService.hasValidLinkedInTokens(liOwnerUserId)
      if (!hasTokens) return null

      return await LinkedInAnalyticsService.fetchAllMetrics(
        liOwnerUserId,
        linkedinPageData.page_id,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      )
    }

    // Run all fetches in parallel (skip platforms not requested)
    const [gaResult, gscResult, ytResult, liResult] = await Promise.allSettled([
      !platforms || platforms.includes('ga') ? fetchGA() : Promise.resolve(null),
      !platforms || platforms.includes('gsc') ? fetchGSC() : Promise.resolve(null),
      !platforms || platforms.includes('youtube') ? fetchYouTube() : Promise.resolve(null),
      !platforms || platforms.includes('linkedin') ? fetchLinkedIn() : Promise.resolve(null)
    ])

    console.log(`[Analytics] All services fetched in ${Date.now() - startServiceTime}ms`)

    // Process GA results
    if (gaResult.status === 'fulfilled' && gaResult.value) {
      const ga = gaResult.value
      results.gaMetrics = ga.metrics
      results.gaWeeklyData = ga.weeklyData
      results.gaChannelData = ga.channelData
      results.gaTrafficShare = ga.trafficShare
      results.gaSourcePerformance = ga.sourcePerformance
      results.gaLandingPages = ga.landingPages
      results.gaRegions = ga.regions
      results.gaDevices = ga.devices
      results.gaGender = ga.gender
      results.gaAge = ga.age
    } else if (gaResult.status === 'rejected') {
      console.error('[Analytics] GA fetch failed:', gaResult.reason)
      results.gaError = gaResult.reason?.message || 'GA fetch failed'
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

    // Process GSC results
    if (gscResult.status === 'fulfilled' && gscResult.value) {
      const gsc = gscResult.value
      if (gsc.notConfigured) {
        // GSC is not configured for this company - this is normal, not an error
        console.log(`[Analytics] GSC not configured for company ${companyId}`)
      } else {
        // GSC is configured and data was fetched successfully
        results.gscMetrics = gsc.metrics
        results.gscWeeklyData = gsc.weeklyData
        results.gscKeywords = gsc.keywords
        results.gscCountries = gsc.countries
        results.gscDevices = gsc.devices
        results.gscIndexData = gsc.indexData
        results.gscLandingPages = gsc.landingPages
        results.totalKeywords = gsc.totalKeywords
        results.totalIndexedPages = gsc.totalIndexedPages
        results.prevKeywords = gsc.prevKeywords
        results.prevIndexedPages = gsc.prevIndexedPages
      }
    } else if (gscResult.status === 'rejected') {
      console.error('[Analytics] GSC fetch failed:', gscResult.reason)
      results.gscError = gscResult.reason?.message || 'GSC fetch failed'
      // Set error type based on error message  
      const errorMessage = gscResult.reason?.message || ''
      if (errorMessage.includes('scope') || errorMessage.includes('webmasters.readonly')) {
        results.gscErrorType = 'scope_missing'
      } else if (errorMessage.includes('token') || errorMessage.includes('auth')) {
        results.gscErrorType = 'auth_required'  
      } else {
        results.gscErrorType = 'api_error'
      }
    }

    // Process YouTube results
    if (ytResult.status === 'fulfilled' && ytResult.value) {
      const yt = ytResult.value
      results.ytMetrics = yt.metrics
      results.ytVideos = yt.videos
      results.ytIsPublicDataOnly = yt.metrics.isPublicDataOnly || false
      results.ytViewsSparkline = yt.dailyData.map((d: any) => d.views)
      results.ytWatchTimeSparkline = yt.dailyData.map((d: any) => d.watchTime)
      results.ytSharesSparkline = yt.dailyData.map((d: any) => d.shares)
      results.ytLikesSparkline = yt.dailyData.map((d: any) => d.likes)
    } else if (ytResult.status === 'rejected') {
      console.error('[Analytics] YouTube fetch failed:', ytResult.reason)
      results.ytError = ytResult.reason?.message || 'YouTube fetch failed'
      
      // Try to fall back to cached YouTube data
      const cachedYtData = await getCachedServiceData(serviceClient, companyId, 'youtube')
      if (cachedYtData) {
        Object.assign(results, cachedYtData)
        console.log(`[YouTube] Using cached data fallback for ${companyId}`)
      }
    } else {
      // No YouTube connection configured, try cached data
      const cachedYtData = await getCachedServiceData(serviceClient, companyId, 'youtube')
      if (cachedYtData) {
        Object.assign(results, cachedYtData)
        console.log(`[YouTube] No connection configured, using cached data for ${companyId}`)
      }
    }

    // Process LinkedIn results
    if (liResult.status === 'fulfilled' && liResult.value) {
      const li = liResult.value
      results.liVisitorMetrics = li.visitorMetrics
      results.liFollowerMetrics = li.followerMetrics
      results.liContentMetrics = li.contentMetrics
      results.liSearchAppearanceMetrics = li.searchAppearanceMetrics
      results.liVisitorDaily = li.visitorDaily
      results.liFollowerDaily = li.followerDaily
      results.liImpressionDaily = li.impressionDaily
      results.liIndustryDemographics = li.industryDemographics
      results.liSeniorityDemographics = li.seniorityDemographics
      results.liJobFunctionDemographics = li.jobFunctionDemographics
      results.liCompanySizeDemographics = li.companySizeDemographics
      results.liUpdates = li.updates
      results.liDataSource = 'api'
      console.log(`[LinkedIn] Successfully fetched data for company: ${companyId}`)
    } else if (liResult.status === 'rejected') {
      console.error('[Analytics] LinkedIn fetch failed:', liResult.reason)
      results.liError = liResult.reason?.message || 'LinkedIn fetch failed'
      
      // Check if it's a rate limit error
      const isRateLimit = liResult.reason?.message?.includes('429') || liResult.reason?.message?.includes('TOO_MANY_REQUESTS')
      if (isRateLimit) {
        console.warn(`[LinkedIn] Rate limit detected for ${companyId} - falling back to cached data`)
        results.liError = 'LinkedIn API rate limit reached - showing cached data'
      }
      
      // Try to fall back to cached LinkedIn data
      const cachedLiData = await getCachedServiceData(serviceClient, companyId, 'linkedin')
      if (cachedLiData) {
        Object.assign(results, cachedLiData)
        console.log(`[LinkedIn] Using cached data fallback for ${companyId}${isRateLimit ? ' (rate limited)' : ''}`)
        results.liDataSource = 'cache'
      }
    } else {
      // No LinkedIn connection configured, try cached data
      const cachedLiData = await getCachedServiceData(serviceClient, companyId, 'linkedin')
      if (cachedLiData) {
        Object.assign(results, cachedLiData)
        console.log(`[LinkedIn] No connection configured, using cached data for ${companyId}`)
      }
    }

    // ============================================
    // LEGACY CODE REMOVED - All fetches now done in parallel above  
    // ============================================

    // Attach freshness metadata for live API fetch
    results.dataFreshness = { source: 'api', fetchedAt: new Date().toISOString() }

    // Cache the results (1 hour expiry) - skip for platform-scoped requests (partial data)
    if (!platforms) {
      await cacheData(serviceClient, companyId, startDate, endDate, results)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Fetch analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkCache(supabase: any, companyId: string, startDate: string, endDate: string) {
  console.log(`[Cache] Looking for cache entry: ${companyId} | ${startDate} to ${endDate}`)
  
  // PRIORITY 1: Check for daily_snapshot cache (pre-built by cron at 12:33 AM PST)
  // This provides instant loading for all users throughout the day
  const { data: dailySnapshot } = await supabase
    .from('analytics_cache')
    .select('*')
    .eq('company_id', companyId)
    .eq('data_type', 'daily_snapshot')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (dailySnapshot?.data) {
    console.log(`[Cache] Using daily snapshot for ${companyId}, expires: ${dailySnapshot.expires_at}`)
    return dailySnapshot.data
  }

  // PRIORITY 2: Check for on-demand cache entry (fallback if cron hasn't run yet)
  const { data, error } = await supabase
    .from('analytics_cache')
    .select('*')
    .eq('company_id', companyId)
    .eq('data_type', 'all')
    .eq('date_range_start', startDate)
    .eq('date_range_end', endDate)
    .maybeSingle()

  if (error || !data) {
    console.log(`[Cache] No cache entry found for ${companyId}:`, error?.message || 'No data')
    return null // No cache entry found
  }

  const now = new Date()
  const cacheDate = new Date(data.created_at)
  const expiresAt = new Date(data.expires_at)

  console.log(`[Cache] Found on-demand cache entry for ${companyId}:`, {
    created: data.created_at,
    expires: data.expires_at,
    ageMinutes: Math.round((now.getTime() - cacheDate.getTime()) / (1000 * 60)),
    hasData: !!data.data
  })

  // Check if cache is from a previous day (daily cache invalidation)
  const isFromPreviousDay = cacheDate.toDateString() !== now.toDateString()
  
  // Check if cache has expired normally
  const hasExpired = now > expiresAt
  const cacheAgeMinutes = (now.getTime() - cacheDate.getTime()) / (1000 * 60)
  const isStale = cacheAgeMinutes > 30 // 30 minute cache (increased from 5 since we have daily snapshots)

  if (isFromPreviousDay || hasExpired || isStale) {
    console.log(`[Cache] Clearing stale on-demand cache for ${companyId}:`, {
      reason: isFromPreviousDay ? 'previous day' : hasExpired ? 'expired' : 'too old (30min)',
      age: cacheAgeMinutes
    })
    
    // Delete the stale cache entry
    await supabase
      .from('analytics_cache')
      .delete()
      .eq('id', data.id)

    return null // Force fresh data fetch
  }

  console.log(`[Cache] Using on-demand cache for ${companyId}, expires: ${data.expires_at}`)
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
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minute on-demand cache (daily snapshot is primary)

  console.log(`[Cache] Storing on-demand cache for ${companyId} (${startDate} to ${endDate}), expires in 30 minutes`)

  const { error } = await supabase.from('analytics_cache').insert({
    company_id: companyId,
    data_type: 'all',
    date_range_start: startDate,
    date_range_end: endDate,
    data: data,
    expires_at: expiresAt.toISOString()
  })

  if (error) {
    console.error('[Cache] Failed to store cache:', error)
  } else {
    console.log(`[Cache] Successfully cached data for ${companyId}`)
  }
}

// Helper to get cached data for a specific service when API fails
async function getCachedServiceData(
  supabase: any, 
  companyId: string, 
  service: 'youtube' | 'linkedin'
) {
  try {
    console.log(`[Cache] Looking for cached ${service} data for ${companyId}`)
    
    // Look for recent cached data (up to 30 days old for LinkedIn due to rate limiting issues)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('data, created_at')
      .eq('company_id', companyId)
      .eq('data_type', 'all')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(`[Cache] Error fetching cached ${service} data:`, error)
      return null
    }

    if (!data?.data) {
      console.log(`[Cache] No cached ${service} data found for ${companyId}`)
      return null
    }

    const cachedData = data.data
    const serviceData: any = {}

    if (service === 'youtube') {
      if (cachedData.ytMetrics) {
        serviceData.ytMetrics = cachedData.ytMetrics
        serviceData.ytVideos = cachedData.ytVideos || []
        serviceData.ytViewsSparkline = cachedData.ytViewsSparkline || []
        serviceData.ytWatchTimeSparkline = cachedData.ytWatchTimeSparkline || []
        serviceData.ytSharesSparkline = cachedData.ytSharesSparkline || []
        serviceData.ytLikesSparkline = cachedData.ytLikesSparkline || []
        serviceData.ytDataSource = 'cached'
        console.log(`[Cache] Using cached YouTube data for ${companyId} (${Math.round((new Date().getTime() - new Date(data.created_at).getTime()) / (1000 * 60))} minutes old)`)
        return serviceData
      }
    } else if (service === 'linkedin') {
      if (cachedData.liVisitorMetrics) {
        serviceData.liVisitorMetrics = cachedData.liVisitorMetrics
        serviceData.liFollowerMetrics = cachedData.liFollowerMetrics
        serviceData.liContentMetrics = cachedData.liContentMetrics
        serviceData.liSearchAppearanceMetrics = cachedData.liSearchAppearanceMetrics
        serviceData.liVisitorDaily = cachedData.liVisitorDaily || []
        serviceData.liFollowerDaily = cachedData.liFollowerDaily || []
        serviceData.liImpressionDaily = cachedData.liImpressionDaily || []
        serviceData.liIndustryDemographics = cachedData.liIndustryDemographics || []
        serviceData.liSeniorityDemographics = cachedData.liSeniorityDemographics || []
        serviceData.liJobFunctionDemographics = cachedData.liJobFunctionDemographics || []
        serviceData.liCompanySizeDemographics = cachedData.liCompanySizeDemographics || []
        serviceData.liUpdates = cachedData.liUpdates || []
        serviceData.liDataSource = 'cached'
        console.log(`[Cache] Using cached LinkedIn data for ${companyId} (${Math.round((new Date().getTime() - new Date(data.created_at).getTime()) / (1000 * 60))} minutes old)`)
        return serviceData
      }
    }

    console.log(`[Cache] No valid cached ${service} data found for ${companyId}`)
    return null
  } catch (error) {
    console.error(`[Cache] Error getting cached ${service} data:`, error)
    return null
  }
}

// Helper to add LinkedIn mock data as fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addLinkedInMockData(results: any) {
  results.liVisitorMetrics = liVisitorMetrics
  results.liFollowerMetrics = liFollowerMetrics
  results.liContentMetrics = liContentMetrics
  results.liSearchAppearanceMetrics = liSearchAppearanceMetrics
  results.liVisitorDaily = liVisitorDaily
  results.liFollowerDaily = liFollowerDaily
  results.liImpressionDaily = liImpressionDaily
  results.liIndustryDemographics = liIndustryDemographics
  results.liSeniorityDemographics = liSeniorityDemographics
  results.liJobFunctionDemographics = liJobFunctionDemographics
  results.liCompanySizeDemographics = liCompanySizeDemographics
  results.liUpdates = liUpdates
}

// ============================================================
// NORMALIZED TABLES DATA PATH
// Reads from daily-grain tables + period snapshots instead of calling external APIs
// ============================================================
async function fetchFromNormalizedTables(
  supabase: any,
  companyId: string,
  startDate: string,
  endDate: string,
  previousStartDate: string,
  previousEndDate: string
) {
  const startTime = Date.now()

  // Check if we have any synced data for this company
  const { data: syncStatuses } = await supabase
    .from('sync_status')
    .select('platform, sync_state, data_end_date')
    .eq('company_id', companyId)

  if (!syncStatuses || syncStatuses.length === 0) {
    console.log(`[Normalized] No sync_status rows for ${companyId}`)
    return null
  }

  const hasSyncedData = syncStatuses.some((s: any) => s.data_end_date !== null)
  if (!hasSyncedData) {
    console.log(`[Normalized] No synced data yet for ${companyId}`)
    return null
  }

  // Run ALL queries in parallel
  const [
    gaDaily, gaDailyPrev, gaChannels,
    gscDaily, gscDailyPrev,
    ytDaily, ytDailyPrev,
    liDaily,
    gaSnapshot, gscSnapshot, ytSnapshot, liSnapshot
  ] = await Promise.all([
    // GA daily metrics - current period
    supabase.from('ga_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // GA daily metrics - previous period
    supabase.from('ga_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .order('date'),
    // GA channel daily
    supabase.from('ga_channel_daily')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // GSC daily metrics - current
    supabase.from('gsc_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // GSC daily metrics - previous
    supabase.from('gsc_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .order('date'),
    // YouTube daily metrics - current
    supabase.from('yt_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // YouTube daily metrics - previous
    supabase.from('yt_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .order('date'),
    // LinkedIn daily metrics
    supabase.from('li_daily_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // Period snapshots - find closest match for each platform
    findClosestSnapshot(supabase, 'ga_period_snapshots', companyId, startDate, endDate),
    findClosestSnapshot(supabase, 'gsc_period_snapshots', companyId, startDate, endDate),
    findClosestSnapshot(supabase, 'yt_period_snapshots', companyId, startDate, endDate),
    findClosestSnapshot(supabase, 'li_period_snapshots', companyId, startDate, endDate)
  ])

  const results = assembleCompanyAnalytics(
    gaDaily.data || [], gaDailyPrev.data || [], gaChannels.data || [],
    gscDaily.data || [], gscDailyPrev.data || [],
    ytDaily.data || [], ytDailyPrev.data || [],
    liDaily.data || [],
    gaSnapshot, gscSnapshot, ytSnapshot, liSnapshot
  )

  console.log(`[Normalized] Served data for ${companyId} in ${Date.now() - startTime}ms`)
  return results
}

async function findClosestSnapshot(supabase: any, table: string, companyId: string, startDate: string, endDate: string) {
  // Try exact match first
  const { data: exact } = await supabase
    .from(table)
    .select('*')
    .eq('company_id', companyId)
    .eq('period_start', startDate)
    .eq('period_end', endDate)
    .maybeSingle()

  if (exact) return exact

  // Fall back to closest snapshot that covers the requested range
  const { data: closest } = await supabase
    .from(table)
    .select('*')
    .eq('company_id', companyId)
    .lte('period_start', startDate)
    .gte('period_end', endDate)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (closest) return closest

  // Last resort: most recent snapshot for this company
  const { data: latest } = await supabase
    .from(table)
    .select('*')
    .eq('company_id', companyId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return latest
}

// Aggregation functions (aggregateGAMetrics, aggregateGSCMetrics, etc.) are now
// imported from @/lib/analytics/normalized-aggregation and used via assembleCompanyAnalytics()

