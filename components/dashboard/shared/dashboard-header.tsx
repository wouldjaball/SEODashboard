"use client"

import Link from "next/link"
import { BarChart3, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCompany } from "@/lib/company-context"
import { CompanySwitcher } from "./company-switcher"
import { ModeToggle } from "@/components/mode-toggle"

export function DashboardHeader() {
  const { company } = useCompany()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top">
      <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-4 gap-3 sm:gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg"
            style={{ backgroundColor: company.color }}
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold truncate leading-tight">
              {company.name}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">
              {company.industry}
            </span>
          </div>
        </div>

        {/* Center space */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/integrations">
            <Button variant="ghost" size="icon" title="Integrations">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <ModeToggle />
          <CompanySwitcher />
        </div>
      </div>
    </header>
  )
}
