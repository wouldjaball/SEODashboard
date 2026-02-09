import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hasAdminAccess } from '@/lib/auth/check-admin'
import { NextResponse } from 'next/server'

// Delete a company
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has admin/owner access
    const isAdmin = await hasAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { companyId } = await params

    // Use service client to bypass RLS (no DELETE policy exists on companies table)
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('companies')
      .delete()
      .eq('id', companyId)

    if (error) {
      console.error('Delete company error:', error)
      return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
