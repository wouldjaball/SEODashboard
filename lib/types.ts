// Google Analytics
export interface GAMetrics {
  totalUsers: number
  newUsers: number
  sessions: number
  views: number
  avgSessionDuration: number  // seconds
  bounceRate: number          // decimal 0-1
  keyEvents: number
  userKeyEventRate: number    // decimal 0-1
  previousPeriod?: {
    totalUsers: number
    newUsers: number
    sessions: number
    views: number
    avgSessionDuration: number
    bounceRate: number
    keyEvents: number
    userKeyEventRate: number
  }
}

export interface GAWeeklyData {
  weekLabel: string
  weekNumber: number
  startDate: string
  endDate: string
  views: number
  sessions: number
}

export interface GAChannelData {
  date: string
  direct: number
  paidSearch: number
  organicSearch: number
  paidOther: number
  referral: number
  crossNetwork: number
  unassigned: number
  organicSocial: number
}

export interface GASourcePerformance {
  source: string
  totalUsers: number
  newUsers: number
  sessions: number
  views: number
  avgSessionDuration: number
  bounceRate: number
  keyEvents: number
  conversionRate: number
}

export interface GALandingPage {
  pageTitle: string
  pagePath: string
  totalUsers: number
  newUsers: number
  sessions: number
  views: number
  avgSessionDuration: number
  bounceRate: number
  keyEvents: number
  conversionRate: number
}

export interface GARegion {
  country: string
  countryCode: string
  totalUsers: number
  keyEvents: number
}

export interface GADevice {
  category: 'desktop' | 'mobile' | 'tablet'
  totalUsers: number
  keyEvents: number
}

export interface GADemographic {
  segment: string
  totalUsers: number
  keyEvents: number
}

export interface GATrafficShare {
  channel: string
  users: number
  percentage: number
}

// Google Search Console
export interface GSCMetrics {
  impressions: number
  clicks: number
  ctr: number
  avgPosition: number
  indexedPages: number
  rankingKeywords: number
  previousPeriod?: {
    impressions: number
    clicks: number
    ctr: number
    avgPosition: number
    indexedPages: number
    rankingKeywords: number
  }
}

export interface GSCWeeklyData {
  weekLabel: string
  date: string
  impressions: number
  clicks: number
  ctr: number
}

export interface GSCKeyword {
  query: string
  impressions: number
  clicks: number
  ctr: number
  avgPosition: number
}

export interface GSCLandingPage {
  url: string
  impressions: number
  clicks: number
  ctr: number
  avgPosition: number
}

export interface GSCCountry {
  country: string
  countryCode: string
  impressions: number
  clicks: number
  ctr: number
}

export interface GSCDeviceData {
  device: 'desktop' | 'mobile' | 'tablet'
  impressions: number
  clicks: number
  ctr: number
}

export interface GSCIndexData {
  date: string
  indexedPages: number
  rankingKeywords: number
}

// YouTube
export interface YTMetrics {
  views: number
  totalWatchTime: number      // seconds
  shares: number
  avgViewDuration: number     // seconds
  likes: number
  dislikes: number
  comments: number
  subscriptions: number
  previousPeriod?: {
    views: number
    totalWatchTime: number
    shares: number
    avgViewDuration: number
    likes: number
    dislikes: number
    comments: number
    subscriptions: number
  }
}

export interface YTVideo {
  id: string
  title: string
  thumbnailUrl: string
  views: number
  avgWatchTime: number
  shares: number
}

export interface YTDailyData {
  date: string
  views: number
  watchTime: number
  shares: number
  likes: number
}

// LinkedIn
export interface LIVisitorMetrics {
  pageViews: number
  uniqueVisitors: number
  customButtonClicks: number
  previousPeriod?: {
    pageViews: number
    uniqueVisitors: number
    customButtonClicks: number
  }
}

export interface LIFollowerMetrics {
  totalFollowers: number
  newFollowers: number
  previousPeriod?: {
    totalFollowers: number
    newFollowers: number
  }
}

export interface LIContentMetrics {
  reactions: number
  comments: number
  reposts: number
  impressions: number
  clicks: number
  engagementRate: number
  previousPeriod?: {
    reactions: number
    comments: number
    reposts: number
    impressions: number
    clicks: number
    engagementRate: number
  }
}

export interface LIVisitorDaily {
  date: string
  desktopVisitors: number
  mobileVisitors: number
}

export interface LIDemographic {
  segment: string
  value: number
  percentage: number
}

export interface LIUpdate {
  id: string
  title: string
  publishedAt: string
  imageUrl?: string
  linkUrl: string
  impressions: number
  videoViews: number
  clicks: number
  ctr: number
  reactions: number
  comments: number
  shares: number
  engagementRate: number
}

export interface LIFollowerDaily {
  date: string
  sponsored: number
  organic: number
}

export interface LIImpressionDaily {
  date: string
  impressions: number
}

// Enhanced LinkedIn Types for Community Management API

export interface LIVideoMetrics {
  totalWatchTime: number
  totalViews: number
  totalViewers: number
  averageWatchTime: number
  previousPeriod: {
    totalWatchTime: number
    totalViews: number
    totalViewers: number
    averageWatchTime: number
  }
}

