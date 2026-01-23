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
      // Join with the actual properties/sites/channels/pages tables to get the property_id/site_url values
      const { data: gaMapping } = await supabase
        .from('company_ga_mappings')
        .select('ga_properties(property_id)')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: gscMapping } = await supabase
        .from('company_gsc_mappings')
        .select('gsc_sites(site_url)')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: youtubeMapping } = await supabase
        .from('company_youtube_mappings')
        .select('youtube_channels(channel_id)')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: linkedinMapping } = await supabase
        .from('company_linkedin_mappings')
        .select('linkedin_pages(page_id)')
        .eq('company_id', company_id)
        .maybeSingle()

      mappings[company_id] = {
        gaPropertyId: (gaMapping?.ga_properties as any)?.property_id || '',
        gscSiteId: (gscMapping?.gsc_sites as any)?.site_url || '',
        youtubeChannelId: (youtubeMapping?.youtube_channels as any)?.channel_id || '',
        linkedinPageId: (linkedinMapping?.linkedin_pages as any)?.page_id || ''
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
      // Note: The IDs passed from the frontend are the property_id/site_url/channel_id/page_id strings,
      // but we need to look up the UUID from the respective tables to use as foreign keys

      if (gaPropertyId) {
        // Look up the UUID for this GA property
        console.log(`Looking up GA property with property_id: ${gaPropertyId}`)
        const { data: gaProperty, error: gaLookupError } = await supabase
          .from('ga_properties')
          .select('id')
          .eq('property_id', gaPropertyId)
          .single()

        console.log(`GA property lookup result:`, { gaProperty, gaLookupError })

        if (gaLookupError || !gaProperty) {
          console.error(`GA property not found for property_id ${gaPropertyId}:`, gaLookupError)
          throw new Error(`GA property ${gaPropertyId} not found. Please refresh the properties list on the Integrations page.`)
        }

        console.log(`Inserting GA mapping: company_id=${companyId}, ga_property_id=${gaProperty.id}`)
        const { error: gaError } = await supabase.from('company_ga_mappings').insert({
          company_id: companyId,
          ga_property_id: gaProperty.id
        })
        if (gaError) {
          console.error(`Failed to save GA mapping for company ${companyId}:`, gaError)
          throw gaError
        }
        console.log(`Successfully saved GA mapping for company ${companyId}`)
      }

      if (gscSiteId) {
        // Look up the UUID for this GSC site
        const { data: gscSite, error: gscLookupError } = await supabase
          .from('gsc_sites')
          .select('id')
          .eq('site_url', gscSiteId)
          .single()

        if (gscLookupError || !gscSite) {
          console.error(`GSC site not found for site_url ${gscSiteId}:`, gscLookupError)
          throw new Error(`GSC site ${gscSiteId} not found. Please refresh the sites list.`)
        }

        const { error: gscError } = await supabase.from('company_gsc_mappings').insert({
          company_id: companyId,
          gsc_site_id: gscSite.id
        })
        if (gscError) {
          console.error(`Failed to save GSC mapping for company ${companyId}:`, gscError)
          throw gscError
        }
      }

      if (youtubeChannelId) {
        // Look up the UUID for this YouTube channel
        const { data: ytChannel, error: ytLookupError } = await supabase
          .from('youtube_channels')
          .select('id')
          .eq('channel_id', youtubeChannelId)
          .single()

        if (ytLookupError || !ytChannel) {
          console.error(`YouTube channel not found for channel_id ${youtubeChannelId}:`, ytLookupError)
          throw new Error(`YouTube channel ${youtubeChannelId} not found. Please add it first.`)
        }

        const { error: ytError } = await supabase.from('company_youtube_mappings').insert({
          company_id: companyId,
          youtube_channel_id: ytChannel.id
        })
        if (ytError) {
          console.error(`Failed to save YouTube mapping for company ${companyId}:`, ytError)
          throw ytError
        }
      }

      if (linkedinPageId) {
        // Look up the UUID for this LinkedIn page
        const { data: liPage, error: liLookupError } = await supabase
          .from('linkedin_pages')
          .select('id')
          .eq('page_id', linkedinPageId)
          .single()

        if (liLookupError || !liPage) {
          console.error(`LinkedIn page not found for page_id ${linkedinPageId}:`, liLookupError)
          throw new Error(`LinkedIn page ${linkedinPageId} not found. Please add it first.`)
        }

        const { error: liError } = await supabase.from('company_linkedin_mappings').insert({
          company_id: companyId,
          linkedin_page_id: liPage.id
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
