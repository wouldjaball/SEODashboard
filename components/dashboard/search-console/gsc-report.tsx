"use client"

import * as React from "react"
import { GSCKPIFunnel } from "./gsc-kpi-funnel"
import { ImpressionsClicksChart } from "./impressions-clicks-chart"
import { IndexedPagesChart } from "./indexed-pages-chart"
import { DevicePerformance } from "./device-performance"
import { KeywordTable } from "./keyword-table"
import { LandingPagePerformanceTable } from "./landing-page-performance-table"
import { CountryPerformanceMap } from "./country-performance-map"
import { GSCDetailSheet, type GSCDetailType } from "./gsc-detail-sheet"
import { ErrorBoundary } from "@/components/ui/error-boundary"
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
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false)
  const [detailType, setDetailType] = React.useState<GSCDetailType | null>(null)

  const handleCardClick = (type: GSCDetailType) => {
    console.log(`[GSCReport] Card clicked:`, type)
    console.log(`[GSCReport] Keywords array length:`, keywords?.length || 0)
    console.log(`[GSCReport] Landing pages array length:`, landingPages?.length || 0)
    console.log(`[GSCReport] Keywords data sample:`, keywords?.slice(0, 2))
    console.log(`[GSCReport] Landing pages data sample:`, landingPages?.slice(0, 2))
    
    setDetailType(type)
    setDetailSheetOpen(true)
    
    console.log(`[GSCReport] Detail sheet should now be open for type:`, type)
  }

  return (
    <div className="space-y-6">
      {/* KPI Funnel */}
      <GSCKPIFunnel metrics={metrics} onCardClick={handleCardClick} />

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

      {/* Detail Sheet */}
      <ErrorBoundary onReset={() => setDetailSheetOpen(false)}>
        <GSCDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          type={detailType}
          keywords={keywords}
          landingPages={landingPages}
        />
      </ErrorBoundary>
    </div>
  )
}
