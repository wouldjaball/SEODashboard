import { createClient, createServiceClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { LINKEDIN_API_VERSION } from '@/lib/constants/linkedin-oauth-scopes'

interface LinkedInOrganization {
  id: string
  name: string
  vanityName?: string
  logoUrl?: string
}

/**
 * GET: Fetch LinkedIn organizations the user has admin access to
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

    // Fetch organizations from LinkedIn API
    const orgAclsResponse = await fetch(
      'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,vanityName,id,logoV2(original~:playableStreams))))',
      {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'LinkedIn-Version': LINKEDIN_API_VERSION,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    )

    if (!orgAclsResponse.ok) {
      console.error('Failed to fetch LinkedIn organizations:', await orgAclsResponse.text())
      return NextResponse.json({ organizations: [], connected: true, error: 'Failed to fetch organizations' })
    }

    const orgAcls = await orgAclsResponse.json()

    const organizations: LinkedInOrganization[] = (orgAcls.elements || []).map((elem: {
      organization?: string,
      'organization~'?: {
        localizedName?: string,
        vanityName?: string,
        id?: number,
        'logoV2'?: { 'original~'?: { elements?: Array<{ identifiers?: Array<{ identifier?: string }> }> } }
      }
    }) => {
      const orgUrn = elem.organization || ''
      const orgId = orgUrn.split(':').pop() || ''
      const orgDetails = elem['organization~']

      // Try to extract logo URL
      let logoUrl: string | undefined
      try {
        logoUrl = orgDetails?.['logoV2']?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier
      } catch {
        // No logo available
      }

      return {
        id: orgId,
        name: orgDetails?.localizedName || 'Unknown Organization',
        vanityName: orgDetails?.vanityName,
        logoUrl
      }
    })

    return NextResponse.json({ organizations, connected: true })
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

    // Check if organization already exists for this user
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
