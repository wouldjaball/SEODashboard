import { OAuthTokenService } from './oauth-token-service'
import type {
  GSCMetrics,
  GSCWeeklyData,
  GSCKeyword
} from '@/lib/types'

export class GoogleSearchConsoleService {
  private static async makeRequest(
    userId: string,
    siteUrl: string,
    body: any
  ) {
    const accessToken = await OAuthTokenService.refreshAccessToken(userId)
    if (!accessToken) throw new Error('No valid access token')

    const encodedSiteUrl = encodeURIComponent(siteUrl)
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
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
      throw new Error(`GSC API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  static async fetchMetrics(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<GSCMetrics> {
    const [currentData, previousData] = await Promise.all([
      this.makeRequest(userId, siteUrl, {
        startDate,
        endDate,
        dimensions: []
      }),
      this.makeRequest(userId, siteUrl, {
        startDate: previousStartDate,
        endDate: previousEndDate,
        dimensions: []
      })
    ])

    const current = currentData.rows?.[0] || {}
    const previous = previousData.rows?.[0] || {}

    return {
      impressions: current.impressions || 0,
      clicks: current.clicks || 0,
      ctr: current.ctr || 0,
      avgPosition: current.position || 0,
      indexedPages: 0, // Would need separate API call
      rankingKeywords: 0, // Calculated from keywords query
      previousPeriod: {
        impressions: previous.impressions || 0,
        clicks: previous.clicks || 0,
        ctr: previous.ctr || 0,
        avgPosition: previous.position || 0,
        indexedPages: 0,
        rankingKeywords: 0
      }
    }
  }

  static async fetchWeeklyData(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<GSCWeeklyData[]> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['date']
    })

    // Return daily data formatted as weekly
    return (data.rows || []).map((row: any, index: number) => {
      const weekNum = Math.floor(index / 7) + 1
      return {
        weekLabel: `Week ${weekNum}`,
        date: row.keys[0],
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr
      }
    })
  }

  static async fetchKeywords(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<GSCKeyword[]> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit
    })

    return (data.rows || []).map((row: any) => ({
      query: row.keys[0],
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      avgPosition: row.position
    }))
  }
}
