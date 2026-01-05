import type { Company } from "@/lib/types"
import {
  gaMetrics,
  gaWeeklyData,
  gaChannelData,
  gaTrafficShare,
  gaSourcePerformance,
  gaLandingPages,
  gaRegions,
  gaDevices,
  gaGender,
  gaAge,
} from "./google-analytics"
import {
  gscMetrics,
  gscWeeklyData,
  gscIndexData,
  gscKeywords,
  gscLandingPages,
  gscCountries,
  gscDevices,
} from "./search-console"
import {
  ytMetrics,
  ytVideos,
  ytViewsSparkline,
  ytWatchTimeSparkline,
  ytSharesSparkline,
  ytLikesSparkline,
} from "./youtube"
import {
  liVisitorMetrics,
  liFollowerMetrics,
  liContentMetrics,
  liVisitorDaily,
  liFollowerDaily,
  liImpressionDaily,
  liIndustryDemographics,
  liSeniorityDemographics,
  liJobFunctionDemographics,
  liCompanySizeDemographics,
  liUpdates,
} from "./linkedin"

// Helper to scale numeric values with some randomness
function scale(value: number, factor: number, variance: number = 0.1): number {
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance
  return Math.round(value * factor * randomFactor)
}

// Helper to scale an object's numeric properties (preserves type)
function scaleObject<T>(obj: T, factor: number): T {
  if (typeof obj !== "object" || obj === null) return obj
  const result = { ...obj } as T
  for (const key in result) {
    const value = result[key]
    if (typeof value === "number") {
      (result as Record<string, unknown>)[key] = scale(value, factor)
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = scaleObject(value, factor)
    }
  }
  return result
}

// Helper to scale an array of objects
function scaleArray<T>(arr: T[], factor: number): T[] {
  return arr.map(item => scaleObject(item, factor))
}

// Vestige View - Original data (factor 1.0)
const vestigeView: Company = {
  id: "vestige-view",
  name: "Vestige View",
  industry: "Security Technology",
  color: "#22c55e", // Green
  gaMetrics,
  gaWeeklyData,
  gaChannelData,
  gaTrafficShare,
  gaSourcePerformance,
  gaLandingPages,
  gaRegions,
  gaDevices,
  gaGender,
  gaAge,
  gscMetrics,
  gscWeeklyData,
  gscIndexData,
  gscKeywords,
  gscLandingPages,
  gscCountries,
  gscDevices,
  ytMetrics,
  ytVideos,
  ytViewsSparkline,
  ytWatchTimeSparkline,
  ytSharesSparkline,
  ytLikesSparkline,
  liVisitorMetrics,
  liFollowerMetrics,
  liContentMetrics,
  liVisitorDaily,
  liFollowerDaily,
  liImpressionDaily,
  liIndustryDemographics,
  liSeniorityDemographics,
  liJobFunctionDemographics,
  liCompanySizeDemographics,
  liUpdates,
}

