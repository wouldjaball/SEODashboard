"use client"

import * as React from "react"
import { subDays } from "date-fns"
import type { Company } from "@/lib/types"
import { companies as mockCompanies, defaultCompany } from "@/lib/mock-data/companies"

interface CompanyContextType {
  company: Company
  setCompany: (company: Company) => void
  companies: Company[]
  isLoading: boolean
  error: string | null
  refetchData: (companyId: string, dateRange: { from: Date; to: Date }) => Promise<void>
  comparisonEnabled: boolean
  setComparisonEnabled: (enabled: boolean) => void
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

// Empty company placeholder for loading state
const emptyCompany: Company = {
  id: '',
  name: 'Loading...',
  industry: '',
  color: '#888888',
  gaMetrics: null as any,
  gaWeeklyData: [],
  gaChannelData: [],
  gaTrafficShare: [],
  gaSourcePerformance: [],
  gaLandingPages: [],
  gaRegions: [],
  gaDevices: [],
  gaGender: [],
  gaAge: [],
  gscMetrics: null as any,
  gscWeeklyData: [],
  gscIndexData: [],
  gscKeywords: [],
  gscLandingPages: [],
  gscCountries: [],
  gscDevices: [],
  ytMetrics: null as any,
  ytVideos: [],
  ytViewsSparkline: [],
  ytWatchTimeSparkline: [],
  ytSharesSparkline: [],
  ytLikesSparkline: [],
  ytError: undefined,
  liVisitorMetrics: null as any,
  liFollowerMetrics: null as any,
  liContentMetrics: null as any,
  liVisitorDaily: [],
  liFollowerDaily: [],
  liImpressionDaily: [],
  liIndustryDemographics: [],
  liSeniorityDemographics: [],
  liJobFunctionDemographics: [],
  liCompanySizeDemographics: [],
  liUpdates: [],
  // Enhanced LinkedIn metrics
  liVideoMetrics: undefined,
  liEmployeeAdvocacyMetrics: undefined,
  liContentBreakdown: undefined,
  liSocialListening: undefined,
  liVideoDaily: []
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const useRealData = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true'

  // Always use empty placeholder initially - only real data will be shown
  const [company, setCompanyState] = React.useState<Company>(emptyCompany)
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [isLoading, setIsLoading] = React.useState(useRealData) // Start loading if using real data
  const [error, setError] = React.useState<string | null>(null)
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false)

  // Helper function to fetch analytics data for a specific company
  async function fetchAnalyticsForCompany(companyId: string, dateRange: { from: Date; to: Date }) {
    console.log('[CompanyContext] fetchAnalyticsForCompany called with:', { companyId, dateRange })

    if (!companyId || !companyId.includes('-') || companyId.length < 20) {
      console.log('[CompanyContext] Skipping - invalid companyId:', companyId)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      })

      console.log('[CompanyContext] Fetching from:', `/api/analytics/${companyId}?${params}`)
      const response = await fetch(`/api/analytics/${companyId}?${params}`)

      const data = await response.json()

      console.log('[CompanyContext] API response status:', response.status)
      console.log('[CompanyContext] API response data:', data)

      if (!response.ok) {
        if (response.status === 404) {
          setError(data.message || 'No analytics accounts mapped to this company')
        } else {
          setError('Failed to load analytics data')
        }
        return
      }

