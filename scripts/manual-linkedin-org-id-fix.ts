#!/usr/bin/env npx tsx

/**
 * Manual LinkedIn Organization ID Fix
 * 
 * This script manually updates LinkedIn page IDs with correct numeric organization IDs.
 * Since the API approach had access issues, this provides a manual way to fix the IDs.
 * 
 * You'll need to get the correct organization IDs from:
 * 1. LinkedIn company page admin dashboard
 * 2. Browser network tab when viewing analytics
 * 3. LinkedIn API directly (if you have access)
 * 
 * Usage: npx tsx scripts/manual-linkedin-org-id-fix.ts
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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

// Manual mapping of current page IDs to correct numeric organization IDs
// TODO: Update these with the actual numeric LinkedIn organization IDs
const organizationMappings: Record<string, { id: string, name: string }> = {
  'bytecurve': {
    id: 'REPLACE_WITH_ACTUAL_ORG_ID', // e.g., '12345678'
    name: 'Bytecurve'
  },
  'transit-technologies': {
    id: 'REPLACE_WITH_ACTUAL_ORG_ID', // e.g., '87654321'
    name: 'Transit Technologies'
  },
  'ecolane': {
    id: 'REPLACE_WITH_ACTUAL_ORG_ID', // e.g., '11111111'
    name: 'Ecolane'
  },
  'tripshot-inc': {
    id: 'REPLACE_WITH_ACTUAL_ORG_ID', // e.g., '22222222'
    name: 'Tripshot'
  },
  'vestige-gps': {
    id: 'REPLACE_WITH_ACTUAL_ORG_ID', // e.g., '33333333'
    name: 'Vestige'
  }
}

async function manualFix() {
  console.log('\n🔧 Manual LinkedIn Organization ID Fix\n')
  
  // Check if mappings have been updated
  const hasPlaceholders = Object.values(organizationMappings).some(
    mapping => mapping.id === 'REPLACE_WITH_ACTUAL_ORG_ID'
  )
  
  if (hasPlaceholders) {
    console.log('❌ Please update the organizationMappings object with actual LinkedIn organization IDs first!')
    console.log('\nTo find your LinkedIn organization IDs:')
    console.log('1. Go to your LinkedIn company page admin dashboard')
    console.log('2. Open browser developer tools (Network tab)')
    console.log('3. Navigate to analytics or any admin section')
    console.log('4. Look for API calls containing organization IDs (numeric values)')
    console.log('5. Copy the numeric organization ID and update this script')
    console.log('\nExample: "123456789" not "company-name"')
    return
  }

  try {
    // Get current LinkedIn pages
    const { data: pages, error } = await supabase
      .from('linkedin_pages')
      .select(`
        id,
        page_id,
        page_name,
        company_linkedin_mappings(
          companies(name)
        )
      `)

    if (error) {
      console.error('❌ Failed to fetch LinkedIn pages:', error)
      return
    }

    let updatedCount = 0

    for (const page of pages || []) {
      const mapping = organizationMappings[page.page_id]
      
      if (mapping && mapping.id !== page.page_id) {
        console.log(`🔄 Updating ${page.page_name}: ${page.page_id} → ${mapping.id}`)
        
        const { error: updateError } = await supabase
          .from('linkedin_pages')
          .update({
            page_id: mapping.id,
            page_name: mapping.name // Ensure consistent naming
          })
          .eq('id', page.id)

        if (updateError) {
          console.error(`❌ Failed to update ${page.page_name}:`, updateError)
        } else {
          console.log(`✅ Updated ${page.page_name} successfully`)
          updatedCount++
        }
      } else if (!mapping) {
        console.log(`⚠️  No mapping found for ${page.page_name} (${page.page_id})`)
      } else {
        console.log(`✓ ${page.page_name} already has correct ID`)
      }
    }

    console.log(`\n📊 SUMMARY: Updated ${updatedCount} LinkedIn pages`)
    
    if (updatedCount > 0) {
      console.log('\n🧹 NEXT STEPS:')
      console.log('1. Clear analytics cache (already done)')
      console.log('2. Test LinkedIn data in dashboard')
      console.log('3. Check for real data instead of zeros')
    }

  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

if (require.main === module) {
  manualFix().catch(console.error)
}