// Acme Corp - Tech startup (factor 1.5)
const acmeCorp: Company = {
  id: "acme-corp",
  name: "Acme Corp",
  industry: "Software & SaaS",
  color: "#3b82f6", // Blue
  gaMetrics: scaleObject(gaMetrics, 1.5),
  gaWeeklyData: scaleArray(gaWeeklyData, 1.5),
  gaChannelData: scaleArray(gaChannelData, 1.5),
  gaTrafficShare: gaTrafficShare.map(t => ({ ...t, users: scale(t.users, 1.5) })),
  gaSourcePerformance: scaleArray(gaSourcePerformance, 1.5),
  gaLandingPages: gaLandingPages.map(p => ({
    ...scaleObject(p, 1.5),
    pageTitle: p.pageTitle.replace("Vestige View", "Acme Corp"),
  })),
  gaRegions: scaleArray(gaRegions, 1.5),
  gaDevices: scaleArray(gaDevices, 1.5),
  gaGender: scaleArray(gaGender, 1.5),
  gaAge: scaleArray(gaAge, 1.5),
  gscMetrics: scaleObject(gscMetrics, 1.5),
  gscWeeklyData: scaleArray(gscWeeklyData, 1.5),
  gscIndexData: scaleArray(gscIndexData, 1.5),
  gscKeywords: gscKeywords.map(k => ({
    ...scaleObject(k, 1.5),
    query: k.query.replace(/vestige|body camera|fleet/gi, match => {
      const replacements: Record<string, string> = { vestige: "acme", "body camera": "cloud software", fleet: "enterprise" }
      return replacements[match.toLowerCase()] || match
    }),
  })),
  gscLandingPages: scaleArray(gscLandingPages, 1.5),
  gscCountries: scaleArray(gscCountries, 1.5),
  gscDevices: scaleArray(gscDevices, 1.5),
  ytMetrics: scaleObject(ytMetrics, 1.5),
  ytVideos: ytVideos.map(v => ({
    ...scaleObject(v, 1.5),
    title: v.title.replace(/Vestige|Body Camera|Fleet/gi, match => {
      const replacements: Record<string, string> = { Vestige: "Acme", "Body Camera": "Cloud Platform", Fleet: "Enterprise" }
      return replacements[match] || match
    }),
  })),
  ytViewsSparkline: ytViewsSparkline.map(v => scale(v, 1.5)),
  ytWatchTimeSparkline: ytWatchTimeSparkline.map(v => scale(v, 1.5)),
  ytSharesSparkline: ytSharesSparkline.map(v => scale(v, 1.5)),
  ytLikesSparkline: ytLikesSparkline.map(v => scale(v, 1.5)),
  liVisitorMetrics: scaleObject(liVisitorMetrics, 1.5),
  liFollowerMetrics: scaleObject(liFollowerMetrics, 1.5),
  liContentMetrics: scaleObject(liContentMetrics, 1.5),
  liVisitorDaily: scaleArray(liVisitorDaily, 1.5),
  liFollowerDaily: scaleArray(liFollowerDaily, 1.5),
  liImpressionDaily: scaleArray(liImpressionDaily, 1.5),
  liIndustryDemographics: scaleArray(liIndustryDemographics, 1.5),
  liSeniorityDemographics: scaleArray(liSeniorityDemographics, 1.5),
  liJobFunctionDemographics: scaleArray(liJobFunctionDemographics, 1.5),
  liCompanySizeDemographics: scaleArray(liCompanySizeDemographics, 1.5),
  liUpdates: liUpdates.map(u => ({
    ...scaleObject(u, 1.5),
    title: u.title.replace(/Vestige/gi, "Acme"),
  })),
}

// GlobalTech Industries - Large enterprise (factor 3.0)
const globalTech: Company = {
  id: "globaltech",
  name: "GlobalTech Industries",
  industry: "Manufacturing",
  color: "#f97316", // Orange
  gaMetrics: scaleObject(gaMetrics, 3.0),
  gaWeeklyData: scaleArray(gaWeeklyData, 3.0),
  gaChannelData: scaleArray(gaChannelData, 3.0),
  gaTrafficShare: gaTrafficShare.map(t => ({ ...t, users: scale(t.users, 3.0) })),
  gaSourcePerformance: scaleArray(gaSourcePerformance, 3.0),
  gaLandingPages: gaLandingPages.map(p => ({
    ...scaleObject(p, 3.0),
    pageTitle: p.pageTitle.replace("Vestige View", "GlobalTech Industries"),
  })),
  gaRegions: scaleArray(gaRegions, 3.0),
  gaDevices: scaleArray(gaDevices, 3.0),
  gaGender: scaleArray(gaGender, 3.0),
  gaAge: scaleArray(gaAge, 3.0),
  gscMetrics: scaleObject(gscMetrics, 3.0),
  gscWeeklyData: scaleArray(gscWeeklyData, 3.0),
  gscIndexData: scaleArray(gscIndexData, 3.0),
  gscKeywords: gscKeywords.map(k => ({
    ...scaleObject(k, 3.0),
    query: k.query.replace(/vestige|body camera|fleet/gi, match => {
      const replacements: Record<string, string> = { vestige: "globaltech", "body camera": "industrial equipment", fleet: "manufacturing" }
      return replacements[match.toLowerCase()] || match
    }),
  })),
  gscLandingPages: scaleArray(gscLandingPages, 3.0),
  gscCountries: scaleArray(gscCountries, 3.0),
  gscDevices: scaleArray(gscDevices, 3.0),
  ytMetrics: scaleObject(ytMetrics, 3.0),
  ytVideos: ytVideos.map(v => ({
    ...scaleObject(v, 3.0),
    title: v.title.replace(/Vestige|Body Camera|Fleet/gi, match => {
      const replacements: Record<string, string> = { Vestige: "GlobalTech", "Body Camera": "Smart Factory", Fleet: "Industrial" }
      return replacements[match] || match
    }),
  })),
  ytViewsSparkline: ytViewsSparkline.map(v => scale(v, 3.0)),
  ytWatchTimeSparkline: ytWatchTimeSparkline.map(v => scale(v, 3.0)),
  ytSharesSparkline: ytSharesSparkline.map(v => scale(v, 3.0)),
  ytLikesSparkline: ytLikesSparkline.map(v => scale(v, 3.0)),
  liVisitorMetrics: scaleObject(liVisitorMetrics, 3.0),
  liFollowerMetrics: scaleObject(liFollowerMetrics, 3.0),
  liContentMetrics: scaleObject(liContentMetrics, 3.0),
  liVisitorDaily: scaleArray(liVisitorDaily, 3.0),
  liFollowerDaily: scaleArray(liFollowerDaily, 3.0),
  liImpressionDaily: scaleArray(liImpressionDaily, 3.0),
  liIndustryDemographics: scaleArray(liIndustryDemographics, 3.0),
  liSeniorityDemographics: scaleArray(liSeniorityDemographics, 3.0),
  liJobFunctionDemographics: scaleArray(liJobFunctionDemographics, 3.0),
  liCompanySizeDemographics: scaleArray(liCompanySizeDemographics, 3.0),
  liUpdates: liUpdates.map(u => ({
    ...scaleObject(u, 3.0),
    title: u.title.replace(/Vestige/gi, "GlobalTech"),
  })),
}

