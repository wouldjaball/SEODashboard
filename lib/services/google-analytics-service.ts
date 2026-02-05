import { OAuthTokenService, TokenRefreshResult } from './oauth-token-service'
import { parseISO, format, getISOWeek, startOfWeek, endOfWeek } from 'date-fns'
import type {
  GAMetrics,
  GAWeeklyData,
  GAChannelData,
  GATrafficShare,
  GASourcePerformance,
  GALandingPage,
  GARegion,
  GADevice,
  GADemographic,
} from '@/lib/types'

export class GoogleAnalyticsService {
  private static async makeRequest(
    userId: string,
    propertyId: string,
    endpoint: string,
    body: any
  ) {
    console.log('[GA Service] makeRequest called:', { userId, propertyId, endpoint })

    const tokenResult = await OAuthTokenService.refreshAccessTokenWithDetails(userId)
    console.log('[GA Service] Token refresh result:', tokenResult.success ? 'Success' : `Failed: ${tokenResult.error}`)

    if (!tokenResult.success) {
      const errorPrefix = tokenResult.error === 'NO_TOKENS' ? 'NO_TOKENS' : 'TOKEN_REFRESH_FAILED'
      throw new Error(`${errorPrefix}: ${tokenResult.details || 'Unknown error'}`)
    }

    const accessToken = tokenResult.accessToken

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}${endpoint}`
    console.log('[GA Service] Calling GA API:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    console.log('[GA Service] Response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('[GA Service] API Error:', error)
      throw new Error(`GA API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  static async fetchMetrics(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<GAMetrics> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [
        { startDate, endDate },
        { startDate: previousStartDate, endDate: previousEndDate }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'eventCount' }
      ]
    })

    const currentRow = data.rows?.[0]?.metricValues || []
    const previousRow = data.rows?.[1]?.metricValues || []

    return {
      totalUsers: parseInt(currentRow[0]?.value || '0'),
      newUsers: parseInt(currentRow[1]?.value || '0'),
      sessions: parseInt(currentRow[2]?.value || '0'),
      views: parseInt(currentRow[3]?.value || '0'),
      avgSessionDuration: parseFloat(currentRow[4]?.value || '0'),
      bounceRate: parseFloat(currentRow[5]?.value || '0'),
      keyEvents: parseInt(currentRow[6]?.value || '0'),
      userKeyEventRate: 0,
      previousPeriod: {
        totalUsers: parseInt(previousRow[0]?.value || '0'),
        newUsers: parseInt(previousRow[1]?.value || '0'),
        sessions: parseInt(previousRow[2]?.value || '0'),
        views: parseInt(previousRow[3]?.value || '0'),
        avgSessionDuration: parseFloat(previousRow[4]?.value || '0'),
        bounceRate: parseFloat(previousRow[5]?.value || '0'),
        keyEvents: parseInt(previousRow[6]?.value || '0'),
        userKeyEventRate: 0
      }
    }
  }

  static async fetchWeeklyData(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAWeeklyData[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    })

    // Group by actual calendar week
    const weekMap = new Map<string, { views: number; sessions: number; dates: string[]; weekNum: number; weekStart: Date; weekEnd: Date }>()

    data.rows?.forEach((row: any) => {
      const dateStr = row.dimensionValues[0].value
      // GA returns dates as YYYYMMDD format
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      const date = parseISO(formattedDate)
      const weekNum = getISOWeek(date)
      const year = date.getFullYear()
      const weekKey = `${year}-W${weekNum}`

      const views = parseInt(row.metricValues[0].value)
      const sessions = parseInt(row.metricValues[1].value)

      if (!weekMap.has(weekKey)) {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
        weekMap.set(weekKey, {
          views: 0,
          sessions: 0,
          dates: [],
          weekNum,
          weekStart,
          weekEnd
        })
      }

      const weekData = weekMap.get(weekKey)!
      weekData.views += views
      weekData.sessions += sessions
      weekData.dates.push(formattedDate)
    })

    return Array.from(weekMap.entries()).map(([weekKey, weekData]) => {
      // Use actual first and last dates with data, not calendar week boundaries
      const firstDate = parseISO(weekData.dates[0])
      const lastDate = parseISO(weekData.dates[weekData.dates.length - 1])
      const weekLabel = `${format(firstDate, 'MMM d')}-${format(lastDate, 'd')}`
      return {
        weekLabel,
        weekNumber: weekData.weekNum,
        startDate: weekData.dates[0],
        endDate: weekData.dates[weekData.dates.length - 1],
        views: weekData.views,
        sessions: weekData.sessions
      }
    })
  }

  static async fetchChannelData(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAChannelData[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'date' },
        { name: 'sessionDefaultChannelGroup' }
      ],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    })

    // Group by date and aggregate channel data
    const dateMap = new Map<string, GAChannelData>()

    data.rows?.forEach((row: any) => {
      const dateStr = row.dimensionValues[0].value  // GA returns YYYYMMDD format
      // Convert to ISO format (YYYY-MM-DD) for parseISO compatibility in charts
      const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      const channel = row.dimensionValues[1].value.toLowerCase().replace(/\s+/g, '')
      const sessions = parseInt(row.metricValues[0].value)

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          direct: 0,
          paidSearch: 0,
          organicSearch: 0,
          paidOther: 0,
          referral: 0,
          crossNetwork: 0,
          unassigned: 0,
          organicSocial: 0
        })
      }

      const entry = dateMap.get(date)!

      // Map GA4 channel groups to our schema
      if (channel.includes('direct')) entry.direct += sessions
      else if (channel.includes('paidsearch')) entry.paidSearch += sessions
      else if (channel.includes('organicsearch')) entry.organicSearch += sessions
      else if (channel.includes('paidother') || channel.includes('paidvideo') || channel.includes('paidsocial')) entry.paidOther += sessions
      else if (channel.includes('referral')) entry.referral += sessions
      else if (channel.includes('crossnetwork') || channel.includes('cross-network')) entry.crossNetwork += sessions
      else if (channel.includes('organicsocial')) entry.organicSocial += sessions
      else entry.unassigned += sessions
    })

    return Array.from(dateMap.values())
  }

  static async fetchTrafficShare(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GATrafficShare[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 10
    })

    const totalUsers = data.rows?.reduce(
      (sum: number, row: any) => sum + parseInt(row.metricValues[0].value),
      0
    ) || 1

    return (data.rows || []).map((row: any) => ({
      channel: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
      percentage: parseInt(row.metricValues[0].value) / totalUsers
    }))
  }

  static async fetchSourcePerformance(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GASourcePerformance[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'eventCount' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20
    })

    return (data.rows || []).map((row: any) => {
      const sessions = parseInt(row.metricValues[2].value) || 1
      const keyEvents = parseInt(row.metricValues[6].value)
      return {
        source: row.dimensionValues[0].value,
        totalUsers: parseInt(row.metricValues[0].value),
        newUsers: parseInt(row.metricValues[1].value),
        sessions,
        views: parseInt(row.metricValues[3].value),
        avgSessionDuration: parseFloat(row.metricValues[4].value),
        bounceRate: parseFloat(row.metricValues[5].value),
        keyEvents,
        conversionRate: keyEvents / sessions
      }
    })
  }

  static async fetchLandingPages(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GALandingPage[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'landingPagePlusQueryString' },
        { name: 'pageTitle' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'eventCount' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20
    })

    return (data.rows || []).map((row: any) => {
      const sessions = parseInt(row.metricValues[2].value) || 1
      const keyEvents = parseInt(row.metricValues[6].value)
      return {
        pagePath: row.dimensionValues[0].value,
        pageTitle: row.dimensionValues[1].value || row.dimensionValues[0].value,
        totalUsers: parseInt(row.metricValues[0].value),
        newUsers: parseInt(row.metricValues[1].value),
        sessions,
        views: parseInt(row.metricValues[3].value),
        avgSessionDuration: parseFloat(row.metricValues[4].value),
        bounceRate: parseFloat(row.metricValues[5].value),
        keyEvents,
        conversionRate: keyEvents / sessions
      }
    })
  }

  static async fetchRegions(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GARegion[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'country' },
        { name: 'countryId' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'eventCount' }
      ],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 20
    })

    return (data.rows || []).map((row: any) => ({
      country: row.dimensionValues[0].value,
      countryCode: row.dimensionValues[1].value,
      totalUsers: parseInt(row.metricValues[0].value),
      keyEvents: parseInt(row.metricValues[1].value)
    }))
  }

  static async fetchDevices(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GADevice[]> {
    const data = await this.makeRequest(userId, propertyId, ':runReport', {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'eventCount' }
      ],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }]
    })

    return (data.rows || []).map((row: any) => ({
      category: row.dimensionValues[0].value.toLowerCase() as 'desktop' | 'mobile' | 'tablet',
      totalUsers: parseInt(row.metricValues[0].value),
      keyEvents: parseInt(row.metricValues[1].value)
    }))
  }

  static async fetchGender(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GADemographic[]> {
    try {
      const data = await this.makeRequest(userId, propertyId, ':runReport', {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'userGender' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'eventCount' }
        ],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }]
      })

      return (data.rows || []).map((row: any) => ({
        segment: row.dimensionValues[0].value,
        totalUsers: parseInt(row.metricValues[0].value),
        keyEvents: parseInt(row.metricValues[1].value)
      }))
    } catch (error) {
      // Demographics may not be enabled for all properties
      console.warn('Gender demographics not available:', error)
      return []
    }
  }

  static async fetchAge(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GADemographic[]> {
    try {
      const data = await this.makeRequest(userId, propertyId, ':runReport', {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'userAgeBracket' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'eventCount' }
        ],
        orderBys: [{ dimension: { dimensionName: 'userAgeBracket' } }]
      })

      return (data.rows || []).map((row: any) => ({
        segment: row.dimensionValues[0].value,
        totalUsers: parseInt(row.metricValues[0].value),
        keyEvents: parseInt(row.metricValues[1].value)
      }))
    } catch (error) {
      // Demographics may not be enabled for all properties
      console.warn('Age demographics not available:', error)
      return []
    }
  }

  static async fetchRealtimeMetrics(
    userId: string,
    propertyId: string
  ): Promise<{
    activeUsers: number
    screenPageViews: number
    topPages: Array<{ pagePath: string; activeUsers: number }>
    topReferrers: Array<{ source: string; activeUsers: number }>
  }> {
    console.log('[GA Realtime] Fetching real-time metrics for property:', propertyId)

    // Get overall realtime metrics
    const [overviewData, topPagesData, topReferrersData] = await Promise.all([
      // Overall active users and page views
      this.makeRequest(userId, propertyId, ':runRealtimeReport', {
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' }
        ]
      }),
      
      // Top pages by active users
      this.makeRequest(userId, propertyId, ':runRealtimeReport', {
        dimensions: [{ name: 'unifiedPageScreen' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5
      }),
      
      // Top referrers by active users
      this.makeRequest(userId, propertyId, ':runRealtimeReport', {
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5
      })
    ])

    const activeUsers = parseInt(overviewData.rows?.[0]?.metricValues?.[0]?.value || '0')
    const screenPageViews = parseInt(overviewData.rows?.[0]?.metricValues?.[1]?.value || '0')

    const topPages = (topPagesData.rows || []).map((row: any) => ({
      pagePath: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value)
    }))

    const topReferrers = (topReferrersData.rows || []).map((row: any) => ({
      source: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value)
    }))

    console.log('[GA Realtime] Results:', {
      activeUsers,
      screenPageViews,
      topPagesCount: topPages.length,
      topReferrersCount: topReferrers.length
    })

    return {
      activeUsers,
      screenPageViews,
      topPages,
      topReferrers
    }
  }
}
