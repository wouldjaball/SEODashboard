import { createClient, createServiceClient } from '@/lib/supabase/server'
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

export interface LinkedInOAuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope: string
  linkedinOrganizationId?: string
  linkedinOrganizationName?: string
}

export interface GoogleConnection {
  id: string
  googleIdentity: string
  googleIdentityName?: string
  youtubeChannelId?: string
  youtubeChannelName?: string
  createdAt: Date
}

// Structured result type for token refresh operations
export type TokenRefreshResult =
  | { success: true; accessToken: string }
  | { success: false; error: 'NO_TOKENS' | 'REFRESH_FAILED' | 'DECRYPTION_FAILED' | 'DB_ERROR'; details?: string }

export interface LinkedInConnection {
  id: string
  linkedinOrganizationId: string
  linkedinOrganizationName?: string
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

    // First, try the simple approach with just the original columns
    // This ensures it works even if the migration hasn't been run
    const baseData = {
      user_id: userId,
      provider: 'google',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt.toISOString(),
      scope: tokens.scope,
      updated_at: new Date().toISOString()
    }

    console.log('Attempting to save OAuth tokens for user:', userId)

    // Try with old constraint first (guaranteed to exist)
    let { error } = await supabase.from('oauth_tokens').upsert(baseData, {
      onConflict: 'user_id,provider'
    })

    if (error) {
      console.error('Failed to save OAuth tokens with old constraint:', error)

      // Maybe the new constraint exists but old one was dropped - try new constraint
      const googleIdentity = identity?.googleIdentity || 'default'
      const extendedData = {
        ...baseData,
        google_identity: googleIdentity,
        google_identity_name: identity?.googleIdentityName || null,
        youtube_channel_id: identity?.youtubeChannelId || null,
        youtube_channel_name: identity?.youtubeChannelName || null
      }

      const result = await supabase.from('oauth_tokens').upsert(extendedData, {
        onConflict: 'user_id,provider,google_identity'
      })
      error = result.error
    } else {
      console.log('Tokens saved successfully with old constraint')

      // Try to update with identity info if columns exist (non-critical)
      if (identity) {
        try {
          await supabase.from('oauth_tokens')
            .update({
              google_identity: identity.googleIdentity,
              google_identity_name: identity.googleIdentityName || null,
              youtube_channel_id: identity.youtubeChannelId || null,
              youtube_channel_name: identity.youtubeChannelName || null
            })
            .eq('user_id', userId)
            .eq('provider', 'google')
          console.log('Identity info updated successfully')
        } catch (updateError) {
          // Columns don't exist yet - that's fine
          console.log('Could not update identity info (columns may not exist yet)')
        }
      }
      return // Success!
    }

