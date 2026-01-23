import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all mappings for user's companies
    const { data: companies } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)

    if (!companies) {
      return NextResponse.json({ mappings: {} })
    }

    const mappings: Record<string, { gaPropertyId: string; gscSiteId: string; youtubeChannelId: string; linkedinPageId: string }> = {}

    for (const { company_id } of companies) {
      const { data: gaMapping } = await supabase
        .from('company_ga_mappings')
        .select('ga_property_id')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: gscMapping } = await supabase
        .from('company_gsc_mappings')
        .select('gsc_site_id')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: youtubeMapping } = await supabase
        .from('company_youtube_mappings')
        .select('youtube_channel_id')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: linkedinMapping } = await supabase
        .from('company_linkedin_mappings')
        .select('linkedin_page_id')
        .eq('company_id', company_id)
        .maybeSingle()

      mappings[company_id] = {
        gaPropertyId: gaMapping?.ga_property_id || '',
        gscSiteId: gscMapping?.gsc_site_id || '',
        youtubeChannelId: youtubeMapping?.youtube_channel_id || '',
        linkedinPageId: linkedinMapping?.linkedin_page_id || ''
      }
    }

    return NextResponse.json({ mappings })
  } catch (error) {
    console.error('Fetch mappings error:', error)
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  console.log('=== POST /api/integrations/mappings called ===')
  try {
    const supabase = await createClient()
    console.log('Supabase client created')

    const { data: { user } } = await supabase.auth.getUser()
    console.log('User auth check:', user ? `User ID: ${user.id}` : 'No user')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received mappings request:', JSON.stringify(body, null, 2))

    const { mappings } = body

    if (!mappings || typeof mappings !== 'object') {
      return NextResponse.json({ error: 'Invalid mappings format' }, { status: 400 })
    }

    // Save mappings for each company
    for (const [companyId, mapping] of Object.entries(mappings)) {
      console.log(`Processing company ${companyId}:`, mapping)

      const { gaPropertyId, gscSiteId, youtubeChannelId, linkedinPageId } = mapping as {
        gaPropertyId: string;
        gscSiteId: string;
        youtubeChannelId: string;
        linkedinPageId: string
      }

      // Delete existing mappings first
      console.log(`Deleting existing mappings for company ${companyId}`)
      const { error: deleteGaError } = await supabase.from('company_ga_mappings').delete().eq('company_id', companyId)
      if (deleteGaError) console.error(`Delete GA mapping error:`, deleteGaError)

      const { error: deleteGscError } = await supabase.from('company_gsc_mappings').delete().eq('company_id', companyId)
      if (deleteGscError) console.error(`Delete GSC mapping error:`, deleteGscError)

      const { error: deleteYtError } = await supabase.from('company_youtube_mappings').delete().eq('company_id', companyId)
      if (deleteYtError) console.error(`Delete YouTube mapping error:`, deleteYtError)

      const { error: deleteLiError } = await supabase.from('company_linkedin_mappings').delete().eq('company_id', companyId)
      if (deleteLiError) console.error(`Delete LinkedIn mapping error:`, deleteLiError)

      // Insert new mappings if provided
      if (gaPropertyId) {
        const { error: gaError } = await supabase.from('company_ga_mappings').insert({
          company_id: companyId,
          ga_property_id: gaPropertyId
        })
        if (gaError) {
          console.error(`Failed to save GA mapping for company ${companyId}:`, gaError)
          throw gaError
        }
      }

      if (gscSiteId) {
        const { error: gscError } = await supabase.from('company_gsc_mappings').insert({
          company_id: companyId,
          gsc_site_id: gscSiteId
        })
        if (gscError) {
          console.error(`Failed to save GSC mapping for company ${companyId}:`, gscError)
          throw gscError
        }
      }

      if (youtubeChannelId) {
        const { error: ytError } = await supabase.from('company_youtube_mappings').insert({
          company_id: companyId,
          youtube_channel_id: youtubeChannelId
        })
        if (ytError) {
          console.error(`Failed to save YouTube mapping for company ${companyId}:`, ytError)
          throw ytError
        }
      }

      if (linkedinPageId) {
        const { error: liError } = await supabase.from('company_linkedin_mappings').insert({
          company_id: companyId,
          linkedin_page_id: linkedinPageId
        })
        if (liError) {
          console.error(`Failed to save LinkedIn mapping for company ${companyId}:`, liError)
          throw liError
        }
      }
    }

    console.log('All mappings saved successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('=== Save mappings error ===')
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('Error message:', errorMessage)
    console.error('Error stack:', errorDetails)

    return NextResponse.json({
      error: 'Failed to save mappings',
      details: errorMessage,
      message: errorMessage,
      fullError: String(error)
    }, { status: 500 })
  }
}
