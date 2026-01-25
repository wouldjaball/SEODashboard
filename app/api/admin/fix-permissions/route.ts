import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/admin/fix-permissions - Grant aaron@salesmonsters.com owner access to all companies
export async function POST(request: Request) {
  try {
    const serviceClient = createServiceClient()

    // Get Aaron's user ID from auth.users
    const { data: { users }, error: userError } = await serviceClient.auth.admin.listUsers()

    if (userError) {
      console.error('Error listing users:', userError)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }

    const aaron = users.find(u => u.email === 'aaron@salesmonsters.com')
    if (!aaron) {
      return NextResponse.json({ error: 'User aaron@salesmonsters.com not found' }, { status: 404 })
    }

    console.log('Found Aaron:', aaron.id)

    // Get all companies
    const { data: companies, error: companyError } = await serviceClient
      .from('companies')
      .select('id, name')

    if (companyError) {
      console.error('Error fetching companies:', companyError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    console.log('Found companies:', companies?.length)

    // Upsert user_companies for each company
    const results: string[] = []
    for (const company of companies || []) {
      const { error } = await serviceClient
        .from('user_companies')
        .upsert({
          user_id: aaron.id,
          company_id: company.id,
          role: 'owner'
        }, {
          onConflict: 'user_id,company_id'
        })

      if (error) {
        console.error(`Error upserting for company ${company.name}:`, error)
        results.push(`❌ ${company.name}: ${error.message}`)
      } else {
        console.log('Granted owner access for:', company.name)
        results.push(`✅ ${company.name}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Granted aaron@salesmonsters.com owner access to ${companies?.length || 0} companies`,
      results
    })
  } catch (error) {
    console.error('Fix permissions error:', error)
    return NextResponse.json({ error: 'Failed to fix permissions' }, { status: 500 })
  }
}
