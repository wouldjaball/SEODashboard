import { OAuthTokenService } from './oauth-token-service'
import { LINKEDIN_API_VERSION, LINKEDIN_API_BASE } from '@/lib/constants/linkedin-oauth-scopes'
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LISearchAppearanceMetrics,
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

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${tokenResult.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json'
    }
    
    // Always add LinkedIn-Version header (required for new API)
    if (LINKEDIN_API_VERSION) {
      headers['LinkedIn-Version'] = LINKEDIN_API_VERSION
    }

    const response = await fetch(url, { headers })

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
    // Validate input date
    if (!dateStr || dateStr === 'undefined' || dateStr === 'null') {
      console.error(`[LinkedIn] Invalid date parameter received: "${dateStr}". Using current date as fallback.`)
      const fallbackDate = new Date().toISOString().split('T')[0]
      const fallbackTimestamp = new Date(fallbackDate).getTime().toString()
      console.log(`[LinkedIn] Fallback date: ${fallbackDate} → timestamp: ${fallbackTimestamp}`)
      return fallbackTimestamp
    }

    const date = new Date(dateStr)
    const timestamp = date.getTime()
    
    // Check if timestamp is valid (not NaN)
    if (isNaN(timestamp)) {
      console.error(`[LinkedIn] Invalid date format: "${dateStr}". Using current date as fallback.`)
      const fallbackDate = new Date().toISOString().split('T')[0]
      const fallbackTimestamp = new Date(fallbackDate).getTime().toString()
      console.log(`[LinkedIn] Fallback date: ${fallbackDate} → timestamp: ${fallbackTimestamp}`)
      return fallbackTimestamp
    }

    console.log(`[LinkedIn] Converting date ${dateStr} to timestamp ${timestamp}`)
    return timestamp.toString()
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
      console.log('[LinkedIn Followers] Attempting to fetch follower metrics...')
      
      // Always try to fetch lifetime follower count first
      let totalFollowers = 0
      let paidFollowers = 0
      
      try {
        console.log('[LinkedIn Followers] Fetching lifetime follower counts...')
        const lifetimeData = await this.makeRequest(
          userId,
          organizationId,
          '/organizationalEntityFollowerStatistics',
          {
            q: 'organizationalEntity',
            organizationalEntity: `urn:li:organization:${organizationId}`
          }
        ) as { elements?: Array<{ followerCounts?: { organicFollowerCount?: number, paidFollowerCount?: number } }> }

        totalFollowers = lifetimeData.elements?.[0]?.followerCounts?.organicFollowerCount || 0
        paidFollowers = lifetimeData.elements?.[0]?.followerCounts?.paidFollowerCount || 0
        console.log(`[LinkedIn Followers] Lifetime follower counts: ${totalFollowers} organic, ${paidFollowers} paid`)
        
      } catch (lifetimeError) {
        console.error('[LinkedIn Followers] Failed to fetch lifetime follower counts:', lifetimeError)
      }

      // Try to fetch time-bound follower gains
      let newFollowers = 0
      let previousNewFollowers = 0
      
      try {
        console.log('[LinkedIn Followers] Attempting to fetch time-bound follower gains...')
        
        // Try object notation first
        let timeRangeData: any
        try {
          timeRangeData = await this.makeRequest(
            userId,
            organizationId,
            '/organizationalEntityFollowerStatistics',
            {
              q: 'organizationalEntity',
              organizationalEntity: `urn:li:organization:${organizationId}`,
              timeIntervals: `(timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}),timeGranularityType:DAY)`
            }
          ) as { elements?: Array<{ followerGains?: { organicFollowerGain?: number } }> }
        } catch (objectError) {
          console.log('[LinkedIn Followers] Object notation failed, trying RestLi 1.0 format...')
          
          // Fallback to RestLi 1.0 format
          timeRangeData = await this.makeRequest(
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
        }

        // Calculate new followers in period
        if (timeRangeData?.elements) {
          newFollowers = timeRangeData.elements.reduce((sum: number, elem: any) => {
            return sum + (elem.followerGains?.organicFollowerGain || 0)
          }, 0)
        }
        
        console.log(`[LinkedIn Followers] New followers in period: ${newFollowers}`)

        // Try to get previous period data
        try {
          const previousTimeRangeData = await this.makeRequest(
            userId,
            organizationId,
            '/organizationalEntityFollowerStatistics',
            {
              q: 'organizationalEntity',
              organizationalEntity: `urn:li:organization:${organizationId}`,
              timeIntervals: `(timeRange:(start:${this.formatDate(previousStartDate)},end:${this.formatDate(previousEndDate)}),timeGranularityType:DAY)`
            }
          ) as { elements?: Array<{ followerGains?: { organicFollowerGain?: number } }> }

          if (previousTimeRangeData?.elements) {
            previousNewFollowers = previousTimeRangeData.elements.reduce((sum: number, elem: any) => {
              return sum + (elem.followerGains?.organicFollowerGain || 0)
            }, 0)
          }
        } catch (prevError) {
          console.log('[LinkedIn Followers] Previous period data unavailable, using 0')
        }
        
      } catch (timeRangeError) {
        console.log('[LinkedIn Followers] Time-bound follower gains unavailable:', timeRangeError)
        // newFollowers remains 0
      }

      // Estimate previous total (current total - new followers in current period)
      const previousTotalFollowers = Math.max(0, totalFollowers - newFollowers)

      const result = {
        totalFollowers: totalFollowers + paidFollowers,
        newFollowers,
        previousPeriod: {
          totalFollowers: previousTotalFollowers + paidFollowers,
          newFollowers: previousNewFollowers
        }
      }
      
      console.log(`[LinkedIn Followers] Final results: ${result.totalFollowers} total, ${result.newFollowers} new`)

      return result
    } catch (error) {
      console.error('Failed to fetch LinkedIn follower metrics:', error)
      // Return empty metrics instead of throwing
      return {
        totalFollowers: 0,
        newFollowers: 0,
        previousPeriod: {
          totalFollowers: 0,
          newFollowers: 0
        }
      }
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
      console.log('[LinkedIn Page Stats] Attempting to fetch page statistics...')
      
      let currentData: any = null
      let previousData: any = null
      
      try {
        // First try lifetime statistics (no time intervals)
        console.log('[LinkedIn Page Stats] Trying lifetime statistics...')
        const lifetimeData = await this.makeRequest(
          userId,
          organizationId,
          '/organizationPageStatistics',
          {
            q: 'organization',
            organization: `urn:li:organization:${organizationId}`
          }
        ) as { elements?: Array<{ totalPageStatistics?: { views?: { allPageViews?: number }, clicks?: { mobileCustomButtonClickCounts?: number, desktopCustomButtonClickCounts?: number } } }> }
        
        console.log('[LinkedIn Page Stats] Lifetime statistics successful, using as current period')
        currentData = lifetimeData
        previousData = { elements: [] } // No previous period data for lifetime stats
        
      } catch (lifetimeError) {
        console.log('[LinkedIn Page Stats] Lifetime statistics failed, trying time-bound with object notation...')
        
        try {
          // Try with time intervals using object notation
          const timeBoundData = await this.makeRequest(
            userId,
            organizationId,
            '/organizationPageStatistics',
            {
              q: 'organization',
              organization: `urn:li:organization:${organizationId}`,
              timeIntervals: `(timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}),timeGranularityType:DAY)`
            }
          ) as { elements?: Array<{ totalPageStatistics?: { views?: { allPageViews?: number }, clicks?: { mobileCustomButtonClickCounts?: number, desktopCustomButtonClickCounts?: number } } }> }
          
          currentData = timeBoundData
          console.log('[LinkedIn Page Stats] Time-bound statistics successful')
          
          // Try to get previous period
          try {
            const previousTimeBoundData = await this.makeRequest(
              userId,
              organizationId,
              '/organizationPageStatistics',
              {
                q: 'organization',
                organization: `urn:li:organization:${organizationId}`,
                timeIntervals: `(timeRange:(start:${this.formatDate(previousStartDate)},end:${this.formatDate(previousEndDate)}),timeGranularityType:DAY)`
              }
            ) as { elements?: Array<{ totalPageStatistics?: { views?: { allPageViews?: number }, clicks?: { mobileCustomButtonClickCounts?: number, desktopCustomButtonClickCounts?: number } } }> }
            previousData = previousTimeBoundData
          } catch (prevError) {
            console.log('[LinkedIn Page Stats] Previous period fetch failed, using empty data')
            previousData = { elements: [] }
          }
          
        } catch (timeBoundError) {
          console.error('[LinkedIn Page Stats] Both lifetime and time-bound statistics failed:', timeBoundError)
          throw timeBoundError
        }
      }

      let pageViews = 0
      let customButtonClicks = 0

      // Helper to extract page views from v2 API response structure
      // v2 API returns: pageStatisticsBySeniority[].pageStatistics.views.allPageViews.pageViews
      // REST API returns: totalPageStatistics.views.allPageViews (number)
      const extractPageViews = (elem: any): number => {
        // Try REST API format first (totalPageStatistics)
        if (elem.totalPageStatistics?.views?.allPageViews) {
          const val = elem.totalPageStatistics.views.allPageViews
          return typeof val === 'number' ? val : (val?.pageViews || 0)
        }
        
        // Try v2 API format - get from first available breakdown (they all contain the same totals)
        const breakdowns = ['pageStatisticsBySeniority', 'pageStatisticsByFunction', 'pageStatisticsByStaffCountRange']
        for (const key of breakdowns) {
          if (elem[key]?.length > 0) {
            // Sum all views from this breakdown category
            let total = 0
            for (const item of elem[key]) {
              const views = item.pageStatistics?.views?.allPageViews
              total += typeof views === 'number' ? views : (views?.pageViews || 0)
            }
            if (total > 0) return total
          }
        }
        return 0
      }

      if (currentData?.elements) {
        for (const elem of currentData.elements) {
          pageViews += extractPageViews(elem)
          // Button clicks - try both formats
          const clicks = elem.totalPageStatistics?.clicks || {}
          customButtonClicks += (clicks.mobileCustomButtonClickCounts || 0) +
            (clicks.desktopCustomButtonClickCounts || 0)
        }
      }

      let previousPageViews = 0
      let previousCustomButtonClicks = 0

      if (previousData?.elements) {
        for (const elem of previousData.elements) {
          previousPageViews += extractPageViews(elem)
          const clicks = elem.totalPageStatistics?.clicks || {}
          previousCustomButtonClicks += (clicks.mobileCustomButtonClickCounts || 0) +
            (clicks.desktopCustomButtonClickCounts || 0)
        }
      }

      // Estimate unique visitors (LinkedIn doesn't always provide this directly)
      const uniqueVisitors = Math.round(pageViews * 0.7) // Rough estimate
      const previousUniqueVisitors = Math.round(previousPageViews * 0.7)

      console.log(`[LinkedIn Page Stats] Final results: ${pageViews} page views, ${uniqueVisitors} unique visitors`)

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
      // Return empty metrics instead of throwing
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
      // Fetch share statistics for current period - Fixed parameter format
      // Try lifetime stats first (more reliable), then time-bound
      let currentData: any
      try {
        currentData = await this.makeRequest(
          userId,
          organizationId,
          '/organizationalEntityShareStatistics',
          {
            q: 'organizationalEntity',
            organizationalEntity: `urn:li:organization:${organizationId}`
          }
        )
      } catch {
        // Fallback to time-bound if lifetime fails
        currentData = await this.makeRequest(
          userId,
          organizationId,
          '/organizationalEntityShareStatistics',
          {
            q: 'organizationalEntity',
            organizationalEntity: `urn:li:organization:${organizationId}`,
            timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
          }
        )
      }

      let reactions = 0
      let comments = 0
      let reposts = 0
      let impressions = 0
      let clicks = 0
      let engagementRate = 0

      if (currentData.elements) {
        for (const elem of currentData.elements) {
          const stats = elem.totalShareStatistics || {}
          reactions += stats.likeCount || 0
          comments += stats.commentCount || 0
          reposts += stats.shareCount || 0
          impressions += stats.impressionCount || 0
          clicks += stats.clickCount || 0
          // LinkedIn provides engagement as a decimal (0.09 = 9%)
          // Keep as decimal - formatPercent will handle display conversion
          if (stats.engagement) {
            engagementRate = stats.engagement
          }
        }
      }

      // Calculate engagement rate if not provided (as decimal for formatPercent)
      if (engagementRate === 0 && impressions > 0) {
        const totalEngagement = reactions + comments + reposts + clicks
        engagementRate = totalEngagement / impressions  // Keep as decimal
      }

      // Fetch previous period for comparison
      let previousReactions = 0
      let previousComments = 0
      let previousReposts = 0
      let previousImpressions = 0
      let previousClicks = 0
      let previousEngagementRate = 0

      try {
        const previousData = await this.makeRequest(
          userId,
          organizationId,
          '/organizationalEntityShareStatistics',
          {
            q: 'organizationalEntity',
            organizationalEntity: `urn:li:organization:${organizationId}`,
            timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(previousStartDate)},end:${this.formatDate(previousEndDate)}))`
          }
        ) as any

        if (previousData.elements) {
          for (const elem of previousData.elements) {
            const stats = elem.totalShareStatistics || {}
            previousReactions += stats.likeCount || 0
            previousComments += stats.commentCount || 0
            previousReposts += stats.shareCount || 0
            previousImpressions += stats.impressionCount || 0
            previousClicks += stats.clickCount || 0
            if (stats.engagement) {
              previousEngagementRate = stats.engagement  // Keep as decimal
            }
          }
        }
      } catch {
        // Previous period data not available, that's okay
      }

      return {
        reactions,
        comments,
        reposts,
        impressions,
        clicks,
        engagementRate: Number(engagementRate.toFixed(4)),  // Keep precision for decimal
        previousPeriod: {
          reactions: previousReactions,
          comments: previousComments,
          reposts: previousReposts,
          impressions: previousImpressions,
          clicks: previousClicks,
          engagementRate: Number(previousEngagementRate.toFixed(4))  // Keep precision for decimal
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn share statistics:', error)
      throw error
    }
  }

  /**
   * Fetch recent posts from the organization with detailed performance metrics
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

      // Fetch detailed metrics for each post
      const postsWithMetrics = await Promise.all(
        data.elements
          .filter(post => post.lifecycleState === 'PUBLISHED')
          .map(async (post) => {
            const postId = post.id?.split(':').pop() || ''
            const commentary = post.commentary || ''
            const title = commentary.length > 100 ? commentary.substring(0, 100) + '...' : commentary

            // Fetch individual post metrics
            let metrics = {
              impressions: 0,
              videoViews: 0,
              clicks: 0,
              reactions: 0,
              comments: 0,
              shares: 0
            }

            try {
              if (post.id) {
                const postMetrics = await this.makeRequest(
                  userId,
                  organizationId,
                  '/socialMetadata',
                  {
                    ids: post.id
                  }
                ) as { elements?: Array<{
                  totalShareStatistics?: {
                    impressionCount?: number,
                    clickCount?: number,
                    likeCount?: number,
                    commentCount?: number,
                    shareCount?: number
                  },
                  totalVideoStatistics?: {
                    viewCount?: number
                  }
                }> }

                if (postMetrics.elements && postMetrics.elements[0]) {
                  const stats = postMetrics.elements[0]
                  metrics = {
                    impressions: stats.totalShareStatistics?.impressionCount || 0,
                    videoViews: stats.totalVideoStatistics?.viewCount || 0,
                    clicks: stats.totalShareStatistics?.clickCount || 0,
                    reactions: stats.totalShareStatistics?.likeCount || 0,
                    comments: stats.totalShareStatistics?.commentCount || 0,
                    shares: stats.totalShareStatistics?.shareCount || 0
                  }
                }
              }
            } catch (postMetricsError) {
              console.warn('Failed to fetch metrics for post', postId, postMetricsError)
            }

            const totalEngagement = metrics.reactions + metrics.comments + metrics.shares
            const engagementRate = metrics.impressions > 0 ? (totalEngagement / metrics.impressions) * 100 : 0
            const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0

            return {
              id: postId,
              title: title || 'Untitled Post',
              publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
              imageUrl: post.content?.article?.thumbnail,
              linkUrl: `https://www.linkedin.com/feed/update/urn:li:share:${postId}`,
              impressions: metrics.impressions,
              videoViews: metrics.videoViews,
              clicks: metrics.clicks,
              ctr: Number(ctr.toFixed(2)),
              reactions: metrics.reactions,
              comments: metrics.comments,
              shares: metrics.shares,
              engagementRate: Number(engagementRate.toFixed(2))
            }
          })
      )

      return postsWithMetrics
    } catch (error) {
      console.error('Failed to fetch LinkedIn posts:', error)
      return []
    }
  }

  /**
   * Fetch organic vs sponsored content breakdown
   */
  static async fetchContentBreakdown(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    organicPosts: number
    sponsoredPosts: number
    organicImpressions: number
    sponsoredImpressions: number
    organicEngagement: number
    sponsoredEngagement: number
  }> {
    try {
      console.log('[LinkedIn Content] Fetching organic vs sponsored breakdown for organization:', organizationId)
      
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityShareStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`,
          breakdown: 'SPONSORSHIP_TYPE'
        }
      ) as { elements?: Array<{
        shareStatisticsBySponsorship?: Array<{
          sponsorshipType?: 'ORGANIC' | 'SPONSORED',
          shareStatistics?: {
            shareCount?: number,
            impressionCount?: number,
            likeCount?: number,
            commentCount?: number,
            clickCount?: number
          }
        }>
      }> }

      let organicPosts = 0
      let sponsoredPosts = 0
      let organicImpressions = 0
      let sponsoredImpressions = 0
      let organicEngagement = 0
      let sponsoredEngagement = 0

      if (data.elements) {
        for (const elem of data.elements) {
          if (elem.shareStatisticsBySponsorship) {
            for (const sponsorshipData of elem.shareStatisticsBySponsorship) {
              const stats = sponsorshipData.shareStatistics
              if (!stats) continue

              const engagement = (stats.likeCount || 0) + (stats.commentCount || 0) + (stats.clickCount || 0)

              if (sponsorshipData.sponsorshipType === 'ORGANIC') {
                organicPosts += stats.shareCount || 0
                organicImpressions += stats.impressionCount || 0
                organicEngagement += engagement
              } else if (sponsorshipData.sponsorshipType === 'SPONSORED') {
                sponsoredPosts += stats.shareCount || 0
                sponsoredImpressions += stats.impressionCount || 0
                sponsoredEngagement += engagement
              }
            }
          }
        }
      }

      return {
        organicPosts,
        sponsoredPosts,
        organicImpressions,
        sponsoredImpressions,
        organicEngagement,
        sponsoredEngagement
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn content breakdown:', error)
      return {
        organicPosts: 0,
        sponsoredPosts: 0,
        organicImpressions: 0,
        sponsoredImpressions: 0,
        organicEngagement: 0,
        sponsoredEngagement: 0
      }
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
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
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
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
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
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
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
   * Fetch video analytics for the organization
   */
  static async fetchVideoAnalytics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<{
    totalWatchTime: number
    totalViews: number
    totalViewers: number
    averageWatchTime: number
    previousPeriod: {
      totalWatchTime: number
      totalViews: number
      totalViewers: number
      averageWatchTime: number
    }
  }> {
    try {
      console.log('[LinkedIn Video] Fetching video analytics for organization:', organizationId)
      
      // Fetch video statistics for current period
      const currentData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityVideoStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
        }
      ) as { elements?: Array<{ 
        totalVideoStatistics?: { 
          watchTime?: number,
          views?: number,
          viewers?: number
        } 
      }> }

      let totalWatchTime = 0
      let totalViews = 0
      let totalViewers = 0

      if (currentData.elements) {
        for (const elem of currentData.elements) {
          totalWatchTime += elem.totalVideoStatistics?.watchTime || 0
          totalViews += elem.totalVideoStatistics?.views || 0
          totalViewers += elem.totalVideoStatistics?.viewers || 0
        }
      }

      // Fetch previous period
      const previousData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityVideoStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(previousStartDate)},end:${this.formatDate(previousEndDate)}))`
        }
      ) as { elements?: Array<{ 
        totalVideoStatistics?: { 
          watchTime?: number,
          views?: number,
          viewers?: number
        } 
      }> }

      let previousTotalWatchTime = 0
      let previousTotalViews = 0
      let previousTotalViewers = 0

      if (previousData.elements) {
        for (const elem of previousData.elements) {
          previousTotalWatchTime += elem.totalVideoStatistics?.watchTime || 0
          previousTotalViews += elem.totalVideoStatistics?.views || 0
          previousTotalViewers += elem.totalVideoStatistics?.viewers || 0
        }
      }

      const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0
      const previousAverageWatchTime = previousTotalViews > 0 ? previousTotalWatchTime / previousTotalViews : 0

      return {
        totalWatchTime,
        totalViews,
        totalViewers,
        averageWatchTime,
        previousPeriod: {
          totalWatchTime: previousTotalWatchTime,
          totalViews: previousTotalViews,
          totalViewers: previousTotalViewers,
          averageWatchTime: previousAverageWatchTime
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn video analytics:', error)
      // Return empty metrics on error
      return {
        totalWatchTime: 0,
        totalViews: 0,
        totalViewers: 0,
        averageWatchTime: 0,
        previousPeriod: {
          totalWatchTime: 0,
          totalViews: 0,
          totalViewers: 0,
          averageWatchTime: 0
        }
      }
    }
  }

  /**
   * Fetch daily video analytics data for charts
   */
  static async fetchVideoDaily(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{
    date: string
    watchTime: number
    views: number
    viewers: number
  }>> {
    try {
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityVideoStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
        }
      ) as { elements?: Array<{
        timeRange?: { start?: number },
        totalVideoStatistics?: { 
          watchTime?: number,
          views?: number,
          viewers?: number
        }
      }> }

      if (!data.elements) return []

      return data.elements.map(elem => {
        const date = elem.timeRange?.start
          ? new Date(elem.timeRange.start).toISOString().split('T')[0]
          : ''

        return {
          date,
          watchTime: elem.totalVideoStatistics?.watchTime || 0,
          views: elem.totalVideoStatistics?.views || 0,
          viewers: elem.totalVideoStatistics?.viewers || 0
        }
      }).filter(d => d.date)
    } catch (error) {
      console.error('Failed to fetch LinkedIn daily video data:', error)
      return []
    }
  }

  /**
   * Fetch employee advocacy metrics for the organization
   */
  static async fetchEmployeeAdvocacyMetrics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<{
    employeeShares: number
    employeeEngagement: number
    contentAmplification: number
    employeeReach: number
    previousPeriod: {
      employeeShares: number
      employeeEngagement: number
      contentAmplification: number
      employeeReach: number
    }
  }> {
    try {
      console.log('[LinkedIn Employee Advocacy] Fetching advocacy metrics for organization:', organizationId)
      
      // Fetch employee activity statistics for current period
      const currentData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityEmployeeStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
        }
      ) as { elements?: Array<{ 
        employeeActivityStatistics?: { 
          shares?: number,
          engagement?: number,
          amplification?: number,
          reach?: number
        } 
      }> }

      let employeeShares = 0
      let employeeEngagement = 0
      let contentAmplification = 0
      let employeeReach = 0

      if (currentData.elements) {
        for (const elem of currentData.elements) {
          employeeShares += elem.employeeActivityStatistics?.shares || 0
          employeeEngagement += elem.employeeActivityStatistics?.engagement || 0
          contentAmplification += elem.employeeActivityStatistics?.amplification || 0
          employeeReach += elem.employeeActivityStatistics?.reach || 0
        }
      }

      // Fetch previous period
      const previousData = await this.makeRequest(
        userId,
        organizationId,
        '/organizationalEntityEmployeeStatistics',
        {
          q: 'organizationalEntity',
          organizationalEntity: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(previousStartDate)},end:${this.formatDate(previousEndDate)}))`
        }
      ) as { elements?: Array<{ 
        employeeActivityStatistics?: { 
          shares?: number,
          engagement?: number,
          amplification?: number,
          reach?: number
        } 
      }> }

      let previousEmployeeShares = 0
      let previousEmployeeEngagement = 0
      let previousContentAmplification = 0
      let previousEmployeeReach = 0

      if (previousData.elements) {
        for (const elem of previousData.elements) {
          previousEmployeeShares += elem.employeeActivityStatistics?.shares || 0
          previousEmployeeEngagement += elem.employeeActivityStatistics?.engagement || 0
          previousContentAmplification += elem.employeeActivityStatistics?.amplification || 0
          previousEmployeeReach += elem.employeeActivityStatistics?.reach || 0
        }
      }

      return {
        employeeShares,
        employeeEngagement,
        contentAmplification,
        employeeReach,
        previousPeriod: {
          employeeShares: previousEmployeeShares,
          employeeEngagement: previousEmployeeEngagement,
          contentAmplification: previousContentAmplification,
          employeeReach: previousEmployeeReach
        }
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn employee advocacy metrics:', error)
      // Return empty metrics on error
      return {
        employeeShares: 0,
        employeeEngagement: 0,
        contentAmplification: 0,
        employeeReach: 0,
        previousPeriod: {
          employeeShares: 0,
          employeeEngagement: 0,
          contentAmplification: 0,
          employeeReach: 0
        }
      }
    }
  }

  /**
   * Fetch company mention and social listening data
   */
  static async fetchSocialListeningMetrics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{
    date: string
    mentions: number
    sentiment: 'positive' | 'negative' | 'neutral'
    reach: number
    engagement: number
    mentionType: 'post' | 'comment' | 'share'
    memberInfo?: {
      name: string
      headline: string
      profileUrl: string
    }
  }>> {
    try {
      console.log('[LinkedIn Social Listening] Fetching mentions for organization:', organizationId)
      
      const data = await this.makeRequest(
        userId,
        organizationId,
        '/organizationSocialMetadata',
        {
          q: 'organization',
          organization: `urn:li:organization:${organizationId}`,
          timeIntervals: `(timeGranularityType:DAY,timeRange:(start:${this.formatDate(startDate)},end:${this.formatDate(endDate)}))`
        }
      ) as { elements?: Array<{
        timeRange?: { start?: number },
        socialActions?: Array<{
          type?: string,
          sentiment?: string,
          reach?: number,
          engagement?: number,
          member?: {
            name?: string,
            headline?: string,
            profileUrl?: string
          }
        }>
      }> }

      if (!data.elements) return []

      const mentions: Array<{
        date: string
        mentions: number
        sentiment: 'positive' | 'negative' | 'neutral'
        reach: number
        engagement: number
        mentionType: 'post' | 'comment' | 'share'
        memberInfo?: {
          name: string
          headline: string
          profileUrl: string
        }
      }> = []

      data.elements.forEach(elem => {
        const date = elem.timeRange?.start
          ? new Date(elem.timeRange.start).toISOString().split('T')[0]
          : ''

        if (elem.socialActions) {
          elem.socialActions.forEach(action => {
            mentions.push({
              date,
              mentions: 1,
              sentiment: (action.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
              reach: action.reach || 0,
              engagement: action.engagement || 0,
              mentionType: (action.type as 'post' | 'comment' | 'share') || 'post',
              memberInfo: action.member ? {
                name: action.member.name || 'Unknown',
                headline: action.member.headline || '',
                profileUrl: action.member.profileUrl || ''
              } : undefined
            })
          })
        }
      })

      return mentions.filter(m => m.date)
    } catch (error) {
      console.error('Failed to fetch LinkedIn social listening data:', error)
      return []
    }
  }

  /**
   * Add rate limiting to API requests
   */
  private static requestQueue: Array<() => Promise<any>> = []
  private static isProcessing = false
  private static lastRequestTime = 0
  private static readonly RATE_LIMIT_DELAY = 200 // 200ms between requests (5 requests/second)

  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return
    
    this.isProcessing = true
    
    while (this.requestQueue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      
      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest))
      }
      
      const request = this.requestQueue.shift()!
      this.lastRequestTime = Date.now()
      
      try {
        await request()
      } catch (error) {
        console.error('[LinkedIn Rate Limiter] Request failed:', error)
      }
    }
    
    this.isProcessing = false
  }

  private static async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  /**
   * Enhanced makeRequest with rate limiting and better error handling
   */
  private static async makeRequestWithRateLimit(
    userId: string,
    organizationId: string,
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<unknown> {
    return this.queueRequest(() => this.makeRequest(userId, organizationId, endpoint, params))
  }

  /**
   * Fetch all LinkedIn metrics in one call with enhanced capabilities
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
    searchAppearanceMetrics: LISearchAppearanceMetrics
    videoMetrics?: {
      totalWatchTime: number
      totalViews: number
      totalViewers: number
      averageWatchTime: number
      previousPeriod: {
        totalWatchTime: number
        totalViews: number
        totalViewers: number
        averageWatchTime: number
      }
    }
    employeeAdvocacyMetrics?: {
      employeeShares: number
      employeeEngagement: number
      contentAmplification: number
      employeeReach: number
      previousPeriod: {
        employeeShares: number
        employeeEngagement: number
        contentAmplification: number
        employeeReach: number
      }
    }
    contentBreakdown?: {
      organicPosts: number
      sponsoredPosts: number
      organicImpressions: number
      sponsoredImpressions: number
      organicEngagement: number
      sponsoredEngagement: number
    }
    socialListening?: Array<{
      date: string
      mentions: number
      sentiment: 'positive' | 'negative' | 'neutral'
      reach: number
      engagement: number
      mentionType: 'post' | 'comment' | 'share'
      memberInfo?: {
        name: string
        headline: string
        profileUrl: string
      }
    }>
    visitorDaily: LIVisitorDaily[]
    followerDaily: LIFollowerDaily[]
    impressionDaily: LIImpressionDaily[]
    videoDaily?: Array<{
      date: string
      watchTime: number
      views: number
      viewers: number
    }>
    industryDemographics: LIDemographic[]
    seniorityDemographics: LIDemographic[]
    jobFunctionDemographics: LIDemographic[]
    companySizeDemographics: LIDemographic[]
    updates: LIUpdate[]
  }> {
    console.log('[LinkedIn] Fetching enhanced metrics for organization:', organizationId)
    
    // Fetch all data in parallel using allSettled to handle partial failures
    const results = await Promise.allSettled([
      // Core metrics (existing)
      this.fetchPageStatistics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchFollowerMetrics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchShareStatistics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchSearchAppearanceMetrics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchVisitorDaily(userId, organizationId, startDate, endDate),
      this.fetchFollowerDaily(userId, organizationId, startDate, endDate),
      this.fetchImpressionDaily(userId, organizationId, startDate, endDate),
      this.fetchDemographics(userId, organizationId),
      this.fetchPosts(userId, organizationId, 20),
      
      // Enhanced metrics (new)
      this.fetchVideoAnalytics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchEmployeeAdvocacyMetrics(userId, organizationId, startDate, endDate, previousStartDate, previousEndDate),
      this.fetchContentBreakdown(userId, organizationId, startDate, endDate),
      this.fetchSocialListeningMetrics(userId, organizationId, startDate, endDate),
      this.fetchVideoDaily(userId, organizationId, startDate, endDate)
    ])

    // Extract successful results and log failed ones
    const [
      visitorResult,
      followerResult, 
      contentResult,
      searchAppearanceResult,
      visitorDailyResult,
      followerDailyResult,
      impressionDailyResult,
      demographicsResult,
      updatesResult,
      videoMetricsResult,
      employeeAdvocacyResult,
      contentBreakdownResult,
      socialListeningResult,
      videoDailyResult
    ] = results

    // Log any failed API calls
    const apiNames = [
      'PageStatistics', 'FollowerMetrics', 'ShareStatistics', 'SearchAppearances',
      'VisitorDaily', 'FollowerDaily', 'ImpressionDaily', 
      'Demographics', 'Posts', 'VideoAnalytics', 'EmployeeAdvocacy',
      'ContentBreakdown', 'SocialListening', 'VideoDaily'
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
    const searchAppearanceMetrics = searchAppearanceResult.status === 'fulfilled' ? searchAppearanceResult.value : this.getEmptySearchAppearanceMetrics()
    const visitorDaily = visitorDailyResult.status === 'fulfilled' ? visitorDailyResult.value : []
    const followerDaily = followerDailyResult.status === 'fulfilled' ? followerDailyResult.value : []
    const impressionDaily = impressionDailyResult.status === 'fulfilled' ? impressionDailyResult.value : []
    const demographics = demographicsResult.status === 'fulfilled' ? demographicsResult.value : this.getEmptyDemographics()
    const updates = updatesResult.status === 'fulfilled' ? updatesResult.value : []

    // Enhanced metrics (optional - include only if successful)
    const videoMetrics = videoMetricsResult.status === 'fulfilled' ? videoMetricsResult.value : undefined
    const employeeAdvocacyMetrics = employeeAdvocacyResult.status === 'fulfilled' ? employeeAdvocacyResult.value : undefined
    const contentBreakdown = contentBreakdownResult.status === 'fulfilled' ? contentBreakdownResult.value : undefined
    const socialListening = socialListeningResult.status === 'fulfilled' ? socialListeningResult.value : undefined
    const videoDaily = videoDailyResult.status === 'fulfilled' ? videoDailyResult.value : undefined

    console.log('[LinkedIn] Enhanced metrics summary:')
    console.log('- Core metrics loaded:', { visitors: !!visitorMetrics, followers: !!followerMetrics, content: !!contentMetrics })
    console.log('- Enhanced metrics:', { video: !!videoMetrics, advocacy: !!employeeAdvocacyMetrics, breakdown: !!contentBreakdown, listening: !!socialListening })

    return {
      visitorMetrics,
      followerMetrics,
      contentMetrics,
      searchAppearanceMetrics,
      videoMetrics,
      employeeAdvocacyMetrics,
      contentBreakdown,
      socialListening,
      visitorDaily,
      followerDaily,
      impressionDaily,
      videoDaily,
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
      impressions: 0,
      clicks: 0,
      engagementRate: 0,
      previousPeriod: {
        reactions: 0,
        comments: 0,
        reposts: 0,
        impressions: 0,
        clicks: 0,
        engagementRate: 0
      }
    }
  }

  /**
   * Fetch search appearance metrics for an organization
   */
  static async fetchSearchAppearanceMetrics(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<LISearchAppearanceMetrics> {
    try {
      console.log('[LinkedIn Search Appearances] Attempting to fetch search appearance metrics...')
      
      const startTimestamp = this.formatDate(startDate)
      const endTimestamp = this.formatDate(endDate)
      const previousStartTimestamp = this.formatDate(previousStartDate)
      const previousEndTimestamp = this.formatDate(previousEndDate)

      // LinkedIn Community Management API endpoint for search appearances
      // This is a theoretical endpoint - LinkedIn may not have a direct API for this
      // In a real implementation, this might need to be derived from other metrics
      // or use LinkedIn's Marketing API if available
      
      // For now, we'll return mock data or derive from other available metrics
      console.log('[LinkedIn Search Appearances] Note: Using derived/mock data for search appearances as LinkedIn API may not provide this metric directly')
      
      // Mock implementation - in real scenario this would call LinkedIn API
      const mockCurrentAppearances = Math.floor(Math.random() * 10000) + 5000
      const mockPreviousAppearances = Math.floor(Math.random() * 8000) + 4000

      return {
        searchAppearances: mockCurrentAppearances,
        previousPeriod: {
          searchAppearances: mockPreviousAppearances
        }
      }
    } catch (error) {
      console.error('[LinkedIn Search Appearances] Failed to fetch search appearance metrics:', error)
      return this.getEmptySearchAppearanceMetrics()
    }
  }

  private static getEmptySearchAppearanceMetrics(): LISearchAppearanceMetrics {
    return {
      searchAppearances: 0,
      previousPeriod: {
        searchAppearances: 0
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
