"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  MousePointerClick, 
  AlertTriangle,
  Loader2,
  Search,
  Target
} from "lucide-react"
import type { Company } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useCompany } from "@/lib/company-context"

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


function calculateChange(current?: number, previous?: number): number | undefined {
  if (!current || !previous) return undefined
  return (current - previous) / previous
}

export function CompanyGridCard({ company, className }: CompanyGridCardProps) {
  const router = useRouter()
  const { setCompany } = useCompany()

  // Check if this company has any analytics data loaded
  const hasGAData = company.gaMetrics && !company.gaError
  const hasGSCData = company.gscMetrics && !company.gscError
  const hasAnalyticsData = hasGAData || hasGSCData || company.ytMetrics || company.liVisitorMetrics
  
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

  const clicksChange = calculateChange(
    company.gscMetrics?.clicks, 
    company.gscMetrics?.previousPeriod?.clicks
  )

  const ctrChange = calculateChange(
    company.gscMetrics?.ctr, 
    company.gscMetrics?.previousPeriod?.ctr
  )

  // Determine overall health status
  const hasErrors = company.gaError || company.gscError || company.ytError || company.liError
  const healthStatus = hasErrors ? "warning" : hasAnalyticsData ? "healthy" : "loading"

  // Get change directions for icons (avoiding component creation during render)
  const trafficIconType = trafficChange ? (trafficChange > 0 ? 'up' : 'down') : null
  const conversionRateIconType = conversionRateChange ? (conversionRateChange > 0 ? 'up' : 'down') : null
  const impressionsIconType = impressionsChange ? (impressionsChange > 0 ? 'up' : 'down') : null
  const clicksIconType = clicksChange ? (clicksChange > 0 ? 'up' : 'down') : null
  const ctrIconType = ctrChange ? (ctrChange > 0 ? 'up' : 'down') : null

  // Handle company card click with proper state management
  const handleCompanyClick = () => {
    // Set the company in context so it's available on the owner dashboard
    setCompany(company)
    // Navigate to the new owner dashboard
    router.push(`/dashboard/executive/owner`)
  }

  return (
    <Card 
      className={cn("hover:shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02]", className)}
      onClick={handleCompanyClick}
    >
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
        {/* Key Metrics - Enhanced 6-metric grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* GA Traffic */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">Traffic</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {formatNumber(company.gaMetrics?.totalUsers, healthStatus === "loading")}
              </span>
              {trafficIconType && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(trafficChange))}>
                  {trafficIconType === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs">{formatPercent(Math.abs(trafficChange || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* GA Sessions */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">Sessions</span>
            </div>
            <span className="font-semibold text-sm">
              {formatNumber(company.gaMetrics?.sessions, healthStatus === "loading")}
            </span>
          </div>

          {/* GA Conv. Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <MousePointerClick className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">Conv. Rate</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {formatPercent(company.gaMetrics?.userKeyEventRate)}
              </span>
              {conversionRateIconType && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(conversionRateChange))}>
                  {conversionRateIconType === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs">{formatPercent(Math.abs(conversionRateChange || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* GSC Impressions */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Search className="h-3 w-3 text-green-600" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {formatNumber(company.gscMetrics?.impressions, healthStatus === "loading")}
              </span>
              {impressionsIconType && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(impressionsChange))}>
                  {impressionsIconType === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs">{formatPercent(Math.abs(impressionsChange || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* GSC Clicks */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-green-600" />
              <span className="text-xs text-muted-foreground">Clicks</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {formatNumber(company.gscMetrics?.clicks, healthStatus === "loading")}
              </span>
              {clicksIconType && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(clicksChange))}>
                  {clicksIconType === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs">{formatPercent(Math.abs(clicksChange || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* GSC CTR */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-muted-foreground">CTR</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">
                {company.gscMetrics?.ctr ? formatPercent(company.gscMetrics.ctr) : healthStatus === "loading" ? "..." : "—"}
              </span>
              {ctrIconType && (
                <div className={cn("flex items-center gap-0.5", getChangeColor(ctrChange))}>
                  {ctrIconType === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs">{formatPercent(Math.abs(ctrChange || 0))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="flex gap-1 flex-wrap">
          {hasGAData ? (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">GA</Badge>
          ) : company.gaError ? (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">GA✗</Badge>
          ) : null}
          
          {hasGSCData ? (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">GSC</Badge>
          ) : company.gscError ? (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">GSC✗</Badge>
          ) : null}
          
          {company.ytMetrics && !company.ytError && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">YT</Badge>
          )}
          {company.liVisitorMetrics && !company.liError && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">LI</Badge>
          )}
        </div>

      </CardContent>
    </Card>
  )
}