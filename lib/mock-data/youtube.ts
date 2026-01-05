import type {
  YTMetrics,
  YTVideo,
  YTDailyData,
} from "@/lib/types"

// KPI values from PDF specification - Vestige View YouTube Channel
export const ytMetrics: YTMetrics = {
  views: 1245,
  totalWatchTime: 4320, // 72 hours in seconds (4320 minutes)
  shares: 18,
  avgViewDuration: 208, // 3:28 in seconds
  likes: 45,
  dislikes: 2,
  comments: 12,
  subscriptions: 8,
  previousPeriod: {
    views: 1120, // +11.2% change
    totalWatchTime: 3890,
    shares: 15,
    avgViewDuration: 195,
    likes: 38,
    dislikes: 3,
    comments: 9,
    subscriptions: 6,
  },
}

// Top videos from PDF
export const ytVideos: YTVideo[] = [
  {
    id: "v1",
    title: "Vestige View Body Camera Overview - Complete Product Tour",
    thumbnailUrl: "https://picsum.photos/seed/vv1/120/68",
    views: 425,
    avgWatchTime: 245,
    shares: 6,
  },
  {
    id: "v2",
    title: "Fleet Camera Installation Guide - Step by Step",
    thumbnailUrl: "https://picsum.photos/seed/vv2/120/68",
    views: 312,
    avgWatchTime: 320,
    shares: 4,
  },
  {
    id: "v3",
    title: "Evidence Management Software Tutorial",
    thumbnailUrl: "https://picsum.photos/seed/vv3/120/68",
    views: 198,
    avgWatchTime: 280,
    shares: 3,
  },
  {
    id: "v4",
    title: "Customer Testimonial - Transit Authority Success Story",
    thumbnailUrl: "https://picsum.photos/seed/vv4/120/68",
    views: 156,
    avgWatchTime: 145,
    shares: 2,
  },
  {
    id: "v5",
    title: "Law Enforcement Body Camera Best Practices",
    thumbnailUrl: "https://picsum.photos/seed/vv5/120/68",
    views: 89,
    avgWatchTime: 195,
    shares: 2,
  },
  {
    id: "v6",
    title: "Cloud Storage Integration Demo",
    thumbnailUrl: "https://picsum.photos/seed/vv6/120/68",
    views: 65,
    avgWatchTime: 165,
    shares: 1,
  },
]

// Daily data from PDF - Dec 1 - Jan 4, 2026
export const ytDailyData: YTDailyData[] = [
  { date: "2025-12-01", views: 32, watchTime: 112, shares: 0, likes: 1 },
  { date: "2025-12-02", views: 45, watchTime: 158, shares: 1, likes: 2 },
  { date: "2025-12-03", views: 52, watchTime: 182, shares: 1, likes: 2 },
  { date: "2025-12-04", views: 48, watchTime: 168, shares: 0, likes: 1 },
  { date: "2025-12-05", views: 56, watchTime: 196, shares: 1, likes: 2 },
  { date: "2025-12-06", views: 28, watchTime: 98, shares: 0, likes: 1 },
  { date: "2025-12-07", views: 22, watchTime: 77, shares: 0, likes: 1 },
  { date: "2025-12-08", views: 58, watchTime: 203, shares: 2, likes: 3 },
  { date: "2025-12-09", views: 62, watchTime: 217, shares: 1, likes: 3 },
  { date: "2025-12-10", views: 68, watchTime: 238, shares: 2, likes: 4 },
  { date: "2025-12-11", views: 55, watchTime: 193, shares: 1, likes: 2 },
  { date: "2025-12-12", views: 48, watchTime: 168, shares: 1, likes: 2 },
  { date: "2025-12-13", views: 35, watchTime: 123, shares: 0, likes: 1 },
  { date: "2025-12-14", views: 28, watchTime: 98, shares: 0, likes: 1 },
  { date: "2025-12-15", views: 52, watchTime: 182, shares: 1, likes: 2 },
  { date: "2025-12-16", views: 58, watchTime: 203, shares: 1, likes: 2 },
  { date: "2025-12-17", views: 45, watchTime: 158, shares: 1, likes: 2 },
  { date: "2025-12-18", views: 42, watchTime: 147, shares: 0, likes: 1 },
  { date: "2025-12-19", views: 38, watchTime: 133, shares: 1, likes: 1 },
  { date: "2025-12-20", views: 25, watchTime: 88, shares: 0, likes: 1 },
  { date: "2025-12-21", views: 18, watchTime: 63, shares: 0, likes: 0 },
  { date: "2025-12-22", views: 35, watchTime: 123, shares: 0, likes: 1 },
  { date: "2025-12-23", views: 32, watchTime: 112, shares: 1, likes: 1 },
  { date: "2025-12-24", views: 15, watchTime: 53, shares: 0, likes: 0 },
  { date: "2025-12-25", views: 12, watchTime: 42, shares: 0, likes: 0 },
  { date: "2025-12-26", views: 22, watchTime: 77, shares: 0, likes: 1 },
  { date: "2025-12-27", views: 28, watchTime: 98, shares: 0, likes: 1 },
  { date: "2025-12-28", views: 25, watchTime: 88, shares: 0, likes: 1 },
  { date: "2025-12-29", views: 32, watchTime: 112, shares: 1, likes: 1 },
  { date: "2025-12-30", views: 28, watchTime: 98, shares: 0, likes: 1 },
  { date: "2025-12-31", views: 18, watchTime: 63, shares: 0, likes: 0 },
  { date: "2026-01-01", views: 15, watchTime: 53, shares: 0, likes: 0 },
  { date: "2026-01-02", views: 35, watchTime: 123, shares: 1, likes: 1 },
  { date: "2026-01-03", views: 42, watchTime: 147, shares: 1, likes: 2 },
  { date: "2026-01-04", views: 38, watchTime: 133, shares: 1, likes: 1 },
]

// Generate sparkline data
export const ytViewsSparkline = ytDailyData.map(d => d.views)
export const ytWatchTimeSparkline = ytDailyData.map(d => d.watchTime / 60) // Convert to hours
export const ytSharesSparkline = ytDailyData.map(d => d.shares)
export const ytLikesSparkline = ytDailyData.map(d => d.likes)
