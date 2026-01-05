"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartCard } from "@/components/dashboard/shared"
import { channelColors } from "@/lib/chart-config"
import { formatNumber } from "@/lib/utils"
import type { GAChannelData } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface ChannelPerformanceChartProps {
  data: GAChannelData[]
}

const channelKeys = [
  { key: "direct", name: "Direct" },
  { key: "organicSearch", name: "Organic Search" },
  { key: "paidSearch", name: "Paid Search" },
  { key: "referral", name: "Referral" },
  { key: "organicSocial", name: "Organic Social" },
  { key: "paidOther", name: "Paid Other" },
  { key: "crossNetwork", name: "Cross-network" },
  { key: "unassigned", name: "Unassigned" },
]

export function ChannelPerformanceChart({ data }: ChannelPerformanceChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <ChartCard title="Weekly Channel Performance by Users" className="w-full">
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
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
              formatter={(value) => [formatNumber(Number(value), { suffix: false }), ""]}
            />
            <Legend iconType="circle" iconSize={8} />
            {channelKeys.map(({ key, name }) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={name}
                stackId="1"
                stroke={channelColors[name]}
                fill={channelColors[name]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
