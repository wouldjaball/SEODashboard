import { createClient, createServiceClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

// Parse OAuth state parameter
interface OAuthState {
  companyId?: string
  companyName?: string
  returnTo?: string
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')

  // Parse state parameter if present
  let oauthState: OAuthState = {}
  if (stateParam) {
    try {
      oauthState = JSON.parse(stateParam)
      console.log('OAuth state:', oauthState)
    } catch (e) {
      console.log('Could not parse OAuth state:', stateParam)
    }
  }

  if (!code) {
    const returnUrl = oauthState.returnTo || '/integrations'
    return NextResponse.redirect(`${origin}${returnUrl}?error=no_code`)
  }

  try {
    console.log('OAuth callback - exchanging code for tokens')

    // Exchange code for tokens (includes analytics scopes)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`Failed to exchange code for tokens: ${errorText}`)
    }

    const tokens = await tokenResponse.json()
    console.log('Tokens received successfully')

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('No user found in session')
      return NextResponse.redirect(`${origin}/auth/login`)
    }

    console.log('Saving tokens for user:', user.id)

    // Fetch the authenticated Google identity info
    let identityInfo: {
      googleIdentity: string
      googleIdentityName?: string
      youtubeChannelId?: string
      youtubeChannelName?: string
    } | undefined

    try {
      // Get user info to identify which Google account/Brand Account was selected
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      })

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        console.log('Google identity:', userInfo.email, userInfo.name)

        identityInfo = {
          googleIdentity: userInfo.email || userInfo.id,
          googleIdentityName: userInfo.name
        }

        // Fetch YouTube channels owned by this identity
        // This tells us which channel this token grants analytics access to
        const channelsResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { 'Authorization': `Bearer ${tokens.access_token}` } }
        )

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json()
          console.log('YouTube channels for this identity:', channelsData.items?.length || 0)

          if (channelsData.items && channelsData.items.length > 0) {
            // Store the primary channel owned by this identity
            const primaryChannel = channelsData.items[0]
            identityInfo.youtubeChannelId = primaryChannel.id
            identityInfo.youtubeChannelName = primaryChannel.snippet?.title

            console.log('Primary YouTube channel:', primaryChannel.id, primaryChannel.snippet?.title)
          }
        }
      }
    } catch (identityError) {
      console.error('Failed to fetch identity info:', identityError)
      // Continue without identity info - tokens will still be saved
    }

    // Save encrypted tokens with identity information
    await OAuthTokenService.saveTokens(user.id, tokens, identityInfo)

    console.log('Tokens saved successfully with identity:', identityInfo?.googleIdentity)

    // If we have a target company and a YouTube channel, auto-add and map it
    let channelMapped = false
    if (oauthState.companyId && identityInfo?.youtubeChannelId && identityInfo?.youtubeChannelName) {
      try {
        console.log(`Auto-mapping YouTube channel ${identityInfo.youtubeChannelId} to company ${oauthState.companyId}`)

        // Use service client to bypass RLS for this operation
        const serviceClient = createServiceClient()

        // Check if this channel already exists for this user
        const { data: existingChannel } = await serviceClient
          .from('youtube_channels')
          .select('id')
          .eq('user_id', user.id)
          .eq('channel_id', identityInfo.youtubeChannelId)
          .maybeSingle()

        let channelDbId: string

        if (existingChannel) {
          channelDbId = existingChannel.id
          console.log('Channel already exists in database:', channelDbId)
        } else {
          // Insert the channel
          const { data: newChannel, error: channelError } = await serviceClient
            .from('youtube_channels')
            .insert({
              user_id: user.id,
              channel_id: identityInfo.youtubeChannelId,
              channel_name: identityInfo.youtubeChannelName,
              is_active: true
            })
            .select('id')
            .single()

          if (channelError) {
            console.error('Failed to insert YouTube channel:', channelError)
            throw channelError
          }

          channelDbId = newChannel.id
          console.log('Created new YouTube channel:', channelDbId)
        }

        // Delete any existing mapping for this company
        await serviceClient
          .from('company_youtube_mappings')
          .delete()
          .eq('company_id', oauthState.companyId)

        // Create the mapping
        const { error: mappingError } = await serviceClient
          .from('company_youtube_mappings')
          .insert({
            company_id: oauthState.companyId,
            youtube_channel_id: channelDbId
          })

        if (mappingError) {
          console.error('Failed to create YouTube mapping:', mappingError)
          throw mappingError
        }

        console.log(`Successfully mapped channel ${channelDbId} to company ${oauthState.companyId}`)
        channelMapped = true
      } catch (mappingError) {
        console.error('Failed to auto-map YouTube channel:', mappingError)
        // Continue anyway - tokens are saved
      }
    }

    // Determine redirect URL
    const returnUrl = oauthState.returnTo || '/integrations'
    const successParams = new URLSearchParams({ success: 'true' })

    if (identityInfo?.youtubeChannelName) {
      successParams.set('channel', identityInfo.youtubeChannelName)
    }
    if (channelMapped && oauthState.companyName) {
      successParams.set('mapped', 'true')
      successParams.set('company', oauthState.companyName)
    }

    return NextResponse.redirect(`${origin}${returnUrl}?${successParams}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    const returnUrl = oauthState.returnTo || '/integrations'
    return NextResponse.redirect(`${origin}${returnUrl}?error=token_exchange`)
  }
}
