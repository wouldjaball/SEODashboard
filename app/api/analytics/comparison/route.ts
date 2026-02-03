import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyIds, startDate, endDate, metrics } = body

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json({ error: 'Company IDs are required' }, { status: 400 })
    }

    // Verify user has access to all requested companies
    const { data: userCompanies, error: accessError } = await supabase
      .from('user_companies')
      .select('company_id, companies(*)')
      .eq('user_id', user.id)
      .in('company_id', companyIds)

    if (accessError) {
      throw accessError
    }

    if (!userCompanies || userCompanies.length !== companyIds.length) {
      return NextResponse.json({ error: 'Access denied to one or more companies' }, { status: 403 })
    }

    // Calculate previous period dates for comparison
    const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    const previousStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(endDate), daysDiff), 'yyyy-MM-dd')

    // Fetch analytics data for all companies in parallel
    console.log(`[Comparison API] Fetching analytics for ${companyIds.length} companies in parallel...`)
    
    const startTime = Date.now()
    const comparisonData = await Promise.all(
      companyIds.map(async (companyId) => {
        const company = userCompanies.find(uc => uc.company_id === companyId)
        
        if (!company) {
          return null
        }

        try {
          // Fetch both current and previous period data in parallel
          const [currentData, previousData] = await Promise.all([
            // Current period
            fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${new URLSearchParams({ startDate, endDate })}`,
              {
                headers: {
                  'Authorization': request.headers.get('Authorization') || '',
                  'Cookie': request.headers.get('Cookie') || ''
                },
                signal: AbortSignal.timeout(15000) // 15 second timeout per company
              }
            ).then(res => res.ok ? res.json() : null),
            
            // Previous period
            fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${new URLSearchParams({ startDate: previousStartDate, endDate: previousEndDate })}`,
              {
                headers: {
                  'Authorization': request.headers.get('Authorization') || '',
                  'Cookie': request.headers.get('Cookie') || ''
                },
                signal: AbortSignal.timeout(15000) // 15 second timeout per company
              }
            ).then(res => res.ok ? res.json() : null)
          ])

          // Extract requested metrics
          const companyMetrics: Record<string, any> = {
            companyId,
            companyName: (company as Record<string, any>).companies.name,
            industry: (company as Record<string, any>).companies.industry,
            color: (company as Record<string, any>).companies.color,
            current: {},
            previous: {},
            change: {}
          }

        // Google Analytics metrics
        if (metrics.includes('traffic')) {
          companyMetrics.current.traffic = currentData?.gaMetrics?.totalUsers || 0
          companyMetrics.previous.traffic = previousData?.gaMetrics?.totalUsers || 0
          companyMetrics.change.traffic = calculateChange(
            companyMetrics.current.traffic,
            companyMetrics.previous.traffic
          )
        }

        if (metrics.includes('conversions')) {
          companyMetrics.current.conversions = currentData?.gaMetrics?.keyEvents || 0
          companyMetrics.previous.conversions = previousData?.gaMetrics?.keyEvents || 0
          companyMetrics.change.conversions = calculateChange(
            companyMetrics.current.conversions,
            companyMetrics.previous.conversions
          )
        }

        if (metrics.includes('conversionRate')) {
          companyMetrics.current.conversionRate = currentData?.gaMetrics?.userKeyEventRate || 0
          companyMetrics.previous.conversionRate = previousData?.gaMetrics?.userKeyEventRate || 0
          companyMetrics.change.conversionRate = calculateChange(
            companyMetrics.current.conversionRate,
            companyMetrics.previous.conversionRate
          )
        }

        if (metrics.includes('sessions')) {
          companyMetrics.current.sessions = currentData?.gaMetrics?.sessions || 0
          companyMetrics.previous.sessions = previousData?.gaMetrics?.sessions || 0
          companyMetrics.change.sessions = calculateChange(
            companyMetrics.current.sessions,
            companyMetrics.previous.sessions
          )
        }

        if (metrics.includes('bounceRate')) {
          companyMetrics.current.bounceRate = currentData?.gaMetrics?.bounceRate || 0
          companyMetrics.previous.bounceRate = previousData?.gaMetrics?.bounceRate || 0
          companyMetrics.change.bounceRate = calculateChange(
            companyMetrics.current.bounceRate,
            companyMetrics.previous.bounceRate
          )
        }

        // Search Console metrics
        if (metrics.includes('impressions')) {
          companyMetrics.current.impressions = currentData?.gscMetrics?.impressions || 0
          companyMetrics.previous.impressions = previousData?.gscMetrics?.impressions || 0
          companyMetrics.change.impressions = calculateChange(
            companyMetrics.current.impressions,
            companyMetrics.previous.impressions
          )
        }

        if (metrics.includes('clicks')) {
          companyMetrics.current.clicks = currentData?.gscMetrics?.clicks || 0
          companyMetrics.previous.clicks = previousData?.gscMetrics?.clicks || 0
          companyMetrics.change.clicks = calculateChange(
            companyMetrics.current.clicks,
            companyMetrics.previous.clicks
          )
        }

        if (metrics.includes('ctr')) {
          companyMetrics.current.ctr = currentData?.gscMetrics?.ctr || 0
          companyMetrics.previous.ctr = previousData?.gscMetrics?.ctr || 0
          companyMetrics.change.ctr = calculateChange(
            companyMetrics.current.ctr,
            companyMetrics.previous.ctr
          )
        }

        if (metrics.includes('avgPosition')) {
          companyMetrics.current.avgPosition = currentData?.gscMetrics?.avgPosition || 0
          companyMetrics.previous.avgPosition = previousData?.gscMetrics?.avgPosition || 0
          companyMetrics.change.avgPosition = calculateChange(
            companyMetrics.current.avgPosition,
            companyMetrics.previous.avgPosition
          )
        }

        // YouTube metrics
        if (metrics.includes('youtubeViews')) {
          companyMetrics.current.youtubeViews = currentData?.ytMetrics?.views || 0
          companyMetrics.previous.youtubeViews = previousData?.ytMetrics?.views || 0
          companyMetrics.change.youtubeViews = calculateChange(
            companyMetrics.current.youtubeViews,
            companyMetrics.previous.youtubeViews
          )
        }

        if (metrics.includes('youtubeWatchTime')) {
          companyMetrics.current.youtubeWatchTime = currentData?.ytMetrics?.totalWatchTime || 0
          companyMetrics.previous.youtubeWatchTime = previousData?.ytMetrics?.totalWatchTime || 0
          companyMetrics.change.youtubeWatchTime = calculateChange(
            companyMetrics.current.youtubeWatchTime,
            companyMetrics.previous.youtubeWatchTime
          )
        }

        // LinkedIn metrics
        if (metrics.includes('linkedinPageViews')) {
          companyMetrics.current.linkedinPageViews = currentData?.liVisitorMetrics?.pageViews || 0
          companyMetrics.previous.linkedinPageViews = previousData?.liVisitorMetrics?.pageViews || 0
          companyMetrics.change.linkedinPageViews = calculateChange(
            companyMetrics.current.linkedinPageViews,
            companyMetrics.previous.linkedinPageViews
          )
        }

        if (metrics.includes('linkedinFollowers')) {
          companyMetrics.current.linkedinFollowers = currentData?.liFollowerMetrics?.totalFollowers || 0
          companyMetrics.previous.linkedinFollowers = previousData?.liFollowerMetrics?.totalFollowers || 0
          companyMetrics.change.linkedinFollowers = calculateChange(
            companyMetrics.current.linkedinFollowers,
            companyMetrics.previous.linkedinFollowers
          )
        }

          // Include weekly trend data for line charts
          if (currentData?.gaWeeklyData) {
            companyMetrics.weeklyTrends = {
              traffic: currentData.gaWeeklyData.map((week: any) => ({
                date: week.date,
                value: week.sessions || 0
              }))
            }
          }

          return companyMetrics

        } catch (error) {
          console.error(`Failed to fetch comparison data for company ${companyId}:`, error)
          // Return company with empty data
          return {
            companyId,
            companyName: (company as Record<string, any>).companies.name,
            industry: (company as Record<string, any>).companies.industry,
            color: (company as Record<string, any>).companies.color,
            current: {},
            previous: {},
            change: {},
            error: 'Failed to fetch data'
          }
        }
      })
    ).then(results => results.filter(result => result !== null)) // Filter out null companies
    
    console.log(`[Comparison API] Parallel fetch completed in ${Date.now() - startTime}ms`)

    // Calculate portfolio-level aggregates for the requested metrics
    const portfolioMetrics: Record<string, any> = {
      current: {},
      previous: {},
      change: {}
    }

    metrics.forEach((metric: string) => {
      const currentTotal = comparisonData.reduce((sum, company) => 
        sum + (company.current[metric] || 0), 0
      )
      const previousTotal = comparisonData.reduce((sum, company) => 
        sum + (company.previous[metric] || 0), 0
      )

      portfolioMetrics.current[metric] = currentTotal
      portfolioMetrics.previous[metric] = previousTotal
      portfolioMetrics.change[metric] = calculateChange(currentTotal, previousTotal)
    })

    const response = NextResponse.json({
      companies: comparisonData,
      portfolio: portfolioMetrics,
      dateRange: {
        current: { startDate, endDate },
        previous: { startDate: previousStartDate, endDate: previousEndDate }
      }
    })
    
    // Add cache headers for comparison data (shorter cache for comparison data)
    response.headers.set('Cache-Control', 'public, max-age=180, s-maxage=180') // 3 minutes
    response.headers.set('CDN-Cache-Control', 'public, max-age=180')
    response.headers.set('Vary', 'Authorization, Cookie')
    
    return response

  } catch (error) {
    console.error('Comparison analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch comparison analytics' }, { status: 500 })
  }
}

function calculateChange(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}