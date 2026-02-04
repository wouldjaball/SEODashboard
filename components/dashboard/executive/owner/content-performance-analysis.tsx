"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, TrendingUp, MousePointer, Eye, Clock, Target, ExternalLink } from "lucide-react"

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
  const topKeywords = analytics?.gscKeywords || []
  
  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  // Format percentage
  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%'
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Content Performance Analysis</h3>
        
        {/* Content Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Page Views</p>
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
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{formatNumber(totalSessions)}</p>
                </div>
                <FileText className="h-5 w-5 text-green-500" />
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
                <TrendingUp className="h-5 w-5 text-orange-500" />
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
                <Target className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
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
    </div>
  )
}