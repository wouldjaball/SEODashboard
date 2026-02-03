import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["'']|["'']$/g, '')
})
Object.assign(process.env, envVars)

async function createPortfolioCache() {
  try {
    console.log('Environment variables check:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing')
    console.log('SUPABASE_SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? 'present' : 'missing')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(`Missing required environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseServiceKey}`)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
    
    console.log('Creating portfolio_cache table...')
    
    // Create the table
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS portfolio_cache (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            cache_date DATE NOT NULL,
            companies_data JSONB NOT NULL DEFAULT '[]'::jsonb,
            aggregate_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(user_id, cache_date)
        );
      ` 
    })

    if (tableError) {
      console.error('Table creation error:', tableError)
      throw tableError
    }

    console.log('✅ Table created successfully')

    // Create indexes
    console.log('Creating indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_id ON portfolio_cache(user_id);
        CREATE INDEX IF NOT EXISTS idx_portfolio_cache_date ON portfolio_cache(cache_date);
        CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_date ON portfolio_cache(user_id, cache_date);
      `
    })

    if (indexError) {
      console.error('Index creation error:', indexError)
      throw indexError
    }

    console.log('✅ Indexes created successfully')

    // Enable RLS
    console.log('Enabling RLS...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE portfolio_cache ENABLE ROW LEVEL SECURITY;`
    })

    if (rlsError) {
      console.error('RLS error:', rlsError)
      throw rlsError
    }

    console.log('✅ Portfolio cache table setup complete!')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

createPortfolioCache()