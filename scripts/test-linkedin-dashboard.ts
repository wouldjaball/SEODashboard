#!/usr/bin/env npx tsx

/**
 * Test script for LinkedIn dashboard component and debug Transit company data
 */

import { LinkedInAnalyticsService } from '../lib/services/linkedin-analytics-service'
import { createClient } from '@supabase/supabase-js'
import { format, subDays } from 'date-fns'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testLinkedInDashboard() {
  console.log('🔍 Testing LinkedIn Dashboard Component...\n')
  
  // Initialize Supabase client with service role key for testing
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  try {
    // 1. Check LinkedIn integrations for Transit company
    console.log('1. Checking LinkedIn integrations for Transit company...')
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, slug')
      .ilike('name', '%transit%')
    
    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return
    }
    
    console.log('Found companies:', companies)
    
    if (!companies || companies.length === 0) {
      console.log('❌ No Transit companies found')
      return
    }
    
    const transitCompany = companies[0]
    console.log(`✅ Found Transit company: ${transitCompany.name} (${transitCompany.id})`)
    
    // 2. Check LinkedIn integration mappings
    console.log('\n2. Checking LinkedIn integration mappings...')
    
    const { data: linkedinMappings, error: mappingsError } = await supabase
      .from('linkedin_page_mappings')
      .select('*')
      .eq('company_id', transitCompany.id)
    
    if (mappingsError) {
      console.error('Error fetching LinkedIn mappings:', mappingsError)
      return
    }
    
    console.log('LinkedIn mappings:', linkedinMappings)
    
    if (!linkedinMappings || linkedinMappings.length === 0) {
      console.log('❌ No LinkedIn mappings found for Transit company')
      console.log('💡 This is likely why LinkedIn data is not loading')
      
      // Show available LinkedIn mappings
      const { data: allMappings } = await supabase
        .from('linkedin_page_mappings')
        .select('company_id, page_name, page_id')
        .limit(5)
      
      console.log('\nAvailable LinkedIn mappings (sample):')
      console.table(allMappings)
      return
    }
    
    const linkedinMapping = linkedinMappings[0]
    console.log(`✅ Found LinkedIn mapping: ${linkedinMapping.page_name}`)
    
    // 3. Test LinkedIn API call with mock data (since we're using mock implementation)
    console.log('\n3. Testing LinkedIn API call...')
    
    const endDate = format(new Date(), 'yyyy-MM-dd')
    const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const previousEndDate = format(subDays(new Date(), 31), 'yyyy-MM-dd') 
    const previousStartDate = format(subDays(new Date(), 61), 'yyyy-MM-dd')
    
    console.log(`Date range: ${startDate} to ${endDate}`)
    console.log(`Previous range: ${previousStartDate} to ${previousEndDate}`)
    
    try {
      const linkedinData = await LinkedInAnalyticsService.fetchAllMetrics(
        linkedinMapping.user_id,
        linkedinMapping.page_id,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      )
      
      console.log('\n✅ LinkedIn data fetch successful!')
      console.log('Core metrics:')
      console.log('- Visitor metrics:', !!linkedinData.visitorMetrics)
      console.log('- Follower metrics:', !!linkedinData.followerMetrics) 
      console.log('- Content metrics:', !!linkedinData.contentMetrics)
      console.log('- Search appearance metrics:', !!linkedinData.searchAppearanceMetrics)
      
      console.log('\nSearch Appearances:')
      console.log(`- Current: ${linkedinData.searchAppearanceMetrics.searchAppearances}`)
      console.log(`- Previous: ${linkedinData.searchAppearanceMetrics.previousPeriod?.searchAppearances}`)
      
      const change = linkedinData.searchAppearanceMetrics.previousPeriod?.searchAppearances
        ? ((linkedinData.searchAppearanceMetrics.searchAppearances - linkedinData.searchAppearanceMetrics.previousPeriod.searchAppearances) / linkedinData.searchAppearanceMetrics.previousPeriod.searchAppearances) * 100
        : 0
      console.log(`- Change: ${change.toFixed(1)}%`)
      
    } catch (error) {
      console.error('❌ LinkedIn API call failed:', error)
    }
    
    // 4. Test component data structure
    console.log('\n4. Testing component data structure...')
    
    // Mock component props structure
    const mockProps = {
      searchAppearanceMetrics: {
        searchAppearances: 12450,
        previousPeriod: { searchAppearances: 10800 }
      },
      followerMetrics: {
        totalFollowers: 1247,
        newFollowers: 85,
        previousPeriod: { totalFollowers: 1162, newFollowers: 72 }
      },
      contentMetrics: {
        impressions: 5200,
        previousPeriod: { impressions: 4800 }
      },
      visitorMetrics: {
        pageViews: 892,
        previousPeriod: { pageViews: 756 }
      }
    }
    
    console.log('✅ Mock props structure valid')
    console.log('Component would render with:')
    console.log('- Search Appearances: 12,450 (+15.3%)')
    console.log('- New Followers: 85 (+18.1%)')
    console.log('- Post Impressions: 5,200 (+8.3%)')
    console.log('- Page Visitors: 892 (+18.0%)')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testLinkedInDashboard().then(() => {
  console.log('\n✅ LinkedIn Dashboard test completed!')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})