import { OAuthTokenService, TokenRefreshResult } from './oauth-token-service'
import type { YTMetrics, YTVideo, YTDailyData } from '@/lib/types'

// Extended types for public-only data
export interface YTPublicMetrics {
  views: number              // Total channel views (all-time)
  subscriberCount: number    // Current subscriber count
  videoCount: number         // Total videos on channel
  // These will be 0 for public data (not available)
  totalWatchTime: number
  shares: number
  avgViewDuration: number
  likes: number
  dislikes: number
  comments: number
  subscriptions: number      // Net change - not available publicly
  isPublicDataOnly: boolean  // Flag to indicate limited data
  previousPeriod?: {
    views: number
    totalWatchTime: number
    shares: number
    avgViewDuration: number
    likes: number
    dislikes: number
    comments: number
    subscriptions: number
  }
}

export interface YTPublicVideo {
  id: string
  title: string
  thumbnailUrl: string
  views: number
  likes: number
  comments: number
  publishedAt: string
  // These will be 0 for public data (not available via Data API)
  avgWatchTime: number
  shares: number
}

export class YouTubeAnalyticsService {
  private static async makeAnalyticsRequest(
    userId: string,
    channelId: string,
    params: Record<string, string>
  ) {
    // Try to get a token specifically for this YouTube channel (e.g., Brand Account token)
    // This is critical for accessing analytics of channels owned by Brand Accounts
    const accessToken = await OAuthTokenService.refreshAccessTokenForChannel(userId, channelId)
    if (!accessToken) {
      console.error('[YouTube Service] No valid access token for channel:', channelId)
      throw new Error('TOKEN_REFRESH_FAILED: No valid access token for YouTube channel')
    }

    const queryParams = new URLSearchParams({
      ids: `channel==${channelId}`,
      ...params
    })

    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`YouTube Analytics API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  private static async makeDataRequest(
    userId: string,
    endpoint: string,
    params: Record<string, string>,
    channelId?: string
  ) {
    // Use channel-specific token if channelId is provided
    const accessToken = channelId
      ? await OAuthTokenService.refreshAccessTokenForChannel(userId, channelId)
      : await OAuthTokenService.refreshAccessToken(userId)
    if (!accessToken) {
      console.error('[YouTube Service] No valid access token for endpoint:', endpoint, channelId ? `(channel: ${channelId})` : '')
      throw new Error('TOKEN_REFRESH_FAILED: No valid access token for YouTube API')
    }

    const queryParams = new URLSearchParams(params)

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`YouTube Data API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  static async fetchMetrics(
    userId: string,
    channelId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<YTMetrics> {
    // Validate date inputs
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const today = new Date()
    
    console.log('[YouTube] Date validation:', {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      isStartValid: !isNaN(startDateObj.getTime()),
      isEndValid: !isNaN(endDateObj.getTime()),
      isEndBeforeToday: endDateObj <= today,
      daysDifference: Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
    })
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format provided to YouTube Analytics API')
    }
    
    if (startDateObj >= endDateObj) {
      throw new Error('YouTube Analytics: Start date must be before end date')
    }
    
    if (endDateObj > today) {
      console.warn('[YouTube] End date is in the future, YouTube Analytics API may reject this request')
    }
    const metrics = 'views,estimatedMinutesWatched,shares,likes,dislikes,comments,subscribersGained,averageViewDuration'

    const [currentData, previousData] = await Promise.all([
      this.makeAnalyticsRequest(userId, channelId, {
        startDate,
        endDate,
        metrics
      }),
      this.makeAnalyticsRequest(userId, channelId, {
        startDate: previousStartDate,
        endDate: previousEndDate,
        metrics
      })
    ])

    const current = currentData.rows?.[0] || []
    const previous = previousData.rows?.[0] || []

    // Column order: views, estimatedMinutesWatched, shares, likes, dislikes, comments, subscribersGained, averageViewDuration
    return {
      views: current[0] || 0,
      totalWatchTime: (current[1] || 0) * 60, // Convert minutes to seconds
      shares: current[2] || 0,
      likes: current[3] || 0,
      dislikes: current[4] || 0,
      comments: current[5] || 0,
      subscriptions: current[6] || 0,
      avgViewDuration: current[7] || 0,
      previousPeriod: {
        views: previous[0] || 0,
        totalWatchTime: (previous[1] || 0) * 60,
        shares: previous[2] || 0,
        likes: previous[3] || 0,
        dislikes: previous[4] || 0,
        comments: previous[5] || 0,
        subscriptions: previous[6] || 0,
        avgViewDuration: previous[7] || 0
      }
    }
  }

  static async fetchTopVideos(
    userId: string,
    channelId: string,
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<YTVideo[]> {
    // First, get top video IDs from analytics
    const analyticsData = await this.makeAnalyticsRequest(userId, channelId, {
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,shares',
      dimensions: 'video',
      maxResults: String(limit),
      sort: '-views'
    })

    const videoRows = analyticsData.rows || []
    if (videoRows.length === 0) return []

    const videoIds = videoRows.map((row: any[]) => row[0]).join(',')

    // Get video details from Data API
    const videoDetails = await this.makeDataRequest(userId, 'videos', {
      id: videoIds,
      part: 'snippet,statistics'
    })

    const videoDetailsMap = new Map<string, any>()
    for (const item of videoDetails.items || []) {
      videoDetailsMap.set(item.id, item)
    }

    return videoRows.map((row: any[]) => {
      const videoId = row[0]
      const details = videoDetailsMap.get(videoId)
      const views = row[1] || 0
      const watchTimeMinutes = row[2] || 0
      const shares = row[3] || 0

      return {
        id: videoId,
        title: details?.snippet?.title || 'Unknown Video',
        thumbnailUrl: details?.snippet?.thumbnails?.medium?.url ||
                      details?.snippet?.thumbnails?.default?.url || '',
        views,
        avgWatchTime: views > 0 ? (watchTimeMinutes * 60) / views : 0, // Seconds
        shares
      }
    })
  }

  static async fetchDailyData(
    userId: string,
    channelId: string,
    startDate: string,
    endDate: string
  ): Promise<YTDailyData[]> {
    const data = await this.makeAnalyticsRequest(userId, channelId, {
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,shares,likes',
      dimensions: 'day',
      sort: 'day'
    })

    return (data.rows || []).map((row: any[]) => ({
      date: row[0],
      views: row[1] || 0,
      watchTime: (row[2] || 0) * 60, // Convert minutes to seconds
      shares: row[3] || 0,
      likes: row[4] || 0
    }))
  }

  // Fetch user's YouTube channels
  // Note: This only returns channels owned by the currently authorized Google account.
  // For Brand Account channels, users need to either:
  // 1. Re-authorize while selecting the Brand Account during OAuth
  // 2. Manually add channels via Admin > Accounts page
  static async fetchChannels(userId: string): Promise<Array<{
    channelId: string
    channelName: string
    channelHandle?: string
    thumbnailUrl?: string
  }>> {
    console.log('[YouTube] fetchChannels called for user:', userId)

    try {
      console.log('[YouTube] Fetching channels with mine=true...')
      const data = await this.makeDataRequest(userId, 'channels', {
        mine: 'true',
        part: 'snippet,contentDetails'
      })
      console.log('[YouTube] API response:', JSON.stringify(data))
      console.log(`[YouTube] Found ${data.items?.length || 0} channels`)

      return (data.items || []).map((item: any) => ({
        channelId: item.id,
        channelName: item.snippet?.title || 'Unknown Channel',
        channelHandle: item.snippet?.customUrl,
        thumbnailUrl: item.snippet?.thumbnails?.default?.url
      }))
    } catch (error: any) {
      console.error('[YouTube] Failed to fetch channels:', error.message)
      return []
    }
  }

  // ============================================================
  // PUBLIC DATA FALLBACK METHODS
  // These use the YouTube Data API to get public statistics
  // when the Analytics API fails (e.g., for non-owned channels)
  // ============================================================

  /**
   * Fetch public channel statistics using YouTube Data API
   * Available for ANY channel, not just owned ones
   */
  static async fetchPublicChannelStats(
    userId: string,
    channelId: string
  ): Promise<{
    viewCount: number
    subscriberCount: number
    videoCount: number
    channelTitle: string
    thumbnailUrl: string
  }> {
    const data = await this.makeDataRequest(userId, 'channels', {
      id: channelId,
      part: 'snippet,statistics'
    })

    const channel = data.items?.[0]
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`)
    }

    return {
      viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
      channelTitle: channel.snippet?.title || 'Unknown Channel',
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url || ''
    }
  }

  /**
   * Fetch recent videos with public statistics using YouTube Data API
   * Returns views, likes, comments for each video
   */
  static async fetchPublicVideos(
    userId: string,
    channelId: string,
    limit: number = 10
  ): Promise<YTPublicVideo[]> {
    // First, get the channel's uploads playlist
    const channelData = await this.makeDataRequest(userId, 'channels', {
      id: channelId,
      part: 'contentDetails'
    })

    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) {
      console.log('[YouTube] No uploads playlist found for channel:', channelId)
      return []
    }

    // Get recent videos from the uploads playlist
    const playlistData = await this.makeDataRequest(userId, 'playlistItems', {
      playlistId: uploadsPlaylistId,
      part: 'snippet,contentDetails',
      maxResults: String(limit)
    })

    const videoIds = (playlistData.items || [])
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .join(',')

    if (!videoIds) {
      return []
    }

    // Get video statistics
    const videoData = await this.makeDataRequest(userId, 'videos', {
      id: videoIds,
      part: 'snippet,statistics'
    })

    return (videoData.items || []).map((video: any) => ({
      id: video.id,
      title: video.snippet?.title || 'Unknown Video',
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url || '',
      views: parseInt(video.statistics?.viewCount || '0', 10),
      likes: parseInt(video.statistics?.likeCount || '0', 10),
      comments: parseInt(video.statistics?.commentCount || '0', 10),
      publishedAt: video.snippet?.publishedAt || '',
      // Not available via public Data API
      avgWatchTime: 0,
      shares: 0
    }))
  }

  /**
   * Fetch metrics using public Data API as fallback
   * Returns channel-level stats and aggregated video stats
   * NOTE: Public data is mostly all-time and not date-specific
   */
  static async fetchPublicMetrics(
    userId: string,
    channelId: string,
    startDate?: string,
    endDate?: string
  ): Promise<YTPublicMetrics> {
    console.log('[YouTube] Fetching public metrics for channel:', channelId)
    console.log('[YouTube] Date range provided:', { startDate, endDate })
    console.log('[YouTube] WARNING: Public Data API returns all-time stats, not date-specific data')

    const [channelStats, recentVideos] = await Promise.all([
      this.fetchPublicChannelStats(userId, channelId),
      this.fetchPublicVideos(userId, channelId, 50) // Get more videos for aggregation
    ])

    // Try to filter videos by date if date range is provided
    let filteredVideos = recentVideos
    if (startDate && endDate) {
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)
      
      filteredVideos = recentVideos.filter(video => {
        if (!video.publishedAt) return false
        const publishDate = new Date(video.publishedAt)
        return publishDate >= startDateObj && publishDate <= endDateObj
      })
      
      console.log(`[YouTube] Filtered ${recentVideos.length} videos to ${filteredVideos.length} based on publish date range`)
    }

    // Aggregate likes and comments from filtered videos
    const totalLikes = filteredVideos.reduce((sum, v) => sum + v.likes, 0)
    const totalComments = filteredVideos.reduce((sum, v) => sum + v.comments, 0)

    return {
      views: channelStats.viewCount,           // All-time channel views (NOT date-specific)
      subscriberCount: channelStats.subscriberCount,
      videoCount: channelStats.videoCount,
      totalWatchTime: 0,                       // Not available publicly
      shares: 0,                               // Not available publicly
      avgViewDuration: 0,                      // Not available publicly
      likes: totalLikes,                       // Sum from videos in date range (if date filtering applied)
      dislikes: 0,                             // No longer public
      comments: totalComments,                 // Sum from videos in date range (if date filtering applied)
      subscriptions: 0,                        // Net change not available
      isPublicDataOnly: true,
      // No previous period data available for public stats
      previousPeriod: undefined
    }
  }

  /**
   * Wrapper that tries Analytics API first, falls back to public Data API
   */
  static async fetchMetricsWithFallback(
    userId: string,
    channelId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<YTMetrics & { isPublicDataOnly?: boolean; subscriberCount?: number; videoCount?: number }> {
    try {
      // Try Analytics API first
      console.log('[YouTube] Attempting Analytics API for date range:', { startDate, endDate })
      const metrics = await this.fetchMetrics(
        userId,
        channelId,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      )
      console.log('[YouTube] Analytics API success - returning date-specific metrics')
      return { ...metrics, isPublicDataOnly: false }
    } catch (error: any) {
      console.log('[YouTube] Analytics API failed, falling back to public Data API:', error.message)
      console.log('[YouTube] IMPORTANT: Public fallback data will be all-time stats, not date-specific')

      // Fall back to public Data API with date context for video filtering
      const publicMetrics = await this.fetchPublicMetrics(userId, channelId, startDate, endDate)

      return {
        views: publicMetrics.views,
        totalWatchTime: 0,
        shares: 0,
        avgViewDuration: 0,
        likes: publicMetrics.likes,
        dislikes: 0,
        comments: publicMetrics.comments,
        subscriptions: 0,
        isPublicDataOnly: true,
        subscriberCount: publicMetrics.subscriberCount,
        videoCount: publicMetrics.videoCount,
        previousPeriod: undefined  // Not available for public data
      }
    }
  }

  /**
   * Wrapper that tries Analytics API first for videos, falls back to public Data API
   */
  static async fetchTopVideosWithFallback(
    userId: string,
    channelId: string,
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<YTVideo[]> {
    try {
      // Try Analytics API first
      console.log('[YouTube] Attempting Analytics API for top videos in date range:', { startDate, endDate })
      const result = await this.fetchTopVideos(userId, channelId, startDate, endDate, limit)
      console.log('[YouTube] Analytics API success - returning date-specific top videos')
      return result
    } catch (error: any) {
      console.log('[YouTube] Analytics API failed for videos, falling back to public Data API:', error.message)
      console.log('[YouTube] WARNING: Public fallback will show recent videos filtered by publish date, not performance in date range')

      // Fall back to public Data API
      const publicVideos = await this.fetchPublicVideos(userId, channelId, limit * 2) // Get more to allow for date filtering

      // Filter by publish date if possible
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)
      
      const filteredVideos = publicVideos.filter(video => {
        if (!video.publishedAt) return true // Keep videos without publish date
        const publishDate = new Date(video.publishedAt)
        return publishDate >= startDateObj && publishDate <= endDateObj
      })

      console.log(`[YouTube] Filtered ${publicVideos.length} videos to ${filteredVideos.length} based on publish date range`)

      // Sort by views (most viewed first) since we can't get period-specific performance data
      return filteredVideos
        .sort((a, b) => b.views - a.views)
        .slice(0, limit) // Respect the limit
        .map(v => ({
          id: v.id,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          views: v.views,          // All-time views, not date-specific
          avgWatchTime: 0,         // Not available
          shares: 0                // Not available
        }))
    }
  }

  /**
   * Wrapper for daily data - returns empty array if Analytics API fails
   * (No public equivalent available)
   */
  static async fetchDailyDataWithFallback(
    userId: string,
    channelId: string,
    startDate: string,
    endDate: string
  ): Promise<YTDailyData[]> {
    try {
      console.log('[YouTube] Attempting Analytics API for daily data in date range:', { startDate, endDate })
      const result = await this.fetchDailyData(userId, channelId, startDate, endDate)
      console.log('[YouTube] Analytics API success - returning', result.length, 'daily data points')
      return result
    } catch (error: any) {
      console.log('[YouTube] Analytics API failed for daily data, no public fallback available:', error.message)
      console.log('[YouTube] Daily charts and sparklines will be empty when using public data fallback')
      // No public fallback - return empty array
      return []
    }
  }
}
