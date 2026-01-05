"use client"

import { Heart, MessageSquare, Repeat } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { KPICard, ChartCard } from "@/components/dashboard/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/utils"
import type { LIContentMetrics, LIImpressionDaily } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface ContentAnalyticsProps {
  metrics: LIContentMetrics
  dailyData: LIImpressionDaily[]
}

const chartConfig = {
  impressions: {
    label: "Impressions",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

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
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatNumber(value)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="var(--color-impressions)"
              strokeWidth={2}
              dot={{ fill: "var(--color-impressions)", strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>
    </div>
  )
}
