"use client"

import { VisitorAnalytics } from "./visitor-analytics"
import { VisitorDemographics } from "./visitor-demographics"
import { FollowerAnalytics } from "./follower-analytics"
import { ContentAnalytics } from "./content-analytics"
import { UpdatesTable } from "./updates-table"
import { EnhancedLinkedInAnalytics } from "./enhanced-linkedin-analytics"
import { LinkedInNativeDashboard } from "./linkedin-native-dashboard"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Linkedin, RefreshCw, Settings, Edit3, Database } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { LinkedInDataEditor } from "./linkedin-data-editor"
import { LinkedInDebugInfo } from "@/components/debug/linkedin-debug"
import { useCompany } from "@/lib/company-context"
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LISearchAppearanceMetrics,
  LIVisitorDaily,
  LIDemographic,
  LIUpdate,
  LIFollowerDaily,
  LIImpressionDaily,
  LIVideoMetrics,
  LIEmployeeAdvocacyMetrics,
  LIContentBreakdown,
  LISocialListeningMention,
} from "@/lib/types"

interface LIReportProps {
  visitorMetrics: LIVisitorMetrics | null
  followerMetrics: LIFollowerMetrics | null
  contentMetrics: LIContentMetrics | null
  searchAppearanceMetrics?: LISearchAppearanceMetrics | null
  visitorDaily: LIVisitorDaily[]
  followerDaily: LIFollowerDaily[]
  impressionDaily: LIImpressionDaily[]
  industryDemographics: LIDemographic[]
  seniorityDemographics: LIDemographic[]
  jobFunctionDemographics: LIDemographic[]
  companySizeDemographics: LIDemographic[]
  updates: LIUpdate[]
  error?: string
  errorType?: 'auth_required' | 'scope_missing' | 'api_error'
  dataSource?: 'api' | 'sheets' | 'mock' | 'none' | 'manual'
  dateRange?: { from: Date; to: Date }
  // Enhanced LinkedIn metrics
  videoMetrics?: LIVideoMetrics
  employeeAdvocacyMetrics?: LIEmployeeAdvocacyMetrics
  contentBreakdown?: LIContentBreakdown
  socialListening?: LISocialListeningMention[]
}

export function LIReport({
  visitorMetrics,
  followerMetrics,
  contentMetrics,
  searchAppearanceMetrics,
  visitorDaily,
  followerDaily,
  impressionDaily,
  industryDemographics,
  seniorityDemographics,
  jobFunctionDemographics,
  companySizeDemographics,
  updates,
  error,
  errorType,
  dataSource,
  dateRange,
  videoMetrics,
  employeeAdvocacyMetrics,
  contentBreakdown,
  socialListening,
}: LIReportProps) {
  const { company } = useCompany()
  const [showDataEditor, setShowDataEditor] = useState(false)
  
  const handleSaveManualData = async (manualData: any) => {
    if (!dateRange) return
    
    try {
      const response = await fetch('/api/linkedin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          dateRangeStart: dateRange.from.toISOString().split('T')[0],
          dateRangeEnd: dateRange.to.toISOString().split('T')[0],
          data: manualData
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save data')
      }
      
      // Trigger data refresh - you might want to emit an event or call a refresh function
      alert('LinkedIn data saved successfully! Refreshing dashboard...')
      window.location.reload()
    } catch (error) {
      console.error('Failed to save manual LinkedIn data:', error)
      throw error
    }
  }
  // Show error state if there's an error
  if (error) {
    const getErrorMessage = () => {
      if (dataSource === 'none') {
        return 'No LinkedIn data configured for this company. Please set up LinkedIn integration in the Integrations page.'
      }
      
      switch (errorType) {
        case 'auth_required':
          if (error?.includes('refresh token is invalid') || error?.includes('Please reconnect')) {
            return 'LinkedIn authorization has expired. Your LinkedIn connection needs to be refreshed. Please go to the Integrations page and reconnect your LinkedIn account to restore data access.'
          }
          return 'LinkedIn connection expired. Please reconnect your account in the Integrations page.'
        case 'scope_missing':
          return 'LinkedIn permissions missing. Please reconnect your account with full LinkedIn access.'
        case 'api_error':
          return `LinkedIn API error: ${error}`
        default:
          return `LinkedIn error: ${error}`
      }
    }

    const getErrorIcon = () => {
      switch (errorType) {
        case 'auth_required':
        case 'scope_missing':
          return <Settings className="h-4 w-4" />
        default:
          return <AlertTriangle className="h-4 w-4" />
      }
    }
    
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          {getErrorIcon()}
          <AlertDescription>
            {getErrorMessage()}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

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
            <Button 
              onClick={() => setShowDataEditor(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Add Manual Data
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Debug Info - Remove after fixing */}
      <LinkedInDebugInfo />
      
      {/* LinkedIn Data Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Data Source: {dataSource === 'manual' ? 'Manual Entry' : dataSource === 'api' ? 'LinkedIn API' : dataSource || 'Unknown'}
            </span>
          </div>
        </div>
        <Button
          onClick={() => setShowDataEditor(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Edit Data
        </Button>
      </div>

      {/* LinkedIn Native Dashboard - NEW */}
      <LinkedInNativeDashboard
        searchAppearanceMetrics={searchAppearanceMetrics}
        followerMetrics={followerMetrics}
        contentMetrics={contentMetrics}
        visitorMetrics={visitorMetrics}
      />

      <Separator />

      {/* Content Performance - TOP PRIORITY */}
      {contentMetrics && (
        <ContentAnalytics metrics={contentMetrics} dailyData={impressionDaily} />
      )}

      {contentMetrics && visitorMetrics && <Separator />}

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

      {/* Enhanced LinkedIn Analytics - only shows if data exists */}
      <EnhancedLinkedInAnalytics
        videoMetrics={videoMetrics}
        employeeAdvocacyMetrics={employeeAdvocacyMetrics}
        contentBreakdown={contentBreakdown}
        socialListening={socialListening}
      />

      {contentMetrics && updates.length > 0 && <Separator />}

      {/* Updates Table */}
      {updates.length > 0 && <UpdatesTable data={updates} />}
      
      {/* Data Editor Dialog */}
      {dateRange && (
        <LinkedInDataEditor
          open={showDataEditor}
          onOpenChange={setShowDataEditor}
          companyId={company.id}
          companyName={company.name}
          dateRange={dateRange}
          currentData={{
            visitorMetrics: visitorMetrics || undefined,
            followerMetrics: followerMetrics || undefined,
            contentMetrics: contentMetrics || undefined,
            visitorDaily,
            followerDaily,
            impressionDaily,
            industryDemographics,
            seniorityDemographics,
            jobFunctionDemographics,
            companySizeDemographics,
            updates
          }}
          onSave={handleSaveManualData}
        />
      )}
    </div>
  )
}
