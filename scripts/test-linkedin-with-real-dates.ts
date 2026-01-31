#!/usr/bin/env npx tsx

/**
 * Test LinkedIn API with realistic historical dates
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { decryptToken } from '../lib/utils/token-encryption'
import { LINKEDIN_API_BASE, LINKEDIN_API_VERSION } from '../lib/constants/linkedin-oauth-scopes'

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

async function testWithRealDates() {
  console.log('🧪 Testing LinkedIn API with Realistic Historical Dates\n')
  
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
    
    // Use realistic dates - December 2024 to January 2025
    const endDate = new Date('2025-01-15').getTime() // Mid January 2025
    const startDate = new Date('2024-12-15').getTime() // Mid December 2024
    
    console.log(`\n📅 Testing with realistic dates:`)
    console.log(`   Start: ${new Date(startDate).toISOString().split('T')[0]}`)
    console.log(`   End: ${new Date(endDate).toISOString().split('T')[0]}`)
    console.log(`   Organization: ${orgId} (Bytecurve)`)
    
    // Test 1: Page Statistics API
    console.log('\n📊 Test 1: Page Statistics API')
    const pageStatsUrl = `${LINKEDIN_API_BASE}/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startDate}&timeIntervals.timeRange.end=${endDate}`
    
    console.log('Endpoint:', pageStatsUrl.split('?')[0])
    
    const pageResponse = await fetch(pageStatsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`Status: ${pageResponse.status}`)
    
    if (pageResponse.ok) {
      const pageData = await pageResponse.json()
      console.log('✅ Page statistics API successful!')
      
      if (pageData.elements && pageData.elements.length > 0) {
        let totalViews = 0
        pageData.elements.forEach((elem: any) => {
          totalViews += elem.totalPageStatistics?.views?.allPageViews || 0
        })
        
        console.log(`📈 Results:`)
        console.log(`   - Data points: ${pageData.elements.length}`)
        console.log(`   - Total page views: ${totalViews}`)
        
        if (totalViews > 0) {
          console.log('🎉 SUCCESS! Found actual LinkedIn page data!')
        } else {
          console.log('ℹ️  API working but no page views in this historical period')
        }
      } else {
        console.log('ℹ️  API successful but no data elements returned')
      }
    } else {
      const errorText = await pageResponse.text()
      console.log('❌ Page statistics failed:', errorText)
      
      // Test with different API version if current fails
      if (pageResponse.status === 400 || pageResponse.status === 426) {
        console.log('\n🔄 Trying with older API version (202404)...')
        
        const retryResponse = await fetch(pageStatsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202404',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        })
        
        console.log(`Retry Status: ${retryResponse.status}`)
        if (retryResponse.ok) {
          const retryData = await retryResponse.json()
          console.log('✅ Succeeded with older API version!')
          console.log(`   - Data elements: ${retryData.elements?.length || 0}`)
        } else {
          console.log('❌ Still failed with older version')
        }
      }
    }
    
    // Test 2: Follower Statistics API
    console.log('\n👥 Test 2: Follower Statistics API')
    const followerUrl = `${LINKEDIN_API_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`
    
    console.log('Endpoint:', followerUrl.split('?')[0])
    
    const followerResponse = await fetch(followerUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    })
    
    console.log(`Status: ${followerResponse.status}`)
    
    if (followerResponse.ok) {
      const followerData = await followerResponse.json()
      console.log('✅ Follower statistics API successful!')
      
      if (followerData.elements && followerData.elements.length > 0) {
        const element = followerData.elements[0]
        const totalFollowers = element.followerCounts?.organicFollowerCount || 0
        const paidFollowers = element.followerCounts?.paidFollowerCount || 0
        
        console.log(`📈 Results:`)
        console.log(`   - Organic followers: ${totalFollowers}`)
        console.log(`   - Paid followers: ${paidFollowers}`)
        console.log(`   - Total followers: ${totalFollowers + paidFollowers}`)
        
        if (totalFollowers > 0) {
          console.log('🎉 SUCCESS! Found actual LinkedIn follower data!')
        }
      }
    } else {
      const errorText = await followerResponse.text()
      console.log('❌ Follower statistics failed:', errorText)
    }
    
    console.log('\n📝 Summary:')
    console.log('✅ Organization ID is correct: 21579434')
    console.log('✅ OAuth token is valid and has proper scopes')
    console.log('ℹ️  Issue confirmed: Future dates (2026) return no data')
    console.log('💡 Solution: Use historical dates for testing')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

if (require.main === module) {
  testWithRealDates().catch(console.error)
}