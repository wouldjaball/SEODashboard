"use client"

import { Users, UserPlus } from "lucide-react"
import {
  AreaChart,
  Area,
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
import type { LIFollowerMetrics, LIFollowerDaily } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface FollowerAnalyticsProps {
  metrics: LIFollowerMetrics
  dailyData: LIFollowerDaily[]
}

export function FollowerAnalytics({ metrics, dailyData }: FollowerAnalyticsProps) {
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
      <h3 className="text-lg font-semibold">Follower Analytics</h3>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="Total Followers"
          value={metrics.totalFollowers}
          change={getChange(metrics.totalFollowers, prev?.totalFollowers)}
          icon={Users}
          format="number"
        />
        <KPICard
          title="New Followers"
          value={metrics.newFollowers}
          change={getChange(metrics.newFollowers, prev?.newFollowers)}
          icon={UserPlus}
          format="number"
        />
      </div>

      {/* Followers Chart */}
      <ChartCard title="Sponsored vs Organic Followers">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              <Area
                type="monotone"
                dataKey="sponsored"
                stackId="1"
                stroke={chartColors.secondary}
                fill={chartColors.secondary}
                fillOpacity={0.6}
                name="Sponsored"
              />
              <Area
                type="monotone"
                dataKey="organic"
                stackId="1"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.6}
                name="Organic"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
