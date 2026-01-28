import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function resetPassword() {
  const email = process.argv[2] || 'aaron@salesmonsters.com'
  const newPassword = process.argv[3] || 'password123'

  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.log('User not found:', email)
    return
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  })

  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Password reset successfully!')
    console.log('Email:', email)
    console.log('Password:', newPassword)
  }
}

resetPassword()
