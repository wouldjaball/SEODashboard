#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'

// Use environment variables from .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

async function testOAuthSchema() {
  console.log('=== Testing OAuth Schema ===')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // First, let's check what columns exist in the oauth_tokens table
    console.log('1. Checking oauth_tokens table schema...')
    
    const { data: schema, error: schemaError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .limit(1)
    
    if (schemaError) {
      console.error('Error fetching schema:', schemaError)
      return
    }
    
    console.log('Schema check successful. Table exists.')
    
    // Check if google_identity column exists by trying to query it
    console.log('2. Testing google_identity column existence...')
    
    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('google_identity')
      .limit(1)
    
    if (error) {
      console.error('Error: google_identity column does not exist:', error.message)
      
      // Let's check what columns do exist
      console.log('3. Getting actual table structure...')
      let tableInfo = null
      try {
        const { data } = await supabase.rpc('get_table_columns', { table_name: 'oauth_tokens' })
        tableInfo = data
      } catch (tableError) {
        console.log('Could not get table info via RPC')
      }
      
      if (tableInfo) {
        console.log('Existing columns:', tableInfo)
      } else {
        // Alternative approach - try to insert with old schema
        console.log('4. Testing insert with basic schema...')
        const testData = {
          user_id: '00000000-0000-0000-0000-000000000000',
          provider: 'test',
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          expires_at: new Date().toISOString(),
          scope: 'test_scope'
        }
        
        const { error: insertError } = await supabase
          .from('oauth_tokens')
          .insert(testData)
          .single()
        
        if (insertError) {
          console.log('Insert test failed:', insertError.message)
        } else {
          console.log('Basic insert successful - cleaning up...')
          // Clean up test data
          await supabase
            .from('oauth_tokens')
            .delete()
            .eq('user_id', testData.user_id)
            .eq('provider', 'test')
        }
      }
    } else {
      console.log('✅ google_identity column exists!')
      
      // Test other new columns
      const columnsToTest = ['google_identity_name', 'youtube_channel_id', 'youtube_channel_name']
      for (const col of columnsToTest) {
        const { error: colError } = await supabase
          .from('oauth_tokens')
          .select(col)
          .limit(1)
        
        if (colError) {
          console.error(`❌ Column ${col} missing:`, colError.message)
        } else {
          console.log(`✅ Column ${col} exists`)
        }
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testOAuthSchema()