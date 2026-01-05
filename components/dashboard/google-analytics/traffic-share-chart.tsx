"use client"

import {
  PieChart,
  Pie,
  Cell,
  Label,
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
import type { GATrafficShare } from "@/lib/types"

interface TrafficShareChartProps {
  data: GATrafficShare[]
}

const channelColors: Record<string, string> = {
  "Organic Search": "hsl(var(--chart-1))",
  "Direct": "hsl(var(--chart-2))",
  "Paid Search": "hsl(var(--chart-3))",
  "Referral": "hsl(var(--chart-4))",
  "Organic Social": "hsl(var(--chart-5))",
  "Paid Other": "hsl(217 91% 60%)",
  "Cross-network": "hsl(280 65% 60%)",
  "Unassigned": "hsl(220 9% 46%)",
}

export function TrafficShareChart({ data }: TrafficShareChartProps) {
  const chartData = data.map(d => ({ ...d }))
  const totalUsers = chartData.reduce((sum, item) => sum + item.users, 0)

  const chartConfig = Object.fromEntries(
    data.map((item) => [
      item.channel,
      {
        label: item.channel,
        color: channelColors[item.channel] || "hsl(var(--chart-1))",
      },
    ])
  ) satisfies ChartConfig

  return (
    <ChartCard title="Traffic Share by Users" className="h-full">
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex items-center gap-2">
                    <span>{String(name)}</span>
                    <span className="font-mono font-medium">{formatNumber(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={chartData}
            cx="50%"
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
                fill={channelColors[entry.channel] || "hsl(var(--chart-1))"}
              />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {formatNumber(totalUsers)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        Total Users
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="channel" />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
          />
        </PieChart>
      </ChartContainer>
    </ChartCard>
  )
}
