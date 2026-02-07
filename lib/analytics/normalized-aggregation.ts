/**
 * Shared aggregation functions for normalized analytics tables.
 * Used by both the per-company endpoint and the portfolio bulk query.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- Aggregation helpers ----

const sum = (rows: any[], field: string) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
const avg = (rows: any[], field: string) => rows.length > 0 ? sum(rows, field) / rows.length : 0

export function aggregateGAMetrics(currentRows: any[], previousRows: any[]) {
  return {
    totalUsers: sum(currentRows, 'total_users'),
    newUsers: sum(currentRows, 'new_users'),
    sessions: sum(currentRows, 'sessions'),
    views: sum(currentRows, 'page_views'),
    avgSessionDuration: avg(currentRows, 'avg_session_duration'),
    bounceRate: avg(currentRows, 'bounce_rate'),
    keyEvents: sum(currentRows, 'key_events'),
    userKeyEventRate: avg(currentRows, 'user_key_event_rate'),
    previousPeriod: previousRows.length > 0 ? {
      totalUsers: sum(previousRows, 'total_users'),
      newUsers: sum(previousRows, 'new_users'),
      sessions: sum(previousRows, 'sessions'),
      views: sum(previousRows, 'page_views'),
      avgSessionDuration: avg(previousRows, 'avg_session_duration'),
      bounceRate: avg(previousRows, 'bounce_rate'),
      keyEvents: sum(previousRows, 'key_events'),
      userKeyEventRate: avg(previousRows, 'user_key_event_rate')
    } : undefined
  }
}

export function aggregateGSCMetrics(currentRows: any[], previousRows: any[]) {
  const impressions = sum(currentRows, 'impressions')
  const clicks = sum(currentRows, 'clicks')
  const prevImpressions = sum(previousRows, 'impressions')
  const prevClicks = sum(previousRows, 'clicks')

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    avgPosition: avg(currentRows, 'avg_position'),
    indexedPages: 0,
    rankingKeywords: 0,
    previousPeriod: previousRows.length > 0 ? {
      impressions: prevImpressions,
      clicks: prevClicks,
      ctr: prevImpressions > 0 ? prevClicks / prevImpressions : 0,
      avgPosition: avg(previousRows, 'avg_position'),
      indexedPages: 0,
      rankingKeywords: 0
    } : undefined
  }
}

export function aggregateYTMetrics(currentRows: any[], previousRows: any[]) {
  return {
    views: sum(currentRows, 'views'),
    totalWatchTime: sum(currentRows, 'watch_time_seconds'),
    shares: sum(currentRows, 'shares'),
    avgViewDuration: avg(currentRows, 'avg_view_duration'),
    likes: sum(currentRows, 'likes'),
    dislikes: sum(currentRows, 'dislikes'),
    comments: sum(currentRows, 'comments'),
    subscriptions: sum(currentRows, 'subscribers_gained') - sum(currentRows, 'subscribers_lost'),
    previousPeriod: previousRows.length > 0 ? {
      views: sum(previousRows, 'views'),
      totalWatchTime: sum(previousRows, 'watch_time_seconds'),
      shares: sum(previousRows, 'shares'),
      avgViewDuration: avg(previousRows, 'avg_view_duration'),
      likes: sum(previousRows, 'likes'),
      dislikes: sum(previousRows, 'dislikes'),
      comments: sum(previousRows, 'comments'),
      subscriptions: sum(previousRows, 'subscribers_gained') - sum(previousRows, 'subscribers_lost')
    } : undefined
  }
}

// ---- Weekly/Channel data builders ----

export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function buildWeeklyData(dailyRows: any[], platform: 'ga' | 'gsc') {
  const weekMap = new Map<string, any>()

  dailyRows.forEach((row: any) => {
    const date = new Date(row.date)
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(date)
    weekStart.setDate(diff)
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { dates: [], views: 0, sessions: 0, impressions: 0, clicks: 0, ctr: 0 })
    }

    const week = weekMap.get(weekKey)!
    week.dates.push(row.date)

    if (platform === 'ga') {
      week.views += Number(row.page_views) || 0
      week.sessions += Number(row.sessions) || 0
    } else {
      week.impressions += Number(row.impressions) || 0
      week.clicks += Number(row.clicks) || 0
    }
  })

  if (platform === 'ga') {
    return Array.from(weekMap.entries()).map(([weekStart, data]) => {
      const lastDate = data.dates[data.dates.length - 1]
      const startFormatted = formatDateLabel(weekStart)
      const endFormatted = formatDateLabel(lastDate)
      return {
        weekLabel: `${startFormatted}-${endFormatted.split(' ')[1]}`,
        weekNumber: getISOWeekNumber(new Date(weekStart)),
        startDate: weekStart,
        endDate: lastDate,
        views: data.views,
        sessions: data.sessions
      }
    })
  }

  return Array.from(weekMap.entries()).map(([weekStart, data]) => {
    const lastDate = data.dates[data.dates.length - 1]
    const startFormatted = formatDateLabel(weekStart)
    const endFormatted = formatDateLabel(lastDate)
    return {
      weekLabel: `${startFormatted}-${endFormatted.split(' ')[1]}`,
      date: weekStart,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? data.clicks / data.impressions : 0
    }
  })
}

export function buildChannelData(channelRows: any[]) {
  const dateMap = new Map<string, any>()

  channelRows.forEach((row: any) => {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, {
        date: row.date,
        direct: 0, paidSearch: 0, organicSearch: 0, paidOther: 0,
        referral: 0, crossNetwork: 0, unassigned: 0, organicSocial: 0
      })
    }

    const day = dateMap.get(row.date)!
    const channel = row.channel as string
    if (channel in day) {
      day[channel] = Number(row.sessions) || 0
    }
  })

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function buildGSCIndexData(dailyRows: any[]) {
  return dailyRows.map((row: any) => ({
    date: row.date,
    indexedPages: Number(row.indexed_pages) || 0,
    rankingKeywords: Number(row.ranking_keywords) || 0
  }))
}

// ---- Result assembly for a single company ----

export function assembleCompanyAnalytics(
  gaDaily: any[], gaDailyPrev: any[], gaChannels: any[],
  gscDaily: any[], gscDailyPrev: any[],
  ytDaily: any[], ytDailyPrev: any[],
  liDaily: any[],
  gaSnapshot: any | null, gscSnapshot: any | null,
  ytSnapshot: any | null, liSnapshot: any | null
): Record<string, any> {
  const results: any = {}

  // ---- GA ----
  const hasGADaily = gaDaily && gaDaily.length > 0
  const hasGASnapshot = gaSnapshot !== null && gaSnapshot !== undefined
  if (hasGADaily || hasGASnapshot) {
    results.gaMetrics = hasGADaily
      ? aggregateGAMetrics(gaDaily, gaDailyPrev || [])
      : null
    results.gaWeeklyData = hasGADaily ? buildWeeklyData(gaDaily, 'ga') : []
    results.gaChannelData = hasGADaily ? buildChannelData(gaChannels || []) : []
    results.gaTrafficShare = gaSnapshot?.traffic_share || []
    results.gaSourcePerformance = gaSnapshot?.source_performance || []
    results.gaLandingPages = gaSnapshot?.landing_pages || []
    results.gaRegions = gaSnapshot?.regions || []
    results.gaDevices = gaSnapshot?.devices || []
    results.gaGender = gaSnapshot?.gender || []
    results.gaAge = gaSnapshot?.age || []
  }

  // ---- GSC ----
  const hasGSCDaily = gscDaily && gscDaily.length > 0
  const hasGSCSnapshot = gscSnapshot !== null && gscSnapshot !== undefined
  if (hasGSCDaily || hasGSCSnapshot) {
    results.gscMetrics = hasGSCDaily
      ? aggregateGSCMetrics(gscDaily, gscDailyPrev || [])
      : null
    results.gscWeeklyData = hasGSCDaily ? buildWeeklyData(gscDaily, 'gsc') : []
    results.gscKeywords = gscSnapshot?.keywords || []
    results.gscCountries = gscSnapshot?.countries || []
    results.gscDevices = gscSnapshot?.devices || []
    results.gscIndexData = hasGSCDaily ? buildGSCIndexData(gscDaily) : []
    results.gscLandingPages = gscSnapshot?.landing_pages || []
    results.totalKeywords = gscSnapshot?.total_keywords || 0
    results.totalIndexedPages = gscSnapshot?.total_indexed_pages || 0
    results.prevKeywords = 0
    results.prevIndexedPages = 0
  }

  // ---- YouTube ----
  const hasYTDaily = ytDaily && ytDaily.length > 0
  const hasYTSnapshot = ytSnapshot !== null && ytSnapshot !== undefined
  if (hasYTDaily || hasYTSnapshot) {
    results.ytMetrics = hasYTDaily
      ? aggregateYTMetrics(ytDaily, ytDailyPrev || [])
      : null
    results.ytVideos = ytSnapshot?.top_videos || []
    results.ytIsPublicDataOnly = ytSnapshot?.is_public_data_only || false
    results.ytViewsSparkline = hasYTDaily ? ytDaily.map((d: any) => d.views || 0) : []
    results.ytWatchTimeSparkline = hasYTDaily ? ytDaily.map((d: any) => d.watch_time_seconds || 0) : []
    results.ytSharesSparkline = hasYTDaily ? ytDaily.map((d: any) => d.shares || 0) : []
    results.ytLikesSparkline = hasYTDaily ? ytDaily.map((d: any) => d.likes || 0) : []
  }

  // ---- LinkedIn ----
  const hasLISnapshot = liSnapshot !== null && liSnapshot !== undefined
  if (hasLISnapshot || (liDaily && liDaily.length > 0)) {
    results.liVisitorMetrics = liSnapshot?.visitor_metrics || { pageViews: 0, uniqueVisitors: 0, customButtonClicks: 0 }
    results.liFollowerMetrics = liSnapshot?.follower_metrics || { totalFollowers: 0, newFollowers: 0 }
    results.liContentMetrics = liSnapshot?.content_metrics || { reactions: 0, comments: 0, reposts: 0, impressions: 0, clicks: 0, engagementRate: 0 }
    results.liSearchAppearanceMetrics = liSnapshot?.search_appearance_metrics || { searchAppearances: 0 }
    results.liIndustryDemographics = liSnapshot?.industry_demographics || []
    results.liSeniorityDemographics = liSnapshot?.seniority_demographics || []
    results.liJobFunctionDemographics = liSnapshot?.job_function_demographics || []
    results.liCompanySizeDemographics = liSnapshot?.company_size_demographics || []
    results.liUpdates = liSnapshot?.updates || []
    results.liVideoMetrics = liSnapshot?.video_metrics
    results.liEmployeeAdvocacyMetrics = liSnapshot?.employee_advocacy_metrics
    results.liContentBreakdown = liSnapshot?.content_breakdown
    results.liSocialListening = liSnapshot?.social_listening
    results.liDataSource = liSnapshot?.data_source || 'cache'

    const liDailyData = liDaily || []
    results.liVisitorDaily = liDailyData.map((d: any) => ({
      date: d.date,
      desktopVisitors: d.desktop_visitors || 0,
      mobileVisitors: d.mobile_visitors || 0
    }))
    results.liFollowerDaily = liDailyData.map((d: any) => ({
      date: d.date,
      sponsored: d.paid_follower_gain || 0,
      organic: d.organic_follower_gain || 0
    }))
    results.liImpressionDaily = liDailyData.map((d: any) => ({
      date: d.date,
      impressions: d.impressions || 0
    }))
  }

  return results
}

// ---- Bulk snapshot helper ----

export async function findClosestSnapshotsBulk(
  supabase: any,
  table: string,
  companyIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, any>> {
  const result = new Map<string, any>()
  if (companyIds.length === 0) return result

  // Try exact matches for all companies at once
  const { data: exactMatches } = await supabase
    .from(table)
    .select('*')
    .in('company_id', companyIds)
    .eq('period_start', startDate)
    .eq('period_end', endDate)

  if (exactMatches) {
    exactMatches.forEach((row: any) => result.set(row.company_id, row))
  }

  // For companies without exact match, get most recent snapshot
  const missingIds = companyIds.filter(id => !result.has(id))
  if (missingIds.length > 0) {
    const { data: latestSnapshots } = await supabase
      .from(table)
      .select('*')
      .in('company_id', missingIds)
      .order('snapshot_date', { ascending: false })

    if (latestSnapshots) {
      latestSnapshots.forEach((row: any) => {
        if (!result.has(row.company_id)) {
          result.set(row.company_id, row)
        }
      })
    }
  }

  return result
}

// ---- Portfolio aggregate metrics ----

export function calculatePortfolioAggregateMetrics(companiesWithData: any[]) {
  let totalTraffic = 0
  let totalConversions = 0
  const totalConversionRates: number[] = []
  let prevTotalTraffic = 0
  let prevTotalConversions = 0
  const prevTotalConversionRates: number[] = []

  companiesWithData.forEach(company => {
    if (company.gaMetrics) {
      totalTraffic += company.gaMetrics.totalUsers || 0
      totalConversions += company.gaMetrics.keyEvents || 0
      if (company.gaMetrics.userKeyEventRate) {
        totalConversionRates.push(company.gaMetrics.userKeyEventRate)
      }

      if (company.gaMetrics.previousPeriod) {
        prevTotalTraffic += company.gaMetrics.previousPeriod.totalUsers || 0
        prevTotalConversions += company.gaMetrics.previousPeriod.keyEvents || 0
        if (company.gaMetrics.previousPeriod.userKeyEventRate) {
          prevTotalConversionRates.push(company.gaMetrics.previousPeriod.userKeyEventRate)
        }
      }
    }
  })

  const avgConversionRate = totalConversionRates.length > 0
    ? totalConversionRates.reduce((s, rate) => s + rate, 0) / totalConversionRates.length
    : 0

  const prevAvgConversionRate = prevTotalConversionRates.length > 0
    ? prevTotalConversionRates.reduce((s, rate) => s + rate, 0) / prevTotalConversionRates.length
    : 0

  return {
    totalTraffic,
    totalConversions,
    avgConversionRate,
    totalRevenue: 0,
    previousPeriod: {
      totalTraffic: prevTotalTraffic,
      totalConversions: prevTotalConversions,
      avgConversionRate: prevAvgConversionRate,
      totalRevenue: 0
    }
  }
}
