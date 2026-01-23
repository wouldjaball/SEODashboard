import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET cached YouTube channels from database (no YouTube API call)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch cached channels from database
    const { data: channels, error } = await supabase
      .from('youtube_channels')
      .select('id, channel_id, channel_name, channel_handle, thumbnail_url, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('channel_name')

    if (error) {
      console.error('Error fetching cached YouTube channels:', error)
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }

    // Transform to match expected format
    const formattedChannels = (channels || []).map(c => ({
      id: c.id,
      channelId: c.channel_id,
      channelName: c.channel_name,
      channelHandle: c.channel_handle,
      thumbnailUrl: c.thumbnail_url
    }))

    return NextResponse.json({ channels: formattedChannels })
  } catch (error) {
    console.error('Error in cached YouTube channels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
