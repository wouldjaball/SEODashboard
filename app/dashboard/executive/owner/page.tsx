"use client"

import { useState, useEffect, useCallback } from "react"
import { subDays, format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Building2, Shield, TrendingUp, TrendingDown, Eye, MousePointer, Search, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DateRangePicker } from "@/components/dashboard/shared"
import { useCompany } from "@/lib/company-context"
import { createClient } from "@/lib/supabase/client"

// Import components for the executive dashboard
import { OwnerKPICards } from "@/components/dashboard/executive/owner/owner-kpi-cards"
import { BusinessGrowthMetrics } from "@/components/dashboard/executive/owner/business-growth-metrics"
import { ContentPerformanceAnalysis } from "@/components/dashboard/executive/owner/content-performance-analysis"
import { AudienceIntelligence } from "@/components/dashboard/executive/owner/audience-intelligence"
import { SearchPerformanceTracking } from "@/components/dashboard/executive/owner/search-performance-tracking"
import { ChannelAnalysisVisualization } from "@/components/dashboard/executive/owner/channel-analysis-visualization"

interface OwnerDashboardData {
  // Core KPIs
  totalUsers: number
  totalSessions: number
  totalPageViews: number
  keyEvents: number
  conversionRate: number
  
  // Search metrics
  totalImpressions: number
  totalClicks: number
  avgPosition: number
  rankingKeywords: number
  indexedPages: number
  
  // Growth data
  periodComparison: {
    usersGrowth: number
    sessionsGrowth: number
    impressionsGrowth: number
    clicksGrowth: number
  }
  
  // Real-time data
  realtime: {
    activeUsers: number
    topPages: Array<{ pagePath: string; activeUsers: number }>
    topReferrers: Array<{ source: string; activeUsers: number }>
  }
  
  // Detailed analytics
  analytics: any
  isLoading: boolean
  error: string | null
  lastUpdated: string
}

