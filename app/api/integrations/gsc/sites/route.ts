import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[GSC Sites] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GSC Sites] Fetching for user:', user.id)

    const accessToken = await OAuthTokenService.refreshAccessToken(user.id)
    if (!accessToken) {
      console.log('[GSC Sites] No access token available for user:', user.id)
      return NextResponse.json({ 
        error: 'No access token', 
        details: 'Google OAuth connection may have expired. Please reconnect your Google account.' 
      }, { status: 401 })
    }

    console.log('[GSC Sites] Access token obtained, making API request...')

    // Fetch sites
    const sitesResponse = await fetch(
      'https://searchconsole.googleapis.com/webmasters/v3/sites',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    console.log('[GSC Sites] API response status:', sitesResponse.status)

    if (!sitesResponse.ok) {
      const errorText = await sitesResponse.text()
      console.error('[GSC Sites] API error response:', errorText)
      
      if (sitesResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Access forbidden', 
          details: 'Google Search Console API may not be enabled, or your account lacks access to Search Console properties. Please check your Google Cloud Console and Search Console permissions.',
          apiError: errorText
        }, { status: 403 })
      }
      
      if (sitesResponse.status === 404) {
        return NextResponse.json({ 
          error: 'API not found', 
          details: 'Google Search Console API may not be enabled in your Google Cloud project. Please enable it in the Google Cloud Console.',
          apiError: errorText
        }, { status: 404 })
      }
      
      throw new Error(`API request failed with status ${sitesResponse.status}: ${errorText}`)
    }

    const sitesData = await sitesResponse.json()
    console.log('[GSC Sites] Raw API response:', JSON.stringify(sitesData, null, 2))
    
    const sites = []
    const siteCount = sitesData.siteEntry?.length || 0
    console.log('[GSC Sites] Found', siteCount, 'sites')

    // Save to database and get database UUIDs
    for (const site of sitesData.siteEntry || []) {
      console.log(`[GSC Sites] Processing site: ${site.siteUrl} (${site.permissionLevel})`)
      console.log(`[GSC Sites] Saving GSC site ${site.siteUrl} to database for user ${user.id}`)
      
      const { data: savedSite, error: saveError } = await supabase.from('gsc_sites').upsert({
        user_id: user.id,
        site_url: site.siteUrl,
        permission_level: site.permissionLevel
      }, {
        onConflict: 'user_id,site_url'
      }).select('id').single()

      if (saveError) {
        console.error(`[GSC Sites] Failed to save GSC site ${site.siteUrl}:`, saveError)
      } else {
        console.log(`[GSC Sites] Successfully saved GSC site ${site.siteUrl} with DB id:`, savedSite?.id)

        // Return database UUID as id for frontend to use in mappings
        sites.push({
          id: savedSite?.id,  // Database UUID for mappings
          siteUrl: site.siteUrl,  // External site URL for display
          permissionLevel: site.permissionLevel
        })
      }
    }

    console.log(`[GSC Sites] Returning ${sites.length} GSC sites to frontend`)
    return NextResponse.json({ sites })
  } catch (error: any) {
    console.error('[GSC Sites] Unexpected error:', error.message || error)
    console.error('[GSC Sites] Full error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sites', 
      details: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
