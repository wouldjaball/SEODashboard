"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  FileText, 
  TrendingUp, 
  MousePointer, 
  Eye, 
  Clock, 
  Target, 
  ExternalLink, 
  Globe,
  PlayCircle,
  Share2,
  ThumbsUp,
  Users,
  Building2,
  UserCheck,
  BarChart3,
  Briefcase
} from "lucide-react"

interface ContentPerformanceAnalysisProps {
  analytics: any
  dateRange: {
    from: Date
    to: Date
  }
}

export function ContentPerformanceAnalysis({ analytics, dateRange }: ContentPerformanceAnalysisProps) {
  // Get landing pages data from both GA and GSC
  const gaLandingPages = analytics?.gaLandingPages || []
  const gscLandingPages = analytics?.gscLandingPages || []
  
  // Get top keywords from GSC
  const topKeywords = (analytics?.gscKeywords || [])
    .filter((keyword: any) => keyword.query && keyword.impressions > 0)
    .sort((a: any, b: any) => b.clicks - a.clicks)
  
  // Get YouTube data
  const ytMetrics = analytics?.ytMetrics || {}
  const ytVideos = analytics?.ytVideos || []
  const ytViewsSparkline = analytics?.ytViewsSparkline || []
  const ytWatchTimeSparkline = analytics?.ytWatchTimeSparkline || []
  const ytSharesSparkline = analytics?.ytSharesSparkline || []
  const ytLikesSparkline = analytics?.ytLikesSparkline || []
  
  // Get LinkedIn data
  const liVisitorMetrics = analytics?.liVisitorMetrics || {}
  const liFollowerMetrics = analytics?.liFollowerMetrics || {}
  const liContentMetrics = analytics?.liContentMetrics || {}
  const liUpdates = analytics?.liUpdates || []
  const liVisitorDaily = analytics?.liVisitorDaily || []
  const liFollowerDaily = analytics?.liFollowerDaily || []
  const liIndustryDemographics = analytics?.liIndustryDemographics || []
  const liSeniorityDemographics = analytics?.liSeniorityDemographics || []
  const liJobFunctionDemographics = analytics?.liJobFunctionDemographics || []
  const liCompanySizeDemographics = analytics?.liCompanySizeDemographics || []
  
  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  // Format percentage
  const formatPercentage = (num: number): string => {
    // Handle conversion rate (already in percentage) vs other percentages (decimals)
    // Conversion rates come as percentages (5.2), bounce rates come as decimals (0.52)
    if (num > 1) {
      return num.toFixed(1) + '%'
    } else {
      return (num * 100).toFixed(1) + '%'
    }
  }

  // Format duration in seconds to readable format
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Calculate content insights
  const totalPageViews = gaLandingPages.reduce((sum: number, page: any) => sum + page.views, 0)
  const totalSessions = gaLandingPages.reduce((sum: number, page: any) => sum + page.sessions, 0)
  const avgBounceRate = gaLandingPages.length > 0 
    ? gaLandingPages.reduce((sum: number, page: any) => sum + page.bounceRate, 0) / gaLandingPages.length 
    : 0
  const totalConversions = gaLandingPages.reduce((sum: number, page: any) => sum + page.keyEvents, 0)
  
  // YouTube insights
  const ytViews = ytMetrics.views || 0
  const ytWatchTime = ytMetrics.totalWatchTime || 0
  const ytEngagement = (ytMetrics.likes || 0) + (ytMetrics.comments || 0)
  
  // LinkedIn insights  
  const liImpressions = liContentMetrics.impressions || 0
  const liEngagement = (liContentMetrics.reactions || 0) + (liContentMetrics.comments || 0) + (liContentMetrics.reposts || 0)
  const liEngagementRate = liContentMetrics.engagementRate || 0
  const liPageViews = liVisitorMetrics.pageViews || 0
  const liFollowers = liFollowerMetrics.totalFollowers || 0

  // Prepare timeline data for YouTube charts
  const ytTimelineData = ytViewsSparkline?.map((views: number, index: number) => ({
    day: `Day ${index + 1}`,
    views,
    watchTime: ytWatchTimeSparkline?.[index] || 0,
    shares: ytSharesSparkline?.[index] || 0,
    likes: ytLikesSparkline?.[index] || 0
  })) || []

  // Prepare LinkedIn visitor data for charts
  const liVisitorData = liVisitorDaily?.map((day: any) => ({
    date: day.date,
    desktop: day.desktopVisitors || 0,
    mobile: day.mobileVisitors || 0,
    total: (day.desktopVisitors || 0) + (day.mobileVisitors || 0)
  })) || []

  // Prepare LinkedIn follower growth data
  const liFollowerData = liFollowerDaily?.map((day: any) => ({
    date: day.date,
    sponsored: day.sponsored || 0,
    organic: day.organic || 0,
    total: (day.sponsored || 0) + (day.organic || 0)
  })) || []

  // Colors for chart visualizations
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Content Performance Analysis</h3>
        
        {/* Multi-Platform Content Overview */}
        <div className="space-y-6 mb-8">
          
          {/* Website Analytics */}
          <div>
            <h4 className="text-md font-semibold mb-3 text-blue-600 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website Analytics (Google Analytics)
            </h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Page Views</p>
                      <p className="text-2xl font-bold">{formatNumber(totalPageViews)}</p>
                    </div>
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sessions</p>
                      <p className="text-2xl font-bold">{formatNumber(totalSessions)}</p>
                    </div>
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Bounce Rate</p>
                      <p className="text-2xl font-bold">{formatPercentage(avgBounceRate)}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversions</p>
                      <p className="text-2xl font-bold">{formatNumber(totalConversions)}</p>
                    </div>
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Enhanced YouTube Analytics */}
          <div>
            <h4 className="text-md font-semibold mb-6 text-red-600 flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              📺 Enhanced YouTube Analytics {ytViews === 0 && ytVideos.length === 0 && !analytics?.ytMetrics ? "(No Data Available)" : ""}
            </h4>
            {(ytViews > 0 || ytVideos.length > 0 || analytics?.ytMetrics) ? (
              <div>
              
              {/* YouTube KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-2xl font-bold">{formatNumber(ytViews)}</p>
                        {ytMetrics.previousPeriod?.views && (
                          <p className="text-xs text-green-600">
                            +{(((ytViews - ytMetrics.previousPeriod.views) / ytMetrics.previousPeriod.views) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Watch Time</p>
                        <p className="text-2xl font-bold">{Math.floor(ytWatchTime / 3600).toLocaleString()}h</p>
                        {ytMetrics.previousPeriod?.totalWatchTime && (
                          <p className="text-xs text-green-600">
                            +{(((ytWatchTime - ytMetrics.previousPeriod.totalWatchTime) / ytMetrics.previousPeriod.totalWatchTime) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <Clock className="h-5 w-5 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Shares</p>
                        <p className="text-2xl font-bold">{formatNumber(ytMetrics.shares || 0)}</p>
                        {ytMetrics.previousPeriod?.shares && (
                          <p className="text-xs text-green-600">
                            +{(((ytMetrics.shares - ytMetrics.previousPeriod.shares) / ytMetrics.previousPeriod.shares) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <Share2 className="h-5 w-5 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Duration</p>
                        <p className="text-2xl font-bold">{formatDuration(ytMetrics.avgViewDuration || 0)}</p>
                      </div>
                      <PlayCircle className="h-5 w-5 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* YouTube Charts */}
              {ytTimelineData.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Views Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ytTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip formatter={(value) => [formatNumber(value as number), 'Views']} />
                            <Area type="monotone" dataKey="views" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
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
                          <LineChart data={ytTimelineData}>
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

              {/* Top Videos Performance */}
              {ytVideos.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Top Performing Videos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ytVideos.slice(0, 5).map((video: any, index: number) => ({
                          name: video.title.length > 20 ? video.title.substring(0, 20) + '...' : video.title,
                          views: video.views,
                          color: CHART_COLORS[index % CHART_COLORS.length]
                        }))} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip formatter={(value) => [formatNumber(value as number), 'Views']} />
                          <Bar dataKey="views" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No YouTube data available for this company. Connect YouTube Analytics to see detailed video performance metrics.
              </div>
            )}
          </div>
          
          {/* Enhanced LinkedIn Analytics */}
          <div>
            <h4 className="text-md font-semibold mb-6 text-blue-700 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              💼 Enhanced LinkedIn Analytics {liImpressions === 0 && liPageViews === 0 && liFollowers === 0 && !analytics?.liVisitorMetrics && !analytics?.liFollowerMetrics && !analytics?.liContentMetrics ? "(No Data Available)" : ""}
            </h4>
            {(liImpressions > 0 || liPageViews > 0 || liFollowers > 0 || analytics?.liVisitorMetrics || analytics?.liFollowerMetrics || analytics?.liContentMetrics) ? (
              <div>
              
              {/* LinkedIn KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Page Views</p>
                        <p className="text-2xl font-bold">{formatNumber(liPageViews)}</p>
                        {liVisitorMetrics.previousPeriod?.pageViews && (
                          <p className="text-xs text-green-600">
                            +{(((liPageViews - liVisitorMetrics.previousPeriod.pageViews) / liVisitorMetrics.previousPeriod.pageViews) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-blue-700" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Followers</p>
                        <p className="text-2xl font-bold">{formatNumber(liFollowers)}</p>
                        {liFollowerMetrics.previousPeriod?.totalFollowers && (
                          <p className="text-xs text-green-600">
                            +{(((liFollowers - liFollowerMetrics.previousPeriod.totalFollowers) / liFollowerMetrics.previousPeriod.totalFollowers) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <Users className="h-5 w-5 text-blue-700" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Content Impressions</p>
                        <p className="text-2xl font-bold">{formatNumber(liImpressions)}</p>
                        {liContentMetrics.previousPeriod?.impressions && (
                          <p className="text-xs text-green-600">
                            +{(((liImpressions - liContentMetrics.previousPeriod.impressions) / liContentMetrics.previousPeriod.impressions) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <BarChart3 className="h-5 w-5 text-blue-700" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Engagement Rate</p>
                        <p className="text-2xl font-bold">{formatPercentage(liEngagementRate)}</p>
                        {liContentMetrics.previousPeriod?.engagementRate && (
                          <p className="text-xs text-green-600">
                            +{(((liEngagementRate - liContentMetrics.previousPeriod.engagementRate) / liContentMetrics.previousPeriod.engagementRate) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <Target className="h-5 w-5 text-blue-700" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* LinkedIn Charts */}
              <div className="grid gap-4 lg:grid-cols-2 mb-6">
                {/* Visitor Trends */}
                {liVisitorData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Visitor Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={liVisitorData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="desktop" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                            <Area type="monotone" dataKey="mobile" stackId="1" stroke="#10b981" fill="#10b981" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Follower Growth */}
                {liFollowerData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Follower Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={liFollowerData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="organic" stroke="#10b981" name="Organic" />
                            <Line type="monotone" dataKey="sponsored" stroke="#f59e0b" name="Sponsored" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Audience Demographics */}
              {liIndustryDemographics.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Industry Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={liIndustryDemographics.slice(0, 6).map((item: any, index: number) => ({
                                name: item.segment,
                                value: item.value,
                                fill: CHART_COLORS[index % CHART_COLORS.length]
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => 
                                (percent && percent > 0.05) ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                              }
                              outerRadius={80}
                              dataKey="value"
                            >
                              {liIndustryDemographics.slice(0, 6).map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [formatNumber(value as number), 'Followers']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Seniority Levels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={liSeniorityDemographics.slice(0, 6)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="segment" />
                            <YAxis />
                            <Tooltip formatter={(value) => [formatNumber(value as number), 'Followers']} />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Job Functions and Company Size */}
              {liJobFunctionDemographics.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Job Functions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {liJobFunctionDemographics.slice(0, 6).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.segment}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {item.percentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company Size
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {liCompanySizeDemographics.slice(0, 6).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.segment}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-600 rounded-full"
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {item.percentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No LinkedIn data available for this company. Connect LinkedIn Analytics to see detailed audience demographics and content performance metrics.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performing Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Landing Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Page Views</TableHead>
                <TableHead className="text-right">Avg Duration</TableHead>
                <TableHead className="text-right">Bounce Rate</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gaLandingPages.slice(0, 10).map((page: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="flex items-center gap-2">
                      <div className="truncate">
                        <div className="font-medium truncate">{page.pageTitle || 'Untitled'}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {page.pagePath}
                        </div>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(page.sessions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(page.views)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDuration(page.avgSessionDuration)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={page.bounceRate > 0.7 ? "destructive" : page.bounceRate > 0.4 ? "secondary" : "default"}
                      className="text-xs"
                    >
                      {formatPercentage(page.bounceRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(page.keyEvents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={page.conversionRate > 0.05 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {formatPercentage(page.conversionRate)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {gaLandingPages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No landing page data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Keywords Driving Traffic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Top Keywords Driving Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topKeywords.slice(0, 10).map((keyword: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate">{keyword.query}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(keyword.impressions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(keyword.clicks)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={keyword.ctr > 0.05 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {formatPercentage(keyword.ctr)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={keyword.avgPosition <= 3 ? "default" : keyword.avgPosition <= 10 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {keyword.avgPosition.toFixed(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {topKeywords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No keyword data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Search Console Landing Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Top Search Landing Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page URL</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gscLandingPages.slice(0, 8).map((page: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm">{page.url}</div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(page.impressions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(page.clicks)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={page.ctr > 0.03 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {formatPercentage(page.ctr)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={page.avgPosition <= 3 ? "default" : page.avgPosition <= 10 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {page.avgPosition.toFixed(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {gscLandingPages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No search landing page data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top YouTube Videos */}
      {ytVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
              🎥 Top YouTube Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video Title</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Avg Watch Time</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ytVideos.slice(0, 5).map((video: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="truncate">
                          <div className="font-medium truncate">{video.title}</div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.views)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(video.avgWatchTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.shares)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top LinkedIn Posts */}
      {liUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5 text-blue-700" />
              💼 Top LinkedIn Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post Title</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Reactions</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">Engagement Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liUpdates.slice(0, 5).map((post: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="truncate">
                          <div className="font-medium truncate">{post.title}</div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.reactions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.comments)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={post.engagementRate > 5 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {formatPercentage(post.engagementRate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}