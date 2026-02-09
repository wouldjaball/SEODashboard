import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hasAdminAccess } from '@/lib/auth/check-admin'
import { NextResponse } from 'next/server'

// Admin endpoint to get ALL companies (not filtered by user)
export async function GET() {
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

    // Use service client to fetch all companies (bypasses RLS)
    const serviceClient = createServiceClient()
    const { data: companies, error } = await serviceClient
      .from('companies')
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ companies: companies || [] })
  } catch (error) {
    console.error('Fetch all companies error:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}
