// Test LinkedIn Data Fetching for Transit
// Run with: node test-linkedin-fetch.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLinkedInData() {
  console.log('🔍 Testing LinkedIn Data for Transit...\n');

  try {
    // 1. Find Transit company
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', '%transit%');

    if (companyError) {
      console.error('❌ Error finding companies:', companyError);
      return;
    }

    if (!companies.length) {
      console.log('❌ No companies found with "transit" in name');
      return;
    }

    console.log('✅ Found companies:', companies);
    const transitCompany = companies[0];

    // 2. Check LinkedIn mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('company_linkedin_mappings')
      .select(`
        *,
        linkedin_pages (
          id,
          page_name,
          linkedin_page_id,
          user_id
        )
      `)
      .eq('company_id', transitCompany.id);

    if (mappingError) {
      console.error('❌ Error checking mapping:', mappingError);
      return;
    }

    if (!mapping.length) {
      console.log('❌ No LinkedIn mapping found for', transitCompany.name);
      console.log('💡 Need to set up LinkedIn page mapping first!');
      return;
    }

    console.log('✅ LinkedIn mapping found:', mapping);
    const linkedinPage = mapping[0].linkedin_pages;

    // 3. Check OAuth tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', linkedinPage.user_id)
      .eq('provider', 'linkedin');

    if (tokenError) {
      console.error('❌ Error checking tokens:', tokenError);
      return;
    }

    if (!tokens.length) {
      console.log('❌ No LinkedIn OAuth tokens found for user', linkedinPage.user_id);
      console.log('💡 User needs to re-authenticate with LinkedIn!');
      return;
    }

    const token = tokens[0];
    console.log('✅ OAuth token found, expires:', token.expires_at);

    // Check if expired
    const isExpired = new Date(token.expires_at) < new Date();
    if (isExpired) {
      console.log('⚠️  OAuth token is EXPIRED!');
      console.log('💡 User needs to re-authenticate with LinkedIn!');
      return;
    }

    // 4. Check recent cache
    const { data: cache, error: cacheError } = await supabase
      .from('analytics_cache')
      .select('*')
      .eq('company_id', transitCompany.id)
      .eq('data_type', 'daily_snapshot')
      .order('created_at', { ascending: false })
      .limit(1);

    if (cacheError) {
      console.error('❌ Error checking cache:', cacheError);
      return;
    }

    if (!cache.length) {
      console.log('❌ No analytics cache found');
      console.log('💡 Cron job may not be running or failing!');
      return;
    }

    const cachedData = cache[0];
    console.log('✅ Analytics cache found from:', cachedData.created_at);

    // Check LinkedIn data in cache
    const hasLinkedInData = !!(
      cachedData.cached_data?.liVisitorMetrics ||
      cachedData.cached_data?.liFollowerMetrics ||
      cachedData.cached_data?.liContentMetrics
    );

    if (hasLinkedInData) {
      console.log('✅ LinkedIn data found in cache!');
      console.log('📊 Available metrics:');
      
      if (cachedData.cached_data.liVisitorMetrics) {
        console.log('  - Visitor metrics:', cachedData.cached_data.liVisitorMetrics);
      }
      if (cachedData.cached_data.liFollowerMetrics) {
        console.log('  - Follower metrics:', cachedData.cached_data.liFollowerMetrics);
      }
      if (cachedData.cached_data.liContentMetrics) {
        console.log('  - Content metrics:', cachedData.cached_data.liContentMetrics);
      }
    } else {
      console.log('❌ No LinkedIn data in cache');
      console.log('💡 LinkedIn API may be failing in cron job!');
      
      if (cachedData.cached_data.liError) {
        console.log('🚨 LinkedIn error in cache:', cachedData.cached_data.liError);
      }
    }

    console.log('\n🎯 Summary:');
    console.log('- Company found:', !!transitCompany);
    console.log('- LinkedIn mapping:', !!mapping.length);
    console.log('- OAuth tokens:', !!tokens.length && !isExpired);
    console.log('- Cache exists:', !!cache.length);
    console.log('- LinkedIn data:', hasLinkedInData);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLinkedInData();