-- T3A-DEV-INS-WR-FREE-001 · Section E.1 retention + Section 8 signal
-- thresholds — fail-closed placeholder configuration.
--
-- Both sections require founder-supplied values (retention interval,
-- signal thresholds). Neither can be defaulted safely: an assumed
-- retention window purges evidence we should have kept, and an
-- assumed signal threshold surfaces trend readings the founder did
-- not authorize.
--
-- This migration lands the CONFIG surfaces so admins can flip them
-- to values later without another migration. Until values are set,
-- every reader RPC refuses with a named reason. No purge job is
-- created. No signal is rendered.
--
-- Tables:
--   t3a_wr_free_retention_config  — singleton config row
--   t3a_wr_free_signal_threshold  — one row per named signal
--
-- Functions:
--   t3a_wr_free_retention_status()  → jsonb (status + reason)
--   t3a_wr_free_get_signal_thresholds() → jsonb
--
-- Vocabulary: this surface never renders a signal to a participant;
-- it is admin-only telemetry configuration.

set search_path = public;

-- ========================================================================
-- Prompt C · telemetry kind for mid-module abandonment
-- ========================================================================
-- Section 5.3 Prompt C fires when a participant leaves the tab or
-- navigates away mid-module. The runtime writes ONE row per session
-- via t3a_wr_free_record_event; this enum extension makes that value
-- storable. If the value is already present (idempotent apply), the
-- ADD VALUE is a no-op via IF NOT EXISTS.

DO $$
BEGIN
  ALTER TYPE public.t3a_wr_free_telemetry_kind
    ADD VALUE IF NOT EXISTS 'module_abandoned';
END $$;

-- ========================================================================
-- Retention config (singleton)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_retention_config (
  singleton smallint primary key check (singleton = 1) default 1,
  retention_days int,
  purge_enabled boolean not null default false,
  set_by uuid,
  set_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

INSERT INTO public.t3a_wr_free_retention_config (singleton, retention_days, purge_enabled)
VALUES (1, NULL, false)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.t3a_wr_free_retention_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_wr_free_retention_config_read" ON public.t3a_wr_free_retention_config;
CREATE POLICY "t3a_wr_free_retention_config_read"
  ON public.t3a_wr_free_retention_config FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_wr_free_retention_config_admin_write" ON public.t3a_wr_free_retention_config;
CREATE POLICY "t3a_wr_free_retention_config_admin_write"
  ON public.t3a_wr_free_retention_config FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_wr_free_retention_config TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_wr_free_retention_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.t3a_wr_free_retention_config%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.t3a_wr_free_retention_config WHERE singleton = 1;
  IF v_row.retention_days IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'RETENTION_UNSET',
      'note', 'Section E.1 value not set. No purge job runs.'
    );
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'retention_days', v_row.retention_days,
    'purge_enabled', v_row.purge_enabled,
    'set_at', v_row.set_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_wr_free_retention_status() FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_wr_free_retention_status() TO authenticated;

-- ========================================================================
-- Signal thresholds
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_signal_threshold (
  key text primary key,
  threshold jsonb,
  set_by uuid,
  set_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

-- Seed the known Section 8 signal keys with NULL thresholds so admins
-- see the surface even before values are set.
INSERT INTO public.t3a_wr_free_signal_threshold (key, note) VALUES
  ('completion_rate_by_module',       'Section 8 · signal completion_rate_by_module'),
  ('abandonment_rate_by_screen',      'Section 8 · signal abandonment_rate_by_screen'),
  ('return_visit_rate',               'Section 8 · signal return_visit_rate'),
  ('feedback_response_ratio',         'Section 8 · signal feedback_response_ratio')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.t3a_wr_free_signal_threshold ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_wr_free_signal_threshold_admin_only" ON public.t3a_wr_free_signal_threshold;
CREATE POLICY "t3a_wr_free_signal_threshold_admin_only"
  ON public.t3a_wr_free_signal_threshold FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.t3a_wr_free_get_signal_thresholds()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_row record;
  v_unset int := 0;
  v_set int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  FOR v_row IN
    SELECT key, threshold FROM public.t3a_wr_free_signal_threshold ORDER BY key
  LOOP
    v_out := v_out || jsonb_build_object(v_row.key, COALESCE(v_row.threshold, 'null'::jsonb));
    IF v_row.threshold IS NULL THEN
      v_unset := v_unset + 1;
    ELSE
      v_set := v_set + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'set_count', v_set,
    'unset_count', v_unset,
    'thresholds', v_out,
    'note', CASE WHEN v_unset > 0
                 THEN 'Some Section 8 signals have no threshold set. Renderers must refuse them.'
                 ELSE 'All Section 8 signals have thresholds set.'
            END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_wr_free_get_signal_thresholds() FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_wr_free_get_signal_thresholds() TO authenticated;

NOTIFY pgrst, 'reload schema';
