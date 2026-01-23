import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/admin/clear-cache - Clear the analytics cache
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all cached analytics data
    const { error, count } = await supabase
      .from('analytics_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (error) {
      console.error('Error clearing cache:', error)
      return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics cache cleared successfully',
      rowsDeleted: count
    })
  } catch (error) {
    console.error('Clear cache error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
