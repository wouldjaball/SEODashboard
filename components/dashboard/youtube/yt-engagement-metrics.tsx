"use client"

import { ThumbsUp, ThumbsDown, MessageSquare, UserPlus } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import type { YTMetrics } from "@/lib/types"

interface YTEngagementMetricsProps {
  metrics: YTMetrics
  likesSparkline?: number[]
}

export function YTEngagementMetrics({
  metrics,
  likesSparkline,
}: YTEngagementMetricsProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Likes"
        value={metrics.likes}
        change={getChange(metrics.likes, prev?.likes)}
        icon={ThumbsUp}
        format="number"
        sparklineData={likesSparkline}
      />
      <KPICard
        title="Subscriptions"
        value={metrics.subscriptions}
        change={getChange(metrics.subscriptions, prev?.subscriptions)}
        icon={UserPlus}
        format="number"
      />
      <KPICard
        title="Dislikes"
        value={metrics.dislikes}
        change={prev ? -(metrics.dislikes - prev.dislikes) / prev.dislikes : undefined}
        icon={ThumbsDown}
        format="number"
      />
      <KPICard
        title="Comments"
        value={metrics.comments}
        change={getChange(metrics.comments, prev?.comments)}
        icon={MessageSquare}
        format="number"
      />
    </div>
  )
}
