import { createClient } from '@/lib/supabase/server'
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

    const assignments = data?.map((item: any) => ({
      ...item.companies,
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
 * Remove a user from a specific company
 * Only company owners can remove users
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

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId query parameter is required' },
        { status: 400 }
      )
    }

    // Check if current user is owner of the company
    const isOwner = await isUserOwner(user.id, companyId)
    if (!isOwner) {
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
  } catch (error) {
    console.error('Remove user error:', error)
    return NextResponse.json(
      { error: 'Failed to remove user' },
      { status: 500 }
    )
  }
}
