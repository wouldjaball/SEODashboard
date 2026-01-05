import { BarChart3 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-gray-900 text-white safe-area-inset-top">
        <div className="container flex h-12 sm:h-14 items-center px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
            <span className="text-base sm:text-lg font-bold truncate">Vestige View</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-300 hidden xs:inline">Analytics</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-3 sm:px-4 py-4 sm:py-6 pb-safe">
        {children}
      </main>
    </div>
  )
}
