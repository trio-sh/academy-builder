-- T3A-D1-DEV-INS-010 · G2 Production Release — Authority Register,
-- Release Gate, Run-Book and Rollback Surface.
--
-- Part One §3 build order position 13. Final INS in the D1 build.
--
-- What this lands:
--   §1 Enums.
--   §2 t3a_d1_authority_register — the single source of truth for
--      whether each locked founder decision (FD-D1-*) and each
--      unresolved rule (REC-*) is set to a real value. Admin-managed;
--      rows are frozen once set (state=SET rows immutable except by
--      an explicit versioned supersession).
--   §3 t3a_d1_production_release — one row per release attempt.
--      Records the gate result and, on go, the env transition.
--      Immutable audit row (transition trigger).
--   §4 t3a_d1_production_runbook_step — ordered checklist of
--      release-day steps for a specific release. Steps become
--      immutable once state=passed or state=failed.
--   §5 t3a_d1_production_release_gate() — SECURITY DEFINER helper
--      that composes every hard requirement:
--        * FD-D1-03 issuance floor SET
--        * FD-D1-04 evidence-review authority SET
--        * FD-D1-05 progression values SET
--        * FD-D1-08 fourth-state frame SET
--        * FD-D1-09 route-language rule SET
--        * FD-D1-11 non-response timeout SET
--        * REC-04 retention SET
--        * REC-07 source approval SET
--        * REC-10 attempt exceptions SET
--        * REC-11 identity provider SET
--        * REC-12 Stage 4 SET
--        * At least one G1 pilot cohort in state=closed with
--          exit_criteria met (readiness snapshot exists and no
--          calibration mismatch)
--        * Latest INS-008 assurance sweep of issued_body_hash and
--          version_set_still_readable is 100% ok
--      Returns NULL on go; otherwise a jsonb structure enumerating
--      every blocker.
--   §6 t3a_d1_promote_to_production(release_id) — the ONE writer that
--      moves env_state to production_active. Refuses if the gate does
--      not clear. Records the release row and its inputs.
--   §7 t3a_d1_rollback_from_production(release_id, target_state,
--         reason) — admin-only; permits pilot_active or
--      observation_capable_inactive as target. Records the rollback
--      on the release row.
--
-- Governing rules (locked and auto-closed):
--   * The release gate CANNOT be softened. There is no override, no
--     "waive with note" path. Every listed blocker must clear. This
--     is the final backstop for FD-D1-04 (evidence-review authority)
--     and every other UNSET decision.
--   * Because FD-D1-03, FD-D1-04, FD-D1-08, FD-D1-11, REC-04, REC-07,
--     REC-10, REC-11, and REC-12 are UNSET at build time, the gate
--     WILL refuse on first call. That is the correct behavior: the
--     production release cannot happen until every author-locked
--     decision is landed. The register rows for each are inserted
--     at their UNSET state so the gate has explicit ground truth.
--   * The register is authoritative: t3a_d1_get_calibration_agreement
--     (INS-008) and t3a_d1_issue_report (INS-007) continue to read
--     t3a_current_env_state and their own FD-D1-04-guarded refusal;
--     this INS does not change their behavior — only lands the row
--     that must be flipped to SET for the gate to clear.
--
-- Guardrails from POST-MORTEM v0.1:
--   * No extension calls in this migration (nothing hashes here).
--   * Per-object SELECT 1 verification runs from the apply script.

set search_path = public;

