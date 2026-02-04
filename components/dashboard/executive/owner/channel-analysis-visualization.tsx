"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart3, TrendingUp, Users, MousePointer, Target, Globe } from "lucide-react"

interface ChannelAnalysisVisualizationProps {
  analytics: any
  dateRange: {
    from: Date
    to: Date
  }
}

export function ChannelAnalysisVisualization({ analytics, dateRange }: ChannelAnalysisVisualizationProps) {
  // Get traffic and source data
  const gaChannelData = analytics?.gaChannelData || []
  const gaTrafficShare = analytics?.gaTrafficShare || []
  const gaSourcePerformance = analytics?.gaSourcePerformance || []
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%'
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Process channel data for visualization
  const channelTrends = gaChannelData.map((day: any) => ({
    date: day.date,
    'Organic Search': day.organicSearch,
    'Direct': day.direct,
    'Paid Search': day.paidSearch,
    'Referral': day.referral,
    'Social': day.organicSocial,
    'Other': day.paidOther + day.crossNetwork + day.unassigned
  }))

  // Colors for different channels
  const channelColors = {
    'Organic Search': '#10b981',
    'Direct': '#3b82f6', 
    'Paid Search': '#f59e0b',
    'Referral': '#ef4444',
    'Social': '#8b5cf6',
    'Other': '#6b7280'
  }

  // Colors for pie chart
  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Channel Analysis & Visualization</h3>
        
        {/* Channel Distribution */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Traffic Source Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {gaTrafficShare.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaTrafficShare}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="users"
                        label={({ payload }: any) => {
                          const channel = payload?.channel || 'Unknown'
                          const percentage = payload?.percentage || 0
                          return `${channel}: ${(percentage * 100).toFixed(1)}%`
                        }}
                      >
                        {gaTrafficShare.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number | undefined) => [formatNumber(value || 0), 'Users']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No traffic source data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Channel Trends Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Channel Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {channelTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={channelTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-sm"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      {Object.entries(channelColors).map(([channel, color]) => (
                        <Area
                          key={channel}
                          type="monotone"
                          dataKey={channel}
                          stackId="1"
                          stroke={color}
                          fill={color}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No channel trend data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Source Performance Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Traffic Sources Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source / Medium</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Page Views</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Bounce Rate</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaSourcePerformance.slice(0, 10).map((source: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate">{source.source}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(source.totalUsers)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(source.sessions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(source.views)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(source.avgSessionDuration)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={source.bounceRate > 0.7 ? "destructive" : source.bounceRate > 0.4 ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {formatPercentage(source.bounceRate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(source.keyEvents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={source.conversionRate > 0.05 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {formatPercentage(source.conversionRate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {gaSourcePerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No source performance data available for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Channel Performance Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {gaTrafficShare.slice(0, 4).map((channel: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{channel.channel}</p>
                    <p className="text-2xl font-bold">{formatNumber(channel.users)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercentage(channel.percentage)} of traffic
                    </p>
                  </div>
                  <div className={`p-3 rounded-full`} style={{ backgroundColor: pieColors[index] + '20' }}>
                    <Users className={`h-5 w-5`} style={{ color: pieColors[index] }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}