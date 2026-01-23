import { OAuthTokenService } from './oauth-token-service'
import type { YTMetrics, YTVideo, YTDailyData } from '@/lib/types'

export class YouTubeAnalyticsService {
  private static async makeAnalyticsRequest(
    userId: string,
    channelId: string,
    params: Record<string, string>
  ) {
    const accessToken = await OAuthTokenService.refreshAccessToken(userId)
    if (!accessToken) throw new Error('No valid access token')

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
    params: Record<string, string>
  ) {
    const accessToken = await OAuthTokenService.refreshAccessToken(userId)
    if (!accessToken) throw new Error('No valid access token')

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
  static async fetchChannels(userId: string): Promise<Array<{
    channelId: string
    channelName: string
    channelHandle?: string
    thumbnailUrl?: string
  }>> {
    const data = await this.makeDataRequest(userId, 'channels', {
      mine: 'true',
      part: 'snippet,contentDetails'
    })

    return (data.items || []).map((item: any) => ({
      channelId: item.id,
      channelName: item.snippet?.title || 'Unknown Channel',
      channelHandle: item.snippet?.customUrl,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url
    }))
  }
}
