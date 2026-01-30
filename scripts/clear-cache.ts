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

async function clearCache(companyId?: string) {
  console.log('Clearing analytics cache...')

  let query = supabase.from('analytics_cache').delete()

  if (companyId) {
    query = query.eq('company_id', companyId)
    console.log(`Deleting cache for company: ${companyId}`)
  } else {
    // Delete all cache entries that have errors
    query = query.neq('company_id', '00000000-0000-0000-0000-000000000000') // Just to delete all
    console.log('Deleting all cache entries')
  }

  const { error, count } = await query

  if (error) {
    console.error('Error clearing cache:', error)
    return
  }

  console.log('Cache cleared successfully')

  // Verify cache is empty
  const { data: remaining } = await supabase
    .from('analytics_cache')
    .select('company_id')

  console.log(`Remaining cache entries: ${remaining?.length || 0}`)
}

// Clear cache for Bytecurve or all if no arg
const companyId = process.argv[2] // Optional: specific company ID
clearCache(companyId).catch(console.error)
