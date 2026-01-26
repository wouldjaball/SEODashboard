import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasAdminAccess, getUserOwnedCompanies } from '@/lib/auth/check-admin'

/**
 * GET /api/admin/users
 * Returns all users that the current owner/admin can manage
 * (users who belong to companies where current user is owner/admin)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Admin Users API] Current user:', user.id, user.email)

    // Check if user has admin access
    const isAdmin = await hasAdminAccess(user.id)
    console.log('[Admin Users API] Has admin access:', isAdmin)

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only owners and admins can access user management' },
        { status: 403 }
      )
    }

    // Get companies where current user is owner/admin
    const ownedCompanies = await getUserOwnedCompanies(user.id)
    const companyIds = ownedCompanies.map(c => c.id)
    console.log('[Admin Users API] Owned companies:', companyIds.length, companyIds)

    if (companyIds.length === 0) {
      console.log('[Admin Users API] No owned companies, returning empty')
      return NextResponse.json({ users: [] })
    }

    // Get all user_companies relationships for those companies
    const { data: userCompaniesData, error: ucError } = await supabase
      .from('user_companies')
      .select(`
        user_id,
        company_id,
        role,
        companies (
          id,
          name
        )
      `)
      .in('company_id', companyIds)

    if (ucError) {
      console.error('[Admin Users API] Error fetching user_companies:', ucError)
      throw ucError
    }

    console.log('[Admin Users API] Found user_companies records:', userCompaniesData?.length || 0)

    // Group by user_id
    const userMap = new Map<string, {
      id: string
      email: string
      companies: Array<{ id: string; name: string; role: string }>
    }>()

    for (const item of userCompaniesData || []) {
      if (!userMap.has(item.user_id)) {
        // Note: We can't directly access auth.users due to RLS
        // We'll fetch user emails in a separate query
        userMap.set(item.user_id, {
          id: item.user_id,
          email: '', // Will be filled below
          companies: []
        })
      }

      const userData = userMap.get(item.user_id)!
      const companies = item.companies as unknown as { name: string } | { name: string }[]
      const companyName = Array.isArray(companies) ? companies[0]?.name : companies?.name
      userData.companies.push({
        id: item.company_id,
        name: companyName || '',
        role: item.role
      })
    }

    // Fetch user emails from auth.users using service role
    // Note: This requires a different approach since we can't use RLS on auth.users
    // For now, we'll use the admin API
    // Fetch users using admin.listUsers() which bypasses RLS
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('Error fetching users:', usersError)
      // Fallback: return without emails
      return NextResponse.json({
        users: Array.from(userMap.values())
      })
    }

    // Match user IDs with emails
    for (const authUser of usersData.users) {
      if (userMap.has(authUser.id)) {
        userMap.get(authUser.id)!.email = authUser.email || ''
      }
    }

    const users = Array.from(userMap.values())
      // Filter out users without emails (shouldn't happen)
      .filter(u => u.email)
      // Sort by email
      .sort((a, b) => a.email.localeCompare(b.email))

    console.log('[Admin Users API] Returning users:', users.length, users.map(u => u.email))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
