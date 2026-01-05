"use client"

import { Eye, MousePointerClick, Percent, Target, FileText, Hash } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import type { GSCMetrics } from "@/lib/types"

interface GSCKPIFunnelProps {
  metrics: GSCMetrics
}

export function GSCKPIFunnel({ metrics }: GSCKPIFunnelProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPICard
        title="Impressions"
        value={metrics.impressions}
        change={getChange(metrics.impressions, prev?.impressions)}
        icon={Eye}
        format="number"
      />
      <KPICard
        title="URL CTR"
        value={metrics.ctr}
        change={getChange(metrics.ctr, prev?.ctr)}
        icon={Percent}
        format="percent"
      />
      <KPICard
        title="URL Clicks"
        value={metrics.clicks}
        change={getChange(metrics.clicks, prev?.clicks)}
        icon={MousePointerClick}
        format="number"
      />
      <KPICard
        title="Avg. Position"
        value={metrics.avgPosition.toFixed(1)}
        change={prev ? -(metrics.avgPosition - prev.avgPosition) / prev.avgPosition : undefined}
        icon={Target}
      />
      <KPICard
        title="Indexed Pages"
        value={metrics.indexedPages}
        change={getChange(metrics.indexedPages, prev?.indexedPages)}
        icon={FileText}
        format="number"
      />
      <KPICard
        title="Ranking Keywords"
        value={metrics.rankingKeywords}
        change={getChange(metrics.rankingKeywords, prev?.rankingKeywords)}
        icon={Hash}
        format="number"
      />
    </div>
  )
}
