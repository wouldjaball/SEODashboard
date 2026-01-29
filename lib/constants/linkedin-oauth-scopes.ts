// LinkedIn OAuth 2.0 scopes for Community Management API
export const LINKEDIN_OAUTH_SCOPES = [
  'r_organization_social',      // Read organization posts/content
  'r_organization_admin',       // Admin access to organization
  'w_member_social',            // Write posts (future capability)
  'rw_organization_admin'       // Read/write organization admin
]

export const LINKEDIN_OAUTH_SCOPES_STRING = LINKEDIN_OAUTH_SCOPES.join(' ')

// LinkedIn API version header (dated version)
export const LINKEDIN_API_VERSION = '202601'

// LinkedIn OAuth endpoints
export const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
export const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest'
