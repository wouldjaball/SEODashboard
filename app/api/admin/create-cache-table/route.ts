import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Manual table creation endpoint
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating portfolio_cache table via API...')
    
    // First, let's check if table exists
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'portfolio_cache')

    if (checkError) {
      console.log('Could not check existing tables, proceeding with creation...')
    }

    if (tables && tables.length > 0) {
      return NextResponse.json({
        message: 'Table already exists',
        tableExists: true
      })
    }

    // Try to create a simple test entry to see if table exists
    const { error: testError } = await supabase
      .from('portfolio_cache')
      .select('id')
      .limit(1)

    if (!testError) {
      return NextResponse.json({
        message: 'Table already exists and accessible',
        tableExists: true
      })
    }

    // Table doesn't exist, we need to create it via migration
    return NextResponse.json({
      message: 'Table does not exist. Please apply migration manually.',
      tableExists: false,
      migrationSQL: `
-- Run this SQL in your Supabase SQL editor:
CREATE TABLE IF NOT EXISTS portfolio_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_date DATE NOT NULL,
    companies_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    aggregate_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, cache_date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_id ON portfolio_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_date ON portfolio_cache(cache_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_date ON portfolio_cache(user_id, cache_date);

ALTER TABLE portfolio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolio cache" ON portfolio_cache
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own portfolio cache" ON portfolio_cache
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own portfolio cache" ON portfolio_cache
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own portfolio cache" ON portfolio_cache
    FOR DELETE USING (auth.uid() = user_id);
      `
    })

  } catch (error) {
    console.error('Table creation check failed:', error)
    return NextResponse.json({
      error: 'Failed to check/create table',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}