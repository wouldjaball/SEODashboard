"use client"

import { Eye, Clock, Share2, PlayCircle } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import { formatDuration } from "@/lib/utils"
import type { YTMetrics } from "@/lib/types"

interface YTTrendingMetricsProps {
  metrics: YTMetrics
  viewsSparkline?: number[]
  watchTimeSparkline?: number[]
  sharesSparkline?: number[]
  durationSparkline?: number[]
}

export function YTTrendingMetrics({
  metrics,
  viewsSparkline,
  watchTimeSparkline,
  sharesSparkline,
}: YTTrendingMetricsProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  // Convert total watch time to hours
  const watchTimeHours = Math.floor(metrics.totalWatchTime / 3600)
  const prevWatchTimeHours = prev ? Math.floor(prev.totalWatchTime / 3600) : undefined

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
