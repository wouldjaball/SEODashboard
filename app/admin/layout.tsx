'use client'

import { CompanyProvider } from "@/lib/company-context"
import { DashboardHeader } from "@/components/dashboard/shared/dashboard-header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container px-3 sm:px-4 py-4 sm:py-6 pb-safe">
          {children}
        </main>
      </div>
    </CompanyProvider>
  )
}
