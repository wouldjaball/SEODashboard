-- Normalized analytics tables for ETL-based data architecture
-- Replaces monolithic JSONB cache with daily-grain tables + period snapshots

-- ============================================================
-- 1. SYNC STATUS - Track sync health per company per platform
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('ga', 'gsc', 'youtube', 'linkedin')),
    sync_state TEXT DEFAULT 'pending' CHECK (sync_state IN ('pending', 'syncing', 'success', 'error')),
    last_sync_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    consecutive_failures INTEGER DEFAULT 0,
    data_start_date DATE,
    data_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_sync_status_company ON sync_status(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_state ON sync_status(sync_state);

-- ============================================================
-- 2. GOOGLE ANALYTICS - Daily metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS ga_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    avg_session_duration NUMERIC(10,2) DEFAULT 0,
    bounce_rate NUMERIC(7,6) DEFAULT 0,
    key_events INTEGER DEFAULT 0,
    user_key_event_rate NUMERIC(7,6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ga_daily_company_date ON ga_daily_metrics(company_id, date);

-- ============================================================
-- 3. GOOGLE ANALYTICS - Channel data (daily per channel)
-- ============================================================
CREATE TABLE IF NOT EXISTS ga_channel_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    channel TEXT NOT NULL,
    sessions INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, date, channel)
);

CREATE INDEX IF NOT EXISTS idx_ga_channel_company_date ON ga_channel_daily(company_id, date);

-- ============================================================
-- 4. GOOGLE ANALYTICS - Period snapshots (breakdown data as JSONB)
-- ============================================================
CREATE TABLE IF NOT EXISTS ga_period_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    traffic_share JSONB DEFAULT '[]'::jsonb,
    source_performance JSONB DEFAULT '[]'::jsonb,
    landing_pages JSONB DEFAULT '[]'::jsonb,
    regions JSONB DEFAULT '[]'::jsonb,
    devices JSONB DEFAULT '[]'::jsonb,
    gender JSONB DEFAULT '[]'::jsonb,
    age JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_ga_snapshot_company ON ga_period_snapshots(company_id, period_start, period_end);

-- ============================================================
-- 5. GOOGLE SEARCH CONSOLE - Daily metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS gsc_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr NUMERIC(7,6) DEFAULT 0,
    avg_position NUMERIC(6,2) DEFAULT 0,
    ranking_keywords INTEGER DEFAULT 0,
    indexed_pages INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_gsc_daily_company_date ON gsc_daily_metrics(company_id, date);

-- ============================================================
-- 6. GOOGLE SEARCH CONSOLE - Period snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS gsc_period_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    keywords JSONB DEFAULT '[]'::jsonb,
    landing_pages JSONB DEFAULT '[]'::jsonb,
    countries JSONB DEFAULT '[]'::jsonb,
    devices JSONB DEFAULT '[]'::jsonb,
    total_keywords INTEGER DEFAULT 0,
    total_indexed_pages INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_gsc_snapshot_company ON gsc_period_snapshots(company_id, period_start, period_end);

-- ============================================================
-- 7. YOUTUBE - Daily metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS yt_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    watch_time_seconds NUMERIC(12,2) DEFAULT 0,
    shares INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    subscribers_gained INTEGER DEFAULT 0,
    subscribers_lost INTEGER DEFAULT 0,
    avg_view_duration NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_yt_daily_company_date ON yt_daily_metrics(company_id, date);

-- ============================================================
-- 8. YOUTUBE - Period snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS yt_period_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    top_videos JSONB DEFAULT '[]'::jsonb,
    is_public_data_only BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_yt_snapshot_company ON yt_period_snapshots(company_id, period_start, period_end);

-- ============================================================
-- 9. LINKEDIN - Daily metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS li_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    desktop_visitors INTEGER DEFAULT 0,
    mobile_visitors INTEGER DEFAULT 0,
    organic_follower_gain INTEGER DEFAULT 0,
    paid_follower_gain INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    reactions INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_li_daily_company_date ON li_daily_metrics(company_id, date);

