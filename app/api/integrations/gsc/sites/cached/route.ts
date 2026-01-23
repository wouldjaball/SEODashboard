import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET cached GSC sites from database (no Google API call)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch cached sites from database
    const { data: sites, error } = await supabase
      .from('gsc_sites')
      .select('id, site_url, permission_level, created_at')
      .eq('user_id', user.id)
      .order('site_url')

    if (error) {
      console.error('Error fetching cached GSC sites:', error)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }

    // Transform to match expected format
    const formattedSites = (sites || []).map(s => ({
      id: s.id,
      siteUrl: s.site_url,
      permissionLevel: s.permission_level
    }))

    return NextResponse.json({ sites: formattedSites })
  } catch (error) {
    console.error('Error in cached GSC sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
