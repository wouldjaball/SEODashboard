"use client"

import { useState, useEffect } from "react"
import { subDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { DateRangePicker } from "@/components/dashboard/shared"
import { GAReport } from "@/components/dashboard/google-analytics"
import { GSCReport } from "@/components/dashboard/search-console"
import { YTReport } from "@/components/dashboard/youtube"
import { LIReport } from "@/components/dashboard/linkedin"
import {
  GoogleAnalyticsIcon,
  SearchConsoleIcon,
  YouTubeIcon,
  LinkedInIcon,
} from "@/components/icons"
import { useCompany } from "@/lib/company-context"

export default function DashboardPage() {
  const { company, isLoading, error, refetchData, comparisonEnabled, setComparisonEnabled } = useCompany()
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("google-analytics")

  // Fetch data when date range or company changes
  useEffect(() => {
    // Only fetch if we have a real company (UUID format, not mock slug)
    if (company.id && company.id.includes('-') && company.id.length > 20) {
      console.log('[Dashboard] Triggering refetchData for company:', company.id)
      refetchData(company.id, dateRange)
    }
  }, [dateRange, company.id])

  if (isLoading && !company.gaMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground truncate">
            {company.industry} • Multi-source analytics overview
          </p>
        </div>
        <div className="shrink-0">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            showComparison={true}
            comparisonEnabled={comparisonEnabled}
            onComparisonToggle={setComparisonEnabled}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-4 h-auto p-1 gap-0.5 sm:gap-1">
          <TabsTrigger
            value="google-analytics"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <GoogleAnalyticsIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate leading-tight">Analytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="search-console"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <SearchConsoleIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate leading-tight">Search</span>
          </TabsTrigger>
          <TabsTrigger
            value="youtube"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <YouTubeIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate leading-tight">YouTube</span>
          </TabsTrigger>
          <TabsTrigger
            value="linkedin"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <LinkedInIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate leading-tight">LinkedIn</span>
          </TabsTrigger>
        </TabsList>

        {/* Google Analytics Tab */}
        <TabsContent value="google-analytics" className="space-y-4 sm:space-y-6 mt-0">
          <GAReport
            metrics={company.gaMetrics}
            weeklyData={company.gaWeeklyData}
            channelData={company.gaChannelData}
            trafficShare={company.gaTrafficShare}
            sourcePerformance={company.gaSourcePerformance}
            landingPages={company.gaLandingPages}
            regions={company.gaRegions}
            devices={company.gaDevices}
            gender={company.gaGender}
            age={company.gaAge}
          />
        </TabsContent>

        {/* Search Console Tab */}
        <TabsContent value="search-console" className="space-y-4 sm:space-y-6 mt-0">
          <GSCReport
            metrics={company.gscMetrics}
            weeklyData={company.gscWeeklyData}
            indexData={company.gscIndexData}
            keywords={company.gscKeywords}
            landingPages={company.gscLandingPages}
            countries={company.gscCountries}
            devices={company.gscDevices}
          />
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-4 sm:space-y-6 mt-0">
          <YTReport
            metrics={company.ytMetrics}
            videos={company.ytVideos}
            viewsSparkline={company.ytViewsSparkline}
            watchTimeSparkline={company.ytWatchTimeSparkline}
            sharesSparkline={company.ytSharesSparkline}
            likesSparkline={company.ytLikesSparkline}
          />
        </TabsContent>

        {/* LinkedIn Tab */}
        <TabsContent value="linkedin" className="space-y-4 sm:space-y-6 mt-0">
          <LIReport
            visitorMetrics={company.liVisitorMetrics}
            followerMetrics={company.liFollowerMetrics}
            contentMetrics={company.liContentMetrics}
            visitorDaily={company.liVisitorDaily}
            followerDaily={company.liFollowerDaily}
            impressionDaily={company.liImpressionDaily}
            industryDemographics={company.liIndustryDemographics}
            seniorityDemographics={company.liSeniorityDemographics}
            jobFunctionDemographics={company.liJobFunctionDemographics}
            companySizeDemographics={company.liCompanySizeDemographics}
            updates={company.liUpdates}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
