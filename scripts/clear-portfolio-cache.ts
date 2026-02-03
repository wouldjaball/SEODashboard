import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function clearPortfolioCache(userId?: string) {
  console.log('Clearing portfolio cache...')

  let query = supabase.from('portfolio_cache').delete()

  if (userId) {
    query = query.eq('user_id', userId)
    console.log(`Deleting portfolio cache for user: ${userId}`)
  } else {
    // Delete all cache entries 
    query = query.neq('user_id', '00000000-0000-0000-0000-000000000000') // Just to delete all
    console.log('Deleting all portfolio cache entries')
  }

  const { error, count } = await query

  if (error) {
    console.error('Error clearing portfolio cache:', error)
    return
  }

  console.log('Portfolio cache cleared successfully')

  // Verify cache is empty
  const { data: remaining } = await supabase
    .from('portfolio_cache')
    .select('user_id, cache_date')

  console.log(`Remaining portfolio cache entries: ${remaining?.length || 0}`)
  if (remaining?.length) {
    console.log('Remaining entries:', remaining)
  }
}

// Clear portfolio cache for specific user or all if no arg
const userId = process.argv[2] // Optional: specific user ID
clearPortfolioCache(userId).catch(console.error)