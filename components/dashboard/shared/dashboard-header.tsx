"use client"

import Link from "next/link"
import { BarChart3, Settings, LayoutDashboard, Building2, Users, Link2, Key, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCompany } from "@/lib/company-context"
import { CompanySwitcher } from "./company-switcher"
import { UserMenu } from "./user-menu"
import { ModeToggle } from "@/components/mode-toggle"

export function DashboardHeader() {
  const { company } = useCompany()
  const isOwner = company.role === 'owner'
  const isAdmin = company.role === 'admin'
  const canManageUsers = isOwner || isAdmin

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top" data-testid="dashboard-header">
      <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-4 gap-3 sm:gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg"
              style={{ backgroundColor: company.color }}
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold truncate leading-tight">
              {company.name}
            </span>
            <span className="hidden sm:block text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">
              {company.industry}
            </span>
          </div>
        </div>

        {/* Center space */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" title="Executive Overview - Portfolio dashboard" asChild>
            <Link href="/dashboard/executive">
              <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
          {/* Portfolio Dashboard - Same as main dashboard now */}
          <Button variant="ghost" size="icon" title="Portfolio Overview - Executive view" asChild>
            <Link href="/dashboard/executive">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
          {canManageUsers && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Admin" data-testid="admin-menu-trigger">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/accounts" className="flex items-center cursor-pointer">
                      <Link2 className="mr-2 h-4 w-4" />
                      Account Assignments
                    </Link>
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/companies" className="flex items-center cursor-pointer">
                      <Building2 className="mr-2 h-4 w-4" />
                      Companies
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    Users
                  </Link>
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/access-codes" className="flex items-center cursor-pointer">
                      <Key className="mr-2 h-4 w-4" />
                      Access Codes
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ModeToggle />
          <UserMenu />
          <CompanySwitcher />
        </div>
      </div>
    </header>
  )
}
