"use client"

import { Eye, Users, MousePointerClick } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { KPICard, ChartCard } from "@/components/dashboard/shared"
import { chartColors } from "@/lib/chart-config"
import { formatNumber } from "@/lib/utils"
import type { LIVisitorMetrics, LIVisitorDaily } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface VisitorAnalyticsProps {
  metrics: LIVisitorMetrics
  dailyData: LIVisitorDaily[]
}

export function VisitorAnalytics({ metrics, dailyData }: VisitorAnalyticsProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  const formattedData = dailyData.map((d) => ({
    ...d,
    formattedDate: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Visitor Analytics</h3>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Page Views"
          value={metrics.pageViews}
          change={getChange(metrics.pageViews, prev?.pageViews)}
          icon={Eye}
          format="number"
        />
        <KPICard
          title="Unique Visitors"
          value={metrics.uniqueVisitors}
          change={getChange(metrics.uniqueVisitors, prev?.uniqueVisitors)}
          icon={Users}
          format="number"
        />
        <KPICard
          title="Custom Button Clicks"
          value={metrics.customButtonClicks}
          change={getChange(metrics.customButtonClicks, prev?.customButtonClicks)}
          icon={MousePointerClick}
          format="number"
        />
      </div>

      {/* Visitors Chart */}
      <ChartCard title="Desktop vs Mobile Unique Visitors">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value)}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value) => [formatNumber(Number(value), { suffix: false }), ""]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="desktopVisitors"
                stroke={chartColors.secondary}
                strokeWidth={2}
                dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 3 }}
                name="Desktop"
              />
              <Line
                type="monotone"
                dataKey="mobileVisitors"
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={{ fill: chartColors.primary, strokeWidth: 2, r: 3 }}
                name="Mobile"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
