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

export const gaMetrics: GAMetrics = {
  totalUsers: 45234,
  newUsers: 38567,
  sessions: 62890,
  views: 187456,
  avgSessionDuration: 245, // 4:05
  bounceRate: 0.423,
  keyEvents: 3245,
  userKeyEventRate: 0.0718,
  previousPeriod: {
    totalUsers: 41200,
    newUsers: 35120,
    sessions: 58340,
    views: 172300,
    avgSessionDuration: 232,
    bounceRate: 0.451,
    keyEvents: 2890,
    userKeyEventRate: 0.0702,
  },
}

export const gaWeeklyData: GAWeeklyData[] = [
  { weekLabel: "Dec 1 - Dec 7 (Week 49)", weekNumber: 49, startDate: "2025-12-01", endDate: "2025-12-07", views: 24567, sessions: 8234 },
  { weekLabel: "Dec 8 - Dec 14 (Week 50)", weekNumber: 50, startDate: "2025-12-08", endDate: "2025-12-14", views: 28934, sessions: 9567 },
  { weekLabel: "Dec 15 - Dec 21 (Week 51)", weekNumber: 51, startDate: "2025-12-15", endDate: "2025-12-21", views: 32456, sessions: 10234 },
  { weekLabel: "Dec 22 - Dec 28 (Week 52)", weekNumber: 52, startDate: "2025-12-22", endDate: "2025-12-28", views: 26789, sessions: 8456 },
  { weekLabel: "Dec 29 - Jan 4 (Week 1)", weekNumber: 1, startDate: "2025-12-29", endDate: "2026-01-04", views: 31234, sessions: 9876 },
  { weekLabel: "Jan 5 - Jan 11 (Week 2)", weekNumber: 2, startDate: "2026-01-05", endDate: "2026-01-11", views: 28456, sessions: 9123 },
  { weekLabel: "Jan 12 - Jan 18 (Week 3)", weekNumber: 3, startDate: "2026-01-12", endDate: "2026-01-18", views: 35020, sessions: 11400 },
]

export const gaChannelData: GAChannelData[] = [
  { date: "2025-12-01", direct: 1234, paidSearch: 890, organicSearch: 2345, paidOther: 456, referral: 678, crossNetwork: 234, unassigned: 123, organicSocial: 345 },
  { date: "2025-12-02", direct: 1456, paidSearch: 923, organicSearch: 2567, paidOther: 489, referral: 712, crossNetwork: 267, unassigned: 145, organicSocial: 378 },
  { date: "2025-12-03", direct: 1678, paidSearch: 1045, organicSearch: 2789, paidOther: 512, referral: 756, crossNetwork: 289, unassigned: 167, organicSocial: 412 },
  { date: "2025-12-04", direct: 1534, paidSearch: 978, organicSearch: 2654, paidOther: 478, referral: 723, crossNetwork: 256, unassigned: 156, organicSocial: 389 },
  { date: "2025-12-05", direct: 1789, paidSearch: 1123, organicSearch: 2890, paidOther: 534, referral: 789, crossNetwork: 312, unassigned: 178, organicSocial: 423 },
  { date: "2025-12-06", direct: 1345, paidSearch: 856, organicSearch: 2234, paidOther: 423, referral: 645, crossNetwork: 223, unassigned: 134, organicSocial: 356 },
  { date: "2025-12-07", direct: 1123, paidSearch: 734, organicSearch: 1987, paidOther: 389, referral: 589, crossNetwork: 198, unassigned: 112, organicSocial: 312 },
  { date: "2025-12-08", direct: 1567, paidSearch: 945, organicSearch: 2456, paidOther: 467, referral: 701, crossNetwork: 256, unassigned: 145, organicSocial: 367 },
  { date: "2025-12-09", direct: 1678, paidSearch: 1012, organicSearch: 2678, paidOther: 498, referral: 734, crossNetwork: 278, unassigned: 156, organicSocial: 389 },
  { date: "2025-12-10", direct: 1789, paidSearch: 1089, organicSearch: 2890, paidOther: 523, referral: 767, crossNetwork: 301, unassigned: 167, organicSocial: 412 },
  { date: "2025-12-11", direct: 1890, paidSearch: 1156, organicSearch: 3012, paidOther: 556, referral: 801, crossNetwork: 323, unassigned: 178, organicSocial: 434 },
  { date: "2025-12-12", direct: 1756, paidSearch: 1078, organicSearch: 2867, paidOther: 512, referral: 756, crossNetwork: 289, unassigned: 162, organicSocial: 401 },
  { date: "2025-12-13", direct: 1423, paidSearch: 901, organicSearch: 2345, paidOther: 445, referral: 667, crossNetwork: 234, unassigned: 139, organicSocial: 356 },
  { date: "2025-12-14", direct: 1234, paidSearch: 789, organicSearch: 2123, paidOther: 401, referral: 612, crossNetwork: 212, unassigned: 123, organicSocial: 323 },
]

