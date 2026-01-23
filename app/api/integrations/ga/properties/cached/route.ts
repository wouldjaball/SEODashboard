import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET cached GA properties from database (no Google API call)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch cached properties from database
    const { data: properties, error } = await supabase
      .from('ga_properties')
      .select('id, property_id, display_name, created_at')
      .eq('user_id', user.id)
      .order('display_name')

    if (error) {
      console.error('Error fetching cached GA properties:', error)
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    // Transform to match expected format
    const formattedProperties = (properties || []).map(p => ({
      id: p.id,
      propertyId: p.property_id,
      displayName: p.display_name
    }))

    return NextResponse.json({ properties: formattedProperties })
  } catch (error) {
    console.error('Error in cached GA properties:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