    if (error) {
      console.error('Failed to save OAuth tokens:', error)
      throw new Error(`Failed to save OAuth tokens: ${error.message}`)
    }
  }

  static async getTokens(userId: string, googleIdentity?: string): Promise<OAuthToken | null> {
    const supabase = createServiceClient()

    let query = supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (googleIdentity) {
      query = query.eq('google_identity', googleIdentity)
    }

    // Get the first matching token (or specific identity if provided)
    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
      console.error('[OAuthTokenService] Database error fetching tokens for user:', userId, error)
      return null
    }

    if (!data) {
      console.log('[OAuthTokenService] No tokens found for user:', userId, googleIdentity ? `(identity: ${googleIdentity})` : '')
      return null
    }

    try {
      return {
        accessToken: decryptToken(data.access_token),
        refreshToken: decryptToken(data.refresh_token),
        expiresAt: new Date(data.expires_at),
        scope: data.scope,
        // These fields may not exist in older schemas
        googleIdentity: data.google_identity || undefined,
        googleIdentityName: data.google_identity_name || undefined,
        youtubeChannelId: data.youtube_channel_id || undefined,
        youtubeChannelName: data.youtube_channel_name || undefined
      }
    } catch (error) {
      console.error('Failed to decrypt tokens:', error)
      return null
    }
  }

  // Get token that grants access to a specific YouTube channel
  static async getTokenForYouTubeChannel(userId: string, channelId: string): Promise<OAuthToken | null> {
    const supabase = createServiceClient()

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
    const supabase = createServiceClient()

    // Select only columns that definitely exist, handle new columns gracefully
    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .order('created_at', { ascending: false })

    if (error || !data) return []

    return data.map(row => ({
      id: row.id,
      googleIdentity: row.google_identity || 'Connected Account',
      googleIdentityName: row.google_identity_name || undefined,
      youtubeChannelId: row.youtube_channel_id || undefined,
      youtubeChannelName: row.youtube_channel_name || undefined,
      createdAt: new Date(row.created_at)
    }))
  }

  static async refreshAccessToken(userId: string, googleIdentity?: string): Promise<string | null> {
    const result = await this.refreshAccessTokenWithDetails(userId, googleIdentity)
    return result.success ? result.accessToken : null
  }

  /**
   * Refresh access token with detailed error information.
   * Use this method when you need to know WHY a refresh failed.
   */
  static async refreshAccessTokenWithDetails(userId: string, googleIdentity?: string): Promise<TokenRefreshResult> {
    console.log('[OAuthTokenService] refreshAccessToken called for user:', userId, googleIdentity ? `(identity: ${googleIdentity})` : '')

    const tokens = await this.getTokens(userId, googleIdentity)
    if (!tokens) {
      console.error('[OAuthTokenService] No tokens available for user:', userId)
      return { success: false, error: 'NO_TOKENS', details: 'No OAuth tokens found for this user' }
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date()
    const expiryWithBuffer = new Date(tokens.expiresAt.getTime() - 5 * 60 * 1000)

    if (now < expiryWithBuffer) {
      const minutesUntilExpiry = Math.round((tokens.expiresAt.getTime() - now.getTime()) / (60 * 1000))
      console.log('[OAuthTokenService] Token still valid, expires in', minutesUntilExpiry, 'minutes')
      return { success: true, accessToken: tokens.accessToken }
    }

    // Token is expired, attempt refresh
    console.log('[OAuthTokenService] Token expired, attempting refresh. Expired at:', tokens.expiresAt.toISOString())

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
        const errorText = await response.text()
        console.error('[OAuthTokenService] Token refresh failed with status:', response.status)
        console.error('[OAuthTokenService] Google OAuth error response:', errorText)

        // Parse error for common cases
        let errorDetails = `Google OAuth error (${response.status}): ${errorText}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error === 'invalid_grant') {
            errorDetails = 'Refresh token has been revoked or expired. User needs to re-authenticate.'
          } else if (errorJson.error === 'invalid_client') {
            errorDetails = 'OAuth client credentials are invalid. Check GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.'
          }
        } catch {
          // Keep original error text if not JSON
        }

        return { success: false, error: 'REFRESH_FAILED', details: errorDetails }
      }

      const data = await response.json()
      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000)
      console.log('[OAuthTokenService] Token refresh successful. New expiry:', newExpiresAt.toISOString())

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

      return { success: true, accessToken: data.access_token }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[OAuthTokenService] Token refresh exception:', errorMessage)
      return { success: false, error: 'REFRESH_FAILED', details: `Network or unexpected error: ${errorMessage}` }
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
    const supabase = createServiceClient()

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
    const supabase = createServiceClient()

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

  // ==================== LinkedIn OAuth Methods ====================

  static async saveLinkedInTokens(
    userId: string,
    tokens: {
      access_token: string
      refresh_token?: string
      expires_in: number
      scope?: string
    },
    identity?: {
      linkedinOrganizationId: string
      linkedinOrganizationName?: string
    }
  ): Promise<void> {
    const supabase = await createClient()

    const encryptedAccessToken = encryptToken(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const data = {
      user_id: userId,
      provider: 'linkedin',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken || encryptedAccessToken, // LinkedIn may not provide refresh token
      expires_at: expiresAt.toISOString(),
      scope: tokens.scope || '',
      linkedin_organization_id: identity?.linkedinOrganizationId || null,
      linkedin_organization_name: identity?.linkedinOrganizationName || null,
      updated_at: new Date().toISOString()
    }

    console.log('Attempting to save LinkedIn OAuth tokens for user:', userId)

    // Use upsert with the provider and organization as the conflict key
    const { error } = await supabase.from('oauth_tokens').upsert(data, {
      onConflict: 'user_id,provider,linkedin_organization_id'
    })

    if (error) {
      // Fall back to simpler upsert if the constraint doesn't exist
      const { error: fallbackError } = await supabase.from('oauth_tokens').upsert(data, {
        onConflict: 'user_id,provider'
      })

      if (fallbackError) {
        console.error('Failed to save LinkedIn OAuth tokens:', fallbackError)
        throw new Error(`Failed to save LinkedIn OAuth tokens: ${fallbackError.message}`)
      }
    }

    console.log('LinkedIn tokens saved successfully')
  }

  static async getLinkedInTokens(userId: string, organizationId?: string): Promise<LinkedInOAuthToken | null> {
    const supabase = createServiceClient()

    let query = supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'linkedin')

    if (organizationId) {
      query = query.eq('linkedin_organization_id', organizationId)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error || !data) return null

    try {
      return {
        accessToken: decryptToken(data.access_token),
        refreshToken: data.refresh_token ? decryptToken(data.refresh_token) : undefined,
        expiresAt: new Date(data.expires_at),
        scope: data.scope,
        linkedinOrganizationId: data.linkedin_organization_id || undefined,
        linkedinOrganizationName: data.linkedin_organization_name || undefined
      }
    } catch (error) {
      console.error('Failed to decrypt LinkedIn tokens:', error)
      return null
    }
  }

  static async refreshLinkedInAccessToken(userId: string, organizationId?: string): Promise<string | null> {
    const result = await this.refreshLinkedInAccessTokenWithDetails(userId, organizationId)
    return result.success ? result.accessToken : null
  }

  /**
   * Refresh LinkedIn access token with detailed error information.
   * Use this method when you need to know WHY a LinkedIn refresh failed.
   */
  static async refreshLinkedInAccessTokenWithDetails(userId: string, organizationId?: string): Promise<TokenRefreshResult> {
    console.log('[OAuthTokenService] refreshLinkedInAccessToken called for user:', userId, organizationId ? `(org: ${organizationId})` : '')

    const tokens = await this.getLinkedInTokens(userId, organizationId)
    if (!tokens) {
      console.error('[OAuthTokenService] No LinkedIn tokens available for user:', userId)
      return { success: false, error: 'NO_TOKENS', details: 'No LinkedIn OAuth tokens found for this user' }
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date()
    const expiryWithBuffer = new Date(tokens.expiresAt.getTime() - 5 * 60 * 1000)

    if (now < expiryWithBuffer) {
      console.log('[OAuthTokenService] LinkedIn token still valid for', Math.round((tokens.expiresAt.getTime() - now.getTime()) / (60 * 1000)), 'minutes')
      return { success: true, accessToken: tokens.accessToken }
    }

    console.log('[OAuthTokenService] LinkedIn token expired, attempting refresh...')

    // LinkedIn tokens typically have long expiration (60 days for access, 365 days for refresh)
    // If we have a refresh token, try to refresh
    if (tokens.refreshToken) {
      try {
        const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
            client_id: process.env.LINKEDIN_OAUTH_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_OAUTH_CLIENT_SECRET!
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[OAuthTokenService] LinkedIn token refresh failed:', response.status, errorText)
          
          // Parse error to provide better feedback
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error === 'invalid_grant') {
              console.error('[OAuthTokenService] LinkedIn refresh token is invalid/expired - user needs to re-authenticate')
              return { success: false, error: 'REFRESH_FAILED', details: 'LinkedIn refresh token is invalid or expired. Please reconnect your LinkedIn account.' }
            }
          } catch {
            // Error text is not JSON
          }
          
          return { success: false, error: 'REFRESH_FAILED', details: `LinkedIn token refresh failed: ${errorText}` }
        }

        const data = await response.json()
        console.log('[OAuthTokenService] LinkedIn token refresh successful')

        // Save new tokens
        await this.saveLinkedInTokens(userId, {
          access_token: data.access_token,
          refresh_token: data.refresh_token || tokens.refreshToken,
          expires_in: data.expires_in,
          scope: tokens.scope
        }, tokens.linkedinOrganizationId ? {
          linkedinOrganizationId: tokens.linkedinOrganizationId,
          linkedinOrganizationName: tokens.linkedinOrganizationName
        } : undefined)

        return { success: true, accessToken: data.access_token }
      } catch (error) {
        console.error('[OAuthTokenService] Failed to refresh LinkedIn token:', error)
        return { success: false, error: 'REFRESH_FAILED', details: `Network error during LinkedIn token refresh: ${error}` }
      }
    }

    // No refresh token and token expired - user needs to re-authenticate
    console.log('[OAuthTokenService] LinkedIn token expired and no refresh token available')
    return { success: false, error: 'REFRESH_FAILED', details: 'LinkedIn token expired and no refresh token available. Please reconnect your LinkedIn account.' }
  }

  static async listLinkedInConnections(userId: string): Promise<LinkedInConnection[]> {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'linkedin')
      .order('created_at', { ascending: false })

    if (error || !data) return []

    return data.map(row => ({
      id: row.id,
      linkedinOrganizationId: row.linkedin_organization_id || 'Connected Organization',
      linkedinOrganizationName: row.linkedin_organization_name || undefined,
      createdAt: new Date(row.created_at)
    }))
  }

  static async hasValidLinkedInTokens(userId: string): Promise<boolean> {
    const tokens = await this.getLinkedInTokens(userId)
    return tokens !== null
  }

  static async deleteLinkedInTokens(userId: string): Promise<void> {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'linkedin')

    if (error) {
      throw new Error(`Failed to delete LinkedIn OAuth tokens: ${error.message}`)
    }
  }

  static async deleteLinkedInConnection(userId: string, connectionId: string): Promise<void> {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId)
      .eq('provider', 'linkedin')

    if (error) {
      throw new Error(`Failed to delete LinkedIn connection: ${error.message}`)
    }
  }
}