      // Update company with real data
      setCompanyState(prev => ({
        ...prev,
        gaMetrics: data.gaMetrics || null,
        gaWeeklyData: data.gaWeeklyData || [],
        gaChannelData: data.gaChannelData || [],
        gaTrafficShare: data.gaTrafficShare || [],
        gaSourcePerformance: data.gaSourcePerformance || [],
        gaLandingPages: data.gaLandingPages || [],
        gaRegions: data.gaRegions || [],
        gaDevices: data.gaDevices || [],
        gaGender: data.gaGender || [],
        gaAge: data.gaAge || [],
        gscMetrics: data.gscMetrics || null,
        gscWeeklyData: data.gscWeeklyData || [],
        gscKeywords: data.gscKeywords || [],
        gscCountries: data.gscCountries || [],
        gscDevices: data.gscDevices || [],
        gscIndexData: data.gscIndexData || [],
        gscLandingPages: data.gscLandingPages || [],
        ytMetrics: data.ytMetrics || null,
        ytVideos: data.ytVideos || [],
        ytViewsSparkline: data.ytViewsSparkline || [],
        ytWatchTimeSparkline: data.ytWatchTimeSparkline || [],
        ytSharesSparkline: data.ytSharesSparkline || [],
        ytLikesSparkline: data.ytLikesSparkline || [],
        ytError: data.ytError || undefined,
        ytIsPublicDataOnly: data.ytIsPublicDataOnly || false,
        // Error states for each service
        gaError: data.gaError || undefined,
        gaErrorType: data.gaErrorType || undefined,
        gscError: data.gscError || undefined,
        gscErrorType: data.gscErrorType || undefined,
        liError: data.liError || undefined,
        liErrorType: data.liErrorType || undefined,
        liDataSource: data.liDataSource || undefined,
        // LinkedIn core metrics
        liVisitorMetrics: data.liVisitorMetrics || null,
        liFollowerMetrics: data.liFollowerMetrics || null,
        liContentMetrics: data.liContentMetrics || null,
        liVisitorDaily: data.liVisitorDaily || [],
        liFollowerDaily: data.liFollowerDaily || [],
        liImpressionDaily: data.liImpressionDaily || [],
        liIndustryDemographics: data.liIndustryDemographics || [],
        liSeniorityDemographics: data.liSeniorityDemographics || [],
        liJobFunctionDemographics: data.liJobFunctionDemographics || [],
        liCompanySizeDemographics: data.liCompanySizeDemographics || [],
        liUpdates: data.liUpdates || [],
        
        // LinkedIn enhanced metrics (new)
        liVideoMetrics: data.liVideoMetrics || undefined,
        liEmployeeAdvocacyMetrics: data.liEmployeeAdvocacyMetrics || undefined,
        liContentBreakdown: data.liContentBreakdown || undefined,
        liSocialListening: data.liSocialListening || undefined,
        liVideoDaily: data.liVideoDaily || []
      }))
    } catch (err) {
      console.error('[CompanyContext] Failed to fetch analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    // Always fetch real companies - no mock data mode
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    try {
      setIsLoading(true)
      setError(null)
      console.log('[CompanyContext] Fetching companies from /api/companies')
      const response = await fetch('/api/companies')

      console.log('[CompanyContext] Response status:', response.status)
      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.status}`)
      }

      const data = await response.json()
      console.log('[CompanyContext] Received data:', data)

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.companies && data.companies.length > 0) {
        console.log('[CompanyContext] Loading', data.companies.length, 'companies from database')
        // Convert database companies to Company type without mock data
        const companiesWithData = data.companies.map((c: any) => ({
          id: c.id,
          name: c.name,
          industry: c.industry,
          color: c.color,
          logo: c.logo_url,
          role: c.role,
          // No data initially - will be loaded on demand
          gaMetrics: null,
          gaWeeklyData: [],
          gaChannelData: [],
          gaTrafficShare: [],
          gaSourcePerformance: [],
          gaLandingPages: [],
          gaRegions: [],
          gaDevices: [],
          gaGender: [],
          gaAge: [],
          gscMetrics: null,
          gscWeeklyData: [],
          gscIndexData: [],
          gscKeywords: [],
          gscLandingPages: [],
          gscCountries: [],
          gscDevices: [],
          ytMetrics: null,
          ytVideos: [],
          ytViewsSparkline: [],
          ytWatchTimeSparkline: [],
          ytSharesSparkline: [],
          ytLikesSparkline: [],
          ytError: undefined,
          liVisitorMetrics: null,
          liFollowerMetrics: null,
          liContentMetrics: null,
          liVisitorDaily: [],
          liFollowerDaily: [],
          liImpressionDaily: [],
          liIndustryDemographics: [],
          liSeniorityDemographics: [],
          liJobFunctionDemographics: [],
          liCompanySizeDemographics: [],
          liUpdates: []
        }))

        setCompanies(companiesWithData)
        setCompanyState(companiesWithData[0])
        setError(null)

        // Auto-fetch analytics for the first company immediately
        const firstCompany = companiesWithData[0]
        if (firstCompany.id && firstCompany.id.includes('-') && firstCompany.id.length > 20) {
          console.log('[CompanyContext] Auto-fetching analytics for first company:', firstCompany.id)
          const defaultDateRange = {
            from: subDays(new Date(), 30),
            to: new Date()
          }
          // Fetch analytics immediately (don't await to avoid blocking)
          fetchAnalyticsForCompany(firstCompany.id, defaultDateRange)
        }
      } else {
        // No companies found - show error instead of mock data
        console.log('[CompanyContext] No companies found in database')
        setCompanies([])
        setCompanyState(emptyCompany)
        setError('No companies available. Please contact support.')
      }
    } catch (err) {
      console.error('[CompanyContext] Failed to fetch companies:', err)
      setError('Failed to load companies. Please sign in or contact support.')
      // Show empty state instead of mock data
      console.log('[CompanyContext] Setting empty state due to error')
      setCompanies([])
      setCompanyState(emptyCompany)
    } finally {
      setIsLoading(false)
    }
  }

  async function refetchData(companyId: string, dateRange: { from: Date; to: Date }) {
    console.log('[CompanyContext] refetchData called with:', { companyId, dateRange })

    // Always fetch real data - no mock data fallback
    await fetchAnalyticsForCompany(companyId, dateRange)
  }

  const setCompany = (newCompany: Company) => {
    setCompanyState(newCompany)
  }

  return (
    <CompanyContext.Provider
      value={{
        company,
        setCompany,
        companies,
        isLoading,
        error,
        refetchData,
        comparisonEnabled,
        setComparisonEnabled
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = React.useContext(CompanyContext)
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
