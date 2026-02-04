import { createClient } from '@/lib/supabase/server'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { LinkedInSheetsService } from '@/lib/services/linkedin-sheets-service'
import { LinkedInAnalyticsService } from '@/lib/services/linkedin-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
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

