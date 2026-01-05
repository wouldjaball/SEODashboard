export const chartColors = {
  primary: '#22c55e',      // Green (Vestige brand)
  secondary: '#3b82f6',    // Blue
  tertiary: '#f59e0b',     // Amber
  quaternary: '#8b5cf6',   // Purple
  muted: '#6b7280',        // Gray
  positive: '#22c55e',     // Green for positive changes
  negative: '#ef4444',     // Red for negative changes

  // Channel colors (GA)
  direct: '#3b82f6',
  paidSearch: '#22c55e',
  organicSearch: '#f59e0b',
  paidOther: '#8b5cf6',
  referral: '#ec4899',
  crossNetwork: '#14b8a6',
  unassigned: '#6b7280',
  organicSocial: '#f97316',
} as const

export const chartColorArray = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.tertiary,
  chartColors.quaternary,
  chartColors.referral,
  chartColors.crossNetwork,
  chartColors.muted,
  chartColors.organicSocial,
]

export const channelColors: Record<string, string> = {
  Direct: chartColors.direct,
  'Paid Search': chartColors.paidSearch,
  'Organic Search': chartColors.organicSearch,
  'Paid Other': chartColors.paidOther,
  Referral: chartColors.referral,
  'Cross-network': chartColors.crossNetwork,
  Unassigned: chartColors.unassigned,
  'Organic Social': chartColors.organicSocial,
}
