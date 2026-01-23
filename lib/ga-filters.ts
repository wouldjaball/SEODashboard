import type {
  GAFilters,
  GAMetrics,
  GALandingPage,
  GASourcePerformance,
  GADevice,
  GAChannelData,
  GATrafficShare,
} from "./types"

// Channel name mapping from GAChannelData keys to display names
export const CHANNEL_KEY_TO_NAME: Record<string, string> = {
  direct: "Direct",
  paidSearch: "Paid Search",
  organicSearch: "Organic Search",
  paidOther: "Paid Other",
  referral: "Referral",
  crossNetwork: "Cross-network",
  unassigned: "Unassigned",
  organicSocial: "Organic Social",
}

export const CHANNEL_NAME_TO_KEY: Record<string, string> = {
  "Direct": "direct",
  "Paid Search": "paidSearch",
  "Organic Search": "organicSearch",
  "Paid Other": "paidOther",
  "Referral": "referral",
  "Cross-network": "crossNetwork",
  "Unassigned": "unassigned",
  "Organic Social": "organicSocial",
}

// Check if filters are active (not all selected)
function isFilterActive(values: string[], totalOptions: number): boolean {
  return values.length > 0 && values.length < totalOptions
}

// Filter landing pages by selected paths
export function filterLandingPages(
  data: GALandingPage[],
  filters: GAFilters
): GALandingPage[] {
  if (filters.landingPages.length === 0) return data
  return data.filter((page) => filters.landingPages.includes(page.pagePath))
}

// Filter source performance by channel names
export function filterSourcePerformance(
  data: GASourcePerformance[],
  filters: GAFilters
): GASourcePerformance[] {
  if (filters.channels.length === 0) return data

  // Match source against channel names (case-insensitive partial match)
  return data.filter((source) => {
    const sourceLower = source.source.toLowerCase()
    return filters.channels.some((channel) => {
      const channelLower = channel.toLowerCase()
      // Direct match or source contains channel name
      return sourceLower === channelLower ||
             sourceLower.includes(channelLower) ||
             channelLower.includes(sourceLower)
    })
  })
}

// Filter devices by category
export function filterDevices(
  data: GADevice[],
  filters: GAFilters
): GADevice[] {
  if (filters.deviceCategories.length === 0) return data
  return data.filter((device) =>
    filters.deviceCategories.includes(device.category)
  )
}

// Filter channel data (time series) by selected channels
export function filterChannelData(
  data: GAChannelData[],
  filters: GAFilters
): GAChannelData[] {
  if (filters.channels.length === 0) return data

  // Get the keys that correspond to selected channels
  const selectedKeys = filters.channels
    .map((name) => CHANNEL_NAME_TO_KEY[name])
    .filter(Boolean)

  // If no valid keys, return original data
  if (selectedKeys.length === 0) return data

  // Zero out unselected channels in each data point
  return data.map((item) => {
    const filtered: GAChannelData = {
      date: item.date,
      direct: selectedKeys.includes("direct") ? item.direct : 0,
      paidSearch: selectedKeys.includes("paidSearch") ? item.paidSearch : 0,
      organicSearch: selectedKeys.includes("organicSearch") ? item.organicSearch : 0,
      paidOther: selectedKeys.includes("paidOther") ? item.paidOther : 0,
      referral: selectedKeys.includes("referral") ? item.referral : 0,
      crossNetwork: selectedKeys.includes("crossNetwork") ? item.crossNetwork : 0,
      unassigned: selectedKeys.includes("unassigned") ? item.unassigned : 0,
      organicSocial: selectedKeys.includes("organicSocial") ? item.organicSocial : 0,
    }
    return filtered
  })
}

// Filter traffic share by channel
export function filterTrafficShare(
  data: GATrafficShare[],
  filters: GAFilters
): GATrafficShare[] {
  if (filters.channels.length === 0) return data

  const filtered = data.filter((item) =>
    filters.channels.includes(item.channel)
  )

  // Recalculate percentages based on filtered data
  const totalUsers = filtered.reduce((sum, item) => sum + item.users, 0)

  return filtered.map((item) => ({
    ...item,
    percentage: totalUsers > 0 ? (item.users / totalUsers) * 100 : 0,
  }))
}

