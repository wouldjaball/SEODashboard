"use client"

import { Eye, Users, MousePointerClick } from "lucide-react"
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatNumber } from "@/lib/utils"
import type { LIVisitorMetrics, LIVisitorDaily } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface VisitorAnalyticsProps {
  metrics: LIVisitorMetrics
  dailyData: LIVisitorDaily[]
}

const chartConfig = {
  desktopVisitors: {
    label: "Desktop",
    color: "hsl(var(--chart-2))",
  },
  mobileVisitors: {
    label: "Mobile",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function VisitorAnalytics({ metrics, dailyData }: VisitorAnalyticsProps) {
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
      <h3 className="text-lg font-semibold">Visitor Analytics</h3>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Page Views"
          value={metrics.pageViews}
          change={getChange(metrics.pageViews, prev?.pageViews)}
          icon={Eye}
          format="number"
        />
        <KPICard
          title="Unique Visitors"
          value={metrics.uniqueVisitors}
          change={getChange(metrics.uniqueVisitors, prev?.uniqueVisitors)}
          icon={Users}
          format="number"
        />
        <KPICard
          title="Custom Button Clicks"
          value={metrics.customButtonClicks}
          change={getChange(metrics.customButtonClicks, prev?.customButtonClicks)}
          icon={MousePointerClick}
          format="number"
        />
      </div>

      {/* Visitors Chart */}
      <ChartCard title="Desktop vs Mobile Unique Visitors">
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
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="desktopVisitors"
              stroke="var(--color-desktopVisitors)"
              strokeWidth={2}
              dot={{ fill: "var(--color-desktopVisitors)", strokeWidth: 2, r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="mobileVisitors"
              stroke="var(--color-mobileVisitors)"
              strokeWidth={2}
              dot={{ fill: "var(--color-mobileVisitors)", strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>
    </div>
  )
}
