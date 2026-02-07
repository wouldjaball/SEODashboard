import { createClient } from '@supabase/supabase-js'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { GoogleSearchConsoleService } from '@/lib/services/google-search-console-service'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { LinkedInAnalyticsService } from '@/lib/services/linkedin-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { subDays, format, addDays } from 'date-fns'
import { CronPerformanceTracker, chunkArray, withRetry } from '@/lib/utils/cron-utils'

// This endpoint is called by cron at 12:33 AM PST daily to pre-build the 30-day cache
// Vercel Cron or external scheduler should call: GET /api/cron/refresh-cache?secret=YOUR_CRON_SECRET

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role for cron jobs (bypasses RLS)
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey!
  )

  const tracker = new CronPerformanceTracker()
  console.log('[Cron] Starting daily cache refresh at', new Date().toISOString())

  try {
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')

    if (companiesError || !companies) {
      console.error('[Cron] Failed to fetch companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    console.log(`[Cron] Found ${companies.length} companies to refresh`)

    // Use last 30 days for the cache
    const endDate = new Date()
    const startDate = subDays(endDate, 30)
    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')
    
    // Previous period for comparison
    const daysDiff = 30
    const previousStartDate = format(subDays(startDate, daysDiff), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(endDate, daysDiff), 'yyyy-MM-dd')

    // Set cache to expire tomorrow at 12:33 AM PST (8:33 AM UTC)
    const now = new Date()
    const tomorrow = addDays(now, 1)
    tomorrow.setUTCHours(8, 33, 0, 0) // 12:33 AM PST = 8:33 AM UTC
    const expiresAt = tomorrow.toISOString()

    const results: { company: string; status: string; error?: string }[] = []

    // Helper function to chunk array for batch processing
    function chunkArray<T>(array: T[], chunkSize: number): T[][] {
      const chunks: T[][] = []
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize))
      }
      return chunks
    }

    // Process companies in parallel batches to avoid overwhelming the system
    const BATCH_SIZE = 3 // Process 3 companies at once
    const companyBatches = chunkArray(companies, BATCH_SIZE)

    console.log(`[Cron] Processing ${companies.length} companies in ${companyBatches.length} batches of ${BATCH_SIZE}`)

    // Process each batch
    for (let batchIndex = 0; batchIndex < companyBatches.length; batchIndex++) {
      const batch = companyBatches[batchIndex]
      console.log(`[Cron] Processing batch ${batchIndex + 1}/${companyBatches.length} with ${batch.length} companies`)

      // Process companies in this batch in parallel
      const batchPromises = batch.map(async (company) => {
      console.log(`[Cron] Processing company: ${company.name} (${company.id})`)
      
      try {
        // Clear existing daily_snapshot cache for this company
        await supabase
          .from('analytics_cache')
          .delete()
          .eq('company_id', company.id)
          .eq('data_type', 'daily_snapshot')

        // Fetch all mappings in parallel
        const [gaMappingResult, gscMappingResult, ytMappingResult, linkedinMappingResult] = await Promise.all([
          supabase.from('company_ga_mappings').select('ga_property_id').eq('company_id', company.id).maybeSingle(),
          supabase.from('company_gsc_mappings').select('gsc_site_id').eq('company_id', company.id).maybeSingle(),
          supabase.from('company_youtube_mappings').select('youtube_channel_id').eq('company_id', company.id).maybeSingle(),
          supabase.from('company_linkedin_mappings').select('linkedin_page_id').eq('company_id', company.id).maybeSingle()
        ])

        const { data: gaMapping } = gaMappingResult
        const { data: gscMapping } = gscMappingResult
        const { data: ytMapping } = ytMappingResult
        const { data: linkedinMapping } = linkedinMappingResult

        if (!gaMapping && !gscMapping && !ytMapping && !linkedinMapping) {
          console.log(`[Cron] No mappings for ${company.name}, skipping`)
          return { company: company.name, status: 'skipped', error: 'no mappings' }
        }

        // Fetch property/site/channel details
        const detailFetchers: (() => Promise<{ key: string; data: any }>)[] = []

        if (gaMapping?.ga_property_id) {
          detailFetchers.push(async () => {
            const { data } = await supabase.from('ga_properties').select('*').eq('id', gaMapping.ga_property_id).single()
            return { key: 'ga', data }
          })
        }
        if (gscMapping?.gsc_site_id) {
          detailFetchers.push(async () => {
            const { data } = await supabase.from('gsc_sites').select('*').eq('id', gscMapping.gsc_site_id).single()
            return { key: 'gsc', data }
          })
        }
        if (ytMapping?.youtube_channel_id) {
          detailFetchers.push(async () => {
            const { data } = await supabase.from('youtube_channels').select('*').eq('id', ytMapping.youtube_channel_id).single()
            return { key: 'yt', data }
          })
        }
        if (linkedinMapping?.linkedin_page_id) {
          detailFetchers.push(async () => {
            const { data } = await supabase.from('linkedin_pages').select('*').eq('id', linkedinMapping.linkedin_page_id).single()
            return { key: 'linkedin', data }
          })
        }

        const detailResults = await Promise.all(detailFetchers.map(fn => fn()))

        let gaProperty: any = null
        let gscSite: any = null
        let ytChannel: any = null
        let linkedinPage: any = null

        detailResults.forEach(({ key, data }) => {
          if (key === 'ga') gaProperty = data
          else if (key === 'gsc') gscSite = data
          else if (key === 'yt') ytChannel = data
          else if (key === 'linkedin') linkedinPage = data
        })

        // Fetch data from all services in parallel
        const fetchPromises: Promise<{ key: string; data: any } | null>[] = []

        // GA fetch
        if (gaProperty) {
          fetchPromises.push(
            (async () => {
              try {
                const [metrics, weeklyData, channelData, trafficShare, sourcePerformance, landingPages, regions, devices, gender, age] = await Promise.all([
                  GoogleAnalyticsService.fetchMetrics(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr, previousStartDate, previousEndDate),
                  GoogleAnalyticsService.fetchWeeklyData(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchChannelData(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchTrafficShare(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchSourcePerformance(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchLandingPages(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchRegions(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchDevices(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchGender(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr),
                  GoogleAnalyticsService.fetchAge(gaProperty.user_id, gaProperty.property_id, startDateStr, endDateStr)
                ])
                return { key: 'ga', data: { metrics, weeklyData, channelData, trafficShare, sourcePerformance, landingPages, regions, devices, gender, age } }
              } catch (e) {
                console.error(`[Cron] GA fetch failed for ${company.name}:`, e)
                return { key: 'ga', data: { error: String(e) } }
              }
            })()
          )
        }

        // GSC fetch
        if (gscSite) {
          fetchPromises.push(
            (async () => {
              try {
                const [metrics, weeklyData, keywords, countries, devices, indexData, landingPages] = await Promise.all([
                  GoogleSearchConsoleService.fetchMetrics(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr, previousStartDate, previousEndDate),
                  GoogleSearchConsoleService.fetchWeeklyData(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr),
                  GoogleSearchConsoleService.fetchKeywords(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr, 10),
                  GoogleSearchConsoleService.fetchCountries(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr, 10),
                  GoogleSearchConsoleService.fetchDevices(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr),
                  GoogleSearchConsoleService.fetchIndexData(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr),
                  GoogleSearchConsoleService.fetchLandingPages(gscSite.user_id, gscSite.site_url, startDateStr, endDateStr, 20)
                ])
                return { key: 'gsc', data: { metrics, weeklyData, keywords, countries, devices, indexData, landingPages } }
              } catch (e) {
                console.error(`[Cron] GSC fetch failed for ${company.name}:`, e)
                return { key: 'gsc', data: { error: String(e) } }
              }
            })()
          )
        }

        // YouTube fetch
        if (ytChannel) {
          fetchPromises.push(
            (async () => {
              try {
                const [metrics, videos, dailyData] = await Promise.all([
                  YouTubeAnalyticsService.fetchMetricsWithFallback(ytChannel.user_id, ytChannel.channel_id, startDateStr, endDateStr, previousStartDate, previousEndDate),
                  YouTubeAnalyticsService.fetchTopVideosWithFallback(ytChannel.user_id, ytChannel.channel_id, startDateStr, endDateStr, 10),
                  YouTubeAnalyticsService.fetchDailyDataWithFallback(ytChannel.user_id, ytChannel.channel_id, startDateStr, endDateStr)
                ])
                return { key: 'yt', data: { metrics, videos, dailyData } }
              } catch (e) {
                console.error(`[Cron] YouTube fetch failed for ${company.name}:`, e)
                return { key: 'yt', data: { error: String(e) } }
              }
            })()
          )
        }

        // LinkedIn fetch
        if (linkedinPage) {
          fetchPromises.push(
            (async () => {
              try {
                const hasTokens = await OAuthTokenService.hasValidLinkedInTokens(linkedinPage.user_id)
                if (!hasTokens) {
                  return { key: 'linkedin', data: { error: 'No valid LinkedIn tokens' } }
                }
                const data = await LinkedInAnalyticsService.fetchAllMetrics(
                  linkedinPage.user_id,
                  linkedinPage.page_id,
                  startDateStr,
                  endDateStr,
                  previousStartDate,
                  previousEndDate
                )
                return { key: 'linkedin', data }
              } catch (e) {
                console.error(`[Cron] LinkedIn fetch failed for ${company.name}:`, e)
                return { key: 'linkedin', data: { error: String(e) } }
              }
            })()
          )
        }

        const fetchResults = await Promise.all(fetchPromises)

        // Build the cache data object
        const cacheData: any = {}

        fetchResults.forEach((result) => {
          if (!result) return
          const { key, data } = result

          if (key === 'ga' && !data.error) {
            cacheData.gaMetrics = data.metrics
            cacheData.gaWeeklyData = data.weeklyData
            cacheData.gaChannelData = data.channelData
            cacheData.gaTrafficShare = data.trafficShare
            cacheData.gaSourcePerformance = data.sourcePerformance
            cacheData.gaLandingPages = data.landingPages
            cacheData.gaRegions = data.regions
            cacheData.gaDevices = data.devices
            cacheData.gaGender = data.gender
            cacheData.gaAge = data.age
          } else if (key === 'ga' && data.error) {
            cacheData.gaError = data.error
          }

          if (key === 'gsc' && !data.error) {
            cacheData.gscMetrics = data.metrics
            cacheData.gscWeeklyData = data.weeklyData
            cacheData.gscKeywords = data.keywords
            cacheData.gscCountries = data.countries
            cacheData.gscDevices = data.devices
            cacheData.gscIndexData = data.indexData
            cacheData.gscLandingPages = data.landingPages
          } else if (key === 'gsc' && data.error) {
            cacheData.gscError = data.error
          }

          if (key === 'yt' && !data.error) {
            cacheData.ytMetrics = data.metrics
            cacheData.ytVideos = data.videos
            cacheData.ytIsPublicDataOnly = data.metrics?.isPublicDataOnly || false
            cacheData.ytViewsSparkline = data.dailyData?.map((d: any) => d.views) || []
            cacheData.ytWatchTimeSparkline = data.dailyData?.map((d: any) => d.watchTime) || []
            cacheData.ytSharesSparkline = data.dailyData?.map((d: any) => d.shares) || []
            cacheData.ytLikesSparkline = data.dailyData?.map((d: any) => d.likes) || []
          } else if (key === 'yt' && data.error) {
            cacheData.ytError = data.error
          }

          if (key === 'linkedin' && !data.error) {
            cacheData.liVisitorMetrics = data.visitorMetrics
            cacheData.liFollowerMetrics = data.followerMetrics
            cacheData.liContentMetrics = data.contentMetrics
            cacheData.liSearchAppearanceMetrics = data.searchAppearanceMetrics
            cacheData.liVisitorDaily = data.visitorDaily
            cacheData.liFollowerDaily = data.followerDaily
            cacheData.liImpressionDaily = data.impressionDaily
            cacheData.liIndustryDemographics = data.industryDemographics
            cacheData.liSeniorityDemographics = data.seniorityDemographics
            cacheData.liJobFunctionDemographics = data.jobFunctionDemographics
            cacheData.liCompanySizeDemographics = data.companySizeDemographics
            cacheData.liUpdates = data.updates
            cacheData.liVideoMetrics = data.videoMetrics
            cacheData.liEmployeeAdvocacyMetrics = data.employeeAdvocacyMetrics
            cacheData.liContentBreakdown = data.contentBreakdown
            cacheData.liSocialListening = data.socialListening
            cacheData.liDataSource = 'api'
          } else if (key === 'linkedin' && data.error) {
            cacheData.liError = data.error
          }
        })

        // Store in cache with 'daily_snapshot' type using cached_data column
        const { error: insertError } = await supabase.from('analytics_cache').insert({
          company_id: company.id,
          data_type: 'daily_snapshot',
          date_range_start: startDateStr,
          date_range_end: endDateStr,
          cached_data: cacheData,
          expires_at: expiresAt
        })

        if (insertError) {
          console.error(`[Cron] Failed to cache data for ${company.name}:`, insertError)
          return { company: company.name, status: 'error', error: insertError.message }
        } else {
          console.log(`[Cron] Successfully cached data for ${company.name}`)
          return { company: company.name, status: 'success' }
        }

      } catch (companyError: any) {
        console.error(`[Cron] Error processing ${company.name}:`, companyError)
        return { company: company.name, status: 'error', error: companyError.message }
      }
      }) // End of company mapping function

      // Wait for all companies in this batch to complete
      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        const successCount = batchResults.filter(r => r.status === 'success').length
        const errorCount = batchResults.length - successCount
        tracker.recordBatchCompleted(successCount, errorCount)
        
        console.log(`[Cron] Batch ${batchIndex + 1} completed: ${successCount}/${batchResults.length} successful`)
        console.log(tracker.getProgressReport())
      } catch (batchError) {
        console.error(`[Cron] Batch ${batchIndex + 1} failed:`, batchError)
        // Add error results for any companies that might have failed
        batch.forEach(company => {
          results.push({ company: company.name, status: 'error', error: 'Batch processing failed' })
        })
        tracker.recordBatchCompleted(0, batch.length)
      }

      // Small delay between batches to be nice to external APIs
      if (batchIndex < companyBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    } // End of batch processing loop

    const performanceMetrics = tracker.finish()
    console.log('[Cron] Cache refresh complete:', results)
    console.log('[Cron] Performance Summary:', performanceMetrics)

    return NextResponse.json({
      message: 'Cache refresh complete',
      timestamp: new Date().toISOString(),
      results,
      performance: {
        ...performanceMetrics,
        companiesTotal: companies.length,
        batchesTotal: companyBatches.length,
        batchSize: BATCH_SIZE,
        parallelProcessing: true
      }
    })

  } catch (error: any) {
    const performanceMetrics = tracker.finish()
    console.error('[Cron] Cache refresh failed:', error)
    console.log('[Cron] Performance Summary (Failed):', performanceMetrics)
    return NextResponse.json({ 
      error: error.message,
      performance: performanceMetrics
    }, { status: 500 })
  }
}
