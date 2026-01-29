import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

/**
 * GET: List all LinkedIn connections for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = await OAuthTokenService.listLinkedInConnections(user.id)

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Error listing LinkedIn connections:', error)
    return NextResponse.json(
      { error: 'Failed to list connections' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove a LinkedIn connection
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 })
    }

    await OAuthTokenService.deleteLinkedInConnection(user.id, connectionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting LinkedIn connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}
