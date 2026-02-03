"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  MousePointerClick, 
  ExternalLink,
  AlertTriangle,
  Loader2 
} from "lucide-react"
import type { Company } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CompanyGridCardProps {
  company: Company
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatNumber(num: number | null | undefined, isLoading: boolean = false): string {
  if (num === null || num === undefined) {
    return isLoading ? "..." : "—"
  }
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toLocaleString()
}

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—"
  return (num * 100).toFixed(1) + "%"
}

function getChangeColor(change?: number | null): string {
  if (!change) return "text-muted-foreground"
  return change > 0 ? "text-green-600" : "text-red-600"
}

function getChangeIcon(change?: number | null) {
  if (!change) return null
  return change > 0 ? TrendingUp : TrendingDown
}

function calculateChange(current?: number, previous?: number): number | undefined {
  if (!current || !previous) return undefined
  return (current - previous) / previous
}

export function CompanyGridCard({ company, className }: CompanyGridCardProps) {
  // Check if this company has any analytics data loaded
  const hasAnalyticsData = company.gaMetrics || company.gscMetrics || company.ytMetrics || company.liVisitorMetrics
  
  // Calculate key metrics changes
  const trafficChange = calculateChange(
    company.gaMetrics?.totalUsers, 
    company.gaMetrics?.previousPeriod?.totalUsers
  )
  
  const conversionRateChange = calculateChange(
    company.gaMetrics?.userKeyEventRate, 
    company.gaMetrics?.previousPeriod?.userKeyEventRate
  )

  const impressionsChange = calculateChange(
    company.gscMetrics?.impressions, 
    company.gscMetrics?.previousPeriod?.impressions
  )

  // Determine overall health status
  const hasErrors = company.gaError || company.gscError || company.ytError || company.liError
  const healthStatus = hasErrors ? "warning" : hasAnalyticsData ? "healthy" : "loading"

  const ChangeIcon = getChangeIcon(trafficChange)

  return (
    <Link href={`/dashboard/companies/${company.id}`}>
      <Card className={cn("hover:shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02]", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback
                className="text-sm font-semibold text-white"
                style={{ backgroundColor: company.color }}
              >
                {getInitials(company.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{company.name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{company.industry}</p>
            </div>
            {healthStatus === "warning" && (
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            )}
            {healthStatus === "loading" && (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            )}
          </div>
        </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Traffic</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {formatNumber(company.gaMetrics?.totalUsers, healthStatus === "loading")}
              </span>
              {ChangeIcon && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(trafficChange))}>
                  <ChangeIcon className="h-3 w-3" />
                  <span className="text-xs">{formatPercent(Math.abs(trafficChange || 0))}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sessions</span>
            </div>
            <span className="font-semibold text-sm">
              {formatNumber(company.gaMetrics?.sessions, healthStatus === "loading")}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <MousePointerClick className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Conv. Rate</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {formatPercent(company.gaMetrics?.userKeyEventRate)}
              </span>
              {conversionRateChange && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(conversionRateChange))}>
                  {getChangeIcon(conversionRateChange) && React.createElement(getChangeIcon(conversionRateChange)!, { className: "h-3 w-3" })}
                  <span className="text-xs">{formatPercent(Math.abs(conversionRateChange))}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <span className="font-semibold text-sm">
              {formatNumber(company.gscMetrics?.impressions, healthStatus === "loading")}
            </span>
          </div>
        </div>

        {/* Integration Status */}
        <div className="flex gap-1 flex-wrap">
          {company.gaMetrics && !company.gaError && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">GA</Badge>
          )}
          {company.gscMetrics && !company.gscError && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">GSC</Badge>
          )}
          {company.ytMetrics && !company.ytError && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">YT</Badge>
          )}
          {company.liVisitorMetrics && !company.liError && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">LI</Badge>
          )}
        </div>

      </CardContent>
      </Card>
    </Link>
  )
}