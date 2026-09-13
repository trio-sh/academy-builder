-- T3A-D1-EXEC-CORR-001 (PLC-005 Note 7)
-- Stage 1 outcome must reach the mentor before Stage 2 can begin.
--
-- Corrects the Execution Edition. Where the two differ, this governs.
--
-- The gap: the Execution Edition establishes that Stage 1 is administered
-- by the AI service and that a human confirmer afterwards turns the
-- participant's responses into determinations. What it did not state is
-- that the Stage 1 outcome is ROUTED to the assigned mentor, and that
-- Stage 2 cannot begin until that mentor has completed the confirmation.
-- Without the gate an implementation may reasonably open Stage 2 as soon
-- as the participant finishes Stage 1 — and a mentor who has not seen
-- Stage 1 enters Stage 2 without the record that governs it.
--
-- Build order (Section 10): the gate and its refusal BEFORE the happy
-- path. This migration follows that order.
--
-- The corrected sequence (Section 2), each step separately persisted:
--   1 Stage 1 served and administered      AI service
--   2 Stage 1 closes for the participant   System
--   3 Outcome routed to assigned mentor    System
--   4 Determination capture in workbench   Assigned mentor
--   5 confirmS1Observation                 Assigned mentor
--   6 Commit                               System
--   7 Progression decision                 Authorized actor
--   8 Stage 2 becomes available            System
--
-- Steps 4 and 5 are two records, not one action. Step 7 is not step 5.
--
-- Nothing is renamed. Nothing is removed.

set search_path = public;

-- ========================================================================
-- §1 · Enums
-- ========================================================================

