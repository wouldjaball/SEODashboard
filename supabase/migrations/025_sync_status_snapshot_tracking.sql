-- Add snapshot refresh tracking to sync_status
-- Used to skip snapshot refreshes when no new daily data has been written

ALTER TABLE sync_status
ADD COLUMN IF NOT EXISTS last_snapshot_refresh_at TIMESTAMPTZ;

COMMENT ON COLUMN sync_status.last_snapshot_refresh_at IS 'When period snapshots were last refreshed for this company+platform. Used to skip unnecessary snapshot refreshes.';
