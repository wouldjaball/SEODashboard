import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Google and LinkedIn connections in parallel
    const [googleConnected, linkedinConnected] = await Promise.all([
      OAuthTokenService.hasValidTokens(user.id),
      OAuthTokenService.hasValidLinkedInTokens(user.id)
    ])

    return NextResponse.json({
      connected: googleConnected,  // Keep backward compatibility
      googleConnected,
      linkedinConnected
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
