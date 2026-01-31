import { OAuthTokenService, TokenRefreshResult } from './oauth-token-service'
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
    const tokenResult = await OAuthTokenService.refreshAccessTokenWithDetails(userId)
    console.log('[GSC Service] Token refresh result:', tokenResult.success ? 'Success' : `Failed: ${tokenResult.error}`)

    if (!tokenResult.success) {
      const errorPrefix = tokenResult.error === 'NO_TOKENS' ? 'NO_TOKENS' : 'TOKEN_REFRESH_FAILED'
      throw new Error(`${errorPrefix}: ${tokenResult.details || 'Unknown error'}`)
    }

    const accessToken = tokenResult.accessToken

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

  // Get total count of ranking keywords (unique queries with impressions)
  static async fetchKeywordCount(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 25000 // Max allowed by API
    })

    // Count unique queries only (deduplicate in case API returns duplicates)
    const uniqueQueries = new Set<string>()
    for (const row of (data.rows || [])) {
      uniqueQueries.add(row.keys[0]) // First key is the query
    }

    const hitLimit = (data.rows || []).length >= 25000
    if (hitLimit) {
      console.warn(`[GSC] fetchKeywordCount: Hit API row limit (25,000) - actual keyword count may be higher than ${uniqueQueries.size}`)
    }

    console.log(`[GSC] fetchKeywordCount: Raw rows: ${(data.rows || []).length}, Unique queries: ${uniqueQueries.size}, Date range: ${startDate} to ${endDate}${hitLimit ? ' (TRUNCATED)' : ''}`)
    return uniqueQueries.size
  }

  // Get total count of indexed pages (unique pages with impressions)
  static async fetchIndexedPageCount(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const data = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 25000 // Max allowed by API
    })

    // Count unique pages only (deduplicate in case API returns duplicates)
    const uniquePages = new Set<string>()
    for (const row of (data.rows || [])) {
      uniquePages.add(row.keys[0]) // First key is the page URL
    }

    const hitLimit = (data.rows || []).length >= 25000
    if (hitLimit) {
      console.warn(`[GSC] fetchIndexedPageCount: Hit API row limit (25,000) - actual page count may be higher than ${uniquePages.size}`)
    }

    console.log(`[GSC] fetchIndexedPageCount: Raw rows: ${(data.rows || []).length}, Unique pages: ${uniquePages.size}, Date range: ${startDate} to ${endDate}${hitLimit ? ' (TRUNCATED)' : ''}`)
    return uniquePages.size
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
    // Get base daily data first
    const dateData = await this.makeRequest(userId, siteUrl, {
      startDate,
      endDate,
      dimensions: ['date']
    })

    console.log(`[GSC] fetchIndexData: Processing ${(dateData.rows || []).length} days from ${startDate} to ${endDate}`)

    // For each day, get unique keywords and pages that ranked
    const dailyResults = await Promise.all(
      (dateData.rows || []).map(async (row: any) => {
        const date = row.keys[0]
        
        // Fetch keywords and pages for this specific day
        const [keywordsForDay, pagesForDay] = await Promise.all([
          this.makeRequest(userId, siteUrl, {
            startDate: date,
            endDate: date,
            dimensions: ['query'],
            rowLimit: 25000 // Get all keywords for this single day
          }),
          this.makeRequest(userId, siteUrl, {
            startDate: date,
            endDate: date,
            dimensions: ['page'],
            rowLimit: 25000 // Get all pages for this single day
          })
        ])

        // Count unique keywords and pages for this day
        const uniqueKeywords = new Set<string>()
        for (const keywordRow of (keywordsForDay.rows || [])) {
          uniqueKeywords.add(keywordRow.keys[0])
        }

        const uniquePages = new Set<string>()
        for (const pageRow of (pagesForDay.rows || [])) {
          uniquePages.add(pageRow.keys[0])
        }

        return {
          date,
          indexedPages: uniquePages.size,
          rankingKeywords: uniqueKeywords.size
        }
      })
    )

    console.log(`[GSC] fetchIndexData: Completed processing. Sample results:`, 
      dailyResults.slice(0, 3).map(r => ({ 
        date: r.date, 
        keywords: r.rankingKeywords, 
        pages: r.indexedPages 
      }))
    )
    console.log(`[GSC] fetchIndexData: Average daily keywords: ${Math.round(dailyResults.reduce((sum, r) => sum + r.rankingKeywords, 0) / dailyResults.length)}`)

    return dailyResults
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