export interface LIVideoDaily {
  date: string
  watchTime: number
  views: number
  viewers: number
}

export interface LIEmployeeAdvocacyMetrics {
  employeeShares: number
  employeeEngagement: number
  contentAmplification: number
  employeeReach: number
  previousPeriod: {
    employeeShares: number
    employeeEngagement: number
    contentAmplification: number
    employeeReach: number
  }
}

export interface LIContentBreakdown {
  organicPosts: number
  sponsoredPosts: number
  organicImpressions: number
  sponsoredImpressions: number
  organicEngagement: number
  sponsoredEngagement: number
}

export interface LISocialListeningMention {
  date: string
  mentions: number
  sentiment: 'positive' | 'negative' | 'neutral'
  reach: number
  engagement: number
  mentionType: 'post' | 'comment' | 'share'
  memberInfo?: {
    name: string
    headline: string
    profileUrl: string
  }
}

// Enhanced LinkedIn Analytics Response
export interface LIEnhancedMetrics {
  // Core metrics (existing)
  visitorMetrics: LIVisitorMetrics
  followerMetrics: LIFollowerMetrics
  contentMetrics: LIContentMetrics
  visitorDaily: LIVisitorDaily[]
  followerDaily: LIFollowerDaily[]
  impressionDaily: LIImpressionDaily[]
  industryDemographics: LIDemographic[]
  seniorityDemographics: LIDemographic[]
  jobFunctionDemographics: LIDemographic[]
  companySizeDemographics: LIDemographic[]
  updates: LIUpdate[]
  
  // Enhanced metrics (new)
  videoMetrics?: LIVideoMetrics
  employeeAdvocacyMetrics?: LIEmployeeAdvocacyMetrics
  contentBreakdown?: LIContentBreakdown
  socialListening?: LISocialListeningMention[]
  videoDaily?: LIVideoDaily[]
}

// Common types
export interface DateRange {
  from: Date
  to: Date
}

export interface FilterOption {
  value: string
  label: string
}

// GA Filters for client-side filtering
export interface GAFilters {
  landingPages: string[]      // pagePath values, empty = all
  deviceCategories: ('desktop' | 'mobile' | 'tablet')[]  // empty = all
  channels: string[]          // channel/source names, empty = all
}

// Company type for multi-tenant data
export interface Company {
  id: string
  name: string
  logo?: string
  industry: string
  color: string  // Brand color for visual identification (hex)
  role?: 'owner' | 'admin' | 'client' | 'viewer'  // User's role in this company
  // Google Analytics
  gaMetrics: GAMetrics
  gaWeeklyData: GAWeeklyData[]
  gaChannelData: GAChannelData[]
  gaTrafficShare: GATrafficShare[]
  gaSourcePerformance: GASourcePerformance[]
  gaLandingPages: GALandingPage[]
  gaRegions: GARegion[]
  gaDevices: GADevice[]
  gaGender: GADemographic[]
  gaAge: GADemographic[]
  // Search Console
  gscMetrics: GSCMetrics
  gscWeeklyData: GSCWeeklyData[]
  gscIndexData: GSCIndexData[]
  gscKeywords: GSCKeyword[]
  gscLandingPages: GSCLandingPage[]
  gscCountries: GSCCountry[]
  gscDevices: GSCDeviceData[]
  // YouTube
  ytMetrics: YTMetrics
  ytVideos: YTVideo[]
  ytViewsSparkline: number[]
  ytWatchTimeSparkline: number[]
  ytSharesSparkline: number[]
  ytLikesSparkline: number[]
  ytError?: string  // Error message if YouTube fetch failed
  ytIsPublicDataOnly?: boolean  // True if using public Data API fallback (limited metrics)
  // Error states for each service
  gaError?: string
  gaErrorType?: 'auth_required' | 'scope_missing' | 'api_error'
  gscError?: string
  gscErrorType?: 'auth_required' | 'scope_missing' | 'api_error'
  liError?: string
  liErrorType?: 'auth_required' | 'scope_missing' | 'api_error'
  liDataSource?: 'api' | 'sheets' | 'mock' | 'none'
  // LinkedIn - Core metrics
  liVisitorMetrics: LIVisitorMetrics
  liFollowerMetrics: LIFollowerMetrics
  liContentMetrics: LIContentMetrics
  liVisitorDaily: LIVisitorDaily[]
  liFollowerDaily: LIFollowerDaily[]
  liImpressionDaily: LIImpressionDaily[]
  liIndustryDemographics: LIDemographic[]
  liSeniorityDemographics: LIDemographic[]
  liJobFunctionDemographics: LIDemographic[]
  liCompanySizeDemographics: LIDemographic[]
  liUpdates: LIUpdate[]
  
  // LinkedIn - Enhanced metrics
  liVideoMetrics?: LIVideoMetrics
  liEmployeeAdvocacyMetrics?: LIEmployeeAdvocacyMetrics
  liContentBreakdown?: LIContentBreakdown
  liSocialListening?: LISocialListeningMention[]
  liVideoDaily?: LIVideoDaily[]
}
