import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse optional companyIds from request body
    let companyIds: string[] | null = null
    try {
      const body = await request.json()
      if (body.companyIds && Array.isArray(body.companyIds) && body.companyIds.length > 0) {
        companyIds = body.companyIds
      }
    } catch {
      // Empty body is fine — means sync all
    }

    // If targeting specific companies, validate caller has owner/admin access
    if (companyIds) {
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id, role')
        .eq('user_id', user.id)
        .in('company_id', companyIds)

      const accessMap = new Map((userCompanies || []).map(uc => [uc.company_id, uc.role]))
      for (const id of companyIds) {
        const role = accessMap.get(id)
        if (!role || !['owner', 'admin'].includes(role)) {
          return NextResponse.json({ error: `Insufficient access to company ${id}` }, { status: 403 })
        }
      }
    }

    // Trigger the sync-analytics cron endpoint in the background
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Sync not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let syncUrl = `${baseUrl}/api/cron/sync-analytics?secret=${cronSecret}`

    if (companyIds) {
      syncUrl += `&companyIds=${companyIds.join(',')}&force=true`
    }

    // Fire-and-forget: trigger the cron endpoint without waiting for it to complete
    fetch(syncUrl, { method: 'GET' }).catch(err => {
      console.error('[Trigger Sync] Background sync request failed:', err)
    })

    console.log(`[Trigger Sync] Sync triggered by user ${user.email}${companyIds ? ` for companies: ${companyIds.join(', ')}` : ' (all)'}`)

    return NextResponse.json({
      status: 'started',
      message: companyIds
        ? `Sync triggered for ${companyIds.length} company(ies). Data will be available shortly.`
        : 'Sync has been triggered for all companies. Data will be available shortly.',
      companyIds: companyIds || 'all'
    })
  } catch (error) {
    console.error('[Trigger Sync] Error:', error)
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 })
  }
}
