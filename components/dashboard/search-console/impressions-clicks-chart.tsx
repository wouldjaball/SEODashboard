"use client"

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"
import { ChartCard } from "@/components/dashboard/shared"
import { chartColors } from "@/lib/chart-config"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCWeeklyData } from "@/lib/types"

interface ImpressionsClicksChartProps {
  data: GSCWeeklyData[]
}

export function ImpressionsClicksChart({ data }: ImpressionsClicksChartProps) {
  return (
    <ChartCard title="Impressions, Clicks & CTR" className="h-full">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatNumber(value)}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
              className="text-muted-foreground"
              domain={[0, 0.1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => {
                if (name === "ctr") return [formatPercent(Number(value)), "CTR"]
                return [formatNumber(Number(value), { suffix: false }), name === "impressions" ? "Impressions" : "Clicks"]
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="impressions"
              fill={chartColors.secondary}
              name="Impressions"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="clicks"
              fill={chartColors.tertiary}
              name="Clicks"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ctr"
              stroke={chartColors.primary}
              strokeWidth={2}
              dot={{ fill: chartColors.primary, strokeWidth: 2 }}
              name="CTR"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
