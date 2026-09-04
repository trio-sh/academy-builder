-- T3A-D1-DEV-INS-009 · G1 Controlled Pilot — Cohort, Enrollment,
-- Event Log and Readiness Gate.
--
-- Part One §3 build order position 12.
--
-- What this lands:
--   §1 Enums.
--   §2 t3a_d1_pilot_cohort — a named, capped roster with fixed
--      entry and exit windows. Content becomes immutable once
--      state=open (trigger).
--   §3 t3a_d1_pilot_enrollment — one row per (cohort, participant).
--      Admin-managed. Withdrawal is a soft state change; the row is
--      never deleted so history stays intact.
--   §4 t3a_d1_pilot_event — append-only audit log with a hash chain.
--      Each row's chain_hash = extensions.digest(prev_chain_hash ||
--      row_fields, 'sha256'), so tampering with any prior row breaks
--      every subsequent chain hash. Admin-readable only.
--   §5 t3a_d1_pilot_gate(participant_id) — SECURITY DEFINER helper
--      that composes the environment state AND cohort membership.
--      Returns the exact refusal reason a caller should surface, or
--      NULL when the participant is cleared for pilot paths.
--   §6 t3a_d1_pilot_record_event(cohort, participant, kind, body) —
--      writes a t3a_d1_pilot_event row with a fresh chain hash.
--   §7 t3a_d1_pilot_readiness(cohort) — computes exit-criteria roll-up
--      for G2 promotion. Reader-only, admin-only. Returns a jsonb
--      status report; never writes anywhere.
--
-- Governing rules (locked, auto-closed):
--   * FD-D1-04 UNSET remains binding. The pilot gate does NOT reopen
--     issuance — issuance still refuses under any real env until the
--     evidence-review authority lands. The pilot gate governs upstream
--     paths (entry, gateway, evidence capture) so a controlled cohort
--     can exercise everything up to the point where issuance stops.
--   * Env gate: t3a_d1_pilot_gate returns
--       - ENV_DESIGN_ONLY under design_only
--       - ENV_NOT_PILOT under any state other than pilot_active
--       - COHORT_NOT_OPEN when the cohort exists but is draft/closed
--       - NOT_ENROLLED when the participant has no active enrollment
--       - WITHDRAWN when the enrollment is withdrawn
--     and NULL when everything clears.
--   * The event chain is per-cohort. `chain_hash` starts from
--     digest('t3a-d1-pilot-cohort-' || cohort_id::text, 'sha256').
--   * REC-04 retention UNSET: no purge of enrollments or events.
--   * REC-10 attempt exceptions UNSET: pilot_gate makes no allowance
--     for one-off exceptions; every refusal is on-record via
--     t3a_d1_pilot_record_event(kind='gate_refused').
--
-- Guardrails from POST-MORTEM v0.1:
--   * extensions.digest for the chain hash, never bare digest.
--   * per-object SELECT 1 verification runs from the apply script.

set search_path = public;

