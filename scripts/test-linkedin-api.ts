#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { decryptToken } from '../lib/utils/token-encryption'

// Load environment variables
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
})

// Set environment variables for the process
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key]
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function testLinkedInAPI() {
  const userId = '27272fcd-cba7-442f-9e6f-58244228a0d4'
  
  // Get the LinkedIn token directly from database
  const { data: tokenData } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'linkedin')
    .single()
    
  if (!tokenData) {
    console.error('No LinkedIn token found')
    return
  }
  
  const accessToken = decryptToken(tokenData.access_token)
  console.log('✅ Successfully got access token')
  
  // Try different LinkedIn API versions and endpoints
  const testConfigs = [
    { version: '202404', endpoint: 'rest/organizations?q=roleAssignee' },
    { version: '202404', endpoint: 'rest/organizations?q=administeredOrganization' },
    { version: '202212', endpoint: 'rest/organizations?q=roleAssignee' },
    { version: '202212', endpoint: 'rest/organizations?q=administeredOrganization' },
    { version: '202310', endpoint: 'rest/organizations?q=roleAssignee' },
    { version: null, endpoint: 'v2/organizations?q=roleAssignee' }, // Old API
    { version: null, endpoint: 'v2/organizationAcls?q=roleAssignee' },
  ]
  
  for (const config of testConfigs) {
    try {
      console.log('\n🔍 Testing:', config.endpoint, 'with version:', config.version || 'none')
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
      
      if (config.version) {
        headers['LinkedIn-Version'] = config.version
      }
      
      const response = await fetch('https://api.linkedin.com/' + config.endpoint, {
        headers
      })
      
      console.log('Status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Success! Response:', JSON.stringify(data, null, 2))
        
        if (data.elements && data.elements.length > 0) {
          console.log('\n📋 Found', data.elements.length, 'organizations:')
          
          // Get unique organization IDs with ADMINISTRATOR role
          const adminOrgs = data.elements
            .filter((acl: any) => acl.role === 'ADMINISTRATOR' && acl.state === 'APPROVED')
            .map((acl: any) => acl.organization.split(':').pop())
          
          console.log('\n🔑 Admin organization IDs:', adminOrgs)
          
          // Now fetch organization details for each admin org
          for (const orgId of adminOrgs) {
            try {
              console.log(`\n🏢 Fetching details for org ID: ${orgId}`)
              
              const orgResponse = await fetch(`https://api.linkedin.com/v2/organizations/${orgId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'X-Restli-Protocol-Version': '2.0.0'
                }
              })
              
              if (orgResponse.ok) {
                const orgData = await orgResponse.json()
                console.log('✅ Organization Details:')
                console.log(`  - Name: ${orgData.localizedName}`)
                console.log(`  - Vanity Name: ${orgData.vanityName}`)
                console.log(`  - ID: ${orgId}`)
                console.log(`  - Website: ${orgData.websiteUrl}`)
                
                // Check if this matches any of our companies
                const companyNames = ['bytecurve', 'ecolane', 'transit-technologies', 'vestige-gps', 'tripshot-inc']
                const vanityName = orgData.vanityName?.toLowerCase()
                const orgName = orgData.localizedName?.toLowerCase()
                
                const match = companyNames.find(name => 
                  name === vanityName || 
                  orgName?.includes(name.replace(/-/g, ' ')) ||
                  orgName?.includes(name.replace(/-/g, ''))
                )
                
                if (match) {
                  console.log(`🎯 MATCH FOUND! This org matches: ${match}`)
                  console.log(`   Update page_id from "${match}" to "${orgId}"`)
                }
              } else {
                console.log(`❌ Failed to get org details: ${orgResponse.status}`)
              }
            } catch (error: any) {
              console.log(`❌ Error fetching org ${orgId}:`, error.message)
            }
          }
        }
        break // Found working endpoint
      } else {
        const errorText = await response.text()
        console.log('❌ Error:', response.status, errorText)
      }
    } catch (error: any) {
      console.log('❌ Exception:', error.message)
    }
  }
}

testLinkedInAPI().catch(console.error)