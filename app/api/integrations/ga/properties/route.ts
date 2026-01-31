import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('[GA Properties] === ENDPOINT CALLED ===')
    console.log('[GA Properties] Force refresh:', forceRefresh)
    console.log('[GA Properties] Request URL:', request.url)
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[GA Properties] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GA Properties] Fetching for user:', user.id)
    console.log('[GA Properties] User email:', user.email)

    const accessTokenResult = await OAuthTokenService.refreshAccessTokenWithDetails(user.id)
    if (!accessTokenResult.success) {
      console.log('[GA Properties] No access token available for user:', user.id)
      console.log('[GA Properties] Token error:', accessTokenResult.error)
      console.log('[GA Properties] Token details:', accessTokenResult.details)
      return NextResponse.json({ 
        error: 'No access token', 
        details: 'Google OAuth connection may have expired. Please reconnect your Google account.',
        tokenError: accessTokenResult.error 
      }, { status: 401 })
    }

    const accessToken = accessTokenResult.accessToken
    console.log('[GA Properties] Access token obtained successfully')
    console.log('[GA Properties] Making API request to Analytics Admin API...')

    // Fetch accounts
    const accountsResponse = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    console.log('[GA Properties] API response status:', accountsResponse.status)

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text()
      console.error('[GA Properties] API error response:', errorText)
      
      if (accountsResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Access forbidden', 
          details: 'Google Analytics Admin API may not be enabled, or your account lacks access to Analytics properties. Please check your Google Cloud Console and Analytics account permissions.',
          apiError: errorText
        }, { status: 403 })
      }
      
      if (accountsResponse.status === 404) {
        return NextResponse.json({ 
          error: 'API not found', 
          details: 'Google Analytics Admin API may not be enabled in your Google Cloud project. Please enable it in the Google Cloud Console.',
          apiError: errorText
        }, { status: 404 })
      }
      
      throw new Error(`API request failed with status ${accountsResponse.status}: ${errorText}`)
    }

    const accountsData = await accountsResponse.json()
    console.log('[GA Properties] Raw API response:', JSON.stringify(accountsData, null, 2))
    
    const properties = []
    const accountCount = accountsData.accountSummaries?.length || 0
    console.log('[GA Properties] Found', accountCount, 'accounts from Google API')

    if (accountCount === 0) {
      console.log('[GA Properties] No accounts returned from Google Analytics Admin API')
      console.log('[GA Properties] This could mean:')
      console.log('[GA Properties] 1. User has no Google Analytics accounts')
      console.log('[GA Properties] 2. Google Analytics Admin API not enabled') 
      console.log('[GA Properties] 3. Insufficient permissions on Analytics accounts')
      console.log('[GA Properties] 4. OAuth scope missing for Admin API')
    }

    // If force refresh, clear existing properties for this user first
    if (forceRefresh && accountCount > 0) {
      console.log('[GA Properties] Force refresh requested - clearing existing properties')
      const { error: deleteError } = await supabase
        .from('ga_properties')
        .delete()
        .eq('user_id', user.id)
      
      if (deleteError) {
        console.error('[GA Properties] Failed to clear existing properties:', deleteError)
      } else {
        console.log('[GA Properties] Cleared existing properties for fresh data')
      }
    }

    // Extract all properties from all accounts
    for (const account of accountsData.accountSummaries || []) {
      console.log(`[GA Properties] Processing account: ${account.displayName} (${account.account})`)
      const propertyCount = account.propertySummaries?.length || 0
      console.log(`[GA Properties] Account has ${propertyCount} properties`)
      
      for (const propertySummary of account.propertySummaries || []) {
        console.log(`[GA Properties] Processing property: ${propertySummary.displayName} (${propertySummary.property})`)
        
        const propertyId = propertySummary.property.split('/')[1]
        const accountId = account.account.split('/')[1]

        // Save to database and get the database UUID
        console.log(`[GA Properties] Saving GA property ${propertyId} to database for user ${user.id}`)
        const { data: savedProperty, error: saveError } = await supabase.from('ga_properties').upsert({
          user_id: user.id,
          property_id: propertyId,
          property_name: propertySummary.displayName,
          display_name: propertySummary.displayName,
          account_id: accountId,
          account_name: account.displayName,
          is_active: true
        }, {
          onConflict: 'user_id,property_id'
        }).select('id').single()

        if (saveError) {
          console.error(`[GA Properties] Failed to save GA property ${propertyId}:`, saveError)
        } else {
          console.log(`[GA Properties] Successfully saved GA property ${propertyId} with DB id:`, savedProperty?.id)

          // Return database UUID as id for frontend to use in mappings
          properties.push({
            id: savedProperty?.id,  // Database UUID for mappings
            propertyId: propertyId,  // External Google ID for display
            displayName: propertySummary.displayName,
            accountId: accountId,
            accountName: account.displayName
          })
        }
      }
    }

    // If no fresh data but not force refresh, try to get from database
    if (properties.length === 0 && !forceRefresh) {
      console.log('[GA Properties] No fresh data from API, checking database for existing properties')
      const { data: dbProperties, error: dbError } = await supabase
        .from('ga_properties')
        .select('id, property_id, display_name, account_id, account_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (dbError) {
        console.error('[GA Properties] Database query error:', dbError)
      } else {
        console.log(`[GA Properties] Found ${dbProperties?.length || 0} properties in database`)
        for (const prop of dbProperties || []) {
          properties.push({
            id: prop.id,
            propertyId: prop.property_id,
            displayName: prop.display_name,
            accountId: prop.account_id,
            accountName: prop.account_name
          })
        }
      }
    }

    console.log(`[GA Properties] Returning ${properties.length} GA properties to frontend`)
    return NextResponse.json({ properties })
  } catch (error: any) {
    console.error('[GA Properties] Unexpected error:', error.message || error)
    console.error('[GA Properties] Full error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch properties', 
      details: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