-- Section 3: the gate can fail in four distinct ways, so a single reason
-- code would misreport three of them. The code names the gate; the
-- sub-reason names the condition.
DO $$ BEGIN
  CREATE TYPE public.t3a_d1_s2_refusal_sub_reason AS ENUM (
    'S1_NOT_CLOSED',
    'S1_CONFIRMATION_MISSING',
    'S1_OBSERVATION_NOT_COMMITTED',
    'S1_PROGRESSION_NOT_PERMITTING_CONTINUATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Section 7: the eight audit events.
DO $$ BEGIN
  CREATE TYPE public.t3a_d1_pathway_event AS ENUM (
    's1_administration_completed',
    's1_outcome_routed_to_mentor',
    's1_determinations_captured',
    's1_observation_confirmed',
    's1_involvement_recorded',
    's1_confirmation_reassigned',
    's2_entry_refused',
    's2_entry_permitted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Section 6: involvement arises from an ACT, never from an assignment row.
DO $$ BEGIN
  CREATE TYPE public.t3a_d1_involving_action AS ENUM (
    's1_determination_capture',
    's1_confirmation',
    'evidence_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · Audit log (Section 7) — append-only, server-timestamped
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_pathway_audit (
  pathway_audit_id uuid primary key default gen_random_uuid(),
  event public.t3a_d1_pathway_event not null,
  actor_id uuid,
  participant_id uuid,
  dimension_id text,
  stage_instance_id uuid,
  served_instance_id uuid,
  sub_reason public.t3a_d1_s2_refusal_sub_reason,
  body jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_pathway_audit_subject_idx
  ON public.t3a_d1_pathway_audit (participant_id, dimension_id, occurred_at desc);

CREATE INDEX IF NOT EXISTS t3a_d1_pathway_audit_event_idx
  ON public.t3a_d1_pathway_audit (event, occurred_at desc);

ALTER TABLE public.t3a_d1_pathway_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_pathway_audit_admin_read" ON public.t3a_d1_pathway_audit;
CREATE POLICY "t3a_d1_pathway_audit_admin_read"
  ON public.t3a_d1_pathway_audit FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.t3a_d1_pathway_audit_no_mutate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'PATHWAY_AUDIT_IS_APPEND_ONLY';
END; $$;

DROP TRIGGER IF EXISTS t3a_d1_pathway_audit_no_update_trg ON public.t3a_d1_pathway_audit;
CREATE TRIGGER t3a_d1_pathway_audit_no_update_trg
  BEFORE UPDATE ON public.t3a_d1_pathway_audit
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_pathway_audit_no_mutate();

DROP TRIGGER IF EXISTS t3a_d1_pathway_audit_no_delete_trg ON public.t3a_d1_pathway_audit;
CREATE TRIGGER t3a_d1_pathway_audit_no_delete_trg
  BEFORE DELETE ON public.t3a_d1_pathway_audit
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_pathway_audit_no_mutate();

CREATE OR REPLACE FUNCTION public.t3a_d1_emit_pathway_event(
  p_event public.t3a_d1_pathway_event,
  p_actor uuid,
  p_participant uuid,
  p_dimension text,
  p_stage_instance uuid,
  p_served_instance uuid,
  p_sub_reason public.t3a_d1_s2_refusal_sub_reason,
  p_body jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.t3a_d1_pathway_audit
    (event, actor_id, participant_id, dimension_id, stage_instance_id,
     served_instance_id, sub_reason, body)
  VALUES
    (p_event, p_actor, p_participant, p_dimension, p_stage_instance,
     p_served_instance, p_sub_reason, COALESCE(p_body, '{}'::jsonb))
  RETURNING pathway_audit_id INTO v_id;
  RETURN v_id;
END; $$;

-- ========================================================================
-- §3 · Involvement (Section 6)
-- ========================================================================
--
-- THE DISTINCTION THAT MUST BE IMPLEMENTED:
--   Assignment is an allocation fact. By itself it does not make a mentor
--   involved and does not merge authorities. Stage 1 determination capture
--   and Stage 1 confirmation are involving evidence actions. Once the
--   assigned mentor performs one, that involvement is recorded against the
--   contributing record and governs later eligibility.
--
-- This table is therefore the ONLY source of involvement. Nothing infers
-- it from mentor_assignments.

CREATE TABLE IF NOT EXISTS public.t3a_d1_involvement (
  involvement_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  participant_id uuid not null,
  dimension_id text not null,
  involving_action public.t3a_d1_involving_action not null,
  contributing_record_kind text not null,
  contributing_record_id uuid,
  recorded_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_involvement_lookup_idx
  ON public.t3a_d1_involvement (participant_id, dimension_id, actor_id);

ALTER TABLE public.t3a_d1_involvement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_involvement_admin_read" ON public.t3a_d1_involvement;
CREATE POLICY "t3a_d1_involvement_admin_read"
  ON public.t3a_d1_involvement FOR SELECT TO authenticated
  USING (public.is_admin());

-- Involvement is a record of something that happened; it is not editable.
DROP TRIGGER IF EXISTS t3a_d1_involvement_no_update_trg ON public.t3a_d1_involvement;
CREATE TRIGGER t3a_d1_involvement_no_update_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_involvement
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_pathway_audit_no_mutate();

CREATE OR REPLACE FUNCTION public.t3a_d1_is_involved(
  p_actor uuid, p_participant uuid, p_dimension text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_d1_involvement
     WHERE actor_id = p_actor
       AND participant_id = p_participant
       AND dimension_id = p_dimension
  );
$$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_is_involved(uuid, uuid, text) TO authenticated;

-- ========================================================================
-- §4 · Routing, determination capture, confirmation
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_s1_routing (
  s1_routing_id uuid primary key default gen_random_uuid(),
  stage_instance_id uuid not null,
  participant_id uuid not null,
  dimension_id text not null,
  assigned_mentor_id uuid not null,
  routed_at timestamptz not null default now(),
  cleared_at timestamptz,
  previous_mentor_id uuid,
  reassignment_reason text,
  unique (stage_instance_id)
);

ALTER TABLE public.t3a_d1_s1_routing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_s1_routing_read" ON public.t3a_d1_s1_routing;
CREATE POLICY "t3a_d1_s1_routing_read"
  ON public.t3a_d1_s1_routing FOR SELECT TO authenticated
  USING (assigned_mentor_id = auth.uid() OR participant_id = auth.uid() OR public.is_admin());

GRANT SELECT ON public.t3a_d1_s1_routing TO authenticated;

-- Step 4 record. Structured selections only — Section 4 prohibits any
-- free-text narrative field for the mentor, so none exists here.
CREATE TABLE IF NOT EXISTS public.t3a_d1_s1_determination (
  s1_determination_id uuid primary key default gen_random_uuid(),
  stage_instance_id uuid not null,
  participant_id uuid not null,
  dimension_id text not null,
  captured_by uuid not null,
  question_id text not null,
  selection jsonb not null,
  captured_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_s1_determination_instance_idx
  ON public.t3a_d1_s1_determination (stage_instance_id);

ALTER TABLE public.t3a_d1_s1_determination ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_s1_determination_read" ON public.t3a_d1_s1_determination;
CREATE POLICY "t3a_d1_s1_determination_read"
  ON public.t3a_d1_s1_determination FOR SELECT TO authenticated
  USING (captured_by = auth.uid() OR public.is_admin());

-- Step 5 record. captured_at is recorded separately from the Stage 1 close
-- timestamp (Section 5) so a confirmation made days later is never
-- presented as contemporaneous.
CREATE TABLE IF NOT EXISTS public.t3a_d1_s1_confirmation (
  s1_confirmation_id uuid primary key default gen_random_uuid(),
  stage_instance_id uuid not null,
  participant_id uuid not null,
  dimension_id text not null,
  confirmed_by uuid not null,
  s1_closed_at timestamptz,
  captured_at timestamptz not null default now(),
  unique (stage_instance_id)
);

ALTER TABLE public.t3a_d1_s1_confirmation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_s1_confirmation_read" ON public.t3a_d1_s1_confirmation;
CREATE POLICY "t3a_d1_s1_confirmation_read"
  ON public.t3a_d1_s1_confirmation FOR SELECT TO authenticated
  USING (confirmed_by = auth.uid() OR participant_id = auth.uid() OR public.is_admin());

GRANT SELECT ON public.t3a_d1_s1_confirmation TO authenticated;

-- ========================================================================
-- §5 · THE GATE (Section 3) — built before the happy path
-- ========================================================================
--
-- stage_2_entry_eligible is false unless ALL of the following are true for
-- the same participant and dimension:
--   * the Stage 1 instance is closed
--   * a confirmation record exists for that Stage 1 instance, created by
--     the assigned mentor
--   * the observation record is committed
--   * a progression record exists and permits continuation
--
-- If any is false, Stage 2 entry refuses and logs. It does not queue, it
-- does not warn-and-allow, and it does not proceed with a placeholder.
--
-- ASSUMPTION RECORDED (Developer Judgment Boundary): "permits
-- continuation" is read as decision = 'proceed'. Under FD-D1-05 the closed
-- set is proceed / redirect / pause; redirect and pause do not continue to
-- Stage 2. This is a technical reading of an existing closed set, not a
-- new doctrine value, and no fourth value is introduced.

CREATE OR REPLACE FUNCTION public.t3a_d1_stage_2_entry_eligible(
  p_participant uuid,
  p_dimension text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_s1 record;
  v_conf record;
  v_committed boolean;
  v_progression text;
BEGIN
  -- NOTE: dimension_id is typed inconsistently across the existing
  -- schema — t3a_stage_instance uses the t3a_dimension_code enum while
  -- t3a_observation_record and t3a_d1_progression_decision use text.
  -- Standing Rule 4 forbids renaming or retyping either, so this function
  -- casts at the comparison rather than changing a column. Recorded as a
  -- migration-plan item for Note 6 (b).
  SELECT stage_instance_id, state, completed_at
    INTO v_s1
    FROM public.t3a_stage_instance
   WHERE participant_id = p_participant
     AND dimension_id::text = p_dimension
     AND stage_code::text = 'S1'
   ORDER BY attempt_no DESC NULLS LAST, created_at DESC
   LIMIT 1;

  IF v_s1.stage_instance_id IS NULL
     OR v_s1.completed_at IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'refusal_code', 'S2_ENTRY_REFUSED_S1_GATE_INCOMPLETE',
      'sub_reason', 'S1_NOT_CLOSED');
  END IF;

  SELECT * INTO v_conf
    FROM public.t3a_d1_s1_confirmation
   WHERE stage_instance_id = v_s1.stage_instance_id;

  IF v_conf.s1_confirmation_id IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'refusal_code', 'S2_ENTRY_REFUSED_S1_GATE_INCOMPLETE',
      'sub_reason', 'S1_CONFIRMATION_MISSING');
  END IF;

  -- The confirmation must have been created by the ASSIGNED mentor.
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_s1_routing r
     WHERE r.stage_instance_id = v_s1.stage_instance_id
       AND r.assigned_mentor_id = v_conf.confirmed_by
  ) THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'refusal_code', 'S2_ENTRY_REFUSED_S1_GATE_INCOMPLETE',
      'sub_reason', 'S1_CONFIRMATION_MISSING');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.t3a_observation_record o
     WHERE o.participant_id = p_participant
       AND o.dimension_id::text = p_dimension
       AND o.stage_code::text = 'S1'
       AND o.is_committed IS TRUE
  ) INTO v_committed;

  IF NOT v_committed THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'refusal_code', 'S2_ENTRY_REFUSED_S1_GATE_INCOMPLETE',
      'sub_reason', 'S1_OBSERVATION_NOT_COMMITTED');
  END IF;

  SELECT decision::text INTO v_progression
    FROM public.t3a_d1_progression_decision
   WHERE participant_id = p_participant
     AND dimension_id::text = p_dimension
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_progression IS DISTINCT FROM 'proceed' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'refusal_code', 'S2_ENTRY_REFUSED_S1_GATE_INCOMPLETE',
      'sub_reason', 'S1_PROGRESSION_NOT_PERMITTING_CONTINUATION');
  END IF;

  RETURN jsonb_build_object('eligible', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_stage_2_entry_eligible(uuid, text) TO authenticated;

-- The attempt endpoint. Refuses and logs, or permits and logs.
-- The participant-facing state stays neutral in every case: Stage 2 is not
-- yet available. It never states a reason about the mentor, the
-- participant or the Stage 1 content.
CREATE OR REPLACE FUNCTION public.t3a_d1_attempt_stage_2_entry(
  p_participant uuid,
  p_dimension text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gate jsonb;
BEGIN
  v_gate := public.t3a_d1_stage_2_entry_eligible(p_participant, p_dimension);

  IF (v_gate->>'eligible')::boolean THEN
    PERFORM public.t3a_d1_emit_pathway_event(
      's2_entry_permitted', auth.uid(), p_participant, p_dimension,
      NULL, NULL, NULL, v_gate);
    RETURN jsonb_build_object('ok', true, 'participant_state', 'Stage 2 is available.');
  END IF;

  PERFORM public.t3a_d1_emit_pathway_event(
    's2_entry_refused', auth.uid(), p_participant, p_dimension,
    NULL, NULL, (v_gate->>'sub_reason')::public.t3a_d1_s2_refusal_sub_reason, v_gate);

  RETURN jsonb_build_object(
    'ok', false,
    'refusal_code', v_gate->>'refusal_code',
    'sub_reason', v_gate->>'sub_reason',
    'participant_state', 'Stage 2 is not yet available.');
END; $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_attempt_stage_2_entry(uuid, text) TO authenticated;

-- ========================================================================
-- §6 · Independence refusals (Section 6)
-- ========================================================================
--
-- Two distinct failures, two distinct codes. Neither falls back.
--   NO_INDEPENDENT_REVIEWER_AVAILABLE — no eligible uninvolved actor
--     exists to perform evidence review. It does NOT fall back to the
--     assigned mentor and does not proceed with an involved actor.
--   NO_INDEPENDENT_ISSUER_AVAILABLE — review performed but no eligible
--     actor distinct from the reviewer exists to issue. It does NOT fall
--     back to the reviewer.

CREATE OR REPLACE FUNCTION public.t3a_d1_check_evidence_review_eligibility(
  p_actor uuid, p_participant uuid, p_dimension text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_INDEPENDENT_REVIEWER_AVAILABLE');
  END IF;

  IF public.t3a_d1_is_involved(p_actor, p_participant, p_dimension) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_INDEPENDENT_REVIEWER_AVAILABLE');
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.t3a_d1_check_issuer_eligibility(
  p_actor uuid, p_reviewer uuid, p_participant uuid, p_dimension text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_actor IS NULL OR p_reviewer IS NULL OR p_actor = p_reviewer THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_INDEPENDENT_ISSUER_AVAILABLE');
  END IF;

  IF public.t3a_d1_is_involved(p_actor, p_participant, p_dimension) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_INDEPENDENT_ISSUER_AVAILABLE');
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_check_evidence_review_eligibility(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_check_issuer_eligibility(uuid, uuid, uuid, text) TO authenticated;

-- ========================================================================
-- §7 · The happy-path writers (steps 3, 4, 5)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_d1_route_s1_outcome(
  p_stage_instance_id uuid,
  p_assigned_mentor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_si record; v_id uuid;
BEGIN
  IF NOT public.t3a_is_service_context() AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORIZED');
  END IF;

  SELECT * INTO v_si FROM public.t3a_stage_instance
   WHERE stage_instance_id = p_stage_instance_id;
  IF v_si.stage_instance_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'STAGE_INSTANCE_NOT_FOUND');
  END IF;
  IF v_si.completed_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'S1_NOT_CLOSED');
  END IF;

  INSERT INTO public.t3a_d1_s1_routing
    (stage_instance_id, participant_id, dimension_id, assigned_mentor_id)
  VALUES
    (p_stage_instance_id, v_si.participant_id, v_si.dimension_id::text, p_assigned_mentor_id)
  ON CONFLICT (stage_instance_id) DO NOTHING
  RETURNING s1_routing_id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_ROUTED');
  END IF;

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_administration_completed', NULL, v_si.participant_id, v_si.dimension_id,
    p_stage_instance_id, NULL, NULL, '{}'::jsonb);

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_outcome_routed_to_mentor', NULL, v_si.participant_id, v_si.dimension_id,
    p_stage_instance_id, NULL, NULL,
    jsonb_build_object('assigned_mentor_id', p_assigned_mentor_id, 'routed_at', now()));

  RETURN jsonb_build_object('ok', true, 's1_routing_id', v_id);
END; $$;

-- Step 4. Writes determinations AND the involvement record. Separate from
-- confirmation — a single control that does both is prohibited.
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_s1_determinations(
  p_stage_instance_id uuid,
  p_selections jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_r record; v_actor uuid := auth.uid(); v_item jsonb; v_n int := 0;
BEGIN
  SELECT * INTO v_r FROM public.t3a_d1_s1_routing
   WHERE stage_instance_id = p_stage_instance_id;
  IF v_r.s1_routing_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ROUTED');
  END IF;
  IF v_actor IS DISTINCT FROM v_r.assigned_mentor_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ASSIGNED_MENTOR');
  END IF;
  IF jsonb_typeof(p_selections) <> 'array' OR jsonb_array_length(p_selections) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_SELECTIONS');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_selections) LOOP
    INSERT INTO public.t3a_d1_s1_determination
      (stage_instance_id, participant_id, dimension_id, captured_by,
       question_id, selection)
    VALUES
      (p_stage_instance_id, v_r.participant_id, v_r.dimension_id, v_actor,
       v_item->>'question_id', v_item->'selection');
    v_n := v_n + 1;
  END LOOP;

  -- Section 6: involvement is written AT CAPTURE, as a recorded
  -- consequence of the act.
  INSERT INTO public.t3a_d1_involvement
    (actor_id, participant_id, dimension_id, involving_action,
     contributing_record_kind, contributing_record_id)
  VALUES
    (v_actor, v_r.participant_id, v_r.dimension_id, 's1_determination_capture',
     't3a_stage_instance', p_stage_instance_id);

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_determinations_captured', v_actor, v_r.participant_id, v_r.dimension_id,
    p_stage_instance_id, NULL, NULL, jsonb_build_object('count', v_n));

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_involvement_recorded', v_actor, v_r.participant_id, v_r.dimension_id,
    p_stage_instance_id, NULL, NULL,
    jsonb_build_object('involving_action', 's1_determination_capture'));

  RETURN jsonb_build_object('ok', true, 'captured', v_n);
END; $$;

-- Step 5. A SEPARATE persisted action from step 4.
CREATE OR REPLACE FUNCTION public.t3a_d1_confirm_s1_observation(
  p_stage_instance_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_r record; v_actor uuid := auth.uid(); v_closed timestamptz; v_id uuid;
BEGIN
  SELECT * INTO v_r FROM public.t3a_d1_s1_routing
   WHERE stage_instance_id = p_stage_instance_id;
  IF v_r.s1_routing_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ROUTED');
  END IF;
  IF v_actor IS DISTINCT FROM v_r.assigned_mentor_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ASSIGNED_MENTOR');
  END IF;

  -- Determinations must exist first: capture and confirmation are two
  -- records in order, never one action.
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_s1_determination
     WHERE stage_instance_id = p_stage_instance_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'DETERMINATIONS_MISSING');
  END IF;

  SELECT completed_at INTO v_closed FROM public.t3a_stage_instance
   WHERE stage_instance_id = p_stage_instance_id;

  INSERT INTO public.t3a_d1_s1_confirmation
    (stage_instance_id, participant_id, dimension_id, confirmed_by, s1_closed_at)
  VALUES
    (p_stage_instance_id, v_r.participant_id, v_r.dimension_id, v_actor, v_closed)
  ON CONFLICT (stage_instance_id) DO NOTHING
  RETURNING s1_confirmation_id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_CONFIRMED');
  END IF;

  INSERT INTO public.t3a_d1_involvement
    (actor_id, participant_id, dimension_id, involving_action,
     contributing_record_kind, contributing_record_id)
  VALUES
    (v_actor, v_r.participant_id, v_r.dimension_id, 's1_confirmation',
     't3a_d1_s1_confirmation', v_id);

  UPDATE public.t3a_d1_s1_routing SET cleared_at = now()
   WHERE stage_instance_id = p_stage_instance_id;

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_observation_confirmed', v_actor, v_r.participant_id, v_r.dimension_id,
    p_stage_instance_id, NULL, NULL,
    jsonb_build_object('captured_at', now(), 's1_closed_at', v_closed));

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_involvement_recorded', v_actor, v_r.participant_id, v_r.dimension_id,
    p_stage_instance_id, NULL, NULL,
    jsonb_build_object('involving_action', 's1_confirmation'));

  RETURN jsonb_build_object('ok', true, 's1_confirmation_id', v_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_capture_s1_determinations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_confirm_s1_observation(uuid) TO authenticated;

-- ========================================================================
-- §8 · Reassignment (Section 5)
-- ========================================================================
--
-- "Reassignment is an administrative action on the assignment record. It
--  is authorized by the same existing server-side capability that
--  currently authorizes mentor assignment in the repository. Do not create
--  a new capability for it.
--
--  If no such governed capability exists in the repository, the
--  reassignment endpoint stays disabled and logs
--  S1_REASSIGNMENT_AUTHORITY_UNAVAILABLE."
--
-- FINDING: no governed server-side mentor-assignment capability exists in
-- this repository. The Note 1 Step 1 inventory found assignment has no
-- administrator action and no approval record behind it. Per the rule
-- above this endpoint is therefore DISABLED and logs. The pending
-- confirmation remains pending. No new capability is invented here.

CREATE OR REPLACE FUNCTION public.t3a_d1_reassign_s1_confirmation(
  p_stage_instance_id uuid,
  p_new_mentor_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r record;
BEGIN
  SELECT * INTO v_r FROM public.t3a_d1_s1_routing
   WHERE stage_instance_id = p_stage_instance_id;

  PERFORM public.t3a_d1_emit_pathway_event(
    's1_confirmation_reassigned', auth.uid(),
    v_r.participant_id, v_r.dimension_id, p_stage_instance_id, NULL, NULL,
    jsonb_build_object(
      'outcome', 'refused',
      'reason', 'S1_REASSIGNMENT_AUTHORITY_UNAVAILABLE',
      'requested_new_mentor_id', p_new_mentor_id,
      'requested_reason', p_reason));

  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'S1_REASSIGNMENT_AUTHORITY_UNAVAILABLE',
    'note', 'No governed server-side mentor-assignment capability exists in this repository. The pending confirmation remains pending. No automatic reassignment occurs on any elapsed time.');
END; $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_reassign_s1_confirmation(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
