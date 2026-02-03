import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Manual cache warming endpoint for admins
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/owner (has access to admin functions)
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)

    const hasAdminAccess = userCompanies?.some(uc => uc.role === 'owner' || uc.role === 'admin')
    
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Trigger portfolio cache population by calling the portfolio API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/portfolio`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Cookie': '', // No cookies needed for service role
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: 'Cache warmed successfully',
        cached: data.cached,
        companiesCount: data.companies?.length || 0
      })
    } else {
      throw new Error(`Portfolio API responded with status ${response.status}`)
    }

  } catch (error) {
    console.error('Cache warming failed:', error)
    return NextResponse.json({
      error: 'Failed to warm cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}