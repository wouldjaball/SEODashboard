import { createClient } from '@supabase/supabase-js'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { LinkedInAnalyticsService } from '@/lib/services/linkedin-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { subDays, format, differenceInDays } from 'date-fns'
import { CronPerformanceTracker, chunkArray, chunkDateRange, CompanyTimeBudget } from '@/lib/utils/cron-utils'

// Incremental sync job: fetches daily-grain data from APIs and stores in normalized tables.
//
// Modes:
//   mode=daily     (default for cron) — Only incremental daily metrics. ~12 API calls/company.
//   mode=snapshots — Only refreshes period snapshots for companies with new data. ~42 calls/company.
//   mode=full      — Both daily + snapshots (for manual trigger-sync).

const BATCH_SIZE = 3
const BATCH_DELAY_MS = 1000
const BACKFILL_DAYS = 90
const MAX_EXECUTION_MS = 270_000 // 4.5 minutes
const COMPANY_TIME_BUDGET_MS = 45_000 // 45s per company
const LINKEDIN_MIN_BUDGET_MS = 15_000 // Need at least 15s for LinkedIn
const BACKFILL_CHUNK_DAYS = 30

type SyncMode = 'daily' | 'snapshots' | 'full'

interface SyncResult {
  company: string
  platform: string
  status: 'success' | 'error' | 'skipped' | 'partial'
  rowsSynced?: number
  snapshotStatus?: 'success' | 'error' | 'skipped'
  error?: string
  durationMs?: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mode = (searchParams.get('mode') || 'daily') as SyncMode
  if (!['daily', 'snapshots', 'full'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode. Use: daily, snapshots, full' }, { status: 400 })
  }

  const companyIdsParam = searchParams.get('companyIds')
  const targetCompanyIds = companyIdsParam ? companyIdsParam.split(',').filter(Boolean) : null
  const forceSync = searchParams.get('force') === 'true'

  console.log(`[Sync] Starting mode=${mode} force=${forceSync} at ${new Date().toISOString()}`)
  if (targetCompanyIds) {
    console.log(`[Sync] Targeted: ${targetCompanyIds.length} companies`)
  }

  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseKey) {
    console.error('[Sync] No Supabase secret key found')
    return NextResponse.json({ error: 'Missing Supabase secret key' }, { status: 500 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey)
  const tracker = new CronPerformanceTracker()
  const startTime = Date.now()
  const results: SyncResult[] = []

  try {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')

    if (companiesError || !companies) {
      console.error('[Sync] Failed to fetch companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    const filteredCompanies = targetCompanyIds
      ? companies.filter(c => targetCompanyIds.includes(c.id))
      : companies

    if (targetCompanyIds && filteredCompanies.length === 0) {
      return NextResponse.json({ error: 'No matching companies found' }, { status: 404 })
    }

    console.log(`[Sync] ${filteredCompanies.length} companies, mode=${mode}`)

    await ensureSyncStatusRows(supabase, filteredCompanies)

    const { data: syncStatuses } = await supabase
      .from('sync_status')
      .select('*')
      .order('last_success_at', { ascending: true, nullsFirst: true })

    const companySync = new Map<string, Map<string, any>>()
    syncStatuses?.forEach(s => {
      if (!companySync.has(s.company_id)) {
        companySync.set(s.company_id, new Map())
      }
      companySync.get(s.company_id)!.set(s.platform, s)
    })

    // For snapshot mode, filter to companies with new data since last snapshot refresh
    let companiesToSync = [...filteredCompanies]
    if (mode === 'snapshots') {
      companiesToSync = companiesToSync.filter(c => {
        const statuses = companySync.get(c.id)
        return shouldRefreshSnapshots(statuses)
      })
      console.log(`[Sync:Snapshots] ${companiesToSync.length}/${filteredCompanies.length} companies need snapshot refresh`)
    }

    // Sort by staleness (most stale first)
    companiesToSync.sort((a, b) => {
      const aOldest = getOldestSync(companySync.get(a.id))
      const bOldest = getOldestSync(companySync.get(b.id))
      if (!aOldest) return -1
      if (!bOldest) return 1
      return new Date(aOldest).getTime() - new Date(bOldest).getTime()
    })

    const batches = chunkArray(companiesToSync, BATCH_SIZE)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        console.log(`[Sync] Time limit reached after ${batchIndex} batches`)
        break
      }

      const batch = batches[batchIndex]
      console.log(`[Sync] Batch ${batchIndex + 1}/${batches.length} - ${batch.map(c => c.name).join(', ')}`)

      const batchResults = await Promise.all(
        batch.map(company =>
          syncCompany(supabase, company, companySync.get(company.id), forceSync, mode)
        )
      )

      batchResults.forEach(companyResults => results.push(...companyResults))

      const successCount = batchResults.flat().filter(r => r.status === 'success' || r.status === 'partial').length
      const errorCount = batchResults.flat().filter(r => r.status === 'error').length
      tracker.recordBatchCompleted(successCount, errorCount)
      console.log(tracker.getProgressReport())

      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    // Only cleanup during daily runs (not snapshot-only runs)
    if (mode !== 'snapshots') {
      await cleanupOldData(supabase)
    }

    const metrics = tracker.finish()

    // Structured summary log
    const summary = {
      mode,
      companiesProcessed: companiesToSync.length,
      results: {
        success: results.filter(r => r.status === 'success').length,
        partial: results.filter(r => r.status === 'partial').length,
        error: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length,
      },
      durationMs: metrics.duration,
      durationSec: Math.round((metrics.duration || 0) / 1000),
    }
    console.log('[Sync] Summary:', JSON.stringify(summary))

    return NextResponse.json({
      message: 'Analytics sync complete',
      timestamp: new Date().toISOString(),
      mode,
      summary,
      results,
      performance: metrics
    })
  } catch (error: any) {
    console.error('[Sync] Failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================
// COMPANY SYNC (with time budget)
// ============================================================

async function syncCompany(
  supabase: any,
  company: { id: string; name: string },
  syncStatuses: Map<string, any> | undefined,
  forceSync: boolean,
  mode: SyncMode
): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  const budget = new CompanyTimeBudget(COMPANY_TIME_BUDGET_MS)

  // Fetch all mappings in parallel
  const [gaMappingResult, gscMappingResult, ytMappingResult, liMappingResult] = await Promise.all([
    supabase.from('company_ga_mappings').select('ga_property_id').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_gsc_mappings').select('gsc_site_id').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_youtube_mappings').select('youtube_channel_id').eq('company_id', company.id).maybeSingle(),
    supabase.from('company_linkedin_mappings').select('linkedin_page_id').eq('company_id', company.id).maybeSingle()
  ])

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

  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // === DAILY + FULL: Sync incremental daily data ===
  if (mode === 'daily' || mode === 'full') {
    const parallelSyncs: Promise<SyncResult>[] = []

    if (gaProperty && (forceSync || !shouldSkipPlatform(syncStatuses?.get('ga')))) {
      parallelSyncs.push(syncGA(supabase, company, gaProperty, syncStatuses?.get('ga'), yesterday, mode))
    } else if (gaProperty) {
      results.push({ company: company.name, platform: 'ga', status: 'skipped', error: 'backoff' })
    }

    if (gscSite && (forceSync || !shouldSkipPlatform(syncStatuses?.get('gsc')))) {
      parallelSyncs.push(syncGSC(supabase, company, gscSite, syncStatuses?.get('gsc'), yesterday, mode))
    } else if (gscSite) {
      results.push({ company: company.name, platform: 'gsc', status: 'skipped', error: 'backoff' })
    }

    if (ytChannel && (forceSync || !shouldSkipPlatform(syncStatuses?.get('youtube')))) {
      parallelSyncs.push(syncYouTube(supabase, company, ytChannel, syncStatuses?.get('youtube'), yesterday, mode))
    } else if (ytChannel) {
      results.push({ company: company.name, platform: 'youtube', status: 'skipped', error: 'backoff' })
    }

    // Race parallel syncs against company time budget
    try {
      const parallelResults = await budget.raceWithBudget(
        Promise.allSettled(parallelSyncs),
        `${company.name} parallel syncs`
      )
      parallelResults.forEach(r => {
        if (r.status === 'fulfilled') results.push(r.value)
        else results.push({ company: company.name, platform: 'unknown', status: 'error', error: r.reason?.message })
      })
    } catch (e: any) {
      console.warn(`[Sync] ${company.name}: time budget exceeded during parallel syncs (${budget.elapsed}ms)`)
      results.push({ company: company.name, platform: 'ga+gsc+yt', status: 'skipped', error: 'time_budget_exceeded' })
    }

    // LinkedIn sync - only if we still have budget
    if (liPage && (forceSync || !shouldSkipPlatform(syncStatuses?.get('linkedin')))) {
      if (budget.hasAtLeast(LINKEDIN_MIN_BUDGET_MS)) {
        try {
          const liResult = await budget.raceWithBudget(
            syncLinkedIn(supabase, company, liPage, syncStatuses?.get('linkedin'), yesterday),
            `${company.name} LinkedIn`
          )
          results.push(liResult)
        } catch (e: any) {
          if (e.message?.includes('time_budget_exceeded')) {
            console.warn(`[Sync] ${company.name}: LinkedIn skipped (time budget)`)
            results.push({ company: company.name, platform: 'linkedin', status: 'skipped', error: 'time_budget_exceeded' })
          } else {
            results.push({ company: company.name, platform: 'linkedin', status: 'error', error: e.message })
          }
        }
      } else {
        console.warn(`[Sync] ${company.name}: LinkedIn skipped (${budget.remaining}ms remaining, need ${LINKEDIN_MIN_BUDGET_MS}ms)`)
        results.push({ company: company.name, platform: 'linkedin', status: 'skipped', error: 'insufficient_time_budget' })
      }
    } else if (liPage) {
      results.push({ company: company.name, platform: 'linkedin', status: 'skipped', error: 'backoff' })
    }
  }

  // === SNAPSHOTS + FULL: Refresh period snapshots ===
  if (mode === 'snapshots' || mode === 'full') {
    const snapshotSyncs: Promise<SyncResult>[] = []

    if (gaProperty) {
      snapshotSyncs.push(refreshGAPeriodSnapshotsWrapped(supabase, company, gaProperty, yesterday))
    }
    if (gscSite) {
      snapshotSyncs.push(refreshGSCPeriodSnapshotsWrapped(supabase, company, gscSite, yesterday))
    }
    if (ytChannel) {
      snapshotSyncs.push(refreshYTPeriodSnapshotsWrapped(supabase, company, ytChannel, yesterday))
    }

    const snapshotResults = await Promise.allSettled(snapshotSyncs)
    snapshotResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value)
      else results.push({ company: company.name, platform: 'snapshots', status: 'error', error: r.reason?.message })
    })

    // Update last_snapshot_refresh_at for all platforms
    const successfulSnaps = snapshotResults.filter(r => r.status === 'fulfilled' && r.value.status === 'success')
    if (successfulSnaps.length > 0) {
      await updateSnapshotRefreshTimestamp(supabase, company.id)
    }
  }

  console.log(`[Sync] ${company.name}: completed in ${budget.elapsed}ms (${results.length} results)`)
  return results
}

// ============================================================
// PLATFORM SYNC FUNCTIONS (daily mode)
// ============================================================

async function syncGA(
  supabase: any,
  company: { id: string; name: string },
  gaProperty: any,
  syncStatus: any,
  yesterday: string,
  mode: SyncMode
): Promise<SyncResult> {
  const platform = 'ga'
  const syncStart = Date.now()
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const startDate = getSyncStartDate(syncStatus, yesterday)
    const dayCount = differenceInDays(new Date(yesterday), new Date(startDate))
    console.log(`[Sync:GA] ${company.name}: ${startDate} to ${yesterday} (${dayCount} days)`)

    // Chunk large backfills
    const chunks = chunkDateRange(startDate, yesterday, BACKFILL_CHUNK_DAYS)
    let totalRowsSynced = 0

    for (const chunk of chunks) {
      if (chunks.length > 1) {
        console.log(`[Sync:GA] ${company.name}: chunk ${chunk.startDate} to ${chunk.endDate}`)
      }

      const [dailyMetrics, channelData] = await Promise.all([
        GoogleAnalyticsService.fetchDailyMetrics(gaProperty.user_id, gaProperty.property_id, chunk.startDate, chunk.endDate),
        GoogleAnalyticsService.fetchChannelData(gaProperty.user_id, gaProperty.property_id, chunk.startDate, chunk.endDate)
      ])

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
        totalRowsSynced += dailyMetrics.length
      }

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

      // Upsert after each chunk so partial backfills are saved
      await updateSyncSuccess(supabase, company.id, platform, startDate, chunk.endDate)
    }

