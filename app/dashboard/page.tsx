"use client"

import { useState } from "react"
import { subDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/dashboard/shared"
import { GAReport } from "@/components/dashboard/google-analytics"
import { GSCReport } from "@/components/dashboard/search-console"
import { YTReport } from "@/components/dashboard/youtube"
import { LIReport } from "@/components/dashboard/linkedin"

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
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Multi-source analytics overview for Vestige Digital
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="google-analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="google-analytics">Google Analytics</TabsTrigger>
          <TabsTrigger value="search-console">Search Console</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>

        {/* Google Analytics Tab */}
        <TabsContent value="google-analytics" className="space-y-6">
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
        <TabsContent value="search-console" className="space-y-6">
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
        <TabsContent value="youtube" className="space-y-6">
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
        <TabsContent value="linkedin" className="space-y-6">
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
