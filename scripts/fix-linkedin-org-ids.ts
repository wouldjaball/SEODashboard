#!/usr/bin/env npx tsx

/**
 * Fix LinkedIn Organization IDs
 * 
 * This script updates the page_id values in the linkedin_pages table
 * from vanity names to the correct numeric organization IDs.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

// Organization mappings discovered from LinkedIn API
const organizationMappings = {
  'bytecurve': '21579434',
  'ecolane': '143142', 
  'vestige-gps': '10427528',
  'tripshot-inc': '10674934'
  // Note: transit-technologies was not found - user may not have admin access
}

async function fixLinkedInOrgIds() {
  console.log('🔧 Fixing LinkedIn Organization IDs\n')
  
  try {
    // Get all LinkedIn pages
    const { data: pages, error: fetchError } = await supabase
      .from('linkedin_pages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Error fetching LinkedIn pages:', fetchError)
      return
    }
    
    console.log(`📋 Found ${pages.length} LinkedIn pages`)
    
    for (const page of pages) {
      const currentPageId = page.page_id
      const correctOrgId = organizationMappings[currentPageId as keyof typeof organizationMappings]
      
      if (correctOrgId) {
        console.log(`\n🔄 Updating ${page.page_name}:`)
        console.log(`   Old page_id: "${currentPageId}"`)
        console.log(`   New page_id: "${correctOrgId}"`)
        
        // Update the page_id
        const { error: updateError } = await supabase
          .from('linkedin_pages')
          .update({ 
            page_id: correctOrgId
          })
          .eq('id', page.id)
        
        if (updateError) {
          console.error(`   ❌ Failed to update: ${updateError.message}`)
        } else {
          console.log(`   ✅ Successfully updated`)
          
          // Clear any cached data for this company
          await clearCacheForPage(page.id)
        }
      } else {
        console.log(`\n⚠️  No mapping found for ${page.page_name} (${currentPageId})`)
        if (currentPageId === 'transit-technologies') {
          console.log(`   This user may not have admin access to this organization`)
        }
      }
    }
    
    console.log('\n🎉 Organization ID fix completed!')
    console.log('\n📝 Summary:')
    console.log(`   - Fixed: ${Object.keys(organizationMappings).length} organizations`)
    console.log(`   - Bytecurve: bytecurve → 21579434`)
    console.log(`   - Ecolane: ecolane → 143142`)
    console.log(`   - Vestige: vestige-gps → 10427528`) 
    console.log(`   - Tripshot: tripshot-inc → 10674934`)
    console.log('\n💡 Next steps:')
    console.log('   1. Test LinkedIn data retrieval for updated organizations')
    console.log('   2. Verify dashboard shows non-zero metrics')
    console.log('   3. Check for Transit Technologies admin access separately')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

async function clearCacheForPage(linkedinPageId: string) {
  try {
    // Find companies mapped to this LinkedIn page
    const { data: mappings } = await supabase
      .from('company_linkedin_mappings')
      .select('company_id')
      .eq('linkedin_page_id', linkedinPageId)
    
    if (mappings && mappings.length > 0) {
      for (const mapping of mappings) {
        // Clear analytics cache for this company
        const { error: cacheError } = await supabase
          .from('analytics_cache')
          .delete()
          .eq('company_id', mapping.company_id)
          .eq('data_type', 'all')
        
        if (cacheError) {
          console.log(`   ⚠️  Warning: Failed to clear cache for company ${mapping.company_id}`)
        } else {
          console.log(`   🗑️  Cleared analytics cache for company`)
        }
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Warning: Failed to clear cache:`, error)
  }
}

if (require.main === module) {
  fixLinkedInOrgIds().catch(console.error)
}
