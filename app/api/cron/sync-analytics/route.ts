import { createClient } from '@supabase/supabase-js'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { LinkedInAnalyticsService } from '@/lib/services/linkedin-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'
import { CronPerformanceTracker, chunkArray } from '@/lib/utils/cron-utils'

// Incremental sync job: fetches daily-grain data from APIs and stores in normalized tables.
// Runs twice daily via Vercel Cron. Only fetches missing days (incremental).

const BATCH_SIZE = 3
const BATCH_DELAY_MS = 1000
const BACKFILL_DAYS = 90 // How far back to go on first sync
const MAX_EXECUTION_MS = 270_000 // 4.5 minutes (leave buffer for Vercel's 5-min limit)

interface SyncResult {
  company: string
  platform: string
  status: 'success' | 'error' | 'skipped'
  rowsSynced?: number
  error?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseKey) {
    console.error('[Sync] No Supabase secret key found (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)')
    return NextResponse.json({ error: 'Missing Supabase secret key' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey
  )

  const tracker = new CronPerformanceTracker()
  const startTime = Date.now()
  const results: SyncResult[] = []

  console.log('[Sync] Starting analytics sync at', new Date().toISOString())

  try {
    // Get all companies with their mappings
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')

    if (companiesError || !companies) {
      console.error('[Sync] Failed to fetch companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    console.log(`[Sync] Found ${companies.length} companies to sync`)

    // Ensure sync_status rows exist for all companies
    await ensureSyncStatusRows(supabase, companies)

    // Get sync status to determine what needs updating (most stale first)
    const { data: syncStatuses } = await supabase
      .from('sync_status')
      .select('*')
      .order('last_success_at', { ascending: true, nullsFirst: true })

    // Group sync statuses by company
    const companySync = new Map<string, Map<string, any>>()
    syncStatuses?.forEach(s => {
      if (!companySync.has(s.company_id)) {
        companySync.set(s.company_id, new Map())
      }
      companySync.get(s.company_id)!.set(s.platform, s)
    })

    // Sort companies by staleness (most stale first)
    const sortedCompanies = [...companies].sort((a, b) => {
      const aStatuses = companySync.get(a.id)
      const bStatuses = companySync.get(b.id)
      const aOldest = getOldestSync(aStatuses)
      const bOldest = getOldestSync(bStatuses)
      if (!aOldest) return -1
      if (!bOldest) return 1
      return new Date(aOldest).getTime() - new Date(bOldest).getTime()
    })

    // Process in batches
    const batches = chunkArray(sortedCompanies, BATCH_SIZE)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // Check time limit
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        console.log(`[Sync] Time limit reached after ${batchIndex} batches, stopping`)
        break
      }

      const batch = batches[batchIndex]
      console.log(`[Sync] Batch ${batchIndex + 1}/${batches.length} - ${batch.map(c => c.name).join(', ')}`)

      const batchResults = await Promise.all(
        batch.map(company => syncCompany(supabase, company, companySync.get(company.id)))
      )

      batchResults.forEach(companyResults => results.push(...companyResults))

      const successCount = batchResults.flat().filter(r => r.status === 'success').length
      const errorCount = batchResults.flat().filter(r => r.status === 'error').length
      tracker.recordBatchCompleted(successCount, errorCount)
      console.log(tracker.getProgressReport())

      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    // Cleanup old data
    await cleanupOldData(supabase)

    const metrics = tracker.finish()
    console.log('[Sync] Complete:', metrics)

    return NextResponse.json({
      message: 'Analytics sync complete',
      timestamp: new Date().toISOString(),
      results,
      performance: metrics
    })
  } catch (error: any) {
    console.error('[Sync] Failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================
// COMPANY SYNC
// ============================================================

async function syncCompany(
  supabase: any,
  company: { id: string; name: string },
  syncStatuses: Map<string, any> | undefined
): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  // Fetch all mappings in parallel
  const [gaMappingResult, gscMappingResult, ytMappingResult, liMappingResult] = await Promise.all([
    supabase.from('company_ga_mappings').select('ga_property_id').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_gsc_mappings').select('gsc_site_id').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_youtube_mappings').select('youtube_channel_id').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_linkedin_mappings').select('linkedin_page_id').eq('company_id', company.id).maybeSingle()
  ])

  // Resolve property/site/channel details
  const [gaProperty, gscSite, ytChannel, liPage] = await Promise.all([
    gaMappingResult.data?.ga_property_id
      ? supabase.from('ga_properties').select('*').eq('id', gaMappingResult.data.ga_property_id).single().then((r: any) => r.data)
      : null,
    gscMappingResult.data?.gsc_site_id
      ? supabase.from('gsc_sites').select('*').eq('id', gscMappingResult.data.gsc_site_id).single().then((r: any) => r.data)
      : null,
    ytMappingResult.data?.youtube_channel_id
      ? supabase.from('youtube_channels').select('*').eq('id', ytMappingResult.data.youtube_channel_id).single().then((r: any) => r.data)
      : null,
    liMappingResult.data?.linkedin_page_id
      ? supabase.from('linkedin_pages').select('*').eq('id', liMappingResult.data.linkedin_page_id).single().then((r: any) => r.data)
      : null
  ])

  // Calculate date ranges for each platform based on sync status
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Sync GA, GSC, YouTube in parallel; LinkedIn sequentially (rate limit)
  const parallelSyncs: Promise<SyncResult>[] = []

  if (gaProperty) {
    parallelSyncs.push(syncGA(supabase, company, gaProperty, syncStatuses?.get('ga'), yesterday))
  }
  if (gscSite) {
    parallelSyncs.push(syncGSC(supabase, company, gscSite, syncStatuses?.get('gsc'), yesterday))
  }
  if (ytChannel) {
    parallelSyncs.push(syncYouTube(supabase, company, ytChannel, syncStatuses?.get('youtube'), yesterday))
  }

  const parallelResults = await Promise.allSettled(parallelSyncs)
  parallelResults.forEach(r => {
    if (r.status === 'fulfilled') results.push(r.value)
    else results.push({ company: company.name, platform: 'unknown', status: 'error', error: r.reason?.message })
  })

  // LinkedIn sync - sequential due to rate limits
  if (liPage) {
    try {
      const liResult = await syncLinkedIn(supabase, company, liPage, syncStatuses?.get('linkedin'), yesterday)
      results.push(liResult)
    } catch (e: any) {
      results.push({ company: company.name, platform: 'linkedin', status: 'error', error: e.message })
    }
  }

  return results
}

// ============================================================
// PLATFORM SYNC FUNCTIONS
// ============================================================

async function syncGA(
  supabase: any,
  company: { id: string; name: string },
  gaProperty: any,
  syncStatus: any,
  yesterday: string
): Promise<SyncResult> {
  const platform = 'ga'
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const startDate = getSyncStartDate(syncStatus, yesterday)
    console.log(`[Sync:GA] ${company.name}: syncing ${startDate} to ${yesterday}`)

    // Fetch daily metrics and channel data in parallel
    const [dailyMetrics, channelData] = await Promise.all([
      GoogleAnalyticsService.fetchDailyMetrics(gaProperty.user_id, gaProperty.property_id, startDate, yesterday),
      GoogleAnalyticsService.fetchChannelData(gaProperty.user_id, gaProperty.property_id, startDate, yesterday)
    ])

    // Upsert daily metrics
    if (dailyMetrics.length > 0) {
      const rows = dailyMetrics.map(d => ({
        company_id: company.id,
        date: d.date,
        total_users: d.totalUsers,
        new_users: d.newUsers,
        sessions: d.sessions,
        page_views: d.pageViews,
        avg_session_duration: d.avgSessionDuration,
        bounce_rate: d.bounceRate,
        key_events: d.keyEvents,
        user_key_event_rate: d.userKeyEventRate
      }))

      const { error } = await supabase.from('ga_daily_metrics').upsert(rows, { onConflict: 'company_id,date' })
      if (error) throw new Error(`GA daily upsert failed: ${error.message}`)
    }

    // Upsert channel daily data
    if (channelData.length > 0) {
      const channelRows: any[] = []
      channelData.forEach(day => {
        const channels = ['direct', 'paidSearch', 'organicSearch', 'paidOther', 'referral', 'crossNetwork', 'unassigned', 'organicSocial'] as const
        channels.forEach(ch => {
          const sessions = day[ch]
          if (sessions > 0) {
            channelRows.push({
              company_id: company.id,
              date: day.date,
              channel: ch,
              sessions,
              users: 0
            })
          }
        })
      })

      if (channelRows.length > 0) {
        const { error } = await supabase.from('ga_channel_daily').upsert(channelRows, { onConflict: 'company_id,date,channel' })
        if (error) throw new Error(`GA channel upsert failed: ${error.message}`)
      }
    }

    // Refresh period snapshots for standard ranges
    await refreshGAPeriodSnapshots(supabase, company, gaProperty, yesterday)

    const rowsSynced = dailyMetrics.length
    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    console.log(`[Sync:GA] ${company.name}: synced ${rowsSynced} days`)
    return { company: company.name, platform, status: 'success', rowsSynced }
  } catch (e: any) {
    console.error(`[Sync:GA] ${company.name} failed:`, e.message)
    await updateSyncError(supabase, company.id, platform, e.message)
    return { company: company.name, platform, status: 'error', error: e.message }
  }
}

async function syncGSC(
  supabase: any,
  company: { id: string; name: string },
  gscSite: any,
  syncStatus: any,
  yesterday: string
): Promise<SyncResult> {
  const platform = 'gsc'
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const startDate = getSyncStartDate(syncStatus, yesterday)
    console.log(`[Sync:GSC] ${company.name}: syncing ${startDate} to ${yesterday}`)

    // Fetch daily metrics
    const dailyMetrics = await GoogleSearchConsoleService.fetchDailyMetrics(
      gscSite.user_id, gscSite.site_url, startDate, yesterday
    )

    if (dailyMetrics.length > 0) {
      const rows = dailyMetrics.map(d => ({
        company_id: company.id,
        date: d.date,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: d.ctr,
        avg_position: d.avgPosition,
        ranking_keywords: 0,
        indexed_pages: 0
      }))

      const { error } = await supabase.from('gsc_daily_metrics').upsert(rows, { onConflict: 'company_id,date' })
      if (error) throw new Error(`GSC daily upsert failed: ${error.message}`)
    }

    // Refresh period snapshots
    await refreshGSCPeriodSnapshots(supabase, company, gscSite, yesterday)

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    console.log(`[Sync:GSC] ${company.name}: synced ${dailyMetrics.length} days`)
    return { company: company.name, platform, status: 'success', rowsSynced: dailyMetrics.length }
  } catch (e: any) {
    console.error(`[Sync:GSC] ${company.name} failed:`, e.message)
    await updateSyncError(supabase, company.id, platform, e.message)
    return { company: company.name, platform, status: 'error', error: e.message }
  }
}

async function syncYouTube(
  supabase: any,
  company: { id: string; name: string },
  ytChannel: any,
  syncStatus: any,
  yesterday: string
): Promise<SyncResult> {
  const platform = 'youtube'
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const startDate = getSyncStartDate(syncStatus, yesterday)
    console.log(`[Sync:YT] ${company.name}: syncing ${startDate} to ${yesterday}`)

    const dailyData = await YouTubeAnalyticsService.fetchDailyDataWithFallback(
      ytChannel.user_id, ytChannel.channel_id, startDate, yesterday
    )

    if (dailyData.length > 0) {
      const rows = dailyData.map(d => ({
        company_id: company.id,
        date: d.date,
        views: d.views,
        watch_time_seconds: d.watchTime,
        shares: d.shares,
        likes: d.likes,
        dislikes: 0,
        comments: 0,
        subscribers_gained: 0,
        subscribers_lost: 0,
        avg_view_duration: 0
      }))

      const { error } = await supabase.from('yt_daily_metrics').upsert(rows, { onConflict: 'company_id,date' })
      if (error) throw new Error(`YT daily upsert failed: ${error.message}`)
    }

    // Refresh period snapshots
    await refreshYTPeriodSnapshots(supabase, company, ytChannel, yesterday)

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    console.log(`[Sync:YT] ${company.name}: synced ${dailyData.length} days`)
    return { company: company.name, platform, status: 'success', rowsSynced: dailyData.length }
  } catch (e: any) {
    console.error(`[Sync:YT] ${company.name} failed:`, e.message)
    await updateSyncError(supabase, company.id, platform, e.message)
    return { company: company.name, platform, status: 'error', error: e.message }
  }
}

