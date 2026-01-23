"use client"

import { GAKPIOverview } from "./ga-kpi-overview"
import { WeeklyPerformanceChart } from "./weekly-performance-chart"
import { TrafficShareChart } from "./traffic-share-chart"
import { ChannelPerformanceChart } from "./channel-performance-chart"
import { PerformanceTable } from "./performance-table"
import { LandingPageTable } from "./landing-page-table"
import { DemographicsCharts } from "./demographics-charts"
import { RegionMap } from "./region-map"
import type {
  GAMetrics,
  GAWeeklyData,
  GAChannelData,
  GASourcePerformance,
  GALandingPage,
  GARegion,
  GADevice,
  GADemographic,
  GATrafficShare,
} from "@/lib/types"

interface GAReportProps {
  metrics: GAMetrics | null
  weeklyData: GAWeeklyData[]
  channelData: GAChannelData[]
  trafficShare: GATrafficShare[]
  sourcePerformance: GASourcePerformance[]
  landingPages: GALandingPage[]
  regions: GARegion[]
  devices: GADevice[]
  gender: GADemographic[]
  age: GADemographic[]
}

export function GAReport({
  metrics,
  weeklyData,
  channelData,
  trafficShare,
  sourcePerformance,
  landingPages,
  regions,
  devices,
  gender,
  age,
}: GAReportProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI Overview */}
      <GAKPIOverview metrics={metrics} />

      {/* Charts Row - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <WeeklyPerformanceChart data={weeklyData} />
        </div>
        <div className="lg:col-span-2">
          <TrafficShareChart data={trafficShare} />
        </div>
      </div>

      {/* Channel Performance */}
      <ChannelPerformanceChart data={channelData} />

      {/* Performance Table */}
      <PerformanceTable data={sourcePerformance} />

      {/* Landing Page Table */}
      <LandingPageTable data={landingPages} />

      {/* Region & Demographics - Stack on mobile and tablet */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RegionMap data={regions} />
        <DemographicsCharts devices={devices} gender={gender} age={age} />
      </div>
    </div>
  )
}