// Calculate filtered metrics from raw data
export function calculateFilteredMetrics(
  originalMetrics: GAMetrics | null,
  landingPages: GALandingPage[],
  devices: GADevice[],
  trafficShare: GATrafficShare[],
  filters: GAFilters
): GAMetrics | null {
  if (!originalMetrics) return null

  // If no filters are active, return original metrics
  const hasActiveFilters =
    filters.landingPages.length > 0 ||
    filters.deviceCategories.length > 0 ||
    filters.channels.length > 0

  if (!hasActiveFilters) return originalMetrics

  // Filter data first
  const filteredLandingPages = filterLandingPages(landingPages, filters)
  const filteredDevices = filterDevices(devices, filters)
  const filteredTrafficShare = filterTrafficShare(trafficShare, filters)

  // Calculate totals from filtered landing pages
  const lpTotals = filteredLandingPages.reduce(
    (acc, page) => ({
      totalUsers: acc.totalUsers + page.totalUsers,
      newUsers: acc.newUsers + page.newUsers,
      sessions: acc.sessions + page.sessions,
      views: acc.views + page.views,
      keyEvents: acc.keyEvents + page.keyEvents,
      bounceRateSum: acc.bounceRateSum + (page.bounceRate * page.sessions),
      avgDurationSum: acc.avgDurationSum + (page.avgSessionDuration * page.sessions),
    }),
    { totalUsers: 0, newUsers: 0, sessions: 0, views: 0, keyEvents: 0, bounceRateSum: 0, avgDurationSum: 0 }
  )

  // Calculate device totals
  const deviceTotals = filteredDevices.reduce(
    (acc, device) => ({
      totalUsers: acc.totalUsers + device.totalUsers,
      keyEvents: acc.keyEvents + device.keyEvents,
    }),
    { totalUsers: 0, keyEvents: 0 }
  )

  // Calculate traffic share totals
  const trafficTotals = filteredTrafficShare.reduce(
    (acc, item) => acc + item.users,
    0
  )

  // Determine which data source to use for user counts
  // Priority: device filter active -> use device totals, else landing page totals
  const useDeviceTotals = filters.deviceCategories.length > 0
  const useTrafficTotals = filters.channels.length > 0 && filters.deviceCategories.length === 0 && filters.landingPages.length === 0

  let totalUsers: number
  let keyEvents: number

  if (useDeviceTotals) {
    totalUsers = deviceTotals.totalUsers
    keyEvents = deviceTotals.keyEvents
  } else if (useTrafficTotals) {
    totalUsers = trafficTotals
    // Estimate key events based on original rate
    const originalRate = originalMetrics.totalUsers > 0
      ? originalMetrics.keyEvents / originalMetrics.totalUsers
      : 0
    keyEvents = Math.round(totalUsers * originalRate)
  } else if (filteredLandingPages.length > 0) {
    totalUsers = lpTotals.totalUsers
    keyEvents = lpTotals.keyEvents
  } else {
    // Fallback to original metrics
    return originalMetrics
  }

  // Calculate derived metrics
  const sessions = lpTotals.sessions || Math.round(totalUsers * 1.1)
  const views = lpTotals.views || Math.round(sessions * 1.2)
  const bounceRate = sessions > 0 ? lpTotals.bounceRateSum / sessions : originalMetrics.bounceRate
  const avgSessionDuration = sessions > 0 ? lpTotals.avgDurationSum / sessions : originalMetrics.avgSessionDuration
  const userKeyEventRate = totalUsers > 0 ? keyEvents / totalUsers : 0

  // Estimate new users ratio from original
  const newUserRatio = originalMetrics.totalUsers > 0
    ? originalMetrics.newUsers / originalMetrics.totalUsers
    : 0.9
  const newUsers = Math.round(totalUsers * newUserRatio)

  return {
    totalUsers,
    newUsers,
    sessions,
    views,
    avgSessionDuration,
    bounceRate,
    keyEvents,
    userKeyEventRate,
    // Pass through previous period data unchanged (comparison will be approximate)
    previousPeriod: originalMetrics.previousPeriod,
  }
}

// Extract unique landing page paths with user counts
export function extractLandingPageOptions(
  landingPages: GALandingPage[]
): { value: string; label: string; count: number }[] {
  return landingPages
    .map((page) => ({
      value: page.pagePath,
      label: page.pagePath,
      count: page.totalUsers,
    }))
    .sort((a, b) => b.count - a.count)
}

// Extract device category options
export function extractDeviceOptions(
  devices: GADevice[]
): { value: string; label: string; count: number }[] {
  return devices.map((device) => ({
    value: device.category,
    label: device.category.charAt(0).toUpperCase() + device.category.slice(1),
    count: device.totalUsers,
  }))
}

// Extract channel options from traffic share data
export function extractChannelOptions(
  trafficShare: GATrafficShare[]
): { value: string; label: string; count: number }[] {
  return trafficShare
    .map((item) => ({
      value: item.channel,
      label: item.channel,
      count: item.users,
    }))
    .sort((a, b) => b.count - a.count)
}
