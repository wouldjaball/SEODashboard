"use client"

import { Users, UserPlus, MousePointerClick, Eye, Clock, ArrowUpRight, Target, TrendingUp } from "lucide-react"
import { KPICard } from "@/components/dashboard/shared"
import type { GAMetrics } from "@/lib/types"

interface GAKPIOverviewProps {
  metrics: GAMetrics
}

export function GAKPIOverview({ metrics }: GAKPIOverviewProps) {
  const getChange = (current: number, previous?: number) => {
    if (!previous) return undefined
    return (current - previous) / previous
  }

  const prev = metrics.previousPeriod

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Total Users"
        value={metrics.totalUsers}
        change={getChange(metrics.totalUsers, prev?.totalUsers)}
        icon={Users}
        format="number"
      />
      <KPICard
        title="New Users"
        value={metrics.newUsers}
        change={getChange(metrics.newUsers, prev?.newUsers)}
        icon={UserPlus}
        format="number"
      />
      <KPICard
        title="Sessions"
        value={metrics.sessions}
        change={getChange(metrics.sessions, prev?.sessions)}
        icon={MousePointerClick}
        format="number"
      />
      <KPICard
        title="Views"
        value={metrics.views}
        change={getChange(metrics.views, prev?.views)}
        icon={Eye}
        format="number"
      />
      <KPICard
        title="Avg. Session Duration"
        value={metrics.avgSessionDuration}
        change={getChange(metrics.avgSessionDuration, prev?.avgSessionDuration)}
        icon={Clock}
        format="duration"
      />
      <KPICard
        title="Bounce Rate"
        value={metrics.bounceRate}
        change={prev ? -(metrics.bounceRate - prev.bounceRate) / prev.bounceRate : undefined}
        icon={ArrowUpRight}
        format="percent"
      />
      <KPICard
        title="Key Events"
        value={metrics.keyEvents}
        change={getChange(metrics.keyEvents, prev?.keyEvents)}
        icon={Target}
        format="number"
      />
      <KPICard
        title="User Key Event Rate"
        value={metrics.userKeyEventRate}
        change={getChange(metrics.userKeyEventRate, prev?.userKeyEventRate)}
        icon={TrendingUp}
        format="percent"
      />
    </div>
  )
}
