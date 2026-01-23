import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's companies
    const { data: userCompanies, error } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (*)
      `)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    const companies = userCompanies?.map(uc => ({
      ...uc.companies,
      role: uc.role
    })) || []

    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Fetch companies error:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, industry, color, logo_url } = body

    if (!name || !industry) {
      return NextResponse.json({ error: 'Name and industry are required' }, { status: 400 })
    }

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name,
        industry,
        color: color || '#3b82f6',
        logo_url
      })
      .select()
      .single()

    if (companyError) {
      throw companyError
    }

    // Assign user as owner of the company
    const { error: userCompanyError } = await supabase
      .from('user_companies')
      .insert({
        user_id: user.id,
        company_id: company.id,
        role: 'owner'
      })

    if (userCompanyError) {
      throw userCompanyError
    }

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
