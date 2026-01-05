"use client"

import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface MetricBadgeProps {
  value: number // Percentage as decimal (e.g., 0.25 for 25%)
  showIcon?: boolean
  size?: "sm" | "md"
}

export function MetricBadge({ value, showIcon = true, size = "md" }: MetricBadgeProps) {
  const percentage = value * 100
  const isPositive = percentage > 0
  const isNegative = percentage < 0
  const isZero = percentage === 0

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus
  const variant = isPositive ? "success" : isNegative ? "error" : "secondary"

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-0.5 font-medium",
        size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-0.5"
      )}
    >
      {showIcon && (
        <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      {Math.abs(percentage).toFixed(1)}%
    </Badge>
  )
}
