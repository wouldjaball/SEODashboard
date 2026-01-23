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
        .single()

      const { data: gscMapping } = await supabase
        .from('company_gsc_mappings')
        .select('gsc_site_id')
        .eq('company_id', company_id)
        .single()

      const { data: youtubeMapping } = await supabase
        .from('company_youtube_mappings')
        .select('youtube_channel_id')
        .eq('company_id', company_id)
        .single()

      const { data: linkedinMapping } = await supabase
        .from('company_linkedin_mappings')
        .select('linkedin_page_id')
        .eq('company_id', company_id)
        .single()

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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mappings } = await request.json()

    // Save mappings for each company
    for (const [companyId, mapping] of Object.entries(mappings)) {
      const { gaPropertyId, gscSiteId, youtubeChannelId, linkedinPageId } = mapping as {
        gaPropertyId: string;
        gscSiteId: string;
        youtubeChannelId: string;
        linkedinPageId: string
      }

      // Delete existing mappings first
      await supabase.from('company_ga_mappings').delete().eq('company_id', companyId)
      await supabase.from('company_gsc_mappings').delete().eq('company_id', companyId)
      await supabase.from('company_youtube_mappings').delete().eq('company_id', companyId)
      await supabase.from('company_linkedin_mappings').delete().eq('company_id', companyId)

      // Insert new mappings if provided
      if (gaPropertyId) {
        await supabase.from('company_ga_mappings').insert({
          company_id: companyId,
          ga_property_id: gaPropertyId
        })
      }

      if (gscSiteId) {
        await supabase.from('company_gsc_mappings').insert({
          company_id: companyId,
          gsc_site_id: gscSiteId
        })
      }

      if (youtubeChannelId) {
        await supabase.from('company_youtube_mappings').insert({
          company_id: companyId,
          youtube_channel_id: youtubeChannelId
        })
      }

      if (linkedinPageId) {
        await supabase.from('company_linkedin_mappings').insert({
          company_id: companyId,
          linkedin_page_id: linkedinPageId
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save mappings error:', error)
    return NextResponse.json({ error: 'Failed to save mappings' }, { status: 500 })
  }
}
