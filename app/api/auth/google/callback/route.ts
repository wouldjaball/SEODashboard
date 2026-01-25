import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/integrations?error=no_code`)
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

    // Redirect to integrations page with success
    const successParams = new URLSearchParams({ success: 'true' })
    if (identityInfo?.youtubeChannelName) {
      successParams.set('channel', identityInfo.youtubeChannelName)
    }
    return NextResponse.redirect(`${origin}/integrations?${successParams}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`${origin}/integrations?error=token_exchange`)
  }
}
