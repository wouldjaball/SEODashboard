"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Search, TrendingUp, MousePointer, Eye, Target } from "lucide-react"

interface SearchPerformanceTrackingProps {
  analytics: any
  dateRange: {
    from: Date
    to: Date
  }
}

export function SearchPerformanceTracking({ analytics, dateRange }: SearchPerformanceTrackingProps) {
  // Get search data
  const gscWeeklyData = analytics?.gscWeeklyData || []
  const gscKeywords = analytics?.gscKeywords || []
  const gscCountries = analytics?.gscCountries || []
  const gscMetrics = analytics?.gscMetrics || {}
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%'
  }

  // Calculate growth metrics
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const searchMetrics = [
    {
      title: "Total Impressions",
      value: formatNumber(gscMetrics.impressions || 0),
      growth: gscMetrics.previousPeriod ? 
        calculateGrowth(gscMetrics.impressions, gscMetrics.previousPeriod.impressions) : 0,
      icon: Eye,
      color: "text-blue-600"
    },
    {
      title: "Total Clicks", 
      value: formatNumber(gscMetrics.clicks || 0),
      growth: gscMetrics.previousPeriod ?
        calculateGrowth(gscMetrics.clicks, gscMetrics.previousPeriod.clicks) : 0,
      icon: MousePointer,
      color: "text-green-600"
    },
    {
      title: "Average CTR",
      value: formatPercentage(gscMetrics.ctr || 0),
      growth: gscMetrics.previousPeriod ?
        calculateGrowth(gscMetrics.ctr, gscMetrics.previousPeriod.ctr) : 0,
      icon: Target,
      color: "text-purple-600"
    },
    {
      title: "Average Position",
      value: (gscMetrics.avgPosition || 0).toFixed(1),
      growth: gscMetrics.previousPeriod ?
        calculateGrowth(gscMetrics.avgPosition, gscMetrics.previousPeriod.avgPosition) : 0,
      icon: TrendingUp,
      color: "text-orange-600",
      isPosition: true // Lower is better for position
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Search Performance Tracking</h3>
        
        {/* Search Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {searchMetrics.map((metric, index) => {
            const Icon = metric.icon
            const growth = metric.growth
            const isPositiveGrowth = metric.isPosition ? growth < 0 : growth > 0 // Position: lower is better
            
            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{metric.title}</p>
                      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                      {Math.abs(growth) > 0.1 && (
                        <div className="flex items-center gap-1 mt-1">
                          {isPositiveGrowth ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                          )}
                          <span className={`text-xs ${
                            isPositiveGrowth ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Search Performance Trends */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Performance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gscWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="weekLabel" 
                    className="text-sm"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      formatNumber(value || 0), 
                      (name === 'impressions') ? 'Impressions' : 'Clicks'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="impressions"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Keywords */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Performing Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gscKeywords.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-sm" tick={{ fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="query" 
                    className="text-sm" 
                    tick={{ fontSize: 10 }}
                    width={120}
                  />
                  <Tooltip 
                    formatter={(value: number | undefined) => [formatNumber(value || 0), 'Clicks']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="clicks" 
                    fill="#10b981" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Search by Country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Search Performance by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gscCountries.slice(0, 8).map((country: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-6 bg-gray-200 rounded text-xs flex items-center justify-center font-medium">
                      {country.countryCode}
                    </div>
                    <span className="font-medium">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatNumber(country.clicks)}</p>
                      <p className="text-xs text-muted-foreground">clicks</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatNumber(country.impressions)}</p>
                      <p className="text-xs text-muted-foreground">impressions</p>
                    </div>
                    <Badge variant="secondary">
                      {formatPercentage(country.ctr)}
                    </Badge>
                  </div>
                </div>
              ))}
              {gscCountries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No country data available for the selected period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}