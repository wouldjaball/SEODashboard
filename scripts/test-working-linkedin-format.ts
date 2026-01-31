#!/usr/bin/env npx tsx

/**
 * Test LinkedIn API using the format we know works
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

async function testWorkingFormat() {
  console.log('🧪 Testing LinkedIn API with Known Working Format\n')
  
  try {
    const userId = '27272fcd-cba7-442f-9e6f-58244228a0d4'
    const orgId = '21579434' // Bytecurve
    
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
    
    // Test 1: Simple Follower Stats (we know this works)
    console.log('\n👥 Test 1: Follower Statistics (Basic)')
    const followerUrl = `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`
    
    console.log('Testing URL:', followerUrl)
    
    const followerResponse = await fetch(followerUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
        // No LinkedIn-Version header
      }
    })
    
    console.log(`Status: ${followerResponse.status}`)
    
    if (followerResponse.ok) {
      const followerData = await followerResponse.json()
      console.log('✅ Follower API works!')
      console.log('Response structure:', Object.keys(followerData))
      
      if (followerData.elements && followerData.elements.length > 0) {
        const element = followerData.elements[0]
        console.log('First element keys:', Object.keys(element))
        
        if (element.followerCounts) {
          const totalFollowers = element.followerCounts.organicFollowerCount || 0
          const paidFollowers = element.followerCounts.paidFollowerCount || 0
          
          console.log(`📈 Follower Data Found:`)
          console.log(`   - Organic followers: ${totalFollowers}`)
          console.log(`   - Paid followers: ${paidFollowers}`)
          console.log(`   - Total followers: ${totalFollowers + paidFollowers}`)
          
          if (totalFollowers > 0) {
            console.log('🎉 SUCCESS! LinkedIn integration is working!')
          }
        }
      }
    } else {
      const errorText = await followerResponse.text()
      console.log('❌ Follower API failed:', errorText)
    }
    
    // Test 2: Page Statistics with simpler format
    console.log('\n📊 Test 2: Page Statistics (Simplified)')
    const endTimestamp = new Date('2025-01-15').getTime()
    const startTimestamp = new Date('2024-12-15').getTime()
    
    const pageUrl = `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startTimestamp}&timeIntervals.timeRange.end=${endTimestamp}`
    
    console.log('Testing page stats...')
    
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`Page Stats Status: ${pageResponse.status}`)
    
    if (pageResponse.ok) {
      const pageData = await pageResponse.json()
      console.log('✅ Page Stats API works!')
      console.log('Elements count:', pageData.elements?.length || 0)
      
      if (pageData.elements && pageData.elements.length > 0) {
        let totalViews = 0
        pageData.elements.forEach((elem: any) => {
          const views = elem.totalPageStatistics?.views?.allPageViews || 0
          totalViews += views
        })
        
        console.log(`📈 Page Data:`)
        console.log(`   - Total page views: ${totalViews}`)
        console.log(`   - Data points: ${pageData.elements.length}`)
        
        if (totalViews > 0) {
          console.log('🎉 SUCCESS! Page data is working!')
        } else {
          console.log('ℹ️  No page views in this period (may be normal)')
        }
      }
    } else {
      const errorText = await pageResponse.text()
      console.log('❌ Page stats failed:', errorText)
    }
    
    console.log('\n🔍 Diagnosis:')
    if (followerResponse.ok) {
      console.log('✅ LinkedIn API integration is fundamentally working')
      console.log('✅ Organization ID 21579434 is correct') 
      console.log('✅ OAuth tokens and scopes are valid')
      
      if (pageResponse.ok) {
        console.log('✅ Both follower and page statistics APIs work')
        console.log('💡 The issue was API version/endpoint format')
      } else {
        console.log('⚠️  Page statistics API needs different parameters')
      }
    } else {
      console.log('❌ Fundamental API access issue remains')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

if (require.main === module) {
  testWorkingFormat().catch(console.error)
}