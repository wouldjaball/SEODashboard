"use client"

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from "recharts"
import { ChartCard } from "@/components/dashboard/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/utils"
import type { GAWeeklyData } from "@/lib/types"

interface WeeklyPerformanceChartProps {
  data: GAWeeklyData[]
}

const chartConfig = {
  views: {
    label: "Views",
    color: "var(--chart-2)",
  },
  sessions: {
    label: "Sessions",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function WeeklyPerformanceChart({ data }: WeeklyPerformanceChartProps) {
  return (
    <ChartCard title="Weekly User & Conversion Performance" className="h-full">
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ComposedChart accessibilityLayer data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatNumber(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatNumber(value)}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            yAxisId="left"
            dataKey="views"
            fill="var(--color-views)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="sessions"
            stroke="var(--color-sessions)"
            strokeWidth={2}
            dot={{ fill: "var(--color-sessions)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  )
}