async function syncLinkedIn(
  supabase: any,
  company: { id: string; name: string },
  liPage: any,
  syncStatus: any,
  yesterday: string
): Promise<SyncResult> {
  const platform = 'linkedin'
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const hasTokens = await OAuthTokenService.hasValidLinkedInTokens(liPage.user_id)
    if (!hasTokens) {
      await updateSyncError(supabase, company.id, platform, 'No valid LinkedIn tokens')
      return { company: company.name, platform, status: 'error', error: 'No valid LinkedIn tokens' }
    }

    const startDate = getSyncStartDate(syncStatus, yesterday)
    const previousStartDate = format(subDays(new Date(startDate), 30), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(yesterday), 30), 'yyyy-MM-dd')

    console.log(`[Sync:LI] ${company.name}: syncing ${startDate} to ${yesterday}`)

    // Fetch all LinkedIn data (uses rate-limited queue internally)
    const liData = await LinkedInAnalyticsService.fetchAllMetrics(
      liPage.user_id, liPage.page_id,
      startDate, yesterday,
      previousStartDate, previousEndDate
    )

    // Upsert daily metrics from daily arrays
    const dailyRows: any[] = []
    const visitorDaily = liData.visitorDaily || []
    const followerDaily = liData.followerDaily || []
    const impressionDaily = liData.impressionDaily || []

    // Build a map of all dates
    const dateMap = new Map<string, any>()
    visitorDaily.forEach((d: any) => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date })
      dateMap.get(d.date)!.desktop_visitors = d.desktopVisitors || 0
      dateMap.get(d.date)!.mobile_visitors = d.mobileVisitors || 0
    })
    followerDaily.forEach((d: any) => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date })
      dateMap.get(d.date)!.organic_follower_gain = d.organic || 0
      dateMap.get(d.date)!.paid_follower_gain = d.sponsored || 0
    })
    impressionDaily.forEach((d: any) => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date })
      dateMap.get(d.date)!.impressions = d.impressions || 0
    })

    dateMap.forEach((row, date) => {
      dailyRows.push({
        company_id: company.id,
        date,
        desktop_visitors: row.desktop_visitors || 0,
        mobile_visitors: row.mobile_visitors || 0,
        organic_follower_gain: row.organic_follower_gain || 0,
        paid_follower_gain: row.paid_follower_gain || 0,
        impressions: row.impressions || 0,
        clicks: 0,
        reactions: 0,
        comments: 0,
        shares: 0
      })
    })

    if (dailyRows.length > 0) {
      const { error } = await supabase.from('li_daily_metrics').upsert(dailyRows, { onConflict: 'company_id,date' })
      if (error) throw new Error(`LI daily upsert failed: ${error.message}`)
    }

    // Upsert period snapshot
    const { error: snapError } = await supabase.from('li_period_snapshots').upsert({
      company_id: company.id,
      snapshot_date: yesterday,
      period_start: startDate,
      period_end: yesterday,
      visitor_metrics: liData.visitorMetrics,
      follower_metrics: liData.followerMetrics,
      content_metrics: liData.contentMetrics,
      search_appearance_metrics: liData.searchAppearanceMetrics,
      industry_demographics: liData.industryDemographics,
      seniority_demographics: liData.seniorityDemographics,
      job_function_demographics: liData.jobFunctionDemographics,
      company_size_demographics: liData.companySizeDemographics,
      updates: liData.updates,
      video_metrics: liData.videoMetrics,
      employee_advocacy_metrics: liData.employeeAdvocacyMetrics,
      content_breakdown: liData.contentBreakdown,
      social_listening: liData.socialListening,
      data_source: 'api'
    }, { onConflict: 'company_id,period_start,period_end' })

    if (snapError) console.error(`[Sync:LI] Snapshot upsert warning:`, snapError.message)

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    console.log(`[Sync:LI] ${company.name}: synced ${dailyRows.length} days`)
    return { company: company.name, platform, status: 'success', rowsSynced: dailyRows.length }
  } catch (e: any) {
    console.error(`[Sync:LI] ${company.name} failed:`, e.message)
    await updateSyncError(supabase, company.id, platform, e.message)
    return { company: company.name, platform, status: 'error', error: e.message }
  }
}

