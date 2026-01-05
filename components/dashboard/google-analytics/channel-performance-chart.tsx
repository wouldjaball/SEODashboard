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
import type { GAChannelData } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface ChannelPerformanceChartProps {
  data: GAChannelData[]
}

const chartConfig = {
  direct: {
    label: "Direct",
    color: "hsl(var(--chart-1))",
  },
  organicSearch: {
    label: "Organic Search",
    color: "hsl(var(--chart-2))",
  },
  paidSearch: {
    label: "Paid Search",
    color: "hsl(var(--chart-3))",
  },
  referral: {
    label: "Referral",
    color: "hsl(var(--chart-4))",
  },
  organicSocial: {
    label: "Organic Social",
    color: "hsl(var(--chart-5))",
  },
  paidOther: {
    label: "Paid Other",
    color: "hsl(217 91% 60%)",
  },
  crossNetwork: {
    label: "Cross-network",
    color: "hsl(280 65% 60%)",
  },
  unassigned: {
    label: "Unassigned",
    color: "hsl(220 9% 46%)",
  },
} satisfies ChartConfig

export function ChannelPerformanceChart({ data }: ChannelPerformanceChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <ChartCard title="Weekly Channel Performance by Users" className="w-full">
      <ChartContainer config={chartConfig} className="h-[350px] w-full">
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
