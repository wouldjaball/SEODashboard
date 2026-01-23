import { CompanyProvider } from "@/lib/company-context"
import { DashboardHeader } from "@/components/dashboard/shared/dashboard-header"
import { PageTitle } from "@/components/dashboard/shared/page-title"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <PageTitle />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content */}
        <main className="container px-3 sm:px-4 py-4 sm:py-6 pb-safe">
          {children}
        </main>
      </div>
    </CompanyProvider>
  )
}
