"use client"

import { Eye, MousePointerClick, Percent, Target, FileText, Hash } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import type { GSCMetrics } from "@/lib/types"
import type { GSCDetailType } from "./gsc-detail-sheet"

interface GSCKPIFunnelProps {
  metrics: GSCMetrics | null
  onCardClick?: (type: GSCDetailType) => void
}

export function GSCKPIFunnel({ metrics, onCardClick }: GSCKPIFunnelProps) {
  const getChange = (current: number | undefined | null, previous?: number) => {
    if (!current || !previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics?.previousPeriod

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPICard
        title="Impressions"
        value={metrics?.impressions ?? null}
        change={getChange(metrics?.impressions, prev?.impressions)}
        icon={Eye}
        format="number"
        onClick={onCardClick ? () => onCardClick("impressions") : undefined}
      />
      <KPICard
        title="URL CTR"
        value={metrics?.ctr ?? null}
        change={getChange(metrics?.ctr, prev?.ctr)}
        icon={Percent}
        format="percent"
        onClick={onCardClick ? () => onCardClick("ctr") : undefined}
      />
      <KPICard
        title="URL Clicks"
        value={metrics?.clicks ?? null}
        change={getChange(metrics?.clicks, prev?.clicks)}
        icon={MousePointerClick}
        format="number"
        onClick={onCardClick ? () => onCardClick("clicks") : undefined}
      />
      <KPICard
        title="Avg. Position"
        value={metrics?.avgPosition ? metrics.avgPosition.toFixed(1) : null}
        change={metrics && prev ? -(metrics.avgPosition - prev.avgPosition) / prev.avgPosition : undefined}
        icon={Target}
        onClick={onCardClick ? () => onCardClick("position") : undefined}
      />
      <KPICard
        title="Indexed Pages"
        value={metrics?.indexedPages ?? null}
        change={getChange(metrics?.indexedPages, prev?.indexedPages)}
        icon={FileText}
        format="number"
        onClick={onCardClick ? () => onCardClick("indexedPages") : undefined}
      />
      <KPICard
        title="Ranking Keywords"
        value={metrics?.rankingKeywords ?? null}
        change={getChange(metrics?.rankingKeywords, prev?.rankingKeywords)}
        icon={Hash}
        format="number"
        onClick={onCardClick ? () => onCardClick("rankingKeywords") : undefined}
      />
    </div>
  )
}