    // In full mode, also refresh snapshots inline
    let snapshotStatus: 'success' | 'error' | 'skipped' = 'skipped'
    if (mode === 'full') {
      try {
        await refreshGAPeriodSnapshots(supabase, company, gaProperty, yesterday)
        snapshotStatus = 'success'
      } catch (e: any) {
        console.error(`[Sync:GA] ${company.name} snapshot refresh failed:`, e.message)
        snapshotStatus = 'error'
      }
    }

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    const durationMs = Date.now() - syncStart
    console.log(`[Sync:GA] ${company.name}: synced ${totalRowsSynced} days in ${durationMs}ms`)

    if (snapshotStatus === 'error') {
      return { company: company.name, platform, status: 'partial', rowsSynced: totalRowsSynced, snapshotStatus, durationMs }
    }
    return { company: company.name, platform, status: 'success', rowsSynced: totalRowsSynced, snapshotStatus, durationMs }
  } catch (e: any) {
    const errorMsg = classifyError(e.message)
    console.error(`[Sync:GA] ${company.name} failed:`, errorMsg)
    await updateSyncError(supabase, company.id, platform, errorMsg)
    return { company: company.name, platform, status: 'error', error: errorMsg, durationMs: Date.now() - syncStart }
  }
}

async function syncGSC(
  supabase: any,
  company: { id: string; name: string },
  gscSite: any,
  syncStatus: any,
  yesterday: string,
  mode: SyncMode
): Promise<SyncResult> {
  const platform = 'gsc'
  const syncStart = Date.now()
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const startDate = getSyncStartDate(syncStatus, yesterday)
    const dayCount = differenceInDays(new Date(yesterday), new Date(startDate))
    console.log(`[Sync:GSC] ${company.name}: ${startDate} to ${yesterday} (${dayCount} days)`)

    const chunks = chunkDateRange(startDate, yesterday, BACKFILL_CHUNK_DAYS)
    let totalRowsSynced = 0

    for (const chunk of chunks) {
      if (chunks.length > 1) {
        console.log(`[Sync:GSC] ${company.name}: chunk ${chunk.startDate} to ${chunk.endDate}`)
      }

      const dailyMetrics = await GoogleSearchConsoleService.fetchDailyMetrics(
        gscSite.user_id, gscSite.site_url, chunk.startDate, chunk.endDate
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
        totalRowsSynced += dailyMetrics.length
      }

      await updateSyncSuccess(supabase, company.id, platform, startDate, chunk.endDate)
    }

    let snapshotStatus: 'success' | 'error' | 'skipped' = 'skipped'
    if (mode === 'full') {
      try {
        await refreshGSCPeriodSnapshots(supabase, company, gscSite, yesterday)
        snapshotStatus = 'success'
      } catch (e: any) {
        console.error(`[Sync:GSC] ${company.name} snapshot refresh failed:`, e.message)
        snapshotStatus = 'error'
      }
    }

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    const durationMs = Date.now() - syncStart
    console.log(`[Sync:GSC] ${company.name}: synced ${totalRowsSynced} days in ${durationMs}ms`)

    if (snapshotStatus === 'error') {
      return { company: company.name, platform, status: 'partial', rowsSynced: totalRowsSynced, snapshotStatus, durationMs }
    }
    return { company: company.name, platform, status: 'success', rowsSynced: totalRowsSynced, snapshotStatus, durationMs }
  } catch (e: any) {
    const errorMsg = classifyError(e.message)
    console.error(`[Sync:GSC] ${company.name} failed:`, errorMsg)
    await updateSyncError(supabase, company.id, platform, errorMsg)
    return { company: company.name, platform, status: 'error', error: errorMsg, durationMs: Date.now() - syncStart }
  }
}

