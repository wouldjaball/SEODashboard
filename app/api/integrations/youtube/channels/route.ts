import { createClient } from '@/lib/supabase/server'
import { YouTubeAnalyticsService } from '@/lib/services/youtube-analytics-service'
import { NextResponse } from 'next/server'

// GET /api/integrations/youtube/channels?refresh=true - Fetch from YouTube API
// GET /api/integrations/youtube/channels - Return cached from database
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'

    if (refresh) {
      // Fetch channels from YouTube Data API
      console.log('Fetching YouTube channels from API for user:', user.id)

      try {
        const channels = await YouTubeAnalyticsService.fetchChannels(user.id)
        console.log(`Found ${channels.length} YouTube channels`)

        // Store in database
        for (const channel of channels) {
          const { error: upsertError } = await supabase
            .from('youtube_channels')
            .upsert({
              user_id: user.id,
              channel_id: channel.channelId,
              channel_name: channel.channelName,
              channel_handle: channel.channelHandle,
              thumbnail_url: channel.thumbnailUrl,
              is_active: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,channel_id'
            })

          if (upsertError) {
            console.error('Error upserting YouTube channel:', upsertError)
          }
        }

        // Mark channels not in the list as inactive
        if (channels.length > 0) {
          const channelIds = channels.map(c => c.channelId)
          await supabase
            .from('youtube_channels')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .not('channel_id', 'in', `(${channelIds.join(',')})`)
        }
      } catch (apiError: any) {
        console.error('YouTube API error:', apiError.message)
        // Return cached data if API fails
      }
    }

    // Return cached channels from database
    const { data: channels, error } = await supabase
      .from('youtube_channels')
      .select('id, channel_id, channel_name, channel_handle, thumbnail_url, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('channel_name')

    if (error) {
      throw error
    }

    // Transform to consistent format
    const formattedChannels = (channels || []).map(c => ({
      id: c.id,
      channelId: c.channel_id,
      channelName: c.channel_name,
      channelHandle: c.channel_handle,
      thumbnailUrl: c.thumbnail_url
    }))

    return NextResponse.json({ channels: formattedChannels })
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
