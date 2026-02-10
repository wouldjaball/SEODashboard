"use client"

import * as React from "react"
import { subDays } from "date-fns"
import type { Company } from "@/lib/types"
// No more mock data imports - using real database companies only

interface CompanyContextType {
  company: Company
  setCompany: (company: Company) => void
  companies: Company[]
  isLoading: boolean
  error: string | null
  refetchData: (companyId: string, dateRange: { from: Date; to: Date }) => Promise<void>
  refetchPlatform: (companyId: string, dateRange: { from: Date; to: Date }, platform: string) => Promise<void>
  comparisonEnabled: boolean
  setComparisonEnabled: (enabled: boolean) => void
  findCompanyById: (id: string) => Company | undefined
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

// Empty company placeholder for loading state
const emptyCompany: Company = {
  id: '',
  name: 'Loading...',
  industry: '',
  color: '#888888',
  gaMetrics: {
    totalUsers: 0,
    newUsers: 0,
    sessions: 0,
    views: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    keyEvents: 0,
    userKeyEventRate: 0
  },
  gaWeeklyData: [],
  gaChannelData: [],
  gaTrafficShare: [],
  gaSourcePerformance: [],
  gaLandingPages: [],
  gaRegions: [],
  gaDevices: [],
  gaGender: [],
  gaAge: [],
  gscMetrics: {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    avgPosition: 0,
    indexedPages: 0,
    rankingKeywords: 0
  },
  gscWeeklyData: [],
  gscIndexData: [],
  gscKeywords: [],
  gscLandingPages: [],
  gscCountries: [],
  gscDevices: [],
  // YouTube metrics
  ytMetrics: {
    views: 0,
    totalWatchTime: 0,
    shares: 0,
    avgViewDuration: 0,
    likes: 0,
    dislikes: 0,
    comments: 0,
    subscriptions: 0
  },
  ytVideos: [],
  ytViewsSparkline: [],
  ytWatchTimeSparkline: [],
  ytSharesSparkline: [],
  ytLikesSparkline: [],
  // LinkedIn metrics
  liVisitorMetrics: { pageViews: 0, uniqueVisitors: 0, customButtonClicks: 0 },
  liFollowerMetrics: { totalFollowers: 0, newFollowers: 0 },
  liContentMetrics: { reactions: 0, comments: 0, reposts: 0, impressions: 0, clicks: 0, engagementRate: 0 },
  liSearchAppearanceMetrics: { searchAppearances: 0 },
  liVisitorDaily: [],
  liFollowerDaily: [],
  liImpressionDaily: [],
  liIndustryDemographics: [],
  liSeniorityDemographics: [],
  liJobFunctionDemographics: [],
  liCompanySizeDemographics: [],
  liUpdates: [],
  liDataSource: 'none',
  dataFreshness: undefined,
  gaError: undefined,
  gaErrorType: undefined,
  gscError: undefined,
  gscErrorType: undefined,
  liError: undefined,
  liErrorType: undefined,
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  // Always use real data from database only - no mock data
  const [company, setCompanyState] = React.useState<Company>(emptyCompany)
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [isLoading, setIsLoading] = React.useState(true) // Always start loading real data
  const [error, setError] = React.useState<string | null>(null)
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false)

  // Helper function to fetch analytics data for a specific company
  async function fetchAnalyticsForCompany(companyId: string, dateRange: { from: Date; to: Date }) {
    console.log('[CompanyContext] fetchAnalyticsForCompany called with:', { companyId, dateRange })

    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
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
      setCompanyState(prev => {
        const updatedCompany = {
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
        dataFreshness: data.dataFreshness || undefined,
        // LinkedIn core metrics
        liVisitorMetrics: data.liVisitorMetrics || null,
        liFollowerMetrics: data.liFollowerMetrics || null,
        liContentMetrics: data.liContentMetrics || null,
        liSearchAppearanceMetrics: data.liSearchAppearanceMetrics || null,
        liVisitorDaily: data.liVisitorDaily || [],
        liFollowerDaily: data.liFollowerDaily || [],
        liImpressionDaily: data.liImpressionDaily || [],
        liIndustryDemographics: data.liIndustryDemographics || [],
        liSeniorityDemographics: data.liSeniorityDemographics || [],
        liJobFunctionDemographics: data.liJobFunctionDemographics || [],
        liCompanySizeDemographics: data.liCompanySizeDemographics || [],
        liUpdates: data.liUpdates || [],
        }
        
        console.log('[CompanyContext] Updated company state:', {
          gaMetrics: updatedCompany.gaMetrics ? 'present' : 'null',
          gaWeeklyDataLength: updatedCompany.gaWeeklyData.length,
          gaChannelDataLength: updatedCompany.gaChannelData.length,
          gaTrafficShareLength: updatedCompany.gaTrafficShare.length
        })
        
        return updatedCompany
      })
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
        console.error('[CompanyContext] API returned error:', data.error)
        throw new Error(data.error)
      }

