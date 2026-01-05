"use client"

import { Heart, MessageSquare, Repeat } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { KPICard, ChartCard } from "@/components/dashboard/shared"
import { chartColors } from "@/lib/chart-config"
import { formatNumber } from "@/lib/utils"
import type { LIContentMetrics, LIImpressionDaily } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface ContentAnalyticsProps {
  metrics: LIContentMetrics
  dailyData: LIImpressionDaily[]
}

export function ContentAnalytics({ metrics, dailyData }: ContentAnalyticsProps) {
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
      <h3 className="text-lg font-semibold">Content Analytics</h3>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Reactions"
          value={metrics.reactions}
          change={getChange(metrics.reactions, prev?.reactions)}
          icon={Heart}
          format="number"
        />
        <KPICard
          title="Comments"
          value={metrics.comments}
          change={getChange(metrics.comments, prev?.comments)}
          icon={MessageSquare}
          format="number"
        />
        <KPICard
          title="Reposts"
          value={metrics.reposts}
          change={getChange(metrics.reposts, prev?.reposts)}
          icon={Repeat}
          format="number"
        />
      </div>

      {/* Impressions Chart */}
      <ChartCard title="Impressions Over Time">
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
                formatter={(value) => [formatNumber(Number(value), { suffix: false }), "Impressions"]}
              />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={{ fill: chartColors.primary, strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
