import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/check-admin'
import { NextResponse } from 'next/server'

export async function GET(
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

    // Check user's role using service client (bypasses RLS)
    const role = await getUserRole(user.id, companyId)

    if (!role) {
      return NextResponse.json({
        hasAccess: false,
        role: null,
        message: 'No access to this company'
      }, { status: 403 })
    }

    return NextResponse.json({
      hasAccess: true,
      role,
      message: `Access granted with ${role} permissions`
    })
  } catch (error) {
    console.error('Access check error:', error)
    return NextResponse.json({ error: 'Failed to check access' }, { status: 500 })
  }
}