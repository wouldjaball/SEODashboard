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

// KPI values from PDF specification
export const gaMetrics: GAMetrics = {
  totalUsers: 9100,
  newUsers: 8881,
  sessions: 10000,
  views: 11955,
  avgSessionDuration: 235, // 3:55 in seconds
  bounceRate: 0.515, // 51.50%
  keyEvents: 128,
  userKeyEventRate: 0.0085, // 0.85%
  previousPeriod: {
    totalUsers: 10000, // -9.0% change
    newUsers: 9880, // -10.1% change
    sessions: 10906, // -8.3% change
    views: 12665, // -5.6% change
    avgSessionDuration: 98, // +138.3% change
    bounceRate: 0.4828, // +6.7% change (inverted - higher bounce is worse)
    keyEvents: 164, // -22.0% change
    userKeyEventRate: 0.0125, // -31.8% change
  },
}

// Weekly data from PDF
export const gaWeeklyData: GAWeeklyData[] = [
  { weekLabel: "Dec 1-7, 2025 (Week 49)", weekNumber: 49, startDate: "2025-12-01", endDate: "2025-12-07", views: 2000, sessions: 1669 },
  { weekLabel: "Dec 8-14, 2025 (Week 50)", weekNumber: 50, startDate: "2025-12-08", endDate: "2025-12-14", views: 4200, sessions: 3491 },
  { weekLabel: "Dec 15-21, 2025 (Week 51)", weekNumber: 51, startDate: "2025-12-15", endDate: "2025-12-21", views: 2800, sessions: 2242 },
  { weekLabel: "Dec 22-28, 2025 (Week 52)", weekNumber: 52, startDate: "2025-12-22", endDate: "2025-12-28", views: 2100, sessions: 1775 },
  { weekLabel: "Dec 29-Jan 4, 2026 (Week 1)", weekNumber: 1, startDate: "2025-12-29", endDate: "2026-01-04", views: 912, sessions: 740 },
]

// Channel data for stacked area chart
export const gaChannelData: GAChannelData[] = [
  { date: "2025-12-01", direct: 800, paidSearch: 150, organicSearch: 400, paidOther: 50, referral: 100, crossNetwork: 30, unassigned: 20, organicSocial: 50 },
  { date: "2025-12-02", direct: 850, paidSearch: 180, organicSearch: 450, paidOther: 60, referral: 120, crossNetwork: 35, unassigned: 25, organicSocial: 60 },
  { date: "2025-12-03", direct: 900, paidSearch: 200, organicSearch: 480, paidOther: 70, referral: 130, crossNetwork: 40, unassigned: 30, organicSocial: 70 },
  { date: "2025-12-04", direct: 820, paidSearch: 170, organicSearch: 420, paidOther: 55, referral: 110, crossNetwork: 32, unassigned: 22, organicSocial: 55 },
  { date: "2025-12-05", direct: 780, paidSearch: 160, organicSearch: 400, paidOther: 48, referral: 105, crossNetwork: 28, unassigned: 18, organicSocial: 48 },
  { date: "2025-12-06", direct: 600, paidSearch: 120, organicSearch: 320, paidOther: 35, referral: 80, crossNetwork: 20, unassigned: 12, organicSocial: 35 },
  { date: "2025-12-07", direct: 550, paidSearch: 100, organicSearch: 280, paidOther: 30, referral: 70, crossNetwork: 18, unassigned: 10, organicSocial: 30 },
  { date: "2025-12-08", direct: 1200, paidSearch: 250, organicSearch: 600, paidOther: 80, referral: 150, crossNetwork: 45, unassigned: 35, organicSocial: 80 },
  { date: "2025-12-09", direct: 1100, paidSearch: 230, organicSearch: 550, paidOther: 75, referral: 140, crossNetwork: 42, unassigned: 32, organicSocial: 75 },
  { date: "2025-12-10", direct: 1050, paidSearch: 220, organicSearch: 520, paidOther: 70, referral: 135, crossNetwork: 40, unassigned: 30, organicSocial: 70 },
  { date: "2025-12-11", direct: 980, paidSearch: 200, organicSearch: 480, paidOther: 65, referral: 125, crossNetwork: 38, unassigned: 28, organicSocial: 65 },
  { date: "2025-12-12", direct: 920, paidSearch: 190, organicSearch: 460, paidOther: 60, referral: 120, crossNetwork: 35, unassigned: 25, organicSocial: 60 },
  { date: "2025-12-13", direct: 700, paidSearch: 140, organicSearch: 350, paidOther: 45, referral: 90, crossNetwork: 25, unassigned: 18, organicSocial: 45 },
  { date: "2025-12-14", direct: 650, paidSearch: 130, organicSearch: 320, paidOther: 40, referral: 85, crossNetwork: 22, unassigned: 15, organicSocial: 40 },
]

// Traffic share by channel
export const gaTrafficShare: GATrafficShare[] = [
  { channel: "Direct", users: 5921, percentage: 0.651 },
  { channel: "Organic Search", users: 2259, percentage: 0.248 },
  { channel: "Paid Search", users: 658, percentage: 0.072 },
  { channel: "Referral", users: 127, percentage: 0.014 },
  { channel: "Organic Social", users: 50, percentage: 0.006 },
  { channel: "Unassigned", users: 45, percentage: 0.005 },
  { channel: "Cross-network", users: 25, percentage: 0.003 },
  { channel: "Paid Other", users: 15, percentage: 0.002 },
]

