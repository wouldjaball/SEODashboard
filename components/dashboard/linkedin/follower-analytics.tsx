"use client"

import { Users, UserPlus } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { KPICard, ChartCard } from "@/components/dashboard/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/utils"
import type { LIFollowerMetrics, LIFollowerDaily } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface FollowerAnalyticsProps {
  metrics: LIFollowerMetrics
  dailyData: LIFollowerDaily[]
}

const chartConfig = {
  sponsored: {
    label: "Sponsored",
    color: "var(--chart-2)",
  },
  organic: {
    label: "Organic",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

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
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="sponsored"
              stackId="1"
              stroke="var(--color-sponsored)"
              fill="var(--color-sponsored)"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="organic"
              stackId="1"
              stroke="var(--color-organic)"
              fill="var(--color-organic)"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>
      </ChartCard>
    </div>
  )
}
