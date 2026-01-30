import { createClient, createServiceClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'
import { LINKEDIN_API_VERSION } from '@/lib/constants/linkedin-oauth-scopes'

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

      // Try each role until we find an organization
      for (const role of roles) {
        if (identityInfo) break // Stop once we found an organization

        try {
          const orgAclsResponse = await fetch(
            `https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=${role}&projection=(elements*(organization~(localizedName,vanityName,id)))`,
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

            // Get the first organization the user has access to
            if (orgAcls.elements && orgAcls.elements.length > 0) {
              const firstOrg = orgAcls.elements[0]
              // Extract organization ID from URN (urn:li:organization:12345 -> 12345)
              const orgUrn = firstOrg.organization
              const orgId = orgUrn?.split(':').pop() || ''
              const orgDetails = firstOrg['organization~']

              identityInfo = {
                linkedinOrganizationId: orgId,
                linkedinOrganizationName: orgDetails?.localizedName || orgDetails?.vanityName
              }

              console.log(`Primary LinkedIn organization (role: ${role}):`, identityInfo)
            }
          } else {
            const status = orgAclsResponse.status
            if (status !== 403 && status !== 400) {
              console.error(`Failed to fetch LinkedIn organizations for role ${role}:`, await orgAclsResponse.text())
            }
          }
        } catch (roleError) {
          console.error(`Error fetching organizations for role ${role}:`, roleError)
          // Continue with other roles
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

    // Always save LinkedIn page to database when we have organization info
    let organizationMapped = false
    if (identityInfo?.linkedinOrganizationId && identityInfo?.linkedinOrganizationName) {
      try {
        console.log(`Saving LinkedIn organization ${identityInfo.linkedinOrganizationId} to linkedin_pages`)

        // Use service client to bypass RLS for this operation
        const serviceClient = createServiceClient()

        // Check if this organization already exists for this user
        const { data: existingPage } = await serviceClient
          .from('linkedin_pages')
          .select('id')
          .eq('user_id', user.id)
          .eq('page_id', identityInfo.linkedinOrganizationId)
          .maybeSingle()

        let pageDbId: string

        if (existingPage) {
          pageDbId = existingPage.id
          console.log('LinkedIn page already exists in database:', pageDbId)
        } else {
          // Insert the LinkedIn page
          const { data: newPage, error: pageError } = await serviceClient
            .from('linkedin_pages')
            .insert({
              user_id: user.id,
              page_id: identityInfo.linkedinOrganizationId,
              page_name: identityInfo.linkedinOrganizationName,
              is_active: true
            })
            .select('id')
            .single()

          if (pageError) {
            console.error('Failed to insert LinkedIn page:', pageError)
            throw pageError
          }

          pageDbId = newPage.id
          console.log('Created new LinkedIn page:', pageDbId)
        }

        // If we also have a target company, create the mapping
        if (oauthState.companyId) {
          // Delete any existing mapping for this company
          await serviceClient
            .from('company_linkedin_mappings')
            .delete()
            .eq('company_id', oauthState.companyId)

          // Create the mapping
          const { error: mappingError } = await serviceClient
            .from('company_linkedin_mappings')
            .insert({
              company_id: oauthState.companyId,
              linkedin_page_id: pageDbId
            })

          if (mappingError) {
            console.error('Failed to create LinkedIn mapping:', mappingError)
            throw mappingError
          }

          console.log(`Successfully mapped LinkedIn page ${pageDbId} to company ${oauthState.companyId}`)
          organizationMapped = true
        }
      } catch (pageError) {
        console.error('Failed to save LinkedIn organization:', pageError)
        // Continue anyway - tokens are saved
      }
    }

    // Determine redirect URL
    const successParams = new URLSearchParams({ success: 'true', provider: 'linkedin' })

    if (identityInfo?.linkedinOrganizationName) {
      successParams.set('organization', identityInfo.linkedinOrganizationName)
    }
    if (organizationMapped && oauthState.companyName) {
      successParams.set('mapped', 'true')
      successParams.set('company', oauthState.companyName)
    }

    return NextResponse.redirect(`${origin}${returnUrl}?${successParams}`)
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    return NextResponse.redirect(`${origin}${returnUrl}?error=token_exchange&provider=linkedin`)
  }
}
