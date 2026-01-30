#!/usr/bin/env npx tsx

/**
 * LinkedIn Integration Diagnostic Tool
 * 
 * This script diagnoses LinkedIn integration issues for a specific company.
 * It checks:
 * 1. Database mappings and configurations
 * 2. OAuth token status and validity  
 * 3. LinkedIn API connectivity
 * 4. Organization ID correctness
 * 5. Alternative data sources (Google Sheets)
 * 
 * Usage: npx tsx scripts/linkedin-diagnostic.ts [companyName]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { OAuthTokenService } from '../lib/services/oauth-token-service'

// Load environment variables
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

interface DiagnosticResult {
  step: string
  status: 'success' | 'warning' | 'error' | 'info'
  message: string
  details?: any
}

class LinkedInDiagnostic {
  private results: DiagnosticResult[] = []
  private companyName: string

  constructor(companyName: string) {
    this.companyName = companyName
  }

  private log(step: string, status: DiagnosticResult['status'], message: string, details?: any) {
    this.results.push({ step, status, message, details })
    const icon = {
      success: '✅',
      warning: '⚠️ ',
      error: '❌',
      info: 'ℹ️ '
    }[status]
    console.log(`${icon} ${step}: ${message}`)
    if (details) {
      console.log('   Details:', typeof details === 'string' ? details : JSON.stringify(details, null, 2))
    }
  }

  async diagnose() {
    console.log(`\n🔍 LinkedIn Integration Diagnostic for "${this.companyName}"\n`)

    try {
      await this.step1_findCompany()
      await this.step2_checkLinkedInMapping()
      await this.step3_checkOAuthTokens()
      await this.step4_testTokenRefresh()
      await this.step5_testLinkedInAPI()
      await this.step6_checkSheetConfigs()
      await this.step7_checkAnalyticsCache()
      
      this.printSummary()
    } catch (error) {
      this.log('FATAL', 'error', `Diagnostic failed: ${error}`)
    }
  }

  private async step1_findCompany() {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', `%${this.companyName}%`)

    if (!companies || companies.length === 0) {
      this.log('Company Lookup', 'error', `No company found matching "${this.companyName}"`)
      return null
    }

    if (companies.length > 1) {
      this.log('Company Lookup', 'warning', `Multiple companies found matching "${this.companyName}"`, 
        companies.map(c => `${c.name} (${c.id})`))
    }

    const company = companies[0]
    this.log('Company Lookup', 'success', `Found company: ${company.name}`, { id: company.id })
    return company
  }

  private async step2_checkLinkedInMapping() {
    const company = await this.step1_findCompany()
    if (!company) return null

    const { data: mapping } = await supabase
      .from('company_linkedin_mappings')
      .select('*, linkedin_pages(*)')
      .eq('company_id', company.id)

    if (!mapping || mapping.length === 0) {
      this.log('LinkedIn Mapping', 'error', 'No LinkedIn page mapping found for this company')
      return null
    }

    const linkedInPage = mapping[0].linkedin_pages
    this.log('LinkedIn Mapping', 'success', `LinkedIn page mapped: ${linkedInPage.page_name}`, {
      pageId: linkedInPage.page_id,
      ownerUserId: linkedInPage.user_id,
      pageUrl: linkedInPage.page_url,
      isActive: linkedInPage.is_active
    })

    return { company, mapping: mapping[0], linkedInPage }
  }

  private async step3_checkOAuthTokens() {
    const result = await this.step2_checkLinkedInMapping()
    if (!result) return null

    const { linkedInPage } = result

    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', linkedInPage.user_id)
      .eq('provider', 'linkedin')

    if (!tokens || tokens.length === 0) {
      this.log('OAuth Tokens', 'error', 'No LinkedIn OAuth tokens found for page owner')
      return null
    }

    const token = tokens[0]
    const now = new Date()
    const expires = new Date(token.expires_at)
    const isExpired = now > expires
    const minutesUntilExpiry = Math.round((expires.getTime() - now.getTime()) / (60 * 1000))

    this.log('OAuth Tokens', isExpired ? 'warning' : 'success', 
      isExpired ? 'OAuth token is expired' : `OAuth token valid for ${minutesUntilExpiry} minutes`, {
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
      expiresAt: token.expires_at,
      scope: token.scope,
      linkedinOrgId: token.linkedin_organization_id,
      linkedinOrgName: token.linkedin_organization_name
    })

    return { ...result, token }
  }

  private async step4_testTokenRefresh() {
    const result = await this.step3_checkOAuthTokens()
    if (!result || !result.token) return null

    const { linkedInPage, token } = result

    try {
      this.log('Token Refresh', 'info', 'Testing LinkedIn token refresh...')
      
      const refreshResult = await OAuthTokenService.refreshLinkedInAccessTokenWithDetails(linkedInPage.user_id)
      
      if (refreshResult.success) {
        this.log('Token Refresh', 'success', 'Token refresh successful')
        return { ...result, refreshedToken: refreshResult.accessToken }
      } else {
        this.log('Token Refresh', 'error', 'Token refresh failed', {
          error: refreshResult.error,
          details: refreshResult.details
        })
        return result
      }
    } catch (error) {
      this.log('Token Refresh', 'error', `Token refresh error: ${error}`)
      return result
    }
  }

  private async step5_testLinkedInAPI() {
    const result = await this.step4_testTokenRefresh()
    if (!result) return null

    const { linkedInPage } = result
    const accessToken = 'refreshedToken' in result ? result.refreshedToken : null

    if (!accessToken) {
      this.log('LinkedIn API', 'error', 'No valid access token available for API testing')
      return result
    }

    try {
      // First, get the user's organizations to find the correct org ID
      this.log('LinkedIn API', 'info', 'Fetching user organizations...')
      
      const orgResponse = await fetch('https://api.linkedin.com/rest/organizations?q=administeredOrganization', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202404',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      })

      if (!orgResponse.ok) {
        const errorText = await orgResponse.text()
        this.log('LinkedIn API', 'error', `Failed to fetch organizations: ${orgResponse.status}`, errorText)
        return result
      }

      const orgData = await orgResponse.json()
      this.log('LinkedIn API', 'success', `Found ${orgData.elements?.length || 0} organizations`)

      if (!orgData.elements || orgData.elements.length === 0) {
        this.log('LinkedIn API', 'warning', 'User has no administered organizations')
        return result
      }

      // Look for the organization that matches the page
      const matchingOrg = orgData.elements.find((org: any) => 
        org.vanityName?.toLowerCase() === linkedInPage.page_id.toLowerCase() ||
        org.localizedName?.toLowerCase().includes(this.companyName.toLowerCase())
      )

      if (matchingOrg) {
        this.log('LinkedIn API', 'success', `Found matching organization: ${matchingOrg.localizedName}`, {
          correctOrgId: matchingOrg.id,
          vanityName: matchingOrg.vanityName,
          currentPageId: linkedInPage.page_id
        })

        // Test analytics API with the correct organization ID
        await this.testAnalyticsAPI(accessToken, matchingOrg.id)
      } else {
        this.log('LinkedIn API', 'warning', 'No organization matches the configured page ID', {
          configuredPageId: linkedInPage.page_id,
          availableOrgs: orgData.elements.map((org: any) => ({
            id: org.id,
            name: org.localizedName,
            vanity: org.vanityName
          }))
        })
      }

    } catch (error) {
      this.log('LinkedIn API', 'error', `API test failed: ${error}`)
    }

    return result
  }

  private async testAnalyticsAPI(accessToken: string, organizationId: string) {
    try {
      this.log('Analytics API', 'info', `Testing page statistics API with org ID: ${organizationId}`)

      // Test with a recent date range
      const endDate = Date.now()
      const startDate = endDate - (30 * 24 * 60 * 60 * 1000) // 30 days ago

      const apiUrl = `https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startDate}&timeIntervals.timeRange.end=${endDate}`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202404',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const elementsCount = data.elements?.length || 0
        const totalViews = data.elements?.reduce((sum: number, elem: any) => 
          sum + (elem.totalPageStatistics?.views?.allPageViews || 0), 0) || 0

        this.log('Analytics API', 'success', `Page statistics API successful`, {
          elementsReturned: elementsCount,
          totalPageViews: totalViews,
          dateRangeDays: 30
        })

        if (totalViews === 0) {
          this.log('Analytics API', 'warning', 'API returned successfully but all metrics are zero - this may be normal if there was no activity in the date range')
        }
      } else {
        const errorText = await response.text()
        this.log('Analytics API', 'error', `Page statistics API failed: ${response.status}`, errorText)
      }
    } catch (error) {
      this.log('Analytics API', 'error', `Analytics API test failed: ${error}`)
    }
  }

  private async step6_checkSheetConfigs() {
    const result = await this.step2_checkLinkedInMapping()
    if (!result) return

    const { company } = result

    const { data: sheetConfig } = await supabase
      .from('linkedin_sheet_configs')
      .select('*')
      .eq('company_id', company.id)

    if (!sheetConfig || sheetConfig.length === 0) {
      this.log('Sheet Config', 'info', 'No Google Sheets configuration found (this is optional)')
      return
    }

    const config = sheetConfig[0]
    const hasAnySheet = !!(config.page_analytics_sheet_id || 
                          config.post_analytics_sheet_id || 
                          config.campaign_analytics_sheet_id)

    this.log('Sheet Config', hasAnySheet ? 'success' : 'warning', 
      hasAnySheet ? 'Google Sheets configuration found' : 'Google Sheets configuration exists but no sheet IDs set', {
      pageAnalyticsSheet: config.page_analytics_sheet_id || 'Not set',
      postAnalyticsSheet: config.post_analytics_sheet_id || 'Not set',
      campaignAnalyticsSheet: config.campaign_analytics_sheet_id || 'Not set'
    })
  }

  private async step7_checkAnalyticsCache() {
    const result = await this.step2_checkLinkedInMapping()
    if (!result) return

    const { company } = result

    const { data: cache } = await supabase
      .from('analytics_cache')
      .select('*')
      .eq('company_id', company.id)
      .eq('data_type', 'all')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!cache || cache.length === 0) {
      this.log('Analytics Cache', 'info', 'No cached analytics data found')
      return
    }

    const entry = cache[0]
    const data = entry.data
    const hasLinkedInData = !!(data.liVisitorMetrics || data.liFollowerMetrics)

    this.log('Analytics Cache', hasLinkedInData ? 'success' : 'warning', 
      hasLinkedInData ? 'Cached LinkedIn data found' : 'Cache exists but no LinkedIn data', {
      cachedAt: entry.created_at,
      dateRange: `${entry.start_date} to ${entry.end_date}`,
      liDataSource: data.liDataSource,
      liError: data.liError,
      liErrorType: data.liErrorType,
      visitorMetrics: data.liVisitorMetrics
    })
  }

  private printSummary() {
    console.log('\n📊 DIAGNOSTIC SUMMARY\n')
    
    const successCount = this.results.filter(r => r.status === 'success').length
    const warningCount = this.results.filter(r => r.status === 'warning').length  
    const errorCount = this.results.filter(r => r.status === 'error').length

    console.log(`✅ ${successCount} successful checks`)
    console.log(`⚠️  ${warningCount} warnings`)
    console.log(`❌ ${errorCount} errors`)

    console.log('\n🔧 RECOMMENDATIONS\n')

    const hasAuthErrors = this.results.some(r => 
      r.message.includes('OAuth token is expired') || 
      r.message.includes('Token refresh failed') ||
      r.message.includes('refresh token is invalid')
    )

    const hasOrgIdIssue = this.results.some(r =>
      r.message.includes('No organization matches the configured page ID')
    )

    if (hasAuthErrors) {
      console.log('🔑 AUTHENTICATION ISSUE DETECTED')
      console.log('   → The LinkedIn OAuth tokens are expired or invalid')
      console.log('   → User needs to reconnect their LinkedIn account in the Integrations page')
      console.log('   → This explains why the dashboard shows zero values')
    }

    if (hasOrgIdIssue) {
      console.log('🆔 ORGANIZATION ID ISSUE DETECTED')  
      console.log('   → The configured page ID does not match a valid LinkedIn organization')
      console.log('   → The database may have an incorrect page_id (slug vs numeric ID)')
      console.log('   → This needs to be updated in the linkedin_pages table')
    }

    if (!hasAuthErrors && !hasOrgIdIssue && errorCount === 0) {
      console.log('✨ LinkedIn integration appears to be working correctly')
      console.log('   → If showing zero data, this may be normal for the selected date range')
      console.log('   → Consider checking a longer historical period')
    }
  }
}

async function main() {
  const companyName = process.argv[2] || 'Bytecurve'
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('LinkedIn Integration Diagnostic Tool')
    console.log('\nUsage: npx tsx scripts/linkedin-diagnostic.ts [companyName]')
    console.log('\nExample: npx tsx scripts/linkedin-diagnostic.ts Bytecurve')
    process.exit(0)
  }

  const diagnostic = new LinkedInDiagnostic(companyName)
  await diagnostic.diagnose()
}

if (require.main === module) {
  main().catch(console.error)
}