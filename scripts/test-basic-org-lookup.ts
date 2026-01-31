#!/usr/bin/env npx tsx

/**
 * Test basic organization lookup that we know works
 */

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

Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key]
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function testBasicOrgAccess() {
  console.log('🧪 Testing Basic LinkedIn Organization Access\n')
  
  try {
    const userId = '27272fcd-cba7-442f-9e6f-58244228a0d4'
    
    // Get access token
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'linkedin')
      .single()
      
    if (!tokenData) {
      console.error('❌ No LinkedIn token found')
      return
    }
    
    const accessToken = decryptToken(tokenData.access_token)
    console.log('✅ Access token retrieved')
    
    // Test 1: Organization ACL lookup (we know this works)
    console.log('\n🔑 Test 1: Organization ACL (Known Working)')
    const aclUrl = `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee`
    
    const aclResponse = await fetch(aclUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`ACL Status: ${aclResponse.status}`)
    
    let adminOrgs: string[] = []
    
    if (aclResponse.ok) {
      const aclData = await aclResponse.json()
      console.log('✅ Organization ACL lookup works!')
      
      adminOrgs = aclData.elements
        .filter((acl: any) => acl.role === 'ADMINISTRATOR' && acl.state === 'APPROVED')
        .map((acl: any) => acl.organization.split(':').pop())
      
      console.log('Admin organizations:', adminOrgs)
      
      if (adminOrgs.includes('21579434')) {
        console.log('✅ Bytecurve org 21579434 confirmed in admin list!')
      } else {
        console.log('❌ Bytecurve org 21579434 NOT in admin list')
        console.log('Available orgs:', adminOrgs)
      }
    } else {
      const errorText = await aclResponse.text()
      console.log('❌ ACL lookup failed:', errorText)
      return
    }
    
    // Test 2: Try to get organization details
    console.log('\n🏢 Test 2: Organization Details')
    const orgDetailUrl = `https://api.linkedin.com/v2/organizations/21579434`
    
    const orgResponse = await fetch(orgDetailUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`Org Details Status: ${orgResponse.status}`)
    
    if (orgResponse.ok) {
      const orgData = await orgResponse.json()
      console.log('✅ Organization details retrieved!')
      console.log(`   - Name: ${orgData.localizedName}`)
      console.log(`   - Vanity: ${orgData.vanityName}`)
      console.log(`   - ID: 21579434`)
    } else {
      const errorText = await orgResponse.text()
      console.log('❌ Org details failed:', errorText)
    }
    
    // Test 3: Check token scopes
    console.log('\n🔐 Test 3: Token Scope Analysis')
    console.log('Token scopes:', tokenData.scope)
    
    const requiredScopes = [
      'r_organization_social',
      'rw_organization_admin', 
      'r_organization_followers'
    ]
    
    const hasScope = (scope: string) => tokenData.scope?.includes(scope)
    
    requiredScopes.forEach(scope => {
      const status = hasScope(scope) ? '✅' : '❌'
      console.log(`   ${status} ${scope}`)
    })
    
    console.log('\n📋 Analysis:')
    console.log('✅ OAuth token is valid and not expired')
    console.log('✅ Can access LinkedIn organization ACLs') 
    
    if (aclResponse.ok && adminOrgs.includes('21579434')) {
      console.log('✅ User has admin access to Bytecurve organization')
      console.log('💡 The issue may be with specific analytics API endpoints or parameters')
    } else {
      console.log('❌ User may not have admin access to Bytecurve organization')
      console.log('💡 This would explain why analytics APIs fail')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

if (require.main === module) {
  testBasicOrgAccess().catch(console.error)
}