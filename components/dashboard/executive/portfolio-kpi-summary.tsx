"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Search,
  Users,
  Target,
  Activity,
  BarChart3
} from "lucide-react"
import type { Company } from "@/lib/types"

interface PortfolioKPISummaryProps {
  companies: Company[]
}

export function PortfolioKPISummary({ companies }: PortfolioKPISummaryProps) {
  // Calculate portfolio totals from individual company data
  const calculatePortfolioTotals = () => {
    let totalUsers = 0
    let totalSessions = 0
    let totalPageViews = 0
    let totalKeyEvents = 0
    let totalImpressions = 0
    let totalClicks = 0
    let totalKeywords = 0
    
    // Previous period totals
    let prevTotalUsers = 0
    let prevTotalSessions = 0
    let prevTotalImpressions = 0
    let prevTotalClicks = 0

    companies.forEach(company => {
      if (company.gaMetrics) {
        totalUsers += company.gaMetrics.totalUsers || 0
        totalSessions += company.gaMetrics.sessions || 0
        totalPageViews += company.gaMetrics.views || 0
        totalKeyEvents += company.gaMetrics.keyEvents || 0
        
        if (company.gaMetrics.previousPeriod) {
          prevTotalUsers += company.gaMetrics.previousPeriod.totalUsers || 0
          prevTotalSessions += company.gaMetrics.previousPeriod.sessions || 0
        }
      }
      
      if (company.gscMetrics) {
        totalImpressions += company.gscMetrics.impressions || 0
        totalClicks += company.gscMetrics.clicks || 0
        
        if (company.gscMetrics.previousPeriod) {
          prevTotalImpressions += company.gscMetrics.previousPeriod.impressions || 0
          prevTotalClicks += company.gscMetrics.previousPeriod.clicks || 0
        }
      }
      
      // Count keywords from GSC or individual keyword lists
      if (company.gscKeywords) {
        totalKeywords += company.gscKeywords.length
      }
    })

    return {
      totalUsers,
      totalSessions,
      totalPageViews,
      totalKeyEvents,
      totalImpressions,
      totalClicks,
      totalKeywords,
      conversionRate: totalSessions > 0 ? (totalKeyEvents / totalSessions) * 100 : 0,
      periodComparison: {
        usersGrowth: calculateGrowth(totalUsers, prevTotalUsers),
        sessionsGrowth: calculateGrowth(totalSessions, prevTotalSessions),
        impressionsGrowth: calculateGrowth(totalImpressions, prevTotalImpressions),
        clicksGrowth: calculateGrowth(totalClicks, prevTotalClicks),
      }
    }
  }

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
  }

  const formatGrowth = (growth: number): { value: string; isPositive: boolean } => {
    const isPositive = growth >= 0
    return {
      value: `${isPositive ? '+' : ''}${growth.toFixed(1)}%`,
      isPositive
    }
  }

  const metrics = calculatePortfolioTotals()

  console.log('[Portfolio KPI] Calculated metrics:', metrics)

  const kpis = [
    {
      title: "Total Users",
      value: formatNumber(metrics.totalUsers),
      icon: Users,
      growth: formatGrowth(metrics.periodComparison.usersGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Sessions", 
      value: formatNumber(metrics.totalSessions),
      icon: Activity,
      growth: formatGrowth(metrics.periodComparison.sessionsGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Page Views",
      value: formatNumber(metrics.totalPageViews),
      icon: Eye,
      growth: null,
      description: "Total pages viewed"
    },
    {
      title: "Conversions",
      value: formatNumber(metrics.totalKeyEvents),
      icon: Target,
      growth: null,
      description: `${metrics.conversionRate.toFixed(1)}% conversion rate`
    },
    {
      title: "Search Impressions",
      value: formatNumber(metrics.totalImpressions),
      icon: Search,
      growth: formatGrowth(metrics.periodComparison.impressionsGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Search Clicks",
      value: formatNumber(metrics.totalClicks),
      icon: MousePointer,
      growth: formatGrowth(metrics.periodComparison.clicksGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Ranking Keywords",
      value: formatNumber(metrics.totalKeywords),
      icon: BarChart3,
      growth: null,
      description: "Keywords driving traffic"
    }
  ]

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon
            
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{kpi.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpi.description}
                      </p>
                    </div>
                    {kpi.growth && (
                      <div className="flex items-center gap-1">
                        {kpi.growth.isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          kpi.growth.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {kpi.growth.value}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}