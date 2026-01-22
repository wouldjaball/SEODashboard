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
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = React.useState<Company>(defaultCompany)
  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const useRealData = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true'

  React.useEffect(() => {
    if (useRealData) {
      fetchCompanies()
    }
  }, [useRealData])

  async function fetchCompanies() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/companies')
      const data = await response.json()

      if (data.companies && data.companies.length > 0) {
        // Convert database companies to Company type with mock data for now
        const companiesWithData = data.companies.map((c: any) => ({
          ...defaultCompany,
          id: c.id,
          name: c.name,
          industry: c.industry,
          color: c.color,
          logo: c.logo_url
        }))

        setCompanies(companiesWithData)
        setCompanyState(companiesWithData[0])
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err)
      setError('Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }

  async function refetchData(dateRange: { from: Date; to: Date }) {
    if (!useRealData || !company.id) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0]
      })

      const response = await fetch(`/api/analytics/${company.id}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const data = await response.json()

      // Update company with real data
      setCompanyState(prev => ({
        ...prev,
        gaMetrics: data.gaMetrics || prev.gaMetrics,
        gaWeeklyData: data.gaWeeklyData || prev.gaWeeklyData,
        gscMetrics: data.gscMetrics || prev.gscMetrics,
        gscWeeklyData: data.gscWeeklyData || prev.gscWeeklyData,
        gscKeywords: data.gscKeywords || prev.gscKeywords
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
        refetchData
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
