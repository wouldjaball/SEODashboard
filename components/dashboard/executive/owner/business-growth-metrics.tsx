"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, MousePointer, Eye, Search } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface BusinessGrowthMetricsProps {
  data: {
    analytics: any
    periodComparison: {
      usersGrowth: number
      sessionsGrowth: number
      impressionsGrowth: number
      clicksGrowth: number
    }
  }
  dateRange: {
    from: Date
    to: Date
  }
}

export function BusinessGrowthMetrics({ data, dateRange }: BusinessGrowthMetricsProps) {
  // Prepare weekly data for charts
  const weeklyData = data.analytics?.gaWeeklyData || []
  const gscWeeklyData = data.analytics?.gscWeeklyData || []
  
  // Combine GA and GSC weekly data
  const combinedWeeklyData = weeklyData.map((gaWeek: any) => {
    const gscWeek = gscWeeklyData.find((gsc: any) => gsc.weekLabel === gaWeek.weekLabel)
    return {
      week: gaWeek.weekLabel,
      sessions: gaWeek.sessions,
      views: gaWeek.views,
      impressions: gscWeek?.impressions || 0,
      clicks: gscWeek?.clicks || 0,
    }
  })

  // Growth metrics for cards
  const growthMetrics = [
    {
      title: "User Growth",
      value: data.periodComparison.usersGrowth,
      icon: Users,
      description: "vs. previous 30 days",
    },
    {
      title: "Session Growth", 
      value: data.periodComparison.sessionsGrowth,
      icon: Eye,
      description: "vs. previous 30 days",
    },
    {
      title: "Search Growth",
      value: data.periodComparison.impressionsGrowth,
      icon: Search,
      description: "vs. previous 30 days",
    },
    {
      title: "Click Growth",
      value: data.periodComparison.clicksGrowth,
      icon: MousePointer,
      description: "vs. previous 30 days",
    },
  ]

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0
    return {
      value: `${isPositive ? '+' : ''}${growth.toFixed(1)}%`,
      isPositive,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20',
      borderColor: isPositive ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Growth Overview Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Business Growth Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {growthMetrics.map((metric, index) => {
            const Icon = metric.icon
            const growth = formatGrowth(metric.value)
            
            return (
              <Card key={index} className={`${growth.borderColor} transition-all hover:shadow-md`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{metric.title}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${growth.color}`}>
                          {growth.value}
                        </span>
                        {growth.isPositive ? (
                          <TrendingUp className={`h-4 w-4 ${growth.color}`} />
                        ) : (
                          <TrendingDown className={`h-4 w-4 ${growth.color}`} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {metric.description}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${growth.bgColor}`}>
                      <Icon className={`h-5 w-5 ${growth.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Traffic Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Traffic & Engagement Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
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
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Sessions"
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Page Views"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Search Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
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
                />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Search Impressions"
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Search Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}