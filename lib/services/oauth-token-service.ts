import { createClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/utils/token-encryption'

export interface OAuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string
  googleIdentity?: string
  googleIdentityName?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
}

export interface GoogleConnection {
  id: string
  googleIdentity: string
  googleIdentityName?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
  createdAt: Date
}

export class OAuthTokenService {
  static async saveTokens(
    userId: string,
    tokens: {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
    },
    identity?: {
      googleIdentity: string
      googleIdentityName?: string
      youtubeChannelId?: string
      youtubeChannelName?: string
    }
  ): Promise<void> {
    const supabase = await createClient()

    const encryptedAccessToken = encryptToken(tokens.access_token)
    const encryptedRefreshToken = encryptToken(tokens.refresh_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Use google_identity for the unique constraint if provided
    const googleIdentity = identity?.googleIdentity || 'default'

    const { error } = await supabase.from('oauth_tokens').upsert({
      user_id: userId,
      provider: 'google',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt.toISOString(),
      scope: tokens.scope,
      google_identity: googleIdentity,
      google_identity_name: identity?.googleIdentityName || null,
      youtube_channel_id: identity?.youtubeChannelId || null,
      youtube_channel_name: identity?.youtubeChannelName || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,provider,google_identity'
    })

    if (error) {
      throw new Error(`Failed to save OAuth tokens: ${error.message}`)
    }
  }

  static async getTokens(userId: string, googleIdentity?: string): Promise<OAuthToken | null> {
    const supabase = await createClient()

    let query = supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (googleIdentity) {
      query = query.eq('google_identity', googleIdentity)
    }

    // Get the first matching token (or specific identity if provided)
    const { data, error } = await query.limit(1).single()

    if (error || !data) return null

    try {
      return {
        accessToken: decryptToken(data.access_token),
        refreshToken: decryptToken(data.refresh_token),
        expiresAt: new Date(data.expires_at),
        scope: data.scope,
        googleIdentity: data.google_identity,
        googleIdentityName: data.google_identity_name,
        youtubeChannelId: data.youtube_channel_id,
        youtubeChannelName: data.youtube_channel_name
      }
    } catch (error) {
      console.error('Failed to decrypt tokens:', error)
      return null
    }
  }

  // Get token that grants access to a specific YouTube channel
  static async getTokenForYouTubeChannel(userId: string, channelId: string): Promise<OAuthToken | null> {
    const supabase = await createClient()

    // First try to find a token specifically linked to this channel
    const { data: specificToken } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('youtube_channel_id', channelId)
      .limit(1)
      .single()

    if (specificToken) {
      try {
        return {
          accessToken: decryptToken(specificToken.access_token),
          refreshToken: decryptToken(specificToken.refresh_token),
          expiresAt: new Date(specificToken.expires_at),
          scope: specificToken.scope,
          googleIdentity: specificToken.google_identity,
          googleIdentityName: specificToken.google_identity_name,
          youtubeChannelId: specificToken.youtube_channel_id,
          youtubeChannelName: specificToken.youtube_channel_name
        }
      } catch (error) {
        console.error('Failed to decrypt channel-specific token:', error)
      }
    }

    // Fall back to any available token for this user
    return this.getTokens(userId)
  }

  // List all Google connections for a user
  static async listConnections(userId: string): Promise<GoogleConnection[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('id, google_identity, google_identity_name, youtube_channel_id, youtube_channel_name, created_at')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .order('created_at', { ascending: false })

    if (error || !data) return []

    return data.map(row => ({
      id: row.id,
      googleIdentity: row.google_identity || 'default',
      googleIdentityName: row.google_identity_name,
      youtubeChannelId: row.youtube_channel_id,
      youtubeChannelName: row.youtube_channel_name,
      createdAt: new Date(row.created_at)
    }))
  }

  static async refreshAccessToken(userId: string, googleIdentity?: string): Promise<string | null> {
    const tokens = await this.getTokens(userId, googleIdentity)
    if (!tokens) return null

    // Check if token is expired (with 5 minute buffer)
    const now = new Date()
    const expiryWithBuffer = new Date(tokens.expiresAt.getTime() - 5 * 60 * 1000)

    if (now < expiryWithBuffer) {
      return tokens.accessToken
    }

    // Refresh the token
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
          refresh_token: tokens.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text())
        return null
      }

      const data = await response.json()

      // Save new tokens, preserving identity info
      await this.saveTokens(userId, {
        access_token: data.access_token,
        refresh_token: tokens.refreshToken, // Keep existing refresh token
        expires_in: data.expires_in,
        scope: tokens.scope
      }, tokens.googleIdentity ? {
        googleIdentity: tokens.googleIdentity,
        googleIdentityName: tokens.googleIdentityName,
        youtubeChannelId: tokens.youtubeChannelId,
        youtubeChannelName: tokens.youtubeChannelName
      } : undefined)

      return data.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      return null
    }
  }

  // Get a fresh access token for a specific YouTube channel
  static async refreshAccessTokenForChannel(userId: string, channelId: string): Promise<string | null> {
    const tokens = await this.getTokenForYouTubeChannel(userId, channelId)
    if (!tokens) return null

    // Use the identity from the channel-specific token
    return this.refreshAccessToken(userId, tokens.googleIdentity)
  }

  static async hasValidTokens(userId: string): Promise<boolean> {
    const tokens = await this.getTokens(userId)
    return tokens !== null
  }

  static async deleteTokens(userId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (error) {
      throw new Error(`Failed to delete OAuth tokens: ${error.message}`)
    }
  }

  // Delete a specific Google connection by its ID
  static async deleteConnection(userId: string, connectionId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (error) {
      throw new Error(`Failed to delete connection: ${error.message}`)
    }
  }

  // Check if user has any valid Google connections
  static async hasAnyValidTokens(userId: string): Promise<boolean> {
    const connections = await this.listConnections(userId)
    return connections.length > 0
  }
}
