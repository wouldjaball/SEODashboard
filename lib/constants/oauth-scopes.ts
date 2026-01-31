// OAuth scopes required for the application
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.manage.users.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
]

export const OAUTH_SCOPES_STRING = GOOGLE_OAUTH_SCOPES.join(' ')