async function syncYouTube(
  supabase: any,
  company: { id: string; name: string },
  ytChannel: any,
  syncStatus: any,
  yesterday: string,
  mode: SyncMode
): Promise<SyncResult> {
  const platform = 'youtube'
  const syncStart = Date.now()
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const startDate = getSyncStartDate(syncStatus, yesterday)
    const dayCount = differenceInDays(new Date(yesterday), new Date(startDate))
    console.log(`[Sync:YT] ${company.name}: ${startDate} to ${yesterday} (${dayCount} days)`)

    const chunks = chunkDateRange(startDate, yesterday, BACKFILL_CHUNK_DAYS)
    let totalRowsSynced = 0

    for (const chunk of chunks) {
      if (chunks.length > 1) {
        console.log(`[Sync:YT] ${company.name}: chunk ${chunk.startDate} to ${chunk.endDate}`)
      }

      const dailyData = await YouTubeAnalyticsService.fetchDailyDataWithFallback(
        ytChannel.user_id, ytChannel.channel_id, chunk.startDate, chunk.endDate
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
        totalRowsSynced += dailyData.length
      }

      await updateSyncSuccess(supabase, company.id, platform, startDate, chunk.endDate)
    }

    let snapshotStatus: 'success' | 'error' | 'skipped' = 'skipped'
    if (mode === 'full') {
      try {
        await refreshYTPeriodSnapshots(supabase, company, ytChannel, yesterday)
        snapshotStatus = 'success'
      } catch (e: any) {
        console.error(`[Sync:YT] ${company.name} snapshot refresh failed:`, e.message)
        snapshotStatus = 'error'
      }
    }

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    const durationMs = Date.now() - syncStart
    console.log(`[Sync:YT] ${company.name}: synced ${totalRowsSynced} days in ${durationMs}ms`)

    if (snapshotStatus === 'error') {
      return { company: company.name, platform, status: 'partial', rowsSynced: totalRowsSynced, snapshotStatus, durationMs }
    }
    return { company: company.name, platform, status: 'success', rowsSynced: totalRowsSynced, snapshotStatus, durationMs }
  } catch (e: any) {
    const errorMsg = classifyError(e.message)
    console.error(`[Sync:YT] ${company.name} failed:`, errorMsg)
    await updateSyncError(supabase, company.id, platform, errorMsg)
    return { company: company.name, platform, status: 'error', error: errorMsg, durationMs: Date.now() - syncStart }
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
  const syncStart = Date.now()
  await updateSyncState(supabase, company.id, platform, 'syncing')

  try {
    const hasTokens = await OAuthTokenService.hasValidLinkedInTokens(liPage.user_id)
    if (!hasTokens) {
      const errorMsg = classifyError('No valid LinkedIn tokens')
      await updateSyncError(supabase, company.id, platform, errorMsg)
      return { company: company.name, platform, status: 'error', error: errorMsg }
    }

    const startDate = getSyncStartDate(syncStatus, yesterday)
    const previousStartDate = format(subDays(new Date(startDate), 30), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(yesterday), 30), 'yyyy-MM-dd')

    console.log(`[Sync:LI] ${company.name}: ${startDate} to ${yesterday}`)

    const liData = await LinkedInAnalyticsService.fetchAllMetrics(
      liPage.user_id, liPage.page_id,
      startDate, yesterday,
      previousStartDate, previousEndDate
    )

    // Build daily metrics from daily arrays
    const dateMap = new Map<string, any>()
    const visitorDaily = liData.visitorDaily || []
    const followerDaily = liData.followerDaily || []
    const impressionDaily = liData.impressionDaily || []
    const contentDaily = liData.contentDaily || []

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
    contentDaily.forEach((d: any) => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date })
      dateMap.get(d.date)!.clicks = d.clicks || 0
      dateMap.get(d.date)!.reactions = d.reactions || 0
      dateMap.get(d.date)!.comments = d.comments || 0
      dateMap.get(d.date)!.shares = d.shares || 0
    })

    const dailyRows: any[] = []
    dateMap.forEach((row, date) => {
      dailyRows.push({
        company_id: company.id,
        date,
        desktop_visitors: row.desktop_visitors || 0,
        mobile_visitors: row.mobile_visitors || 0,
        organic_follower_gain: row.organic_follower_gain || 0,
        paid_follower_gain: row.paid_follower_gain || 0,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        reactions: row.reactions || 0,
        comments: row.comments || 0,
        shares: row.shares || 0
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
      video_metrics: null,
      employee_advocacy_metrics: null,
      content_breakdown: null,
      social_listening: null,
      data_source: 'api'
    }, { onConflict: 'company_id,period_start,period_end' })

    if (snapError) console.error(`[Sync:LI] Snapshot upsert warning:`, snapError.message)

    await updateSyncSuccess(supabase, company.id, platform, startDate, yesterday)
    const durationMs = Date.now() - syncStart
    console.log(`[Sync:LI] ${company.name}: synced ${dailyRows.length} days in ${durationMs}ms`)
    return { company: company.name, platform, status: 'success', rowsSynced: dailyRows.length, durationMs }
  } catch (e: any) {
    const errorMsg = classifyError(e.message)
    console.error(`[Sync:LI] ${company.name} failed:`, errorMsg)
    await updateSyncError(supabase, company.id, platform, errorMsg)
    return { company: company.name, platform, status: 'error', error: errorMsg, durationMs: Date.now() - syncStart }
  }
}

