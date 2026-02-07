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
    const { data: companyData, error: companyError } = await supabase
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
    const { data: userCompanyAccess, error: accessError } = await supabase
      .from('user_companies')
      .select('role, company_id, user_id')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    console.log('[Analytics API] User access validation result:')
    console.log('[Analytics API] - Error:', accessError)
    console.log('[Analytics API] - Access data:', userCompanyAccess)

    // Let's also check what companies this user DOES have access to
    const { data: allUserCompanies, error: allAccessError } = await supabase
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

    // ============================================
    // NORMALIZED TABLES PATH (feature flag)
    // ============================================
    if (process.env.USE_NORMALIZED_TABLES === 'true') {
      console.log(`[Analytics] Using normalized tables for ${companyId} (${startDate} to ${endDate})`)
      const normalizedResult = await fetchFromNormalizedTables(supabase, companyId, startDate, endDate, previousStartDate, previousEndDate)
      if (normalizedResult) {
        return NextResponse.json(normalizedResult)
      }
      console.log(`[Analytics] Normalized tables returned no data, falling back to legacy path`)
    }

    // Check cache first (but allow bypass for debugging)
    const bypassCache = searchParams.get('nocache') === 'true'
    const cached = bypassCache ? null : await checkCache(supabase, companyId, startDate, endDate)

    if (cached && !bypassCache) {
      console.log(`[Analytics] Serving cached data for ${companyId} (${startDate} to ${endDate})`)
      return NextResponse.json(cached)
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
      supabase.from('company_ga_mappings').select('ga_property_id').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_gsc_mappings').select('gsc_site_id').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_youtube_mappings').select('youtube_channel_id').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_linkedin_mappings').select('linkedin_page_id').eq('company_id', companyId).maybeSingle()
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
        const { data } = await supabase.from('ga_properties').select('*').eq('id', gaMapping.ga_property_id).single()
        return { key: 'ga', data }
      })
    }
    if (gscMapping?.gsc_site_id) {
      detailFetchers.push(async () => {
        const { data } = await supabase.from('gsc_sites').select('*').eq('id', gscMapping.gsc_site_id).single()
        return { key: 'gsc', data }
      })
    }
    if (ytMapping?.youtube_channel_id) {
      detailFetchers.push(async () => {
        const { data } = await supabase.from('youtube_channels').select('*').eq('id', ytMapping.youtube_channel_id).single()
        return { key: 'yt', data }
      })
    }
    if (linkedinMapping?.linkedin_page_id) {
      detailFetchers.push(async () => {
        const { data } = await supabase.from('linkedin_pages').select('*').eq('id', linkedinMapping.linkedin_page_id).single()
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

    // Run all fetches in parallel
    const [gaResult, gscResult, ytResult, liResult] = await Promise.allSettled([
      fetchGA(),
      fetchGSC(),
      fetchYouTube(),
      fetchLinkedIn()
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
      const cachedYtData = await getCachedServiceData(supabase, companyId, 'youtube')
      if (cachedYtData) {
        Object.assign(results, cachedYtData)
        console.log(`[YouTube] Using cached data fallback for ${companyId}`)
      }
    } else {
      // No YouTube connection configured, try cached data
      const cachedYtData = await getCachedServiceData(supabase, companyId, 'youtube')
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
      results.liVideoMetrics = li.videoMetrics
      results.liEmployeeAdvocacyMetrics = li.employeeAdvocacyMetrics
      results.liContentBreakdown = li.contentBreakdown
      results.liSocialListening = li.socialListening
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
      const cachedLiData = await getCachedServiceData(supabase, companyId, 'linkedin')
      if (cachedLiData) {
        Object.assign(results, cachedLiData)
        console.log(`[LinkedIn] Using cached data fallback for ${companyId}${isRateLimit ? ' (rate limited)' : ''}`)
        results.liDataSource = 'cache'
      }
    } else {
      // No LinkedIn connection configured, try cached data
      const cachedLiData = await getCachedServiceData(supabase, companyId, 'linkedin')
      if (cachedLiData) {
        Object.assign(results, cachedLiData)
        console.log(`[LinkedIn] No connection configured, using cached data for ${companyId}`)
      }
    }

    // ============================================
    // LEGACY CODE REMOVED - All fetches now done in parallel above  
    // ============================================

    // Cache the results (1 hour expiry) - use the adjusted dates that were actually used for API calls
    await cacheData(supabase, companyId, startDate, endDate, results)

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

  if (dailySnapshot?.cached_data) {
    console.log(`[Cache] Using daily snapshot for ${companyId}, expires: ${dailySnapshot.expires_at}`)
    return dailySnapshot.cached_data
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
    hasData: !!data.cached_data
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
  return data?.cached_data || null
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
    cached_data: data, // Note: using cached_data to match the schema
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
      .select('cached_data, created_at')
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

    if (!data?.cached_data) {
      console.log(`[Cache] No cached ${service} data found for ${companyId}`)
      return null
    }

    const cachedData = data.cached_data
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any = {}

  // ---- GA ----
  const hasGADaily = gaDaily.data && gaDaily.data.length > 0
  const hasGASnapshot = gaSnapshot !== null && gaSnapshot !== undefined
  if (hasGADaily || hasGASnapshot) {
    results.gaMetrics = hasGADaily
      ? aggregateGAMetrics(gaDaily.data, gaDailyPrev.data || [])
      : null
    results.gaWeeklyData = hasGADaily ? buildWeeklyData(gaDaily.data, 'ga') : []
    results.gaChannelData = hasGADaily ? buildChannelData(gaChannels.data || []) : []
    results.gaTrafficShare = gaSnapshot?.traffic_share || []
    results.gaSourcePerformance = gaSnapshot?.source_performance || []
    results.gaLandingPages = gaSnapshot?.landing_pages || []
    results.gaRegions = gaSnapshot?.regions || []
    results.gaDevices = gaSnapshot?.devices || []
    results.gaGender = gaSnapshot?.gender || []
    results.gaAge = gaSnapshot?.age || []
  }

  // ---- GSC ----
  const hasGSCDaily = gscDaily.data && gscDaily.data.length > 0
  const hasGSCSnapshot = gscSnapshot !== null && gscSnapshot !== undefined
  if (hasGSCDaily || hasGSCSnapshot) {
    results.gscMetrics = hasGSCDaily
      ? aggregateGSCMetrics(gscDaily.data, gscDailyPrev.data || [])
      : null
    results.gscWeeklyData = hasGSCDaily ? buildWeeklyData(gscDaily.data, 'gsc') : []
    results.gscKeywords = gscSnapshot?.keywords || []
    results.gscCountries = gscSnapshot?.countries || []
    results.gscDevices = gscSnapshot?.devices || []
    results.gscIndexData = hasGSCDaily ? buildGSCIndexData(gscDaily.data) : []
    results.gscLandingPages = gscSnapshot?.landing_pages || []
    results.totalKeywords = gscSnapshot?.total_keywords || 0
    results.totalIndexedPages = gscSnapshot?.total_indexed_pages || 0
    results.prevKeywords = 0
    results.prevIndexedPages = 0
  }

  // ---- YouTube ----
  const hasYTDaily = ytDaily.data && ytDaily.data.length > 0
  const hasYTSnapshot = ytSnapshot !== null && ytSnapshot !== undefined
  if (hasYTDaily || hasYTSnapshot) {
    results.ytMetrics = hasYTDaily
      ? aggregateYTMetrics(ytDaily.data, ytDailyPrev.data || [])
      : null
    results.ytVideos = ytSnapshot?.top_videos || []
    results.ytIsPublicDataOnly = ytSnapshot?.is_public_data_only || false
    results.ytViewsSparkline = hasYTDaily ? ytDaily.data.map((d: any) => d.views || 0) : []
    results.ytWatchTimeSparkline = hasYTDaily ? ytDaily.data.map((d: any) => d.watch_time_seconds || 0) : []
    results.ytSharesSparkline = hasYTDaily ? ytDaily.data.map((d: any) => d.shares || 0) : []
    results.ytLikesSparkline = hasYTDaily ? ytDaily.data.map((d: any) => d.likes || 0) : []
  }

  // ---- LinkedIn ----
  const hasLISnapshot = liSnapshot !== null && liSnapshot !== undefined
  if (hasLISnapshot || (liDaily.data && liDaily.data.length > 0)) {
    results.liVisitorMetrics = liSnapshot?.visitor_metrics || { pageViews: 0, uniqueVisitors: 0, customButtonClicks: 0 }
    results.liFollowerMetrics = liSnapshot?.follower_metrics || { totalFollowers: 0, newFollowers: 0 }
    results.liContentMetrics = liSnapshot?.content_metrics || { reactions: 0, comments: 0, reposts: 0, impressions: 0, clicks: 0, engagementRate: 0 }
    results.liSearchAppearanceMetrics = liSnapshot?.search_appearance_metrics || { searchAppearances: 0 }
    results.liIndustryDemographics = liSnapshot?.industry_demographics || []
    results.liSeniorityDemographics = liSnapshot?.seniority_demographics || []
    results.liJobFunctionDemographics = liSnapshot?.job_function_demographics || []
    results.liCompanySizeDemographics = liSnapshot?.company_size_demographics || []
    results.liUpdates = liSnapshot?.updates || []
    results.liVideoMetrics = liSnapshot?.video_metrics
    results.liEmployeeAdvocacyMetrics = liSnapshot?.employee_advocacy_metrics
    results.liContentBreakdown = liSnapshot?.content_breakdown
    results.liSocialListening = liSnapshot?.social_listening
    results.liDataSource = liSnapshot?.data_source || 'cache'

    // Build daily arrays from li_daily_metrics
    const liDailyData = liDaily.data || []
    results.liVisitorDaily = liDailyData.map((d: any) => ({
      date: d.date,
      desktopVisitors: d.desktop_visitors || 0,
      mobileVisitors: d.mobile_visitors || 0
    }))
    results.liFollowerDaily = liDailyData.map((d: any) => ({
      date: d.date,
      sponsored: d.paid_follower_gain || 0,
      organic: d.organic_follower_gain || 0
    }))
    results.liImpressionDaily = liDailyData.map((d: any) => ({
      date: d.date,
      impressions: d.impressions || 0
    }))
  }

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

function aggregateGAMetrics(currentRows: any[], previousRows: any[]) {
  const sum = (rows: any[], field: string) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
  const avg = (rows: any[], field: string) => rows.length > 0 ? sum(rows, field) / rows.length : 0

  return {
    totalUsers: sum(currentRows, 'total_users'),
    newUsers: sum(currentRows, 'new_users'),
    sessions: sum(currentRows, 'sessions'),
    views: sum(currentRows, 'page_views'),
    avgSessionDuration: avg(currentRows, 'avg_session_duration'),
    bounceRate: avg(currentRows, 'bounce_rate'),
    keyEvents: sum(currentRows, 'key_events'),
    userKeyEventRate: avg(currentRows, 'user_key_event_rate'),
    previousPeriod: previousRows.length > 0 ? {
      totalUsers: sum(previousRows, 'total_users'),
      newUsers: sum(previousRows, 'new_users'),
      sessions: sum(previousRows, 'sessions'),
      views: sum(previousRows, 'page_views'),
      avgSessionDuration: avg(previousRows, 'avg_session_duration'),
      bounceRate: avg(previousRows, 'bounce_rate'),
      keyEvents: sum(previousRows, 'key_events'),
      userKeyEventRate: avg(previousRows, 'user_key_event_rate')
    } : undefined
  }
}

function aggregateGSCMetrics(currentRows: any[], previousRows: any[]) {
  const sum = (rows: any[], field: string) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
  const avg = (rows: any[], field: string) => rows.length > 0 ? sum(rows, field) / rows.length : 0

  const impressions = sum(currentRows, 'impressions')
  const clicks = sum(currentRows, 'clicks')
  const prevImpressions = sum(previousRows, 'impressions')
  const prevClicks = sum(previousRows, 'clicks')

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    avgPosition: avg(currentRows, 'avg_position'),
    indexedPages: 0,
    rankingKeywords: 0,
    previousPeriod: previousRows.length > 0 ? {
      impressions: prevImpressions,
      clicks: prevClicks,
      ctr: prevImpressions > 0 ? prevClicks / prevImpressions : 0,
      avgPosition: avg(previousRows, 'avg_position'),
      indexedPages: 0,
      rankingKeywords: 0
    } : undefined
  }
}

function aggregateYTMetrics(currentRows: any[], previousRows: any[]) {
  const sum = (rows: any[], field: string) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
  const avg = (rows: any[], field: string) => rows.length > 0 ? sum(rows, field) / rows.length : 0

  return {
    views: sum(currentRows, 'views'),
    totalWatchTime: sum(currentRows, 'watch_time_seconds'),
    shares: sum(currentRows, 'shares'),
    avgViewDuration: avg(currentRows, 'avg_view_duration'),
    likes: sum(currentRows, 'likes'),
    dislikes: sum(currentRows, 'dislikes'),
    comments: sum(currentRows, 'comments'),
    subscriptions: sum(currentRows, 'subscribers_gained') - sum(currentRows, 'subscribers_lost'),
    previousPeriod: previousRows.length > 0 ? {
      views: sum(previousRows, 'views'),
      totalWatchTime: sum(previousRows, 'watch_time_seconds'),
      shares: sum(previousRows, 'shares'),
      avgViewDuration: avg(previousRows, 'avg_view_duration'),
      likes: sum(previousRows, 'likes'),
      dislikes: sum(previousRows, 'dislikes'),
      comments: sum(previousRows, 'comments'),
      subscriptions: sum(previousRows, 'subscribers_gained') - sum(previousRows, 'subscribers_lost')
    } : undefined
  }
}

function buildWeeklyData(dailyRows: any[], platform: 'ga' | 'gsc') {
  // Group daily rows into weekly buckets
  const weekMap = new Map<string, any>()

  dailyRows.forEach((row: any) => {
    const date = new Date(row.date)
    // Get ISO week start (Monday)
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(date)
    weekStart.setDate(diff)
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { dates: [], views: 0, sessions: 0, impressions: 0, clicks: 0, ctr: 0 })
    }

    const week = weekMap.get(weekKey)!
    week.dates.push(row.date)

    if (platform === 'ga') {
      week.views += Number(row.page_views) || 0
      week.sessions += Number(row.sessions) || 0
    } else {
      week.impressions += Number(row.impressions) || 0
      week.clicks += Number(row.clicks) || 0
    }
  })

  if (platform === 'ga') {
    return Array.from(weekMap.entries()).map(([weekStart, data]) => {
      const lastDate = data.dates[data.dates.length - 1]
      const startFormatted = formatDateLabel(weekStart)
      const endFormatted = formatDateLabel(lastDate)
      return {
        weekLabel: `${startFormatted}-${endFormatted.split(' ')[1]}`,
        weekNumber: getISOWeekNumber(new Date(weekStart)),
        startDate: weekStart,
        endDate: lastDate,
        views: data.views,
        sessions: data.sessions
      }
    })
  }

  // GSC weekly
  return Array.from(weekMap.entries()).map(([weekStart, data]) => {
    const lastDate = data.dates[data.dates.length - 1]
    const startFormatted = formatDateLabel(weekStart)
    const endFormatted = formatDateLabel(lastDate)
    return {
      weekLabel: `${startFormatted}-${endFormatted.split(' ')[1]}`,
      date: weekStart,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? data.clicks / data.impressions : 0
    }
  })
}

function buildChannelData(channelRows: any[]) {
  // Group channel rows by date, pivot channels into columns
  const dateMap = new Map<string, any>()

  channelRows.forEach((row: any) => {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, {
        date: row.date,
        direct: 0, paidSearch: 0, organicSearch: 0, paidOther: 0,
        referral: 0, crossNetwork: 0, unassigned: 0, organicSocial: 0
      })
    }

    const day = dateMap.get(row.date)!
    const channel = row.channel as string
    if (channel in day) {
      day[channel] = Number(row.sessions) || 0
    }
  })

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function buildGSCIndexData(dailyRows: any[]) {
  return dailyRows.map((row: any) => ({
    date: row.date,
    indexedPages: Number(row.indexed_pages) || 0,
    rankingKeywords: Number(row.ranking_keywords) || 0
  }))
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

