// LinkedIn OAuth 2.0 scopes for Community Management API
export const LINKEDIN_OAUTH_SCOPES = [
  'r_basicprofile',             // Basic profile info
  'r_organization_social',      // Read organization posts/engagement data
  'rw_organization_admin',      // Manage organization pages and reporting data
  'r_organization_followers',   // Access follower data
  'w_organization_social'       // Create/modify organization posts
]

export const LINKEDIN_OAUTH_SCOPES_STRING = LINKEDIN_OAUTH_SCOPES.join(' ')

// LinkedIn API version header - NOT used with v2 API
// The REST API requires versioning but v2 API works without it
export const LINKEDIN_API_VERSION = '' // Disabled - using v2 API

// LinkedIn OAuth endpoints  
export const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
export const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2' // Changed from /rest to /v2
