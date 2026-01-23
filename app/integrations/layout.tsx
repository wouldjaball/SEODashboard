'use client'

import { CompanyProvider } from "@/lib/company-context"
import { DashboardHeader } from "@/components/dashboard/shared/dashboard-header"

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        {children}
      </div>
    </CompanyProvider>
  )
}