// ============================================================
// PERIOD SNAPSHOT REFRESHERS (parallelized across ranges)
// ============================================================

async function refreshGAPeriodSnapshotsWrapped(
  supabase: any,
  company: { id: string; name: string },
  gaProperty: any,
  yesterday: string
): Promise<SyncResult> {
  const syncStart = Date.now()
  try {
    await refreshGAPeriodSnapshots(supabase, company, gaProperty, yesterday)
    return { company: company.name, platform: 'ga_snapshots', status: 'success', durationMs: Date.now() - syncStart }
  } catch (e: any) {
    return { company: company.name, platform: 'ga_snapshots', status: 'error', error: e.message, durationMs: Date.now() - syncStart }
  }
}

async function refreshGSCPeriodSnapshotsWrapped(
  supabase: any,
  company: { id: string; name: string },
  gscSite: any,
  yesterday: string
): Promise<SyncResult> {
  const syncStart = Date.now()
  try {
    await refreshGSCPeriodSnapshots(supabase, company, gscSite, yesterday)
    return { company: company.name, platform: 'gsc_snapshots', status: 'success', durationMs: Date.now() - syncStart }
  } catch (e: any) {
    return { company: company.name, platform: 'gsc_snapshots', status: 'error', error: e.message, durationMs: Date.now() - syncStart }
  }
}

