"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { filterChannelDataByDateRange } from "@/lib/ga-filters"
import type { GAChannelData } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface ChannelPerformanceChartProps {
  data: GAChannelData[]
  dateRange?: { from: Date; to: Date }
}

const chartConfig = {
  direct: {
    label: "Direct",
    color: "var(--chart-1)",
  },
  organicSearch: {
    label: "Organic Search",
    color: "var(--chart-2)",
  },
  paidSearch: {
    label: "Paid Search",
    color: "var(--chart-3)",
  },
  referral: {
    label: "Referral",
    color: "var(--chart-4)",
  },
  organicSocial: {
    label: "Organic Social",
    color: "var(--chart-5)",
  },
  paidOther: {
    label: "Paid Other",
    color: "#3b82f6",
  },
  crossNetwork: {
    label: "Cross-network",
    color: "#8b5cf6",
  },
  unassigned: {
    label: "Unassigned",
    color: "#71717a",
  },
} satisfies ChartConfig

export function ChannelPerformanceChart({ data, dateRange }: ChannelPerformanceChartProps) {
  console.log('[ChannelPerformanceChart] Received data:', {
    dataLength: data?.length || 0,
    firstItem: data?.[0],
    dateRange,
    fullData: data
  })

  // Handle empty or null data
  if (!data || data.length === 0) {
    console.log('[ChannelPerformanceChart] No data available')
    const dateRangeStr = dateRange
      ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
      : undefined

    return (
      <ChartCard title="Weekly Channel Performance by Users" dateRange={dateRangeStr} className="w-full">
        <div className="h-[350px] w-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No channel performance data available</p>
            <p className="text-xs mt-1">Data may still be loading or no analytics data configured</p>
          </div>
        </div>
      </ChartCard>
    )
  }

  const filteredData = filterChannelDataByDateRange(data, dateRange)
  console.log('[ChannelPerformanceChart] After filtering:', {
    originalCount: data.length,
    filteredCount: filteredData.length,
    dateRange
  })

  const formattedData = filteredData.map((d) => {
    try {
      return {
        ...d,
        formattedDate: format(parseISO(d.date), "MMM d"),
      }
    } catch (error) {
      console.error('[ChannelPerformanceChart] Date parsing error for:', d.date, error)
      return {
        ...d,
        formattedDate: d.date, // Fallback to original date
      }
    }
  })

  console.log('[ChannelPerformanceChart] Formatted data sample:', formattedData.slice(0, 2))

  const dateRangeStr = dateRange
    ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    : undefined

  // Handle case where filtering removed all data
  if (formattedData.length === 0) {
    console.log('[ChannelPerformanceChart] No data after filtering')
    return (
      <ChartCard title="Weekly Channel Performance by Users" dateRange={dateRangeStr} className="w-full">
        <div className="h-[350px] w-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No data available for selected date range</p>
            <p className="text-xs mt-1">Try adjusting the date range or check data availability</p>
          </div>
        </div>
      </ChartCard>
    )
  }

  console.log('[ChannelPerformanceChart] Rendering chart with', formattedData.length, 'data points')

  return (
    <ChartCard title="Weekly Channel Performance by Users" dateRange={dateRangeStr} className="w-full">
      <ChartContainer config={chartConfig} className="h-[350px] w-full">
        <AreaChart accessibilityLayer data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          {Object.keys(chartConfig).map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={`var(--color-${key})`}
              fill={`var(--color-${key})`}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}
