"use client"

import * as React from "react"
import { MultiSelectFilter } from "@/components/dashboard/shared/multi-select-filter"
import {
  extractLandingPageOptions,
  extractDeviceOptions,
  extractChannelOptions,
} from "@/lib/ga-filters"
import type {
  GAFilters,
  GALandingPage,
  GADevice,
  GATrafficShare,
} from "@/lib/types"

interface GAFilterBarProps {
  landingPages: GALandingPage[]
  devices: GADevice[]
  trafficShare: GATrafficShare[]
  filters: GAFilters
  onFiltersChange: (filters: GAFilters) => void
}

export function GAFilterBar({
  landingPages,
  devices,
  trafficShare,
  filters,
  onFiltersChange,
}: GAFilterBarProps) {
  // Extract options from data
  const landingPageOptions = React.useMemo(
    () => extractLandingPageOptions(landingPages),
    [landingPages]
  )

  const deviceOptions = React.useMemo(
    () => extractDeviceOptions(devices),
    [devices]
  )

  const channelOptions = React.useMemo(
    () => extractChannelOptions(trafficShare),
    [trafficShare]
  )

  const handleLandingPageChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      landingPages: values,
    })
  }

  const handleDeviceChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      deviceCategories: values as ('desktop' | 'mobile' | 'tablet')[],
    })
  }

  const handleChannelChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      channels: values,
    })
  }

  // Only show filter bar if we have data
  if (landingPageOptions.length === 0 && deviceOptions.length === 0 && channelOptions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {landingPageOptions.length > 0 && (
        <MultiSelectFilter
          label="Landing page"
          options={landingPageOptions}
          selectedValues={filters.landingPages}
          onChange={handleLandingPageChange}
        />
      )}

      {deviceOptions.length > 0 && (
        <MultiSelectFilter
          label="Device category"
          options={deviceOptions}
          selectedValues={filters.deviceCategories}
          onChange={handleDeviceChange}
        />
      )}

      {channelOptions.length > 0 && (
        <MultiSelectFilter
          label="First user default chann..."
          options={channelOptions}
          selectedValues={filters.channels}
          onChange={handleChannelChange}
        />
      )}
    </div>
  )
}
