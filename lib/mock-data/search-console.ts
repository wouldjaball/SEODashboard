import type {
  GSCMetrics,
  GSCWeeklyData,
  GSCKeyword,
  GSCLandingPage,
  GSCCountry,
  GSCDeviceData,
  GSCIndexData,
} from "@/lib/types"

// KPI values from PDF specification
export const gscMetrics: GSCMetrics = {
  impressions: 196100,
  clicks: 749,
  ctr: 0.0038, // 0.38%
  avgPosition: 21.48,
  indexedPages: 192,
  rankingKeywords: 7289,
  previousPeriod: {
    impressions: 215710, // -9.1% change
    clicks: 824, // -9.1% change
    ctr: 0.0038,
    avgPosition: 19.8, // +8.5% change (higher is worse)
    indexedPages: 185,
    rankingKeywords: 6890,
  },
}

// Weekly data from PDF - Dec 1 - Jan 4, 2026
export const gscWeeklyData: GSCWeeklyData[] = [
  { weekLabel: "Dec 1-7, 2025 (Week 49)", date: "2025-12-01", impressions: 42000, clicks: 160, ctr: 0.0038 },
  { weekLabel: "Dec 8-14, 2025 (Week 50)", date: "2025-12-08", impressions: 58000, clicks: 220, ctr: 0.0038 },
  { weekLabel: "Dec 15-21, 2025 (Week 51)", date: "2025-12-15", impressions: 48000, clicks: 182, ctr: 0.0038 },
  { weekLabel: "Dec 22-28, 2025 (Week 52)", date: "2025-12-22", impressions: 32000, clicks: 122, ctr: 0.0038 },
  { weekLabel: "Dec 29-Jan 4, 2026 (Week 1)", date: "2025-12-29", impressions: 16100, clicks: 65, ctr: 0.0040 },
]

export const gscIndexData: GSCIndexData[] = [
  { date: "2025-12-01", indexedPages: 185, rankingKeywords: 6890 },
  { date: "2025-12-08", indexedPages: 187, rankingKeywords: 7012 },
  { date: "2025-12-15", indexedPages: 189, rankingKeywords: 7134 },
  { date: "2025-12-22", indexedPages: 190, rankingKeywords: 7200 },
  { date: "2025-12-29", indexedPages: 192, rankingKeywords: 7289 },
]

// Top keywords from PDF
export const gscKeywords: GSCKeyword[] = [
  { query: "vestige view", impressions: 28500, clicks: 185, ctr: 0.0065, avgPosition: 4.2 },
  { query: "body camera systems", impressions: 24200, clicks: 142, ctr: 0.0059, avgPosition: 8.5 },
  { query: "fleet camera solutions", impressions: 21800, clicks: 98, ctr: 0.0045, avgPosition: 12.3 },
  { query: "law enforcement cameras", impressions: 18900, clicks: 76, ctr: 0.0040, avgPosition: 15.8 },
  { query: "vehicle surveillance systems", impressions: 16500, clicks: 54, ctr: 0.0033, avgPosition: 18.2 },
  { query: "body worn camera", impressions: 14200, clicks: 48, ctr: 0.0034, avgPosition: 21.5 },
  { query: "dash cam fleet", impressions: 12800, clicks: 38, ctr: 0.0030, avgPosition: 24.1 },
  { query: "police body camera", impressions: 11500, clicks: 32, ctr: 0.0028, avgPosition: 26.8 },
  { query: "commercial vehicle cameras", impressions: 9800, clicks: 26, ctr: 0.0027, avgPosition: 28.3 },
  { query: "security camera systems", impressions: 8700, clicks: 22, ctr: 0.0025, avgPosition: 31.2 },
  { query: "fleet management cameras", impressions: 7600, clicks: 18, ctr: 0.0024, avgPosition: 34.5 },
  { query: "evidence recording system", impressions: 6400, clicks: 14, ctr: 0.0022, avgPosition: 38.9 },
  { query: "transit camera solutions", impressions: 5200, clicks: 10, ctr: 0.0019, avgPosition: 42.1 },
  { query: "bus camera system", impressions: 4100, clicks: 6, ctr: 0.0015, avgPosition: 45.6 },
]

// Landing pages from PDF
export const gscLandingPages: GSCLandingPage[] = [
  { url: "/", impressions: 58000, clicks: 285, ctr: 0.0049, avgPosition: 12.3 },
  { url: "/products", impressions: 42000, clicks: 168, ctr: 0.0040, avgPosition: 18.5 },
  { url: "/products/body-cameras", impressions: 35000, clicks: 125, ctr: 0.0036, avgPosition: 21.2 },
  { url: "/products/fleet-cameras", impressions: 28000, clicks: 85, ctr: 0.0030, avgPosition: 24.8 },
  { url: "/about", impressions: 18000, clicks: 48, ctr: 0.0027, avgPosition: 28.4 },
  { url: "/contact", impressions: 15100, clicks: 38, ctr: 0.0025, avgPosition: 32.1 },
]

// Countries from PDF
export const gscCountries: GSCCountry[] = [
  { country: "United States", countryCode: "US", impressions: 142000, clicks: 545, ctr: 0.0038 },
  { country: "Canada", countryCode: "CA", impressions: 18500, clicks: 72, ctr: 0.0039 },
  { country: "United Kingdom", countryCode: "GB", impressions: 12800, clicks: 48, ctr: 0.0038 },
  { country: "Australia", countryCode: "AU", impressions: 9200, clicks: 35, ctr: 0.0038 },
  { country: "Germany", countryCode: "DE", impressions: 5400, clicks: 18, ctr: 0.0033 },
  { country: "India", countryCode: "IN", impressions: 4100, clicks: 15, ctr: 0.0037 },
  { country: "Singapore", countryCode: "SG", impressions: 2800, clicks: 10, ctr: 0.0036 },
  { country: "Netherlands", countryCode: "NL", impressions: 1300, clicks: 6, ctr: 0.0046 },
]

// Device data from PDF
export const gscDevices: GSCDeviceData[] = [
  { device: "desktop", impressions: 145000, clicks: 580, ctr: 0.0040 },
  { device: "mobile", impressions: 48000, clicks: 155, ctr: 0.0032 },
  { device: "tablet", impressions: 3100, clicks: 14, ctr: 0.0045 },
]
