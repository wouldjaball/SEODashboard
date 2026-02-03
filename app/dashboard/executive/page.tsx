"use client"

import { useState, useEffect, useCallback } from "react"
import { subDays } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Shield } from "lucide-react"
import Link from "next/link"
import { DateRangePicker } from "@/components/dashboard/shared"
import { useCompany } from "@/lib/company-context"
import type { Company } from "@/lib/types"

// Import the company grid component
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
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Allow all users to access executive dashboard
  const hasExecutiveAccess = true

  const fetchPortfolioData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      })

      const response = await fetch(`/api/analytics/portfolio?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data')
      }

      const data = await response.json()
      setPortfolioData(data)
    } catch (err) {
      console.error('Portfolio data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  // Fetch portfolio data when date range changes
  useEffect(() => {
    if (companies && companies.length > 0) {
      fetchPortfolioData()
    }
  }, [dateRange, companies, fetchPortfolioData])

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
      {/* Header with Date Range */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground truncate">
            Portfolio overview • {companies.length} companies
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
      {isLoading && (
        <div className="flex items-center justify-center gap-2 p-8 bg-muted/50 rounded-lg border">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">
            {portfolioData ? "Refreshing portfolio data..." : "Loading portfolio data..."}
          </span>
        </div>
      )}

      {/* First time loading message */}
      {!isLoading && !portfolioData && companies.length > 0 && !error && (
        <div className="flex items-center justify-center gap-2 p-8 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-center">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Welcome to your Executive Dashboard
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Analytics data for your {companies.length} companies is being loaded. This may take a moment.
            </p>
          </div>
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