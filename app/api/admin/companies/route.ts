import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Admin endpoint to get ALL companies (not filtered by user)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all companies (admin view)
    const { data: companies, error } = await supabase
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
