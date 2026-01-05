import { BarChart3 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-gray-900 text-white">
        <div className="container flex h-14 items-center px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-green-500" />
            <span className="text-lg font-bold">Vestige View</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-gray-300">Analytics Dashboard</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {children}
      </main>
    </div>
  )
}
