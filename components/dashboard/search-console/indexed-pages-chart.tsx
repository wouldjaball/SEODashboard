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
import { formatNumber } from "@/lib/utils"
import type { GSCIndexData } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface IndexedPagesChartProps {
  data: GSCIndexData[]
}

export function IndexedPagesChart({ data }: IndexedPagesChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <ChartCard title="Indexed Pages and Ranking Keywords">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDate"
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
              tickFormatter={(value) => formatNumber(value)}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => [
                formatNumber(Number(value), { suffix: false }),
                name === "indexedPages" ? "Indexed Pages" : "Ranking Keywords",
              ]}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="indexedPages"
              fill={chartColors.quaternary}
              name="Indexed Pages"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rankingKeywords"
              stroke={chartColors.primary}
              strokeWidth={2}
              dot={{ fill: chartColors.primary, strokeWidth: 2 }}
              name="Ranking Keywords"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