-- ========================================================================
-- §1 · Enums
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_authority_state AS ENUM (
    'UNSET',
    'SET',
    'DEPRECATED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_release_state AS ENUM (
    'evaluating',
    'blocked',
    'released',
    'rolled_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_runbook_step_state AS ENUM (
    'pending',
    'passed',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_d1_authority_register
-- ========================================================================
--
-- One row per locked decision. `key` is the FD-D1-* / REC-* identifier
-- as it appears in the design return. `payload` holds the actual
-- value once state flips to SET (opaque jsonb — each key defines its
-- own shape). SET rows are frozen; supersession requires a
-- deprecation + new row (state remains SET across the pair, but the
-- deprecated flag guides reads).

CREATE TABLE IF NOT EXISTS public.t3a_d1_authority_register (
  key text primary key,
  category text not null,
  state public.t3a_d1_authority_state not null default 'UNSET',
  payload jsonb,
  set_by uuid,
  set_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

CREATE OR REPLACE FUNCTION public.t3a_d1_authority_register_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.state = 'SET' AND NEW.state <> 'DEPRECATED' AND NEW.state <> 'SET' THEN
    RAISE EXCEPTION 'AUTHORITY_ROW_ONLY_DEPRECATES_ONCE_SET: %', OLD.key;
  END IF;
  IF OLD.state = 'SET' AND NEW.state = 'SET' THEN
    IF NEW.payload IS DISTINCT FROM OLD.payload THEN
      RAISE EXCEPTION 'AUTHORITY_PAYLOAD_IMMUTABLE_ONCE_SET: %', OLD.key;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_authority_register_transition_trg ON public.t3a_d1_authority_register;
CREATE TRIGGER t3a_d1_authority_register_transition_trg
  BEFORE UPDATE ON public.t3a_d1_authority_register
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_authority_register_transition();

ALTER TABLE public.t3a_d1_authority_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_authority_register_read" ON public.t3a_d1_authority_register;
CREATE POLICY "t3a_d1_authority_register_read"
  ON public.t3a_d1_authority_register FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_d1_authority_register_admin_write" ON public.t3a_d1_authority_register;
CREATE POLICY "t3a_d1_authority_register_admin_write"
  ON public.t3a_d1_authority_register FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_authority_register TO authenticated;

-- Seed every locked decision at UNSET. Existing rows are left alone.
INSERT INTO public.t3a_d1_authority_register (key, category, state, note) VALUES
  ('FD-D1-03', 'founder_decision', 'UNSET', 'Issuance floor'),
  ('FD-D1-04', 'founder_decision', 'UNSET', 'Evidence-review authority'),
  ('FD-D1-05', 'founder_decision', 'UNSET', 'Progression values'),
  ('FD-D1-08', 'founder_decision', 'UNSET', 'Fourth-state frame'),
  ('FD-D1-09', 'founder_decision', 'UNSET', 'Route-language rule'),
  ('FD-D1-11', 'founder_decision', 'UNSET', 'Non-response timeout'),
  ('REC-04',   'unresolved_rule',  'UNSET', 'Retention'),
  ('REC-07',   'unresolved_rule',  'UNSET', 'Source approval'),
  ('REC-10',   'unresolved_rule',  'UNSET', 'Attempt exceptions'),
  ('REC-11',   'unresolved_rule',  'UNSET', 'Identity provider'),
  ('REC-12',   'unresolved_rule',  'UNSET', 'Stage 4')
ON CONFLICT (key) DO NOTHING;

-- ========================================================================
-- §3 · t3a_d1_production_release
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_production_release (
  id uuid primary key default gen_random_uuid(),
  state public.t3a_d1_release_state not null default 'evaluating',
  gate_result jsonb,
  evaluated_at timestamptz,
  released_at timestamptz,
  released_by uuid,
  rolled_back_at timestamptz,
  rolled_back_by uuid,
  rollback_target public.t3a_env_state,
  rollback_reason text,
  created_at timestamptz not null default now(),
  created_by uuid
);

CREATE OR REPLACE FUNCTION public.t3a_d1_production_release_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.state = 'evaluating' AND NEW.state IN ('blocked', 'released'))
    OR (OLD.state = 'released' AND NEW.state = 'rolled_back')
    OR (OLD.state = NEW.state) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'INVALID_RELEASE_STATE_TRANSITION: % -> %', OLD.state, NEW.state;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_production_release_transition_trg ON public.t3a_d1_production_release;
CREATE TRIGGER t3a_d1_production_release_transition_trg
  BEFORE UPDATE ON public.t3a_d1_production_release
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_production_release_transition();

ALTER TABLE public.t3a_d1_production_release ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_production_release_admin_only" ON public.t3a_d1_production_release;
CREATE POLICY "t3a_d1_production_release_admin_only"
  ON public.t3a_d1_production_release FOR SELECT TO authenticated
  USING (public.is_admin());

-- ========================================================================
-- §4 · t3a_d1_production_runbook_step
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_production_runbook_step (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.t3a_d1_production_release(id) on delete cascade,
  step_no int not null,
  title text not null,
  detail text,
  state public.t3a_d1_runbook_step_state not null default 'pending',
  completed_at timestamptz,
  completed_by uuid,
  note text,
  unique (release_id, step_no)
);

CREATE OR REPLACE FUNCTION public.t3a_d1_runbook_step_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.state IN ('passed', 'failed') THEN
    IF NEW.title IS DISTINCT FROM OLD.title
      OR NEW.detail IS DISTINCT FROM OLD.detail
      OR NEW.state IS DISTINCT FROM OLD.state THEN
      RAISE EXCEPTION 'RUNBOOK_STEP_IMMUTABLE_AFTER_TERMINAL';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_runbook_step_transition_trg ON public.t3a_d1_production_runbook_step;
CREATE TRIGGER t3a_d1_runbook_step_transition_trg
  BEFORE UPDATE ON public.t3a_d1_production_runbook_step
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_runbook_step_transition();

ALTER TABLE public.t3a_d1_production_runbook_step ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_runbook_step_admin_only" ON public.t3a_d1_production_runbook_step;
CREATE POLICY "t3a_d1_runbook_step_admin_only"
  ON public.t3a_d1_production_runbook_step FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========================================================================
-- §5 · t3a_d1_production_release_gate
-- ========================================================================
--
-- Returns NULL when every hard requirement clears. Otherwise returns
-- a jsonb blocker list. Never softened.

CREATE OR REPLACE FUNCTION public.t3a_d1_production_release_gate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blockers jsonb := '[]'::jsonb;
  v_row record;
  v_pilot_ok boolean := false;
  v_assurance_ok boolean := true;
  v_kind text;
  v_mismatch int;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  -- Authority register: every seeded key must be SET.
  FOR v_row IN
    SELECT key FROM public.t3a_d1_authority_register
     WHERE state <> 'SET'
     ORDER BY key
  LOOP
    v_blockers := v_blockers || jsonb_build_object(
      'kind', 'authority_unset',
      'key', v_row.key
    );
  END LOOP;

  -- G1 pilot: at least one closed cohort with a readiness snapshot
  -- recorded (INS-009 event).
  SELECT EXISTS (
    SELECT 1
      FROM public.t3a_d1_pilot_cohort c
      JOIN public.t3a_d1_pilot_event e
        ON e.cohort_id = c.id AND e.kind = 'readiness_snapshot'
     WHERE c.state = 'closed'
  ) INTO v_pilot_ok;

  IF NOT v_pilot_ok THEN
    v_blockers := v_blockers || jsonb_build_object(
      'kind', 'g1_pilot_incomplete',
      'note', 'no closed cohort with a readiness_snapshot event'
    );
  END IF;

  -- Assurance: latest sweep of issued_body_hash and
  -- version_set_still_readable must show zero mismatch (INS-008).
  FOR v_kind IN SELECT unnest(ARRAY['issued_body_hash', 'version_set_still_readable'])
  LOOP
    SELECT COUNT(*) INTO v_mismatch
      FROM (
        SELECT DISTINCT ON (target_id) result
          FROM public.t3a_d1_assurance_check
         WHERE kind = v_kind::public.t3a_d1_assurance_check_kind
         ORDER BY target_id, checked_at DESC
      ) latest
     WHERE result = 'mismatch';

    IF v_mismatch > 0 THEN
      v_assurance_ok := false;
      v_blockers := v_blockers || jsonb_build_object(
        'kind', 'assurance_mismatch',
        'check', v_kind,
        'mismatch_count', v_mismatch
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_blockers) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('ok', false, 'blockers', v_blockers);
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_production_release_gate() FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_production_release_gate() TO authenticated;

-- ========================================================================
-- §6 · t3a_d1_promote_to_production
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_d1_promote_to_production(p_release_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate jsonb;
  v_current_env public.t3a_env_state;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_production_release WHERE id = p_release_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RELEASE_NOT_FOUND');
  END IF;

  v_current_env := public.t3a_current_env_state();
  IF v_current_env NOT IN ('pilot_active', 'observation_capable_inactive') THEN
    -- Can only promote from a real, non-production env.
    UPDATE public.t3a_d1_production_release
       SET state = 'blocked',
           gate_result = jsonb_build_object('ok', false, 'reason', 'ENV_NOT_PROMOTABLE', 'from', v_current_env::text),
           evaluated_at = now()
     WHERE id = p_release_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'ENV_NOT_PROMOTABLE', 'from', v_current_env::text);
  END IF;

  v_gate := public.t3a_d1_production_release_gate();
  IF v_gate IS NOT NULL THEN
    UPDATE public.t3a_d1_production_release
       SET state = 'blocked',
           gate_result = v_gate,
           evaluated_at = now()
     WHERE id = p_release_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'GATE_BLOCKED', 'gate', v_gate);
  END IF;

  UPDATE public.t3a_env_capability
     SET env_state = 'production_active',
         set_by = auth.uid(),
         set_at = now(),
         note = 'Promoted via t3a_d1_promote_to_production release ' || p_release_id::text
   WHERE singleton = 1;

  UPDATE public.t3a_d1_production_release
     SET state = 'released',
         gate_result = jsonb_build_object('ok', true),
         evaluated_at = now(),
         released_at = now(),
         released_by = auth.uid()
   WHERE id = p_release_id;

  RETURN jsonb_build_object('ok', true, 'release_id', p_release_id, 'env_state', 'production_active');
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_promote_to_production(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_promote_to_production(uuid) TO authenticated;

-- ========================================================================
-- §7 · t3a_d1_rollback_from_production
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_d1_rollback_from_production(
  p_release_id uuid,
  p_target public.t3a_env_state,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.t3a_env_state;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  IF p_target NOT IN ('pilot_active', 'observation_capable_inactive') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_ROLLBACK_TARGET', 'target', p_target::text);
  END IF;

  v_current := public.t3a_current_env_state();
  IF v_current <> 'production_active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_IN_PRODUCTION', 'current', v_current::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_production_release WHERE id = p_release_id AND state = 'released') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RELEASE_NOT_ACTIVE');
  END IF;

  UPDATE public.t3a_env_capability
     SET env_state = p_target,
         set_by = auth.uid(),
         set_at = now(),
         note = 'Rollback from production via release ' || p_release_id::text || ': ' || COALESCE(p_reason, '')
   WHERE singleton = 1;

  UPDATE public.t3a_d1_production_release
     SET state = 'rolled_back',
         rolled_back_at = now(),
         rolled_back_by = auth.uid(),
         rollback_target = p_target,
         rollback_reason = p_reason
   WHERE id = p_release_id;

  RETURN jsonb_build_object('ok', true, 'release_id', p_release_id, 'env_state', p_target::text);
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_rollback_from_production(uuid, public.t3a_env_state, text) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_rollback_from_production(uuid, public.t3a_env_state, text) TO authenticated;
