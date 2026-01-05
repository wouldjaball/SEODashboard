"use client"

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { ChartCard } from "@/components/dashboard/shared"
import { channelColors } from "@/lib/chart-config"
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GATrafficShare } from "@/lib/types"

interface TrafficShareChartProps {
  data: GATrafficShare[]
}

export function TrafficShareChart({ data }: TrafficShareChartProps) {
  // Convert to plain objects for Recharts compatibility
  const chartData = data.map(d => ({ ...d }))

  return (
    <ChartCard title="Traffic Share by Users" className="h-full">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="40%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="users"
              nameKey="channel"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={channelColors[entry.channel] || "#6b7280"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => [
                `${formatNumber(Number(value))} (${formatPercent(data.find(d => d.channel === name)?.percentage || 0)})`,
                name,
              ]}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
