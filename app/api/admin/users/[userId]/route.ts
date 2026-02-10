import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOwner, isUserOwnerOrAdmin, getUserRole } from '@/lib/auth/check-admin'

/**
 * GET /api/admin/users/[userId]
 * Get a specific user's company assignments
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    // Get user's company assignments
    const { data, error } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (
          id,
          name,
          industry,
          color
        )
      `)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    const assignments = data?.map((item) => ({
      ...(item.companies as object),
      role: item.role
    })) || []

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Fetch user assignments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user assignments' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update a user's role in a specific company
 * Only company owners can update roles
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { companyId, role } = body

    // Validate required fields
    if (!companyId || !role) {
      return NextResponse.json(
        { error: 'companyId and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['owner', 'admin', 'client'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, admin, or client' },
        { status: 400 }
      )
    }

    // Check if current user is owner or admin of the company
    const currentUserRole = await getUserRole(user.id, companyId)
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only company owners and admins can update user roles' },
        { status: 403 }
      )
    }

    // Admins cannot assign the 'owner' role
    if (currentUserRole === 'admin' && role === 'owner') {
      return NextResponse.json(
        { error: 'Forbidden: Only owners can assign the owner role' },
        { status: 403 }
      )
    }

    // Admins cannot modify an owner's role
    if (currentUserRole === 'admin') {
      const targetRole = await getUserRole(userId, companyId)
      if (targetRole === 'owner') {
        return NextResponse.json(
          { error: 'Forbidden: Only owners can modify another owner\'s role' },
          { status: 403 }
        )
      }
    }

    // Update the role (use serviceClient to bypass RLS which only allows owners)
    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('user_companies')
      .update({ role })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, assignment: data })
  } catch (error) {
    console.error('Update user role error:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Without companyId: Full account deletion (removes from all companies, deletes auth account)
 * With companyId: Remove a user from a specific company
 * Only company owners can perform these actions
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // If companyId is provided, remove from one company (existing behavior)
    if (companyId) {
      return handleRemoveFromCompany(supabase, user, userId, companyId)
    }

    // Otherwise, full account deletion
    return handleFullDeletion(user, userId)
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

async function handleRemoveFromCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  userId: string,
  companyId: string
) {
  // Check if current user is owner or admin of the company
  const currentUserRole = await getUserRole(user.id, companyId)
  if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only company owners and admins can remove users' },
      { status: 403 }
    )
  }

  // Admins cannot remove owners
  if (currentUserRole === 'admin') {
    const targetRole = await getUserRole(userId, companyId)
    if (targetRole === 'owner') {
      return NextResponse.json(
        { error: 'Forbidden: Only owners can remove another owner' },
        { status: 403 }
      )
    }
  }

  const serviceClient = createServiceClient()

  // Prevent removing the last owner
  const { data: owners, error: ownersError } = await serviceClient
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('role', 'owner')

  if (ownersError) {
    throw ownersError
  }

  if (owners && owners.length === 1 && owners[0].user_id === userId) {
    return NextResponse.json(
      { error: 'Cannot remove the last owner from a company' },
      { status: 400 }
    )
  }

  // Delete the assignment (use serviceClient to bypass RLS which only allows owners)
  const { error } = await serviceClient
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) {
    throw error
  }

  return NextResponse.json({ success: true })
}

async function handleFullDeletion(
  user: { id: string },
  userId: string
) {
  const serviceClient = createServiceClient()

  // Prevent self-deletion
  if (userId === user.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  // Fetch target user info
  const { data: targetUserData, error: userError } = await serviceClient.auth.admin.getUserById(userId)
  if (userError || !targetUserData?.user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }
  const targetUser = targetUserData.user

  // Fetch all company assignments for the target user
  const { data: assignments, error: assignError } = await serviceClient
    .from('user_companies')
    .select('company_id, role, companies(name)')
    .eq('user_id', userId)

  if (assignError) {
    throw assignError
  }

  // Verify requesting user is owner or admin of all companies the target belongs to
  let requesterIsOwnerOfAll = true
  for (const assignment of (assignments || [])) {
    const requesterRole = await getUserRole(user.id, assignment.company_id)
    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: You must be an owner or admin of all companies this user belongs to' },
        { status: 403 }
      )
    }
    if (requesterRole !== 'owner') {
      requesterIsOwnerOfAll = false
    }
  }

  // Admins cannot delete owners
  if (!requesterIsOwnerOfAll) {
    for (const assignment of (assignments || [])) {
      if (assignment.role === 'owner') {
        return NextResponse.json(
          { error: 'Forbidden: Only owners can delete another owner' },
          { status: 403 }
        )
      }
    }
  }

  // Check last-owner safety: target must not be the sole owner of any company
  for (const assignment of (assignments || [])) {
    if (assignment.role === 'owner') {
      const { data: owners } = await serviceClient
        .from('user_companies')
        .select('user_id')
        .eq('company_id', assignment.company_id)
        .eq('role', 'owner')

      if (owners && owners.length === 1) {
        const companyName = (assignment.companies as unknown as { name: string } | null)?.name || 'Unknown'
        return NextResponse.json(
          { error: `Cannot delete user: they are the sole owner of "${companyName}". Transfer ownership first.` },
          { status: 400 }
        )
      }
    }
  }

  // Remove user from all companies
  const companyIds = (assignments || []).map(a => a.company_id)
  if (companyIds.length > 0) {
    const { error: deleteCompaniesError } = await serviceClient
      .from('user_companies')
      .delete()
      .eq('user_id', userId)

    if (deleteCompaniesError) {
      throw deleteCompaniesError
    }
  }

  // Delete any pending invitations for the user's email
  if (targetUser.email) {
    await serviceClient
      .from('pending_invitations')
      .delete()
      .eq('email', targetUser.email.toLowerCase())
  }

  // Null out access_codes.created_by FK (no CASCADE on this FK)
  const { error: accessCodesError } = await serviceClient
    .from('access_codes')
    .update({ created_by: null })
    .eq('created_by', userId)

  if (accessCodesError) {
    console.error('Error cleaning up access_codes:', accessCodesError)
  }

  // Delete the auth account
  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error('Error deleting user account:', deleteUserError)
    return NextResponse.json(
      { error: `User removed from companies but account deletion failed: ${deleteUserError.message}` },
      { status: 500 }
    )
  }

  // Log to audit trail
  await serviceClient
    .from('invite_audit_log')
    .insert({
      admin_id: user.id,
      action: 'revoke',
      target_email: targetUser.email?.toLowerCase() || '',
      company_ids: companyIds,
      metadata: {
        type: 'full_deletion',
        accountDeleted: true
      }
    })

  return NextResponse.json({
    success: true,
    accountDeleted: true,
    message: 'User account deleted successfully'
  })
}
