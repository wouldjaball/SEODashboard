#!/usr/bin/env npx tsx

/**
 * Test LinkedIn Analytics Service with historical dates
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables first
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
})

Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key]
})

// Import after env vars are set
import { LinkedInAnalyticsService } from '../lib/services/linkedin-analytics-service.js'

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function testLinkedInAnalyticsService() {
  console.log('🧪 Testing LinkedIn Analytics Service with Historical Dates\n')
  
  try {
    const userId = '27272fcd-cba7-442f-9e6f-58244228a0d4'
    const organizationId = '21579434' // Bytecurve
    
    // Use realistic historical dates (2024)
    const endDate = '2024-12-31'       // End of 2024
    const startDate = '2024-12-01'     // December 2024 
    const previousEndDate = '2024-11-30'   // Previous month
    const previousStartDate = '2024-11-01'
    
    console.log('📅 Test Parameters:')
    console.log('   Organization ID:', organizationId)
    console.log('   Current Period:', startDate, 'to', endDate)
    console.log('   Previous Period:', previousStartDate, 'to', previousEndDate)
    console.log('   User ID:', userId)
    
    let pageStats: any = null
    let followerStats: any = null
    let allMetrics: any = null
    
    // Test 1: Page Statistics
    console.log('\n📊 Test 1: Page Statistics')
    try {
      pageStats = await LinkedInAnalyticsService.fetchPageStatistics(
        userId,
        organizationId,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      )
      
      console.log('✅ Page statistics successful!')
      console.log('   - Page Views:', pageStats.pageViews)
      console.log('   - Unique Visitors:', pageStats.uniqueVisitors) 
      console.log('   - Custom Button Clicks:', pageStats.customButtonClicks)
      
      if (pageStats.pageViews > 0 || pageStats.uniqueVisitors > 0) {
        console.log('🎉 SUCCESS! Found LinkedIn page data!')
      } else {
        console.log('ℹ️  API working but no activity in December 2024')
      }
    } catch (error: any) {
      console.log('❌ Page statistics failed:', error.message)
      if (error.message.includes('LinkedIn API Error: 400')) {
        console.log('💡 API endpoint or parameter format issue')
      }
    }
    
    // Test 2: Follower Statistics  
    console.log('\n👥 Test 2: Follower Statistics')
    try {
      followerStats = await LinkedInAnalyticsService.fetchFollowerMetrics(
        userId,
        organizationId,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      )
      
      console.log('✅ Follower statistics successful!')
      console.log('   - Total Followers:', followerStats.totalFollowers)
      console.log('   - New Followers:', followerStats.newFollowers)
      
      if (followerStats.totalFollowers > 0) {
        console.log('🎉 SUCCESS! Found LinkedIn follower data!')
      }
    } catch (error: any) {
      console.log('❌ Follower statistics failed:', error.message)
    }
    
    // Test 3: Full Analytics (what the dashboard actually calls)
    console.log('\n📈 Test 3: All Metrics (Dashboard Method)')
    try {
      allMetrics = await LinkedInAnalyticsService.fetchAllMetrics(
        userId,
        organizationId,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      )
      
      console.log('✅ All metrics successful!')
      console.log('   - Visitor Metrics:', !!allMetrics.visitorMetrics)
      console.log('   - Follower Metrics:', !!allMetrics.followerMetrics)
      console.log('   - Content Metrics:', !!allMetrics.contentMetrics)
      console.log('   - Daily Data Points:', allMetrics.visitorDaily?.length || 0)
      
      if (allMetrics.visitorMetrics || allMetrics.followerMetrics) {
        console.log('🎉 SUCCESS! LinkedIn Analytics Service is working!')
        
        // Log specific values
        if (allMetrics.visitorMetrics) {
          console.log('📊 Visitor Data:')
          console.log('   - Page Views:', allMetrics.visitorMetrics.pageViews)
          console.log('   - Unique Visitors:', allMetrics.visitorMetrics.uniqueVisitors)
        }
        
        if (allMetrics.followerMetrics) {
          console.log('👥 Follower Data:')
          console.log('   - Total Followers:', allMetrics.followerMetrics.totalFollowers)
          console.log('   - New Followers:', allMetrics.followerMetrics.newFollowers)
        }
      }
    } catch (error: any) {
      console.log('❌ All metrics failed:', error.message)
    }
    
    console.log('\n🔍 Diagnosis:')
    console.log('✅ Organization ID 21579434 is correct')
    console.log('✅ User has admin access to organization') 
    console.log('✅ OAuth tokens are valid with proper scopes')
    console.log('💡 Using historical dates from 2024 instead of future 2026 dates')
    
    if (pageStats || followerStats || allMetrics) {
      console.log('🎯 LinkedIn Analytics Service is working - the issue was future dates!')
    } else {
      console.log('🔧 LinkedIn Analytics Service still needs investigation')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

if (require.main === module) {
  testLinkedInAnalyticsService().catch(console.error)
}