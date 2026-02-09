import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOwner } from '@/lib/auth/check-admin'

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

    // Check if current user is owner of the company
    const isOwner = await isUserOwner(user.id, companyId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owners can update user roles' },
        { status: 403 }
      )
    }

    // Update the role
    const { data, error } = await supabase
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
  // Check if current user is owner of the company
  const ownerCheck = await isUserOwner(user.id, companyId)
  if (!ownerCheck) {
    return NextResponse.json(
      { error: 'Forbidden: Only company owners can remove users' },
      { status: 403 }
    )
  }

  // Prevent removing the last owner
  const { data: owners, error: ownersError } = await supabase
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

  // Delete the assignment
  const { error } = await supabase
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

  // Verify requesting user is owner of all companies the target belongs to
  for (const assignment of (assignments || [])) {
    const ownerCheck = await isUserOwner(user.id, assignment.company_id)
    if (!ownerCheck) {
      return NextResponse.json(
        { error: 'Forbidden: You must be an owner of all companies this user belongs to' },
        { status: 403 }
      )
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
  await serviceClient
    .from('access_codes')
    .update({ created_by: null })
    .eq('created_by', userId)

  // Delete the auth account
  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error('Error deleting user account:', deleteUserError)
    return NextResponse.json(
      { error: 'User removed from companies but account deletion failed' },
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
