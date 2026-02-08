"use client"

import { ArrowLeft, Loader2, Building2, Shield } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { subDays, format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/dashboard/shared"
import { useCompany } from "@/lib/company-context"
import { createClient } from "@/lib/supabase/client"
import { LIReport } from "@/components/dashboard/linkedin/li-report"
import { LinkedInNativeDashboard } from "@/components/dashboard/linkedin/linkedin-native-dashboard"

export default function LinkedInAnalyticsPage() {
  const { company, isLoading } = useCompany()
  const [user, setUser] = useState<any>(null)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const checkAccess = useCallback(async () => {
    if (!user || !company) return
    try {
      const response = await fetch(`/api/companies/${company.id}/access-check`)
      const result = await response.json()
      setHasAccess(['owner', 'admin', 'viewer'].includes(result.role))
    } catch {
      setHasAccess(false)
    }
  }, [user, company])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  if (isLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You don&apos;t have access to this company dashboard.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/executive">Return to Executive Overview</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">No Company Selected</h2>
            <p className="text-muted-foreground">Please select a company to view LinkedIn analytics.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/dashboard/executive/owner">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Back to Dashboard</span>
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {company.name} — LinkedIn Analytics
          </h1>
          <p className="text-muted-foreground">
            {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="shrink-0">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            showComparison={false}
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <LinkedInNativeDashboard
        followerMetrics={company.liFollowerMetrics}
        contentMetrics={company.liContentMetrics}
        visitorMetrics={company.liVisitorMetrics}
        dateRange={dateRange}
        hideFullLink
      />

      {/* Full LinkedIn Report */}
      <LIReport
        visitorMetrics={company.liVisitorMetrics}
        followerMetrics={company.liFollowerMetrics}
        contentMetrics={company.liContentMetrics}
        visitorDaily={company.liVisitorDaily || []}
        followerDaily={company.liFollowerDaily || []}
        impressionDaily={company.liImpressionDaily || []}
        industryDemographics={company.liIndustryDemographics || []}
        seniorityDemographics={company.liSeniorityDemographics || []}
        jobFunctionDemographics={company.liJobFunctionDemographics || []}
        companySizeDemographics={company.liCompanySizeDemographics || []}
        updates={company.liUpdates || []}
        error={company.liError}
        errorType={company.liErrorType}
        dataSource={company.liDataSource}
        dateRange={dateRange}
      />
    </div>
  )
}
