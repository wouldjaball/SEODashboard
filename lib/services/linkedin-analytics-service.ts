import { OAuthTokenService, type TokenRefreshResult } from './oauth-token-service'
import { LINKEDIN_API_VERSION, LINKEDIN_API_BASE } from '@/lib/constants/linkedin-oauth-scopes'
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LIVisitorDaily,
  LIDemographic,
  LIUpdate,
  LIFollowerDaily,
  LIImpressionDaily
} from '@/lib/types'

export class LinkedInAnalyticsService {
  /**
   * Make an authenticated request to the LinkedIn REST API
   */
  private static async makeRequest(
    userId: string,
    organizationId: string,
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<unknown> {
    const tokenResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(userId, organizationId)
    if (!tokenResult.success) {
      console.error('[LinkedIn] Token refresh failed:', tokenResult.error, tokenResult.details)
      throw new Error(`LinkedIn authentication failed: ${tokenResult.details}`)
    }

    const queryParams = new URLSearchParams(params)
    const url = `${LINKEDIN_API_BASE}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`

    console.log('LinkedIn API request:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn API error:', response.status, errorText)
      throw new Error(`LinkedIn API Error: ${response.status} - ${errorText}`)
    }

    const jsonResponse = await response.json()
    console.log('LinkedIn API response:', JSON.stringify(jsonResponse, null, 2))
    return jsonResponse
  }

  /**
   * Format date for LinkedIn API (Unix timestamp in milliseconds)
   */
  private static formatDate(dateStr: string): string {
    const timestamp = new Date(dateStr).getTime().toString()
    console.log(`[LinkedIn] Converting date ${dateStr} to timestamp ${timestamp}`)
    return timestamp
  }

