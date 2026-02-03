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
        // Check if cache is fresh (less than 24 hours old)
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime()
        const isStale = cacheAge > 24 * 60 * 60 * 1000 // 24 hours

        if (!isStale) {
          console.log(`[Portfolio API] Serving cached data for user ${user.id}`)
          return NextResponse.json({
            companies: cachedData.companies_data,
            aggregateMetrics: cachedData.aggregate_metrics,
            cached: true,
            cacheDate: cacheDate
          })
        } else {
          console.log(`[Portfolio API] Cache is stale for user ${user.id}, refreshing...`)
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

    const companiesWithData = []
    let totalTraffic = 0
    let totalConversions = 0
    const totalConversionRates = []
    let prevTotalTraffic = 0
    let prevTotalConversions = 0
    const prevTotalConversionRates = []

    // Fetch analytics data for each company
    for (const userCompany of userCompanies) {
      const companyId = userCompany.company_id
      
      try {
        // Fetch analytics data for this company
        const params = new URLSearchParams({
          startDate,
          endDate
        })

        const analyticsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${params}`,
          {
            headers: {
              'Authorization': request.headers.get('Authorization') || '',
              'Cookie': request.headers.get('Cookie') || ''
            }
          }
        )

        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          
          // Build company object with analytics data
          const company = {
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

          companiesWithData.push(company)

          // Aggregate metrics for portfolio view
          if (analyticsData.gaMetrics) {
            totalTraffic += analyticsData.gaMetrics.totalUsers || 0
            totalConversions += analyticsData.gaMetrics.keyEvents || 0
            if (analyticsData.gaMetrics.userKeyEventRate) {
              totalConversionRates.push(analyticsData.gaMetrics.userKeyEventRate)
            }

            // Previous period data
            if (analyticsData.gaMetrics.previousPeriod) {
              prevTotalTraffic += analyticsData.gaMetrics.previousPeriod.totalUsers || 0
              prevTotalConversions += analyticsData.gaMetrics.previousPeriod.keyEvents || 0
              if (analyticsData.gaMetrics.previousPeriod.userKeyEventRate) {
                prevTotalConversionRates.push(analyticsData.gaMetrics.previousPeriod.userKeyEventRate)
              }
            }
          }
        } else {
          // If analytics fetch failed, still include company with empty data
          const company = {
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
          companiesWithData.push(company)
        }
      } catch (error) {
        console.error(`Failed to fetch analytics for company ${companyId}:`, error)
        // Still include company with empty data
        const company = {
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
        companiesWithData.push(company)
      }
    }

    // Calculate aggregate metrics
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

    return NextResponse.json(result)
  } catch (error) {
    console.error('Portfolio analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio analytics' }, { status: 500 })
  }
}