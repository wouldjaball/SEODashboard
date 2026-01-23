"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { MetricBadge } from "./metric-badge"
import { cn, formatNumber, formatPercent, formatDuration, formatCurrency } from "@/lib/utils"
import {
  Area,
  AreaChart,
} from "recharts"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"

interface KPICardProps {
  title: string
  value: string | number | null | undefined
  change?: number // Percentage change as decimal
  changeLabel?: string
  format?: "number" | "currency" | "percent" | "duration"
  icon?: LucideIcon
  sparklineData?: number[]
  className?: string
}

const sparklineConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs prev",
  format = "number",
  icon: Icon,
  sparklineData,
  className,
}: KPICardProps) {
  const formattedValue = (() => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === "string") return value
    switch (format) {
      case "currency":
        return formatCurrency(value)
      case "percent":
        return formatPercent(value)
      case "duration":
        return formatDuration(value)
      case "number":
      default:
        return formatNumber(value)
    }
  })()

  const sparklineId = React.useId()

  return (
    <Card className={cn("relative overflow-hidden touch-manipulation", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {Icon && (
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              )}
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold tracking-tight truncate">{formattedValue}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <MetricBadge value={change} size="sm" />
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{changeLabel}</span>
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length > 0 && (
            <ChartContainer config={sparklineConfig} className="h-10 w-16 sm:h-12 sm:w-20 shrink-0">
              <AreaChart data={sparklineData.map((v, i) => ({ value: v, index: i }))}>
                <defs>
                  <linearGradient id={`sparklineGradient-${sparklineId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={1.5}
                  fill={`url(#sparklineGradient-${sparklineId})`}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
