import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOwner } from '@/lib/auth/check-admin'
import { EmailService } from '@/lib/services/email-service'

/**
 * POST /api/admin/users/assign
 * Assign a user to one or more companies with a specific role
 * Supports both userId and email (for inviting users who haven't signed up yet)
 * Accepts either companyId (single) or companyIds (array) for batch invites
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
    const { userId, email, companyId, companyIds, role } = body

    // Support both single companyId and array of companyIds
    const targetCompanyIds: string[] = companyIds || (companyId ? [companyId] : [])

    // Validate required fields
    if ((!userId && !email) || targetCompanyIds.length === 0 || !role) {
      return NextResponse.json(
        { error: 'userId or email, companyId/companyIds, and role are required' },
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

    // Check if current user is owner of ALL the companies
    for (const cId of targetCompanyIds) {
      const isOwner = await isUserOwner(user.id, cId)
      if (!isOwner) {
        return NextResponse.json(
          { error: `Forbidden: You must be an owner of all selected companies` },
          { status: 403 }
        )
      }
    }

    const serviceClient = createServiceClient()

    // If email provided, look up or wait for user
    let targetUserId = userId
    if (!targetUserId && email) {
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
        // User doesn't exist yet - store pending invitations for all companies
        const companyNames: string[] = []

        for (const cId of targetCompanyIds) {
          // Store pending invitation
          const { error: inviteError } = await serviceClient
            .from('pending_invitations')
            .upsert({
              email: email.toLowerCase(),
              company_id: cId,
              role,
              invited_by: user.id,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'email,company_id'
            })

          if (inviteError) {
            // Table might not exist, just log and continue
            console.error('Pending invitation error:', inviteError)
          }

          // Get company name for the email
          const { data: company } = await serviceClient
            .from('companies')
            .select('name')
            .eq('id', cId)
            .single()

          if (company?.name) {
            companyNames.push(company.name)
          }
        }

        // Get inviter's name
        const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0]

        // Send ONE invite email with all company names
        const emailResult = await EmailService.sendInviteEmail(
          email.toLowerCase(),
          companyNames.length > 0 ? companyNames : ['your company'],
          inviterName
        )

        if (!emailResult.success) {
          console.error('Failed to send invite email:', emailResult.error)
        }

        return NextResponse.json({
          success: true,
          pending: true,
          emailSent: emailResult.success,
          companiesInvited: targetCompanyIds.length,
          message: `Invitation sent. ${email} will have access to ${targetCompanyIds.length} company${targetCompanyIds.length > 1 ? 'ies' : ''} once they sign up.`
        }, { status: 201 })
      }
    }

    // User exists - assign to all companies
    const assignments = []
    const errors = []

    for (const cId of targetCompanyIds) {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('user_companies')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('company_id', cId)
        .single()

      if (existing) {
        errors.push({ companyId: cId, error: 'Already assigned' })
        continue
      }

      // Create the assignment
      const { data, error } = await serviceClient
        .from('user_companies')
        .insert({
          user_id: targetUserId,
          company_id: cId,
          role
        })
        .select()
        .single()

      if (error) {
        errors.push({ companyId: cId, error: error.message })
      } else {
        assignments.push(data)
      }
    }

    return NextResponse.json({
      success: true,
      assignments,
      errors: errors.length > 0 ? errors : undefined,
      message: `User assigned to ${assignments.length} company${assignments.length !== 1 ? 'ies' : ''}${errors.length > 0 ? ` (${errors.length} skipped)` : ''}`
    }, { status: 201 })
  } catch (error) {
    console.error('Assign user error:', error)
    return NextResponse.json(
      { error: 'Failed to assign user' },
      { status: 500 }
    )
  }
}
