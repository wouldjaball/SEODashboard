import type {
  YTMetrics,
  YTVideo,
  YTDailyData,
} from "@/lib/types"

export const ytMetrics: YTMetrics = {
  views: 234567,
  totalWatchTime: 4567890, // seconds
  shares: 1234,
  avgViewDuration: 245, // 4:05
  likes: 8934,
  dislikes: 234,
  comments: 567,
  subscriptions: 890,
  previousPeriod: {
    views: 198234,
    totalWatchTime: 3890234,
    shares: 1012,
    avgViewDuration: 223,
    likes: 7234,
    dislikes: 198,
    comments: 456,
    subscriptions: 734,
  },
}

export const ytVideos: YTVideo[] = [
  {
    id: "v1",
    title: "Complete SEO Guide 2026: Everything You Need to Know",
    thumbnailUrl: "https://picsum.photos/seed/seo1/120/68",
    views: 45678,
    avgWatchTime: 567,
    shares: 234,
  },
  {
    id: "v2",
    title: "Google Ads Tutorial: From Beginner to Pro",
    thumbnailUrl: "https://picsum.photos/seed/ads1/120/68",
    views: 38234,
    avgWatchTime: 489,
    shares: 189,
  },
  {
    id: "v3",
    title: "How to Rank #1 on Google in 2026",
    thumbnailUrl: "https://picsum.photos/seed/rank1/120/68",
    views: 32567,
    avgWatchTime: 423,
    shares: 167,
  },
  {
    id: "v4",
    title: "Content Marketing Strategy That Actually Works",
    thumbnailUrl: "https://picsum.photos/seed/content1/120/68",
    views: 28934,
    avgWatchTime: 378,
    shares: 145,
  },
  {
    id: "v5",
    title: "Technical SEO Masterclass",
    thumbnailUrl: "https://picsum.photos/seed/tech1/120/68",
    views: 24567,
    avgWatchTime: 512,
    shares: 123,
  },
  {
    id: "v6",
    title: "Link Building Strategies for 2026",
    thumbnailUrl: "https://picsum.photos/seed/link1/120/68",
    views: 21234,
    avgWatchTime: 345,
    shares: 98,
  },
  {
    id: "v7",
    title: "Local SEO: Complete Guide for Small Businesses",
    thumbnailUrl: "https://picsum.photos/seed/local1/120/68",
    views: 18567,
    avgWatchTime: 289,
    shares: 87,
  },
  {
    id: "v8",
    title: "E-commerce SEO Tips and Tricks",
    thumbnailUrl: "https://picsum.photos/seed/ecom1/120/68",
    views: 15890,
    avgWatchTime: 267,
    shares: 76,
  },
  {
    id: "v9",
    title: "Social Media Marketing Explained",
    thumbnailUrl: "https://picsum.photos/seed/social1/120/68",
    views: 12345,
    avgWatchTime: 234,
    shares: 65,
  },
  {
    id: "v10",
    title: "Email Marketing Best Practices",
    thumbnailUrl: "https://picsum.photos/seed/email1/120/68",
    views: 8934,
    avgWatchTime: 198,
    shares: 50,
  },
]

export const ytDailyData: YTDailyData[] = [
  { date: "2025-12-01", views: 7234, watchTime: 145678, shares: 34, likes: 234 },
  { date: "2025-12-02", views: 8456, watchTime: 167890, shares: 42, likes: 278 },
  { date: "2025-12-03", views: 9123, watchTime: 178234, shares: 48, likes: 312 },
  { date: "2025-12-04", views: 8567, watchTime: 165432, shares: 45, likes: 289 },
  { date: "2025-12-05", views: 9890, watchTime: 189234, shares: 52, likes: 334 },
  { date: "2025-12-06", views: 7456, watchTime: 143567, shares: 38, likes: 245 },
  { date: "2025-12-07", views: 6789, watchTime: 132456, shares: 32, likes: 212 },
  { date: "2025-12-08", views: 8234, watchTime: 156789, shares: 41, likes: 267 },
  { date: "2025-12-09", views: 9456, watchTime: 178345, shares: 49, likes: 301 },
  { date: "2025-12-10", views: 10234, watchTime: 198567, shares: 56, likes: 356 },
  { date: "2025-12-11", views: 9678, watchTime: 187234, shares: 51, likes: 323 },
  { date: "2025-12-12", views: 8890, watchTime: 172345, shares: 46, likes: 298 },
  { date: "2025-12-13", views: 7123, watchTime: 138234, shares: 36, likes: 234 },
  { date: "2025-12-14", views: 6456, watchTime: 125678, shares: 30, likes: 201 },
]

// Generate sparkline data
export const ytViewsSparkline = ytDailyData.map(d => d.views)
export const ytWatchTimeSparkline = ytDailyData.map(d => d.watchTime / 3600) // Convert to hours
export const ytSharesSparkline = ytDailyData.map(d => d.shares)
export const ytLikesSparkline = ytDailyData.map(d => d.likes)
