"use client"

import * as React from "react"
import type { Company } from "@/lib/types"
import { companies as mockCompanies, defaultCompany } from "@/lib/mock-data/companies"

interface CompanyContextType {
  company: Company
  setCompany: (company: Company) => void
  companies: Company[]
  isLoading: boolean
  error: string | null
  refetchData: (dateRange: { from: Date; to: Date }) => Promise<void>
  comparisonEnabled: boolean
  setComparisonEnabled: (enabled: boolean) => void
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = React.useState<Company>(defaultCompany)
  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false)

  const useRealData = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true'

  React.useEffect(() => {
    if (useRealData) {
      fetchCompanies()
    }
  }, [useRealData])

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
      } else {
        // No companies found - use mock data as fallback
        console.log('[CompanyContext] No companies found in database, using mock data')
        setCompanies(mockCompanies)
        setCompanyState(defaultCompany)
        setError(null)
      }
    } catch (err) {
      console.error('[CompanyContext] Failed to fetch companies:', err)
      setError('Failed to load companies. Please sign in or contact support.')
      // Fallback to mock data on error
      console.log('[CompanyContext] Falling back to mock data due to error')
      setCompanies(mockCompanies)
      setCompanyState(defaultCompany)
    } finally {
      setIsLoading(false)
    }
  }

  async function refetchData(dateRange: { from: Date; to: Date }) {
    // Only fetch if using real data and we have a real UUID (not a mock company slug)
    if (!useRealData || !company.id) return

    // Check if company ID is a UUID format (contains hyphens and is long enough)
    if (!company.id.includes('-') || company.id.length < 20) {
      console.log('[CompanyContext] Skipping refetch - mock company detected:', company.id)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      })

      const response = await fetch(`/api/analytics/${company.id}?${params}`)

      const data = await response.json()

      // If response is 404 (no mappings), show a more helpful error
      if (!response.ok) {
        if (response.status === 404) {
          setError(data.message || 'No analytics accounts mapped to this company')
        } else {
          setError('Failed to load analytics data')
        }
        return
      }

      // Update company with real data (use null for missing data)
      setCompanyState(prev => ({
        ...prev,
        // Google Analytics data
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
        // Google Search Console data
        gscMetrics: data.gscMetrics || null,
        gscWeeklyData: data.gscWeeklyData || [],
        gscKeywords: data.gscKeywords || []
      }))
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
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
