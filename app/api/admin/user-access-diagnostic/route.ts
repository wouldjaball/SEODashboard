import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasAdminAccess } from '@/lib/auth/check-admin'

interface UserAccessInfo {
  userId: string
  email: string
  userMetadata: any
  lastSignInAt?: string
  companies: Array<{
    companyId: string
    companyName: string
    role: string
    assignedAt: string
  }>
  totalCompanyCount: number
}

interface CompanyAccessInfo {
  companyId: string
  companyName: string
  industry: string
  users: Array<{
    userId: string
    email: string
    role: string
    assignedAt: string
  }>
  totalUserCount: number
}

/**
 * GET /api/admin/user-access-diagnostic
 * Provides comprehensive diagnostic information about user-company access relationships
 * Only accessible by admin/owner users
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    const isAdmin = await hasAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only owners and admins can access diagnostics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const specificUserId = searchParams.get('userId')
    const specificCompanyId = searchParams.get('companyId')

    console.log('[User Access Diagnostic] Running diagnostic for admin:', user.email)
    console.log('[User Access Diagnostic] Filters - User ID:', specificUserId, 'Company ID:', specificCompanyId)

    // Get all users using admin list
    const { data: allUsers, error: usersError } = await serviceClient.auth.admin.listUsers()
    if (usersError) {
      throw usersError
    }

    // Get all companies
    const { data: allCompanies, error: companiesError } = await serviceClient
      .from('companies')
      .select('id, name, industry, created_at')

    if (companiesError) {
      throw companiesError
    }

    // Get all user-company relationships
    const { data: allUserCompanies, error: ucError } = await serviceClient
      .from('user_companies')
      .select('user_id, company_id, role, created_at')

    if (ucError) {
      throw ucError
    }

    console.log('[User Access Diagnostic] Data summary:')
    console.log('- Total users:', allUsers.users.length)
    console.log('- Total companies:', allCompanies?.length || 0)
    console.log('- Total user-company relationships:', allUserCompanies?.length || 0)

    // Build user access information
    const userAccessMap = new Map<string, UserAccessInfo>()
    
    // Initialize all users
    for (const authUser of allUsers.users) {
      userAccessMap.set(authUser.id, {
        userId: authUser.id,
        email: authUser.email || 'No email',
        userMetadata: authUser.user_metadata,
        lastSignInAt: authUser.last_sign_in_at || undefined,
        companies: [],
        totalCompanyCount: 0
      })
    }

    // Add company assignments
    for (const uc of allUserCompanies || []) {
      const userAccess = userAccessMap.get(uc.user_id)
      if (userAccess) {
        const company = allCompanies?.find(c => c.id === uc.company_id)
        if (company) {
          userAccess.companies.push({
            companyId: uc.company_id,
            companyName: company.name,
            role: uc.role,
            assignedAt: uc.created_at
          })
          userAccess.totalCompanyCount++
        }
      }
    }

    // Build company access information
    const companyAccessMap = new Map<string, CompanyAccessInfo>()
    
    // Initialize all companies
    for (const company of allCompanies || []) {
      companyAccessMap.set(company.id, {
        companyId: company.id,
        companyName: company.name,
        industry: company.industry,
        users: [],
        totalUserCount: 0
      })
    }

    // Add user assignments
    for (const uc of allUserCompanies || []) {
      const companyAccess = companyAccessMap.get(uc.company_id)
      if (companyAccess) {
        const authUser = allUsers.users.find(u => u.id === uc.user_id)
        if (authUser) {
          companyAccess.users.push({
            userId: uc.user_id,
            email: authUser.email || 'No email',
            role: uc.role,
            assignedAt: uc.created_at
          })
          companyAccess.totalUserCount++
        }
      }
    }

    // Filter results if specific IDs provided
    let userAccessInfo = Array.from(userAccessMap.values())
    let companyAccessInfo = Array.from(companyAccessMap.values())

    if (specificUserId) {
      userAccessInfo = userAccessInfo.filter(u => u.userId === specificUserId)
    }

    if (specificCompanyId) {
      companyAccessInfo = companyAccessInfo.filter(c => c.companyId === specificCompanyId)
    }

    // Find users with no company access
    const usersWithNoAccess = userAccessInfo.filter(u => u.totalCompanyCount === 0)

    // Find companies with no users
    const companiesWithNoUsers = companyAccessInfo.filter(c => c.totalUserCount === 0)

    // Summary statistics
    const summary = {
      totalUsers: allUsers.users.length,
      totalCompanies: allCompanies?.length || 0,
      totalRelationships: allUserCompanies?.length || 0,
      usersWithNoAccess: usersWithNoAccess.length,
      companiesWithNoUsers: companiesWithNoUsers.length,
      averageCompaniesPerUser: allUsers.users.length > 0 
        ? (allUserCompanies?.length || 0) / allUsers.users.length 
        : 0,
      averageUsersPerCompany: (allCompanies?.length || 0) > 0 
        ? (allUserCompanies?.length || 0) / (allCompanies?.length || 1)
        : 0
    }

    console.log('[User Access Diagnostic] Summary:', summary)

    const result = {
      summary,
      userAccess: userAccessInfo.sort((a, b) => a.email.localeCompare(b.email)),
      companyAccess: companyAccessInfo.sort((a, b) => a.companyName.localeCompare(b.companyName)),
      usersWithNoAccess,
      companiesWithNoUsers,
      filters: {
        userId: specificUserId,
        companyId: specificCompanyId
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[User Access Diagnostic] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate user access diagnostic' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/user-access-diagnostic
 * Fixes common user access issues
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    const isAdmin = await hasAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only owners and admins can fix access issues' },
        { status: 403 }
      )
    }

    const { action, userId, companyId } = await request.json()

    console.log('[User Access Diagnostic] Fix action:', action, 'for user:', userId, 'company:', companyId)

    switch (action) {
      case 'assign_user_to_all_companies': {
        if (!userId) {
          return NextResponse.json({ error: 'userId required for this action' }, { status: 400 })
        }

        // Get all companies
        const { data: allCompanies, error: companiesError } = await serviceClient
          .from('companies')
          .select('id, name')

        if (companiesError) {
          throw companiesError
        }

        if (!allCompanies?.length) {
          return NextResponse.json({ error: 'No companies found' }, { status: 404 })
        }

        // Create assignments for all companies
        const assignments = allCompanies.map(company => ({
          user_id: userId,
          company_id: company.id,
          role: 'viewer'
        }))

        const { error: assignError } = await serviceClient
          .from('user_companies')
          .upsert(assignments, {
            onConflict: 'user_id, company_id',
            ignoreDuplicates: true
          })

        if (assignError) {
          throw assignError
        }

        return NextResponse.json({ 
          message: `Successfully assigned user to ${allCompanies.length} companies`,
          assignedCompanies: allCompanies.length
        })
      }

      case 'assign_all_users_to_company': {
        if (!companyId) {
          return NextResponse.json({ error: 'companyId required for this action' }, { status: 400 })
        }

        // Get all users
        const { data: allUsers, error: usersError } = await serviceClient.auth.admin.listUsers()
        if (usersError) {
          throw usersError
        }

        // Create assignments for all users
        const assignments = allUsers.users.map(authUser => ({
          user_id: authUser.id,
          company_id: companyId,
          role: 'viewer'
        }))

        const { error: assignError } = await serviceClient
          .from('user_companies')
          .upsert(assignments, {
            onConflict: 'user_id, company_id',
            ignoreDuplicates: true
          })

        if (assignError) {
          throw assignError
        }

        return NextResponse.json({ 
          message: `Successfully assigned ${allUsers.users.length} users to company`,
          assignedUsers: allUsers.users.length
        })
      }

      case 'fix_all_user_access': {
        // Assign all users to all companies (emergency fix)
        const { data: allUsers, error: usersError } = await serviceClient.auth.admin.listUsers()
        if (usersError) {
          throw usersError
        }

        const { data: allCompanies, error: companiesError } = await serviceClient
          .from('companies')
          .select('id')

        if (companiesError) {
          throw companiesError
        }

        if (!allUsers.users.length || !allCompanies?.length) {
          return NextResponse.json({ error: 'No users or companies found' }, { status: 404 })
        }

        const assignments = []
        for (const authUser of allUsers.users) {
          for (const company of allCompanies) {
            assignments.push({
              user_id: authUser.id,
              company_id: company.id,
              role: 'viewer'
            })
          }
        }

        const { error: assignError } = await serviceClient
          .from('user_companies')
          .upsert(assignments, {
            onConflict: 'user_id, company_id',
            ignoreDuplicates: true
          })

        if (assignError) {
          throw assignError
        }

        return NextResponse.json({ 
          message: `Successfully created ${assignments.length} user-company relationships`,
          totalRelationships: assignments.length
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[User Access Diagnostic] Fix error:', error)
    return NextResponse.json(
      { error: 'Failed to fix user access issue' },
      { status: 500 }
    )
  }
}