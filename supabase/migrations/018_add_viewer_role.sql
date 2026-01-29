-- Add 'viewer' to user_role enum
-- The UI allows selecting 'viewer' but it wasn't in the original enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
