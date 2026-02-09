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

    console.log('[Companies API] === USER ACCESS DEBUG ===')
    console.log('[Companies API] User ID:', user.id)
    console.log('[Companies API] User email:', user.email)
    console.log('[Companies API] User metadata:', user.user_metadata)

    // Fetch user's companies with detailed logging
    const { data: userCompanies, error } = await supabase
      .from('user_companies')
      .select(`
        company_id,
        role,
        companies (*)
      `)
      .eq('user_id', user.id)

    console.log('[Companies API] User companies query result:')
    console.log('[Companies API] - Error:', error)
    console.log('[Companies API] - Data count:', userCompanies?.length || 0)
    console.log('[Companies API] - Raw data:', JSON.stringify(userCompanies, null, 2))

    if (error) {
      console.error('[Companies API] Error fetching user companies:', error)
      throw error
    }

    // If user has no company assignments, auto-assign them to all available companies
    if (!userCompanies || userCompanies.length === 0) {
      console.log('[Companies API] === AUTO-ASSIGNMENT TRIGGERED ===')
      console.log('[Companies API] User has no company assignments, starting auto-assignment process')
      
      // Get all companies using service client to bypass RLS
      const { data: allCompanies, error: allCompaniesError } = await serviceClient
        .from('companies')
        .select('id, name')

      console.log('[Companies API] Available companies for assignment:')
      console.log('[Companies API] - Error:', allCompaniesError)
      console.log('[Companies API] - Count:', allCompanies?.length || 0)
      console.log('[Companies API] - Companies:', allCompanies?.map(c => ({ id: c.id, name: c.name })))

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

        console.log('[Companies API] Creating assignments:', assignments)

        // Use upsert to handle potential race conditions
        const { data: insertResult, error: assignError } = await serviceClient
          .from('user_companies')
          .upsert(assignments, {
            onConflict: 'user_id, company_id',
            ignoreDuplicates: true
          })
          .select()

        if (assignError) {
          console.error('[Companies API] Failed to auto-assign user to companies:', assignError)
          console.error('[Companies API] Assignment details:', JSON.stringify(assignError, null, 2))
          
          // Try to proceed with existing assignments instead of failing completely
          console.log('[Companies API] Attempting to fetch any existing user companies despite assignment failure')
        } else {
          console.log('[Companies API] Successfully auto-assigned user to companies')
          console.log('[Companies API] Insert result:', insertResult?.length || 0, 'new assignments created')
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

        console.log('[Companies API] Service client verification after upsert:')
        console.log('[Companies API] - Error:', verifyError)
        console.log('[Companies API] - Count:', verifiedRows?.length || 0)

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

        console.log('[Companies API] Authenticated re-fetch after assignment:')
        console.log('[Companies API] - Error:', refetchError)
        console.log('[Companies API] - Count:', newUserCompanies?.length || 0)

        if (!refetchError && newUserCompanies && newUserCompanies.length > 0) {
          const companies = newUserCompanies.map(uc => ({
            ...uc.companies,
            role: uc.role
          }))
          console.log('[Companies API] Successfully returning', companies.length, 'companies after auto-assignment')
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

    console.log('[Companies API] === FINAL RESULT ===')
    console.log('[Companies API] Returning companies count:', companies.length)
    companies.forEach((company: any, index: number) => {
      console.log(`[Companies API] Company ${index + 1}: ID=${company.id}, Name="${company.name}", Role=${company.role}`)
    })

    // Final safety check: If we still have no companies, this is a critical issue
    if (companies.length === 0) {
      console.error('[Companies API] === CRITICAL: USER HAS NO COMPANY ACCESS ===')
      console.error('[Companies API] This user cannot access any companies, which should not happen')
      console.error('[Companies API] Recommend running diagnostic: GET /api/admin/user-access-diagnostic?userId=' + user.id)
      
      // Return error with helpful debug info instead of empty list
      return NextResponse.json({ 
        error: 'No company access',
        message: 'You do not have access to any companies. This may indicate a configuration issue.',
        debug: {
          userId: user.id,
          userEmail: user.email,
          diagnosticUrl: `/api/admin/user-access-diagnostic?userId=${user.id}`,
          suggestedAction: 'Contact your administrator to assign you to companies'
        }
      }, { status: 403 })
    }

    console.log('[Companies API] === END DEBUG ===')

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
