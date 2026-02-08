"use client"

import { useState, useEffect, useCallback } from "react"
import { subDays } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Shield, RefreshCw, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { useCompany } from "@/lib/company-context"
import type { Company } from "@/lib/types"

// Import the company grid component and portfolio KPI summary
import { CompanyGridView } from "@/components/dashboard/executive/company-grid-view"

interface SyncInfo {
  lastSyncAt: string | null
  companiesWithData: number
  totalCompanies: number
  queryTimeMs?: number
}

interface PortfolioData {
  companies: Company[]
  aggregateMetrics: {
    totalTraffic: number
    totalConversions: number
    avgConversionRate: number
    totalRevenue: number
    previousPeriod: {
      totalTraffic: number
      totalConversions: number
      avgConversionRate: number
      totalRevenue: number
    }
  }
  syncInfo?: SyncInfo
  cached?: boolean
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ExecutiveDashboard() {
  const { companies, isLoading: companiesLoading } = useCompany()
  // Fixed date range to last 30 days (no user selection)
  const dateRange = {
    from: subDays(new Date(), 30),
    to: new Date(),
  }
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Allow all users to access executive dashboard
  const hasExecutiveAccess = true

  // Load portfolio data from cache/normalized tables
  const loadCachedData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      })

      if (forceRefresh) {
        params.set('refresh', 'true')
      }

      const response = await fetch(`/api/analytics/portfolio?${params}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Executive Dashboard] Data load failed:', response.status, errorText)
        throw new Error(`Failed to fetch portfolio data: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Executive Dashboard] Portfolio data loaded:', {
        cached: data.cached,
        companiesCount: data.companies?.length,
        companiesWithData: data.companies?.filter((c: Company) => c.gaMetrics || c.gscMetrics).length || 0,
        queryTimeMs: data.syncInfo?.queryTimeMs,
        forceRefresh
      })
      setPortfolioData(data)
    } catch (err) {
      console.error('Portfolio data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Trigger a background sync then reload data
  const handleRefreshData = useCallback(async () => {
    setIsSyncing(true)
    try {
      // Trigger background sync
      await fetch('/api/admin/trigger-sync', { method: 'POST' })
      // Reload portfolio data (bypasses portfolio_cache)
      await loadCachedData(true)
    } finally {
      setIsSyncing(false)
    }
  }, [loadCachedData])

  // Load data on mount only
  useEffect(() => {
    if (companies && companies.length > 0 && !portfolioData) {
      console.log('[Executive Dashboard] Loading portfolio data...')
      loadCachedData()
    }
  }, [companies, portfolioData, loadCachedData])

  if (companiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show access denied screen if user doesn't have executive access
  if (!hasExecutiveAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You don&apos;t have permission to view the executive dashboard. 
              Only company owners and admins can access this feature.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">No Companies Found</h2>
            <p className="text-muted-foreground">You don&apos;t have access to any companies yet.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Portfolio Overview</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Last 30 days
              </span>
              <span>{companies.length} companies</span>
              {portfolioData && (() => {
                const actualDataCount = portfolioData.companies?.filter(
                  (c: Company) => c.gaMetrics || c.gscMetrics || c.ytMetrics || c.liVisitorMetrics
                ).length || 0
                return (
                  <>
                    <span>{actualDataCount} with data</span>
                    {portfolioData.syncInfo?.lastSyncAt && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Synced {formatTimeAgo(new Date(portfolioData.syncInfo.lastSyncAt))}
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isLoading || isSyncing}
            className="shrink-0"
          >
            {isLoading || isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? 'Syncing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty Data Banner */}
      {portfolioData && !isLoading && (() => {
        const hasAnyData = portfolioData.companies?.some(
          (c: Company) => c.gaMetrics || c.gscMetrics || c.ytMetrics || c.liVisitorMetrics
        )
        return !hasAnyData && portfolioData.companies?.length > 0 ? (
          <Alert>
            <AlertDescription>
              No analytics data synced yet. Click &apos;Refresh Data&apos; to start the initial sync.
            </AlertDescription>
          </Alert>
        ) : null
      })()}

      {/* Loading State - Simplified */}
      {isLoading && portfolioData && (
        <div className="flex items-center justify-center gap-2 p-8 bg-muted/50 rounded-lg border">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading portfolio overview...
          </span>
        </div>
      )}

      {/* Company Grid View */}
      <CompanyGridView 
        companies={portfolioData?.companies || companies}
        dateRange={dateRange}
        isLoading={!portfolioData}
      />
    </div>
  )
}