// Bloom Wellness - Small business (factor 0.4)
const bloomWellness: Company = {
  id: "bloom-wellness",
  name: "Bloom Wellness",
  industry: "Health & Wellness",
  color: "#ec4899", // Pink
  gaMetrics: scaleObject(gaMetrics, 0.4),
  gaWeeklyData: scaleArray(gaWeeklyData, 0.4),
  gaChannelData: scaleArray(gaChannelData, 0.4),
  gaTrafficShare: gaTrafficShare.map(t => ({ ...t, users: scale(t.users, 0.4) })),
  gaSourcePerformance: scaleArray(gaSourcePerformance, 0.4),
  gaLandingPages: gaLandingPages.map(p => ({
    ...scaleObject(p, 0.4),
    pageTitle: p.pageTitle.replace("Vestige View", "Bloom Wellness"),
  })),
  gaRegions: scaleArray(gaRegions, 0.4),
  gaDevices: scaleArray(gaDevices, 0.4),
  gaGender: scaleArray(gaGender, 0.4),
  gaAge: scaleArray(gaAge, 0.4),
  gscMetrics: scaleObject(gscMetrics, 0.4),
  gscWeeklyData: scaleArray(gscWeeklyData, 0.4),
  gscIndexData: scaleArray(gscIndexData, 0.4),
  gscKeywords: gscKeywords.map(k => ({
    ...scaleObject(k, 0.4),
    query: k.query.replace(/vestige|body camera|fleet/gi, match => {
      const replacements: Record<string, string> = { vestige: "bloom", "body camera": "yoga classes", fleet: "wellness" }
      return replacements[match.toLowerCase()] || match
    }),
  })),
  gscLandingPages: scaleArray(gscLandingPages, 0.4),
  gscCountries: scaleArray(gscCountries, 0.4),
  gscDevices: scaleArray(gscDevices, 0.4),
  ytMetrics: scaleObject(ytMetrics, 0.4),
  ytVideos: ytVideos.map(v => ({
    ...scaleObject(v, 0.4),
    title: v.title.replace(/Vestige|Body Camera|Fleet/gi, match => {
      const replacements: Record<string, string> = { Vestige: "Bloom", "Body Camera": "Yoga Session", Fleet: "Wellness" }
      return replacements[match] || match
    }),
  })),
  ytViewsSparkline: ytViewsSparkline.map(v => scale(v, 0.4)),
  ytWatchTimeSparkline: ytWatchTimeSparkline.map(v => scale(v, 0.4)),
  ytSharesSparkline: ytSharesSparkline.map(v => scale(v, 0.4)),
  ytLikesSparkline: ytLikesSparkline.map(v => scale(v, 0.4)),
  liVisitorMetrics: scaleObject(liVisitorMetrics, 0.4),
  liFollowerMetrics: scaleObject(liFollowerMetrics, 0.4),
  liContentMetrics: scaleObject(liContentMetrics, 0.4),
  liVisitorDaily: scaleArray(liVisitorDaily, 0.4),
  liFollowerDaily: scaleArray(liFollowerDaily, 0.4),
  liImpressionDaily: scaleArray(liImpressionDaily, 0.4),
  liIndustryDemographics: scaleArray(liIndustryDemographics, 0.4),
  liSeniorityDemographics: scaleArray(liSeniorityDemographics, 0.4),
  liJobFunctionDemographics: scaleArray(liJobFunctionDemographics, 0.4),
  liCompanySizeDemographics: scaleArray(liCompanySizeDemographics, 0.4),
  liUpdates: liUpdates.map(u => ({
    ...scaleObject(u, 0.4),
    title: u.title.replace(/Vestige/gi, "Bloom"),
  })),
}