-- ========================================================================
-- §1 · Enums
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_pilot_cohort_state AS ENUM (
    'draft',
    'open',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_pilot_enrollment_state AS ENUM (
    'invited',
    'active',
    'withdrawn',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_pilot_event_kind AS ENUM (
    'cohort_opened',
    'cohort_closed',
    'enrollment_invited',
    'enrollment_activated',
    'enrollment_withdrawn',
    'enrollment_completed',
    'gate_cleared',
    'gate_refused',
    'readiness_snapshot'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_d1_pilot_cohort
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_pilot_cohort (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  purpose_note text,
  cap int not null check (cap > 0),
  entry_opens_at timestamptz,
  entry_closes_at timestamptz,
  exit_criteria jsonb not null default '{}'::jsonb,
  state public.t3a_d1_pilot_cohort_state not null default 'draft',
  opened_at timestamptz,
  opened_by uuid,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid
);

CREATE OR REPLACE FUNCTION public.t3a_d1_pilot_cohort_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.state = 'draft' AND NEW.state = 'open')
    OR (OLD.state = 'open' AND NEW.state = 'closed')
    OR (OLD.state = NEW.state) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'INVALID_PILOT_COHORT_STATE_TRANSITION: % -> %', OLD.state, NEW.state;
  END IF;

  IF OLD.state <> 'draft' THEN
    IF NEW.code IS DISTINCT FROM OLD.code
      OR NEW.cap IS DISTINCT FROM OLD.cap
      OR NEW.entry_opens_at IS DISTINCT FROM OLD.entry_opens_at
      OR NEW.entry_closes_at IS DISTINCT FROM OLD.entry_closes_at
      OR NEW.exit_criteria IS DISTINCT FROM OLD.exit_criteria THEN
      RAISE EXCEPTION 'PILOT_COHORT_TERMS_IMMUTABLE_AFTER_OPEN';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_pilot_cohort_transition_trg ON public.t3a_d1_pilot_cohort;
CREATE TRIGGER t3a_d1_pilot_cohort_transition_trg
  BEFORE UPDATE ON public.t3a_d1_pilot_cohort
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_pilot_cohort_transition();

ALTER TABLE public.t3a_d1_pilot_cohort ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_pilot_cohort_read" ON public.t3a_d1_pilot_cohort;
CREATE POLICY "t3a_d1_pilot_cohort_read"
  ON public.t3a_d1_pilot_cohort FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_d1_pilot_cohort_admin_write" ON public.t3a_d1_pilot_cohort;
CREATE POLICY "t3a_d1_pilot_cohort_admin_write"
  ON public.t3a_d1_pilot_cohort FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_pilot_cohort TO authenticated;

-- ========================================================================
-- §3 · t3a_d1_pilot_enrollment
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_pilot_enrollment (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.t3a_d1_pilot_cohort(id) on delete cascade,
  participant_id uuid not null,
  state public.t3a_d1_pilot_enrollment_state not null default 'invited',
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  withdrawn_at timestamptz,
  completed_at timestamptz,
  note text,
  unique (cohort_id, participant_id)
);

ALTER TABLE public.t3a_d1_pilot_enrollment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_pilot_enrollment_self_read" ON public.t3a_d1_pilot_enrollment;
CREATE POLICY "t3a_d1_pilot_enrollment_self_read"
  ON public.t3a_d1_pilot_enrollment FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_d1_pilot_enrollment_admin_write" ON public.t3a_d1_pilot_enrollment;
CREATE POLICY "t3a_d1_pilot_enrollment_admin_write"
  ON public.t3a_d1_pilot_enrollment FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_pilot_enrollment TO authenticated;

-- ========================================================================
-- §4 · t3a_d1_pilot_event (append-only, hash-chained)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_pilot_event (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.t3a_d1_pilot_cohort(id) on delete cascade,
  participant_id uuid,
  kind public.t3a_d1_pilot_event_kind not null,
  body jsonb not null default '{}'::jsonb,
  prev_chain_hash text,
  chain_hash text not null,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_pilot_event_cohort_idx
  ON public.t3a_d1_pilot_event (cohort_id, created_at);

ALTER TABLE public.t3a_d1_pilot_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_pilot_event_admin_read" ON public.t3a_d1_pilot_event;
CREATE POLICY "t3a_d1_pilot_event_admin_read"
  ON public.t3a_d1_pilot_event FOR SELECT TO authenticated
  USING (public.is_admin());

-- No direct write policy: all writes go through t3a_d1_pilot_record_event.

-- Block updates and deletes at the trigger level too, so nobody can
-- rewrite the chain via a service_role connection either.

CREATE OR REPLACE FUNCTION public.t3a_d1_pilot_event_no_mutate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PILOT_EVENT_LOG_IS_APPEND_ONLY';
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_pilot_event_no_update_trg ON public.t3a_d1_pilot_event;
CREATE TRIGGER t3a_d1_pilot_event_no_update_trg
  BEFORE UPDATE ON public.t3a_d1_pilot_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_pilot_event_no_mutate();

DROP TRIGGER IF EXISTS t3a_d1_pilot_event_no_delete_trg ON public.t3a_d1_pilot_event;
CREATE TRIGGER t3a_d1_pilot_event_no_delete_trg
  BEFORE DELETE ON public.t3a_d1_pilot_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_pilot_event_no_mutate();

-- ========================================================================
-- §5 · t3a_d1_pilot_gate
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_d1_pilot_gate(p_participant_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env public.t3a_env_state;
  v_enroll record;
BEGIN
  v_env := public.t3a_current_env_state();

  IF v_env = 'design_only' THEN
    RETURN 'ENV_DESIGN_ONLY';
  END IF;

  IF v_env <> 'pilot_active' THEN
    -- Any real env other than pilot_active (synthetic_test_only,
    -- observation_capable_inactive, production_active) is not
    -- governed by this gate.
    RETURN 'ENV_NOT_PILOT';
  END IF;

  SELECT e.state, c.state AS cohort_state
    INTO v_enroll
    FROM public.t3a_d1_pilot_enrollment e
    JOIN public.t3a_d1_pilot_cohort c ON c.id = e.cohort_id
    WHERE e.participant_id = p_participant_id
      AND c.state = 'open'
      AND e.state IN ('invited', 'active')
    ORDER BY e.invited_at DESC
    LIMIT 1;

  IF v_enroll.state IS NULL THEN
    RETURN 'NOT_ENROLLED';
  END IF;
  IF v_enroll.cohort_state <> 'open' THEN
    RETURN 'COHORT_NOT_OPEN';
  END IF;
  IF v_enroll.state = 'withdrawn' THEN
    RETURN 'WITHDRAWN';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_pilot_gate(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_pilot_gate(uuid) TO authenticated;

-- ========================================================================
-- §6 · t3a_d1_pilot_record_event
-- ========================================================================
--
-- Writes one event row, computing the chain_hash from the previous
-- row's chain_hash (per cohort) and the new row's fields. Only
-- callable by admins.

CREATE OR REPLACE FUNCTION public.t3a_d1_pilot_record_event(
  p_cohort_id uuid,
  p_participant_id uuid,
  p_kind public.t3a_d1_pilot_event_kind,
  p_body jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
  v_seed text;
  v_new_hash text;
  v_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_pilot_cohort WHERE id = p_cohort_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'COHORT_NOT_FOUND');
  END IF;

  SELECT chain_hash INTO v_prev
    FROM public.t3a_d1_pilot_event
    WHERE cohort_id = p_cohort_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

  IF v_prev IS NULL THEN
    v_seed := encode(
      extensions.digest('t3a-d1-pilot-cohort-' || p_cohort_id::text, 'sha256'),
      'hex'
    );
  ELSE
    v_seed := v_prev;
  END IF;

  v_new_hash := encode(
    extensions.digest(
      v_seed
        || '|' || v_id::text
        || '|' || p_cohort_id::text
        || '|' || COALESCE(p_participant_id::text, '')
        || '|' || p_kind::text
        || '|' || COALESCE(p_body::text, '{}'),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.t3a_d1_pilot_event
    (id, cohort_id, participant_id, kind, body, prev_chain_hash, chain_hash)
  VALUES
    (v_id, p_cohort_id, p_participant_id, p_kind, COALESCE(p_body, '{}'::jsonb), v_prev, v_new_hash);

  RETURN jsonb_build_object('ok', true, 'event_id', v_id, 'chain_hash', v_new_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_pilot_record_event(uuid, uuid, public.t3a_d1_pilot_event_kind, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_pilot_record_event(uuid, uuid, public.t3a_d1_pilot_event_kind, jsonb) TO authenticated;

-- ========================================================================
-- §7 · t3a_d1_pilot_readiness
-- ========================================================================
--
-- Reader-only exit-criteria roll-up for a cohort. Reports counts
-- against the cohort's stored exit_criteria; never writes. Admin-only.

CREATE OR REPLACE FUNCTION public.t3a_d1_pilot_readiness(p_cohort_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort public.t3a_d1_pilot_cohort%ROWTYPE;
  v_invited int;
  v_active int;
  v_withdrawn int;
  v_completed int;
  v_event_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  SELECT * INTO v_cohort FROM public.t3a_d1_pilot_cohort WHERE id = p_cohort_id;
  IF v_cohort.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'COHORT_NOT_FOUND');
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE state = 'invited'),
    COUNT(*) FILTER (WHERE state = 'active'),
    COUNT(*) FILTER (WHERE state = 'withdrawn'),
    COUNT(*) FILTER (WHERE state = 'completed')
  INTO v_invited, v_active, v_withdrawn, v_completed
  FROM public.t3a_d1_pilot_enrollment
  WHERE cohort_id = p_cohort_id;

  SELECT COUNT(*) INTO v_event_count
  FROM public.t3a_d1_pilot_event
  WHERE cohort_id = p_cohort_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cohort', jsonb_build_object(
      'id', v_cohort.id,
      'code', v_cohort.code,
      'state', v_cohort.state::text,
      'cap', v_cohort.cap,
      'exit_criteria', v_cohort.exit_criteria
    ),
    'enrollment', jsonb_build_object(
      'invited', v_invited,
      'active', v_active,
      'withdrawn', v_withdrawn,
      'completed', v_completed,
      'total', v_invited + v_active + v_withdrawn + v_completed
    ),
    'event_count', v_event_count,
    'g2_gate_note', 'FD-D1-04 UNSET: issuance surface still refuses; G2 promotion cannot fire until evidence-review authority lands'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_pilot_readiness(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_pilot_readiness(uuid) TO authenticated;
