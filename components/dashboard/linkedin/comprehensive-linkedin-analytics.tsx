"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
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
  Cell,
  AreaChart,
  Area
} from "recharts"
import { 
  Users, 
  Eye, 
  TrendingUp, 
  MessageSquare, 
  Share2, 
  ThumbsUp, 
  Building2, 
  Briefcase,
  UserCheck,
  BarChart3,
  Calendar,
  Globe,
  ExternalLink
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LIUpdate,
  LIDemographic
} from "@/lib/types"

interface ComprehensiveLinkedInAnalyticsProps {
  visitorMetrics?: LIVisitorMetrics
  followerMetrics?: LIFollowerMetrics
  contentMetrics?: LIContentMetrics
  visitorDaily?: Array<{ date: string; visitors: number; pageViews: number }>
  followerDaily?: Array<{ date: string; followers: number; unfollowers?: number }>
  impressionDaily?: Array<{ date: string; impressions: number; clicks?: number }>
  industryDemographics?: LIDemographic[]
  seniorityDemographics?: LIDemographic[]
  jobFunctionDemographics?: LIDemographic[]
  companySizeDemographics?: LIDemographic[]
  updates?: LIUpdate[]
  dataSource?: string
}

// Colors for chart visualizations
const CHART_COLORS = ['#0a66c2', '#00a0dc', '#0084c7', '#006bb3', '#004d7a', '#70b5f9', '#a8ccf0']

export function ComprehensiveLinkedInAnalytics({
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
  dataSource
}: ComprehensiveLinkedInAnalyticsProps) {
  
  const hasAnyData = visitorMetrics || followerMetrics || contentMetrics

  if (!hasAnyData) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>LinkedIn Analytics Not Available</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const getChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  // Prepare timeline data for visitor trends
  const visitorTrendData = visitorDaily?.map((data, index) => ({
    date: data.date,
    visitors: data.visitors,
    pageViews: data.pageViews,
    day: `Day ${index + 1}`
  })) || []

  // Prepare follower growth data
  const followerGrowthData = followerDaily?.map((data, index) => ({
    date: data.date,
    followers: data.followers,
    unfollowers: data.unfollowers || 0,
    netGrowth: data.followers - (data.unfollowers || 0),
    day: `Day ${index + 1}`
  })) || []

  // Prepare impression data
  const impressionData = impressionDaily?.map((data, index) => ({
    date: data.date,
    impressions: data.impressions,
    clicks: data.clicks || 0,
    day: `Day ${index + 1}`
  })) || []

  // Industry demographics for pie chart
  const industryChartData = industryDemographics?.slice(0, 6).map((item, index) => ({
    name: item.segment.length > 15 ? item.segment.substring(0, 15) + '...' : item.segment,
    value: item.value,
    percentage: item.percentage,
    color: CHART_COLORS[index % CHART_COLORS.length]
  })) || []

  // Seniority level data
  const seniorityChartData = seniorityDemographics?.map((item, index) => ({
    name: item.segment,
    value: item.value,
    percentage: item.percentage,
    color: CHART_COLORS[index % CHART_COLORS.length]
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Comprehensive LinkedIn Analytics</h3>
        <Badge variant="outline" className="text-xs">
          Professional Network
        </Badge>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Page Visitors */}
        {visitorMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Visitors</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(visitorMetrics.pageViews)}</div>
              {visitorMetrics.previousPeriod && (
                <p className={`text-xs ${getChange(visitorMetrics.pageViews, visitorMetrics.previousPeriod.pageViews)! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {getChange(visitorMetrics.pageViews, visitorMetrics.previousPeriod.pageViews)! > 0 ? '+' : ''}{getChange(visitorMetrics.pageViews, visitorMetrics.previousPeriod.pageViews)?.toFixed(1)}% from last period
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatNumber(visitorMetrics.uniqueVisitors)} unique
              </div>
            </CardContent>
          </Card>
        )}

        {/* Followers */}
        {followerMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(followerMetrics.totalFollowers)}</div>
              {followerMetrics.newFollowers && (
                <p className={`text-xs ${followerMetrics.newFollowers > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {followerMetrics.newFollowers > 0 ? '+' : ''}{followerMetrics.newFollowers} this period
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatNumber(followerMetrics.newFollowers)} new
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Impressions */}
        {contentMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(contentMetrics.impressions)}</div>
              {contentMetrics.previousPeriod && (
                <p className={`text-xs ${getChange(contentMetrics.impressions, contentMetrics.previousPeriod.impressions)! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {getChange(contentMetrics.impressions, contentMetrics.previousPeriod.impressions)! > 0 ? '+' : ''}{getChange(contentMetrics.impressions, contentMetrics.previousPeriod.impressions)?.toFixed(1)}% from last period
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {contentMetrics.engagementRate ? `${(contentMetrics.engagementRate * 100).toFixed(1)}% engagement` : 'Engagement data unavailable'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Clicks */}
        {contentMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Clicks</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(contentMetrics.clicks)}</div>
              {contentMetrics.clicks && contentMetrics.impressions && (
                <p className="text-xs text-muted-foreground">
                  {((contentMetrics.clicks / contentMetrics.impressions) * 100).toFixed(2)}% CTR
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatNumber(contentMetrics.reposts)} shares
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Visitor Trends */}
        {visitorTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page Visitor Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visitorTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatNumber(value as number), name === 'visitors' ? 'Visitors' : 'Page Views']} />
                    <Area type="monotone" dataKey="visitors" stackId="1" stroke="#0a66c2" fill="#0a66c2" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="pageViews" stackId="2" stroke="#00a0dc" fill="#00a0dc" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Follower Growth */}
        {followerGrowthData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Follower Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={followerGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Followers']} />
                    <Line type="monotone" dataKey="followers" stroke="#0a66c2" strokeWidth={2} name="New Followers" />
                    <Line type="monotone" dataKey="unfollowers" stroke="#ef4444" strokeWidth={1} name="Unfollowers" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Impressions Over Time */}
        {impressionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={impressionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatNumber(value as number)]} />
                    <Bar dataKey="impressions" fill="#0a66c2" name="Impressions" />
                    <Bar dataKey="clicks" fill="#00a0dc" name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Audience Demographics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Industry Distribution */}
        {industryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audience by Industry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {industryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Followers']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seniority Levels */}
        {seniorityChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audience by Seniority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seniorityChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Followers']} />
                    <Bar dataKey="value" fill="#0a66c2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Functions and Company Sizes */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Job Functions */}
        {jobFunctionDemographics && jobFunctionDemographics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Job Functions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobFunctionDemographics.slice(0, 8).map((func, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium truncate">{func.segment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${Math.min(func.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {func.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Company Sizes */}
        {companySizeDemographics && companySizeDemographics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Size Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {companySizeDemographics.map((size, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{size.segment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${Math.min(size.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {size.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Updates */}
      {updates && updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {updates.slice(0, 5).map((update, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{update.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(update.impressions)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {formatNumber(update.reactions)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {formatNumber(update.comments)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {formatNumber(update.shares)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {update.publishedAt}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Footer */}
      {dataSource && (
        <div className="text-xs text-muted-foreground text-center p-2 border-t">
          Data source: {dataSource === 'api' ? 'LinkedIn Analytics API' : 'Estimated data'}
        </div>
      )}
    </div>
  )
}