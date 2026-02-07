import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Trigger the sync-analytics cron endpoint in the background
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Sync not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Fire-and-forget: trigger the cron endpoint without waiting for it to complete
    fetch(`${baseUrl}/api/cron/sync-analytics?secret=${cronSecret}`, {
      method: 'GET'
    }).catch(err => {
      console.error('[Trigger Sync] Background sync request failed:', err)
    })

    console.log(`[Trigger Sync] Sync triggered by user ${user.email}`)

    return NextResponse.json({
      status: 'started',
      message: 'Sync has been triggered. Data will be available shortly.'
    })
  } catch (error) {
    console.error('[Trigger Sync] Error:', error)
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 })
  }
}
