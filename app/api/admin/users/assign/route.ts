import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isUserOwner } from '@/lib/auth/check-admin'

/**
 * POST /api/admin/users/assign
 * Assign a user to a company with a specific role
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
    const { userId, companyId, role } = body

    // Validate required fields
    if (!userId || !companyId || !role) {
      return NextResponse.json(
        { error: 'userId, companyId, and role are required' },
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
        { error: 'Forbidden: Only company owners can assign users' },
        { status: 403 }
      )
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('user_companies')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'User is already assigned to this company. Use PATCH to update role.' },
        { status: 409 }
      )
    }

    // Create the assignment
    const { data, error } = await supabase
      .from('user_companies')
      .insert({
        user_id: userId,
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
