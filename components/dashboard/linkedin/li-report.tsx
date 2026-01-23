"use client"

import { VisitorAnalytics } from "./visitor-analytics"
import { VisitorDemographics } from "./visitor-demographics"
import { FollowerAnalytics } from "./follower-analytics"
import { ContentAnalytics } from "./content-analytics"
import { UpdatesTable } from "./updates-table"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Linkedin, Settings } from "lucide-react"
import Link from "next/link"
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
  visitorMetrics: LIVisitorMetrics | null
  followerMetrics: LIFollowerMetrics | null
  contentMetrics: LIContentMetrics | null
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
  // Show setup message if no LinkedIn data is available
  if (!visitorMetrics && !followerMetrics && !contentMetrics) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <Linkedin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>LinkedIn Analytics Not Connected</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            LinkedIn analytics is not currently set up for this account. Connect your LinkedIn company page to view visitor insights, follower growth, and content performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/integrations">
                <Settings className="h-4 w-4 mr-2" />
                Set Up Integration
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            LinkedIn integration requires connecting your LinkedIn account with company page admin access.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Visitor Analytics */}
      {visitorMetrics && (
        <VisitorAnalytics metrics={visitorMetrics} dailyData={visitorDaily} />
      )}

      {/* Visitor Demographics */}
      {(industryDemographics.length > 0 || seniorityDemographics.length > 0) && (
        <VisitorDemographics
          industry={industryDemographics}
          seniority={seniorityDemographics}
          jobFunction={jobFunctionDemographics}
          companySize={companySizeDemographics}
        />
      )}

      {visitorMetrics && followerMetrics && <Separator />}

      {/* Follower Analytics */}
      {followerMetrics && (
        <FollowerAnalytics metrics={followerMetrics} dailyData={followerDaily} />
      )}

      {followerMetrics && contentMetrics && <Separator />}

      {/* Content Analytics */}
      {contentMetrics && (
        <ContentAnalytics metrics={contentMetrics} dailyData={impressionDaily} />
      )}

      {contentMetrics && updates.length > 0 && <Separator />}

      {/* Updates Table */}
      {updates.length > 0 && <UpdatesTable data={updates} />}
    </div>
  )
}
