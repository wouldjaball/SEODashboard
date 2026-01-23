import { createClient } from '@/lib/supabase/server'
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

    const { companyId } = await params

    // Delete the company (cascades to all related tables due to ON DELETE CASCADE)
    const { error } = await supabase
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
