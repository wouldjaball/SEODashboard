import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { LINKEDIN_API_VERSION, LINKEDIN_API_BASE } from '@/lib/constants/linkedin-oauth-scopes'

// Parse OAuth state parameter
interface OAuthState {
  companyId?: string
  companyName?: string
  returnTo?: string
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Parse state parameter if present
  let oauthState: OAuthState = {}
  if (stateParam) {
    try {
      oauthState = JSON.parse(stateParam)
      console.log('LinkedIn OAuth state:', oauthState)
    } catch {
      console.log('Could not parse LinkedIn OAuth state:', stateParam)
    }
  }

  const returnUrl = oauthState.returnTo || '/admin/accounts'

  // Handle OAuth errors from LinkedIn
  if (error) {
    console.error('LinkedIn OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}${returnUrl}?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}&provider=linkedin`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${returnUrl}?error=no_code&provider=linkedin`)
  }

  try {
    console.log('LinkedIn OAuth callback - exchanging code for tokens')

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_OAUTH_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_OAUTH_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/auth/linkedin/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('LinkedIn token exchange failed:', errorText)
      throw new Error(`Failed to exchange code for tokens: ${errorText}`)
    }

    const tokens = await tokenResponse.json()
    console.log('LinkedIn tokens received successfully')

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('No user found in session')
      return NextResponse.redirect(`${origin}/auth/login`)
    }

    console.log('Saving LinkedIn tokens for user:', user.id)

    // Fetch organizations the user has access to (check multiple roles)
    let identityInfo: {
      linkedinOrganizationId: string
      linkedinOrganizationName?: string
    } | undefined

    try {
      // LinkedIn roles that grant access to organization pages
      const roles = ['ADMINISTRATOR', 'CONTENT_ADMIN', 'DIRECT_SPONSORED_CONTENT_POSTER', 'LEAD_GEN_FORMS_MANAGER', 'RECRUITING_POSTER']

      // Try each role until we find an organization ID
      let firstOrgId = ''
      for (const role of roles) {
        if (firstOrgId) break

        try {
          const orgAclsResponse = await fetch(
            `${LINKEDIN_API_BASE}/organizationAcls?q=roleAssignee&role=${role}`,
            {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'LinkedIn-Version': LINKEDIN_API_VERSION,
                'X-Restli-Protocol-Version': '2.0.0'
              }
            }
          )

          if (orgAclsResponse.ok) {
            const orgAcls = await orgAclsResponse.json()
            console.log(`LinkedIn organization ACLs for role ${role}:`, orgAcls.elements?.length || 0)

            if (orgAcls.elements && orgAcls.elements.length > 0) {
              const orgUrn = orgAcls.elements[0].organization
              firstOrgId = orgUrn?.split(':').pop() || ''
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

      // Fetch org details separately
      if (firstOrgId) {
        try {
          const orgResponse = await fetch(
            `${LINKEDIN_API_BASE}/organizations/${firstOrgId}`,
            {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'LinkedIn-Version': LINKEDIN_API_VERSION,
                'X-Restli-Protocol-Version': '2.0.0'
              }
            }
          )

          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            identityInfo = {
              linkedinOrganizationId: firstOrgId,
              linkedinOrganizationName: orgData.localizedName || orgData.vanityName
            }
            console.log('Primary LinkedIn organization:', identityInfo)
          } else {
            identityInfo = { linkedinOrganizationId: firstOrgId }
            console.log('Got org ID but could not fetch name:', firstOrgId)
          }
        } catch (detailError) {
          identityInfo = { linkedinOrganizationId: firstOrgId }
          console.error('Error fetching org details:', detailError)
        }
      }
    } catch (identityError) {
      console.error('Failed to fetch LinkedIn organization info:', identityError)
      // Continue without organization info - tokens will still be saved
    }

    // Save encrypted tokens with organization information
    await OAuthTokenService.saveLinkedInTokens(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in || 5184000, // Default 60 days
      scope: tokens.scope
    }, identityInfo)

    console.log('LinkedIn tokens saved successfully with organization:', identityInfo?.linkedinOrganizationId)

    // Determine redirect URL
    const successParams = new URLSearchParams({ success: 'true', provider: 'linkedin' })

    // If we have a target company, redirect to org selection dialog instead of auto-mapping
    // This lets the user choose which LinkedIn organization to map to the company
    if (oauthState.companyId) {
      successParams.set('pendingMapping', 'true')
      successParams.set('companyId', oauthState.companyId)
      if (oauthState.companyName) {
        successParams.set('companyName', oauthState.companyName)
      }
      console.log(`LinkedIn OAuth complete - redirecting to org selection for company ${oauthState.companyId}`)
    } else if (identityInfo?.linkedinOrganizationName) {
      // General connection (no company target) - just show success message
      successParams.set('organization', identityInfo.linkedinOrganizationName)
    }

    return NextResponse.redirect(`${origin}${returnUrl}?${successParams}`)
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    return NextResponse.redirect(`${origin}${returnUrl}?error=token_exchange&provider=linkedin`)
  }
}
