"use client"

import { VisitorAnalytics } from "./visitor-analytics"
import { VisitorDemographics } from "./visitor-demographics"
import { FollowerAnalytics } from "./follower-analytics"
import { ContentAnalytics } from "./content-analytics"
import { UpdatesTable } from "./updates-table"
import { Separator } from "@/components/ui/separator"
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LIVisitorDaily,
  LIDemographic,
  LIUpdate,
  LIFollowerDaily,
  LIImpressionDaily,
} from "@/lib/types"

interface LIReportProps {
  visitorMetrics: LIVisitorMetrics
  followerMetrics: LIFollowerMetrics
  contentMetrics: LIContentMetrics
  visitorDaily: LIVisitorDaily[]
  followerDaily: LIFollowerDaily[]
  impressionDaily: LIImpressionDaily[]
  industryDemographics: LIDemographic[]
  seniorityDemographics: LIDemographic[]
  jobFunctionDemographics: LIDemographic[]
  companySizeDemographics: LIDemographic[]
  updates: LIUpdate[]
}

export function LIReport({
  visitorMetrics,
  followerMetrics,
  contentMetrics,
  visitorDaily,
  followerDaily,
  impressionDaily,
  industryDemographics,
  seniorityDemographics,
  jobFunctionDemographics,
  companySizeDemographics,
  updates,
}: LIReportProps) {
  return (
    <div className="space-y-8">
      {/* Visitor Analytics */}
      <VisitorAnalytics metrics={visitorMetrics} dailyData={visitorDaily} />

      {/* Visitor Demographics */}
      <VisitorDemographics
        industry={industryDemographics}
        seniority={seniorityDemographics}
        jobFunction={jobFunctionDemographics}
        companySize={companySizeDemographics}
      />

      <Separator />

      {/* Follower Analytics */}
      <FollowerAnalytics metrics={followerMetrics} dailyData={followerDaily} />

      <Separator />

      {/* Content Analytics */}
      <ContentAnalytics metrics={contentMetrics} dailyData={impressionDaily} />

      <Separator />

      {/* Updates Table */}
      <UpdatesTable data={updates} />
    </div>
  )
}
