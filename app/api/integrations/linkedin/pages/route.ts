import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hasAdminAccess } from '@/lib/auth/check-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await hasAdminAccess(user.id)
    const queryClient = isAdmin ? createServiceClient() : supabase

    let query = queryClient
      .from('linkedin_pages')
      .select('*')
      .eq('is_active', true)
      .order('page_name')

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data: pages, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ pages: pages || [] })
  } catch (error) {
    console.error('Fetch LinkedIn pages error:', error)
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { page_id, page_name, page_url } = await request.json()

    if (!page_id || !page_name) {
      return NextResponse.json({ error: 'Page ID and name are required' }, { status: 400 })
    }

    const { data: page, error } = await supabase
      .from('linkedin_pages')
      .upsert({
        user_id: user.id,
        page_id,
        page_name,
        page_url,
        is_active: true
      }, {
        onConflict: 'user_id,page_id'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ page }, { status: 201 })
  } catch (error) {
    console.error('Create LinkedIn page error:', error)
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
  }
}