// ============================================================
// PERIOD SNAPSHOT REFRESHERS
// ============================================================

async function refreshGAPeriodSnapshots(
  supabase: any,
  company: { id: string; name: string },
  gaProperty: any,
  yesterday: string
) {
  const ranges = getStandardRanges(yesterday)

  for (const { startDate, endDate } of ranges) {
    try {
      const previousDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      const previousStartDate = format(subDays(new Date(startDate), previousDays), 'yyyy-MM-dd')
      const previousEndDate = format(subDays(new Date(endDate), previousDays), 'yyyy-MM-dd')

      const [trafficShare, sourcePerformance, landingPages, regions, devices, gender, age] = await Promise.all([
        GoogleAnalyticsService.fetchTrafficShare(gaProperty.user_id, gaProperty.property_id, startDate, endDate),
        GoogleAnalyticsService.fetchSourcePerformance(gaProperty.user_id, gaProperty.property_id, startDate, endDate),
        GoogleAnalyticsService.fetchLandingPages(gaProperty.user_id, gaProperty.property_id, startDate, endDate),
        GoogleAnalyticsService.fetchRegions(gaProperty.user_id, gaProperty.property_id, startDate, endDate),
        GoogleAnalyticsService.fetchDevices(gaProperty.user_id, gaProperty.property_id, startDate, endDate),
        GoogleAnalyticsService.fetchGender(gaProperty.user_id, gaProperty.property_id, startDate, endDate),
        GoogleAnalyticsService.fetchAge(gaProperty.user_id, gaProperty.property_id, startDate, endDate)
      ])

      await supabase.from('ga_period_snapshots').upsert({
        company_id: company.id,
        snapshot_date: yesterday,
        period_start: startDate,
        period_end: endDate,
        traffic_share: trafficShare,
        source_performance: sourcePerformance,
        landing_pages: landingPages,
        regions,
        devices,
        gender,
        age
      }, { onConflict: 'company_id,period_start,period_end' })
    } catch (e: any) {
      console.error(`[Sync:GA] Period snapshot ${startDate}..${endDate} failed for ${company.name}:`, e.message)
    }
  }
}

