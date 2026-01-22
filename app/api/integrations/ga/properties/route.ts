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

    const accessToken = await OAuthTokenService.refreshAccessToken(user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    // Fetch accounts
    const accountsResponse = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch accounts')
    }

    const accountsData = await accountsResponse.json()
    const properties = []

    // Extract all properties from all accounts
    for (const account of accountsData.accountSummaries || []) {
      for (const propertySummary of account.propertySummaries || []) {
        const propertyId = propertySummary.property.split('/')[1]
        const property = {
          id: propertyId,
          propertyId: propertyId,
          displayName: propertySummary.displayName,
          accountId: account.account.split('/')[1],
          accountName: account.displayName
        }

        properties.push(property)

        // Save to database
        await supabase.from('ga_properties').upsert({
          user_id: user.id,
          property_id: propertyId,
          property_name: propertySummary.displayName,
          display_name: propertySummary.displayName,
          account_id: property.accountId,
          account_name: property.accountName
        }, {
          onConflict: 'user_id,property_id'
        })
      }
    }

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('Fetch properties error:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}