export const gaTrafficShare: GATrafficShare[] = [
  { channel: "Direct", users: 12456, percentage: 0.275 },
  { channel: "Organic Search", users: 15678, percentage: 0.347 },
  { channel: "Paid Search", users: 6789, percentage: 0.150 },
  { channel: "Referral", users: 4567, percentage: 0.101 },
  { channel: "Organic Social", users: 2890, percentage: 0.064 },
  { channel: "Paid Other", users: 1567, percentage: 0.035 },
  { channel: "Cross-network", users: 890, percentage: 0.020 },
  { channel: "Unassigned", users: 397, percentage: 0.009 },
]

export const gaSourcePerformance: GASourcePerformance[] = [
  { source: "google", totalUsers: 18567, newUsers: 16234, sessions: 24567, views: 78934, avgSessionDuration: 287, bounceRate: 0.398, keyEvents: 1234, conversionRate: 0.0665 },
  { source: "(direct)", totalUsers: 12456, newUsers: 10234, sessions: 15678, views: 45678, avgSessionDuration: 312, bounceRate: 0.356, keyEvents: 890, conversionRate: 0.0714 },
  { source: "bing", totalUsers: 4567, newUsers: 4123, sessions: 5678, views: 16789, avgSessionDuration: 198, bounceRate: 0.456, keyEvents: 345, conversionRate: 0.0755 },
  { source: "facebook", totalUsers: 2890, newUsers: 2567, sessions: 3456, views: 9876, avgSessionDuration: 167, bounceRate: 0.512, keyEvents: 178, conversionRate: 0.0616 },
  { source: "linkedin", totalUsers: 2345, newUsers: 2012, sessions: 2890, views: 8234, avgSessionDuration: 234, bounceRate: 0.423, keyEvents: 156, conversionRate: 0.0665 },
  { source: "twitter", totalUsers: 1567, newUsers: 1345, sessions: 1890, views: 5234, avgSessionDuration: 145, bounceRate: 0.534, keyEvents: 89, conversionRate: 0.0568 },
  { source: "youtube", totalUsers: 1234, newUsers: 1012, sessions: 1456, views: 4123, avgSessionDuration: 189, bounceRate: 0.478, keyEvents: 67, conversionRate: 0.0543 },
  { source: "reddit", totalUsers: 890, newUsers: 789, sessions: 1023, views: 2890, avgSessionDuration: 156, bounceRate: 0.501, keyEvents: 45, conversionRate: 0.0506 },
  { source: "newsletter", totalUsers: 456, newUsers: 234, sessions: 567, views: 1567, avgSessionDuration: 345, bounceRate: 0.312, keyEvents: 78, conversionRate: 0.171 },
  { source: "partner_site", totalUsers: 229, newUsers: 178, sessions: 285, views: 857, avgSessionDuration: 267, bounceRate: 0.389, keyEvents: 34, conversionRate: 0.148 },
]

