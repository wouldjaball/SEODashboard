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
import { useCompany } from "@/lib/company-context"

export default function DashboardPage() {
  const { company } = useCompany()
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
            {company.industry} • Multi-source analytics overview
          </p>
        </div>
        <div className="shrink-0">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="google-analytics" className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-4 h-auto p-1 gap-0.5 sm:gap-1">
          <TabsTrigger
            value="google-analytics"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="truncate leading-tight">Analytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="search-console"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate leading-tight">Search</span>
          </TabsTrigger>
          <TabsTrigger
            value="youtube"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <Youtube className="h-4 w-4 shrink-0" />
            <span className="truncate leading-tight">YouTube</span>
          </TabsTrigger>
          <TabsTrigger
            value="linkedin"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2 text-[10px] sm:text-sm min-h-[52px] sm:min-h-[40px]"
          >
            <Linkedin className="h-4 w-4 shrink-0" />
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
