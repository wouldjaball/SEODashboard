"use client"

import { ThumbsUp, ThumbsDown, MessageSquare, UserPlus } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import type { YTMetrics } from "@/lib/types"

interface YTEngagementMetricsProps {
  metrics: YTMetrics
  likesSparkline?: number[]
  isPublicDataOnly?: boolean
}

export function YTEngagementMetrics({
  metrics,
  likesSparkline,
  isPublicDataOnly,
}: YTEngagementMetricsProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  // For public data only mode, show available metrics with appropriate messaging
  if (isPublicDataOnly) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Likes"
          value={metrics.likes}
          icon={ThumbsUp}
          format="number"
          tooltip="Total likes from recent videos (public data)"
        />
        <KPICard
          title="Subscriptions"
          value="N/A"
          icon={UserPlus}
          tooltip="Subscriber change requires channel ownership"
        />
        <KPICard
          title="Dislikes"
          value="N/A"
          icon={ThumbsDown}
          tooltip="Dislike counts are no longer public"
        />
        <KPICard
          title="Comments"
          value={metrics.comments}
          icon={MessageSquare}
          format="number"
          tooltip="Total comments from recent videos (public data)"
        />
      </div>
    )
  }

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
