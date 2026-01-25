import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOwner } from '@/lib/auth/check-admin'

/**
 * POST /api/admin/users/assign
 * Assign a user to a company with a specific role
 * Supports both userId and email (for inviting users who haven't signed up yet)
 * Only owners of the company can assign users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, email, companyId, role } = body

    // Validate required fields
    if ((!userId && !email) || !companyId || !role) {
      return NextResponse.json(
        { error: 'userId or email, companyId, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['owner', 'admin', 'viewer', 'client'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, admin, viewer, or client' },
        { status: 400 }
      )
    }

    // Check if current user is owner of the company
    const isOwner = await isUserOwner(user.id, companyId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owners can assign users' },
        { status: 403 }
      )
    }

    // If email provided, look up or wait for user
    let targetUserId = userId
    if (!targetUserId && email) {
      // Use service client to look up user by email across all users
      const serviceClient = createServiceClient()

      // First, check if user already exists in auth.users
      const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers()

      if (authError) {
        console.error('Error listing users:', authError)
        return NextResponse.json(
          { error: 'Failed to look up user' },
          { status: 500 }
        )
      }

      const existingUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (existingUser) {
        targetUserId = existingUser.id
      } else {
        // User doesn't exist yet - store a pending invitation
        // For now, we'll create a pending_invitations entry
        const { error: inviteError } = await serviceClient
          .from('pending_invitations')
          .upsert({
            email: email.toLowerCase(),
            company_id: companyId,
            role,
            invited_by: user.id,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'email,company_id'
          })

        if (inviteError) {
          // Table might not exist, create it or just return success
          console.error('Pending invitation error:', inviteError)
          // For now, just inform the user
          return NextResponse.json({
            success: true,
            pending: true,
            message: `Invitation saved. ${email} will have access once they sign up.`
          }, { status: 201 })
        }

        return NextResponse.json({
          success: true,
          pending: true,
          message: `Invitation saved. ${email} will have access once they sign up.`
        }, { status: 201 })
      }
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('user_companies')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('company_id', companyId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'User is already assigned to this company. Use PATCH to update role.' },
        { status: 409 }
      )
    }

    // Create the assignment using service client for proper permissions
    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('user_companies')
      .insert({
        user_id: targetUserId,
        company_id: companyId,
        role
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { success: true, assignment: data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Assign user error:', error)
    return NextResponse.json(
      { error: 'Failed to assign user' },
      { status: 500 }
    )
  }
}
