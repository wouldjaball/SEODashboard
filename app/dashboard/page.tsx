"use client"

import { useState } from "react"
import { subDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/dashboard/shared"
import { GAReport } from "@/components/dashboard/google-analytics"
import { GSCReport } from "@/components/dashboard/search-console"
import { YTReport } from "@/components/dashboard/youtube"
import { LIReport } from "@/components/dashboard/linkedin"
import { BarChart3, Search, Youtube, Linkedin } from "lucide-react"

// Import mock data
import {
  gaMetrics,
  gaWeeklyData,
  gaChannelData,
  gaTrafficShare,
  gaSourcePerformance,
  gaLandingPages,
  gaRegions,
  gaDevices,
  gaGender,
  gaAge,
} from "@/lib/mock-data/google-analytics"

import {
  gscMetrics,
  gscWeeklyData,
  gscIndexData,
  gscKeywords,
  gscLandingPages,
  gscCountries,
  gscDevices,
} from "@/lib/mock-data/search-console"

import {
  ytMetrics,
  ytVideos,
  ytViewsSparkline,
  ytWatchTimeSparkline,
  ytSharesSparkline,
  ytLikesSparkline,
} from "@/lib/mock-data/youtube"

import {
  liVisitorMetrics,
  liFollowerMetrics,
  liContentMetrics,
  liVisitorDaily,
  liFollowerDaily,
  liImpressionDaily,
  liIndustryDemographics,
  liSeniorityDemographics,
  liJobFunctionDemographics,
  liCompanySizeDemographics,
  liUpdates,
} from "@/lib/mock-data/linkedin"

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground truncate">
            Multi-source analytics overview
          </p>
        </div>
        <div className="shrink-0">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="google-analytics" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-12 sm:h-10 w-auto min-w-full sm:min-w-0 sm:w-full sm:grid sm:grid-cols-4 gap-1 p-1">
            <TabsTrigger
              value="google-analytics"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm min-h-[40px] sm:min-h-0"
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Analytics</span>
              <span className="xs:hidden sm:hidden">GA</span>
            </TabsTrigger>
            <TabsTrigger
              value="search-console"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm min-h-[40px] sm:min-h-0"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Search</span>
              <span className="xs:hidden sm:hidden">GSC</span>
            </TabsTrigger>
            <TabsTrigger
              value="youtube"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm min-h-[40px] sm:min-h-0"
            >
              <Youtube className="h-4 w-4 shrink-0" />
              <span>YouTube</span>
            </TabsTrigger>
            <TabsTrigger
              value="linkedin"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm min-h-[40px] sm:min-h-0"
            >
              <Linkedin className="h-4 w-4 shrink-0" />
              <span>LinkedIn</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Google Analytics Tab */}
        <TabsContent value="google-analytics" className="space-y-4 sm:space-y-6 mt-0">
          <GAReport
            metrics={gaMetrics}
            weeklyData={gaWeeklyData}
            channelData={gaChannelData}
            trafficShare={gaTrafficShare}
            sourcePerformance={gaSourcePerformance}
            landingPages={gaLandingPages}
            regions={gaRegions}
            devices={gaDevices}
            gender={gaGender}
            age={gaAge}
          />
        </TabsContent>

        {/* Search Console Tab */}
        <TabsContent value="search-console" className="space-y-4 sm:space-y-6 mt-0">
          <GSCReport
            metrics={gscMetrics}
            weeklyData={gscWeeklyData}
            indexData={gscIndexData}
            keywords={gscKeywords}
            landingPages={gscLandingPages}
            countries={gscCountries}
            devices={gscDevices}
          />
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-4 sm:space-y-6 mt-0">
          <YTReport
            metrics={ytMetrics}
            videos={ytVideos}
            viewsSparkline={ytViewsSparkline}
            watchTimeSparkline={ytWatchTimeSparkline}
            sharesSparkline={ytSharesSparkline}
            likesSparkline={ytLikesSparkline}
          />
        </TabsContent>

        {/* LinkedIn Tab */}
        <TabsContent value="linkedin" className="space-y-4 sm:space-y-6 mt-0">
          <LIReport
            visitorMetrics={liVisitorMetrics}
            followerMetrics={liFollowerMetrics}
            contentMetrics={liContentMetrics}
            visitorDaily={liVisitorDaily}
            followerDaily={liFollowerDaily}
            impressionDaily={liImpressionDaily}
            industryDemographics={liIndustryDemographics}
            seniorityDemographics={liSeniorityDemographics}
            jobFunctionDemographics={liJobFunctionDemographics}
            companySizeDemographics={liCompanySizeDemographics}
            updates={liUpdates}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