async function refreshYTPeriodSnapshotsWrapped(
  supabase: any,
  company: { id: string; name: string },
  ytChannel: any,
  yesterday: string
): Promise<SyncResult> {
  const syncStart = Date.now()
  try {
    await refreshYTPeriodSnapshots(supabase, company, ytChannel, yesterday)
    return { company: company.name, platform: 'yt_snapshots', status: 'success', durationMs: Date.now() - syncStart }
  } catch (e: any) {
    return { company: company.name, platform: 'yt_snapshots', status: 'error', error: e.message, durationMs: Date.now() - syncStart }
  }
}

async function refreshGAPeriodSnapshots(
  supabase: any,
  company: { id: string; name: string },
  gaProperty: any,
  yesterday: string
) {
  const ranges = getStandardRanges(yesterday)

  // Parallelize across all 3 ranges instead of sequential
  const results = await Promise.allSettled(ranges.map(async ({ startDate, endDate }) => {
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
  }))

  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    failures.forEach((f: any) => console.error(`[Sync:GA] Snapshot range failed for ${company.name}:`, f.reason?.message))
  }
}

async function refreshGSCPeriodSnapshots(
  supabase: any,
  company: { id: string; name: string },
  gscSite: any,
  yesterday: string
) {
  const ranges = getStandardRanges(yesterday)

  const results = await Promise.allSettled(ranges.map(async ({ startDate, endDate }) => {
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
  }))

  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    failures.forEach((f: any) => console.error(`[Sync:GSC] Snapshot range failed for ${company.name}:`, f.reason?.message))
  }
}

