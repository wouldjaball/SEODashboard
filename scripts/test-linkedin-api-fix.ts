#!/usr/bin/env npx tsx

/**
 * Test LinkedIn API Fix for Bytecurve
 * 
 * This script tests the LinkedIn API with the new configuration:
 * - Proper API version header (202601)
 * - Updated endpoint format (/rest/ instead of /v2/)
 * - Required headers for 2024+ API
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { OAuthTokenService } from '../lib/services/oauth-token-service'
import { LINKEDIN_API_VERSION, LINKEDIN_API_BASE } from '../lib/constants/linkedin-oauth-scopes'

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

class LinkedInAPITester {
  private companyName = 'Bytecurve'
  private organizationId = '21579434'
  private userId = '27272fcd-cba7-442f-9e6f-58244228a0d4'

  async testAPI() {
    console.log('\n🧪 Testing LinkedIn API Fix for Bytecurve\n')
    console.log(`API Base: ${LINKEDIN_API_BASE}`)
    console.log(`API Version: ${LINKEDIN_API_VERSION}`)
    console.log(`Organization ID: ${this.organizationId}`)
    console.log(`User ID: ${this.userId}\n`)

    try {
      await this.testTokenRefresh()
      await this.testOrganizationLookup()
      await this.testPageStatistics()
      // Skip follower statistics for now to avoid rate limiting
      console.log('\n⚠️  Skipping follower statistics test to avoid rate limiting')
    } catch (error) {
      console.error('❌ Test failed:', error)
    }
  }

  private async testTokenRefresh() {
    console.log('1️⃣ Testing token refresh...')
    
    try {
      const tokenResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(this.userId)
      if (tokenResult.success) {
        console.log('✅ Token refresh successful')
        console.log(`   Access token length: ${tokenResult.accessToken?.length || 0} chars`)
      } else {
        console.log('❌ Token refresh failed:', tokenResult.error)
        throw new Error(`Token refresh failed: ${tokenResult.details}`)
      }
    } catch (error) {
      console.log('❌ Token refresh error:', error)
      throw error
    }
  }

  private async testOrganizationLookup() {
    console.log('\n2️⃣ Testing organization lookup...')
    
    try {
      const tokenResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(this.userId)
      if (!tokenResult.success) {
        throw new Error('Token not available')
      }

      // Test the specific organization lookup
      const url = `${LINKEDIN_API_BASE}/organizations/${this.organizationId}`
      
      console.log(`   Making request to: ${url}`)
      
      const headers = {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        'LinkedIn-Version': LINKEDIN_API_VERSION
      }

      const response = await fetch(url, { headers })
      
      console.log(`   Response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Organization lookup successful')
        console.log(`   Organization name: ${data.localizedName || 'N/A'}`)
        console.log(`   Vanity name: ${data.vanityName || 'N/A'}`)
        return data
      } else {
        const errorText = await response.text()
        console.log('❌ Organization lookup failed')
        console.log(`   Error: ${errorText}`)
        
        // Try alternative endpoint format
        await this.testAlternativeOrgLookup(tokenResult.accessToken)
      }
    } catch (error) {
      console.log('❌ Organization lookup error:', error)
    }
  }

  private async testAlternativeOrgLookup(accessToken: string) {
    console.log('\n   🔄 Trying alternative organization endpoints...')
    
    const alternatives = [
      `${LINKEDIN_API_BASE}/organizationsLookup?ids=List(${this.organizationId})`,
      `https://api.linkedin.com/v2/organizations/${this.organizationId}`,
      `${LINKEDIN_API_BASE}/organizations?q=administeredOrganization`,
      `https://api.linkedin.com/v2/organizations?q=administeredOrganization`
    ]

    for (const [index, url] of alternatives.entries()) {
      try {
        console.log(`   Testing alternative ${index + 1}: ${url}`)
        
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
          'LinkedIn-Version': LINKEDIN_API_VERSION
        }

        const response = await fetch(url, { headers })
        console.log(`   Response status: ${response.status}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Alternative ${index + 1} successful!`)
          console.log('   Data:', JSON.stringify(data, null, 2))
          return data
        } else {
          const errorText = await response.text()
          console.log(`   Alternative ${index + 1} failed: ${errorText}`)
        }
      } catch (error) {
        console.log(`   Alternative ${index + 1} error:`, error)
      }
    }
  }

  private async testPageStatistics() {
    console.log('\n3️⃣ Testing page statistics...')
    
    try {
      const tokenResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(this.userId)
      if (!tokenResult.success) {
        throw new Error('Token not available')
      }

      // First test lifetime statistics (no time intervals)
      console.log('   Testing lifetime page statistics (no timeIntervals)...')
      
      const lifetimeParams = new URLSearchParams({
        q: 'organization',
        organization: `urn:li:organization:${this.organizationId}`
      })
      
      let url = `${LINKEDIN_API_BASE}/organizationPageStatistics?${lifetimeParams.toString()}`
      
      const headers = {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        'LinkedIn-Version': LINKEDIN_API_VERSION
      }

      let response = await fetch(url, { headers })
      console.log(`   Lifetime stats response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Lifetime page statistics successful')
        console.log(`   Data: ${JSON.stringify(data, null, 2)}`)
      } else {
        const errorText = await response.text()
        console.log('❌ Lifetime page statistics failed')
        console.log(`   Error: ${errorText}`)
      }
      
      // Now test with time range using RestLi 2.0 format (URL encoded)
      console.log('\n   Testing time-bound page statistics with RestLi 2.0 format...')
      const endDate = Date.now()
      const startDate = endDate - (30 * 24 * 60 * 60 * 1000) // 30 days ago
      
      const timeBoundParams = new URLSearchParams({
        q: 'organization',
        organization: `urn:li:organization:${this.organizationId}`,
        timeIntervals: `(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`
      })
      
      url = `${LINKEDIN_API_BASE}/organizationPageStatistics?${timeBoundParams.toString()}`
      
      console.log(`   Making request to time-bound page statistics API`)
      
      response = await fetch(url, { headers })
      
      console.log(`   Time-bound stats response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Time-bound page statistics successful')
        console.log(`   Elements returned: ${data.elements?.length || 0}`)
        
        if (data.elements?.length > 0) {
          const totalViews = data.elements.reduce((sum: number, elem: any) => 
            sum + (elem.totalPageStatistics?.views?.allPageViews || 0), 0)
          console.log(`   Total page views: ${totalViews}`)
        }
        
        return data
      } else {
        const errorText = await response.text()
        console.log('❌ Time-bound page statistics failed')
        console.log(`   Error: ${errorText}`)
      }
    } catch (error) {
      console.log('❌ Page statistics error:', error)
    }
  }

  private async testFollowerStatistics() {
    console.log('\n4️⃣ Testing follower statistics...')
    
    try {
      const tokenResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(this.userId)
      if (!tokenResult.success) {
        throw new Error('Token not available')
      }

      const params = new URLSearchParams({
        q: 'organizationalEntity',
        organizationalEntity: `urn:li:organization:${this.organizationId}`
      })
      
      const url = `${LINKEDIN_API_BASE}/organizationalEntityFollowerStatistics?${params.toString()}`
      
      console.log(`   Making request to follower statistics API`)
      
      const headers = {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        'LinkedIn-Version': LINKEDIN_API_VERSION
      }

      const response = await fetch(url, { headers })
      
      console.log(`   Response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Follower statistics successful')
        console.log(`   Elements returned: ${data.elements?.length || 0}`)
        
        if (data.elements?.length > 0) {
          const followerCount = data.elements[0]?.followerCounts?.organicFollowerCount || 0
          console.log(`   Organic followers: ${followerCount}`)
        }
        
        return data
      } else {
        const errorText = await response.text()
        console.log('❌ Follower statistics failed')
        console.log(`   Error: ${errorText}`)
      }
    } catch (error) {
      console.log('❌ Follower statistics error:', error)
    }
  }
}

async function main() {
  const tester = new LinkedInAPITester()
  await tester.testAPI()
}

if (require.main === module) {
  main().catch(console.error)
}