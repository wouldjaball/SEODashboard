import { createClient } from '@/lib/supabase/server'
import { OAuthTokenService } from '@/lib/services/oauth-token-service'
import { NextResponse } from 'next/server'

// GET /api/integrations/connections - List all Google connections for the user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = await OAuthTokenService.listConnections(user.id)

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Failed to list connections:', error)
    return NextResponse.json({ error: 'Failed to list connections' }, { status: 500 })
  }
}

// DELETE /api/integrations/connections - Delete a specific connection
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    await OAuthTokenService.deleteConnection(user.id, connectionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete connection:', error)
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}
