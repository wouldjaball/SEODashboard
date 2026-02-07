"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MousePointer, Search } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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

  return (
    <div className="space-y-6">
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

      {/* Search Performance Trends - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-5 w-5" />
              Search Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-sm" tick={{ fontSize: 11 }} />
                  <YAxis className="text-sm" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Impressions']}
                  />
                  <Line type="monotone" dataKey="impressions" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MousePointer className="h-5 w-5" />
              Search Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-sm" tick={{ fontSize: 11 }} />
                  <YAxis className="text-sm" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Clicks']}
                  />
                  <Line type="monotone" dataKey="clicks" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}