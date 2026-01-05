"use client"

import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { MetricBadge } from "./metric-badge"
import { cn, formatNumber, formatPercent, formatDuration, formatCurrency } from "@/lib/utils"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts"

interface KPICardProps {
  title: string
  value: string | number
  change?: number // Percentage change as decimal
  changeLabel?: string
  format?: "number" | "currency" | "percent" | "duration"
  icon?: LucideIcon
  sparklineData?: number[]
  className?: string
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs previous period",
  format = "number",
  icon: Icon,
  sparklineData,
  className,
}: KPICardProps) {
  const formattedValue = (() => {
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

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{formattedValue}</p>
              {Icon && (
                <Icon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {change !== undefined && (
              <div className="flex items-center gap-2">
                <MetricBadge value={change} size="sm" />
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length > 0 && (
            <div className="h-12 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData.map((v, i) => ({ value: v, index: i }))}>
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={1.5}
                    fill="url(#sparklineGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
