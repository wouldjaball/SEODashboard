#!/usr/bin/env npx tsx

/**
 * LinkedIn Organization ID Fix Script
 * 
 * This script fixes the LinkedIn integration issue by replacing company slugs
 * with correct numeric organization IDs from the LinkedIn API.
 * 
 * Issue: Database stores slugs like "bytecurve" but LinkedIn API expects
 * numeric IDs like "123456789" for organization URNs.
 * 
 * Usage: npx tsx scripts/fix-linkedin-org-ids.ts [--dry-run] [--company=companyName]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { OAuthTokenService } from '../lib/services/oauth-token-service'
import { LINKEDIN_API_VERSION } from '../lib/constants/linkedin-oauth-scopes'

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

interface LinkedInOrganization {
  id: string
  name: string
  vanityName?: string
  logoUrl?: string
}

interface PageToFix {
  dbId: string
  currentPageId: string
  pageName: string
  pageUrl: string
  userId: string
  companyName?: string
}

interface FixResult {
  dbId: string
  oldPageId: string
  newPageId: string
  organizationName: string
  vanityName?: string
  success: boolean
  error?: string
}

class LinkedInOrgIdFixer {
  private dryRun: boolean
  private targetCompany: string | null
  private backupFile: string
  private results: FixResult[] = []

  constructor(dryRun = false, targetCompany: string | null = null) {
    this.dryRun = dryRun
    this.targetCompany = targetCompany
    this.backupFile = `linkedin_pages_backup_${Date.now()}.json`
  }

  async fix() {
    console.log('\n🔧 LinkedIn Organization ID Fixer\n')
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}`)
    if (this.targetCompany) {
      console.log(`Target: ${this.targetCompany} only`)
    }
    console.log('')

    try {
      // Step 1: Backup current data
      await this.backupCurrentData()

      // Step 2: Get pages that need fixing
      const pagesToFix = await this.getPagesToFix()
      
      if (pagesToFix.length === 0) {
        console.log('✅ No pages need fixing - all LinkedIn pages already have numeric organization IDs')
        return
      }

      console.log(`📋 Found ${pagesToFix.length} pages that need fixing:\n`)
      pagesToFix.forEach(page => {
        console.log(`  • ${page.pageName} (${page.currentPageId}) ${page.companyName ? `→ ${page.companyName}` : ''}`)
      })
      console.log('')

      // Step 3: Get LinkedIn organizations from API
      const organizations = await this.fetchLinkedInOrganizations(pagesToFix[0].userId)
      
      if (organizations.length === 0) {
        console.error('❌ No LinkedIn organizations found. Make sure OAuth tokens are valid.')
        return
      }

      console.log(`📊 Found ${organizations.length} LinkedIn organizations accessible via API\n`)

      // Step 4: Match and fix each page
      for (const page of pagesToFix) {
        const result = await this.fixPage(page, organizations)
        this.results.push(result)
      }

      // Step 5: Print summary
      this.printSummary()

    } catch (error) {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    }
  }

  private async backupCurrentData() {
    console.log('💾 Creating backup of current linkedin_pages data...')
    
    const { data: pages, error } = await supabase
      .from('linkedin_pages')
      .select('*')

    if (error) {
      throw new Error(`Failed to backup data: ${error.message}`)
    }

    writeFileSync(this.backupFile, JSON.stringify(pages, null, 2))
    console.log(`✅ Backup saved to: ${this.backupFile}\n`)
  }

  private async getPagesToFix(): Promise<PageToFix[]> {
    let query = supabase
      .from('linkedin_pages')
      .select(`
        id,
        page_id,
        page_name,
        page_url,
        user_id,
        company_linkedin_mappings(
          companies(name)
        )
      `)

    if (this.targetCompany) {
      // Filter by company name if specified
      query = query.eq('company_linkedin_mappings.companies.name', this.targetCompany)
    }

    const { data: pages, error } = await query

    if (error) {
      throw new Error(`Failed to fetch pages: ${error.message}`)
    }

    // Filter to only pages that need fixing (non-numeric page_id)
    return (pages || [])
      .filter(page => !/^\d+$/.test(page.page_id)) // Not purely numeric
      .map(page => ({
        dbId: page.id,
        currentPageId: page.page_id,
        pageName: page.page_name,
        pageUrl: page.page_url || '',
        userId: page.user_id,
        companyName: (page.company_linkedin_mappings as any)?.[0]?.companies?.name
      }))
  }

  private async fetchLinkedInOrganizations(userId: string): Promise<LinkedInOrganization[]> {
    console.log('🔍 Fetching LinkedIn organizations from API...')
    
    // Get fresh access token
    const tokenResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(userId)
    if (!tokenResult.success) {
      throw new Error(`Failed to refresh LinkedIn token: ${tokenResult.error}`)
    }

    const accessToken = tokenResult.accessToken
    const roles = ['ADMINISTRATOR', 'CONTENT_ADMIN', 'DIRECT_SPONSORED_CONTENT_POSTER', 'LEAD_GEN_FORMS_MANAGER', 'RECRUITING_POSTER']
    
    const allOrganizations: LinkedInOrganization[] = []
    const seenOrgIds = new Set<string>()

    for (const role of roles) {
      try {
        const orgAclsResponse = await fetch(
          `https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=${role}&projection=(elements*(organization~(localizedName,vanityName,id,logoV2(original~:playableStreams))))`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'LinkedIn-Version': LINKEDIN_API_VERSION,
              'X-Restli-Protocol-Version': '2.0.0'
            }
          }
        )

        if (orgAclsResponse.ok) {
          const orgAcls = await orgAclsResponse.json()
          
          for (const elem of (orgAcls.elements || [])) {
            const orgUrn = elem.organization || ''
            const orgId = orgUrn.split(':').pop() || ''

            if (seenOrgIds.has(orgId)) continue
            seenOrgIds.add(orgId)

            const orgDetails = elem['organization~']

            let logoUrl: string | undefined
            try {
              logoUrl = orgDetails?.['logoV2']?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier
            } catch {
              // No logo available
            }

            allOrganizations.push({
              id: orgId,
              name: orgDetails?.localizedName || 'Unknown Organization',
              vanityName: orgDetails?.vanityName,
              logoUrl
            })
          }
        }
      } catch (roleError) {
        // Continue with other roles if one fails
      }
    }

    return allOrganizations
  }

  private async fixPage(page: PageToFix, organizations: LinkedInOrganization[]): Promise<FixResult> {
    console.log(`🔧 Fixing ${page.pageName} (${page.currentPageId})...`)

    // Try to find matching organization
    const matchingOrg = this.findMatchingOrganization(page, organizations)

    if (!matchingOrg) {
      const error = `No matching LinkedIn organization found for "${page.currentPageId}"`
      console.log(`   ❌ ${error}`)
      return {
        dbId: page.dbId,
        oldPageId: page.currentPageId,
        newPageId: '',
        organizationName: page.pageName,
        success: false,
        error
      }
    }

    console.log(`   ✅ Found match: "${matchingOrg.name}" (ID: ${matchingOrg.id})`)

    // Update database if not dry run
    if (!this.dryRun) {
      const { error } = await supabase
        .from('linkedin_pages')
        .update({
          page_id: matchingOrg.id,
          page_name: matchingOrg.name // Update name to match LinkedIn exactly
        })
        .eq('id', page.dbId)

      if (error) {
        const errorMsg = `Database update failed: ${error.message}`
        console.log(`   ❌ ${errorMsg}`)
        return {
          dbId: page.dbId,
          oldPageId: page.currentPageId,
          newPageId: matchingOrg.id,
          organizationName: matchingOrg.name,
          success: false,
          error: errorMsg
        }
      }

      console.log(`   💾 Database updated successfully`)
    } else {
      console.log(`   👁️  Would update: ${page.currentPageId} → ${matchingOrg.id}`)
    }

    return {
      dbId: page.dbId,
      oldPageId: page.currentPageId,
      newPageId: matchingOrg.id,
      organizationName: matchingOrg.name,
      vanityName: matchingOrg.vanityName,
      success: true
    }
  }

  private findMatchingOrganization(page: PageToFix, organizations: LinkedInOrganization[]): LinkedInOrganization | null {
    // Strategy 1: Exact vanity name match
    let match = organizations.find(org => 
      org.vanityName?.toLowerCase() === page.currentPageId.toLowerCase()
    )
    if (match) return match

    // Strategy 2: Organization name contains the page ID (handle variations)
    const pageIdNormalized = page.currentPageId.toLowerCase().replace(/[-_]/g, '')
    match = organizations.find(org => {
      const orgNameNormalized = org.name.toLowerCase().replace(/[-_\s]/g, '')
      return orgNameNormalized.includes(pageIdNormalized) || pageIdNormalized.includes(orgNameNormalized)
    })
    if (match) return match

    // Strategy 3: Check if the page name matches any organization name
    const pageNameNormalized = page.pageName.toLowerCase().replace(/[-_\s]/g, '')
    match = organizations.find(org => {
      const orgNameNormalized = org.name.toLowerCase().replace(/[-_\s]/g, '')
      return orgNameNormalized === pageNameNormalized || 
             orgNameNormalized.includes(pageNameNormalized) ||
             pageNameNormalized.includes(orgNameNormalized)
    })
    if (match) return match

    return null
  }

  private printSummary() {
    console.log('\n📊 FIX SUMMARY\n')
    
    const successful = this.results.filter(r => r.success)
    const failed = this.results.filter(r => !r.success)

    console.log(`✅ ${successful.length} pages fixed successfully`)
    console.log(`❌ ${failed.length} pages failed to fix`)

    if (successful.length > 0) {
      console.log('\n🎉 SUCCESSFUL FIXES:')
      successful.forEach(result => {
        console.log(`   • ${result.organizationName}`)
        console.log(`     ${result.oldPageId} → ${result.newPageId}`)
        if (result.vanityName) {
          console.log(`     Vanity: ${result.vanityName}`)
        }
        console.log('')
      })
    }

    if (failed.length > 0) {
      console.log('\n❌ FAILED FIXES:')
      failed.forEach(result => {
        console.log(`   • ${result.organizationName}: ${result.error}`)
      })
      console.log('')
    }

    if (!this.dryRun && successful.length > 0) {
      console.log('🧹 NEXT STEPS:')
      console.log('   1. Clear analytics cache: npx tsx scripts/clear-analytics-cache.ts')
      console.log('   2. Test LinkedIn data in dashboard')
      console.log('   3. If something went wrong, restore from backup:')
      console.log(`      ${this.backupFile}`)
    }

    if (this.dryRun && successful.length > 0) {
      console.log('🚀 Ready to apply fixes! Run without --dry-run to make changes.')
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('LinkedIn Organization ID Fix Script')
    console.log('\nUsage: npx tsx scripts/fix-linkedin-org-ids.ts [options]')
    console.log('\nOptions:')
    console.log('  --dry-run          Show what would be changed without making changes')
    console.log('  --company=NAME     Only fix the specified company')
    console.log('  --help, -h         Show this help message')
    console.log('\nExamples:')
    console.log('  npx tsx scripts/fix-linkedin-org-ids.ts --dry-run')
    console.log('  npx tsx scripts/fix-linkedin-org-ids.ts --company=Bytecurve')
    console.log('  npx tsx scripts/fix-linkedin-org-ids.ts')
    process.exit(0)
  }

  const dryRun = args.includes('--dry-run')
  const companyArg = args.find(arg => arg.startsWith('--company='))
  const targetCompany = companyArg ? companyArg.split('=')[1] : null

  const fixer = new LinkedInOrgIdFixer(dryRun, targetCompany)
  await fixer.fix()
}

if (require.main === module) {
  main().catch(console.error)
}