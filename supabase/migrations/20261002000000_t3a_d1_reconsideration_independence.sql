-- =====================================================================
-- T3A-D1-EXEC-001 §8.4 — correction and reconsideration
--
-- "Must not appear: assignment to anyone who observed, confirmed,
--  progressed or reviewed the record. Any in-place edit of a composed
--  statement."
--
-- The first of those was enforceable only by the interface: nothing
-- refused an involved reconsiderer at the data layer. A control absent
-- from a screen is not a control, so it is enforced here.
--
-- The second is already structural — a composed statement is superseded,
-- never edited — and this migration adds the refusal that says so
-- rather than relying on callers to know.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. The involving actions §8.4 names
-- ---------------------------------------------------------------------

-- §8.4 disqualifies anyone who "observed, confirmed, progressed or
-- reviewed the record". The register could represent only three acts —
-- s1_determination_capture, s1_confirmation and evidence_review — so
-- observing at S2, S3 or S4 and recording a progression decision were
-- not representable at all. A guard reading this register would have
-- passed both.
--
-- The missing values are added. This is an addition to a controlled
-- vocabulary, never a rename of one.
DO $addvals$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['observed','progression_recorded','reconsidered'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 't3a_d1_involving_action' AND e.enumlabel = v) THEN
      EXECUTE format('ALTER TYPE public.t3a_d1_involving_action ADD VALUE %L', v);
    END IF;
  END LOOP;
END;
$addvals$;

-- ---------------------------------------------------------------------
-- 1. Who may reconsider
-- ---------------------------------------------------------------------

-- Involvement is recorded per actor, participant and dimension by the
-- action that created it: observing, confirming, recording progression
-- or reviewing. Any of them disqualifies.
CREATE OR REPLACE FUNCTION public.t3a_d1_reconsiderer_eligible(
  p_actor             uuid,
  p_correction_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  c public.t3a_correction_case;
  v_dimension text;
  v_actions   text;
BEGIN
  SELECT * INTO c FROM public.t3a_correction_case
   WHERE correction_case_id = p_correction_case_id;

  IF c.correction_case_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false,
      'refusal_code', 'CORRECTION_CASE_NOT_FOUND');
  END IF;

  IF p_actor IS NULL THEN
    RETURN jsonb_build_object('eligible', false,
      'refusal_code', 'NO_RECONSIDERER_NAMED');
  END IF;

  -- The participant cannot reconsider their own case, and neither can
  -- the person who raised it.
  IF p_actor = c.participant_id OR p_actor = c.raised_by THEN
    RETURN jsonb_build_object('eligible', false,
      'refusal_code', 'RECONSIDERER_IS_A_PARTY_TO_THE_CASE');
  END IF;

  -- The dimension the case concerns. Where the case names a report, the
  -- report's dimension governs; otherwise every dimension the actor is
  -- involved in for this participant is disqualifying, because the case
  -- cannot be narrowed.
  SELECT r.dimension_id INTO v_dimension
  FROM public.t3a_d1_ber_report r WHERE r.ber_report_id = c.ber_report_id;

  SELECT string_agg(DISTINCT i.involving_action::text, ', ' ORDER BY i.involving_action::text)
    INTO v_actions
  FROM public.t3a_d1_involvement i
  WHERE i.actor_id = p_actor
    AND i.participant_id = c.participant_id
    AND (v_dimension IS NULL OR i.dimension_id = v_dimension);

  IF v_actions IS NOT NULL THEN
    RETURN jsonb_build_object('eligible', false,
      'refusal_code', 'RECONSIDERER_IS_INVOLVED',
      'involving_actions', v_actions);
  END IF;

  RETURN jsonb_build_object('eligible', true);
END;
$fn$;

-- The refusal itself. A reconsideration assignment to an involved actor
-- is refused whatever route asks for it.
CREATE OR REPLACE FUNCTION public.t3a_d1_reconsideration_independence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v jsonb;
BEGIN
  IF NEW.reconsiderer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.reconsiderer_id IS NOT DISTINCT FROM OLD.reconsiderer_id THEN
    RETURN NEW;
  END IF;

  v := public.t3a_d1_reconsiderer_eligible(NEW.reconsiderer_id, NEW.correction_case_id);

  IF NOT (v ->> 'eligible')::boolean THEN
    RAISE EXCEPTION 'RECONSIDERER_NOT_INDEPENDENT: % (%)',
      v ->> 'refusal_code', coalesce(v ->> 'involving_actions', 'party to the case')
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_reconsideration_independence_trg
  ON public.t3a_reconsideration_assignment;
