"use client"

import { GSCKPIFunnel } from "./gsc-kpi-funnel"
import { ImpressionsClicksChart } from "./impressions-clicks-chart"
import { IndexedPagesChart } from "./indexed-pages-chart"
import { DevicePerformance } from "./device-performance"
import { KeywordTable } from "./keyword-table"
import { LandingPagePerformanceTable } from "./landing-page-performance-table"
import { CountryPerformanceMap } from "./country-performance-map"
import type {
  GSCMetrics,
  GSCWeeklyData,
  GSCKeyword,
  GSCLandingPage,
  GSCCountry,
  GSCDeviceData,
  GSCIndexData,
} from "@/lib/types"

interface GSCReportProps {
  metrics: GSCMetrics | null
  weeklyData: GSCWeeklyData[]
  indexData: GSCIndexData[]
  keywords: GSCKeyword[]
  landingPages: GSCLandingPage[]
  countries: GSCCountry[]
  devices: GSCDeviceData[]
}

export function GSCReport({
  metrics,
  weeklyData,
  indexData,
  keywords,
  landingPages,
  countries,
  devices,
}: GSCReportProps) {
  return (
    <div className="space-y-6">
      {/* KPI Funnel */}
      <GSCKPIFunnel metrics={metrics} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ImpressionsClicksChart data={weeklyData} />
        </div>
        <div className="lg:col-span-2">
          <DevicePerformance data={devices} />
        </div>
      </div>

      {/* Country Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CountryPerformanceMap data={countries} />
        <div className="lg:col-span-1">
          <IndexedPagesChart data={indexData} />
        </div>
      </div>

      {/* Keyword Table */}
      <KeywordTable data={keywords} />

      {/* Landing Page Table */}
      <LandingPagePerformanceTable data={landingPages} />
    </div>
  )
}
