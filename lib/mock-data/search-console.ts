import type {
  GSCMetrics,
  GSCWeeklyData,
  GSCKeyword,
  GSCLandingPage,
  GSCCountry,
  GSCDeviceData,
  GSCIndexData,
} from "@/lib/types"

export const gscMetrics: GSCMetrics = {
  impressions: 1245678,
  clicks: 45234,
  ctr: 0.0363,
  avgPosition: 18.4,
  indexedPages: 892,
  rankingKeywords: 7289,
  previousPeriod: {
    impressions: 1134567,
    clicks: 41234,
    ctr: 0.0363,
    avgPosition: 19.2,
    indexedPages: 856,
    rankingKeywords: 6890,
  },
}

export const gscWeeklyData: GSCWeeklyData[] = [
  { weekLabel: "Week 49", date: "2025-12-01", impressions: 178234, clicks: 6234, ctr: 0.035 },
  { weekLabel: "Week 50", date: "2025-12-08", impressions: 185678, clicks: 6789, ctr: 0.0366 },
  { weekLabel: "Week 51", date: "2025-12-15", impressions: 192345, clicks: 7123, ctr: 0.037 },
  { weekLabel: "Week 52", date: "2025-12-22", impressions: 168234, clicks: 5890, ctr: 0.035 },
  { weekLabel: "Week 1", date: "2025-12-29", impressions: 175678, clicks: 6456, ctr: 0.0367 },
  { weekLabel: "Week 2", date: "2026-01-05", impressions: 182345, clicks: 6890, ctr: 0.0378 },
  { weekLabel: "Week 3", date: "2026-01-12", impressions: 163164, clicks: 5852, ctr: 0.0359 },
]

export const gscIndexData: GSCIndexData[] = [
  { date: "2025-12-01", indexedPages: 856, rankingKeywords: 6890 },
  { date: "2025-12-08", indexedPages: 862, rankingKeywords: 6945 },
  { date: "2025-12-15", indexedPages: 871, rankingKeywords: 7034 },
  { date: "2025-12-22", indexedPages: 878, rankingKeywords: 7123 },
  { date: "2025-12-29", indexedPages: 885, rankingKeywords: 7198 },
  { date: "2026-01-05", indexedPages: 892, rankingKeywords: 7289 },
]

export const gscKeywords: GSCKeyword[] = [
  { query: "digital marketing agency", impressions: 45678, clicks: 2345, ctr: 0.0513, avgPosition: 8.2 },
  { query: "seo services", impressions: 38234, clicks: 1890, ctr: 0.0494, avgPosition: 12.4 },
  { query: "ppc management", impressions: 28567, clicks: 1234, ctr: 0.0432, avgPosition: 15.6 },
  { query: "web design company", impressions: 24890, clicks: 1123, ctr: 0.0451, avgPosition: 11.8 },
  { query: "content marketing", impressions: 21234, clicks: 978, ctr: 0.0461, avgPosition: 14.2 },
  { query: "social media marketing", impressions: 18567, clicks: 756, ctr: 0.0407, avgPosition: 18.9 },
  { query: "local seo", impressions: 15890, clicks: 678, ctr: 0.0427, avgPosition: 16.3 },
  { query: "ecommerce seo", impressions: 12345, clicks: 534, ctr: 0.0433, avgPosition: 19.7 },
  { query: "technical seo audit", impressions: 9876, clicks: 456, ctr: 0.0462, avgPosition: 13.5 },
  { query: "link building services", impressions: 8234, clicks: 367, ctr: 0.0446, avgPosition: 21.2 },
  { query: "google ads management", impressions: 7567, clicks: 334, ctr: 0.0441, avgPosition: 17.8 },
  { query: "conversion rate optimization", impressions: 6890, clicks: 289, ctr: 0.0419, avgPosition: 22.4 },
  { query: "email marketing agency", impressions: 5678, clicks: 234, ctr: 0.0412, avgPosition: 24.1 },
  { query: "b2b marketing", impressions: 4890, clicks: 198, ctr: 0.0405, avgPosition: 26.8 },
  { query: "marketing analytics", impressions: 4234, clicks: 167, ctr: 0.0394, avgPosition: 28.3 },
  { query: "brand strategy", impressions: 3567, clicks: 145, ctr: 0.0407, avgPosition: 25.6 },
  { query: "marketing automation", impressions: 2890, clicks: 112, ctr: 0.0388, avgPosition: 31.2 },
  { query: "influencer marketing", impressions: 2345, clicks: 89, ctr: 0.0379, avgPosition: 34.5 },
  { query: "video marketing", impressions: 1890, clicks: 67, ctr: 0.0354, avgPosition: 38.9 },
  { query: "mobile marketing", impressions: 1234, clicks: 45, ctr: 0.0365, avgPosition: 42.1 },
]

export const gscLandingPages: GSCLandingPage[] = [
  { url: "/services/seo", impressions: 234567, clicks: 8934, ctr: 0.0381, avgPosition: 12.3 },
  { url: "/", impressions: 198234, clicks: 7234, ctr: 0.0365, avgPosition: 15.6 },
  { url: "/services", impressions: 156789, clicks: 5678, ctr: 0.0362, avgPosition: 18.2 },
  { url: "/blog", impressions: 134567, clicks: 4890, ctr: 0.0363, avgPosition: 14.7 },
  { url: "/services/ppc", impressions: 112345, clicks: 4123, ctr: 0.0367, avgPosition: 16.9 },
  { url: "/about", impressions: 89234, clicks: 3234, ctr: 0.0362, avgPosition: 19.4 },
  { url: "/case-studies", impressions: 67890, clicks: 2567, ctr: 0.0378, avgPosition: 13.8 },
  { url: "/contact", impressions: 56789, clicks: 2890, ctr: 0.0509, avgPosition: 8.9 },
  { url: "/blog/seo-trends-2026", impressions: 45678, clicks: 1890, ctr: 0.0414, avgPosition: 11.2 },
  { url: "/services/web-design", impressions: 34567, clicks: 1234, ctr: 0.0357, avgPosition: 21.5 },
]

export const gscCountries: GSCCountry[] = [
  { country: "United States", countryCode: "US", impressions: 678234, clicks: 28567, ctr: 0.0421 },
  { country: "United Kingdom", countryCode: "GB", impressions: 178234, clicks: 6789, ctr: 0.0381 },
  { country: "Canada", countryCode: "CA", impressions: 134567, clicks: 4890, ctr: 0.0363 },
  { country: "Australia", countryCode: "AU", impressions: 98234, clicks: 3234, ctr: 0.0329 },
  { country: "Germany", countryCode: "DE", impressions: 56789, clicks: 1234, ctr: 0.0217 },
  { country: "France", countryCode: "FR", impressions: 34567, clicks: 456, ctr: 0.0132 },
  { country: "India", countryCode: "IN", impressions: 28234, clicks: 234, ctr: 0.0083 },
  { country: "Netherlands", countryCode: "NL", impressions: 18234, clicks: 167, ctr: 0.0092 },
  { country: "Spain", countryCode: "ES", impressions: 12345, clicks: 89, ctr: 0.0072 },
  { country: "Brazil", countryCode: "BR", impressions: 6234, clicks: 34, ctr: 0.0055 },
]

export const gscDevices: GSCDeviceData[] = [
  { device: "desktop", impressions: 723456, clicks: 28934, ctr: 0.04 },
  { device: "mobile", impressions: 478234, clicks: 14567, ctr: 0.0305 },
  { device: "tablet", impressions: 43988, clicks: 1733, ctr: 0.0394 },
]