-- ============================================================
-- 10. LINKEDIN - Period snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS li_period_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    visitor_metrics JSONB DEFAULT '{}'::jsonb,
    follower_metrics JSONB DEFAULT '{}'::jsonb,
    content_metrics JSONB DEFAULT '{}'::jsonb,
    search_appearance_metrics JSONB DEFAULT '{}'::jsonb,
    industry_demographics JSONB DEFAULT '[]'::jsonb,
    seniority_demographics JSONB DEFAULT '[]'::jsonb,
    job_function_demographics JSONB DEFAULT '[]'::jsonb,
    company_size_demographics JSONB DEFAULT '[]'::jsonb,
    updates JSONB DEFAULT '[]'::jsonb,
    video_metrics JSONB,
    employee_advocacy_metrics JSONB,
    content_breakdown JSONB,
    social_listening JSONB,
    data_source TEXT DEFAULT 'api',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_li_snapshot_company ON li_period_snapshots(company_id, period_start, period_end);

-- ============================================================
-- 11. RLS POLICIES - All new tables
-- ============================================================

-- sync_status: Users can view sync status for their companies
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync status for their companies" ON sync_status
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages sync_status" ON sync_status
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ga_daily_metrics
ALTER TABLE ga_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GA daily metrics for their companies" ON ga_daily_metrics
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages ga_daily_metrics" ON ga_daily_metrics
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ga_channel_daily
ALTER TABLE ga_channel_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GA channel data for their companies" ON ga_channel_daily
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages ga_channel_daily" ON ga_channel_daily
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ga_period_snapshots
ALTER TABLE ga_period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GA snapshots for their companies" ON ga_period_snapshots
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages ga_period_snapshots" ON ga_period_snapshots
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- gsc_daily_metrics
ALTER TABLE gsc_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GSC daily metrics for their companies" ON gsc_daily_metrics
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages gsc_daily_metrics" ON gsc_daily_metrics
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- gsc_period_snapshots
ALTER TABLE gsc_period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GSC snapshots for their companies" ON gsc_period_snapshots
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages gsc_period_snapshots" ON gsc_period_snapshots
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- yt_daily_metrics
ALTER TABLE yt_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view YT daily metrics for their companies" ON yt_daily_metrics
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages yt_daily_metrics" ON yt_daily_metrics
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- yt_period_snapshots
ALTER TABLE yt_period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view YT snapshots for their companies" ON yt_period_snapshots
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages yt_period_snapshots" ON yt_period_snapshots
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- li_daily_metrics
ALTER TABLE li_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view LI daily metrics for their companies" ON li_daily_metrics
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages li_daily_metrics" ON li_daily_metrics
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- li_period_snapshots
ALTER TABLE li_period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view LI snapshots for their companies" ON li_period_snapshots
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'client', 'viewer')
        )
    );

CREATE POLICY "Service role manages li_period_snapshots" ON li_period_snapshots
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 12. Updated_at trigger for sync_status
-- ============================================================
CREATE OR REPLACE FUNCTION update_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_status_updated_at
    BEFORE UPDATE ON sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_status_updated_at();

-- Log migration
DO $$
BEGIN
    RAISE NOTICE 'Created normalized analytics tables for ETL-based architecture';
    RAISE NOTICE 'Tables: sync_status, ga_daily_metrics, ga_channel_daily, ga_period_snapshots';
    RAISE NOTICE 'Tables: gsc_daily_metrics, gsc_period_snapshots';
    RAISE NOTICE 'Tables: yt_daily_metrics, yt_period_snapshots';
    RAISE NOTICE 'Tables: li_daily_metrics, li_period_snapshots';
    RAISE NOTICE 'All tables have RLS policies and indexes';
END $$;
