-- Create portfolio_cache table for storing pre-computed analytics data
CREATE TABLE IF NOT EXISTS portfolio_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_date DATE NOT NULL,
    companies_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    aggregate_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one cache entry per user per date
    UNIQUE(user_id, cache_date)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_id ON portfolio_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_date ON portfolio_cache(cache_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_date ON portfolio_cache(user_id, cache_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_portfolio_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolio_cache_updated_at
    BEFORE UPDATE ON portfolio_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_cache_updated_at();

-- RLS Policies
ALTER TABLE portfolio_cache ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cache data
CREATE POLICY "Users can view their own portfolio cache" ON portfolio_cache
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own cache data
CREATE POLICY "Users can insert their own portfolio cache" ON portfolio_cache
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own cache data
CREATE POLICY "Users can update their own portfolio cache" ON portfolio_cache
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own cache data
CREATE POLICY "Users can delete their own portfolio cache" ON portfolio_cache
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all cache data (for cron jobs)
CREATE POLICY "Service role can manage all portfolio cache" ON portfolio_cache
    FOR ALL USING (current_user = 'service_role');