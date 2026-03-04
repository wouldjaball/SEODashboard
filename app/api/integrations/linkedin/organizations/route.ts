import { createClient, createServiceClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { LINKEDIN_API_VERSION, LINKEDIN_API_BASE } from '@/lib/constants/linkedin-oauth-scopes'

interface LinkedInOrganization {
  id: string
  name: string
  vanityName?: string
  logoUrl?: string
}

/**
 * GET: Fetch LinkedIn organizations the user has access to (any role)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get LinkedIn tokens
    const tokens = await OAuthTokenService.getLinkedInTokens(user.id)
    if (!tokens) {
      return NextResponse.json({ organizations: [], connected: false })
    }

    // LinkedIn roles that grant access to organization pages
    // Check all roles since user might have different access levels
    const roles = ['ADMINISTRATOR', 'CONTENT_ADMIN', 'DIRECT_SPONSORED_CONTENT_POSTER', 'LEAD_GEN_FORMS_MANAGER', 'RECRUITING_POSTER']

    const allOrganizations: LinkedInOrganization[] = []
    const seenOrgIds = new Set<string>()

    // Fetch organizations for each role and collect unique org IDs
    for (const role of roles) {
      try {
        const orgAclsResponse = await fetch(
          `${LINKEDIN_API_BASE}/organizationAcls?q=roleAssignee&role=${role}`,
          {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'LinkedIn-Version': LINKEDIN_API_VERSION,
              'X-Restli-Protocol-Version': '2.0.0'
            }
          }
        )

        if (orgAclsResponse.ok) {
          const orgAcls = await orgAclsResponse.json()
          console.log(`LinkedIn organization ACLs for role ${role}:`, orgAcls.elements?.length || 0)

          for (const elem of (orgAcls.elements || [])) {
            const orgUrn = elem.organization || ''
            const orgId = orgUrn.split(':').pop() || ''
            if (orgId && !seenOrgIds.has(orgId)) {
              seenOrgIds.add(orgId)
            }
          }
        } else {
          const status = orgAclsResponse.status
          if (status !== 403 && status !== 400) {
            console.error(`Failed to fetch LinkedIn organizations for role ${role}:`, await orgAclsResponse.text())
          }
        }
      } catch (roleError) {
        console.error(`Error fetching organizations for role ${role}:`, roleError)
      }
    }

    // Fetch details for each organization
    const headers = {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'LinkedIn-Version': LINKEDIN_API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0'
    }

    await Promise.all(Array.from(seenOrgIds).map(async (orgId) => {
      try {
        const orgResponse = await fetch(
          `${LINKEDIN_API_BASE}/organizations/${orgId}`,
          { headers }
        )

        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          allOrganizations.push({
            id: orgId,
            name: orgData.localizedName || 'Unknown Organization',
            vanityName: orgData.vanityName,
            logoUrl: undefined
          })
        } else {
          console.error(`Failed to fetch org details for ${orgId}:`, orgResponse.status)
          allOrganizations.push({ id: orgId, name: `Organization ${orgId}` })
        }
      } catch (err) {
        console.error(`Error fetching org details for ${orgId}:`, err)
        allOrganizations.push({ id: orgId, name: `Organization ${orgId}` })
      }
    }))

    console.log(`Total LinkedIn organizations found: ${allOrganizations.length}`)

    return NextResponse.json({ organizations: allOrganizations, connected: true })
  } catch (error) {
    console.error('Error fetching LinkedIn organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

/**
 * POST: Save a LinkedIn organization to the database
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, organizationName, companyId } = body

    if (!organizationId || !organizationName) {
      return NextResponse.json({ error: 'Organization ID and name required' }, { status: 400 })
    }

    const serviceClient = createServiceClient()

    // Check if organization already exists for this user (by numeric ID)
    const { data: existingPage } = await serviceClient
      .from('linkedin_pages')
      .select('id')
      .eq('user_id', user.id)
      .eq('page_id', organizationId)
      .maybeSingle()

    let pageDbId: string

    if (existingPage) {
      pageDbId = existingPage.id

      // Update the name if it changed
      await serviceClient
        .from('linkedin_pages')
        .update({ page_name: organizationName })
        .eq('id', pageDbId)
    } else {
      // Fallback: check for existing entry with vanity name (non-numeric page_id) matching by name
      // This handles cases like Transit Technologies where page_id was "transit-technologies" instead of numeric ID
      const { data: vanityMatch } = await serviceClient
        .from('linkedin_pages')
        .select('id, page_id')
        .eq('user_id', user.id)
        .ilike('page_name', organizationName)
        .maybeSingle()

      if (vanityMatch && !/^\d+$/.test(vanityMatch.page_id)) {
        // Update vanity name to correct numeric ID — preserves existing company_linkedin_mappings
        console.log(`Updating LinkedIn page vanity name "${vanityMatch.page_id}" → "${organizationId}" for "${organizationName}"`)
        await serviceClient
          .from('linkedin_pages')
          .update({ page_id: organizationId, page_name: organizationName })
          .eq('id', vanityMatch.id)
        pageDbId = vanityMatch.id
      } else {
        // Insert new LinkedIn page
        const { data: newPage, error: pageError } = await serviceClient
          .from('linkedin_pages')
          .insert({
            user_id: user.id,
            page_id: organizationId,
            page_name: organizationName,
            is_active: true
          })
          .select('id')
          .single()

        if (pageError) {
          console.error('Failed to insert LinkedIn page:', pageError)
          return NextResponse.json({ error: 'Failed to save organization' }, { status: 500 })
        }

        pageDbId = newPage.id
      }
    }

    // If companyId provided, create mapping
    if (companyId) {
      // Delete any existing mapping for this company
      await serviceClient
        .from('company_linkedin_mappings')
        .delete()
        .eq('company_id', companyId)

      // Create new mapping
      const { error: mappingError } = await serviceClient
        .from('company_linkedin_mappings')
        .insert({
          company_id: companyId,
          linkedin_page_id: pageDbId
        })

      if (mappingError) {
        console.error('Failed to create LinkedIn mapping:', mappingError)
        return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, pageId: pageDbId })
  } catch (error) {
    console.error('Error saving LinkedIn organization:', error)
    return NextResponse.json(
      { error: 'Failed to save organization' },
      { status: 500 }
    )
  }
}
