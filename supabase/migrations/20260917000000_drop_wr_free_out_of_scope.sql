-- WR-FREE was applied to this repository in error. It was never
-- intended for academy-builder. This migration removes every WR-FREE
-- table, function and enum landed by the two prior migrations
-- (20260908000000_t3a_wr_free_release.sql and
-- 20260916000000_t3a_wr_free_retention_and_signals.sql) along with
-- their triggers, policies and dependent grants.
--
-- Rollback is intentionally destructive: any rows that accumulated in
-- these tables are discarded. Those rows came from the erroneous
-- WR-FREE surface and have no meaning outside it.

set search_path = public;

DROP FUNCTION IF EXISTS public.t3a_wr_free_retention_status() CASCADE;
DROP FUNCTION IF EXISTS public.t3a_wr_free_get_signal_thresholds() CASCADE;
DROP FUNCTION IF EXISTS public.t3a_wr_free_grant_period(text) CASCADE;
DROP FUNCTION IF EXISTS public.t3a_wr_free_record_first_entry(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.t3a_wr_free_close_release(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.t3a_wr_free_record_event(
  public.t3a_wr_free_telemetry_kind, text, text, text, text, text
) CASCADE;

DROP TABLE IF EXISTS public.t3a_wr_free_telemetry_event CASCADE;
DROP TABLE IF EXISTS public.t3a_wr_free_feedback_response CASCADE;
DROP TABLE IF EXISTS public.t3a_wr_free_entitlement CASCADE;
DROP TABLE IF EXISTS public.t3a_wr_free_module CASCADE;
DROP TABLE IF EXISTS public.t3a_wr_free_release CASCADE;
DROP TABLE IF EXISTS public.t3a_wr_free_signal_threshold CASCADE;
DROP TABLE IF EXISTS public.t3a_wr_free_retention_config CASCADE;

DROP TYPE IF EXISTS public.t3a_wr_free_telemetry_kind CASCADE;
DROP TYPE IF EXISTS public.t3a_wr_free_entitlement_state CASCADE;
DROP TYPE IF EXISTS public.t3a_wr_free_release_state CASCADE;

NOTIFY pgrst, 'reload schema';
