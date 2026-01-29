import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validatePassword } from '@/lib/utils/password'

/**
 * POST /api/auth/change-password
 * Change password for the current user (used for temp password change flow)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    // Validate new password
    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Update password using service client
    const serviceClient = createServiceClient()
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
        user_metadata: {
          ...user.user_metadata,
          must_change_password: false,
          password_changed_at: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Mark any pending invitations as accepted
    if (user.email) {
      const { data: acceptedInvites } = await serviceClient
        .from('pending_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .select('company_id')

      // Log the acceptance to audit log
      if (acceptedInvites && acceptedInvites.length > 0) {
        const companyIds = acceptedInvites.map(inv => inv.company_id)
        await serviceClient
          .from('invite_audit_log')
          .insert({
            admin_id: user.id,
            action: 'accept',
            target_email: user.email.toLowerCase(),
            company_ids: companyIds,
            metadata: { password_changed_at: new Date().toISOString() }
          })
      }
    }

    // Sign in again with new password to refresh session
    await supabase.auth.signInWithPassword({
      email: user.email!,
      password: newPassword,
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/change-password
 * Check if current user must change their password
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      mustChangePassword: user.user_metadata?.must_change_password === true
    })
  } catch (error) {
    console.error('Check must change password error:', error)
    return NextResponse.json(
      { error: 'Failed to check password status' },
      { status: 500 }
    )
  }
}
