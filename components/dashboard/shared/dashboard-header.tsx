"use client"

import { BarChart3 } from "lucide-react"
import { useCompany } from "@/lib/company-context"
import { CompanySwitcher } from "./company-switcher"

export function DashboardHeader() {
  const { company } = useCompany()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gray-900 text-white safe-area-inset-top">
      <div className="container flex h-12 sm:h-14 items-center px-3 sm:px-4 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
          <span className="text-base sm:text-lg font-bold hidden sm:inline">{company.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <CompanySwitcher />
        </div>
      </div>
    </header>
  )
}
