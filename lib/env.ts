/**
 * Safely reads an environment variable, trimming any trailing whitespace/newlines.
 * Protects against corrupted env vars (e.g. Vercel dashboard adding trailing \n).
 */
export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name]
  if (value !== undefined && value !== '') return value.trim()
  return fallback ?? ''
}
