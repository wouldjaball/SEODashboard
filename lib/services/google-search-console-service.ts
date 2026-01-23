import { OAuthTokenService } from './oauth-token-service'
import { format, parseISO, getISOWeek, startOfWeek, endOfWeek } from 'date-fns'
import type {
  GSCMetrics,
  GSCWeeklyData,
  GSCKeyword,
  GSCCountry,
  GSCDeviceData,
  GSCIndexData,
  GSCLandingPage
} from '@/lib/types'

// Country code to name mapping
const countryCodeMap: Record<string, string> = {
  usa: 'United States',
  gbr: 'United Kingdom',
  can: 'Canada',
  aus: 'Australia',
  deu: 'Germany',
  fra: 'France',
  ind: 'India',
  bra: 'Brazil',
  jpn: 'Japan',
  mex: 'Mexico',
  esp: 'Spain',
  ita: 'Italy',
  nld: 'Netherlands',
  kor: 'South Korea',
  sgp: 'Singapore',
  nzl: 'New Zealand',
  irl: 'Ireland',
  zaf: 'South Africa',
  phl: 'Philippines',
  idn: 'Indonesia'
}

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

    // Return daily data with proper date-based labels
    return (data.rows || []).map((row: any) => {
      const date = parseISO(row.keys[0])
      const weekNum = getISOWeek(date)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      const weekLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`

      return {
        weekLabel,
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

  static async fetchCountries(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<GSCCountry[]> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['country'],
      rowLimit: limit
    })

    return (data.rows || []).map((row: any) => {
      const countryCode = row.keys[0].toLowerCase()
      return {
        country: countryCodeMap[countryCode] || row.keys[0],
        countryCode: countryCode.toUpperCase(),
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr
      }
    })
  }

  static async fetchDevices(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<GSCDeviceData[]> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['device']
    })

    return (data.rows || []).map((row: any) => ({
      device: row.keys[0].toLowerCase() as 'desktop' | 'mobile' | 'tablet',
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr
    }))
  }

  static async fetchIndexData(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<GSCIndexData[]> {
    // Fetch daily data grouped by date to show trends
    // Note: GSC API doesn't provide indexed pages directly, so we estimate from keyword data
    const [dateData, keywordData] = await Promise.all([
      this.makeRequest(userId, siteUrl, {
        startDate,
        endDate,
        dimensions: ['date']
      }),
      this.makeRequest(userId, siteUrl, {
        startDate,
        endDate,
        dimensions: ['date', 'query'],
        rowLimit: 25000 // Get more rows to count unique queries per day
      })
    ])

    // Count unique queries per date as proxy for ranking keywords
    const queryCountByDate: Record<string, number> = {}
    for (const row of (keywordData.rows || [])) {
      const date = row.keys[0]
      queryCountByDate[date] = (queryCountByDate[date] || 0) + 1
    }

    // Estimate indexed pages based on unique pages in results
    const pageData = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 25000
    })
    const totalIndexedPages = (pageData.rows || []).length

    return (dateData.rows || []).map((row: any) => ({
      date: row.keys[0],
      indexedPages: totalIndexedPages, // Static for now - GSC doesn't provide daily indexed page counts
      rankingKeywords: queryCountByDate[row.keys[0]] || 0
    }))
  }

  static async fetchLandingPages(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 20
  ): Promise<GSCLandingPage[]> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit
    })

    return (data.rows || []).map((row: any) => ({
      url: row.keys[0],
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      avgPosition: row.position
    }))
  }
}
