"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
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

        {/* Search Performance by Country - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Search Performance by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      const sortedCountries = gscCountries
                        .sort((a: any, b: any) => b.impressions - a.impressions)
                        .slice(0, 8)
                      
                      const others = gscCountries
                        .slice(8)
                        .reduce((sum: number, country: any) => sum + country.impressions, 0)
                      
                      const pieData = sortedCountries.map((country: any, index: number) => ({
                        name: country.country,
                        value: country.impressions,
                        clicks: country.clicks,
                        ctr: country.ctr,
                        fill: `hsl(${(index * 45) % 360}, 70%, 50%)`
                      }))
                      
                      if (others > 0) {
                        pieData.push({
                          name: 'Others',
                          value: others,
                          clicks: 0,
                          ctr: 0,
                          fill: '#8b5cf6'
                        })
                      }
                      
                      return pieData
                    })()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      (percent && percent > 0.05) ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={100}
                    dataKey="value"
                  >
                    {(() => {
                      const sortedCountries = gscCountries
                        .sort((a: any, b: any) => b.impressions - a.impressions)
                        .slice(0, 8)
                      
                      const colors = sortedCountries.map((_: any, index: number) => 
                        `hsl(${(index * 45) % 360}, 70%, 50%)`
                      )
                      
                      if (gscCountries.length > 8) {
                        colors.push('#8b5cf6')
                      }
                      
                      return colors.map((color: string, index: number) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))
                    })()}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number | undefined, name: string | undefined, props: any) => [
                      `${formatNumber(value || 0)} impressions`,
                      props.payload.clicks > 0 ? `${formatNumber(props.payload.clicks)} clicks` : '',
                      props.payload.ctr > 0 ? `${formatPercentage(props.payload.ctr)} CTR` : ''
                    ].filter(Boolean)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {gscCountries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No country data available for the selected period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}