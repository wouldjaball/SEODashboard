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
import { format } from "date-fns"
import { filterWeeklyDataByDateRange } from "@/lib/ga-filters"
import type { GAWeeklyData } from "@/lib/types"

interface WeeklyPerformanceChartProps {
  data: GAWeeklyData[]
  dateRange?: { from: Date; to: Date }
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

export function WeeklyPerformanceChart({ data, dateRange }: WeeklyPerformanceChartProps) {
  console.log('[WeeklyPerformanceChart] Received data:', {
    dataLength: data?.length || 0,
    firstItem: data?.[0],
    dateRange,
    fullData: data
  })

  const dateRangeStr = dateRange
    ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    : undefined

  // Handle empty or null data
  if (!data || data.length === 0) {
    console.log('[WeeklyPerformanceChart] No data available')
    return (
      <ChartCard title="Weekly User & Conversion Performance" dateRange={dateRangeStr} className="h-full">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No weekly performance data available</p>
            <p className="text-xs mt-1">Data may still be loading or no analytics data configured</p>
          </div>
        </div>
      </ChartCard>
    )
  }

  const filteredData = filterWeeklyDataByDateRange(data, dateRange)
  console.log('[WeeklyPerformanceChart] After filtering:', {
    originalCount: data.length,
    filteredCount: filteredData.length,
    dateRange
  })

  // Handle case where filtering removed all data
  if (filteredData.length === 0) {
    console.log('[WeeklyPerformanceChart] No data after filtering')
    return (
      <ChartCard title="Weekly User & Conversion Performance" dateRange={dateRangeStr} className="h-full">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No data available for selected date range</p>
            <p className="text-xs mt-1">Try adjusting the date range or check data availability</p>
          </div>
        </div>
      </ChartCard>
    )
  }

  console.log('[WeeklyPerformanceChart] Rendering chart with', filteredData.length, 'data points')

  return (
    <ChartCard title="Weekly User & Conversion Performance" dateRange={dateRangeStr} className="h-full">
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ComposedChart accessibilityLayer data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
