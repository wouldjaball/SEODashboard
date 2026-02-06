import { createClient } from '@/lib/supabase/server'
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

    // Check user's role for this company
    const { data: userCompanyAccess } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!userCompanyAccess) {
      return NextResponse.json({ 
        hasAccess: false, 
        role: null,
        message: 'No access to this company' 
      }, { status: 403 })
    }

    return NextResponse.json({
      hasAccess: true,
      role: userCompanyAccess.role,
      message: `Access granted with ${userCompanyAccess.role} permissions`
    })
  } catch (error) {
    console.error('Access check error:', error)
    return NextResponse.json({ error: 'Failed to check access' }, { status: 500 })
  }
}