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

    console.log('[Companies API] User:', user.id, user.email)

    // Fetch user's companies — try authenticated client first, fall back to service client
    const { data: userCompanies, error } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (*)
      `)
      .eq('user_id', user.id)

    if (error) {
      console.warn('[Companies API] Authenticated query failed, trying service client fallback:', error.message)

      // Fall back to service client (bypasses RLS)
      const { data: serviceCompanies, error: serviceError } = await serviceClient
        .from('user_companies')
        .select(`
          company_id,
          role,
          companies (*)
        `)
        .eq('user_id', user.id)

      if (serviceError) {
        console.error('[Companies API] Service client query also failed:', serviceError)
        throw serviceError
      }

      if (serviceCompanies && serviceCompanies.length > 0) {
        const companies = serviceCompanies.map(uc => ({
          ...uc.companies,
          role: uc.role
        }))
        console.warn('[Companies API] Returning', companies.length, 'companies via service client fallback (RLS issue)')
        return NextResponse.json({ companies })
      }

      // Service client found 0 rows — fall through to auto-assignment
    }

    // If user has no company assignments, auto-assign them to all available companies
    if (!userCompanies || userCompanies.length === 0) {
      console.log('[Companies API] No company assignments found, auto-assigning')

      // Get all companies using service client to bypass RLS
      const { data: allCompanies, error: allCompaniesError } = await serviceClient
        .from('companies')
        .select('id, name')

      if (allCompaniesError) {
        console.error('[Companies API] Error fetching all companies:', allCompaniesError)
        throw allCompaniesError
      }

      if (allCompanies && allCompanies.length > 0) {
        // Create assignments for all companies with viewer role
        const assignments = allCompanies.map(company => ({
          user_id: user.id,
          company_id: company.id,
          role: 'viewer'
        }))

        // Use upsert to handle potential race conditions
        const { data: insertResult, error: assignError } = await serviceClient
          .from('user_companies')
          .upsert(assignments, {
            onConflict: 'user_id, company_id',
            ignoreDuplicates: true
          })
          .select()

        if (assignError) {
          console.error('[Companies API] Auto-assign upsert failed:', assignError.message)
        } else {
          console.log('[Companies API] Auto-assigned', insertResult?.length || 0, 'companies')
        }

        // Verify the upsert worked using service client (bypasses RLS)
        const { data: verifiedRows, error: verifyError } = await serviceClient
          .from('user_companies')
          .select(`
            company_id,
            role,
            companies (*)
          `)
          .eq('user_id', user.id)

        if (verifyError || !verifiedRows || verifiedRows.length === 0) {
          console.error('[Companies API] Auto-assignment failed: service client sees 0 rows after upsert')
          return NextResponse.json({
            error: 'Auto-assignment failed',
            message: 'Could not assign you to companies. Please contact your administrator.'
          }, { status: 500 })
        }

        // Try re-fetch with authenticated client (respects RLS)
        const { data: newUserCompanies, error: refetchError } = await supabase
          .from('user_companies')
          .select(`
            company_id,
            role,
            companies (*)
          `)
          .eq('user_id', user.id)

        if (!refetchError && newUserCompanies && newUserCompanies.length > 0) {
          const companies = newUserCompanies.map(uc => ({
            ...uc.companies,
            role: uc.role
          }))
          return NextResponse.json({ companies })
        }

        // Fallback: authenticated client can't see rows but service client can (RLS issue)
        console.warn('[Companies API] RLS issue: service client sees rows but authenticated client does not. Falling back to service client data.')
        const fallbackCompanies = verifiedRows.map(uc => ({
          ...uc.companies,
          role: uc.role
        }))
        return NextResponse.json({ companies: fallbackCompanies })
      } else {
        console.warn('[Companies API] No companies found in database for auto-assignment')
        
        // Return empty result with helpful message
        return NextResponse.json({ 
          companies: [],
          message: 'No companies available in the system. Please contact your administrator.'
        })
      }
    }

    const companies = userCompanies?.map(uc => ({
      ...uc.companies,
      role: uc.role
    })) || []

    if (companies.length === 0) {
      console.error('[Companies API] User', user.email, 'has no company access')
      return NextResponse.json({
        error: 'No company access',
        message: 'You do not have access to any companies. Please contact your administrator.'
      }, { status: 403 })
    }

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
