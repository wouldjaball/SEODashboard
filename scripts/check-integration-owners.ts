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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkBytecurveIntegrations() {
  const companyId = '9320b3f3-20d1-466e-b79e-6ac0acfb30b8' // Bytecurve

  console.log('Checking Bytecurve integration owners and OAuth tokens...\n')

  // Get all users for lookup
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const userMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || [])

  // GA mapping
  const { data: gaMappings } = await supabase
    .from('company_ga_mappings')
    .select('*, ga_properties(*)')
    .eq('company_id', companyId)

  if (gaMappings && gaMappings.length > 0) {
    for (const mapping of gaMappings) {
      const prop = mapping.ga_properties
      console.log('GA Property:', prop.property_name)
      console.log('  Owner User ID:', prop.user_id)
      console.log('  Owner Email:', userMap.get(prop.user_id) || 'Unknown')

      // Check OAuth token
      const { data: token } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('user_id', prop.user_id)
        .eq('provider', 'google')
        .single()

      if (token) {
        const expired = token.expires_at && new Date(token.expires_at) < new Date()
        console.log('  OAuth Token:', expired ? 'EXPIRED!' : 'Valid')
        console.log('  Expires:', token.expires_at)
      } else {
        console.log('  OAuth Token: NOT FOUND!')
      }
      console.log()
    }
  }

  // GSC mapping
  const { data: gscMappings } = await supabase
    .from('company_gsc_mappings')
    .select('*, gsc_sites(*)')
    .eq('company_id', companyId)

  if (gscMappings && gscMappings.length > 0) {
    for (const mapping of gscMappings) {
      const site = mapping.gsc_sites
      console.log('GSC Site:', site.site_url)
      console.log('  Owner User ID:', site.user_id)
      console.log('  Owner Email:', userMap.get(site.user_id) || 'Unknown')
      console.log()
    }
  }

  // YouTube mapping
  const { data: ytMappings } = await supabase
    .from('company_youtube_mappings')
    .select('*, youtube_channels(*)')
    .eq('company_id', companyId)

  if (ytMappings && ytMappings.length > 0) {
    for (const mapping of ytMappings) {
      const ch = mapping.youtube_channels
      console.log('YouTube Channel:', ch.channel_name)
      console.log('  Owner User ID:', ch.user_id)
      console.log('  Owner Email:', userMap.get(ch.user_id) || 'Unknown')

      // Check OAuth token
      const { data: token } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('user_id', ch.user_id)
        .eq('provider', 'google')
        .single()

      if (token) {
        const expired = token.expires_at && new Date(token.expires_at) < new Date()
        console.log('  OAuth Token:', expired ? 'EXPIRED!' : 'Valid')
      } else {
        console.log('  OAuth Token: NOT FOUND!')
      }
      console.log()
    }
  }

  // LinkedIn mapping
  const { data: liMappings } = await supabase
    .from('company_linkedin_mappings')
    .select('*, linkedin_pages(*)')
    .eq('company_id', companyId)

  if (liMappings && liMappings.length > 0) {
    for (const mapping of liMappings) {
      const page = mapping.linkedin_pages
      console.log('LinkedIn Page:', page.page_name)
      console.log('  Owner User ID:', page.user_id)
      console.log('  Owner Email:', userMap.get(page.user_id) || 'Unknown')

      // Check OAuth token
      const { data: token } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('user_id', page.user_id)
        .eq('provider', 'linkedin')
        .single()

      if (token) {
        const expired = token.expires_at && new Date(token.expires_at) < new Date()
        console.log('  OAuth Token:', expired ? 'EXPIRED!' : 'Valid')
      } else {
        console.log('  OAuth Token: NOT FOUND (may use sheets fallback)')
      }
      console.log()
    }
  }

  // Check what the analytics cache contains for Bytecurve
  console.log('Checking analytics cache content...')
  const { data: cache } = await supabase
    .from('analytics_cache')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cache) {
    console.log('Cache found, created:', cache.created_at)
    console.log('Cache expires:', cache.expires_at)
    const data = cache.data
    if (data) {
      console.log('\nCache data keys:', Object.keys(data))
      if (data.ga) console.log('  GA: Has data')
      else console.log('  GA: No data')
      if (data.gsc) console.log('  GSC: Has data')
      else console.log('  GSC: No data')
      if (data.youtube) console.log('  YouTube: Has data')
      else console.log('  YouTube: No data')
      if (data.linkedin) console.log('  LinkedIn: Has data')
      else console.log('  LinkedIn: No data')
    }
  } else {
    console.log('No cache found')
  }
}

checkBytecurveIntegrations().catch(console.error)
