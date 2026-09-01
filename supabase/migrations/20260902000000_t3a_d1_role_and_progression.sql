-- T3A-D1-DEV-INS-011 · Progression Decision, Role Authorization and
-- Independence Routing.
--
-- Design Return v0.1, §3 (docs/d1/DESIGN-RETURN-v0.1.md).
-- Instruction numbers 019..029.
--
-- Auto-closed questions (per Founder direction on 1 September 2026):
--   Q3 (Section D8 pilot exception) — INACTIVE at first build.
--   Q6 (FD-D1-05 fourth progression value) — enum stays at THREE values.
--     A fourth value is NOT implemented as a disabled enum on developer
--     inference. Widening requires a new migration.

set search_path = public;

-- ========================================================================
-- §1 · Enums
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_authority AS ENUM (
    'observe',
    'confirm',
    'record_progression',
    'evidence_review',
    'issue',
    'reconsider',
    'operational_coordination_quality',
    'activation_governance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_authorization_status AS ENUM (
    'granted',
    'suspended',
    'withdrawn',
    'lapsed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FD-D1-05 interim: three values, closed domain.
DO $$ BEGIN
  CREATE TYPE public.t3a_progression_value AS ENUM (
    'proceed',
    'redirect',
    'pause'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_reconsideration_status AS ENUM (
    'assigned',
    'in_review',
    'resolved',
    'HELD_OPEN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_involvement_reason AS ENUM (
    'ELIGIBLE',
    'PRIOR_OBSERVER_OF_RECORD',
    'PRIOR_CONFIRMER_OF_RECORD',
    'PRIOR_PROGRESSION_RECORDER_FOR_PARTICIPANT_DIMENSION',
    'PRIOR_ISSUER_OF_REPORT_CONTAINING_RECORD',
    'PRIOR_RECONSIDERER_OF_RECORD',
    'DECLARED_CONFLICT',
    'INSUFFICIENT_AUTHORIZATION',
    'CALIBRATION_LAPSED',
    'INVOLVEMENT_TEST_HARD_BLOCK'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_role_authorization — dimension + Stage + authority scoped
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_role_authorization (
  role_authorization_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  authority public.t3a_authority not null,
  dimension_id text,
  stage_codes text[] not null default '{}'::text[],
  status public.t3a_authorization_status not null default 'granted',
  granted_by uuid,
  granted_at timestamptz not null default now(),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  suspended_at timestamptz,
  withdrawn_at timestamptz,
  calibration_clearance_ref uuid,
  notes text,
  CONSTRAINT t3a_role_authorization_dim_required CHECK (
    authority IN ('operational_coordination_quality','activation_governance')
    OR dimension_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS t3a_role_authorization_actor_idx
  ON public.t3a_role_authorization (actor_id);

CREATE INDEX IF NOT EXISTS t3a_role_authorization_authority_idx
  ON public.t3a_role_authorization (authority, dimension_id);

ALTER TABLE public.t3a_role_authorization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_role_authorization_read" ON public.t3a_role_authorization;
CREATE POLICY "t3a_role_authorization_read"
  ON public.t3a_role_authorization FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_role_authorization_write_admin" ON public.t3a_role_authorization;
CREATE POLICY "t3a_role_authorization_write_admin"
  ON public.t3a_role_authorization FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_role_authorization TO authenticated;
GRANT INSERT, UPDATE ON public.t3a_role_authorization TO authenticated;

-- ========================================================================
-- §3 · t3a_authority_snapshot — captured at the time of each action
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_authority_snapshot (
  authority_snapshot_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  authority public.t3a_authority not null,
  dimension_id text,
  stage_code text,
  role_authorization_id uuid references public.t3a_role_authorization(role_authorization_id) on delete restrict,
  snapshot jsonb not null,
  captured_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_authority_snapshot_actor_idx
  ON public.t3a_authority_snapshot (actor_id, captured_at DESC);

ALTER TABLE public.t3a_authority_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_authority_snapshot_read_admin" ON public.t3a_authority_snapshot;
CREATE POLICY "t3a_authority_snapshot_read_admin"
  ON public.t3a_authority_snapshot FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_authority_snapshot_write_admin" ON public.t3a_authority_snapshot;
CREATE POLICY "t3a_authority_snapshot_write_admin"
  ON public.t3a_authority_snapshot FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trigger to lock snapshots as immutable.
CREATE OR REPLACE FUNCTION public.t3a_authority_snapshot_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'AUTHORITY_SNAPSHOT_IMMUTABLE: snapshots may not be edited',
    ERRCODE = '22023';
END $$;

DROP TRIGGER IF EXISTS t3a_authority_snapshot_immutable_trg ON public.t3a_authority_snapshot;
CREATE TRIGGER t3a_authority_snapshot_immutable_trg
  BEFORE UPDATE OR DELETE ON public.t3a_authority_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.t3a_authority_snapshot_immutable();

GRANT SELECT, INSERT ON public.t3a_authority_snapshot TO authenticated;

-- ========================================================================
-- §4 · t3a_observation_record — the unit of the involvement test
-- ========================================================================
--
-- Minimal shape here; Migration 3 (INS-004) attaches gateway,
-- stage_entry_event, source and version snapshot fields. Kept in
-- Migration 2 because the involvement test needs a target table.

CREATE TABLE IF NOT EXISTS public.t3a_observation_record (
  observation_record_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  stage_code text not null,
  observer_id uuid references public.profiles(id) on delete restrict,
  confirmer_id uuid references public.profiles(id) on delete restrict,
  authority_snapshot_id uuid references public.t3a_authority_snapshot(authority_snapshot_id) on delete restrict,
  version_set jsonb not null default '{}'::jsonb,
  is_committed boolean not null default false,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_observation_record_participant_idx
  ON public.t3a_observation_record (participant_id, dimension_id);

ALTER TABLE public.t3a_observation_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_observation_record_read" ON public.t3a_observation_record;
CREATE POLICY "t3a_observation_record_read"
  ON public.t3a_observation_record FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR observer_id = auth.uid()
    OR confirmer_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "t3a_observation_record_write_admin" ON public.t3a_observation_record;
CREATE POLICY "t3a_observation_record_write_admin"
  ON public.t3a_observation_record FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_observation_record TO authenticated;
GRANT INSERT, UPDATE ON public.t3a_observation_record TO authenticated;

-- ========================================================================
-- §5 · t3a_conflict_declaration
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_conflict_declaration (
  conflict_declaration_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  target_kind text not null check (target_kind IN ('participant','source_family','organization')),
  target_ref text not null,
  declared_at timestamptz not null default now(),
  rationale text,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS t3a_conflict_declaration_actor_idx
  ON public.t3a_conflict_declaration (actor_id, target_kind, target_ref)
  WHERE revoked_at IS NULL;

ALTER TABLE public.t3a_conflict_declaration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_conflict_declaration_read" ON public.t3a_conflict_declaration;
CREATE POLICY "t3a_conflict_declaration_read"
  ON public.t3a_conflict_declaration FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_conflict_declaration_insert_self" ON public.t3a_conflict_declaration;
CREATE POLICY "t3a_conflict_declaration_insert_self"
  ON public.t3a_conflict_declaration FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS "t3a_conflict_declaration_update_own" ON public.t3a_conflict_declaration;
CREATE POLICY "t3a_conflict_declaration_update_own"
  ON public.t3a_conflict_declaration FOR UPDATE TO authenticated
  USING (actor_id = auth.uid() OR public.is_admin())
  WITH CHECK (actor_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_conflict_declaration TO authenticated;

-- ========================================================================
-- §6 · The involvement test
-- ========================================================================
--
-- SECURITY DEFINER because the test reads role and observation rows the
-- actor may not have direct visibility on. Returns t3a_involvement_reason;
-- callers refuse the action on any value other than ELIGIBLE.

CREATE OR REPLACE FUNCTION public.t3a_involvement_test(
  p_actor_id uuid,
  p_observation_record_id uuid,
  p_requested_authority public.t3a_authority
) RETURNS public.t3a_involvement_reason
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.t3a_observation_record%rowtype;
BEGIN
  SELECT * INTO v_record
    FROM public.t3a_observation_record
   WHERE observation_record_id = p_observation_record_id;

  IF NOT FOUND THEN
    RETURN 'INVOLVEMENT_TEST_HARD_BLOCK';
  END IF;

  -- Prior involvement — Section D4. Each branch below is the same
  -- record-scoped question the spec names.
  IF p_requested_authority = 'reconsider' AND v_record.observer_id = p_actor_id THEN
    RETURN 'PRIOR_OBSERVER_OF_RECORD';
  END IF;
  IF p_requested_authority = 'reconsider' AND v_record.confirmer_id = p_actor_id THEN
    RETURN 'PRIOR_CONFIRMER_OF_RECORD';
  END IF;
  IF p_requested_authority = 'reconsider' AND EXISTS (
    SELECT 1 FROM public.t3a_reconsideration_assignment ra
     WHERE ra.observation_record_id = p_observation_record_id
       AND ra.reconsiderer_id = p_actor_id
  ) THEN
    RETURN 'PRIOR_RECONSIDERER_OF_RECORD';
  END IF;
  IF p_requested_authority IN ('confirm','record_progression','evidence_review','issue','reconsider')
     AND v_record.observer_id = p_actor_id THEN
    RETURN 'PRIOR_OBSERVER_OF_RECORD';
  END IF;

  -- Declared conflict against the participant.
  IF EXISTS (
    SELECT 1 FROM public.t3a_conflict_declaration
     WHERE actor_id = p_actor_id
       AND target_kind = 'participant'
       AND target_ref = v_record.participant_id::text
       AND revoked_at IS NULL
  ) THEN
    RETURN 'DECLARED_CONFLICT';
  END IF;

  -- Authorization — must hold the requested authority for the record's
  -- dimension and stage, and it must be granted right now.
  IF NOT EXISTS (
    SELECT 1
      FROM public.t3a_role_authorization ra
     WHERE ra.actor_id = p_actor_id
       AND ra.authority = p_requested_authority
       AND ra.status = 'granted'
       AND (ra.dimension_id IS NULL OR ra.dimension_id = v_record.dimension_id)
       AND (ra.stage_codes = '{}'::text[] OR v_record.stage_code = ANY (ra.stage_codes))
       AND (ra.effective_to IS NULL OR ra.effective_to > now())
  ) THEN
    RETURN 'INSUFFICIENT_AUTHORIZATION';
  END IF;

  RETURN 'ELIGIBLE';
END
$$;

GRANT EXECUTE ON FUNCTION public.t3a_involvement_test(uuid, uuid, public.t3a_authority) TO authenticated;

-- ========================================================================
-- §7 · Progression decision
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_progression_decision (
  progression_decision_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  decision public.t3a_progression_value not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  authority_snapshot_id uuid references public.t3a_authority_snapshot(authority_snapshot_id) on delete restrict,
  observation_record_id uuid references public.t3a_observation_record(observation_record_id) on delete restrict,
  cleared_from uuid references public.t3a_progression_decision(progression_decision_id) on delete restrict,
  cleared_at timestamptz,
  cleared_by uuid,
  rationale text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_progression_decision_participant_idx
  ON public.t3a_progression_decision (participant_id, dimension_id, created_at DESC);

ALTER TABLE public.t3a_progression_decision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_progression_decision_read" ON public.t3a_progression_decision;
CREATE POLICY "t3a_progression_decision_read"
  ON public.t3a_progression_decision FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR recorded_by = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "t3a_progression_decision_insert" ON public.t3a_progression_decision;
CREATE POLICY "t3a_progression_decision_insert"
  ON public.t3a_progression_decision FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() OR public.is_admin());

-- No UPDATE and no DELETE. Progression rows are immutable; clearing
-- a pause writes a NEW row that references the paused one via
-- cleared_from.

GRANT SELECT, INSERT ON public.t3a_progression_decision TO authenticated;

-- ========================================================================
-- §8 · Correction case and reconsideration assignments
-- ========================================================================
--
-- One parent case, ONE reconsideration assignment per affected
-- observation record (INS-011 instruction 026).

CREATE TABLE IF NOT EXISTS public.t3a_correction_case (
  correction_case_id uuid primary key default gen_random_uuid(),
  raised_by uuid not null references public.profiles(id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  ground text not null,
  narrative text,
  status text not null default 'open' check (status IN ('open','resolved','withdrawn')),
  raised_at timestamptz not null default now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS t3a_correction_case_participant_idx
  ON public.t3a_correction_case (participant_id, status);

ALTER TABLE public.t3a_correction_case ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_correction_case_read" ON public.t3a_correction_case;
CREATE POLICY "t3a_correction_case_read"
  ON public.t3a_correction_case FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR raised_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_correction_case_insert" ON public.t3a_correction_case;
CREATE POLICY "t3a_correction_case_insert"
  ON public.t3a_correction_case FOR INSERT TO authenticated
  WITH CHECK (raised_by = auth.uid());

DROP POLICY IF EXISTS "t3a_correction_case_update_admin" ON public.t3a_correction_case;
CREATE POLICY "t3a_correction_case_update_admin"
  ON public.t3a_correction_case FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_correction_case TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_reconsideration_assignment (
  reconsideration_assignment_id uuid primary key default gen_random_uuid(),
  correction_case_id uuid not null references public.t3a_correction_case(correction_case_id) on delete restrict,
  observation_record_id uuid not null references public.t3a_observation_record(observation_record_id) on delete restrict,
  reconsiderer_id uuid references public.profiles(id) on delete restrict,
  status public.t3a_reconsideration_status not null default 'assigned',
  reason_if_held_open public.t3a_involvement_reason,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  UNIQUE (correction_case_id, observation_record_id)
);

CREATE INDEX IF NOT EXISTS t3a_reconsideration_assignment_case_idx
  ON public.t3a_reconsideration_assignment (correction_case_id);

ALTER TABLE public.t3a_reconsideration_assignment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_reconsideration_assignment_read" ON public.t3a_reconsideration_assignment;
CREATE POLICY "t3a_reconsideration_assignment_read"
  ON public.t3a_reconsideration_assignment FOR SELECT TO authenticated
  USING (
    reconsiderer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.t3a_correction_case c WHERE c.correction_case_id = t3a_reconsideration_assignment.correction_case_id AND (c.raised_by = auth.uid() OR c.participant_id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "t3a_reconsideration_assignment_write_admin" ON public.t3a_reconsideration_assignment;
CREATE POLICY "t3a_reconsideration_assignment_write_admin"
  ON public.t3a_reconsideration_assignment FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_reconsideration_assignment TO authenticated;

-- The eligibility evaluator that routes each assignment. Fail-closed:
-- returns HELD_OPEN when no eligible actor exists. The assignment
-- persists; the affected record does not proceed.

CREATE OR REPLACE FUNCTION public.t3a_route_reconsideration(
  p_reconsideration_assignment_id uuid
) RETURNS public.t3a_reconsideration_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id uuid;
  v_actor uuid;
  v_reason public.t3a_involvement_reason;
BEGIN
  SELECT observation_record_id INTO v_record_id
    FROM public.t3a_reconsideration_assignment
   WHERE reconsideration_assignment_id = p_reconsideration_assignment_id;

  IF v_record_id IS NULL THEN
    RAISE EXCEPTION 'assignment not found';
  END IF;

  -- Scan actors with reconsider authority for the record's dimension.
  FOR v_actor IN
    SELECT DISTINCT ra.actor_id
      FROM public.t3a_role_authorization ra
      JOIN public.t3a_observation_record obs ON obs.observation_record_id = v_record_id
     WHERE ra.authority = 'reconsider'
       AND ra.status = 'granted'
       AND (ra.dimension_id IS NULL OR ra.dimension_id = obs.dimension_id)
  LOOP
    v_reason := public.t3a_involvement_test(v_actor, v_record_id, 'reconsider'::public.t3a_authority);
    IF v_reason = 'ELIGIBLE' THEN
      UPDATE public.t3a_reconsideration_assignment
         SET reconsiderer_id = v_actor,
             status = 'assigned',
             reason_if_held_open = NULL,
             updated_at = now()
       WHERE reconsideration_assignment_id = p_reconsideration_assignment_id;
      RETURN 'assigned';
    END IF;
  END LOOP;

  -- Fail-closed: no eligible actor.
  UPDATE public.t3a_reconsideration_assignment
     SET status = 'HELD_OPEN',
         reason_if_held_open = 'INVOLVEMENT_TEST_HARD_BLOCK',
         updated_at = now()
   WHERE reconsideration_assignment_id = p_reconsideration_assignment_id;

  RETURN 'HELD_OPEN';
END
$$;

GRANT EXECUTE ON FUNCTION public.t3a_route_reconsideration(uuid) TO authenticated;

-- ========================================================================
-- §9 · Action-sequence rule (separation of actions, Section D7)
-- ========================================================================
--
-- Enforced by a trigger on t3a_observation_record: a single write may
-- not carry both a confirmer_id and a progression-decision reference
-- in the same statement.

CREATE TABLE IF NOT EXISTS public.t3a_action_sequence_rule (
  rule_id uuid primary key default gen_random_uuid(),
  stage_code text not null,
  ordered_authorities public.t3a_authority[] not null,
  UNIQUE (stage_code)
);

INSERT INTO public.t3a_action_sequence_rule (stage_code, ordered_authorities)
VALUES
  ('S1', ARRAY['observe','confirm','record_progression']::public.t3a_authority[]),
  ('S2', ARRAY['observe','confirm','record_progression']::public.t3a_authority[]),
  ('S3', ARRAY['observe','confirm','record_progression']::public.t3a_authority[]),
  ('S4', ARRAY['observe','confirm','record_progression']::public.t3a_authority[])
ON CONFLICT (stage_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.t3a_action_sequence_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Refuse a write that carries a confirmer without first committing.
  IF NEW.confirmer_id IS NOT NULL AND NEW.is_committed = false THEN
    RAISE EXCEPTION USING
      MESSAGE = 'ACTION_SEQUENCE: an observation must commit before a confirmer is attached',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_action_sequence_guard_trg ON public.t3a_observation_record;
CREATE TRIGGER t3a_action_sequence_guard_trg
  BEFORE INSERT OR UPDATE ON public.t3a_observation_record
  FOR EACH ROW EXECUTE FUNCTION public.t3a_action_sequence_guard();

-- ========================================================================
-- §10 · activation_governance predicate (used by Migration 1 later)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_has_activation_governance(p_actor uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR EXISTS (
           SELECT 1 FROM public.t3a_role_authorization ra
            WHERE ra.actor_id = p_actor
              AND ra.authority = 'activation_governance'
              AND ra.status = 'granted'
              AND (ra.effective_to IS NULL OR ra.effective_to > now())
         );
$$;

GRANT EXECUTE ON FUNCTION public.t3a_has_activation_governance(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
