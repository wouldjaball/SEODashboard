import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasAdminAccess, getUserOwnedCompanies } from '@/lib/auth/check-admin'

interface UserWithStatus {
  id: string
  email: string
  status: 'active' | 'pending'
  mustChangePassword: boolean
  lastSignInAt?: string
  companies: Array<{ id: string; name: string; role: string }>
}

interface PendingInvitation {
  id: string
  email: string
  company_id: string
  role: string
  invited_by: string
  expires_at: string
  created_at: string
  companies: { id: string; name: string } | { id: string; name: string }[]
}

/**
 * GET /api/admin/users
 * Returns all users that the current owner/admin can manage
 * (users who belong to companies where current user is owner/admin)
 * Includes both active users and pending invitations with status field
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
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
      return NextResponse.json({ users: [], pendingInvitations: [] })
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
    const userMap = new Map<string, UserWithStatus>()

    for (const item of userCompaniesData || []) {
      if (!userMap.has(item.user_id)) {
        userMap.set(item.user_id, {
          id: item.user_id,
          email: '',
          status: 'active',
          mustChangePassword: false,
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

    // Fetch users using admin.listUsers() which bypasses RLS (requires service client)
    const { data: usersData, error: usersError } = await serviceClient.auth.admin.listUsers()

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({
        users: Array.from(userMap.values()),
        pendingInvitations: []
      })
    }

    // Match user IDs with emails and metadata
    for (const authUser of usersData.users) {
      if (userMap.has(authUser.id)) {
        const userData = userMap.get(authUser.id)!
        userData.email = authUser.email || ''
        userData.lastSignInAt = authUser.last_sign_in_at || undefined
        userData.mustChangePassword = authUser.user_metadata?.must_change_password === true

        // User is "pending" if they have must_change_password flag and never signed in
        if (userData.mustChangePassword && !authUser.last_sign_in_at) {
          userData.status = 'pending'
        }
      }
    }

    const users = Array.from(userMap.values())
      .filter(u => u.email)
      .sort((a, b) => a.email.localeCompare(b.email))

    // Fetch pending invitations that haven't been accepted (including recently expired)
    let pendingInvitations: Array<{
      id: string
      email: string
      role: string
      invitedBy: string
      invitedByEmail?: string
      expiresAt: string
      createdAt: string
      expired: boolean
      companies: Array<{ id: string; name: string }>
    }> = []

    // Include invitations expired within last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: invitationsData, error: invitationsError } = await serviceClient
      .from('pending_invitations')
      .select(`
        id,
        email,
        company_id,
        role,
        invited_by,
        expires_at,
        created_at,
        companies (
          id,
          name
        )
      `)
      .in('company_id', companyIds)
      .is('accepted_at', null)
      .gt('expires_at', thirtyDaysAgo.toISOString())

    if (!invitationsError && invitationsData) {
      const now = new Date()

      // Group invitations by email
      const invitationsByEmail = new Map<string, {
        id: string
        email: string
        role: string
        invitedBy: string
        invitedByEmail?: string
        expiresAt: string
        createdAt: string
        expired: boolean
        companies: Array<{ id: string; name: string }>
      }>()

      for (const inv of invitationsData as PendingInvitation[]) {
        const email = inv.email.toLowerCase()
        const isExpired = new Date(inv.expires_at) < now

        if (!invitationsByEmail.has(email)) {
          invitationsByEmail.set(email, {
            id: inv.id,
            email: inv.email,
            role: inv.role,
            invitedBy: inv.invited_by,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at,
            expired: isExpired,
            companies: []
          })
        }
        const companies = inv.companies as unknown as { id: string; name: string } | { id: string; name: string }[]
        const company = Array.isArray(companies) ? companies[0] : companies
        if (company) {
          invitationsByEmail.get(email)!.companies.push({
            id: company.id,
            name: company.name
          })
        }
      }

      // Add inviter email to pending invitations
      for (const invitation of invitationsByEmail.values()) {
        const inviter = usersData.users.find(u => u.id === invitation.invitedBy)
        if (inviter) {
          invitation.invitedByEmail = inviter.email
        }
      }

      pendingInvitations = Array.from(invitationsByEmail.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    console.log('[Admin Users API] Returning users:', users.length, 'pending:', pendingInvitations.length)

    return NextResponse.json({ users, pendingInvitations })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
