import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOwner } from '@/lib/auth/check-admin'
import { EmailService } from '@/lib/services/email-service'
import { generateTempPassword } from '@/lib/utils/password'

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

    const serviceClient = createServiceClient()

    // Rate limiting: max 20 invites per admin per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentInviteCount } = await serviceClient
      .from('invite_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', user.id)
      .eq('action', 'invite')
      .gte('created_at', oneHourAgo)

    if (recentInviteCount !== null && recentInviteCount >= 20) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 20 invitations per hour.' },
        { status: 429 }
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

    // If email provided, look up or wait for user
    let targetUserId = userId
    if (!targetUserId && email) {
      // First, check if user already exists in auth.users
      // Use higher perPage limit to ensure we find existing users
      const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })

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
        // User doesn't exist yet - create user with temporary password
        const tempPassword = generateTempPassword()
        const companyNames: string[] = []

        // Create user with Supabase Admin API
        const { data: newUser, error: createUserError } = await serviceClient.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true, // Skip email verification
          user_metadata: {
            must_change_password: true,
            invited_by: user.id,
            invited_at: new Date().toISOString()
          }
        })

        if (createUserError) {
          console.error('Error creating user:', createUserError)
          // Provide more helpful error messages
          let errorMessage = 'Failed to create user account'
          if (createUserError.message?.includes('already been registered') ||
              createUserError.message?.includes('already exists')) {
            errorMessage = 'A user with this email already exists'
          } else if (createUserError.message) {
            errorMessage = `Failed to create user account: ${createUserError.message}`
          }
          return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
          )
        }

        // Store pending invitations and collect company names
        let successfulAssignments = 0
        const assignmentErrors: string[] = []

        for (const cId of targetCompanyIds) {
          // Store pending invitation record for tracking
          const { error: inviteError } = await serviceClient
            .from('pending_invitations')
            .upsert({
              email: email.toLowerCase(),
              company_id: cId,
              role,
              invited_by: user.id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'email,company_id'
            })

          if (inviteError) {
            console.error('Pending invitation error:', inviteError)
            assignmentErrors.push(`invitation:${cId}`)
          }

          // Create user_company relationship immediately since user exists
          const { error: assignError } = await serviceClient
            .from('user_companies')
            .upsert({
              user_id: newUser.user.id,
              company_id: cId,
              role
            }, {
              onConflict: 'user_id,company_id'
            })

          if (assignError) {
            console.error('User company assignment error:', assignError)
            assignmentErrors.push(`assignment:${cId}`)
          } else {
            successfulAssignments++
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

        // Rollback: if all assignments failed, delete the created user to avoid orphans
        if (successfulAssignments === 0) {
          console.error('All assignments failed, rolling back user creation:', assignmentErrors)
          await serviceClient.auth.admin.deleteUser(newUser.user.id)
          return NextResponse.json(
            { error: 'Failed to assign user to companies. User creation has been rolled back.' },
            { status: 500 }
          )
        }

        // Get inviter's name
        const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0]

        // Send ONE invite email with temporary password and all company names
        const emailResult = await EmailService.sendInviteEmail(
          email.toLowerCase(),
          companyNames.length > 0 ? companyNames : ['your company'],
          inviterName,
          tempPassword
        )

        if (!emailResult.success) {
          console.error('Failed to send invite email:', emailResult.error)
        }

        // Log invite action to audit log
        await serviceClient
          .from('invite_audit_log')
          .insert({
            admin_id: user.id,
            action: 'invite',
            target_email: email.toLowerCase(),
            company_ids: targetCompanyIds,
            metadata: {
              role,
              email_sent: emailResult.success,
              companies_count: targetCompanyIds.length
            }
          })

        return NextResponse.json({
          success: true,
          pending: true,
          emailSent: emailResult.success,
          emailError: !emailResult.success ? emailResult.error : undefined,
          companiesInvited: targetCompanyIds.length,
          userId: newUser.user.id,
          message: emailResult.success
            ? `User account created and invitation sent. ${email} can log in with their temporary password.`
            : `User account created but email failed to send. Please use "Resend Invitation" to try again.`
        }, { status: 201 })
      }
    }

    // User exists - assign to all companies
    const assignments = []
    const errors = []
    const newlyAssignedCompanyNames: string[] = []

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

        // Get company name for the notification email
        const { data: company } = await serviceClient
          .from('companies')
          .select('name')
          .eq('id', cId)
          .single()

        if (company?.name) {
          newlyAssignedCompanyNames.push(company.name)
        }
      }
    }

    // Send notification email to existing user about new company access
    let emailSent = false
    if (newlyAssignedCompanyNames.length > 0 && email) {
      const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0]
      const emailResult = await EmailService.sendAssignmentEmail(
        email.toLowerCase(),
        newlyAssignedCompanyNames,
        inviterName
      )
      emailSent = emailResult.success
      if (!emailResult.success) {
        console.error('Failed to send assignment notification email:', emailResult.error)
      }
    }

    return NextResponse.json({
      success: true,
      assignments,
      errors: errors.length > 0 ? errors : undefined,
      emailSent: newlyAssignedCompanyNames.length > 0 ? emailSent : undefined,
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
