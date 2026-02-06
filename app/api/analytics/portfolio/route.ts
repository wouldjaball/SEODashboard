import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const defaultEndDate = new Date()
    const defaultStartDate = subDays(defaultEndDate, 30)
    
    const startDate = searchParams.get('startDate') || format(defaultStartDate, 'yyyy-MM-dd')
    const endDate = searchParams.get('endDate') || format(defaultEndDate, 'yyyy-MM-dd')
    const forceRefresh = searchParams.get('refresh') === 'true'

    // For 30-day default date range, try cache first
    const isDefaultRange = (
      startDate === format(defaultStartDate, 'yyyy-MM-dd') &&
      endDate === format(defaultEndDate, 'yyyy-MM-dd')
    )

    if (isDefaultRange && !forceRefresh) {
      // Check cache for today's data
      const cacheDate = format(defaultEndDate, 'yyyy-MM-dd')
      const { data: cachedData, error: cacheError } = await supabase
        .from('portfolio_cache')
        .select('companies_data, aggregate_metrics, updated_at')
        .eq('user_id', user.id)
        .eq('cache_date', cacheDate)
        .single()

      if (!cacheError && cachedData) {
        // For immediate response, serve cache even if slightly stale
        // Check if cache is very stale (more than 48 hours old)
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime()
        const isVeryStale = cacheAge > 48 * 60 * 60 * 1000 // 48 hours
        const isStale = cacheAge > 12 * 60 * 60 * 1000 // 12 hours

        if (!isVeryStale) {
          console.log(`[Portfolio API] Serving cached data for user ${user.id} (age: ${Math.floor(cacheAge / (60 * 60 * 1000))}h)`)
          
          // If cache is slightly stale (12+ hours), trigger background refresh
          if (isStale) {
            console.log(`[Portfolio API] Cache is stale, will trigger background refresh...`)
            // Trigger background refresh without blocking response
            setImmediate(async () => {
              try {
                await refreshCacheInBackground(user.id, startDate, endDate, cacheDate, supabase, request)
              } catch (error) {
                console.error(`[Portfolio API] Background refresh failed for user ${user.id}:`, error)
              }
            })
          }
          
          const response = NextResponse.json({
            companies: cachedData.companies_data,
            aggregateMetrics: cachedData.aggregate_metrics,
            cached: true,
            cacheAge: Math.floor(cacheAge / (60 * 1000)), // age in minutes
            cacheDate: cacheDate
          })
          
          // Add cache headers for cached responses
          response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300') // 5 minutes
          response.headers.set('CDN-Cache-Control', 'public, max-age=300')
          response.headers.set('Vary', 'Authorization, Cookie')
          
          return response
        } else {
          console.log(`[Portfolio API] Cache is very stale for user ${user.id}, forcing refresh...`)
        }
      } else {
        console.log(`[Portfolio API] No cache found for user ${user.id} on date ${cacheDate}`)
      }
    }

    // Cache miss or stale cache - fetch live data
    console.log(`[Portfolio API] Cache miss or stale for user ${user.id}, fetching live data`)

    // Get all companies the user has access to
    const { data: userCompanies, error: companiesError } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (*)
      `)
      .eq('user_id', user.id)

    if (companiesError) {
      throw companiesError
    }

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json({
        companies: [],
        aggregateMetrics: {
          totalTraffic: 0,
          totalConversions: 0,
          avgConversionRate: 0,
          totalRevenue: 0,
          previousPeriod: {
            totalTraffic: 0,
            totalConversions: 0,
            avgConversionRate: 0,
            totalRevenue: 0
          }
        }
      })
    }

    // Calculate previous period dates
    const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    const previousStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(endDate), daysDiff), 'yyyy-MM-dd')

    // Fetch analytics data for all companies in parallel
    console.log(`[Portfolio API] Fetching analytics for ${userCompanies.length} companies in parallel...`)
    
    const startTime = Date.now()
    const companiesWithData = await Promise.all(userCompanies.map(fetchCompanyAnalytics))
    console.log(`[Portfolio API] Parallel fetch completed in ${Date.now() - startTime}ms`)

    async function fetchCompanyAnalytics(userCompany: Record<string, any>) {
      const companyId = userCompany.company_id
      
      try {
        // Fetch analytics data for this company with timeout
        const params = new URLSearchParams({
          startDate,
          endDate
        })

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout per company

        const analyticsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${params}`,
          {
            headers: {
              'Authorization': request.headers.get('Authorization') || '',
              'Cookie': request.headers.get('Cookie') || ''
            },
            signal: controller.signal
          }
        )

        clearTimeout(timeoutId)

        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          
          // Debug logging for data validation
          console.log(`[Portfolio API] Company ${companyId} data status:`, {
            hasGaMetrics: !!analyticsData.gaMetrics,
            hasGscMetrics: !!analyticsData.gscMetrics,
            gaError: analyticsData.gaError,
            gscError: analyticsData.gscError,
            gaMetricsUsers: analyticsData.gaMetrics?.totalUsers,
            gscMetricsImpressions: analyticsData.gscMetrics?.impressions
          })
          
          // Build company object with analytics data
          return {
            ...userCompany.companies,
            role: userCompany.role,
            // Google Analytics data
            gaMetrics: analyticsData.gaMetrics || null,
            gaWeeklyData: analyticsData.gaWeeklyData || [],
            gaChannelData: analyticsData.gaChannelData || [],
            gaTrafficShare: analyticsData.gaTrafficShare || [],
            gaSourcePerformance: analyticsData.gaSourcePerformance || [],
            gaLandingPages: analyticsData.gaLandingPages || [],
            gaRegions: analyticsData.gaRegions || [],
            gaDevices: analyticsData.gaDevices || [],
            gaGender: analyticsData.gaGender || [],
            gaAge: analyticsData.gaAge || [],
            gaError: analyticsData.gaError,
            gaErrorType: analyticsData.gaErrorType,
            // Search Console data
            gscMetrics: analyticsData.gscMetrics || null,
            gscWeeklyData: analyticsData.gscWeeklyData || [],
            gscIndexData: analyticsData.gscIndexData || [],
            gscKeywords: analyticsData.gscKeywords || [],
            gscLandingPages: analyticsData.gscLandingPages || [],
            gscCountries: analyticsData.gscCountries || [],
            gscDevices: analyticsData.gscDevices || [],
            gscError: analyticsData.gscError,
            gscErrorType: analyticsData.gscErrorType,
            // YouTube data
            ytMetrics: analyticsData.ytMetrics || null,
            ytVideos: analyticsData.ytVideos || [],
            ytViewsSparkline: analyticsData.ytViewsSparkline || [],
            ytWatchTimeSparkline: analyticsData.ytWatchTimeSparkline || [],
            ytSharesSparkline: analyticsData.ytSharesSparkline || [],
            ytLikesSparkline: analyticsData.ytLikesSparkline || [],
            ytError: analyticsData.ytError,
            ytIsPublicDataOnly: analyticsData.ytIsPublicDataOnly,
            // LinkedIn data
            liVisitorMetrics: analyticsData.liVisitorMetrics || null,
            liFollowerMetrics: analyticsData.liFollowerMetrics || null,
            liContentMetrics: analyticsData.liContentMetrics || null,
            liVisitorDaily: analyticsData.liVisitorDaily || [],
            liFollowerDaily: analyticsData.liFollowerDaily || [],
            liImpressionDaily: analyticsData.liImpressionDaily || [],
            liIndustryDemographics: analyticsData.liIndustryDemographics || [],
            liSeniorityDemographics: analyticsData.liSeniorityDemographics || [],
            liJobFunctionDemographics: analyticsData.liJobFunctionDemographics || [],
            liCompanySizeDemographics: analyticsData.liCompanySizeDemographics || [],
            liUpdates: analyticsData.liUpdates || [],
            liVideoMetrics: analyticsData.liVideoMetrics,
            liEmployeeAdvocacyMetrics: analyticsData.liEmployeeAdvocacyMetrics,
            liContentBreakdown: analyticsData.liContentBreakdown,
            liSocialListening: analyticsData.liSocialListening,
            liVideoDaily: analyticsData.liVideoDaily || [],
            liError: analyticsData.liError,
            liErrorType: analyticsData.liErrorType,
            liDataSource: analyticsData.liDataSource
          }
        } else {
          const errorText = await analyticsResponse.text().catch(() => 'Unknown error')
          console.warn(`[Portfolio API] Analytics fetch failed for company ${companyId}: ${analyticsResponse.status} - ${errorText}`)
          // Return company with empty analytics data
          return {
            ...userCompany.companies,
            role: userCompany.role,
            gaMetrics: null,
            gaWeeklyData: [],
            gaChannelData: [],
            gaTrafficShare: [],
            gaSourcePerformance: [],
            gaLandingPages: [],
            gaRegions: [],
            gaDevices: [],
            gaGender: [],
            gaAge: [],
            gscMetrics: null,
            gscWeeklyData: [],
            gscIndexData: [],
            gscKeywords: [],
            gscLandingPages: [],
            gscCountries: [],
            gscDevices: [],
            ytMetrics: null,
            ytVideos: [],
            ytViewsSparkline: [],
            ytWatchTimeSparkline: [],
            ytSharesSparkline: [],
            ytLikesSparkline: [],
            liVisitorMetrics: null,
            liFollowerMetrics: null,
            liContentMetrics: null,
            liVisitorDaily: [],
            liFollowerDaily: [],
            liImpressionDaily: [],
            liIndustryDemographics: [],
            liSeniorityDemographics: [],
            liJobFunctionDemographics: [],
            liCompanySizeDemographics: [],
            liUpdates: [],
            liVideoDaily: []
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[Portfolio API] Timeout fetching analytics for company ${companyId}`)
        } else {
          console.error(`[Portfolio API] Failed to fetch analytics for company ${companyId}:`, error)
        }
        // Return company with empty data if fetch fails
        return {
          ...userCompany.companies,
          role: userCompany.role,
          gaMetrics: null,
          gaWeeklyData: [],
          gaChannelData: [],
          gaTrafficShare: [],
          gaSourcePerformance: [],
          gaLandingPages: [],
          gaRegions: [],
          gaDevices: [],
          gaGender: [],
          gaAge: [],
          gscMetrics: null,
          gscWeeklyData: [],
          gscIndexData: [],
          gscKeywords: [],
          gscLandingPages: [],
          gscCountries: [],
          gscDevices: [],
          ytMetrics: null,
          ytVideos: [],
          ytViewsSparkline: [],
          ytWatchTimeSparkline: [],
          ytSharesSparkline: [],
          ytLikesSparkline: [],
          liVisitorMetrics: null,
          liFollowerMetrics: null,
          liContentMetrics: null,
          liVisitorDaily: [],
          liFollowerDaily: [],
          liImpressionDaily: [],
          liIndustryDemographics: [],
          liSeniorityDemographics: [],
          liJobFunctionDemographics: [],
          liCompanySizeDemographics: [],
          liUpdates: [],
          liVideoDaily: []
        }
      }
    }

    // Calculate aggregate metrics from the parallel results
    let totalTraffic = 0
    let totalConversions = 0
    const totalConversionRates: number[] = []
    let prevTotalTraffic = 0
    let prevTotalConversions = 0
    const prevTotalConversionRates: number[] = []

    companiesWithData.forEach(company => {
      if (company.gaMetrics) {
        totalTraffic += company.gaMetrics.totalUsers || 0
        totalConversions += company.gaMetrics.keyEvents || 0
        if (company.gaMetrics.userKeyEventRate) {
          totalConversionRates.push(company.gaMetrics.userKeyEventRate)
        }

        // Previous period data
        if (company.gaMetrics.previousPeriod) {
          prevTotalTraffic += company.gaMetrics.previousPeriod.totalUsers || 0
          prevTotalConversions += company.gaMetrics.previousPeriod.keyEvents || 0
          if (company.gaMetrics.previousPeriod.userKeyEventRate) {
            prevTotalConversionRates.push(company.gaMetrics.previousPeriod.userKeyEventRate)
          }
        }
      }
    })

    const avgConversionRate = totalConversionRates.length > 0 
      ? totalConversionRates.reduce((sum, rate) => sum + rate, 0) / totalConversionRates.length
      : 0

    const prevAvgConversionRate = prevTotalConversionRates.length > 0
      ? prevTotalConversionRates.reduce((sum, rate) => sum + rate, 0) / prevTotalConversionRates.length
      : 0

    const aggregateMetrics = {
      totalTraffic,
      totalConversions,
      avgConversionRate,
      totalRevenue: 0, // Would come from actual revenue integration
      previousPeriod: {
        totalTraffic: prevTotalTraffic,
        totalConversions: prevTotalConversions,
        avgConversionRate: prevAvgConversionRate,
        totalRevenue: 0
      }
    }

    const result = {
      companies: companiesWithData,
      aggregateMetrics,
      cached: false
    }

    // If this was the default 30-day range, update the cache for next time
    if (isDefaultRange) {
      const cacheDate = format(defaultEndDate, 'yyyy-MM-dd')
      try {
        await supabase
          .from('portfolio_cache')
          .upsert({
            user_id: user.id,
            cache_date: cacheDate,
            companies_data: companiesWithData,
            aggregate_metrics: aggregateMetrics,
            updated_at: new Date().toISOString()
          })
        console.log(`[Portfolio API] Updated cache for user ${user.id}`)
      } catch (cacheUpdateError) {
        console.warn(`[Portfolio API] Failed to update cache for user ${user.id}:`, cacheUpdateError)
        // Don't fail the request if cache update fails
      }
    }

    const response = NextResponse.json(result)
    
    // Add cache headers for fresh data
    if (result.cached) {
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300') // 5 minutes for cached
    } else {
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60') // 1 minute for fresh data
    }
    response.headers.set('CDN-Cache-Control', 'public, max-age=60')
    response.headers.set('Vary', 'Authorization, Cookie')
    
    return response
  } catch (error) {
    console.error('Portfolio analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio analytics' }, { status: 500 })
  }
}

// Background cache refresh function
async function refreshCacheInBackground(
  userId: string, 
  startDate: string, 
  endDate: string, 
  cacheDate: string,
  supabase: Record<string, any>,
  request: Request
) {
  try {
    console.log(`[Portfolio API] Starting background refresh for user ${userId}`)
    
    // Get user companies
    const { data: userCompanies, error: companiesError } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (*)
      `)
      .eq('user_id', userId)

    if (companiesError || !userCompanies?.length) {
      throw new Error('Failed to fetch user companies for background refresh')
    }

    // Fetch analytics in parallel with timeout
    const companiesWithData = await Promise.all(
      userCompanies.map(async (userCompany: Record<string, any>) => {
        try {
          const companyId = userCompany.company_id
          const params = new URLSearchParams({ startDate, endDate })
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for background

          const analyticsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${params}`,
            {
              headers: {
                'Authorization': request.headers.get('Authorization') || '',
                'Cookie': request.headers.get('Cookie') || ''
              },
              signal: controller.signal
            }
          )

          clearTimeout(timeoutId)

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json()
            return {
              ...userCompany.companies,
              role: userCompany.role,
              ...analyticsData
            }
          } else {
            console.warn(`[Portfolio API] Background refresh failed for company ${companyId}`)
            return { ...userCompany.companies, role: userCompany.role }
          }
        } catch (error) {
          console.warn(`[Portfolio API] Background refresh error for company ${userCompany.company_id}:`, error)
          return { ...userCompany.companies, role: userCompany.role }
        }
      })
    )

    // Calculate aggregate metrics
    let totalTraffic = 0, totalConversions = 0
    const totalConversionRates: number[] = []
    let prevTotalTraffic = 0, prevTotalConversions = 0
    const prevTotalConversionRates: number[] = []

    companiesWithData.forEach(company => {
      if (company.gaMetrics) {
        totalTraffic += company.gaMetrics.totalUsers || 0
        totalConversions += company.gaMetrics.keyEvents || 0
        if (company.gaMetrics.userKeyEventRate) {
          totalConversionRates.push(company.gaMetrics.userKeyEventRate)
        }

        if (company.gaMetrics.previousPeriod) {
          prevTotalTraffic += company.gaMetrics.previousPeriod.totalUsers || 0
          prevTotalConversions += company.gaMetrics.previousPeriod.keyEvents || 0
          if (company.gaMetrics.previousPeriod.userKeyEventRate) {
            prevTotalConversionRates.push(company.gaMetrics.previousPeriod.userKeyEventRate)
          }
        }
      }
    })

    const aggregateMetrics = {
      totalTraffic,
      totalConversions,
      avgConversionRate: totalConversionRates.length > 0 
        ? totalConversionRates.reduce((sum, rate) => sum + rate, 0) / totalConversionRates.length
        : 0,
      totalRevenue: 0,
      previousPeriod: {
        totalTraffic: prevTotalTraffic,
        totalConversions: prevTotalConversions,
        avgConversionRate: prevTotalConversionRates.length > 0
          ? prevTotalConversionRates.reduce((sum, rate) => sum + rate, 0) / prevTotalConversionRates.length
          : 0,
        totalRevenue: 0
      }
    }

    // Update cache
    await supabase
      .from('portfolio_cache')
      .upsert({
        user_id: userId,
        cache_date: cacheDate,
        companies_data: companiesWithData,
        aggregate_metrics: aggregateMetrics,
        updated_at: new Date().toISOString()
      })

    console.log(`[Portfolio API] Background refresh completed for user ${userId}`)
  } catch (error) {
    console.error(`[Portfolio API] Background refresh failed for user ${userId}:`, error)
  }
}