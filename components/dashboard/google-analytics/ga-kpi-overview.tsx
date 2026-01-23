"use client"

import { Users, UserPlus, MousePointerClick, Eye, Clock, ArrowUpRight, Target, TrendingUp } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import type { GAMetrics } from "@/lib/types"

interface GAKPIOverviewProps {
  metrics: GAMetrics | null
}

export function GAKPIOverview({ metrics }: GAKPIOverviewProps) {
  const getChange = (current: number | undefined | null, previous?: number) => {
    if (!current || !previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics?.previousPeriod

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <KPICard
        title="Total Users"
        value={metrics?.totalUsers ?? null}
        change={getChange(metrics?.totalUsers, prev?.totalUsers)}
        icon={Users}
        format="number"
      />
      <KPICard
        title="New Users"
        value={metrics?.newUsers ?? null}
        change={getChange(metrics?.newUsers, prev?.newUsers)}
        icon={UserPlus}
        format="number"
      />
      <KPICard
        title="Sessions"
        value={metrics?.sessions ?? null}
        change={getChange(metrics?.sessions, prev?.sessions)}
        icon={MousePointerClick}
        format="number"
      />
      <KPICard
        title="Views"
        value={metrics?.views ?? null}
        change={getChange(metrics?.views, prev?.views)}
        icon={Eye}
        format="number"
      />
      <KPICard
        title="Avg. Duration"
        value={metrics?.avgSessionDuration ?? null}
        change={getChange(metrics?.avgSessionDuration, prev?.avgSessionDuration)}
        icon={Clock}
        format="duration"
      />
      <KPICard
        title="Bounce Rate"
        value={metrics?.bounceRate ?? null}
        change={metrics && prev ? -(metrics.bounceRate - prev.bounceRate) / prev.bounceRate : undefined}
        icon={ArrowUpRight}
        format="percent"
      />
      <KPICard
        title="Key Events"
        value={metrics?.keyEvents ?? null}
        change={getChange(metrics?.keyEvents, prev?.keyEvents)}
        icon={Target}
        format="number"
      />
      <KPICard
        title="Event Rate"
        value={metrics?.userKeyEventRate ?? null}
        change={getChange(metrics?.userKeyEventRate, prev?.userKeyEventRate)}
        icon={TrendingUp}
        format="percent"
      />
    </div>
  )
}
