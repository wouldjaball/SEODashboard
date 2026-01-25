"use client"

import { Eye, Clock, Share2, PlayCircle, Users, Film } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import { formatDuration } from "@/lib/utils"
import type { YTMetrics } from "@/lib/types"

interface ExtendedYTMetrics extends YTMetrics {
  isPublicDataOnly?: boolean
  subscriberCount?: number
  videoCount?: number
}

interface YTTrendingMetricsProps {
  metrics: ExtendedYTMetrics
  viewsSparkline?: number[]
  watchTimeSparkline?: number[]
  sharesSparkline?: number[]
  durationSparkline?: number[]
  isPublicDataOnly?: boolean
}

export function YTTrendingMetrics({
  metrics,
  viewsSparkline,
  watchTimeSparkline,
  sharesSparkline,
  isPublicDataOnly,
}: YTTrendingMetricsProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  // Convert total watch time to hours
  const watchTimeHours = Math.floor(metrics.totalWatchTime / 3600)
  const prevWatchTimeHours = prev ? Math.floor(prev.totalWatchTime / 3600) : undefined

  // For public data only mode, show different metrics
  if (isPublicDataOnly) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Views"
          value={metrics.views}
          icon={Eye}
          format="number"
          tooltip="All-time channel views (public data)"
        />
        <KPICard
          title="Subscribers"
          value={metrics.subscriberCount || 0}
          icon={Users}
          format="number"
          tooltip="Current subscriber count (rounded)"
        />
        <KPICard
          title="Total Videos"
          value={metrics.videoCount || 0}
          icon={Film}
          format="number"
          tooltip="Total videos on channel"
        />
        <KPICard
          title="Watch Time"
          value="N/A"
          icon={Clock}
          tooltip="Watch time requires channel ownership"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Views"
        value={metrics.views}
        change={getChange(metrics.views, prev?.views)}
        icon={Eye}
        format="number"
        sparklineData={viewsSparkline}
      />
      <KPICard
        title="Total Watch Time"
        value={`${watchTimeHours.toLocaleString()}h`}
        change={getChange(watchTimeHours, prevWatchTimeHours)}
        icon={Clock}
        sparklineData={watchTimeSparkline}
      />
      <KPICard
        title="Video Shares"
        value={metrics.shares}
        change={getChange(metrics.shares, prev?.shares)}
        icon={Share2}
        format="number"
        sparklineData={sharesSparkline}
      />
      <KPICard
        title="Avg. View Duration"
        value={formatDuration(metrics.avgViewDuration)}
        change={getChange(metrics.avgViewDuration, prev?.avgViewDuration)}
        icon={PlayCircle}
      />
    </div>
  )
}
