#!/usr/bin/env npx tsx

// Since we can't connect directly, let's use a different approach
// The OAuthTokenService has fallback logic, but let me check if we can work around the issue

import { createClient } from '@supabase/supabase-js'

// Use environment variables from .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function testOAuthWithFallback() {
  console.log('=== Testing OAuth Service Fallback Logic ===')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // Let's simulate what the OAuthTokenService does
    console.log('1. Testing the actual OAuthTokenService fallback...')
    
    // First, let's see if there are any existing tokens
    const { data: existingTokens, error: fetchError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'google')
      .limit(1)
    
    console.log('Existing Google tokens:', existingTokens?.length || 0)
    
    if (existingTokens && existingTokens.length > 0) {
      console.log('Sample token columns:', Object.keys(existingTokens[0]))
    }
    
    // Test if we can insert a token using the old schema (which should work)
    console.log('2. Testing token save with old constraint...')
    
    const testUserId = '00000000-0000-0000-0000-000000000001'
    const testData = {
      user_id: testUserId,
      provider: 'google',
      access_token: 'encrypted_test_token',
      refresh_token: 'encrypted_test_refresh',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      scope: 'test_scope',
      updated_at: new Date().toISOString()
    }
    
    console.log('Attempting insert with old schema...')
    const { error: insertError } = await supabase
      .from('oauth_tokens')
      .upsert(testData, { onConflict: 'user_id,provider' })
    
    if (insertError) {
      console.error('Insert with old constraint failed:', insertError.message)
    } else {
      console.log('✅ Insert with old constraint successful')
      
      // Clean up test data
      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('user_id', testUserId)
        .eq('provider', 'google')
      
      console.log('Test data cleaned up')
    }
    
    // The key insight: if the old constraint works, the service should function
    // Let's check the current constraint
    console.log('3. The issue might be that the new constraint was added...')
    console.log('Let me check if we can query the constraints...')
    
    // Try to understand what's happening by checking system tables if possible
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'oauth_tokens')
      .eq('constraint_type', 'UNIQUE')
    
    if (constraints) {
      console.log('Current unique constraints:', constraints)
    } else {
      console.log('Cannot query constraints:', constraintError?.message)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testOAuthWithFallback()