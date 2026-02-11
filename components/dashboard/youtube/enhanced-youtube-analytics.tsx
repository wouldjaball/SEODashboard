"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { 
  PlayCircle, 
  Users, 
  Eye, 
  Clock, 
  Share2, 
  ThumbsUp, 
  MessageCircle, 
  TrendingUp,
  Calendar,
  Film,
  ExternalLink
} from "lucide-react"
import { formatNumber, formatDuration } from "@/lib/utils"
import type { YTMetrics, YTVideo } from "@/lib/types"
import Link from "next/link"

interface EnhancedYouTubeAnalyticsProps {
  metrics: YTMetrics | null
  videos: YTVideo[]
  viewsSparkline?: number[]
  watchTimeSparkline?: number[]
  sharesSparkline?: number[]
  likesSparkline?: number[]
  isPublicDataOnly?: boolean
  dateRange?: { from: Date; to: Date }
}

// Colors for chart visualizations
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function EnhancedYouTubeAnalytics({
  metrics,
  videos,
  viewsSparkline,
  watchTimeSparkline,
  sharesSparkline,
  likesSparkline,
  isPublicDataOnly,
  dateRange
}: EnhancedYouTubeAnalyticsProps) {
  
  if (!metrics) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <PlayCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>YouTube Analytics Not Available</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  // Prepare timeline data for charts
  const timelineData = viewsSparkline?.map((views, index) => ({
    day: `Day ${index + 1}`,
    views,
    watchTime: watchTimeSparkline?.[index] || 0,
    shares: sharesSparkline?.[index] || 0,
    likes: likesSparkline?.[index] || 0
  })) || []

  // Top performing videos data for visualization
  const topVideosData = videos.slice(0, 5).map((video, index) => ({
    name: video.title.length > 20 ? video.title.substring(0, 20) + '...' : video.title,
    views: video.views,
    watchTime: video.avgWatchTime,
    engagement: (video.shares || 0) / video.views * 100,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }))

  // Video performance distribution
  const performanceData = [
    { name: 'High Performance', value: videos.filter(v => v.views > (metrics.views / videos.length) * 2).length, color: '#10b981' },
    { name: 'Average Performance', value: videos.filter(v => v.views >= (metrics.views / videos.length) * 0.5 && v.views <= (metrics.views / videos.length) * 2).length, color: '#3b82f6' },
    { name: 'Low Performance', value: videos.filter(v => v.views < (metrics.views / videos.length) * 0.5).length, color: '#ef4444' }
  ]

  const getChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  const viewsChange = getChange(metrics.views, metrics.previousPeriod?.views)
  const watchTimeChange = getChange(metrics.totalWatchTime, metrics.previousPeriod?.totalWatchTime)
  const sharesChange = getChange(metrics.shares, metrics.previousPeriod?.shares)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <PlayCircle className="h-5 w-5 text-red-600" />
        <h3 className="text-lg font-semibold">Enhanced YouTube Analytics</h3>
        {dateRange && (
          <span className="text-sm font-normal text-muted-foreground">
            {dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        {isPublicDataOnly && (
          <Badge variant="outline" className="text-xs text-amber-600">
            Public Data
          </Badge>
        )}
      </div>

      {/* Key Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.views)}</div>
            {viewsChange && (
              <p className={`text-xs ${viewsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {viewsChange > 0 ? '+' : ''}{viewsChange.toFixed(1)}% from last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(metrics.totalWatchTime / 3600).toLocaleString()}h</div>
            {watchTimeChange && (
              <p className={`text-xs ${watchTimeChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {watchTimeChange > 0 ? '+' : ''}{watchTimeChange.toFixed(1)}% from last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.shares)}</div>
            {sharesChange && (
              <p className={`text-xs ${sharesChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sharesChange > 0 ? '+' : ''}{sharesChange.toFixed(1)}% from last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.avgViewDuration)}</div>
            <p className="text-xs text-muted-foreground">Average view duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Over Time */}
      {timelineData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Views Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Views']} />
                    <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="shares" stroke="#10b981" name="Shares" />
                    <Line type="monotone" dataKey="likes" stroke="#f59e0b" name="Likes" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performing Videos */}
      {videos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Performing Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVideosData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Views']} />
                    <Bar dataKey="views" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Performance Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{videos.length}</div>
              <div className="text-sm text-muted-foreground">Total Videos</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {videos.length > 0 ? formatDuration(videos.reduce((sum, v) => sum + v.avgWatchTime, 0) / videos.length) : '0s'}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Watch Time</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {videos.length > 0 ? ((metrics.views / videos.length) / 1000).toFixed(1) + 'K' : '0'}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Views per Video</div>
            </div>
          </div>

          {/* Most Recent Videos */}
          {videos.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Recent Videos</h4>
              <div className="space-y-3">
                {videos.slice(0, 3).map((video, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{video.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(video.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.avgWatchTime)}
                        </span>
                        {video.shares > 0 && (
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {formatNumber(video.shares)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}