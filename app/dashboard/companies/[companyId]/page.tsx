"use client"

import { useState, useEffect } from "react"
import { subDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DateRangePicker } from "@/components/dashboard/shared"
import { GAReport } from "@/components/dashboard/google-analytics"
import { GSCReport } from "@/components/dashboard/search-console"
import { YTReport } from "@/components/dashboard/youtube"
import { LIReport } from "@/components/dashboard/linkedin"
import { TrendingTopics } from "@/components/dashboard/trending-topics"
import {
  GoogleAnalyticsIcon,
  SearchConsoleIcon,
  YouTubeIcon,
  LinkedInIcon,
} from "@/components/icons"
import { useCompany } from "@/lib/company-context"

interface CompanyDetailPageProps {
  params: {
    companyId: string
  }
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { companies, isLoading, error, refetchData, comparisonEnabled, setComparisonEnabled, findCompanyById } = useCompany()
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("google-analytics")

  // Find the specific company from the companies array with better error handling
  const company = findCompanyById(params.companyId)
  
  // Debug logging with more context
  console.log('[Company Detail] Looking for companyId:', params.companyId)
  console.log('[Company Detail] Available companies:', companies.map(c => ({ id: c.id, name: c.name })))
  console.log('[Company Detail] Found company:', company ? company.name : 'Not found')
  console.log('[Company Detail] Companies loading state:', isLoading)
  console.log('[Company Detail] Total companies:', companies.length)

  // Fetch data when date range changes or when company is available
  useEffect(() => {
    if (company?.id) {
      console.log('[Company Detail] Triggering refetchData for company:', company.id)
      refetchData(company.id, dateRange)
    } else if (companies.length > 0 && !company && !isLoading) {
      // If companies are loaded but we don't have this specific one, it's a genuine not found
      console.warn('[Company Detail] Company not found after companies loaded')
    }
  }, [dateRange, company?.id, refetchData, companies.length, isLoading])

  // Additional effect to handle portfolio to individual navigation
  useEffect(() => {
    // If we have companies but no specific company match, and we're not loading,
    // wait a bit more for potential context updates from portfolio navigation
    if (companies.length > 0 && !company && !isLoading) {
      console.log('[Company Detail] Waiting for portfolio context to sync...')
    }
  }, [companies.length, company, isLoading, params.companyId])

  // Show loading while companies are loading
  if (isLoading && !companies.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show not found if company doesn't exist, but only after we've tried loading
  if (!company && !isLoading && companies.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/executive">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portfolio
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Company not found or you don't have access to it. This may be a cached company that's no longer available.
            <br />
            <span className="font-medium">Requested ID:</span> {params.companyId}
            <br />
            <span className="font-medium">Available companies:</span> {companies.length}
            <br />
            Please try refreshing the executive dashboard or contact support if this issue persists.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/dashboard/executive">
              Return to Executive Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Ensure company exists before rendering
  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/executive">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portfolio
          </Link>
        </Button>
      </div>

      {/* Header with Date Range */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{company?.name || 'Company'} Analytics</h1>
          <p className="text-sm text-muted-foreground truncate">
            {company?.industry || 'Loading...'} • Detailed analytics overview
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

      {/* Trending Topics - Disabled until real data source is implemented */}
      {/* <TrendingTopics companyId={company.id} companyName={company.name} /> */}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {/* Loading overlay for data refresh */}
        {isLoading && company.gaMetrics && (
          <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading analytics data...</span>
          </div>
        )}

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
            dateRange={dateRange}
            error={company.gaError}
            errorType={company.gaErrorType}
            companyId={company.id}
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
            error={company.ytError}
            isPublicDataOnly={company.ytIsPublicDataOnly}
            dateRange={dateRange}
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
            error={company.liError}
            errorType={company.liErrorType}
            dataSource={company.liDataSource}
            dateRange={dateRange}
            videoMetrics={company.liVideoMetrics}
            employeeAdvocacyMetrics={company.liEmployeeAdvocacyMetrics}
            contentBreakdown={company.liContentBreakdown}
            socialListening={company.liSocialListening}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}