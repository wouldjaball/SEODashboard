"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Users, TrendingUp, MessageSquare } from "lucide-react"
import type {
  LIVideoMetrics,
  LIEmployeeAdvocacyMetrics,
  LIContentBreakdown,
  LISocialListeningMention
} from "@/lib/types"

interface EnhancedLinkedInAnalyticsProps {
  videoMetrics?: LIVideoMetrics
  employeeAdvocacyMetrics?: LIEmployeeAdvocacyMetrics
  contentBreakdown?: LIContentBreakdown
  socialListening?: LISocialListeningMention[]
}

function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function calculatePercentageChange(current: number, previous: number): { value: number; isPositive: boolean } {
  if (previous === 0) return { value: 0, isPositive: true }
  const value = ((current - previous) / previous) * 100
  return { value: Math.abs(value), isPositive: value >= 0 }
}

export function EnhancedLinkedInAnalytics({
  videoMetrics,
  employeeAdvocacyMetrics,
  contentBreakdown,
  socialListening
}: EnhancedLinkedInAnalyticsProps) {
  // Don't render if no enhanced metrics are available
  if (!videoMetrics && !employeeAdvocacyMetrics && !contentBreakdown && !socialListening) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Enhanced LinkedIn Analytics</h3>
        <Badge variant="outline" className="text-xs">
          Community Management API
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Video Analytics */}
        {videoMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Video Performance</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold">{videoMetrics.totalViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total Video Views</p>
                  {videoMetrics.previousPeriod.totalViews > 0 && (
                    <div className="flex items-center mt-1">
                      {(() => {
                        const change = calculatePercentageChange(
                          videoMetrics.totalViews,
                          videoMetrics.previousPeriod.totalViews
                        )
                        return (
                          <span className={`text-xs ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {change.isPositive ? '+' : '-'}{change.value.toFixed(1)}% from last period
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium">{formatWatchTime(videoMetrics.totalWatchTime)}</div>
                    <div className="text-muted-foreground">Watch Time</div>
                  </div>
                  <div>
                    <div className="font-medium">{formatWatchTime(videoMetrics.averageWatchTime)}</div>
                    <div className="text-muted-foreground">Avg. Duration</div>
                  </div>
                </div>

                <div>
                  <div className="font-medium">{videoMetrics.totalViewers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Unique Viewers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Advocacy */}
        {employeeAdvocacyMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employee Advocacy</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold">{employeeAdvocacyMetrics.employeeShares.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Employee Shares</p>
                  {employeeAdvocacyMetrics.previousPeriod.employeeShares > 0 && (
                    <div className="flex items-center mt-1">
                      {(() => {
                        const change = calculatePercentageChange(
                          employeeAdvocacyMetrics.employeeShares,
                          employeeAdvocacyMetrics.previousPeriod.employeeShares
                        )
                        return (
                          <span className={`text-xs ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {change.isPositive ? '+' : '-'}{change.value.toFixed(1)}% from last period
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium">{employeeAdvocacyMetrics.employeeEngagement.toLocaleString()}</div>
                    <div className="text-muted-foreground">Engagement</div>
                  </div>
                  <div>
                    <div className="font-medium">{employeeAdvocacyMetrics.employeeReach.toLocaleString()}</div>
                    <div className="text-muted-foreground">Reach</div>
                  </div>
                </div>

                <div>
                  <div className="font-medium">{employeeAdvocacyMetrics.contentAmplification.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Content Amplification</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Breakdown */}
        {contentBreakdown && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Organic vs Sponsored</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Posts Distribution</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-semibold text-green-700">{contentBreakdown.organicPosts}</div>
                      <div className="text-green-600">Organic</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-semibold text-blue-700">{contentBreakdown.sponsoredPosts}</div>
                      <div className="text-blue-600">Sponsored</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Impressions Breakdown</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Organic: {contentBreakdown.organicImpressions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sponsored: {contentBreakdown.sponsoredImpressions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Social Listening */}
      {socialListening && socialListening.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Social Listening
            </CardTitle>
            <CardDescription>
              Recent mentions and conversations about your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sentiment Overview */}
              <div>
                <h4 className="font-medium mb-2">Sentiment Analysis</h4>
                {(() => {
                  const sentimentCounts = socialListening.reduce(
                    (acc, mention) => {
                      acc[mention.sentiment] += mention.mentions
                      return acc
                    },
                    { positive: 0, neutral: 0, negative: 0 }
                  )
                  const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative
                  
                  return (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-lg font-semibold text-green-700">{sentimentCounts.positive}</div>
                        <div className="text-xs text-green-600">Positive</div>
                        <div className="text-xs text-muted-foreground">
                          {total > 0 ? ((sentimentCounts.positive / total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-lg font-semibold text-gray-700">{sentimentCounts.neutral}</div>
                        <div className="text-xs text-gray-600">Neutral</div>
                        <div className="text-xs text-muted-foreground">
                          {total > 0 ? ((sentimentCounts.neutral / total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                      <div className="p-2 bg-red-50 rounded">
                        <div className="text-lg font-semibold text-red-700">{sentimentCounts.negative}</div>
                        <div className="text-xs text-red-600">Negative</div>
                        <div className="text-xs text-muted-foreground">
                          {total > 0 ? ((sentimentCounts.negative / total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Recent Mentions */}
              <div>
                <h4 className="font-medium mb-2">Recent Mentions</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {socialListening.slice(0, 5).map((mention, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 border rounded">
                      <Badge 
                        variant={mention.sentiment === 'positive' ? 'default' : mention.sentiment === 'negative' ? 'destructive' : 'secondary'}
                        className="mt-1"
                      >
                        {mention.sentiment}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium capitalize">{mention.mentionType}</span>
                          <span className="text-xs text-muted-foreground">{mention.date}</span>
                        </div>
                        {mention.memberInfo && (
                          <div className="text-xs text-muted-foreground mt-1">
                            by {mention.memberInfo.name}
                            {mention.memberInfo.headline && ` • ${mention.memberInfo.headline}`}
                          </div>
                        )}
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>Reach: {mention.reach.toLocaleString()}</span>
                          <span>Engagement: {mention.engagement.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {socialListening.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing 5 of {socialListening.length} mentions
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}