async function refreshGSCPeriodSnapshots(
  supabase: any,
  company: { id: string; name: string },
  gscSite: any,
  yesterday: string
) {
  const ranges = getStandardRanges(yesterday)

  for (const { startDate, endDate } of ranges) {
    try {
      const [keywords, landingPages, countries, devices, keywordCount, indexedPageCount] = await Promise.all([
        GoogleSearchConsoleService.fetchKeywords(gscSite.user_id, gscSite.site_url, startDate, endDate, 10),
        GoogleSearchConsoleService.fetchLandingPages(gscSite.user_id, gscSite.site_url, startDate, endDate, 20),
        GoogleSearchConsoleService.fetchCountries(gscSite.user_id, gscSite.site_url, startDate, endDate, 10),
        GoogleSearchConsoleService.fetchDevices(gscSite.user_id, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchKeywordCount(gscSite.user_id, gscSite.site_url, startDate, endDate),
        GoogleSearchConsoleService.fetchIndexedPageCount(gscSite.user_id, gscSite.site_url, startDate, endDate)
      ])

      await supabase.from('gsc_period_snapshots').upsert({
        company_id: company.id,
        snapshot_date: yesterday,
        period_start: startDate,
        period_end: endDate,
        keywords,
        landing_pages: landingPages,
        countries,
        devices,
        total_keywords: keywordCount,
        total_indexed_pages: indexedPageCount
      }, { onConflict: 'company_id,period_start,period_end' })
    } catch (e: any) {
      console.error(`[Sync:GSC] Period snapshot ${startDate}..${endDate} failed for ${company.name}:`, e.message)
    }
  }
}

async function refreshYTPeriodSnapshots(
  supabase: any,
  company: { id: string; name: string },
  ytChannel: any,
  yesterday: string
) {
  const ranges = getStandardRanges(yesterday)

  for (const { startDate, endDate } of ranges) {
    try {
      const videos = await YouTubeAnalyticsService.fetchTopVideosWithFallback(
        ytChannel.user_id, ytChannel.channel_id, startDate, endDate, 10
      )

      await supabase.from('yt_period_snapshots').upsert({
        company_id: company.id,
        snapshot_date: yesterday,
        period_start: startDate,
        period_end: endDate,
        top_videos: videos,
        is_public_data_only: false
      }, { onConflict: 'company_id,period_start,period_end' })
    } catch (e: any) {
      console.error(`[Sync:YT] Period snapshot ${startDate}..${endDate} failed for ${company.name}:`, e.message)
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

function getStandardRanges(yesterday: string): Array<{ startDate: string; endDate: string }> {
  return [
    { startDate: format(subDays(new Date(yesterday), 7), 'yyyy-MM-dd'), endDate: yesterday },
    { startDate: format(subDays(new Date(yesterday), 30), 'yyyy-MM-dd'), endDate: yesterday },
    { startDate: format(subDays(new Date(yesterday), 90), 'yyyy-MM-dd'), endDate: yesterday }
  ]
}

function getSyncStartDate(syncStatus: any, yesterday: string): string {
  if (syncStatus?.data_end_date) {
    // Incremental: start from day after last synced date
    const lastDate = new Date(syncStatus.data_end_date)
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = format(nextDate, 'yyyy-MM-dd')

    // If already up to date, still re-sync last 3 days for data corrections
    if (nextDateStr > yesterday) {
      return format(subDays(new Date(yesterday), 3), 'yyyy-MM-dd')
    }
    return nextDateStr
  }
  // First sync: backfill
  return format(subDays(new Date(yesterday), BACKFILL_DAYS), 'yyyy-MM-dd')
}

function getOldestSync(statuses: Map<string, any> | undefined): string | null {
  if (!statuses) return null
  let oldest: string | null = null
  statuses.forEach(s => {
    if (s.last_success_at && (!oldest || s.last_success_at < oldest)) {
      oldest = s.last_success_at
    }
  })
  return oldest
}

async function ensureSyncStatusRows(supabase: any, companies: Array<{ id: string; name: string }>) {
  const platforms = ['ga', 'gsc', 'youtube', 'linkedin']
  const rows = companies.flatMap(c =>
    platforms.map(p => ({ company_id: c.id, platform: p }))
  )

  // Use upsert with onConflict to avoid duplicates
  const { error } = await supabase.from('sync_status').upsert(rows, {
    onConflict: 'company_id,platform',
    ignoreDuplicates: true
  })
  if (error) console.error('[Sync] Error ensuring sync_status rows:', error.message)
}

async function updateSyncState(supabase: any, companyId: string, platform: string, state: string) {
  await supabase.from('sync_status').update({
    sync_state: state,
    last_sync_at: new Date().toISOString()
  }).eq('company_id', companyId).eq('platform', platform)
}

async function updateSyncSuccess(supabase: any, companyId: string, platform: string, startDate: string, endDate: string) {
  // Get current data_start_date to preserve it
  const { data: current } = await supabase.from('sync_status')
    .select('data_start_date')
    .eq('company_id', companyId)
    .eq('platform', platform)
    .single()

  await supabase.from('sync_status').update({
    sync_state: 'success',
    last_success_at: new Date().toISOString(),
    last_error: null,
    last_error_at: null,
    consecutive_failures: 0,
    data_start_date: current?.data_start_date || startDate,
    data_end_date: endDate
  }).eq('company_id', companyId).eq('platform', platform)
}

async function updateSyncError(supabase: any, companyId: string, platform: string, error: string) {
  const { data: current } = await supabase.from('sync_status')
    .select('consecutive_failures')
    .eq('company_id', companyId)
    .eq('platform', platform)
    .single()

  await supabase.from('sync_status').update({
    sync_state: 'error',
    last_error: error,
    last_error_at: new Date().toISOString(),
    consecutive_failures: (current?.consecutive_failures || 0) + 1
  }).eq('company_id', companyId).eq('platform', platform)
}

async function cleanupOldData(supabase: any) {
  const dailyCutoff = format(subDays(new Date(), 365), 'yyyy-MM-dd')
  const snapshotCutoff = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  console.log('[Sync] Cleaning up data older than', dailyCutoff, '(daily) and', snapshotCutoff, '(snapshots)')

  await Promise.all([
    supabase.from('ga_daily_metrics').delete().lt('date', dailyCutoff),
    supabase.from('ga_channel_daily').delete().lt('date', dailyCutoff),
    supabase.from('gsc_daily_metrics').delete().lt('date', dailyCutoff),
    supabase.from('yt_daily_metrics').delete().lt('date', dailyCutoff),
    supabase.from('li_daily_metrics').delete().lt('date', dailyCutoff),
    supabase.from('ga_period_snapshots').delete().lt('snapshot_date', snapshotCutoff),
    supabase.from('gsc_period_snapshots').delete().lt('snapshot_date', snapshotCutoff),
    supabase.from('yt_period_snapshots').delete().lt('snapshot_date', snapshotCutoff),
    supabase.from('li_period_snapshots').delete().lt('snapshot_date', snapshotCutoff)
  ])

  console.log('[Sync] Cleanup complete')
}
