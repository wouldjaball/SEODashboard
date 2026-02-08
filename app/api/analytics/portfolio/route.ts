import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'
import {
  assembleCompanyAnalytics,
  findClosestSnapshotsBulk,
  calculatePortfolioAggregateMetrics
} from '@/lib/analytics/normalized-aggregation'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const defaultEndDate = new Date()
    const defaultStartDate = subDays(defaultEndDate, 30)

    const startDate = searchParams.get('startDate') || format(defaultStartDate, 'yyyy-MM-dd')
    const endDate = searchParams.get('endDate') || format(defaultEndDate, 'yyyy-MM-dd')
    const forceRefresh = searchParams.get('refresh') === 'true'

    // For 30-day default date range, try cache first
    const isDefaultRange = (
      startDate === format(defaultStartDate, 'yyyy-MM-dd') &&
      endDate === format(defaultEndDate, 'yyyy-MM-dd')
    )
    const cacheDate = format(defaultEndDate, 'yyyy-MM-dd')

    if (isDefaultRange && !forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('portfolio_cache')
        .select('companies_data, aggregate_metrics, updated_at')
        .eq('user_id', user.id)
        .eq('cache_date', cacheDate)
        .single()

      if (!cacheError && cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime()
        const isVeryStale = cacheAge > 48 * 60 * 60 * 1000
        const isStale = cacheAge > 12 * 60 * 60 * 1000

        if (!isVeryStale) {
          // Check if cached data has actual metrics (not empty placeholders)
          const cachedCompanies = cachedData.companies_data || []
          const hasAnyMetrics = cachedCompanies.some((c: any) =>
            c.gaMetrics || c.gscMetrics || c.ytMetrics || c.liVisitorMetrics
          )

          if (!hasAnyMetrics && cachedCompanies.length > 0) {
            console.log(`[Portfolio API] Cache exists but has no metrics for any company, treating as miss`)
            // Fall through to live fetch
          } else {
            console.log(`[Portfolio API] Serving cached data for user ${user.id} (age: ${Math.floor(cacheAge / (60 * 60 * 1000))}h)`)

            if (isStale) {
              console.log(`[Portfolio API] Cache is stale, will trigger background refresh...`)
              setImmediate(async () => {
                try {
                  await refreshCacheInBackground(user.id, startDate, endDate, cacheDate, supabase)
                } catch (error) {
                  console.error(`[Portfolio API] Background refresh failed for user ${user.id}:`, error)
                }
              })
            }

            const response = NextResponse.json({
              companies: cachedData.companies_data,
              aggregateMetrics: cachedData.aggregate_metrics,
              cached: true,
              cacheAge: Math.floor(cacheAge / (60 * 1000)),
              cacheDate: cacheDate
            })

            response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
            response.headers.set('CDN-Cache-Control', 'public, max-age=300')
            response.headers.set('Vary', 'Authorization, Cookie')

            return response
          }
        } else {
          console.log(`[Portfolio API] Cache is very stale for user ${user.id}, forcing refresh...`)
        }
      } else {
        console.log(`[Portfolio API] No cache found for user ${user.id} on date ${cacheDate}`)
      }
    }

    // Cache miss or stale cache — fetch live data
    console.log(`[Portfolio API] Cache miss for user ${user.id}, fetching live data`)

    // Get all companies the user has access to
    const { data: userCompanies, error: companiesError } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (*)
      `)
      .eq('user_id', user.id)

    if (companiesError) {
      throw companiesError
    }

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json({
        companies: [],
        aggregateMetrics: {
          totalTraffic: 0,
          totalConversions: 0,
          avgConversionRate: 0,
          totalRevenue: 0,
          previousPeriod: {
            totalTraffic: 0,
            totalConversions: 0,
            avgConversionRate: 0,
            totalRevenue: 0
          }
        }
      })
    }

    // Calculate previous period dates
    const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    const previousStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(endDate), daysDiff), 'yyyy-MM-dd')
    const companyIds = userCompanies.map((uc: any) => uc.company_id)

    // ============================================
    // FAST PATH: Bulk query from normalized tables (always tried first)
    // ============================================
    {
      console.log(`[Portfolio API] Trying bulk normalized tables for ${companyIds.length} companies...`)
      const bulkStartTime = Date.now()

      const bulkResults = await fetchPortfolioFromNormalizedTables(
        supabase, companyIds, startDate, endDate, previousStartDate, previousEndDate
      )

      if (bulkResults) {
        const queryMs = Date.now() - bulkStartTime
        console.log(`[Portfolio API] Bulk normalized query completed in ${queryMs}ms`)

        // Fetch sync info for all companies
        const { data: syncStatuses } = await supabase
          .from('sync_status')
          .select('company_id, platform, last_success_at, data_end_date, sync_state')
          .in('company_id', companyIds)

        const lastSyncTimes = (syncStatuses || [])
          .filter((s: any) => s.last_success_at)
          .map((s: any) => new Date(s.last_success_at).getTime())
        const companiesWithSyncedData = new Set(
          (syncStatuses || []).filter((s: any) => s.data_end_date).map((s: any) => s.company_id)
        )

        const syncInfo = {
          lastSyncAt: lastSyncTimes.length > 0 ? new Date(Math.max(...lastSyncTimes)).toISOString() : null,
          companiesWithData: companiesWithSyncedData.size,
          totalCompanies: companyIds.length,
          queryTimeMs: queryMs
        }

        // Fill companies without normalized data from legacy cache
        const companiesNeedingLegacyCache = companyIds.filter(id => {
          const a = bulkResults.get(id)
          return !a || (!a.gaMetrics && !a.gscMetrics && !a.ytMetrics && !a.liVisitorMetrics)
        })

        if (companiesNeedingLegacyCache.length > 0) {
          console.log(`[Portfolio API] ${companiesNeedingLegacyCache.length} companies have no normalized data, checking legacy cache...`)
          const { data: legacyCacheEntries } = await supabase
            .from('analytics_cache')
            .select('company_id, data')
            .in('company_id', companiesNeedingLegacyCache)
            .eq('data_type', 'daily_snapshot')
            .gt('expires_at', new Date().toISOString())

          if (legacyCacheEntries && legacyCacheEntries.length > 0) {
            for (const entry of legacyCacheEntries) {
              if (entry.data) {
                bulkResults.set(entry.company_id, entry.data)
              }
            }
            console.log(`[Portfolio API] Filled ${legacyCacheEntries.length} companies from legacy cache`)
          }

          // Also check on-demand cache entries for any still-missing companies
          const stillMissing = companiesNeedingLegacyCache.filter(id => {
            const a = bulkResults.get(id)
            return !a || (!a.gaMetrics && !a.gscMetrics && !a.ytMetrics && !a.liVisitorMetrics)
          })
          if (stillMissing.length > 0) {
            const { data: onDemandEntries } = await supabase
              .from('analytics_cache')
              .select('company_id, data')
              .in('company_id', stillMissing)
              .eq('data_type', 'all')
              .gt('expires_at', new Date().toISOString())

            if (onDemandEntries && onDemandEntries.length > 0) {
              for (const entry of onDemandEntries) {
                if (entry.data) {
                  bulkResults.set(entry.company_id, entry.data)
                }
              }
              console.log(`[Portfolio API] Filled ${onDemandEntries.length} more companies from on-demand cache`)
            }

            // Second tier: accept stale cache entries up to 7 days old for companies still missing
            const stillMissingAfterFresh = stillMissing.filter(id => {
              const a = bulkResults.get(id)
              return !a || (!a.gaMetrics && !a.gscMetrics && !a.ytMetrics && !a.liVisitorMetrics)
            })
            if (stillMissingAfterFresh.length > 0) {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
              const { data: staleEntries } = await supabase
                .from('analytics_cache')
                .select('company_id, data, expires_at')
                .in('company_id', stillMissingAfterFresh)
                .in('data_type', ['daily_snapshot', 'all'])
                .gt('expires_at', sevenDaysAgo)
                .order('expires_at', { ascending: false })

              if (staleEntries && staleEntries.length > 0) {
                const filled = new Set<string>()
                for (const entry of staleEntries) {
                  if (entry.data && !filled.has(entry.company_id)) {
                    bulkResults.set(entry.company_id, entry.data)
                    filled.add(entry.company_id)
                  }
                }
                console.log(`[Portfolio API] Filled ${filled.size} companies from stale cache (up to 7 days old)`)
              }
            }
          }
        }

        // Check which companies STILL have no meaningful data after normalized + cache
        const companiesStillMissing = companyIds.filter(id => {
          const a = bulkResults.get(id)
          return !a || (!a.gaMetrics && !a.gscMetrics && !a.ytMetrics && !a.liVisitorMetrics)
        })

        if (companiesStillMissing.length > 0) {
          console.log(`[Portfolio API] ${companiesStillMissing.length} companies still missing data, fetching via HTTP...`)
          const missingUCs = userCompanies.filter((uc: any) =>
            companiesStillMissing.includes(uc.company_id)
          )
          const httpStartTime = Date.now()
          const httpResults = await Promise.all(
            missingUCs.map((uc: any) => fetchCompanyAnalyticsViaHTTP(uc, startDate, endDate, request))
          )
          console.log(`[Portfolio API] HTTP fallback for ${missingUCs.length} companies completed in ${Date.now() - httpStartTime}ms`)

          // Merge HTTP results back into bulkResults
          for (const result of httpResults) {
            if (result?.id) {
              bulkResults.set(result.id, result)
            }
          }
        }

        // Merge company metadata with analytics data (always — no more all-or-nothing check)
        const companiesWithData = userCompanies.map((uc: any) => {
          const analytics = bulkResults.get(uc.company_id) || {}
          return {
            ...uc.companies,
            role: uc.role,
            ...analytics
          }
        })

        const aggregateMetrics = calculatePortfolioAggregateMetrics(companiesWithData)
        const result = { companies: companiesWithData, aggregateMetrics, cached: false, syncInfo }

        const hasAnyMetrics = companiesWithData.some((c: any) =>
          c.gaMetrics || c.gscMetrics || c.ytMetrics || c.liVisitorMetrics
        )
        if (isDefaultRange && hasAnyMetrics) {
          await updatePortfolioCache(supabase, user.id, cacheDate, companiesWithData, aggregateMetrics)
        }

        const response = NextResponse.json(result)
        response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')
        response.headers.set('CDN-Cache-Control', 'public, max-age=60')
        response.headers.set('Vary', 'Authorization, Cookie')
        return response
      }

      // fetchPortfolioFromNormalizedTables returned null — no sync data at all
      // Try direct legacy cache lookup before falling back to HTTP
      console.log(`[Portfolio API] No normalized data available, trying legacy cache for ${companyIds.length} companies...`)

      const legacyCacheResults = new Map<string, any>()
      const now = new Date().toISOString()

      // First: try unexpired cache entries
      const { data: freshCacheEntries } = await supabase
        .from('analytics_cache')
        .select('company_id, data')
        .in('company_id', companyIds)
        .in('data_type', ['daily_snapshot', 'all'])
        .gt('expires_at', now)
        .order('expires_at', { ascending: false })

      if (freshCacheEntries && freshCacheEntries.length > 0) {
        for (const entry of freshCacheEntries) {
          if (entry.data && !legacyCacheResults.has(entry.company_id)) {
            legacyCacheResults.set(entry.company_id, entry.data)
          }
        }
        console.log(`[Portfolio API] Found ${legacyCacheResults.size} companies in fresh legacy cache`)
      }

      // Second: accept stale entries up to 7 days old for remaining companies
      const companiesStillMissing = companyIds.filter(id => !legacyCacheResults.has(id))
      if (companiesStillMissing.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: staleCacheEntries } = await supabase
          .from('analytics_cache')
          .select('company_id, data, expires_at')
          .in('company_id', companiesStillMissing)
          .in('data_type', ['daily_snapshot', 'all'])
          .gt('expires_at', sevenDaysAgo)
          .order('expires_at', { ascending: false })

        if (staleCacheEntries && staleCacheEntries.length > 0) {
          for (const entry of staleCacheEntries) {
            if (entry.data && !legacyCacheResults.has(entry.company_id)) {
              legacyCacheResults.set(entry.company_id, entry.data)
            }
          }
          console.log(`[Portfolio API] Found ${legacyCacheResults.size} total companies after stale cache check`)
        }
      }

      // Only use HTTP fallback for companies with ZERO cached data
      const companiesNeedingHTTP = companyIds.filter(id => !legacyCacheResults.has(id))
      if (companiesNeedingHTTP.length > 0) {
        console.log(`[Portfolio API] ${companiesNeedingHTTP.length} companies not in any cache, fetching via HTTP...`)
        const httpUCs = userCompanies.filter((uc: any) => companiesNeedingHTTP.includes(uc.company_id))
        const startTime = Date.now()
        const httpResults = await Promise.all(
          httpUCs.map((uc: any) => fetchCompanyAnalyticsViaHTTP(uc, startDate, endDate, request))
        )
        console.log(`[Portfolio API] HTTP fallback for ${httpUCs.length} companies completed in ${Date.now() - startTime}ms`)
        for (const result of httpResults) {
          if (result?.id) {
            legacyCacheResults.set(result.id, result)
          }
        }
      } else {
        console.log(`[Portfolio API] All companies served from legacy cache, no HTTP needed`)
      }

      // Merge company metadata with analytics data
      const companiesWithData = userCompanies.map((uc: any) => {
        const analytics = legacyCacheResults.get(uc.company_id) || {}
        return {
          ...uc.companies,
          role: uc.role,
          ...analytics
        }
      })

      const aggregateMetrics = calculatePortfolioAggregateMetrics(companiesWithData)

      // Build syncInfo for display consistency
      const actualDataCount = companiesWithData.filter(
        (c: any) => c.gaMetrics || c.gscMetrics || c.ytMetrics || c.liVisitorMetrics
      ).length
      const syncInfo = {
        lastSyncAt: null,
        companiesWithData: actualDataCount,
        totalCompanies: companyIds.length
      }

      const result = { companies: companiesWithData, aggregateMetrics, cached: false, syncInfo }

      if (isDefaultRange && actualDataCount > 0) {
        await updatePortfolioCache(supabase, user.id, cacheDate, companiesWithData, aggregateMetrics)
      }

      const response = NextResponse.json(result)
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')
      response.headers.set('CDN-Cache-Control', 'public, max-age=60')
      response.headers.set('Vary', 'Authorization, Cookie')
      return response
    } // end normalized tables block
  } catch (error) {
    console.error('Portfolio analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio analytics' }, { status: 500 })
  }
}

// ============================================================
// Bulk normalized tables query — replaces N+1 HTTP calls
// ============================================================
async function fetchPortfolioFromNormalizedTables(
  supabase: any,
  companyIds: string[],
  startDate: string,
  endDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<Map<string, any> | null> {
  // Check if any company has synced data
  const { data: syncStatuses } = await supabase
    .from('sync_status')
    .select('company_id, platform, sync_state, data_end_date')
    .in('company_id', companyIds)

  if (!syncStatuses || syncStatuses.length === 0) {
    console.log(`[Portfolio API] No sync_status rows found for any company`)
    return null
  }

  const hasSyncedData = syncStatuses.some((s: any) => s.data_end_date !== null)
  if (!hasSyncedData) {
    console.log(`[Portfolio API] No synced data yet for any company`)
    return null
  }

  // Run ALL queries in parallel — daily tables + snapshots
  const [
    gaDaily, gaDailyPrev, gaChannels,
    gscDaily, gscDailyPrev,
    ytDaily, ytDailyPrev,
    liDaily,
    gaSnapshots, gscSnapshots, ytSnapshots, liSnapshots
  ] = await Promise.all([
    // GA daily metrics — current period (all companies)
    supabase.from('ga_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // GA daily metrics — previous period
    supabase.from('ga_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .order('date'),
    // GA channel daily
    supabase.from('ga_channel_daily')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // GSC daily metrics — current
    supabase.from('gsc_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // GSC daily metrics — previous
    supabase.from('gsc_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .order('date'),
    // YouTube daily metrics — current
    supabase.from('yt_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // YouTube daily metrics — previous
    supabase.from('yt_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .order('date'),
    // LinkedIn daily metrics — current only
    supabase.from('li_daily_metrics')
      .select('*')
      .in('company_id', companyIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    // Period snapshots — bulk for all companies
    findClosestSnapshotsBulk(supabase, 'ga_period_snapshots', companyIds, startDate, endDate),
    findClosestSnapshotsBulk(supabase, 'gsc_period_snapshots', companyIds, startDate, endDate),
    findClosestSnapshotsBulk(supabase, 'yt_period_snapshots', companyIds, startDate, endDate),
    findClosestSnapshotsBulk(supabase, 'li_period_snapshots', companyIds, startDate, endDate)
  ])

  // Group daily rows by company_id
  const groupByCompany = (rows: any[] | null) => {
    const map = new Map<string, any[]>()
    if (!rows) return map
    rows.forEach((row: any) => {
      if (!map.has(row.company_id)) map.set(row.company_id, [])
      map.get(row.company_id)!.push(row)
    })
    return map
  }

  const gaDailyByCompany = groupByCompany(gaDaily.data)
  const gaDailyPrevByCompany = groupByCompany(gaDailyPrev.data)
  const gaChannelsByCompany = groupByCompany(gaChannels.data)
  const gscDailyByCompany = groupByCompany(gscDaily.data)
  const gscDailyPrevByCompany = groupByCompany(gscDailyPrev.data)
  const ytDailyByCompany = groupByCompany(ytDaily.data)
  const ytDailyPrevByCompany = groupByCompany(ytDailyPrev.data)
  const liDailyByCompany = groupByCompany(liDaily.data)

  // Assemble analytics for each company
  const results = new Map<string, any>()
  for (const companyId of companyIds) {
    const analytics = assembleCompanyAnalytics(
      gaDailyByCompany.get(companyId) || [],
      gaDailyPrevByCompany.get(companyId) || [],
      gaChannelsByCompany.get(companyId) || [],
      gscDailyByCompany.get(companyId) || [],
      gscDailyPrevByCompany.get(companyId) || [],
      ytDailyByCompany.get(companyId) || [],
      ytDailyPrevByCompany.get(companyId) || [],
      liDailyByCompany.get(companyId) || [],
      gaSnapshots.get(companyId) || null,
      gscSnapshots.get(companyId) || null,
      ytSnapshots.get(companyId) || null,
      liSnapshots.get(companyId) || null
    )
    results.set(companyId, analytics)
  }

  return results
}

// ============================================================
// Per-company HTTP call — legacy fallback
// ============================================================
async function fetchCompanyAnalyticsViaHTTP(
  userCompany: any,
  startDate: string,
  endDate: string,
  request: Request
) {
  const companyId = userCompany.company_id
  const emptyCompany = {
    ...userCompany.companies,
    role: userCompany.role,
    gaMetrics: null, gaWeeklyData: [], gaChannelData: [],
    gaTrafficShare: [], gaSourcePerformance: [], gaLandingPages: [],
    gaRegions: [], gaDevices: [], gaGender: [], gaAge: [],
    gscMetrics: null, gscWeeklyData: [], gscIndexData: [],
    gscKeywords: [], gscLandingPages: [], gscCountries: [], gscDevices: [],
    ytMetrics: null, ytVideos: [],
    ytViewsSparkline: [], ytWatchTimeSparkline: [], ytSharesSparkline: [], ytLikesSparkline: [],
    liVisitorMetrics: null, liFollowerMetrics: null, liContentMetrics: null,
    liVisitorDaily: [], liFollowerDaily: [], liImpressionDaily: [],
    liIndustryDemographics: [], liSeniorityDemographics: [],
    liJobFunctionDemographics: [], liCompanySizeDemographics: [],
    liUpdates: [], liVideoDaily: []
  }

  try {
    const params = new URLSearchParams({ startDate, endDate })
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const analyticsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${params}`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        },
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json()
      console.log(`[Portfolio API] Company ${companyId} data status:`, {
        hasGaMetrics: !!analyticsData.gaMetrics,
        hasGscMetrics: !!analyticsData.gscMetrics,
      })
      return { ...emptyCompany, ...analyticsData }
    } else {
      console.warn(`[Portfolio API] Analytics fetch failed for company ${companyId}: ${analyticsResponse.status}`)
      return emptyCompany
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Portfolio API] Timeout fetching analytics for company ${companyId}`)
    } else {
      console.error(`[Portfolio API] Failed to fetch analytics for company ${companyId}:`, error)
    }
    return emptyCompany
  }
}

// ============================================================
// Helper: update portfolio cache
// ============================================================
async function updatePortfolioCache(
  supabase: any,
  userId: string,
  cacheDate: string,
  companiesWithData: any[],
  aggregateMetrics: any
) {
  try {
    await supabase
      .from('portfolio_cache')
      .upsert({
        user_id: userId,
        cache_date: cacheDate,
        companies_data: companiesWithData,
        aggregate_metrics: aggregateMetrics,
        updated_at: new Date().toISOString()
      })
    console.log(`[Portfolio API] Updated cache for user ${userId}`)
  } catch (cacheUpdateError) {
    console.warn(`[Portfolio API] Failed to update cache for user ${userId}:`, cacheUpdateError)
  }
}

// ============================================================
// Background cache refresh — uses bulk normalized tables
// ============================================================
async function refreshCacheInBackground(
  userId: string,
  startDate: string,
  endDate: string,
  cacheDate: string,
  supabase: any
) {
  try {
    console.log(`[Portfolio API] Starting background refresh for user ${userId}`)

    const { data: userCompanies, error: companiesError } = await supabase
      .from('user_companies')
      .select(`company_id, role, companies (*)`)
      .eq('user_id', userId)

    if (companiesError || !userCompanies?.length) {
      throw new Error('Failed to fetch user companies for background refresh')
    }

    const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    const previousStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(endDate), daysDiff), 'yyyy-MM-dd')
    const companyIds = userCompanies.map((uc: any) => uc.company_id)

    // Try bulk normalized tables
    const bulkResults = await fetchPortfolioFromNormalizedTables(
      supabase, companyIds, startDate, endDate, previousStartDate, previousEndDate
    )

    if (bulkResults) {
      const companiesWithData = userCompanies.map((uc: any) => ({
        ...uc.companies,
        role: uc.role,
        ...(bulkResults.get(uc.company_id) || {})
      }))

      // Don't overwrite good cache with empty data
      const hasAnyMetrics = companiesWithData.some((c: any) =>
        c.gaMetrics || c.gscMetrics || c.ytMetrics || c.liVisitorMetrics
      )

      if (!hasAnyMetrics) {
        console.log(`[Portfolio API] Background refresh produced no metrics, skipping cache update`)
        return
      }

      const aggregateMetrics = calculatePortfolioAggregateMetrics(companiesWithData)
      await updatePortfolioCache(supabase, userId, cacheDate, companiesWithData, aggregateMetrics)
      console.log(`[Portfolio API] Background refresh completed for user ${userId} (bulk)`)
      return
    }

    console.log(`[Portfolio API] Background refresh: no normalized data, skipping`)
  } catch (error) {
    console.error(`[Portfolio API] Background refresh failed for user ${userId}:`, error)
  }
}
