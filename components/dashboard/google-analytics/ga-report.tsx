"use client"

import { useState, useMemo } from "react"
import { GAKPIOverview } from "./ga-kpi-overview"
import { WeeklyPerformanceChart } from "./weekly-performance-chart"
import { TrafficShareChart } from "./traffic-share-chart"
import { ChannelPerformanceChart } from "./channel-performance-chart"
import { PerformanceTable } from "./performance-table"
import { LandingPageTable } from "./landing-page-table"
import { DemographicsCharts } from "./demographics-charts"
import { RegionMap } from "./region-map"
import { GAFilterBar } from "./ga-filter-bar"
import {
  filterLandingPages,
  filterSourcePerformance,
  filterDevices,
  filterChannelData,
  filterTrafficShare,
  calculateFilteredMetrics,
} from "@/lib/ga-filters"
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
  GAFilters,
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
  dateRange?: { from: Date; to: Date }
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
  dateRange,
}: GAReportProps) {
  // Filter state - empty arrays mean "all selected"
  const [filters, setFilters] = useState<GAFilters>({
    landingPages: [],
    deviceCategories: [],
    channels: [],
  })

  // Apply filters to all data
  const filteredData = useMemo(() => ({
    metrics: calculateFilteredMetrics(metrics, landingPages, devices, trafficShare, filters),
    landingPages: filterLandingPages(landingPages, filters),
    sourcePerformance: filterSourcePerformance(sourcePerformance, filters),
    devices: filterDevices(devices, filters),
    channelData: filterChannelData(channelData, filters),
    trafficShare: filterTrafficShare(trafficShare, filters),
  }), [metrics, landingPages, devices, trafficShare, sourcePerformance, channelData, filters])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter Bar */}
      <GAFilterBar
        landingPages={landingPages}
        devices={devices}
        trafficShare={trafficShare}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* KPI Overview */}
      <GAKPIOverview metrics={filteredData.metrics} />

      {/* Charts Row - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <WeeklyPerformanceChart data={weeklyData} dateRange={dateRange} />
        </div>
        <div className="lg:col-span-2">
          <TrafficShareChart data={filteredData.trafficShare} />
        </div>
      </div>

      {/* Channel Performance */}
      <ChannelPerformanceChart data={filteredData.channelData} dateRange={dateRange} />

      {/* Performance Table */}
      <PerformanceTable data={filteredData.sourcePerformance} />

      {/* Landing Page Table */}
      <LandingPageTable data={filteredData.landingPages} />

      {/* Region & Demographics - Stack on mobile and tablet */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RegionMap data={regions} />
        <DemographicsCharts devices={filteredData.devices} gender={gender} age={age} />
      </div>
    </div>
  )
}
