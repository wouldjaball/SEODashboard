import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
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

    // If user has no company assignments, auto-assign them to all available companies
    if (!userCompanies || userCompanies.length === 0) {
      console.log('[Companies API] User has no company assignments, auto-assigning to all companies')
      
      // Get all companies
      const { data: allCompanies, error: allCompaniesError } = await serviceClient
        .from('companies')
        .select('id')

      if (allCompaniesError) {
        throw allCompaniesError
      }

      if (allCompanies && allCompanies.length > 0) {
        // Create assignments for all companies with viewer role
        const assignments = allCompanies.map(company => ({
          user_id: user.id,
          company_id: company.id,
          role: 'viewer'
        }))

        const { error: assignError } = await serviceClient
          .from('user_companies')
          .insert(assignments)

        if (assignError) {
          console.error('[Companies API] Failed to auto-assign user to companies:', assignError)
        } else {
          console.log('[Companies API] Successfully auto-assigned user to', allCompanies.length, 'companies')
          
          // Re-fetch user companies after assignment
          const { data: newUserCompanies, error: refetchError } = await supabase
            .from('user_companies')
            .select(`
              company_id,
              role,
              companies (*)
            `)
            .eq('user_id', user.id)

          if (!refetchError && newUserCompanies) {
            const companies = newUserCompanies.map(uc => ({
              ...uc.companies,
              role: uc.role
            }))
            return NextResponse.json({ companies })
          }
        }
      }
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

    // Use service client to bypass RLS for company creation
    // This is needed because we need to create the company first,
    // then link the user to it, but RLS won't let us read the company
    // until the user is linked
    const serviceClient = createServiceClient()

    // Create company
    const { data: company, error: companyError } = await serviceClient
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
    const { error: userCompanyError } = await serviceClient
      .from('user_companies')
      .insert({
        user_id: user.id,
        company_id: company.id,
        role: 'owner'
      })

    if (userCompanyError) {
      // Clean up the company if we couldn't assign the user
      await serviceClient.from('companies').delete().eq('id', company.id)
      throw userCompanyError
    }

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