      // Handle case where API returns debug info about access issues
      if (data.debug) {
        console.warn('[CompanyContext] Access issue detected:', data.debug)
        setError(`Access issue: ${data.message || 'User has no company access'}. ${data.debug.suggestedAction || 'Please contact support.'}`)
        setCompanies([])
        setCompanyState(emptyCompany)
        return
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
          liSearchAppearanceMetrics: null,
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

  async function refetchPlatform(companyId: string, dateRange: { from: Date; to: Date }, platform: string) {
    console.log('[CompanyContext] refetchPlatform called:', { companyId, dateRange, platform })

    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') return

    try {
      // Don't set global isLoading — avoids full-page spinner for platform-scoped refetches
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
        platforms: platform
      })

      const response = await fetch(`/api/analytics/${companyId}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError(data.message || 'No analytics accounts mapped to this company')
        } else {
          setError('Failed to load analytics data')
        }
        return
      }

      // Merge only the platform-specific fields into company state
      setCompanyState(prev => ({
        ...prev,
        ...(platform === 'linkedin' || platform === 'all' ? {
          liVisitorMetrics: data.liVisitorMetrics ?? prev.liVisitorMetrics,
          liFollowerMetrics: data.liFollowerMetrics ?? prev.liFollowerMetrics,
          liContentMetrics: data.liContentMetrics ?? prev.liContentMetrics,
          liSearchAppearanceMetrics: data.liSearchAppearanceMetrics ?? prev.liSearchAppearanceMetrics,
          liVisitorDaily: data.liVisitorDaily ?? prev.liVisitorDaily,
          liFollowerDaily: data.liFollowerDaily ?? prev.liFollowerDaily,
          liImpressionDaily: data.liImpressionDaily ?? prev.liImpressionDaily,
          liIndustryDemographics: data.liIndustryDemographics ?? prev.liIndustryDemographics,
          liSeniorityDemographics: data.liSeniorityDemographics ?? prev.liSeniorityDemographics,
          liJobFunctionDemographics: data.liJobFunctionDemographics ?? prev.liJobFunctionDemographics,
          liCompanySizeDemographics: data.liCompanySizeDemographics ?? prev.liCompanySizeDemographics,
          liUpdates: data.liUpdates ?? prev.liUpdates,
          liError: data.liError ?? undefined,
          liErrorType: data.liErrorType ?? undefined,
          liDataSource: data.liDataSource ?? prev.liDataSource,
        } : {}),
        ...(platform === 'ga' || platform === 'all' ? {
          gaMetrics: data.gaMetrics ?? prev.gaMetrics,
          gaWeeklyData: data.gaWeeklyData ?? prev.gaWeeklyData,
          gaChannelData: data.gaChannelData ?? prev.gaChannelData,
          gaTrafficShare: data.gaTrafficShare ?? prev.gaTrafficShare,
          gaSourcePerformance: data.gaSourcePerformance ?? prev.gaSourcePerformance,
          gaLandingPages: data.gaLandingPages ?? prev.gaLandingPages,
          gaRegions: data.gaRegions ?? prev.gaRegions,
          gaDevices: data.gaDevices ?? prev.gaDevices,
          gaGender: data.gaGender ?? prev.gaGender,
          gaAge: data.gaAge ?? prev.gaAge,
          gaError: data.gaError ?? undefined,
          gaErrorType: data.gaErrorType ?? undefined,
        } : {}),
        ...(platform === 'gsc' || platform === 'all' ? {
          gscMetrics: data.gscMetrics ?? prev.gscMetrics,
          gscWeeklyData: data.gscWeeklyData ?? prev.gscWeeklyData,
          gscKeywords: data.gscKeywords ?? prev.gscKeywords,
          gscCountries: data.gscCountries ?? prev.gscCountries,
          gscDevices: data.gscDevices ?? prev.gscDevices,
          gscIndexData: data.gscIndexData ?? prev.gscIndexData,
          gscLandingPages: data.gscLandingPages ?? prev.gscLandingPages,
          gscError: data.gscError ?? undefined,
          gscErrorType: data.gscErrorType ?? undefined,
        } : {}),
        ...(platform === 'youtube' || platform === 'all' ? {
          ytMetrics: data.ytMetrics ?? prev.ytMetrics,
          ytVideos: data.ytVideos ?? prev.ytVideos,
          ytViewsSparkline: data.ytViewsSparkline ?? prev.ytViewsSparkline,
          ytWatchTimeSparkline: data.ytWatchTimeSparkline ?? prev.ytWatchTimeSparkline,
          ytSharesSparkline: data.ytSharesSparkline ?? prev.ytSharesSparkline,
          ytLikesSparkline: data.ytLikesSparkline ?? prev.ytLikesSparkline,
          ytError: data.ytError ?? undefined,
        } : {}),
        dataFreshness: data.dataFreshness ?? prev.dataFreshness,
      }))
    } catch (err) {
      console.error('[CompanyContext] Failed to refetch platform:', err)
      setError('Failed to load analytics data')
    }
  }

  const setCompany = (newCompany: Company) => {
    console.log('[CompanyContext] Setting company:', newCompany.id, newCompany.name)
    setCompanyState(newCompany)
    
    // Also ensure this company is in the companies list if it's not already
    setCompanies(prevCompanies => {
      const existingCompany = prevCompanies.find(c => c.id === newCompany.id)
      if (existingCompany) {
        // Update existing company with new data
        return prevCompanies.map(c => c.id === newCompany.id ? newCompany : c)
      } else {
        // Add new company to the list
        return [...prevCompanies, newCompany]
      }
    })
  }

  const findCompanyById = (id: string): Company | undefined => {
    const foundCompany = companies.find(c => c.id === id)
    console.log('[CompanyContext] findCompanyById:', id, 'found:', foundCompany ? foundCompany.name : 'not found')
    return foundCompany
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
        refetchPlatform,
        comparisonEnabled,
        setComparisonEnabled,
        findCompanyById
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
