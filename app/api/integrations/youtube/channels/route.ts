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
      console.log('[YouTube Channels] Fetching YouTube channels from API for user:', user.id)

      try {
        const channels = await YouTubeAnalyticsService.fetchChannels(user.id)
        console.log(`[YouTube Channels] Found ${channels.length} YouTube channels`)

        if (channels.length === 0) {
          console.log('[YouTube Channels] No channels returned from API - this might indicate:')
          console.log('[YouTube Channels] 1. User has no YouTube channels')
          console.log('[YouTube Channels] 2. User channels are Brand Accounts not returned by mine=true')
          console.log('[YouTube Channels] 3. OAuth scope insufficient for channel access')
          console.log('[YouTube Channels] 4. Token belongs to different Google identity')
        }

        // Store in database
        for (const channel of channels) {
          console.log(`[YouTube Channels] Storing channel: ${channel.channelName} (${channel.channelId})`)
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
            console.error('[YouTube Channels] Error upserting YouTube channel:', upsertError)
          } else {
            console.log(`[YouTube Channels] Successfully stored channel: ${channel.channelId}`)
          }
        }

        // Note: We no longer mark channels as inactive during refresh
        // This preserves manually-added Brand Account channels that won't
        // appear in the mine=true API response. Channels are only removed
        // when explicitly deleted by the user.
      } catch (apiError: unknown) {
        const err = apiError as Error | undefined
        console.error('[YouTube Channels] YouTube API error:', err?.message)
        console.error('[YouTube Channels] Full error details:', err)
        
        // Check for common error types
        if (err?.message?.includes('403')) {
          console.error('[YouTube Channels] 403 Forbidden - possible causes:')
          console.error('[YouTube Channels] - YouTube Data API not enabled')
          console.error('[YouTube Channels] - Insufficient OAuth scope')
          console.error('[YouTube Channels] - Daily quota exceeded')
        }
        
        if (err?.message?.includes('401')) {
          console.error('[YouTube Channels] 401 Unauthorized - token may be expired or invalid')
        }
        
        // Return cached data if API fails but don't throw error
        console.log('[YouTube Channels] Continuing with cached data due to API failure')
      }
    }

    // Check if user is an admin (owner or admin role in any company)
    const { data: userRole } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .single()

    const isAdmin = !!userRole

    // Return cached channels from database
    // Admins can see all channels; regular users only see their own
    let query = supabase
      .from('youtube_channels')
      .select('id, channel_id, channel_name, channel_handle, thumbnail_url, created_at')
      .eq('is_active', true)
      .order('channel_name')

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data: channels, error } = await query

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

    console.log(`[YouTube Channels] Returning ${formattedChannels.length} channels to frontend`)
    return NextResponse.json({ channels: formattedChannels })
  } catch (error: any) {
    console.error('[YouTube Channels] Unexpected error fetching channels:', error.message || error)
    console.error('[YouTube Channels] Full error details:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch channels', 
      details: error.message || 'An unexpected error occurred while fetching YouTube channels',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
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
