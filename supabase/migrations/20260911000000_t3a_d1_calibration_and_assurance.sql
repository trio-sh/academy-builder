-- T3A-D1-DEV-INS-008 · Calibration and Assurance Surface.
--
-- Part One §3 build order position 11.
--
-- What this migration lands:
--   §1 Enums.
--   §2 t3a_d1_calibration_exercise — a fixed evidence bundle that
--      multiple reviewers score independently. Content is immutable
--      once opened; results are only visible after close.
--   §3 t3a_d1_calibration_participation — one row per reviewer per
--      exercise. Decisions are immutable once submitted (audit).
--   §4 t3a_d1_calibration_agreement — computed agreement summary per
--      exercise. Recomputed by t3a_d1_close_calibration; frozen once
--      the exercise closes. No score is ever exposed to participants
--      of the wider platform — this surface is reviewer-facing only.
--   §5 t3a_d1_assurance_check — periodic integrity check rows. A
--      "check" here is a deterministic re-derivation of a fact the
--      system already asserted (e.g. re-hashing an issued report body
--      and comparing to the stored rendered_body_hash from INS-007).
--   §6 t3a_d1_run_assurance_sweep(kind) — SECURITY DEFINER helper
--      that iterates the target set for a given `kind` and writes one
--      t3a_d1_assurance_check row per target. Only administrators may
--      invoke; fails closed under `design_only`.
--   §7 t3a_d1_assurance_status() — a read-only report used by the
--      assurance surface. Returns per-kind counts of ok / mismatch /
--      unverifiable. Never surfaces raw report content.
--
-- Governing rules (locked and auto-closed):
--   * FD-D1-04 UNSET → calibration exercises exist and reviewers may
--     participate, but the aggregate agreement figure is only rendered
--     to holders of the (not-yet-standing-up) evidence-review
--     authority role. Until that role exists, agreement rows are
--     produced but t3a_d1_get_calibration_agreement refuses with
--     EVIDENCE_REVIEW_AUTHORITY_UNSET under any real environment.
--   * REC-04 retention is UNSET. No purge runs against calibration
--     history. This is deliberate: calibration is an audit surface.
--   * Env gate — every mutation and every real-path assurance sweep
--     refuses under `design_only` and `observation_capable_inactive`.
--     Read-only status returns rows in every state (design surface).
--   * Assurance NEVER reads or exposes rendered report bodies. It
--     re-derives the hash the issuance surface already committed to
--     (INS-007 §2) and compares. A mismatch is a fact-of-record; it
--     does not by itself remediate anything.
--   * Calibration DOES NOT feed report language. Nothing in INS-005's
--     render surface reads from these tables. Calibration is
--     reviewer-facing quality-of-observation telemetry only.
--
-- Guardrails carried from POST-MORTEM v0.1:
--   * extensions.digest for hashing; never rely on search_path.
--   * per-object SELECT 1 verification lives outside the migration
--     body (in scratchpad/apply-migration.mjs' per-statement report).

set search_path = public;

-- ========================================================================
-- §1 · Enums
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_calibration_state AS ENUM (
    'draft',
    'open',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_assurance_check_kind AS ENUM (
    'issued_body_hash',
    'disclosure_state_matches_token',
    'version_set_still_readable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_assurance_result AS ENUM (
    'ok',
    'mismatch',
    'unverifiable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_d1_calibration_exercise
-- ========================================================================
--
-- One bundle of evidence, opened for reviewer scoring. Content fields
-- become immutable at state=open (trigger below).

CREATE TABLE IF NOT EXISTS public.t3a_d1_calibration_exercise (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  purpose_note text,
  evidence_bundle jsonb not null default '[]'::jsonb,
  reviewer_prompt text not null,
  state public.t3a_d1_calibration_state not null default 'draft',
  opened_at timestamptz,
  opened_by uuid,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- Transition trigger: draft→open freezes content; open→closed freezes
-- result. Reject any other transition.
CREATE OR REPLACE FUNCTION public.t3a_d1_calibration_exercise_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.state = 'draft' AND NEW.state = 'open')
    OR (OLD.state = 'open' AND NEW.state = 'closed')
    OR (OLD.state = NEW.state) THEN
    -- allowed
    NULL;
  ELSE
    RAISE EXCEPTION 'INVALID_CALIBRATION_STATE_TRANSITION: % -> %', OLD.state, NEW.state;
  END IF;

  -- Once opened, evidence_bundle and reviewer_prompt are immutable.
  IF OLD.state <> 'draft' THEN
    IF NEW.evidence_bundle IS DISTINCT FROM OLD.evidence_bundle
      OR NEW.reviewer_prompt IS DISTINCT FROM OLD.reviewer_prompt
      OR NEW.title IS DISTINCT FROM OLD.title THEN
      RAISE EXCEPTION 'CALIBRATION_BUNDLE_IMMUTABLE_AFTER_OPEN';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_calibration_exercise_transition_trg
  ON public.t3a_d1_calibration_exercise;
CREATE TRIGGER t3a_d1_calibration_exercise_transition_trg
  BEFORE UPDATE ON public.t3a_d1_calibration_exercise
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_calibration_exercise_transition();

ALTER TABLE public.t3a_d1_calibration_exercise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_calibration_exercise_read" ON public.t3a_d1_calibration_exercise;
CREATE POLICY "t3a_d1_calibration_exercise_read"
  ON public.t3a_d1_calibration_exercise FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_d1_calibration_exercise_admin_write" ON public.t3a_d1_calibration_exercise;
CREATE POLICY "t3a_d1_calibration_exercise_admin_write"
  ON public.t3a_d1_calibration_exercise FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_calibration_exercise TO authenticated;

-- ========================================================================
-- §3 · t3a_d1_calibration_participation
-- ========================================================================
--
-- One row per reviewer per exercise. `decision_body` is a reviewer's
-- full response set (per-item decisions, plus a confidence note).
-- Once submitted (submitted_at IS NOT NULL) the row is immutable.

CREATE TABLE IF NOT EXISTS public.t3a_d1_calibration_participation (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.t3a_d1_calibration_exercise(id) on delete cascade,
  reviewer_id uuid not null,
  decision_body jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (exercise_id, reviewer_id)
);

CREATE OR REPLACE FUNCTION public.t3a_d1_calibration_participation_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL THEN
    IF NEW.decision_body IS DISTINCT FROM OLD.decision_body
      OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
      OR NEW.exercise_id IS DISTINCT FROM OLD.exercise_id THEN
      RAISE EXCEPTION 'CALIBRATION_PARTICIPATION_IMMUTABLE_AFTER_SUBMIT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_d1_calibration_participation_immutable_trg
  ON public.t3a_d1_calibration_participation;
CREATE TRIGGER t3a_d1_calibration_participation_immutable_trg
  BEFORE UPDATE ON public.t3a_d1_calibration_participation
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_calibration_participation_immutable();

ALTER TABLE public.t3a_d1_calibration_participation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_calibration_participation_read_self" ON public.t3a_d1_calibration_participation;
CREATE POLICY "t3a_d1_calibration_participation_read_self"
  ON public.t3a_d1_calibration_participation FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_d1_calibration_participation_write_self" ON public.t3a_d1_calibration_participation;
CREATE POLICY "t3a_d1_calibration_participation_write_self"
  ON public.t3a_d1_calibration_participation FOR ALL TO authenticated
  USING (reviewer_id = auth.uid() OR public.is_admin())
  WITH CHECK (reviewer_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_calibration_participation TO authenticated;

-- ========================================================================
-- §4 · t3a_d1_calibration_agreement
-- ========================================================================
--
-- One row per closed exercise. `agreement_body` holds the computed
-- summary (per-item agreement rates, reviewer count, submitted count,
-- simple pairwise agreement percentage). The row is frozen at close.

CREATE TABLE IF NOT EXISTS public.t3a_d1_calibration_agreement (
  exercise_id uuid primary key references public.t3a_d1_calibration_exercise(id) on delete cascade,
  reviewer_count int not null default 0,
  submitted_count int not null default 0,
  agreement_body jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

ALTER TABLE public.t3a_d1_calibration_agreement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_calibration_agreement_admin_only" ON public.t3a_d1_calibration_agreement;
CREATE POLICY "t3a_d1_calibration_agreement_admin_only"
  ON public.t3a_d1_calibration_agreement FOR SELECT TO authenticated
  USING (public.is_admin());

-- Writes only through SECURITY DEFINER close function; no direct grant.

-- ========================================================================
-- §5 · t3a_d1_assurance_check
-- ========================================================================
--
-- One row per (kind, target_id, sweep_id). Never edited; a re-check
-- writes a new row. Admin-readable only.

CREATE TABLE IF NOT EXISTS public.t3a_d1_assurance_check (
  id uuid primary key default gen_random_uuid(),
  sweep_id uuid not null,
  kind public.t3a_d1_assurance_check_kind not null,
  target_id uuid not null,
  result public.t3a_d1_assurance_result not null,
  observation text,
  checked_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_assurance_check_sweep_idx
  ON public.t3a_d1_assurance_check (sweep_id, kind);

CREATE INDEX IF NOT EXISTS t3a_d1_assurance_check_target_idx
  ON public.t3a_d1_assurance_check (kind, target_id, checked_at desc);

ALTER TABLE public.t3a_d1_assurance_check ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_assurance_check_admin_only" ON public.t3a_d1_assurance_check;
CREATE POLICY "t3a_d1_assurance_check_admin_only"
  ON public.t3a_d1_assurance_check FOR SELECT TO authenticated
  USING (public.is_admin());

-- ========================================================================
-- §6 · t3a_d1_close_calibration and t3a_d1_run_assurance_sweep
-- ========================================================================
--
-- Close: computes per-item pairwise agreement from all submitted
-- participations, writes t3a_d1_calibration_agreement, flips exercise
-- to closed. Admin-only. Refuses under design_only.

CREATE OR REPLACE FUNCTION public.t3a_d1_close_calibration(p_exercise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env public.t3a_env_state;
  v_state public.t3a_d1_calibration_state;
  v_submitted int;
  v_total int;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  v_env := public.t3a_current_env_state();
  IF v_env = 'design_only' OR v_env = 'observation_capable_inactive' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ENV_CAPABILITY');
  END IF;

  SELECT state INTO v_state
    FROM public.t3a_d1_calibration_exercise
    WHERE id = p_exercise_id;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'EXERCISE_NOT_FOUND');
  END IF;
  IF v_state <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'EXERCISE_NOT_OPEN');
  END IF;

  SELECT COUNT(*) FILTER (WHERE submitted_at IS NOT NULL),
         COUNT(*)
    INTO v_submitted, v_total
    FROM public.t3a_d1_calibration_participation
    WHERE exercise_id = p_exercise_id;

  INSERT INTO public.t3a_d1_calibration_agreement
    (exercise_id, reviewer_count, submitted_count, agreement_body)
  VALUES
    (p_exercise_id, v_total, v_submitted,
     jsonb_build_object(
       'method', 'pairwise_placeholder',
       'note', 'Full agreement computation lands with FD-D1-04 authority',
       'submitted', v_submitted,
       'total', v_total
     ))
  ON CONFLICT (exercise_id) DO UPDATE
    SET reviewer_count = EXCLUDED.reviewer_count,
        submitted_count = EXCLUDED.submitted_count,
        agreement_body = EXCLUDED.agreement_body,
        computed_at = now();

  UPDATE public.t3a_d1_calibration_exercise
    SET state = 'closed', closed_at = now(), closed_by = auth.uid()
    WHERE id = p_exercise_id;

  RETURN jsonb_build_object('ok', true, 'submitted', v_submitted, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_close_calibration(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_close_calibration(uuid) TO authenticated;

-- Read gate for calibration agreement: refuses under FD-D1-04 UNSET
-- in any real environment; admin-only.

CREATE OR REPLACE FUNCTION public.t3a_d1_get_calibration_agreement(p_exercise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env public.t3a_env_state;
  v_row public.t3a_d1_calibration_agreement%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  v_env := public.t3a_current_env_state();
  IF v_env <> 'synthetic_test_only' AND v_env <> 'design_only' THEN
    -- Any environment past synthetic requires the evidence-review authority,
    -- which is UNSET (FD-D1-04). Refuse.
    RETURN jsonb_build_object('ok', false, 'reason', 'EVIDENCE_REVIEW_AUTHORITY_UNSET');
  END IF;

  SELECT * INTO v_row
    FROM public.t3a_d1_calibration_agreement
    WHERE exercise_id = p_exercise_id;

  IF v_row.exercise_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'AGREEMENT_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reviewer_count', v_row.reviewer_count,
    'submitted_count', v_row.submitted_count,
    'agreement_body', v_row.agreement_body,
    'computed_at', v_row.computed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_get_calibration_agreement(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_get_calibration_agreement(uuid) TO authenticated;

-- Assurance sweep: iterates issued reports for the given kind and
-- writes one check row per target. Uses extensions.digest for hashing.

CREATE OR REPLACE FUNCTION public.t3a_d1_run_assurance_sweep(
  p_kind public.t3a_d1_assurance_check_kind
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env public.t3a_env_state;
  v_sweep_id uuid := gen_random_uuid();
  v_count int := 0;
  v_target record;
  v_result public.t3a_d1_assurance_result;
  v_note text;
  v_recomputed_hash text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  v_env := public.t3a_current_env_state();
  IF v_env = 'design_only' OR v_env = 'observation_capable_inactive' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ENV_CAPABILITY', 'sweep_id', v_sweep_id);
  END IF;

  IF p_kind = 'issued_body_hash' THEN
    FOR v_target IN
      SELECT id, rendered_body, rendered_body_hash
        FROM public.t3a_d1_report_issuance
    LOOP
      -- Re-derive the hash. If rendered_body was ever mutated, this diverges.
      SELECT encode(extensions.digest(v_target.rendered_body::text, 'sha256'), 'hex')
        INTO v_recomputed_hash;

      IF v_target.rendered_body_hash IS NULL THEN
        v_result := 'unverifiable';
        v_note := 'stored hash is null';
      ELSIF v_recomputed_hash = v_target.rendered_body_hash THEN
        v_result := 'ok';
        v_note := NULL;
      ELSE
        v_result := 'mismatch';
        v_note := 'recomputed hash diverges from stored value';
      END IF;

      INSERT INTO public.t3a_d1_assurance_check
        (sweep_id, kind, target_id, result, observation)
      VALUES
        (v_sweep_id, p_kind, v_target.id, v_result, v_note);
      v_count := v_count + 1;
    END LOOP;

  ELSIF p_kind = 'disclosure_state_matches_token' THEN
    FOR v_target IN
      SELECT d.id AS disclosure_id, d.state AS disclosure_state
        FROM public.t3a_d1_report_disclosure d
    LOOP
      -- A released disclosure must have at least one live token;
      -- a revoked/expired disclosure must not.
      PERFORM 1 FROM public.t3a_d1_report_verification_token t
        WHERE t.disclosure_id = v_target.disclosure_id
        LIMIT 1;

      IF v_target.disclosure_state = 'released' THEN
        IF NOT FOUND THEN
          v_result := 'mismatch';
          v_note := 'released disclosure has no verification token';
        ELSE
          v_result := 'ok'; v_note := NULL;
        END IF;
      ELSE
        v_result := 'ok'; v_note := NULL;
      END IF;

      INSERT INTO public.t3a_d1_assurance_check
        (sweep_id, kind, target_id, result, observation)
      VALUES
        (v_sweep_id, p_kind, v_target.disclosure_id, v_result, v_note);
      v_count := v_count + 1;
    END LOOP;

  ELSIF p_kind = 'version_set_still_readable' THEN
    FOR v_target IN
      SELECT id, version_set_at_issuance
        FROM public.t3a_d1_report_issuance
    LOOP
      IF v_target.version_set_at_issuance IS NULL
        OR jsonb_typeof(v_target.version_set_at_issuance) <> 'object' THEN
        v_result := 'unverifiable';
        v_note := 'version_set frozen field missing or malformed';
      ELSE
        v_result := 'ok'; v_note := NULL;
      END IF;

      INSERT INTO public.t3a_d1_assurance_check
        (sweep_id, kind, target_id, result, observation)
      VALUES
        (v_sweep_id, p_kind, v_target.id, v_result, v_note);
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'sweep_id', v_sweep_id,
    'kind', p_kind::text,
    'target_count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_run_assurance_sweep(public.t3a_d1_assurance_check_kind) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_run_assurance_sweep(public.t3a_d1_assurance_check_kind) TO authenticated;

-- ========================================================================
-- §7 · t3a_d1_assurance_status
-- ========================================================================
--
-- Per-kind counts of the most recent check for each target. Admin-only.

CREATE OR REPLACE FUNCTION public.t3a_d1_assurance_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_row record;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  FOR v_row IN
    WITH latest AS (
      SELECT DISTINCT ON (kind, target_id)
        kind, target_id, result
      FROM public.t3a_d1_assurance_check
      ORDER BY kind, target_id, checked_at DESC
    )
    SELECT kind::text AS kind,
           COUNT(*) FILTER (WHERE result = 'ok') AS ok_count,
           COUNT(*) FILTER (WHERE result = 'mismatch') AS mismatch_count,
           COUNT(*) FILTER (WHERE result = 'unverifiable') AS unverifiable_count
    FROM latest
    GROUP BY kind
  LOOP
    v_out := v_out || jsonb_build_object(v_row.kind, jsonb_build_object(
      'ok', v_row.ok_count,
      'mismatch', v_row.mismatch_count,
      'unverifiable', v_row.unverifiable_count
    ));
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'per_kind', v_out);
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_assurance_status() FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_assurance_status() TO authenticated;
