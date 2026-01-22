import { createClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/utils/token-encryption'

export interface OAuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string
}

export class OAuthTokenService {
  static async saveTokens(
    userId: string,
    tokens: {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
    }
  ): Promise<void> {
    const supabase = await createClient()

    const encryptedAccessToken = encryptToken(tokens.access_token)
    const encryptedRefreshToken = encryptToken(tokens.refresh_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const { error } = await supabase.from('oauth_tokens').upsert({
      user_id: userId,
      provider: 'google',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt.toISOString(),
      scope: tokens.scope,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,provider'
    })

    if (error) {
      throw new Error(`Failed to save OAuth tokens: ${error.message}`)
    }
  }

  static async getTokens(userId: string): Promise<OAuthToken | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    if (error || !data) return null

    try {
      return {
        accessToken: decryptToken(data.access_token),
        refreshToken: decryptToken(data.refresh_token),
        expiresAt: new Date(data.expires_at),
        scope: data.scope
      }
    } catch (error) {
      console.error('Failed to decrypt tokens:', error)
      return null
    }
  }

  static async refreshAccessToken(userId: string): Promise<string | null> {
    const tokens = await this.getTokens(userId)
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

      // Save new tokens
      await this.saveTokens(userId, {
        access_token: data.access_token,
        refresh_token: tokens.refreshToken, // Keep existing refresh token
        expires_in: data.expires_in,
        scope: tokens.scope
      })

      return data.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      return null
    }
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
}
