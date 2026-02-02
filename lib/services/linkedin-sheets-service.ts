import { OAuthTokenService } from './oauth-token-service'
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LIVisitorDaily,
  LIDemographic,
  LIUpdate,
  LIFollowerDaily,
  LIImpressionDaily,
} from '@/lib/types'

// Types for sheet configurations
export interface LinkedInSheetConfig {
  id: string
  companyId: string
  pageAnalyticsSheetId?: string
  pageAnalyticsRange?: string
  postAnalyticsSheetId?: string
  postAnalyticsRange?: string
  campaignAnalyticsSheetId?: string
  campaignAnalyticsRange?: string
}

// Types for raw sheet data
interface SheetRow {
  [key: string]: string | number
}

export class LinkedInSheetsService {
  private static async fetchSheetData(
    userId: string,
    sheetId: string,
    range: string = 'A:Z'
  ): Promise<SheetRow[]> {
    const accessToken = await OAuthTokenService.refreshAccessToken(userId)
    if (!accessToken) {
      throw new Error('No valid access token for Google Sheets API')
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Sheets API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const rows = data.values || []

    if (rows.length < 2) {
      return []
    }

    // First row is headers
    const headers = rows[0] as string[]
    const dataRows = rows.slice(1)

    return dataRows.map((row: (string | number)[]) => {
      const obj: SheetRow = {}
      headers.forEach((header, index) => {
        obj[header.toLowerCase().replace(/\s+/g, '_')] = row[index] ?? ''
      })
      return obj
    })
  }

  // Parse page analytics from Power My Analytics sheet format
  static async fetchPageAnalytics(
    userId: string,
    sheetId: string,
    range: string = 'A:Z'
  ): Promise<{
    visitorMetrics: LIVisitorMetrics
    visitorDaily: LIVisitorDaily[]
    industryDemographics: LIDemographic[]
    seniorityDemographics: LIDemographic[]
    jobFunctionDemographics: LIDemographic[]
    companySizeDemographics: LIDemographic[]
  }> {
    const rows = await this.fetchSheetData(userId, sheetId, range)

    // Calculate metrics from daily data
    // Expected columns: date, page_views, unique_visitors, desktop_visitors, mobile_visitors, custom_button_clicks
    let totalPageViews = 0
    let totalUniqueVisitors = 0
    let totalCustomButtonClicks = 0
    const visitorDaily: LIVisitorDaily[] = []

    // Split into current and previous period (assuming last 30 days vs prior 30)
    const halfPoint = Math.floor(rows.length / 2)
    const currentPeriodRows = rows.slice(halfPoint)
    const previousPeriodRows = rows.slice(0, halfPoint)

    for (const row of currentPeriodRows) {
      const pageViews = parseInt(String(row.page_views || row.pageviews || 0))
      const uniqueVisitors = parseInt(String(row.unique_visitors || row.uniquevisitors || 0))
      const desktopVisitors = parseInt(String(row.desktop_visitors || row.desktopvisitors || 0))
      const mobileVisitors = parseInt(String(row.mobile_visitors || row.mobilevisitors || 0))
      const customButtonClicks = parseInt(String(row.custom_button_clicks || row.custombuttonclicks || 0))

      totalPageViews += pageViews
      totalUniqueVisitors += uniqueVisitors
      totalCustomButtonClicks += customButtonClicks

      if (row.date) {
        visitorDaily.push({
          date: String(row.date),
          desktopVisitors,
          mobileVisitors,
        })
      }
    }

    // Previous period totals
    let prevPageViews = 0
    let prevUniqueVisitors = 0
    let prevCustomButtonClicks = 0
    for (const row of previousPeriodRows) {
      prevPageViews += parseInt(String(row.page_views || row.pageviews || 0))
      prevUniqueVisitors += parseInt(String(row.unique_visitors || row.uniquevisitors || 0))
      prevCustomButtonClicks += parseInt(String(row.custom_button_clicks || row.custombuttonclicks || 0))
    }

    const visitorMetrics: LIVisitorMetrics = {
      pageViews: totalPageViews,
      uniqueVisitors: totalUniqueVisitors,
      customButtonClicks: totalCustomButtonClicks,
      previousPeriod: {
        pageViews: prevPageViews,
        uniqueVisitors: prevUniqueVisitors,
        customButtonClicks: prevCustomButtonClicks,
      },
    }

    // Demographics would typically come from a separate sheet/tab
    // For now, return empty arrays - user can configure separate sheets
    return {
      visitorMetrics,
      visitorDaily,
      industryDemographics: [],
      seniorityDemographics: [],
      jobFunctionDemographics: [],
      companySizeDemographics: [],
    }
  }

  // Parse follower analytics from sheet
  static async fetchFollowerAnalytics(
    userId: string,
    sheetId: string,
    range: string = 'A:Z'
  ): Promise<{
    followerMetrics: LIFollowerMetrics
    followerDaily: LIFollowerDaily[]
  }> {
    const rows = await this.fetchSheetData(userId, sheetId, range)

    // Expected columns: date, total_followers, new_followers, sponsored, organic
    let latestTotalFollowers = 0
    let totalNewFollowers = 0
    const followerDaily: LIFollowerDaily[] = []

    const halfPoint = Math.floor(rows.length / 2)
    const currentPeriodRows = rows.slice(halfPoint)
    const previousPeriodRows = rows.slice(0, halfPoint)

    for (const row of currentPeriodRows) {
      const totalFollowers = parseInt(String(row.total_followers || row.totalfollowers || 0))
      const newFollowers = parseInt(String(row.new_followers || row.newfollowers || 0))
      const sponsored = parseInt(String(row.sponsored || 0))
      const organic = parseInt(String(row.organic || 0))

      if (totalFollowers > latestTotalFollowers) {
        latestTotalFollowers = totalFollowers
      }
      totalNewFollowers += newFollowers

      if (row.date) {
        followerDaily.push({
          date: String(row.date),
          sponsored,
          organic,
        })
      }
    }

    // Previous period
    let prevTotalFollowers = 0
    let prevNewFollowers = 0
    for (const row of previousPeriodRows) {
      const totalFollowers = parseInt(String(row.total_followers || row.totalfollowers || 0))
      if (totalFollowers > prevTotalFollowers) {
        prevTotalFollowers = totalFollowers
      }
      prevNewFollowers += parseInt(String(row.new_followers || row.newfollowers || 0))
    }

    const followerMetrics: LIFollowerMetrics = {
      totalFollowers: latestTotalFollowers,
      newFollowers: totalNewFollowers,
      previousPeriod: {
        totalFollowers: prevTotalFollowers,
        newFollowers: prevNewFollowers,
      },
    }

    return {
      followerMetrics,
      followerDaily,
    }
  }

  // Parse post/content analytics from sheet
  static async fetchPostAnalytics(
    userId: string,
    sheetId: string,
    range: string = 'A:Z'
  ): Promise<{
    contentMetrics: LIContentMetrics
    impressionDaily: LIImpressionDaily[]
    updates: LIUpdate[]
  }> {
    const rows = await this.fetchSheetData(userId, sheetId, range)

    // Expected columns for posts:
    // post_id, title/text, published_at, image_url, link_url,
    // impressions, video_views, clicks, ctr, reactions, comments, shares, engagement_rate

    let totalReactions = 0
    let totalComments = 0
    let totalReposts = 0
    const impressionDaily: LIImpressionDaily[] = []
    const updates: LIUpdate[] = []
    const dailyImpressions: { [date: string]: number } = {}

    const halfPoint = Math.floor(rows.length / 2)
    const currentPeriodRows = rows.slice(halfPoint)
    const previousPeriodRows = rows.slice(0, halfPoint)

    for (const row of currentPeriodRows) {
      const reactions = parseInt(String(row.reactions || row.likes || 0))
      const comments = parseInt(String(row.comments || 0))
      const shares = parseInt(String(row.shares || row.reposts || 0))
      const impressions = parseInt(String(row.impressions || 0))

      totalReactions += reactions
      totalComments += comments
      totalReposts += shares

      // Aggregate impressions by date
      const date = String(row.date || row.published_at || '').split('T')[0]
      if (date) {
        dailyImpressions[date] = (dailyImpressions[date] || 0) + impressions
      }

      // Build update entry if this looks like a post
      if (row.post_id || row.postid || row.id) {
        updates.push({
          id: String(row.post_id || row.postid || row.id),
          title: String(row.title || row.text || row.content || ''),
          publishedAt: String(row.published_at || row.publishedat || row.date || ''),
          imageUrl: row.image_url || row.imageurl ? String(row.image_url || row.imageurl) : undefined,
          linkUrl: String(row.link_url || row.linkurl || row.url || ''),
          impressions,
          videoViews: parseInt(String(row.video_views || row.videoviews || 0)),
          clicks: parseInt(String(row.clicks || 0)),
          ctr: parseFloat(String(row.ctr || 0)),
          reactions,
          comments,
          shares,
          engagementRate: parseFloat(String(row.engagement_rate || row.engagementrate || 0)),
        })
      }
    }

    // Convert daily impressions to array
    for (const [date, impressions] of Object.entries(dailyImpressions)) {
      impressionDaily.push({ date, impressions })
    }
    impressionDaily.sort((a, b) => a.date.localeCompare(b.date))

    // Previous period
    let prevReactions = 0
    let prevComments = 0
    let prevReposts = 0
    for (const row of previousPeriodRows) {
      prevReactions += parseInt(String(row.reactions || row.likes || 0))
      prevComments += parseInt(String(row.comments || 0))
      prevReposts += parseInt(String(row.shares || row.reposts || 0))
    }

    const contentMetrics: LIContentMetrics = {
      reactions: totalReactions,
      comments: totalComments,
      reposts: totalReposts,
      previousPeriod: {
        reactions: prevReactions,
        comments: prevComments,
        reposts: prevReposts,
      },
    }

    return {
      contentMetrics,
      impressionDaily,
      updates,
    }
  }

  // Parse demographics from a dedicated demographics sheet
  static async fetchDemographics(
    userId: string,
    sheetId: string,
    range: string = 'A:Z'
  ): Promise<{
    industryDemographics: LIDemographic[]
    seniorityDemographics: LIDemographic[]
    jobFunctionDemographics: LIDemographic[]
    companySizeDemographics: LIDemographic[]
  }> {
    const rows = await this.fetchSheetData(userId, sheetId, range)

    // Expected columns: type (industry/seniority/job_function/company_size), segment, value, percentage
    const industryDemographics: LIDemographic[] = []
    const seniorityDemographics: LIDemographic[] = []
    const jobFunctionDemographics: LIDemographic[] = []
    const companySizeDemographics: LIDemographic[] = []

    for (const row of rows) {
      const type = String(row.type || row.category || '').toLowerCase()
      const demographic: LIDemographic = {
        segment: String(row.segment || row.name || ''),
        value: parseInt(String(row.value || row.count || 0)),
        percentage: parseFloat(String(row.percentage || row.percent || 0)),
      }

      if (type.includes('industry')) {
        industryDemographics.push(demographic)
      } else if (type.includes('seniority')) {
        seniorityDemographics.push(demographic)
      } else if (type.includes('job') || type.includes('function')) {
        jobFunctionDemographics.push(demographic)
      } else if (type.includes('company') || type.includes('size')) {
        companySizeDemographics.push(demographic)
      }
    }

    return {
      industryDemographics,
      seniorityDemographics,
      jobFunctionDemographics,
      companySizeDemographics,
    }
  }

  // Fetch all LinkedIn data for a company from configured sheets
  static async fetchAllLinkedInData(
    userId: string,
    config: LinkedInSheetConfig
  ): Promise<{
    visitorMetrics: LIVisitorMetrics
    followerMetrics: LIFollowerMetrics
    contentMetrics: LIContentMetrics
    visitorDaily: LIVisitorDaily[]
    followerDaily: LIFollowerDaily[]
    impressionDaily: LIImpressionDaily[]
    industryDemographics: LIDemographic[]
    seniorityDemographics: LIDemographic[]
    jobFunctionDemographics: LIDemographic[]
    companySizeDemographics: LIDemographic[]
    updates: LIUpdate[]
  } | null> {
    // If no sheets configured, return null (will fall back to mock data)
    if (!config.pageAnalyticsSheetId && !config.postAnalyticsSheetId) {
      return null
    }

    // Default values
    let visitorMetrics: LIVisitorMetrics = {
      pageViews: 0,
      uniqueVisitors: 0,
      customButtonClicks: 0,
    }
    let followerMetrics: LIFollowerMetrics = {
      totalFollowers: 0,
      newFollowers: 0,
    }
    let contentMetrics: LIContentMetrics = {
      reactions: 0,
      comments: 0,
      reposts: 0,
      impressions: 0,
      clicks: 0,
      engagementRate: 0,
    }
    let visitorDaily: LIVisitorDaily[] = []
    let followerDaily: LIFollowerDaily[] = []
    let impressionDaily: LIImpressionDaily[] = []
    let industryDemographics: LIDemographic[] = []
    let seniorityDemographics: LIDemographic[] = []
    let jobFunctionDemographics: LIDemographic[] = []
    let companySizeDemographics: LIDemographic[] = []
    let updates: LIUpdate[] = []

    try {
      // Fetch page analytics if configured
      if (config.pageAnalyticsSheetId) {
        const pageData = await this.fetchPageAnalytics(
          userId,
          config.pageAnalyticsSheetId,
          config.pageAnalyticsRange || 'A:Z'
        )
        visitorMetrics = pageData.visitorMetrics
        visitorDaily = pageData.visitorDaily

        // If demographics are in the same sheet
        if (pageData.industryDemographics.length > 0) {
          industryDemographics = pageData.industryDemographics
          seniorityDemographics = pageData.seniorityDemographics
          jobFunctionDemographics = pageData.jobFunctionDemographics
          companySizeDemographics = pageData.companySizeDemographics
        }

        // Also fetch follower data from page analytics sheet if it has that data
        const followerData = await this.fetchFollowerAnalytics(
          userId,
          config.pageAnalyticsSheetId,
          config.pageAnalyticsRange || 'A:Z'
        )
        if (followerData.followerMetrics.totalFollowers > 0) {
          followerMetrics = followerData.followerMetrics
          followerDaily = followerData.followerDaily
        }
      }

      // Fetch post analytics if configured
      if (config.postAnalyticsSheetId) {
        const postData = await this.fetchPostAnalytics(
          userId,
          config.postAnalyticsSheetId,
          config.postAnalyticsRange || 'A:Z'
        )
        contentMetrics = postData.contentMetrics
        impressionDaily = postData.impressionDaily
        updates = postData.updates
      }

      return {
        visitorMetrics,
        followerMetrics,
        contentMetrics,
        visitorDaily,
        followerDaily,
        impressionDaily,
        industryDemographics,
        seniorityDemographics,
        jobFunctionDemographics,
        companySizeDemographics,
        updates,
      }
    } catch (error) {
      console.error('[LinkedIn Sheets Service] Error fetching data:', error)
      throw error
    }
  }
}