// Nexus Financial - Finance company (factor 2.2)
const nexusFinancial: Company = {
  id: "nexus-financial",
  name: "Nexus Financial",
  industry: "Financial Services",
  color: "#6366f1", // Indigo
  gaMetrics: scaleObject(gaMetrics, 2.2),
  gaWeeklyData: scaleArray(gaWeeklyData, 2.2),
  gaChannelData: scaleArray(gaChannelData, 2.2),
  gaTrafficShare: gaTrafficShare.map(t => ({ ...t, users: scale(t.users, 2.2) })),
  gaSourcePerformance: scaleArray(gaSourcePerformance, 2.2),
  gaLandingPages: gaLandingPages.map(p => ({
    ...scaleObject(p, 2.2),
    pageTitle: p.pageTitle.replace("Vestige View", "Nexus Financial"),
  })),
  gaRegions: scaleArray(gaRegions, 2.2),
  gaDevices: scaleArray(gaDevices, 2.2),
  gaGender: scaleArray(gaGender, 2.2),
  gaAge: scaleArray(gaAge, 2.2),
  gscMetrics: scaleObject(gscMetrics, 2.2),
  gscWeeklyData: scaleArray(gscWeeklyData, 2.2),
  gscIndexData: scaleArray(gscIndexData, 2.2),
  gscKeywords: gscKeywords.map(k => ({
    ...scaleObject(k, 2.2),
    query: k.query.replace(/vestige|body camera|fleet/gi, match => {
      const replacements: Record<string, string> = { vestige: "nexus", "body camera": "investment", fleet: "banking" }
      return replacements[match.toLowerCase()] || match
    }),
  })),
  gscLandingPages: scaleArray(gscLandingPages, 2.2),
  gscCountries: scaleArray(gscCountries, 2.2),
  gscDevices: scaleArray(gscDevices, 2.2),
  ytMetrics: scaleObject(ytMetrics, 2.2),
  ytVideos: ytVideos.map(v => ({
    ...scaleObject(v, 2.2),
    title: v.title.replace(/Vestige|Body Camera|Fleet/gi, match => {
      const replacements: Record<string, string> = { Vestige: "Nexus", "Body Camera": "Investment Guide", Fleet: "Financial" }
      return replacements[match] || match
    }),
  })),
  ytViewsSparkline: ytViewsSparkline.map(v => scale(v, 2.2)),
  ytWatchTimeSparkline: ytWatchTimeSparkline.map(v => scale(v, 2.2)),
  ytSharesSparkline: ytSharesSparkline.map(v => scale(v, 2.2)),
  ytLikesSparkline: ytLikesSparkline.map(v => scale(v, 2.2)),
  liVisitorMetrics: scaleObject(liVisitorMetrics, 2.2),
  liFollowerMetrics: scaleObject(liFollowerMetrics, 2.2),
  liContentMetrics: scaleObject(liContentMetrics, 2.2),
  liVisitorDaily: scaleArray(liVisitorDaily, 2.2),
  liFollowerDaily: scaleArray(liFollowerDaily, 2.2),
  liImpressionDaily: scaleArray(liImpressionDaily, 2.2),
  liIndustryDemographics: scaleArray(liIndustryDemographics, 2.2),
  liSeniorityDemographics: scaleArray(liSeniorityDemographics, 2.2),
  liJobFunctionDemographics: scaleArray(liJobFunctionDemographics, 2.2),
  liCompanySizeDemographics: scaleArray(liCompanySizeDemographics, 2.2),
  liUpdates: liUpdates.map(u => ({
    ...scaleObject(u, 2.2),
    title: u.title.replace(/Vestige/gi, "Nexus"),
  })),
}

// Export all companies
export const companies: Company[] = [
  vestigeView,
  acmeCorp,
  globalTech,
  bloomWellness,
  nexusFinancial,
]

// Default company
export const defaultCompany = vestigeView