async function refreshYTPeriodSnapshots(
  supabase: any,
  company: { id: string; name: string },
  ytChannel: any,
  yesterday: string
) {
  const ranges = getStandardRanges(yesterday)

  const results = await Promise.allSettled(ranges.map(async ({ startDate, endDate }) => {
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
  }))

  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    failures.forEach((f: any) => console.error(`[Sync:YT] Snapshot range failed for ${company.name}:`, f.reason?.message))
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
    const lastDate = new Date(syncStatus.data_end_date)
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = format(nextDate, 'yyyy-MM-dd')

    if (nextDateStr > yesterday) {
      return format(subDays(new Date(yesterday), 3), 'yyyy-MM-dd')
    }
    return nextDateStr
  }
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

// Check if any platform has new daily data since last snapshot refresh
function shouldRefreshSnapshots(statuses: Map<string, any> | undefined): boolean {
  if (!statuses) return true // No statuses = never synced, needs snapshots

  let hasNewData = false
  statuses.forEach(s => {
    if (!s.last_snapshot_refresh_at) {
      hasNewData = true // Never refreshed snapshots
      return
    }
    if (s.last_success_at && new Date(s.last_success_at) > new Date(s.last_snapshot_refresh_at)) {
      hasNewData = true // Daily data written since last snapshot
    }
  })
  return hasNewData
}

