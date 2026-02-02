"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Settings, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  error?: string
  errorType?: 'auth_required' | 'scope_missing' | 'api_error'
  companyId?: string
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
  error,
  errorType,
  companyId,
}: GAReportProps) {
  console.log('[GAReport] Received props:', {
    metrics: metrics ? 'present' : 'null',
    weeklyDataLength: weeklyData?.length || 0,
    channelDataLength: channelData?.length || 0,
    trafficShareLength: trafficShare?.length || 0,
    sourcePerformanceLength: sourcePerformance?.length || 0,
    landingPagesLength: landingPages?.length || 0,
    regionsLength: regions?.length || 0,
    devicesLength: devices?.length || 0,
    genderLength: gender?.length || 0,
    ageLength: age?.length || 0,
    dateRange,
    error,
    errorType,
    companyId
  })
  // Filter state - empty arrays mean "all selected"
  const [filters, setFilters] = useState<GAFilters>({
    landingPages: [],
    deviceCategories: [],
    channels: [],
  })

  // Real-time data state
  const [isRealtimeMode, setIsRealtimeMode] = useState(false)
  const [realtimeData, setRealtimeData] = useState<{
    activeUsers: number
    screenPageViews: number
    topPages: Array<{ pagePath: string; activeUsers: number }>
    topReferrers: Array<{ source: string; activeUsers: number }>
    timestamp?: string
  } | null>(null)
  const [realtimeLoading, setRealtimeLoading] = useState(false)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)

  // Fetch real-time data
  const fetchRealtimeData = useCallback(async () => {
    if (!companyId || realtimeLoading) return
    
    setRealtimeLoading(true)
    setRealtimeError(null)
    
    try {
      const response = await fetch(`/api/analytics/${companyId}/realtime`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch realtime data')
      }
      
      setRealtimeData(data)
    } catch (error) {
      console.error('Failed to fetch realtime data:', error)
      setRealtimeError(error instanceof Error ? error.message : 'Failed to fetch realtime data')
    } finally {
      setRealtimeLoading(false)
    }
  }, [companyId, realtimeLoading])

  // Auto-refresh realtime data when in realtime mode
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRealtimeMode && companyId) {
      fetchRealtimeData() // Initial fetch
      interval = setInterval(fetchRealtimeData, 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRealtimeMode, companyId, fetchRealtimeData])

  const toggleRealtimeMode = () => {
    setIsRealtimeMode(!isRealtimeMode)
    if (!isRealtimeMode) {
      fetchRealtimeData()
    } else {
      setRealtimeData(null)
      setRealtimeError(null)
    }
  }

  // Apply filters to all data
  const filteredData = useMemo(() => ({
    metrics: calculateFilteredMetrics(metrics, landingPages, devices, trafficShare, filters),
    landingPages: filterLandingPages(landingPages, filters),
    sourcePerformance: filterSourcePerformance(sourcePerformance, filters),
    devices: filterDevices(devices, filters),
    channelData: filterChannelData(channelData, filters),
    trafficShare: filterTrafficShare(trafficShare, filters),
    regions: regions, // No region filtering for now
    gender: gender,   // No gender filtering for now
    age: age,         // No age filtering for now
  }), [metrics, landingPages, sourcePerformance, devices, channelData, trafficShare, regions, gender, age, filters])

  // Show error state if there's an error
  if (error) {
    const getErrorMessage = () => {
      switch (errorType) {
        case 'auth_required':
          return 'Google Analytics connection expired. Please reconnect your account in the Integrations page.'
        case 'scope_missing':
          return 'Google Analytics permissions missing. Please reconnect your account with full Analytics access.'
        case 'api_error':
          return `Google Analytics API error: ${error}`
        default:
          return `Google Analytics error: ${error}`
      }
    }

    const getErrorIcon = () => {
      switch (errorType) {
        case 'auth_required':
        case 'scope_missing':
          return <Settings className="h-4 w-4" />
        default:
          return <AlertTriangle className="h-4 w-4" />
      }
    }

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          {getErrorIcon()}
          <AlertDescription>
            {getErrorMessage()}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

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

      {/* Real-time Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-3">
          <Button
            variant={isRealtimeMode ? "default" : "outline"}
            size="sm"
            onClick={toggleRealtimeMode}
            className="gap-2"
            disabled={realtimeLoading}
          >
            <Activity className={`h-4 w-4 ${isRealtimeMode ? 'animate-pulse' : ''}`} />
            {isRealtimeMode ? 'Live Data' : 'View Live Data'}
          </Button>
          
          {isRealtimeMode && (
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </Badge>
          )}
        </div>

        {/* Real-time Metrics Display */}
        {isRealtimeMode && (
          <div className="flex flex-wrap gap-4 text-sm">
            {realtimeLoading && (
              <span className="text-muted-foreground">Loading live data...</span>
            )}
            {realtimeError && (
              <span className="text-red-600">Error: {realtimeError}</span>
            )}
            {realtimeData && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Active Users:</span>
                  <span className="font-semibold">{realtimeData.activeUsers}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Page Views (30m):</span>
                  <span className="font-semibold">{realtimeData.screenPageViews}</span>
                </div>
                {realtimeData.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(realtimeData.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Real-time Details Panel */}
      {isRealtimeMode && realtimeData && !realtimeError && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/10">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Top Pages (Active Users)</h4>
            <div className="space-y-1">
              {realtimeData.topPages.slice(0, 5).map((page, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="truncate pr-2" title={page.pagePath}>{page.pagePath}</span>
                  <span className="font-medium text-green-600">{page.activeUsers}</span>
                </div>
              ))}
              {realtimeData.topPages.length === 0 && (
                <div className="text-sm text-muted-foreground">No active page traffic</div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Top Sources (Active Users)</h4>
            <div className="space-y-1">
              {realtimeData.topReferrers.slice(0, 5).map((referrer, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="truncate pr-2" title={referrer.source}>{referrer.source}</span>
                  <span className="font-medium text-blue-600">{referrer.activeUsers}</span>
                </div>
              ))}
              {realtimeData.topReferrers.length === 0 && (
                <div className="text-sm text-muted-foreground">No active referrer traffic</div>
              )}
            </div>
          </div>
        </div>
      )}

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
