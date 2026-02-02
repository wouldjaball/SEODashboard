#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'

// Use environment variables directly from .env.production
const SUPABASE_URL = 'https://kcdfeeuzpkzpejbyrgej.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZGZlZXV6cGt6cGVqYnlyZ2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3MTA0MywiZXhwIjoyMDgzODQ3MDQzfQ.UDs4GHkemRFMYkRHj7VF7VeBEptNRCPHsZZBo1DjJZw'

async function applyMissingMigration() {
  console.log('=== Applying Missing Migration ===')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    console.log('1. Adding google_identity column...')
    const { error: col1Error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS google_identity TEXT;'
    })
    
    if (col1Error) {
      console.error('Error adding google_identity column:', col1Error)
      return
    }
    console.log('✅ google_identity column added')

    console.log('2. Adding google_identity_name column...')
    const { error: col2Error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS google_identity_name TEXT;'
    })
    
    if (col2Error) {
      console.error('Error adding google_identity_name column:', col2Error)
      return
    }
    console.log('✅ google_identity_name column added')

    console.log('3. Adding youtube_channel_id column...')
    const { error: col3Error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;'
    })
    
    if (col3Error) {
      console.error('Error adding youtube_channel_id column:', col3Error)
      return
    }
    console.log('✅ youtube_channel_id column added')

    console.log('4. Adding youtube_channel_name column...')
    const { error: col4Error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS youtube_channel_name TEXT;'
    })
    
    if (col4Error) {
      console.error('Error adding youtube_channel_name column:', col4Error)
      return
    }
    console.log('✅ youtube_channel_name column added')

    // Skip constraint changes for now to avoid breaking existing data
    console.log('5. Testing new columns...')
    const { data, error: testError } = await supabase
      .from('oauth_tokens')
      .select('google_identity, google_identity_name, youtube_channel_id, youtube_channel_name')
      .limit(1)
    
    if (testError) {
      console.error('Error testing new columns:', testError)
      return
    }
    
    console.log('✅ All new columns are working!')
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

applyMissingMigration()