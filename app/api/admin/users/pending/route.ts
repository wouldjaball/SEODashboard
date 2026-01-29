import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasAdminAccess, getUserOwnedCompanies, isUserOwner } from '@/lib/auth/check-admin'
import { EmailService } from '@/lib/services/email-service'
import { generateTempPassword } from '@/lib/utils/password'

/**
 * GET /api/admin/users/pending
 * Returns pending invitations for companies the current user owns/admins
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await hasAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only owners and admins can access pending invitations' },
        { status: 403 }
      )
    }

    const ownedCompanies = await getUserOwnedCompanies(user.id)
    const companyIds = ownedCompanies.map(c => c.id)

    if (companyIds.length === 0) {
      return NextResponse.json({ invitations: [] })
    }

    const { data: invitations, error } = await serviceClient
      .from('pending_invitations')
      .select(`
        id,
        email,
        company_id,
        role,
        invited_by,
        expires_at,
        created_at,
        accepted_at,
        companies (
          id,
          name
        )
      `)
      .in('company_id', companyIds)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending invitations:', error)
      throw error
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    console.error('Fetch pending invitations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending invitations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users/pending
 * Actions on pending invitations: resend
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (action === 'resend') {
      // Rate limiting: max 3 resends per email per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: recentResendCount } = await serviceClient
        .from('invite_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('target_email', email.toLowerCase())
        .eq('action', 'resend')
        .gte('created_at', oneHourAgo)

      if (recentResendCount !== null && recentResendCount >= 3) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Maximum 3 resends per email per hour.' },
          { status: 429 }
        )
      }

      // Get all pending invitations for this email
      const { data: invitations, error: fetchError } = await serviceClient
        .from('pending_invitations')
        .select(`
          id,
          company_id,
          role,
          companies (
            id,
            name
          )
        `)
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)

      if (fetchError || !invitations || invitations.length === 0) {
        return NextResponse.json(
          { error: 'No pending invitations found for this email' },
          { status: 404 }
        )
      }

      // Check if user is owner of all companies
      for (const inv of invitations) {
        const isOwner = await isUserOwner(user.id, inv.company_id)
        if (!isOwner) {
          return NextResponse.json(
            { error: 'Forbidden: You must be an owner of all companies to resend invitations' },
            { status: 403 }
          )
        }
      }

      // Check if user exists with must_change_password flag (account was created)
      const { data: authUsers } = await serviceClient.auth.admin.listUsers()
      const existingUser = authUsers?.users.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
      )

      let tempPassword: string | undefined

      if (existingUser) {
        // User account exists - generate new temp password
        tempPassword = generateTempPassword()

        const { error: updateError } = await serviceClient.auth.admin.updateUserById(
          existingUser.id,
          {
            password: tempPassword,
            user_metadata: {
              ...existingUser.user_metadata,
              must_change_password: true
            }
          }
        )

        if (updateError) {
          console.error('Error updating user password:', updateError)
          return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
          )
        }
      }

      // Collect company names
      const companyNames = invitations
        .map(inv => {
          const companies = inv.companies as unknown as { name: string } | { name: string }[]
          return Array.isArray(companies) ? companies[0]?.name : companies?.name
        })
        .filter(Boolean) as string[]

      // Update invitation timestamps
      await serviceClient
        .from('pending_invitations')
        .update({
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)

      // Get inviter's name
      const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0]

      // Resend invite email with temp password if we have one
      const emailResult = await EmailService.sendInviteEmail(
        email.toLowerCase(),
        companyNames.length > 0 ? companyNames : ['your company'],
        inviterName,
        tempPassword
      )

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error)
        return NextResponse.json(
          { error: 'Failed to send invite email' },
          { status: 500 }
        )
      }

      // Log resend action to audit log
      const companyIds = invitations.map(inv => inv.company_id)
      await serviceClient
        .from('invite_audit_log')
        .insert({
          admin_id: user.id,
          action: 'resend',
          target_email: email.toLowerCase(),
          company_ids: companyIds,
          metadata: {
            companies_count: invitations.length,
            new_password_generated: !!tempPassword
          }
        })

      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Pending invitation action error:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/pending
 * Revoke a pending invitation
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get all pending invitations for this email
    const { data: invitations, error: fetchError } = await serviceClient
      .from('pending_invitations')
      .select('id, company_id')
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)

    if (fetchError || !invitations || invitations.length === 0) {
      return NextResponse.json(
        { error: 'No pending invitations found for this email' },
        { status: 404 }
      )
    }

    // Check if user is owner of all companies
    for (const inv of invitations) {
      const isOwner = await isUserOwner(user.id, inv.company_id)
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Forbidden: You must be an owner of all companies to revoke invitations' },
          { status: 403 }
        )
      }
    }

    // Check if a user account exists for this email
    const { data: authUsers } = await serviceClient.auth.admin.listUsers()
    const existingUser = authUsers?.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    )

    // Delete pending invitations
    const { error: deleteError } = await serviceClient
      .from('pending_invitations')
      .delete()
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)

    if (deleteError) {
      console.error('Error deleting pending invitations:', deleteError)
      throw deleteError
    }

    // If user was created but never logged in (still has must_change_password), delete the user account
    if (existingUser && existingUser.user_metadata?.must_change_password && !existingUser.last_sign_in_at) {
      // Remove user from all companies
      await serviceClient
        .from('user_companies')
        .delete()
        .eq('user_id', existingUser.id)

      // Delete the user account
      const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(
        existingUser.id
      )

      if (deleteUserError) {
        console.error('Error deleting user account:', deleteUserError)
        // Don't fail - invitation is revoked, user can still be manually removed
      }
    }

    // Log revoke action to audit log
    const companyIds = invitations.map(inv => inv.company_id)
    await serviceClient
      .from('invite_audit_log')
      .insert({
        admin_id: user.id,
        action: 'revoke',
        target_email: email.toLowerCase(),
        company_ids: companyIds,
        metadata: {
          user_account_deleted: existingUser && existingUser.user_metadata?.must_change_password && !existingUser.last_sign_in_at
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully'
    })
  } catch (error) {
    console.error('Revoke invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    )
  }
}