async function ensureSyncStatusRows(supabase: any, companies: Array<{ id: string; name: string }>) {
  const platforms = ['ga', 'gsc', 'youtube', 'linkedin']
  const rows = companies.flatMap(c =>
    platforms.map(p => ({ company_id: c.id, platform: p }))
  )

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

async function updateSnapshotRefreshTimestamp(supabase: any, companyId: string) {
  const now = new Date().toISOString()
  await supabase.from('sync_status').update({
    last_snapshot_refresh_at: now
  }).eq('company_id', companyId)
}

function shouldSkipPlatform(syncStatus: any): boolean {
  if (!syncStatus) return false
  const failures = syncStatus.consecutive_failures || 0
  if (failures < 3) return false

  const lastErrorAt = syncStatus.last_error_at ? new Date(syncStatus.last_error_at).getTime() : 0
  if (!lastErrorAt) return false

  const backoffHours = Math.min(Math.pow(4, failures - 3), 48)
  const backoffMs = backoffHours * 60 * 60 * 1000
  const elapsed = Date.now() - lastErrorAt

  return elapsed < backoffMs
}

function classifyError(errorMessage: string): string {
  const tokenPatterns = ['invalid_grant', 'NO_TOKENS', 'REFRESH_FAILED', 'No valid', 'token', 'Token']
  const isTokenError = tokenPatterns.some(p => errorMessage.includes(p))
  return isTokenError ? `Token issue: ${errorMessage}` : errorMessage
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
