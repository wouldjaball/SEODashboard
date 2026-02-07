"use client"

import { Search, Users, Eye, MousePointerClick, TrendingUp, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatNumber } from "@/lib/utils"
import type { 
  LIFollowerMetrics, 
  LIContentMetrics, 
  LIVisitorMetrics,
  LISearchAppearanceMetrics 
} from "@/lib/types"

interface LinkedInNativeDashboardProps {
  searchAppearanceMetrics?: LISearchAppearanceMetrics | null
  followerMetrics?: LIFollowerMetrics | null
  contentMetrics?: LIContentMetrics | null
  visitorMetrics?: LIVisitorMetrics | null
  dateRange?: { from: Date; to: Date }
  className?: string
}

interface LinkedInMetricCardProps {
  title: string
  value: number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  className?: string
}

function LinkedInMetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  className 
}: LinkedInMetricCardProps) {
  const isPositiveChange = change !== undefined && change >= 0
  
  return (
    <Card className={cn(
      "shadow-sm hover:shadow-md transition-all duration-200",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            {/* Icon and Title */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                color
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {title}
              </h3>
            </div>

            {/* Main Value */}
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {formatNumber(value)}
              </p>

              {/* Percentage Change */}
              {change !== undefined && !isNaN(change) && isFinite(change) && (
                <div className="flex items-center gap-1">
                  {isPositiveChange ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    isPositiveChange ? "text-green-600" : "text-red-600"
                  )}>
                    {isPositiveChange ? '+' : ''}{change.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs previous period
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LinkedInNativeDashboard({
  searchAppearanceMetrics,
  followerMetrics,
  contentMetrics,
  visitorMetrics,
  dateRange,
  className
}: LinkedInNativeDashboardProps) {
  // Calculate percentage changes
  const searchAppearanceChange = searchAppearanceMetrics?.previousPeriod 
    ? ((searchAppearanceMetrics.searchAppearances - searchAppearanceMetrics.previousPeriod.searchAppearances) / searchAppearanceMetrics.previousPeriod.searchAppearances) * 100
    : undefined

  const followerChange = followerMetrics?.previousPeriod
    ? ((followerMetrics.newFollowers - followerMetrics.previousPeriod.newFollowers) / followerMetrics.previousPeriod.newFollowers) * 100
    : undefined

  const impressionChange = contentMetrics?.previousPeriod
    ? ((contentMetrics.impressions - contentMetrics.previousPeriod.impressions) / contentMetrics.previousPeriod.impressions) * 100
    : undefined

  const visitorChange = visitorMetrics?.previousPeriod
    ? ((visitorMetrics.pageViews - visitorMetrics.previousPeriod.pageViews) / visitorMetrics.previousPeriod.pageViews) * 100
    : undefined

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">
          LinkedIn Analytics
        </h2>
        <p className="text-sm text-muted-foreground">
          Key performance metrics for your LinkedIn company page
          {dateRange && ` • ${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`}
        </p>
      </div>

      {/* 4-Card Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Search Appearances */}
        <LinkedInMetricCard
          title="Search Appearances"
          value={searchAppearanceMetrics?.searchAppearances || 0}
          change={searchAppearanceChange}
          icon={Search}
          color="bg-blue-600"
        />

        {/* New Followers */}
        <LinkedInMetricCard
          title="New Followers"
          value={followerMetrics?.newFollowers || 0}
          change={followerChange}
          icon={Users}
          color="bg-green-600"
        />

        {/* Post Impressions */}
        <LinkedInMetricCard
          title="Post Impressions"
          value={contentMetrics?.impressions || 0}
          change={impressionChange}
          icon={Eye}
          color="bg-purple-600"
        />

        {/* Page Visitors */}
        <LinkedInMetricCard
          title="Page Visitors"
          value={visitorMetrics?.pageViews || 0}
          change={visitorChange}
          icon={MousePointerClick}
          color="bg-orange-600"
        />
      </div>
    </div>
  )
}