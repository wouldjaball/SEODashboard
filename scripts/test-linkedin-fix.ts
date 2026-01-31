#!/usr/bin/env npx tsx

/**
 * Test LinkedIn API with fixed organization IDs
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

async function testLinkedInFix() {
  console.log('🧪 Testing LinkedIn API with fixed organization IDs\n')
  
  try {
    const userId = '27272fcd-cba7-442f-9e6f-58244228a0d4'
    
    // Get the LinkedIn token
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
    
    // Test Bytecurve organization (21579434)
    const orgId = '21579434'
    console.log(`\n🏢 Testing organization ${orgId} (Bytecurve)...`)
    
    // Test page statistics API (using v2 API)
    const endDate = Date.now()
    const startDate = endDate - (30 * 24 * 60 * 60 * 1000) // 30 days ago
    
    const apiUrl = `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startDate}&timeIntervals.timeRange.end=${endDate}`
    
    console.log('📊 Testing page statistics API...')
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Page statistics API successful!')
      
      if (data.elements && data.elements.length > 0) {
        let totalViews = 0
        data.elements.forEach((elem: any) => {
          totalViews += elem.totalPageStatistics?.views?.allPageViews || 0
        })
        
        console.log(`📈 Results:`)
        console.log(`   - Data points: ${data.elements.length}`)
        console.log(`   - Total page views: ${totalViews}`)
        
        if (totalViews > 0) {
          console.log('🎉 SUCCESS! LinkedIn data is now working!')
        } else {
          console.log('ℹ️  API working but no page views in this period (may be normal)')
        }
      } else {
        console.log('ℹ️  API working but no data elements returned')
      }
    } else {
      const errorText = await response.text()
      console.log('❌ Page statistics API failed:', errorText)
    }
    
    // Test follower statistics (using v2 API)
    console.log('\n👥 Testing follower statistics API...')
    const followerUrl = `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`
    
    const followerResponse = await fetch(followerUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`Status: ${followerResponse.status}`)
    
    if (followerResponse.ok) {
      const followerData = await followerResponse.json()
      console.log('✅ Follower statistics API successful!')
      
      if (followerData.elements && followerData.elements.length > 0) {
        const totalFollowers = followerData.elements[0]?.followerCounts?.organicFollowerCount || 0
        console.log(`📈 Results:`)
        console.log(`   - Total followers: ${totalFollowers}`)
        
        if (totalFollowers > 0) {
          console.log('🎉 SUCCESS! Follower data is now working!')
        }
      }
    } else {
      const errorText = await followerResponse.text()
      console.log('❌ Follower statistics API failed:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

if (require.main === module) {
  testLinkedInFix().catch(console.error)
}
