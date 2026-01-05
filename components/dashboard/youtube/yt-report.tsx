"use client"

import { YTTrendingMetrics } from "./yt-trending-metrics"
import { YTEngagementMetrics } from "./yt-engagement-metrics"
import { TopVideosTable } from "./top-videos-table"
import type { YTMetrics, YTVideo } from "@/lib/types"

interface YTReportProps {
  metrics: YTMetrics
  videos: YTVideo[]
  viewsSparkline?: number[]
  watchTimeSparkline?: number[]
  sharesSparkline?: number[]
  likesSparkline?: number[]
}

export function YTReport({
  metrics,
  videos,
  viewsSparkline,
  watchTimeSparkline,
  sharesSparkline,
  likesSparkline,
}: YTReportProps) {
  return (
    <div className="space-y-6">
      {/* Trending Metrics */}
      <YTTrendingMetrics
        metrics={metrics}
        viewsSparkline={viewsSparkline}
        watchTimeSparkline={watchTimeSparkline}
        sharesSparkline={sharesSparkline}
      />

      {/* Top Videos Table */}
      <TopVideosTable data={videos} />

      {/* Engagement Metrics */}
      <YTEngagementMetrics
        metrics={metrics}
        likesSparkline={likesSparkline}
      />
    </div>
  )
}
