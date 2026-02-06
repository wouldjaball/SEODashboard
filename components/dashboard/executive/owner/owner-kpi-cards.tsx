"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  Search, 
  Users,
  Target,
  Activity,
  Globe,
  BarChart3
} from "lucide-react"

interface OwnerKPICardsProps {
  data: {
    totalUsers: number
    totalSessions: number
    totalPageViews: number
    keyEvents: number
    conversionRate: number
    totalImpressions: number
    totalClicks: number
    avgPosition: number
    rankingKeywords: number
    indexedPages: number
    periodComparison: {
      usersGrowth: number
      sessionsGrowth: number
      impressionsGrowth: number
      clicksGrowth: number
    }
    realtime: {
      activeUsers: number
      topPages: Array<{ pagePath: string; activeUsers: number }>
      topReferrers: Array<{ source: string; activeUsers: number }>
    }
  }
}

export function OwnerKPICards({ data }: OwnerKPICardsProps) {
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

  const kpis = [
    {
      title: "Total Users",
      value: formatNumber(data.totalUsers),
      icon: Users,
      growth: formatGrowth(data.periodComparison.usersGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Sessions", 
      value: formatNumber(data.totalSessions),
      icon: Activity,
      growth: formatGrowth(data.periodComparison.sessionsGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Page Views",
      value: formatNumber(data.totalPageViews),
      icon: Eye,
      growth: null, // Not tracking growth for page views in comparison
      description: "Total pages viewed"
    },
    {
      title: "Conversions",
      value: formatNumber(data.keyEvents),
      icon: Target,
      growth: null,
      description: `${data.conversionRate.toFixed(1)}% conversion rate`
    },
    {
      title: "Search Impressions",
      value: formatNumber(data.totalImpressions),
      icon: Search,
      growth: formatGrowth(data.periodComparison.impressionsGrowth),
      description: "vs. previous 30 days"
    },
    {
      title: "Search Clicks",
      value: formatNumber(data.totalClicks),
      icon: MousePointer,
      growth: formatGrowth(data.periodComparison.clicksGrowth),
      description: `vs. previous 30 days • Avg pos: ${data.avgPosition.toFixed(1)}`
    },
    {
      title: "Ranking Keywords",
      value: formatNumber(data.rankingKeywords),
      icon: BarChart3,
      growth: null,
      description: "Keywords driving traffic"
    },
    {
      title: "Live Users",
      value: formatNumber(data.realtime.activeUsers),
      icon: Globe,
      growth: null,
      description: "Currently on your site",
      isRealtime: true
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        
        return (
          <Card key={index} className={kpi.isRealtime ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                {kpi.isRealtime && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    LIVE
                  </Badge>
                )}
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
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
  )
}