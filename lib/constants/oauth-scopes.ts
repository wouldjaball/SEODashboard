// OAuth scopes required for the application
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly'
]

export const OAUTH_SCOPES_STRING = GOOGLE_OAUTH_SCOPES.join(' ')
