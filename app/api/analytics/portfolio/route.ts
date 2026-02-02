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
    
    let startDate = searchParams.get('startDate') || format(defaultStartDate, 'yyyy-MM-dd')
    let endDate = searchParams.get('endDate') || format(defaultEndDate, 'yyyy-MM-dd')

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
    let totalConversionRates = []
    let prevTotalTraffic = 0
    let prevTotalConversions = 0
    let prevTotalConversionRates = []

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

    return NextResponse.json({
      companies: companiesWithData,
      aggregateMetrics
    })
  } catch (error) {
    console.error('Portfolio analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio analytics' }, { status: 500 })
  }
}