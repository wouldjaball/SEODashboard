import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: channels, error } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('channel_name')

    if (error) {
      throw error
    }

    return NextResponse.json({ channels: channels || [] })
  } catch (error) {
    console.error('Fetch YouTube channels error:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channel_id, channel_name, channel_handle, thumbnail_url } = await request.json()

    if (!channel_id || !channel_name) {
      return NextResponse.json({ error: 'Channel ID and name are required' }, { status: 400 })
    }

    const { data: channel, error } = await supabase
      .from('youtube_channels')
      .upsert({
        user_id: user.id,
        channel_id,
        channel_name,
        channel_handle,
        thumbnail_url,
        is_active: true
      }, {
        onConflict: 'user_id,channel_id'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Create YouTube channel error:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}