  /**
   * Fetch follower statistics for an organization
   */
  static async fetchFollowerMetrics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<LIFollowerMetrics> {
    try {
      // Fetch lifetime follower count
      const lifetimeData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityFollowerStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`
        }
      ) as { elements?: Array<{ followerCounts?: { organicFollowerCount?: number, paidFollowerCount?: number } }> }

      const totalFollowers = lifetimeData.elements?.[0]?.followerCounts?.organicFollowerCount || 0
      const paidFollowers = lifetimeData.elements?.[0]?.followerCounts?.paidFollowerCount || 0

      // Fetch time-bound follower gains
      const timeRangeData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityFollowerStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(startDate),
          'timeIntervals.timeRange.end': this.formatDate(endDate)
        }
      ) as { elements?: Array<{ followerGains?: { organicFollowerGain?: number } }> }

      // Calculate new followers in period
      let newFollowers = 0
      if (timeRangeData.elements) {
        newFollowers = timeRangeData.elements.reduce((sum, elem) => {
          return sum + (elem.followerGains?.organicFollowerGain || 0)
        }, 0)
      }

      // Fetch previous period for comparison
      const previousTimeRangeData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityFollowerStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(previousStartDate),
          'timeIntervals.timeRange.end': this.formatDate(previousEndDate)
        }
      ) as { elements?: Array<{ followerGains?: { organicFollowerGain?: number } }> }

      let previousNewFollowers = 0
      if (previousTimeRangeData.elements) {
        previousNewFollowers = previousTimeRangeData.elements.reduce((sum, elem) => {
          return sum + (elem.followerGains?.organicFollowerGain || 0)
        }, 0)
      }

      // Estimate previous total (current total - new followers in current period)
      const previousTotalFollowers = totalFollowers - newFollowers

      return {
        totalFollowers: totalFollowers + paidFollowers,
        newFollowers,
        previousPeriod: {
          totalFollowers: previousTotalFollowers,
          newFollowers: previousNewFollowers
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn follower metrics:', error)
      throw error
    }
  }

  /**
   * Fetch page statistics (views, visitors)
   */
  static async fetchPageStatistics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<LIVisitorMetrics> {
    try {
      // Fetch page statistics for current period
      const currentData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationPageStatistics',
        {
          q: 'organization',
          organization: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(startDate),
          'timeIntervals.timeRange.end': this.formatDate(endDate)
        }
      ) as { elements?: Array<{ totalPageStatistics?: { views?: { allPageViews?: number }, clicks?: { mobileCustomButtonClickCounts?: number, desktopCustomButtonClickCounts?: number } } }> }

      let pageViews = 0
      let customButtonClicks = 0

      if (currentData.elements) {
        for (const elem of currentData.elements) {
          pageViews += elem.totalPageStatistics?.views?.allPageViews || 0
          customButtonClicks += (elem.totalPageStatistics?.clicks?.mobileCustomButtonClickCounts || 0) +
            (elem.totalPageStatistics?.clicks?.desktopCustomButtonClickCounts || 0)
        }
      }

      // Fetch previous period
      const previousData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationPageStatistics',
        {
          q: 'organization',
          organization: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(previousStartDate),
          'timeIntervals.timeRange.end': this.formatDate(previousEndDate)
        }
      ) as { elements?: Array<{ totalPageStatistics?: { views?: { allPageViews?: number }, clicks?: { mobileCustomButtonClickCounts?: number, desktopCustomButtonClickCounts?: number } } }> }

      let previousPageViews = 0
      let previousCustomButtonClicks = 0

      if (previousData.elements) {
        for (const elem of previousData.elements) {
          previousPageViews += elem.totalPageStatistics?.views?.allPageViews || 0
          previousCustomButtonClicks += (elem.totalPageStatistics?.clicks?.mobileCustomButtonClickCounts || 0) +
            (elem.totalPageStatistics?.clicks?.desktopCustomButtonClickCounts || 0)
        }
      }

      // Estimate unique visitors (LinkedIn doesn't always provide this directly)
      const uniqueVisitors = Math.round(pageViews * 0.7) // Rough estimate
      const previousUniqueVisitors = Math.round(previousPageViews * 0.7)

      return {
        pageViews,
        uniqueVisitors,
        customButtonClicks,
        previousPeriod: {
          pageViews: previousPageViews,
          uniqueVisitors: previousUniqueVisitors,
          customButtonClicks: previousCustomButtonClicks
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn page statistics:', error)
      throw error
    }
  }

  /**
   * Fetch share/post statistics
   */
  static async fetchShareStatistics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<LIContentMetrics> {
    try {
      // Fetch share statistics for current period
      const currentData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityShareStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(startDate),
          'timeIntervals.timeRange.end': this.formatDate(endDate)
        }
      ) as { elements?: Array<{ totalShareStatistics?: { likeCount?: number, commentCount?: number, shareCount?: number } }> }

      let reactions = 0
      let comments = 0
      let reposts = 0

      if (currentData.elements) {
        for (const elem of currentData.elements) {
          reactions += elem.totalShareStatistics?.likeCount || 0
          comments += elem.totalShareStatistics?.commentCount || 0
          reposts += elem.totalShareStatistics?.shareCount || 0
        }
      }

      // Fetch previous period
      const previousData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityShareStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(previousStartDate),
          'timeIntervals.timeRange.end': this.formatDate(previousEndDate)
        }
      ) as { elements?: Array<{ totalShareStatistics?: { likeCount?: number, commentCount?: number, shareCount?: number } }> }

      let previousReactions = 0
      let previousComments = 0
      let previousReposts = 0

      if (previousData.elements) {
        for (const elem of previousData.elements) {
          previousReactions += elem.totalShareStatistics?.likeCount || 0
          previousComments += elem.totalShareStatistics?.commentCount || 0
          previousReposts += elem.totalShareStatistics?.shareCount || 0
        }
      }

      return {
        reactions,
        comments,
        reposts,
        previousPeriod: {
          reactions: previousReactions,
          comments: previousComments,
          reposts: previousReposts
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn share statistics:', error)
      throw error
    }
  }

  /**
   * Fetch recent posts from the organization
   */
  static async fetchPosts(
    userId: string,
    organizationId: string,
    limit: number = 20
  ): Promise<LIUpdate[]> {
    try {
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/posts',
        {
          q: 'author',
          author: `urn:li:organization:${organizationId}`,
          count: limit.toString(),
          sortBy: 'LAST_MODIFIED'
        }
      ) as { elements?: Array<{
        id?: string,
        commentary?: string,
        publishedAt?: number,
        content?: { article?: { thumbnail?: string, source?: string } },
        lifecycleState?: string
      }> }

      if (!data.elements) return []

      return data.elements
        .filter(post => post.lifecycleState === 'PUBLISHED')
        .map(post => {
          // Extract post ID from URN
          const postId = post.id?.split(':').pop() || ''
          const commentary = post.commentary || ''
          // Truncate title from commentary
          const title = commentary.length > 100 ? commentary.substring(0, 100) + '...' : commentary

          return {
            id: postId,
            title: title || 'Untitled Post',
            publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
            imageUrl: post.content?.article?.thumbnail,
            linkUrl: `https://www.linkedin.com/feed/update/urn:li:share:${postId}`,
            impressions: 0, // Would need separate API call for post-level stats
            videoViews: 0,
            clicks: 0,
            ctr: 0,
            reactions: 0,
            comments: 0,
            shares: 0,
            engagementRate: 0
          }
        })
    } catch (error) {
      console.error('Failed to fetch LinkedIn posts:', error)
      return []
    }
  }

  /**
   * Fetch daily visitor data for charts
   */
  static async fetchVisitorDaily(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<LIVisitorDaily[]> {
    try {
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/organizationPageStatistics',
        {
          q: 'organization',
          organization: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(startDate),
          'timeIntervals.timeRange.end': this.formatDate(endDate)
        }
      ) as { elements?: Array<{
        timeRange?: { start?: number },
        pageStatisticsByDevice?: Array<{
          deviceType?: string,
          pageStatistics?: { views?: { allPageViews?: number } }
        }>
      }> }

      if (!data.elements) return []

      return data.elements.map(elem => {
        const date = elem.timeRange?.start
          ? new Date(elem.timeRange.start).toISOString().split('T')[0]
          : ''

        let desktopVisitors = 0
        let mobileVisitors = 0

        if (elem.pageStatisticsByDevice) {
          for (const device of elem.pageStatisticsByDevice) {
            const views = device.pageStatistics?.views?.allPageViews || 0
            if (device.deviceType === 'DESKTOP') {
              desktopVisitors = views
            } else if (device.deviceType === 'MOBILE') {
              mobileVisitors = views
            }
          }
        }

        return { date, desktopVisitors, mobileVisitors }
      }).filter(d => d.date)
    } catch (error) {
      console.error('Failed to fetch LinkedIn daily visitor data:', error)
      return []
    }
  }

  /**
   * Fetch daily follower data for charts
   */
  static async fetchFollowerDaily(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<LIFollowerDaily[]> {
    try {
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityFollowerStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(startDate),
          'timeIntervals.timeRange.end': this.formatDate(endDate)
        }
      ) as { elements?: Array<{
        timeRange?: { start?: number },
        followerGains?: { organicFollowerGain?: number, paidFollowerGain?: number }
      }> }

      if (!data.elements) return []

      return data.elements.map(elem => {
        const date = elem.timeRange?.start
          ? new Date(elem.timeRange.start).toISOString().split('T')[0]
          : ''

        return {
          date,
          organic: elem.followerGains?.organicFollowerGain || 0,
          sponsored: elem.followerGains?.paidFollowerGain || 0
        }
      }).filter(d => d.date)
    } catch (error) {
      console.error('Failed to fetch LinkedIn daily follower data:', error)
      return []
    }
  }

  /**
   * Fetch daily impression data for charts
   */
  static async fetchImpressionDaily(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<LIImpressionDaily[]> {
    try {
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityShareStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          'timeIntervals.timeGranularityType': 'DAY',
          'timeIntervals.timeRange.start': this.formatDate(startDate),
          'timeIntervals.timeRange.end': this.formatDate(endDate)
        }
      ) as { elements?: Array<{
        timeRange?: { start?: number },
        totalShareStatistics?: { impressionCount?: number }
      }> }

      if (!data.elements) return []

      return data.elements.map(elem => {
        const date = elem.timeRange?.start
          ? new Date(elem.timeRange.start).toISOString().split('T')[0]
          : ''

        return {
          date,
          impressions: elem.totalShareStatistics?.impressionCount || 0
        }
      }).filter(d => d.date)
    } catch (error) {
      console.error('Failed to fetch LinkedIn daily impression data:', error)
      return []
    }
  }

  /**
   * Fetch follower demographics
   */
  static async fetchDemographics(
    userId: string,
    organizationId: string
  ): Promise<{
    industry: LIDemographic[]
    seniority: LIDemographic[]
    jobFunction: LIDemographic[]
    companySize: LIDemographic[]
  }> {
    const demographics = {
      industry: [] as LIDemographic[],
      seniority: [] as LIDemographic[],
      jobFunction: [] as LIDemographic[],
      companySize: [] as LIDemographic[]
    }

    try {
      // Fetch follower demographics by various breakdowns
      const breakdowns = ['INDUSTRY', 'SENIORITY', 'FUNCTION', 'STAFF_COUNT_RANGE'] as const
      const targetKeys = ['industry', 'seniority', 'jobFunction', 'companySize'] as const

      for (let i = 0; i < breakdowns.length; i++) {
        try {
          const data = await this.makeRequest(
            userId,
            organizationId,
            '/organizationalEntityFollowerStatistics',
            {
              q: 'organizationalEntity',
              organizationalEntity: `urn:li:organization:${organizationId}`,
              breakdown: breakdowns[i]
            }
          ) as { elements?: Array<{
            followerCountsByAssociationType?: Array<{
              associationType?: string,
              followerCounts?: { organicFollowerCount?: number }
            }>
          }> }

          if (data.elements?.[0]?.followerCountsByAssociationType) {
            const items = data.elements[0].followerCountsByAssociationType
            const total = items.reduce((sum, item) => sum + (item.followerCounts?.organicFollowerCount || 0), 0)

            demographics[targetKeys[i]] = items
              .map(item => ({
                segment: item.associationType || 'Unknown',
                value: item.followerCounts?.organicFollowerCount || 0,
                percentage: total > 0 ? ((item.followerCounts?.organicFollowerCount || 0) / total) * 100 : 0
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10) // Top 10
          }
        } catch (breakdownError) {
          console.error(`Failed to fetch ${breakdowns[i]} demographics:`, breakdownError)
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn demographics:', error)
    }

    return demographics
  }

  /**
   * Fetch all LinkedIn metrics in one call
   */
  static async fetchAllMetrics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
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
  }> {
    console.log('[LinkedIn] Fetching all metrics for organization:', organizationId)
    
    // Fetch all data in parallel using allSettled to handle partial failures
    const results = await Promise.allSettled([
      this.fetchPageStatistics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchFollowerMetrics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchShareStatistics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchVisitorDaily(userId, organizationId, startDate, endDate),
      this.fetchFollowerDaily(userId, organizationId, startDate, endDate),
      this.fetchImpressionDaily(userId, organizationId, startDate, endDate),
      this.fetchDemographics(userId, organizationId),
      this.fetchPosts(userId, organizationId, 20)
    ])

    // Extract successful results and log failed ones
    const [
      visitorResult,
      followerResult, 
      contentResult,
      visitorDailyResult,
      followerDailyResult,
      impressionDailyResult,
      demographicsResult,
      updatesResult
    ] = results

    // Log any failed API calls
    const apiNames = [
      'PageStatistics', 'FollowerMetrics', 'ShareStatistics', 
      'VisitorDaily', 'FollowerDaily', 'ImpressionDaily', 
      'Demographics', 'Posts'
    ]
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[LinkedIn] ${apiNames[index]} API failed:`, result.reason)
      } else {
        console.log(`[LinkedIn] ${apiNames[index]} API succeeded`)
      }
    })

    // Use successful results or provide fallbacks
    const visitorMetrics = visitorResult.status === 'fulfilled' ? visitorResult.value : this.getEmptyVisitorMetrics()
    const followerMetrics = followerResult.status === 'fulfilled' ? followerResult.value : this.getEmptyFollowerMetrics()
    const contentMetrics = contentResult.status === 'fulfilled' ? contentResult.value : this.getEmptyContentMetrics()
    const visitorDaily = visitorDailyResult.status === 'fulfilled' ? visitorDailyResult.value : []
    const followerDaily = followerDailyResult.status === 'fulfilled' ? followerDailyResult.value : []
    const impressionDaily = impressionDailyResult.status === 'fulfilled' ? impressionDailyResult.value : []
    const demographics = demographicsResult.status === 'fulfilled' ? demographicsResult.value : this.getEmptyDemographics()
    const updates = updatesResult.status === 'fulfilled' ? updatesResult.value : []

    return {
      visitorMetrics,
      followerMetrics,
      contentMetrics,
      visitorDaily,
      followerDaily,
      impressionDaily,
      industryDemographics: demographics.industry,
      seniorityDemographics: demographics.seniority,
      jobFunctionDemographics: demographics.jobFunction,
      companySizeDemographics: demographics.companySize,
      updates
    }
  }

  // Fallback methods for failed API calls
  private static getEmptyVisitorMetrics(): LIVisitorMetrics {
    return {
      pageViews: 0,
      uniqueVisitors: 0,
      customButtonClicks: 0,
      previousPeriod: {
        pageViews: 0,
        uniqueVisitors: 0,
        customButtonClicks: 0
      }
    }
  }

  private static getEmptyFollowerMetrics(): LIFollowerMetrics {
    return {
      totalFollowers: 0,
      newFollowers: 0,
      previousPeriod: {
        totalFollowers: 0,
        newFollowers: 0
      }
    }
  }

  private static getEmptyContentMetrics(): LIContentMetrics {
    return {
      reactions: 0,
      comments: 0,
      reposts: 0,
      previousPeriod: {
        reactions: 0,
        comments: 0,
        reposts: 0
      }
    }
  }

  private static getEmptyDemographics(): {
    industry: LIDemographic[]
    seniority: LIDemographic[]
    jobFunction: LIDemographic[]
    companySize: LIDemographic[]
  } {
    return {
      industry: [],
      seniority: [],
      jobFunction: [],
      companySize: []
    }
  }
}
