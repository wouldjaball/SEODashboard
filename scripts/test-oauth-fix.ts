#!/usr/bin/env npx tsx

// Verify environment variables are loaded from .env.local
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure .env.local is properly configured')
  process.exit(1)
}

import { OAuthTokenService } from '../lib/services/oauth-token-service'

async function testOAuthFix() {
  console.log('=== Testing OAuth Service Fix ===')
  
  try {
    // Test 1: Try to get tokens for a user (should handle missing google_identity column)
    console.log('1. Testing getTokens with missing google_identity column...')
    const tokens = await OAuthTokenService.getTokens('test-user-id')
    console.log('✅ getTokens completed without error')
    
    // Test 2: Try to save tokens (should use fallback logic)
    console.log('2. Testing saveTokens with fallback logic...')
    
    const testTokens = {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      expires_in: 3600,
      scope: 'test_scope'
    }
    
    // This should fail gracefully and show our improved error handling
    try {
      await OAuthTokenService.saveTokens('test-user-id-oauth-fix', testTokens)
      console.log('✅ saveTokens completed without error')
    } catch (error) {
      console.log('⚠️ saveTokens failed as expected for test user:', error instanceof Error ? error.message : String(error))
    }
    
    console.log('OAuth service fix testing completed!')
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testOAuthFix()