// Source performance from PDF
export const gaSourcePerformance: GASourcePerformance[] = [
  { source: "(direct)", totalUsers: 5921, newUsers: 5822, sessions: 6352, views: 6859, avgSessionDuration: 60, bounceRate: 0.6368, keyEvents: 19, conversionRate: 0 },
  { source: "google", totalUsers: 2259, newUsers: 2200, sessions: 2610, views: 3453, avgSessionDuration: 606, bounceRate: 0.3387, keyEvents: 63, conversionRate: 0 },
  { source: "localiq", totalUsers: 658, newUsers: 658, sessions: 700, views: 881, avgSessionDuration: 131, bounceRate: 0.3014, keyEvents: 19, conversionRate: 0 },
  { source: "bing", totalUsers: 127, newUsers: 103, sessions: 221, views: 387, avgSessionDuration: 1116, bounceRate: 0.3891, keyEvents: 1, conversionRate: 0 },
  { source: "(data not available)", totalUsers: 21, newUsers: 19, sessions: 21, views: 50, avgSessionDuration: 104, bounceRate: 0.3333, keyEvents: 4, conversionRate: 0 },
  { source: "yahoo", totalUsers: 19, newUsers: 18, sessions: 21, views: 43, avgSessionDuration: 105, bounceRate: 0.0952, keyEvents: 1, conversionRate: 0 },
  { source: "chatgpt.com", totalUsers: 13, newUsers: 13, sessions: 17, views: 15, avgSessionDuration: 188, bounceRate: 0.2941, keyEvents: 0, conversionRate: 0 },
  { source: "(not set)", totalUsers: 8, newUsers: 8, sessions: 16, views: 40, avgSessionDuration: 426, bounceRate: 0.125, keyEvents: 0, conversionRate: 0 },
  { source: "transit-technologies.com", totalUsers: 8, newUsers: 7, sessions: 8, views: 13, avgSessionDuration: 157, bounceRate: 0, keyEvents: 0, conversionRate: 0 },
  { source: "duckduckgo", totalUsers: 7, newUsers: 7, sessions: 8, views: 19, avgSessionDuration: 625, bounceRate: 0, keyEvents: 0, conversionRate: 0 },
]

// Landing pages from PDF
export const gaLandingPages: GALandingPage[] = [
  { pageTitle: "Home - Vestige View", pagePath: "/", totalUsers: 4500, newUsers: 4200, sessions: 5000, views: 5500, avgSessionDuration: 45, bounceRate: 0.55, keyEvents: 45, conversionRate: 0.01 },
  { pageTitle: "Products - Vestige View", pagePath: "/products", totalUsers: 1800, newUsers: 1650, sessions: 2000, views: 2800, avgSessionDuration: 120, bounceRate: 0.42, keyEvents: 28, conversionRate: 0.016 },
  { pageTitle: "Body Cameras - Vestige View", pagePath: "/products/body-cameras", totalUsers: 1200, newUsers: 1100, sessions: 1400, views: 1900, avgSessionDuration: 180, bounceRate: 0.38, keyEvents: 22, conversionRate: 0.018 },
  { pageTitle: "Fleet Cameras - Vestige View", pagePath: "/products/fleet-cameras", totalUsers: 800, newUsers: 750, sessions: 900, views: 1200, avgSessionDuration: 150, bounceRate: 0.40, keyEvents: 15, conversionRate: 0.019 },
  { pageTitle: "About Us - Vestige View", pagePath: "/about", totalUsers: 500, newUsers: 450, sessions: 550, views: 700, avgSessionDuration: 90, bounceRate: 0.45, keyEvents: 8, conversionRate: 0.016 },
  { pageTitle: "Contact - Vestige View", pagePath: "/contact", totalUsers: 300, newUsers: 280, sessions: 350, views: 400, avgSessionDuration: 60, bounceRate: 0.35, keyEvents: 10, conversionRate: 0.033 },
]

// Region data from PDF
export const gaRegions: GARegion[] = [
  { country: "United States", countryCode: "US", totalUsers: 5280, keyEvents: 0 },
  { country: "China", countryCode: "CN", totalUsers: 2333, keyEvents: 0 },
  { country: "Singapore", countryCode: "SG", totalUsers: 1399, keyEvents: 0 },
  { country: "India", countryCode: "IN", totalUsers: 133, keyEvents: 0 },
  { country: "Indonesia", countryCode: "ID", totalUsers: 88, keyEvents: 0 },
  { country: "Vietnam", countryCode: "VN", totalUsers: 59, keyEvents: 0 },
  { country: "Germany", countryCode: "DE", totalUsers: 49, keyEvents: 0 },
  { country: "United Arab Emirates", countryCode: "AE", totalUsers: 45, keyEvents: 0 },
  { country: "Ghana", countryCode: "GH", totalUsers: 43, keyEvents: 0 },
  { country: "Japan", countryCode: "JP", totalUsers: 43, keyEvents: 0 },
]

// Device data from PDF
export const gaDevices: GADevice[] = [
  { category: "desktop", totalUsers: 6990, keyEvents: 100 },
  { category: "mobile", totalUsers: 2035, keyEvents: 24 },
  { category: "tablet", totalUsers: 74, keyEvents: 4 },
]

// Gender data from PDF
export const gaGender: GADemographic[] = [
  { segment: "Male", totalUsers: 555, keyEvents: 33 },
  { segment: "Female", totalUsers: 364, keyEvents: 19 },
]

// Age data from PDF
export const gaAge: GADemographic[] = [
  { segment: "18-24", totalUsers: 131, keyEvents: 9 },
  { segment: "25-34", totalUsers: 191, keyEvents: 9 },
  { segment: "35-44", totalUsers: 176, keyEvents: 8 },
  { segment: "45-54", totalUsers: 172, keyEvents: 14 },
  { segment: "55-64", totalUsers: 93, keyEvents: 1 },
]
