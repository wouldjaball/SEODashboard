import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { LINKEDIN_API_VERSION } from '@/lib/constants/linkedin-oauth-scopes'

/**
 * GET: Lookup a LinkedIn organization by ID
 * Query params: id (organization ID from URL)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('id')

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Get LinkedIn tokens
    const tokens = await OAuthTokenService.getLinkedInTokens(user.id)
    if (!tokens) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 })
    }

    // Fetch organization details from LinkedIn API
    const orgResponse = await fetch(
      `https://api.linkedin.com/rest/organizations/${orgId}?projection=(localizedName,vanityName,logoV2(original~:playableStreams))`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'LinkedIn-Version': LINKEDIN_API_VERSION,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    )

    if (!orgResponse.ok) {
      const errorText = await orgResponse.text()
      console.error('LinkedIn org lookup failed:', orgResponse.status, errorText)

      if (orgResponse.status === 403) {
        return NextResponse.json({
          error: 'Access denied - you may not have permission to view this organization',
          status: 403
        }, { status: 403 })
      }
      if (orgResponse.status === 404) {
        return NextResponse.json({
          error: 'Organization not found',
          status: 404
        }, { status: 404 })
      }

      return NextResponse.json({ error: 'Failed to lookup organization' }, { status: 500 })
    }

    const orgData = await orgResponse.json()

    // Extract logo URL if available
    let logoUrl: string | undefined
    try {
      logoUrl = orgData?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier
    } catch {
      // No logo available
    }

    return NextResponse.json({
      id: orgId,
      name: orgData.localizedName || 'Unknown Organization',
      vanityName: orgData.vanityName,
      logoUrl
    })
  } catch (error) {
    console.error('Error looking up LinkedIn organization:', error)
    return NextResponse.json(
      { error: 'Failed to lookup organization' },
      { status: 500 }
    )
  }
}
