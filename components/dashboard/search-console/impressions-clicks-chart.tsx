"use client"

import { useMemo } from "react"
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from "recharts"
import { format, parseISO } from "date-fns"
import { ChartCard } from "@/components/dashboard/shared"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCWeeklyData } from "@/lib/types"

interface ImpressionsClicksChartProps {
  data: GSCWeeklyData[]
}

const chartConfig = {
  impressions: {
    label: "Impressions",
    color: "var(--chart-2)",
  },
  clicks: {
    label: "Clicks",
    color: "var(--chart-3)",
  },
  ctr: {
    label: "CTR",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ImpressionsClicksChart({ data }: ImpressionsClicksChartProps) {
  // Format dates for display
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      formattedDate: item.date ? format(parseISO(item.date), "MMM d") : item.weekLabel,
    }))
  }, [data])

  return (
    <ChartCard title="Impressions, Clicks & CTR" className="h-full">
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ComposedChart accessibilityLayer data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
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
            tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
            domain={[0, 0.01]}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  if (name === "ctr") return <span>{formatPercent(Number(value))}</span>
                  return <span>{formatNumber(Number(value))}</span>
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            yAxisId="left"
            dataKey="impressions"
            fill="var(--color-impressions)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="clicks"
            fill="var(--color-clicks)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ctr"
            stroke="var(--color-ctr)"
            strokeWidth={2}
            dot={{ fill: "var(--color-ctr)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  )
}
