#!/usr/bin/env npx tsx

// Direct approach using node-postgres
import { Pool } from 'pg'

async function applyMigrationDirectly() {
  console.log('=== Applying Migration with Direct SQL ===')
  
  const pool = new Pool({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.kcdfeeuzpkzpejbyrgej',
    password: 'Bytecurve90!',
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    const client = await pool.connect()
    
    console.log('Connected to database successfully')
    
    // Apply the migration step by step
    const migrations = [
      'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS google_identity TEXT;',
      'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS google_identity_name TEXT;', 
      'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;',
      'ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS youtube_channel_name TEXT;'
    ]
    
    for (const [index, sql] of migrations.entries()) {
      console.log(`${index + 1}. Executing: ${sql}`)
      
      try {
        await client.query(sql)
        console.log(`✅ Success`)
      } catch (error) {
        console.error(`❌ Error:`, error)
      }
    }
    
    // Test the new columns
    console.log('5. Testing new columns...')
    const result = await client.query(`
      SELECT google_identity, google_identity_name, youtube_channel_id, youtube_channel_name 
      FROM oauth_tokens 
      LIMIT 1
    `)
    
    console.log('✅ All columns are working!')
    console.log('Migration completed successfully!')
    
    client.release()
    
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await pool.end()
  }
}

applyMigrationDirectly()