-- Remove the auto-assign trigger that was causing user creation failures
-- The trigger conflicts with RLS policies (auth.uid() is NULL during trigger execution)
-- The invite flow already handles company assignments correctly

DROP TRIGGER IF EXISTS on_auth_user_created_assign_companies ON auth.users;

-- Keep the function in case needed later, but it won't be triggered
-- DROP FUNCTION IF EXISTS assign_new_user_to_all_companies();

COMMENT ON FUNCTION assign_new_user_to_all_companies IS 'DEPRECATED: No longer triggered automatically. Invite flow handles company assignments.';
