import { OAuthTokenService } from './oauth-token-service'
import type {
  GAMetrics,
  GAWeeklyData,
} from '@/lib/types'

export class GoogleAnalyticsService {
  private static async makeRequest(
    userId: string,
    propertyId: string,
    endpoint: string,
    body: any
  ) {
    const accessToken = await OAuthTokenService.refreshAccessToken(userId)
    if (!accessToken) throw new Error('No valid access token')

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      const error = await response.text()
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

    // Group by week
    const weekMap = new Map<string, { views: number; sessions: number; dates: string[] }>()

    data.rows?.forEach((row: any, index: number) => {
      const weekNum = Math.floor(index / 7)
      const week = `Week ${weekNum + 1}`
      const views = parseInt(row.metricValues[0].value)
      const sessions = parseInt(row.metricValues[1].value)
      const date = row.dimensionValues[0].value

      if (!weekMap.has(week)) {
        weekMap.set(week, { views: 0, sessions: 0, dates: [] })
      }

      const weekData = weekMap.get(week)!
      weekData.views += views
      weekData.sessions += sessions
      weekData.dates.push(date)
    })

    return Array.from(weekMap.entries()).map(([week, data], index) => ({
      weekLabel: week,
      weekNumber: index + 1,
      startDate: data.dates[0],
      endDate: data.dates[data.dates.length - 1],
      views: data.views,
      sessions: data.sessions
    }))
  }
}
