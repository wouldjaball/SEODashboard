import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

// POST /api/integrations/youtube/lookup - Lookup channel details from URL
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract channel ID or handle from various YouTube URL formats
    let channelId: string | null = null
    let channelHandle: string | null = null

    // Try to parse the URL
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Handle different URL formats:
      // https://youtube.com/channel/UCxxxxxxx
      // https://youtube.com/@handle
      // https://youtube.com/c/customname
      // https://youtube.com/user/username
      // https://www.youtube.com/channel/UCxxxxxxx

      if (pathname.startsWith('/channel/')) {
        channelId = pathname.replace('/channel/', '').split('/')[0]
      } else if (pathname.startsWith('/@')) {
        channelHandle = pathname.slice(1) // Keep the @ symbol
      } else if (pathname.startsWith('/c/')) {
        // Custom URL - we'll need to resolve this
        channelHandle = '@' + pathname.replace('/c/', '').split('/')[0]
      } else if (pathname.startsWith('/user/')) {
        // Legacy user URL
        channelHandle = '@' + pathname.replace('/user/', '').split('/')[0]
      }
    } catch {
      // Not a valid URL, check if it's just a channel ID or handle
      if (url.startsWith('UC') && url.length >= 24) {
        channelId = url
      } else if (url.startsWith('@')) {
        channelHandle = url
      }
    }

    if (!channelId && !channelHandle) {
      return NextResponse.json({
        error: 'Could not parse YouTube channel from URL. Please enter the channel ID manually.'
      }, { status: 400 })
    }

    // Use YouTube Data API to get channel details
    // Get a fresh access token (handles refresh if expired)
    const accessToken = await OAuthTokenService.refreshAccessToken(user.id)

    if (!accessToken) {
      // No OAuth token - return what we have
      return NextResponse.json({
        channelId: channelId || '',
        channelHandle: channelHandle || '',
        channelName: '',
        message: 'Please connect Google account for auto-lookup, or enter channel name manually'
      })
    }

    // Try to fetch channel details from YouTube API
    try {
      let apiUrl: string

      if (channelId) {
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}`
      } else if (channelHandle) {
        // For handles, use forHandle parameter (remove @ if present)
        const handle = channelHandle.startsWith('@') ? channelHandle.slice(1) : channelHandle
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${handle}`
      } else {
        throw new Error('No channel identifier')
      }

      console.log('[YouTube Lookup] Fetching:', apiUrl)

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[YouTube Lookup] API error:', response.status, errorText)
        // Return what we have even if API fails
        return NextResponse.json({
          channelId: channelId || '',
          channelHandle: channelHandle || '',
          channelName: '',
          error: `YouTube API error: ${response.status}`
        })
      }

      const data = await response.json()
      console.log('[YouTube Lookup] Response:', JSON.stringify(data))

      if (data.items && data.items.length > 0) {
        const channel = data.items[0]
        return NextResponse.json({
          channelId: channel.id,
          channelName: channel.snippet?.title || '',
          channelHandle: channel.snippet?.customUrl || channelHandle || ''
        })
      } else {
        return NextResponse.json({
          channelId: channelId || '',
          channelHandle: channelHandle || '',
          channelName: '',
          message: 'Channel not found. Please verify the URL and enter details manually.'
        })
      }
    } catch (apiError) {
      console.error('[YouTube Lookup] API error:', apiError)
      // Return partial data
      return NextResponse.json({
        channelId: channelId || '',
        channelHandle: channelHandle || '',
        channelName: '',
        error: 'API request failed'
      })
    }
  } catch (error) {
    console.error('[YouTube Lookup] Error:', error)
    return NextResponse.json({ error: 'Failed to lookup channel' }, { status: 500 })
  }
}