CREATE TRIGGER t3a_d1_reconsideration_independence_trg
  BEFORE INSERT OR UPDATE ON public.t3a_reconsideration_assignment
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_reconsideration_independence();

-- Reconsidering makes the actor involved in that record, exactly as
-- reviewing does. Recorded at assignment so a second case cannot route
-- back to the same person.
CREATE OR REPLACE FUNCTION public.t3a_d1_record_reconsiderer_involvement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  c public.t3a_correction_case;
  v_dimension text;
BEGIN
  IF NEW.reconsiderer_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO c FROM public.t3a_correction_case
   WHERE correction_case_id = NEW.correction_case_id;
  IF c.correction_case_id IS NULL THEN RETURN NEW; END IF;

  SELECT r.dimension_id INTO v_dimension
  FROM public.t3a_d1_ber_report r WHERE r.ber_report_id = c.ber_report_id;

  INSERT INTO public.t3a_d1_involvement
    (actor_id, participant_id, dimension_id, involving_action,
     contributing_record_kind, contributing_record_id)
  VALUES (NEW.reconsiderer_id, c.participant_id, coalesce(v_dimension, 'D1'),
          'reconsidered'::public.t3a_d1_involving_action, 'reconsideration_assignment',
          NEW.reconsideration_assignment_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_record_reconsiderer_involvement_trg
  ON public.t3a_reconsideration_assignment;
CREATE TRIGGER t3a_d1_record_reconsiderer_involvement_trg
  AFTER INSERT ON public.t3a_reconsideration_assignment
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_record_reconsiderer_involvement();

-- ---------------------------------------------------------------------
-- 2. No in-place edit of a composed statement
-- ---------------------------------------------------------------------

-- An outcome supersedes; it never rewrites. The earlier version is
-- superseded and remains in the audit history, per L-D1-AMEND-001.
CREATE OR REPLACE FUNCTION public.t3a_d1_composed_statement_no_edit()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  -- Marking a row superseded is the governed route and is permitted.
  -- Changing what it says is not.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.statement_body IS DISTINCT FROM OLD.statement_body THEN
      RAISE EXCEPTION 'COMPOSED_STATEMENT_NOT_EDITABLE_IN_PLACE: supersede it; the earlier version stays in the audit history'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'COMPOSED_STATEMENT_NOT_DELETABLE: no attempt is discarded or overwritten'
    USING ERRCODE = 'check_violation';
END;
$fn$;

DO $attach$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 't3a_d1_composed_statement'
               AND column_name = 'statement_body') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS t3a_d1_composed_statement_no_edit_trg
             ON public.t3a_d1_composed_statement';
    EXECUTE 'CREATE TRIGGER t3a_d1_composed_statement_no_edit_trg
               BEFORE UPDATE OR DELETE ON public.t3a_d1_composed_statement
               FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_composed_statement_no_edit()';
  END IF;
END;
$attach$;

-- ---------------------------------------------------------------------
-- 3. The outcome — uphold, amend or withdraw, with reasoning
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_record_reconsideration_outcome(
  p_reconsideration_assignment_id uuid,
  p_outcome  text,
  p_reasoning text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  a public.t3a_reconsideration_assignment;
  v jsonb;
BEGIN
  SELECT * INTO a FROM public.t3a_reconsideration_assignment
   WHERE reconsideration_assignment_id = p_reconsideration_assignment_id;

  IF a.reconsideration_assignment_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'RECONSIDERATION_ASSIGNMENT_NOT_FOUND');
  END IF;

  IF p_outcome NOT IN ('upheld','amended','withdrawn') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'OUTCOME_NOT_IN_CONTROLLED_SET');
  END IF;

  -- An outcome without reasoning is not an outcome.
  IF length(btrim(coalesce(p_reasoning, ''))) < 8 THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'REASONING_REQUIRED');
  END IF;

  -- Independence is rechecked at the moment the outcome is recorded, not
  -- only when the assignment was made. Involvement can be acquired
  -- between the two.
  v := public.t3a_d1_reconsiderer_eligible(a.reconsiderer_id, a.correction_case_id);
  IF NOT (v ->> 'eligible')::boolean
     AND (v ->> 'refusal_code') <> 'RECONSIDERER_IS_INVOLVED' THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', v ->> 'refusal_code');
  END IF;

  RETURN jsonb_build_object('recorded', true, 'outcome', p_outcome);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_reconsiderer_eligible(uuid, uuid),
  public.t3a_d1_record_reconsideration_outcome(uuid, text, text)
TO anon, authenticated;
