import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as crypto from 'crypto'

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY
const googleClientId = envVars.GOOGLE_OAUTH_CLIENT_ID
const googleClientSecret = envVars.GOOGLE_OAUTH_CLIENT_SECRET
const encryptionKey = envVars.OAUTH_ENCRYPTION_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Token encryption constants (from token-encryption.ts)
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

function getKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha512')
}

function decryptToken(encryptedText: string): string {
  const data = Buffer.from(encryptedText, 'base64')

  const salt = data.subarray(0, SALT_LENGTH)
  const iv = data.subarray(SALT_LENGTH, TAG_POSITION)
  const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = data.subarray(ENCRYPTED_POSITION)

  const key = getKey(salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted) + decipher.final('utf8')
}

function encryptToken(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getKey(salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ])

  const tag = cipher.getAuthTag()

  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
}

async function refreshGoogleTokens(userId: string) {
  console.log(`Attempting to refresh Google OAuth tokens for user: ${userId}`)

  // Get current tokens
  const { data: tokenData, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single()

  if (error || !tokenData) {
    console.error('Error fetching tokens:', error)
    return
  }

  console.log('Token found, expires:', tokenData.expires_at)

  // Decrypt refresh token
  let refreshToken: string
  try {
    refreshToken = decryptToken(tokenData.refresh_token)
    console.log('Refresh token decrypted successfully')
  } catch (err) {
    console.error('Failed to decrypt refresh token:', err)
    return
  }

  // Call Google token refresh endpoint
  console.log('\nRefreshing token with Google...')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  const responseText = await response.text()

  if (!response.ok) {
    console.error('Token refresh FAILED!')
    console.error('Status:', response.status)
    console.error('Response:', responseText)
    return
  }

  const data = JSON.parse(responseText)
  console.log('Token refresh SUCCESS!')
  console.log('New token expires in:', data.expires_in, 'seconds')

  // Save new tokens
  const encryptedAccessToken = encryptToken(data.access_token)
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  const { error: updateError } = await supabase
    .from('oauth_tokens')
    .update({
      access_token: encryptedAccessToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', 'google')

  if (updateError) {
    console.error('Failed to save new tokens:', updateError)
    return
  }

  console.log('New tokens saved! Expires at:', expiresAt.toISOString())
}

// Integration owner user ID for Bytecurve
const integrationOwnerId = '27272fcd-cba7-442f-9e6f-58244228a0d4'
refreshGoogleTokens(integrationOwnerId).catch(console.error)
