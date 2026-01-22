import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessToken = await OAuthTokenService.refreshAccessToken(user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    // Fetch sites
    const sitesResponse = await fetch(
      'https://searchconsole.googleapis.com/webmasters/v3/sites',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (!sitesResponse.ok) {
      throw new Error('Failed to fetch sites')
    }

    const sitesData = await sitesResponse.json()
    const sites = []

    // Save to database
    for (const site of sitesData.siteEntry || []) {
      const siteData = {
        id: site.siteUrl,
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel
      }

      sites.push(siteData)

      await supabase.from('gsc_sites').upsert({
        user_id: user.id,
        site_url: site.siteUrl,
        permission_level: site.permissionLevel
      }, {
        onConflict: 'user_id,site_url'
      })
    }

    return NextResponse.json({ sites })
  } catch (error) {
    console.error('Fetch sites error:', error)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}
