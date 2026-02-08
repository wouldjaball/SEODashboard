import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Auth check: verify the user is logged in and has owner role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check that user is an owner of at least one company
    const { data: userRoles } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)

    const isOwner = userRoles?.some(r => r.role === 'owner')
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 })
    }

    // Use service role client for cross-tenant visibility
    const serviceClient = createServiceClient()

    // Fetch sync statuses joined with company names
    const { data: syncStatuses, error: syncError } = await serviceClient
      .from('sync_status')
      .select('*, companies(name)')
      .order('company_id')

    if (syncError) {
      console.error('[Sync Status API] Error fetching sync statuses:', syncError)
      return NextResponse.json({ error: 'Failed to fetch sync statuses' }, { status: 500 })
    }

    // Fetch token health info: get all oauth tokens with expiry
    const { data: tokens } = await serviceClient
      .from('oauth_tokens')
      .select('user_id, provider, expires_at, updated_at')

    // Cross-reference tokens with mapping tables to find which companies they serve
    const [gaMappings, gscMappings, ytMappings, liMappings] = await Promise.all([
      serviceClient.from('company_ga_mappings').select('company_id, ga_properties(user_id)').then(r => r.data || []),
      serviceClient.from('company_gsc_mappings').select('company_id, gsc_sites(user_id)').then(r => r.data || []),
      serviceClient.from('company_youtube_mappings').select('company_id, youtube_channels(user_id)').then(r => r.data || []),
      serviceClient.from('company_linkedin_mappings').select('company_id, linkedin_pages(user_id)').then(r => r.data || [])
    ])

    // Build a map of user_id -> company_ids they serve
    const userToCompanies = new Map<string, Set<string>>()
    const addMapping = (companyId: string, userId: string | undefined) => {
      if (!userId) return
      if (!userToCompanies.has(userId)) userToCompanies.set(userId, new Set())
      userToCompanies.get(userId)!.add(companyId)
    }

    gaMappings.forEach((m: any) => addMapping(m.company_id, m.ga_properties?.user_id))
    gscMappings.forEach((m: any) => addMapping(m.company_id, m.gsc_sites?.user_id))
    ytMappings.forEach((m: any) => addMapping(m.company_id, m.youtube_channels?.user_id))
    liMappings.forEach((m: any) => addMapping(m.company_id, m.linkedin_pages?.user_id))

    // Build token health array with company associations
    const tokenHealth = (tokens || []).map(t => {
      const expiresAt = t.expires_at ? new Date(t.expires_at) : null
      const now = new Date()
      const isExpired = expiresAt ? expiresAt < now : false
      const expiresInHours = expiresAt ? (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) : null
      const companyIds = Array.from(userToCompanies.get(t.user_id) || [])

      return {
        userId: t.user_id,
        provider: t.provider,
        expiresAt: t.expires_at,
        updatedAt: t.updated_at,
        isExpired,
        expiresSoon: expiresInHours !== null && expiresInHours > 0 && expiresInHours < 24,
        companyIds
      }
    })

    return NextResponse.json({
      syncStatuses: syncStatuses || [],
      tokenHealth,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Sync Status API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
