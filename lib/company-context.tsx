"use client"

import * as React from "react"
import type { Company } from "@/lib/types"
import { companies, defaultCompany } from "@/lib/mock-data/companies"

interface CompanyContextType {
  company: Company
  setCompany: (company: Company) => void
  companies: Company[]
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = React.useState<Company>(defaultCompany)

  return (
    <CompanyContext.Provider value={{ company, setCompany, companies }}>
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
