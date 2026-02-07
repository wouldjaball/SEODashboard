import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

// This endpoint is called by Vercel Cron Jobs daily at 12:03 AM PST
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting portfolio cache generation...')

    // Use service role to access all data (bypasses RLS)
    const supabase = createServiceClient()
    
    // Get current date and calculate 30-day range
    const endDate = new Date()
    const startDate = subDays(endDate, 30)
    const cacheDate = format(endDate, 'yyyy-MM-dd')
    
    console.log(`[Cron] Processing cache for date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`)

    // Get all users who have companies assigned
    const { data: userCompanies, error: companiesError } = await supabase
      .from('user_companies')
      .select(`
        user_id,
        company_id,
        role,
        companies (
          id,
          name,
          industry,
          color,
          logo_url
        )
      `)

    if (companiesError) {
      console.error('[Cron] Error fetching user companies:', companiesError)
      throw companiesError
    }

    if (!userCompanies || userCompanies.length === 0) {
      console.log('[Cron] No user companies found')
      return NextResponse.json({ message: 'No user companies to process', processed: 0 })
    }

    // Group companies by user
    const userCompanyMap = new Map<string, any[]>()
    for (const uc of userCompanies) {
      if (!userCompanyMap.has(uc.user_id)) {
        userCompanyMap.set(uc.user_id, [])
      }
      userCompanyMap.get(uc.user_id)!.push(uc)
    }

    console.log(`[Cron] Processing ${userCompanyMap.size} users`)
    
    // Helper function to chunk array for batch processing
    function chunkArray<T>(array: T[], chunkSize: number): T[][] {
      const chunks: T[][] = []
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize))
      }
      return chunks
    }

    let processedUsers = 0
    let errors: string[] = []

    // Convert map to array for batch processing
    const userEntries = Array.from(userCompanyMap.entries())
    const BATCH_SIZE = 3 // Process 3 users at once
    const userBatches = chunkArray(userEntries, BATCH_SIZE)

    console.log(`[Cron] Processing ${userEntries.length} users in ${userBatches.length} batches of ${BATCH_SIZE}`)

    // Process users in batches
    for (let batchIndex = 0; batchIndex < userBatches.length; batchIndex++) {
      const batch = userBatches[batchIndex]
      console.log(`[Cron] Processing user batch ${batchIndex + 1}/${userBatches.length} with ${batch.length} users`)

      // Process users in this batch in parallel
      const batchPromises = batch.map(async ([userId, companies]) => {
      try {
        console.log(`[Cron] Processing user ${userId} with ${companies.length} companies`)
        
        const companiesData = []
        let totalTraffic = 0
        let totalConversions = 0
        let totalConversionRates: number[] = []
        let prevTotalTraffic = 0
        let prevTotalConversions = 0
        let prevTotalConversionRates: number[] = []

        // Fetch analytics for each company
        const analyticsPromises = companies.map(async (uc) => {
          try {
            const companyId = uc.company_id
            const params = new URLSearchParams({
              startDate: format(startDate, 'yyyy-MM-dd'),
              endDate: format(endDate, 'yyyy-MM-dd')
            })

            // Make internal API call with service credentials
            const analyticsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${companyId}?${params}`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                }
              }
            )

            if (analyticsResponse.ok) {
              const analyticsData = await analyticsResponse.json()
              
              // Build company object with analytics data
              const company = {
                ...uc.companies,
                role: uc.role,
                // Google Analytics data
                gaMetrics: analyticsData.gaMetrics || null,
                gaWeeklyData: analyticsData.gaWeeklyData || [],
                gaChannelData: analyticsData.gaChannelData || [],
                gaTrafficShare: analyticsData.gaTrafficShare || [],
                gaSourcePerformance: analyticsData.gaSourcePerformance || [],
                gaLandingPages: analyticsData.gaLandingPages || [],
                gaRegions: analyticsData.gaRegions || [],
                gaDevices: analyticsData.gaDevices || [],
                gaGender: analyticsData.gaGender || [],
                gaAge: analyticsData.gaAge || [],
                gaError: analyticsData.gaError,
                gaErrorType: analyticsData.gaErrorType,
                // Search Console data
                gscMetrics: analyticsData.gscMetrics || null,
                gscWeeklyData: analyticsData.gscWeeklyData || [],
                gscIndexData: analyticsData.gscIndexData || [],
                gscKeywords: analyticsData.gscKeywords || [],
                gscLandingPages: analyticsData.gscLandingPages || [],
                gscCountries: analyticsData.gscCountries || [],
                gscDevices: analyticsData.gscDevices || [],
                gscError: analyticsData.gscError,
                gscErrorType: analyticsData.gscErrorType,
                // YouTube data
                ytMetrics: analyticsData.ytMetrics || null,
                ytVideos: analyticsData.ytVideos || [],
                ytViewsSparkline: analyticsData.ytViewsSparkline || [],
                ytWatchTimeSparkline: analyticsData.ytWatchTimeSparkline || [],
                ytSharesSparkline: analyticsData.ytSharesSparkline || [],
                ytLikesSparkline: analyticsData.ytLikesSparkline || [],
                ytError: analyticsData.ytError,
                ytIsPublicDataOnly: analyticsData.ytIsPublicDataOnly,
                // LinkedIn data
                liVisitorMetrics: analyticsData.liVisitorMetrics || null,
                liFollowerMetrics: analyticsData.liFollowerMetrics || null,
                liContentMetrics: analyticsData.liContentMetrics || null,
                liVisitorDaily: analyticsData.liVisitorDaily || [],
                liFollowerDaily: analyticsData.liFollowerDaily || [],
                liImpressionDaily: analyticsData.liImpressionDaily || [],
                liIndustryDemographics: analyticsData.liIndustryDemographics || [],
                liSeniorityDemographics: analyticsData.liSeniorityDemographics || [],
                liJobFunctionDemographics: analyticsData.liJobFunctionDemographics || [],
                liCompanySizeDemographics: analyticsData.liCompanySizeDemographics || [],
                liUpdates: analyticsData.liUpdates || [],
                liVideoMetrics: analyticsData.liVideoMetrics,
                liEmployeeAdvocacyMetrics: analyticsData.liEmployeeAdvocacyMetrics,
                liContentBreakdown: analyticsData.liContentBreakdown,
                liSocialListening: analyticsData.liSocialListening,
                liVideoDaily: analyticsData.liVideoDaily || [],
                liError: analyticsData.liError,
                liErrorType: analyticsData.liErrorType,
                liDataSource: analyticsData.liDataSource
              }

              // Aggregate metrics for portfolio view
              if (analyticsData.gaMetrics) {
                totalTraffic += analyticsData.gaMetrics.totalUsers || 0
                totalConversions += analyticsData.gaMetrics.keyEvents || 0
                if (analyticsData.gaMetrics.userKeyEventRate) {
                  totalConversionRates.push(analyticsData.gaMetrics.userKeyEventRate)
                }

                // Previous period data
                if (analyticsData.gaMetrics.previousPeriod) {
                  prevTotalTraffic += analyticsData.gaMetrics.previousPeriod.totalUsers || 0
                  prevTotalConversions += analyticsData.gaMetrics.previousPeriod.keyEvents || 0
                  if (analyticsData.gaMetrics.previousPeriod.userKeyEventRate) {
                    prevTotalConversionRates.push(analyticsData.gaMetrics.previousPeriod.userKeyEventRate)
                  }
                }
              }

              return company
            } else {
              console.warn(`[Cron] Failed to fetch analytics for company ${companyId}`)
              // Return company with empty analytics data
              return {
                ...uc.companies,
                role: uc.role,
                gaMetrics: null,
                gscMetrics: null,
                ytMetrics: null,
                liVisitorMetrics: null
              }
            }
          } catch (error) {
            console.error(`[Cron] Error processing company ${uc.company_id}:`, error)
            return {
              ...uc.companies,
              role: uc.role,
              gaMetrics: null,
              gscMetrics: null,
              ytMetrics: null,
              liVisitorMetrics: null
            }
          }
        })

        // Wait for all analytics to complete
        const companiesWithAnalytics = await Promise.all(analyticsPromises)
        
        // Calculate aggregate metrics
        const avgConversionRate = totalConversionRates.length > 0 
          ? totalConversionRates.reduce((sum, rate) => sum + rate, 0) / totalConversionRates.length
          : 0

        const prevAvgConversionRate = prevTotalConversionRates.length > 0
          ? prevTotalConversionRates.reduce((sum, rate) => sum + rate, 0) / prevTotalConversionRates.length
          : 0

        const aggregateMetrics = {
          totalTraffic,
          totalConversions,
          avgConversionRate,
          totalRevenue: 0, // Would come from actual revenue integration
          previousPeriod: {
            totalTraffic: prevTotalTraffic,
            totalConversions: prevTotalConversions,
            avgConversionRate: prevAvgConversionRate,
            totalRevenue: 0
          }
        }

        // Store in cache using service role
        const { error: cacheError } = await supabase
          .from('portfolio_cache')
          .upsert({
            user_id: userId,
            cache_date: cacheDate,
            companies_data: companiesWithAnalytics,
            aggregate_metrics: aggregateMetrics,
            updated_at: new Date().toISOString()
          })

        if (cacheError) {
          console.error(`[Cron] Error saving cache for user ${userId}:`, cacheError)
          return { userId, success: false, error: cacheError.message }
        } else {
          console.log(`[Cron] Successfully cached data for user ${userId}`)
          return { userId, success: true }
        }

      } catch (error) {
        console.error(`[Cron] Error processing user ${userId}:`, error)
        return { userId, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
      }) // End of user mapping function

      // Wait for all users in this batch to complete
      try {
        const batchResults = await Promise.all(batchPromises)
        
        // Update counters and errors
        batchResults.forEach(result => {
          if (result.success) {
            processedUsers++
          } else {
            errors.push(`User ${result.userId}: ${result.error}`)
          }
        })
        
        console.log(`[Cron] User batch ${batchIndex + 1} completed: ${batchResults.filter(r => r.success).length}/${batchResults.length} successful`)
      } catch (batchError) {
        console.error(`[Cron] User batch ${batchIndex + 1} failed:`, batchError)
        // Add error results for any users that might have failed
        batch.forEach(([userId]) => {
          errors.push(`User ${userId}: Batch processing failed`)
        })
      }

      // Small delay between batches to be nice to external APIs
      if (batchIndex < userBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay for user batches
      }
    } // End of batch processing loop

    // Clean up old cache entries (keep last 7 days)
    const sevenDaysAgo = format(subDays(endDate, 7), 'yyyy-MM-dd')
    const { error: cleanupError } = await supabase
      .from('portfolio_cache')
      .delete()
      .lt('cache_date', sevenDaysAgo)

    if (cleanupError) {
      console.warn('[Cron] Error cleaning up old cache:', cleanupError)
    } else {
      console.log(`[Cron] Cleaned up cache entries older than ${sevenDaysAgo}`)
    }

    console.log(`[Cron] Portfolio cache generation completed. Processed: ${processedUsers} users`)
    
    return NextResponse.json({
      message: 'Portfolio cache generation completed',
      processed: processedUsers,
      total: userEntries.length,
      errors: errors.length > 0 ? errors : undefined,
      cacheDate,
      batchInfo: {
        totalBatches: userBatches.length,
        batchSize: BATCH_SIZE,
        parallelProcessing: true
      }
    })

  } catch (error) {
    console.error('[Cron] Portfolio cache generation failed:', error)
    return NextResponse.json(
      { 
        error: 'Portfolio cache generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}