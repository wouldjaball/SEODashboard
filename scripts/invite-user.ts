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

// Characters that look similar and can cause confusion - excluded
const ALPHANUMERIC_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generateTempPassword(length: number = 12): string {
  let password = ''
  const charsLength = ALPHANUMERIC_CHARS.length
  for (let i = 0; i < length; i++) {
    password += ALPHANUMERIC_CHARS[Math.floor(Math.random() * charsLength)]
  }
  return password
}

async function inviteUser(email: string, role: string) {
  console.log(`\nInviting ${email} as ${role}...`)

  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')

  if (companiesError) {
    console.error('Error fetching companies:', companiesError)
    return
  }

  console.log(`Found ${companies?.length || 0} companies:`)
  companies?.forEach(c => console.log(`  - ${c.name} (${c.id})`))

  if (!companies || companies.length === 0) {
    console.error('No companies found')
    return
  }

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existingUser) {
    console.log(`\nUser ${email} already exists with ID: ${existingUser.id}`)

    // Check their current company assignments
    const { data: assignments } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', existingUser.id)

    console.log('Current assignments:', assignments)

    // Add to any companies they're not in
    for (const company of companies) {
      const existing = assignments?.find(a => a.company_id === company.id)
      if (!existing) {
        const { error } = await supabase
          .from('user_companies')
          .insert({ user_id: existingUser.id, company_id: company.id, role })

        if (error) {
          console.error(`Error assigning to ${company.name}:`, error.message)
        } else {
          console.log(`Assigned to ${company.name} as ${role}`)
        }
      } else {
        console.log(`Already assigned to ${company.name} as ${existing.role}`)
      }
    }
    return
  }

  // Create new user with temp password
  const tempPassword = generateTempPassword()
  console.log(`\nCreating new user...`)

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      must_change_password: true,
      invited_at: new Date().toISOString()
    }
  })

  if (createError) {
    console.error('Error creating user:', createError)
    return
  }

  console.log(`User created with ID: ${newUser.user.id}`)
  console.log(`\n========================================`)
  console.log(`TEMPORARY PASSWORD: ${tempPassword}`)
  console.log(`========================================\n`)

  // Assign to all companies
  for (const company of companies) {
    const { error } = await supabase
      .from('user_companies')
      .insert({ user_id: newUser.user.id, company_id: company.id, role })

    if (error) {
      console.error(`Error assigning to ${company.name}:`, error.message)
    } else {
      console.log(`Assigned to ${company.name} as ${role}`)
    }

    // Create pending invitation record
    await supabase
      .from('pending_invitations')
      .upsert({
        email: email.toLowerCase(),
        company_id: company.id,
        role,
        invited_by: newUser.user.id, // Self-reference since no inviter
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'email,company_id' })
  }

  console.log(`\nDone! User can log in at your app with:`)
  console.log(`  Email: ${email}`)
  console.log(`  Password: ${tempPassword}`)
  console.log(`\nThey will be prompted to change their password on first login.`)
}

// Run with command line args
const email = process.argv[2] || 'aaron@salesmonsters.com'
const role = process.argv[3] || 'admin'

inviteUser(email, role)