export default function OwnerExecutiveDashboard() {
  const { company, isLoading } = useCompany()
  const [user, setUser] = useState<any>(null)
  
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  
  const [dashboardData, setDashboardData] = useState<OwnerDashboardData | null>(null)
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOwnerAccess, setHasOwnerAccess] = useState<boolean | null>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Check if user has access to current company (all users allowed)
  const checkOwnerAccess = useCallback(async () => {
    if (!user || !company) return

    try {
      const response = await fetch(`/api/companies/${company.id}/access-check`)
      const result = await response.json()
      
      // Allow all users to access the dashboard (owner, admin, viewer)
      setHasOwnerAccess(['owner', 'admin', 'viewer'].includes(result.role))
    } catch (err) {
      console.error('Failed to check access:', err)
      setHasOwnerAccess(false)
    }
  }, [user, company])

  // Fetch comprehensive analytics data
  const fetchDashboardData = useCallback(async () => {
    if (!company) return

    try {
      setIsDashboardLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
      })

      // Fetch both regular analytics and real-time data
      const [analyticsResponse, realtimeResponse] = await Promise.all([
        fetch(`/api/analytics/${company.id}?${params}`),
        fetch(`/api/analytics/${company.id}/realtime`)
      ])

      if (!analyticsResponse.ok) {
        throw new Error(`Failed to fetch analytics data: ${analyticsResponse.status}`)
      }

      const analytics = await analyticsResponse.json()
      
      // Real-time data is optional
      let realtime = { activeUsers: 0, topPages: [], topReferrers: [] }
      if (realtimeResponse.ok) {
        realtime = await realtimeResponse.json()
      }

      // Calculate aggregated metrics from analytics data
      const gaMetrics = analytics.gaMetrics || {}
      const gscMetrics = analytics.gscMetrics || {}
      
      const dashboardData: OwnerDashboardData = {
        totalUsers: gaMetrics.totalUsers || 0,
        totalSessions: gaMetrics.sessions || 0,
        totalPageViews: gaMetrics.views || 0,
        keyEvents: gaMetrics.keyEvents || 0,
        conversionRate: gaMetrics.sessions > 0 ? (gaMetrics.keyEvents / gaMetrics.sessions) : 0,
        
        totalImpressions: gscMetrics.impressions || 0,
        totalClicks: gscMetrics.clicks || 0,
        avgPosition: gscMetrics.avgPosition || 0,
        rankingKeywords: gscMetrics.rankingKeywords || analytics.totalKeywords || 0,
        indexedPages: gscMetrics.indexedPages || analytics.totalIndexedPages || 0,
        
        periodComparison: {
          usersGrowth: gaMetrics.previousPeriod ? 
            calculateGrowth(gaMetrics.totalUsers, gaMetrics.previousPeriod.totalUsers) : 0,
          sessionsGrowth: gaMetrics.previousPeriod ?
            calculateGrowth(gaMetrics.sessions, gaMetrics.previousPeriod.sessions) : 0,
          impressionsGrowth: gscMetrics.previousPeriod ?
            calculateGrowth(gscMetrics.impressions, gscMetrics.previousPeriod.impressions) : 0,
          clicksGrowth: gscMetrics.previousPeriod ?
            calculateGrowth(gscMetrics.clicks, gscMetrics.previousPeriod.clicks) : 0,
        },
        
        realtime,
        analytics,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      }

      setDashboardData(dashboardData)
    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setIsDashboardLoading(false)
    }
  }, [company, dateRange])

  // Calculate growth percentage
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // Check access on mount and when company changes
  useEffect(() => {
    checkOwnerAccess()
  }, [checkOwnerAccess])

  // Fetch data when date range or company changes
  useEffect(() => {
    if (hasOwnerAccess && company) {
      fetchDashboardData()
    }
  }, [hasOwnerAccess, company, fetchDashboardData])

  if (isLoading || hasOwnerAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show access denied if no access
  if (hasOwnerAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You don't have access to this company dashboard. 
              Please contact your administrator if you believe you should have access.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/executive">
              Return to Executive Overview
            </Link>
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
            <p className="text-muted-foreground">Please select a company to view the executive dashboard.</p>
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/executive">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Back to Portfolio</span>
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Executive Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground ml-11 sm:ml-0">
            {company.name} • Company View • {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
            {dashboardData?.lastUpdated && (
              <span className="ml-2">
                • Last updated: {format(new Date(dashboardData.lastUpdated), 'MMM d, h:mm a')}
              </span>
            )}
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

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isDashboardLoading && (
        <div className="flex items-center justify-center gap-2 p-8 bg-muted/50 rounded-lg border">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading executive dashboard data...
          </span>
        </div>
      )}

      {dashboardData && !isDashboardLoading && (
        <>
          {/* KPI Cards */}
          <OwnerKPICards 
            data={dashboardData} 
            key={`kpi-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`}
          />
          
          {/* Business Growth Metrics */}
          <BusinessGrowthMetrics 
            data={dashboardData} 
            dateRange={dateRange}
            key={`growth-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`}
          />
          
          {/* Content Performance Analysis */}
          <ContentPerformanceAnalysis 
            analytics={dashboardData.analytics}
            dateRange={dateRange}
            key={`content-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`}
          />
          
          {/* Audience Intelligence */}
          <AudienceIntelligence 
            analytics={dashboardData.analytics}
            realtime={dashboardData.realtime}
            key={`audience-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`}
          />
          
          {/* Search Performance Tracking */}
          <SearchPerformanceTracking 
            analytics={dashboardData.analytics}
            dateRange={dateRange}
            key={`search-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`}
          />
          
          {/* Channel Analysis */}
          <ChannelAnalysisVisualization 
            analytics={dashboardData.analytics}
            dateRange={dateRange}
            key={`channel-${dateRange.from.toISOString()}-${dateRange.to.toISOString()}`}
          />
        </>
      )}
    </div>
  )
}