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
import type { GSCIndexData } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface IndexedPagesChartProps {
  data: GSCIndexData[]
}

const chartConfig = {
  indexedPages: {
    label: "Pages in Results",
    color: "var(--chart-4)",
  },
  rankingKeywords: {
    label: "Ranking Keywords",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function IndexedPagesChart({ data }: IndexedPagesChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <ChartCard title="Daily Search Visibility">
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ComposedChart accessibilityLayer data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="formattedDate"
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
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            yAxisId="left"
            dataKey="indexedPages"
            fill="var(--color-indexedPages)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rankingKeywords"
            stroke="var(--color-rankingKeywords)"
            strokeWidth={2}
            dot={{ fill: "var(--color-rankingKeywords)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  )
}
