import { createClient } from '@/lib/supabase/server'
import { GoogleAnalyticsService } from '@/lib/services/google-analytics-service'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await params

    // Verify user has access to this company
    const { data: userCompanyAccess } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!userCompanyAccess) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You do not have access to this company'
      }, { status: 403 })
    }

    // Check cache first (30-second cache for realtime data)
    const cached = await checkRealtimeCache(supabase, companyId)
    if (cached) {
      console.log(`[Realtime] Serving cached realtime data for ${companyId}`)
      return NextResponse.json(cached)
    }

    console.log(`[Realtime] Fetching fresh realtime data for ${companyId}`)

    // Get GA mapping
    const { data: gaMapping } = await supabase
      .from('company_ga_mappings')
      .select('ga_property_id')
      .eq('company_id', companyId)
      .maybeSingle()

    if (!gaMapping?.ga_property_id) {
      return NextResponse.json({
        error: 'No Google Analytics account mapped to this company',
        message: 'Please configure your Google Analytics integration in the Accounts page'
      }, { status: 404 })
    }

    // Get property details
    const { data: gaProperty } = await supabase
      .from('ga_properties')
      .select('*')
      .eq('id', gaMapping.ga_property_id)
      .single()

    if (!gaProperty) {
      return NextResponse.json({
        error: 'Google Analytics property not found'
      }, { status: 404 })
    }

    const propertyId = gaProperty.property_id
    const gaOwnerUserId = gaProperty.user_id

    console.log('=== GA REALTIME FETCH DEBUG ===')
    console.log('Logged-in User ID:', user.id)
    console.log('GA Owner User ID:', gaOwnerUserId)
    console.log('Property ID:', propertyId)
    
    // Validate OAuth token scopes
    const tokenData = await OAuthTokenService.getTokens(gaOwnerUserId)
    if (tokenData) {
      const hasAnalyticsScope = tokenData.scope.includes('analytics.readonly')
      if (!hasAnalyticsScope) {
        return NextResponse.json({
          error: 'OAuth token missing required Google Analytics scope: analytics.readonly',
          requiresReauth: true
        }, { status: 403 })
      }
    }

    try {
      // Fetch realtime data
      const realtimeData = await GoogleAnalyticsService.fetchRealtimeMetrics(
        gaOwnerUserId,
        propertyId
      )

      const result = {
        ...realtimeData,
        timestamp: new Date().toISOString(),
        dataSource: 'realtime'
      }

      // Cache the results for 30 seconds
      await cacheRealtimeData(supabase, companyId, result)

      return NextResponse.json(result)
    } catch (error: unknown) {
      const err = error as Error | undefined
      const errorMessage = err?.message || String(error) || 'Unknown error'
      console.error('GA realtime fetch error:', errorMessage)
      
      // Check if this is a token refresh failure that requires re-authentication
      if (errorMessage.includes('TOKEN_REFRESH_FAILED') || errorMessage.includes('NO_TOKENS')) {
        return NextResponse.json({
          error: errorMessage,
          requiresReauth: true,
          errorType: 'auth_required'
        }, { status: 403 })
      } else if (errorMessage.includes('missing required Google Analytics scope')) {
        return NextResponse.json({
          error: errorMessage,
          errorType: 'scope_missing'
        }, { status: 403 })
      } else {
        return NextResponse.json({
          error: errorMessage,
          errorType: 'api_error'
        }, { status: 500 })
      }
    }
  } catch (error) {
    console.error('Realtime analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch realtime analytics' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRealtimeCache(supabase: any, companyId: string) {
  const { data } = await supabase
    .from('analytics_cache')
    .select('*')
    .eq('company_id', companyId)
    .eq('data_type', 'realtime')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return null
  }

  const now = new Date()
  const cacheDate = new Date(data.created_at)
  const ageInSeconds = (now.getTime() - cacheDate.getTime()) / 1000

  // 30-second cache for realtime data
  if (ageInSeconds > 30) {
    console.log(`[Realtime Cache] Clearing stale cache for ${companyId}: ${ageInSeconds}s old`)
    
    await supabase
      .from('analytics_cache')
      .delete()
      .eq('id', data.id)
    
    return null
  }

  console.log(`[Realtime Cache] Using cache for ${companyId}, age: ${ageInSeconds}s`)
  return data?.data || null
}

async function cacheRealtimeData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  // Clean up old realtime cache entries for this company first
  await supabase
    .from('analytics_cache')
    .delete()
    .eq('company_id', companyId)
    .eq('data_type', 'realtime')

  // Insert new cache entry
  await supabase.from('analytics_cache').insert({
    company_id: companyId,
    data_type: 'realtime',
    data,
    created_at: new Date().toISOString()
  })
}