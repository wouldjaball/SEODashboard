"use client"

import { useState, useEffect, useCallback } from "react"
import { subDays } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Shield, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useCompany } from "@/lib/company-context"
import type { Company } from "@/lib/types"

// Import the company grid component and portfolio KPI summary
import { CompanyGridView } from "@/components/dashboard/executive/company-grid-view"

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
  const [error, setError] = useState<string | null>(null)

  // Allow all users to access executive dashboard
  const hasExecutiveAccess = true

  // Load cached data with option to force refresh
  const loadCachedData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      setError(null)

      // Fixed to last 30 days
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      })
      
      // Add refresh parameter if forcing refresh
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
      {/* Header - Clean and Simple */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Portfolio Overview</h1>
            <p className="text-sm text-muted-foreground">
              {companies.length} companies • Last 30 Days
              {portfolioData && (
                <span className="ml-2">
                  • {portfolioData.companies?.filter((c: Company) => c.gaMetrics || c.gscMetrics).length || 0} with data
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCachedData(true)}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State - Simplified */}
      {isLoading && (
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
        isLoading={isLoading}
      />
    </div>
  )
}