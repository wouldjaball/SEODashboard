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

async function diagnoseUser(email: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Diagnosing user: ${email}`)
  console.log('='.repeat(60))

  // 1. Check if user exists in auth.users
  console.log('\n1. Checking auth.users...')
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('Error fetching users:', authError)
    return
  }

  const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.log(`❌ User ${email} NOT FOUND in auth.users`)
    return
  }

  console.log(`✅ User found:`)
  console.log(`   - ID: ${user.id}`)
  console.log(`   - Email: ${user.email}`)
  console.log(`   - Created: ${user.created_at}`)
  console.log(`   - Last Sign In: ${user.last_sign_in_at || 'Never'}`)
  console.log(`   - Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)

  const userId = user.id

  // 2. Check user_companies assignments
  console.log('\n2. Checking user_companies...')
  const { data: userCompanies, error: ucError } = await supabase
    .from('user_companies')
    .select('*, companies(*)')
    .eq('user_id', userId)

  if (ucError) {
    console.error('Error fetching user_companies:', ucError)
  } else if (!userCompanies || userCompanies.length === 0) {
    console.log('❌ User is NOT assigned to any companies!')
    console.log('   This is likely the cause of the issue.')
  } else {
    console.log(`✅ User assigned to ${userCompanies.length} companies:`)
    for (const uc of userCompanies) {
      console.log(`   - ${uc.companies?.name || 'Unknown'} (${uc.company_id}) - Role: ${uc.role}`)
    }
  }

  // 3. Check OAuth tokens
  console.log('\n3. Checking oauth_tokens...')
  const { data: tokens, error: tokensError } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)

  if (tokensError) {
    console.error('Error fetching oauth_tokens:', tokensError)
  } else if (!tokens || tokens.length === 0) {
    console.log('⚠️  User has NO OAuth tokens (no direct integrations)')
    console.log('   This is OK if viewing shared company data.')
  } else {
    console.log(`✅ User has ${tokens.length} OAuth token(s):`)
    for (const token of tokens) {
      const expired = token.expires_at && new Date(token.expires_at) < new Date()
      console.log(`   - Provider: ${token.provider}`)
      console.log(`     Scope: ${token.scope || 'N/A'}`)
      console.log(`     YouTube Channel: ${token.youtube_channel_id || 'N/A'}`)
      console.log(`     Expires: ${token.expires_at} ${expired ? '(EXPIRED!)' : ''}`)
    }
  }

  // 4. Check GA properties owned by user
  console.log('\n4. Checking ga_properties...')
  const { data: gaProps, error: gaError } = await supabase
    .from('ga_properties')
    .select('*')
    .eq('user_id', userId)

  if (gaError) {
    console.error('Error fetching ga_properties:', gaError)
  } else if (!gaProps || gaProps.length === 0) {
    console.log('⚠️  User owns no GA properties')
  } else {
    console.log(`✅ User owns ${gaProps.length} GA propert(ies):`)
    for (const prop of gaProps) {
      console.log(`   - ${prop.property_name} (${prop.property_id})`)
    }
  }

  // 5. Check GSC sites owned by user
  console.log('\n5. Checking gsc_sites...')
  const { data: gscSites, error: gscError } = await supabase
    .from('gsc_sites')
    .select('*')
    .eq('user_id', userId)

  if (gscError) {
    console.error('Error fetching gsc_sites:', gscError)
  } else if (!gscSites || gscSites.length === 0) {
    console.log('⚠️  User owns no GSC sites')
  } else {
    console.log(`✅ User owns ${gscSites.length} GSC site(s):`)
    for (const site of gscSites) {
      console.log(`   - ${site.site_url}`)
    }
  }

  // 6. Check YouTube channels owned by user
  console.log('\n6. Checking youtube_channels...')
  const { data: ytChannels, error: ytError } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('user_id', userId)

  if (ytError) {
    console.error('Error fetching youtube_channels:', ytError)
  } else if (!ytChannels || ytChannels.length === 0) {
    console.log('⚠️  User owns no YouTube channels')
  } else {
    console.log(`✅ User owns ${ytChannels.length} YouTube channel(s):`)
    for (const ch of ytChannels) {
      console.log(`   - ${ch.channel_name} (${ch.channel_id})`)
    }
  }

  // 7. Check LinkedIn pages owned by user
  console.log('\n7. Checking linkedin_pages...')
  const { data: liPages, error: liError } = await supabase
    .from('linkedin_pages')
    .select('*')
    .eq('user_id', userId)

  if (liError) {
    console.error('Error fetching linkedin_pages:', liError)
  } else if (!liPages || liPages.length === 0) {
    console.log('⚠️  User owns no LinkedIn pages')
  } else {
    console.log(`✅ User owns ${liPages.length} LinkedIn page(s):`)
    for (const page of liPages) {
      console.log(`   - ${page.page_name} (${page.page_id})`)
    }
  }

  // 8. Check company integration mappings for user's companies
  if (userCompanies && userCompanies.length > 0) {
    console.log('\n8. Checking company integration mappings...')

    for (const uc of userCompanies) {
      console.log(`\n   Company: ${uc.companies?.name || uc.company_id}`)

      // GA mappings
      const { data: gaMappings } = await supabase
        .from('company_ga_mappings')
        .select('*, ga_properties(*)')
        .eq('company_id', uc.company_id)

      if (gaMappings && gaMappings.length > 0) {
        console.log(`   ✅ GA: ${gaMappings.map(m => m.ga_properties?.property_name || m.ga_property_id).join(', ')}`)
      } else {
        console.log('   ❌ GA: No mappings')
      }

      // GSC mappings
      const { data: gscMappings } = await supabase
        .from('company_gsc_mappings')
        .select('*, gsc_sites(*)')
        .eq('company_id', uc.company_id)

      if (gscMappings && gscMappings.length > 0) {
        console.log(`   ✅ GSC: ${gscMappings.map(m => m.gsc_sites?.site_url || m.gsc_site_id).join(', ')}`)
      } else {
        console.log('   ❌ GSC: No mappings')
      }

      // YouTube mappings
      const { data: ytMappings } = await supabase
        .from('company_youtube_mappings')
        .select('*, youtube_channels(*)')
        .eq('company_id', uc.company_id)

      if (ytMappings && ytMappings.length > 0) {
        console.log(`   ✅ YouTube: ${ytMappings.map(m => m.youtube_channels?.channel_name || m.youtube_channel_id).join(', ')}`)
      } else {
        console.log('   ❌ YouTube: No mappings')
      }

      // LinkedIn mappings
      const { data: liMappings } = await supabase
        .from('company_linkedin_mappings')
        .select('*, linkedin_pages(*)')
        .eq('company_id', uc.company_id)

      if (liMappings && liMappings.length > 0) {
        console.log(`   ✅ LinkedIn: ${liMappings.map(m => m.linkedin_pages?.page_name || m.linkedin_page_id).join(', ')}`)
      } else {
        console.log('   ❌ LinkedIn: No mappings')
      }
    }
  }

  // 9. Check analytics cache
  console.log('\n9. Checking analytics_cache...')
  if (userCompanies && userCompanies.length > 0) {
    for (const uc of userCompanies) {
      const { data: cache } = await supabase
        .from('analytics_cache')
        .select('company_id, created_at, expires_at')
        .eq('company_id', uc.company_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (cache && cache.length > 0) {
        const expired = new Date(cache[0].expires_at) < new Date()
        console.log(`   ${uc.companies?.name}: Last cached ${cache[0].created_at} ${expired ? '(EXPIRED)' : '(valid)'}`)
      } else {
        console.log(`   ${uc.companies?.name}: No cache`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Diagnosis complete')
  console.log('='.repeat(60))
}

// Get email from command line
const email = process.argv[2] || 'Englert.aaron@gmail.com'
diagnoseUser(email).catch(console.error)