export const gaLandingPages: GALandingPage[] = [
  { pageTitle: "Home | Vestige Digital", pagePath: "/", totalUsers: 15678, newUsers: 13456, sessions: 18934, views: 23456, avgSessionDuration: 45, bounceRate: 0.523, keyEvents: 234, conversionRate: 0.0149 },
  { pageTitle: "Services | Vestige Digital", pagePath: "/services", totalUsers: 8934, newUsers: 7654, sessions: 10234, views: 15678, avgSessionDuration: 178, bounceRate: 0.412, keyEvents: 456, conversionRate: 0.051 },
  { pageTitle: "About Us | Vestige Digital", pagePath: "/about", totalUsers: 5678, newUsers: 4890, sessions: 6789, views: 9234, avgSessionDuration: 234, bounceRate: 0.378, keyEvents: 123, conversionRate: 0.0217 },
  { pageTitle: "Blog | Vestige Digital", pagePath: "/blog", totalUsers: 4567, newUsers: 3890, sessions: 5678, views: 12345, avgSessionDuration: 312, bounceRate: 0.289, keyEvents: 189, conversionRate: 0.0414 },
  { pageTitle: "Contact | Vestige Digital", pagePath: "/contact", totalUsers: 3456, newUsers: 2890, sessions: 4123, views: 5678, avgSessionDuration: 156, bounceRate: 0.234, keyEvents: 567, conversionRate: 0.164 },
  { pageTitle: "SEO Services | Vestige Digital", pagePath: "/services/seo", totalUsers: 2890, newUsers: 2456, sessions: 3456, views: 6789, avgSessionDuration: 267, bounceRate: 0.356, keyEvents: 234, conversionRate: 0.081 },
  { pageTitle: "PPC Management | Vestige Digital", pagePath: "/services/ppc", totalUsers: 2345, newUsers: 1987, sessions: 2789, views: 5234, avgSessionDuration: 245, bounceRate: 0.389, keyEvents: 189, conversionRate: 0.0806 },
  { pageTitle: "Case Studies | Vestige Digital", pagePath: "/case-studies", totalUsers: 1890, newUsers: 1567, sessions: 2234, views: 4567, avgSessionDuration: 345, bounceRate: 0.312, keyEvents: 145, conversionRate: 0.0767 },
  { pageTitle: "Web Design | Vestige Digital", pagePath: "/services/web-design", totalUsers: 1567, newUsers: 1345, sessions: 1890, views: 3456, avgSessionDuration: 223, bounceRate: 0.401, keyEvents: 112, conversionRate: 0.0715 },
  { pageTitle: "Resources | Vestige Digital", pagePath: "/resources", totalUsers: 1234, newUsers: 1012, sessions: 1456, views: 3890, avgSessionDuration: 289, bounceRate: 0.334, keyEvents: 89, conversionRate: 0.0721 },
]

export const gaRegions: GARegion[] = [
  { country: "United States", countryCode: "US", totalUsers: 28567, keyEvents: 2134 },
  { country: "United Kingdom", countryCode: "GB", totalUsers: 5678, keyEvents: 423 },
  { country: "Canada", countryCode: "CA", totalUsers: 3456, keyEvents: 267 },
  { country: "Australia", countryCode: "AU", totalUsers: 2890, keyEvents: 198 },
  { country: "Germany", countryCode: "DE", totalUsers: 1567, keyEvents: 89 },
  { country: "France", countryCode: "FR", totalUsers: 1234, keyEvents: 67 },
  { country: "India", countryCode: "IN", totalUsers: 890, keyEvents: 34 },
  { country: "Netherlands", countryCode: "NL", totalUsers: 567, keyEvents: 23 },
  { country: "Spain", countryCode: "ES", totalUsers: 234, keyEvents: 8 },
  { country: "Brazil", countryCode: "BR", totalUsers: 151, keyEvents: 2 },
]

export const gaDevices: GADevice[] = [
  { category: "desktop", totalUsers: 27890, keyEvents: 2156 },
  { category: "mobile", totalUsers: 15234, keyEvents: 978 },
  { category: "tablet", totalUsers: 2110, keyEvents: 111 },
]

export const gaGender: GADemographic[] = [
  { segment: "Male", totalUsers: 24567, keyEvents: 1789 },
  { segment: "Female", totalUsers: 18234, keyEvents: 1345 },
  { segment: "Unknown", totalUsers: 2433, keyEvents: 111 },
]

export const gaAge: GADemographic[] = [
  { segment: "18-24", totalUsers: 6789, keyEvents: 456 },
  { segment: "25-34", totalUsers: 14567, keyEvents: 1123 },
  { segment: "35-44", totalUsers: 11234, keyEvents: 867 },
  { segment: "45-54", totalUsers: 7890, keyEvents: 534 },
  { segment: "55-64", totalUsers: 3456, keyEvents: 198 },
  { segment: "65+", totalUsers: 1298, keyEvents: 67 },
]
