"use client"

import { YTTrendingMetrics } from "./yt-trending-metrics"
import { YTEngagementMetrics } from "./yt-engagement-metrics"
import { TopVideosTable } from "./top-videos-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Youtube, Settings } from "lucide-react"
import Link from "next/link"
import type { YTMetrics, YTVideo } from "@/lib/types"

// Extended metrics type that includes public data flags
interface ExtendedYTMetrics extends YTMetrics {
  isPublicDataOnly?: boolean
  subscriberCount?: number
  videoCount?: number
}

interface YTReportProps {
  metrics: ExtendedYTMetrics | null
  videos: YTVideo[]
  viewsSparkline?: number[]
  watchTimeSparkline?: number[]
  sharesSparkline?: number[]
  likesSparkline?: number[]
  error?: string
  isPublicDataOnly?: boolean
}

export function YTReport({
  metrics,
  videos,
  viewsSparkline,
  watchTimeSparkline,
  sharesSparkline,
  likesSparkline,
  error,
  isPublicDataOnly,
}: YTReportProps) {
  // Check if using public data fallback
  const usingPublicData = isPublicDataOnly || metrics?.isPublicDataOnly
  // Show error message if YouTube fetch failed
  if (error) {
    return (
      <Card className="border-dashed border-red-200 dark:border-red-900">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>YouTube Analytics Error</CardTitle>
          <CardDescription className="max-w-lg mx-auto text-red-600 dark:text-red-400">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/integrations">
                <Settings className="h-4 w-4 mr-2" />
                Check Integration Settings
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-md">
            This error may occur if the YouTube channel is a Brand Account. Try disconnecting and reconnecting your Google account, making sure to select the Brand Account during the OAuth consent screen.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show setup message if no YouTube data is available
  if (!metrics) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>YouTube Analytics Not Connected</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            YouTube analytics is not currently set up for this account. Connect your YouTube channel to view video performance, engagement metrics, and audience insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <Button asChild variant="ghost">
            <Link href="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trending Metrics */}
      <YTTrendingMetrics
        metrics={metrics}
        viewsSparkline={viewsSparkline}
        watchTimeSparkline={watchTimeSparkline}
        sharesSparkline={sharesSparkline}
        isPublicDataOnly={usingPublicData}
      />

      {/* Top Videos Table */}
      <TopVideosTable data={videos} isPublicDataOnly={usingPublicData} />

      {/* Engagement Metrics */}
      <YTEngagementMetrics
        metrics={metrics}
        likesSparkline={likesSparkline}
        isPublicDataOnly={usingPublicData}
      />
    </div>
  )
}
