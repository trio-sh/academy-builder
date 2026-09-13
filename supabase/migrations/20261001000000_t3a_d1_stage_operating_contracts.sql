-- =====================================================================
-- T3A-D1-EXEC-001 section 8 — Stage operating contracts
--   8.1 Stage 1 AI administration and the S1 Confirmation Workbench
--   8.2 Stage 3 work sample lifecycle
--   8.3 Stage 4 shared session
--
-- Stage 2 is specified at section 3 and is not re-decided here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Section 8.1 — the S1 Confirmation Workbench
-- ---------------------------------------------------------------------

-- Order, and it is fixed: AI administration -> human determination
-- capture in the workbench -> confirmS1Observation -> commit ->
-- progression. Each is a separate persisted action.
CREATE TABLE IF NOT EXISTS public.t3a_d1_s1_workbench_session (
  workbench_session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_administration_run_id uuid NOT NULL
    REFERENCES public.t3a_d1_ai_administration_run(ai_administration_run_id) ON DELETE RESTRICT,
  participant_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  captured_by          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  opened_at            timestamptz NOT NULL DEFAULT now(),
  captured_at          timestamptz,
  administration_ended_at timestamptz,
  confirmed_at         timestamptz,
  UNIQUE (ai_administration_run_id)
);

COMMENT ON TABLE public.t3a_d1_s1_workbench_session IS
  'Section 8.1.1. The surface where an authorized human converts captured responses into factual determinations. capture_s1 and confirm_s1 are the same authorization: the person who captures the determinations is the person who confirms the observation, because confirming is asserting that these determinations match the responses. The confirmer is involved in that record for FD-D1-07 from the moment they capture it.';

-- captured_at is recorded separately from administration_ended_at, and
-- late capture is identified rather than presented as contemporaneous.
CREATE OR REPLACE FUNCTION public.t3a_d1_s1_capture_contemporaneity(
  p_workbench_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE w public.t3a_d1_s1_workbench_session;
BEGIN
  SELECT * INTO w FROM public.t3a_d1_s1_workbench_session
   WHERE workbench_session_id = p_workbench_session_id;

  IF w.workbench_session_id IS NULL THEN
    RETURN jsonb_build_object('known', false);
  END IF;
  IF w.captured_at IS NULL OR w.administration_ended_at IS NULL THEN
    RETURN jsonb_build_object('known', true, 'contemporaneous', NULL,
                              'reason', 'timing not yet complete');
  END IF;

  RETURN jsonb_build_object(
    'known', true,
    'administration_ended_at', w.administration_ended_at,
    'captured_at', w.captured_at,
    'delay_seconds', extract(epoch FROM (w.captured_at - w.administration_ended_at)),
    -- Identified, never suppressed and never presented as contemporaneous.
    'late_capture', (w.captured_at - w.administration_ended_at) > interval '1 hour');
END;
$fn$;

-- The workbench refuses to open where provenance is missing or the
-- responses are absent.
CREATE OR REPLACE FUNCTION public.t3a_d1_s1_workbench_may_open(
  p_ai_administration_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.t3a_d1_ai_administration_run;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO r FROM public.t3a_d1_ai_administration_run
   WHERE ai_administration_run_id = p_ai_administration_run_id;

  IF r.ai_administration_run_id IS NULL THEN
    RETURN jsonb_build_object('may_open', false,
      'refusal_code', 'AI_ADMINISTRATION_RUN_NOT_FOUND');
  END IF;

  IF r.model_ref_version_id  IS NULL THEN v_missing := v_missing || 'model_ref'::text; END IF;
  IF r.prompt_ref_version_id IS NULL THEN v_missing := v_missing || 'prompt_ref'::text; END IF;
  IF r.admin_config_version_id IS NULL THEN v_missing := v_missing || 'configuration_ref'::text; END IF;
  IF r.rendered_body IS NULL THEN v_missing := v_missing || 'participant_responses'::text; END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RETURN jsonb_build_object('may_open', false,
      'refusal_code', 'S1_WORKBENCH_PROVENANCE_INCOMPLETE',
      'missing', array_to_string(v_missing, ', '));
  END IF;

  RETURN jsonb_build_object('may_open', true);
END;
$fn$;

-- Where any served question is unresolved, confirmS1Observation refuses.
CREATE OR REPLACE FUNCTION public.t3a_d1_s1_may_confirm(
  p_ai_administration_run_id uuid,
  p_source_sheet jsonb,
  p_selections   jsonb,
  p_missing      jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_open jsonb := public.t3a_d1_s1_workbench_may_open(p_ai_administration_run_id);
  v_unresolved text;
  v_answers jsonb := jsonb_build_object('missing', p_missing);
BEGIN
  IF NOT (v_open ->> 'may_open')::boolean THEN
    RETURN v_open || jsonb_build_object('may_confirm', false);
  END IF;

  IF (p_selections ? 'Q-D1-03a') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-03a',
      CASE (p_selections ->> 'Q-D1-03a')::integer
        WHEN 1 THEN 'corresponded' WHEN 2 THEN 'omission'
        WHEN 3 THEN 'unsupported_claim' WHEN 4 THEN 'both' ELSE 'no_account' END);
  END IF;
  IF (p_selections ? 'Q-D1-05a') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-05a',
      CASE WHEN (p_selections ->> 'Q-D1-05a')::integer = 3 THEN 'none' ELSE 'action' END);
  END IF;
  IF (p_selections ? 'Q-D1-08a') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-08a',
      CASE WHEN (p_selections ->> 'Q-D1-08a')::integer = 4
           THEN 'not_within_period' ELSE 'disclosed' END);
  END IF;

  SELECT string_agg(s.question_code, ', ' ORDER BY s.question_code) INTO v_unresolved
  FROM public.t3a_d1_served_questions(p_source_sheet, v_answers) s
  WHERE s.served
    AND s.question_code <> 'Q-D1-04b-child'
    -- Q-D1-06 is not served at S1. Section 1 places route use at Stage 1
    -- in the prohibited category for launch, so it is excluded here
    -- rather than left to the source sheet.
    AND s.question_code <> 'Q-D1-06'
    AND NOT (p_selections ? s.question_code)
    AND NOT (p_missing ? s.question_code);

  IF v_unresolved IS NOT NULL THEN
    RETURN jsonb_build_object('may_confirm', false,
      'refusal_code', 'S1_SERVED_QUESTION_UNRESOLVED', 'questions', v_unresolved);
  END IF;

  RETURN jsonb_build_object('may_confirm', true);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. Section 8.2 — Stage 3 work sample lifecycle
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_work_sample_submission (
  submission_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  source_version_id  uuid,
  stage_instance_id  uuid,
  state              text NOT NULL DEFAULT 'ASSIGNED' CHECK (state IN (
                       'ASSIGNED','ACCEPTED','DECLINED','IN_PROGRESS','SUBMITTED',
                       'PROVENANCE_CHECKED','AVAILABLE_FOR_CAPTURE','CAPTURED',
                       'CLOSED','RESUBMITTED')),
  assigned_at        timestamptz NOT NULL DEFAULT now(),
  deadline_at        timestamptz,
  submitted_at       timestamptz,
  -- A missed deadline records a lifecycle attribute. It composes no
  -- statement, is never adverse conduct, and does not consume an attempt.
  deadline_missed    boolean NOT NULL DEFAULT false,
  artifact_ref       text,
  -- The three declarations. No free text in any of them. A declaration
  -- is never adverse conduct and never composes a clause; it is
  -- provenance.
  authorship_attestation boolean,
  assistance_declaration boolean,
  assistance_detail  text CHECK (assistance_detail IS NULL OR assistance_detail IN (
                       'a colleague','a manager','a friend or family member',
                       'a tutor or coach','someone else')),
  tooling_declaration boolean,
  tooling_detail     text CHECK (tooling_detail IS NULL OR tooling_detail IN (
                       'drafting or writing','calculation or analysis',
                       'formatting or layout','checking or review','something else')),
  prior_version_ref  uuid REFERENCES public.t3a_d1_work_sample_submission(submission_id),
  superseded_by      uuid REFERENCES public.t3a_d1_work_sample_submission(submission_id),
  declined_at        timestamptz
);

COMMENT ON TABLE public.t3a_d1_work_sample_submission IS
  'Section 8.2. The artifact is held in the evidence domain and is not rendered on any report face; the quality of the work is not recorded. A decline records that the situation did not run and is never an evidence outcome and never adverse. A resubmission supersedes and nothing is overwritten.';

-- The provenance check: eleven required fields on a first submission,
-- and prior_version_ref as a twelfth ONLY on a resubmission. A literal
-- twelve-field check would reject every first submission.
CREATE OR REPLACE FUNCTION public.t3a_d1_work_sample_provenance_check(
  p_submission_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s public.t3a_d1_work_sample_submission;
  v_missing text[] := ARRAY[]::text[];
  v_resubmission boolean;
BEGIN
  SELECT * INTO s FROM public.t3a_d1_work_sample_submission
   WHERE submission_id = p_submission_id;

  IF s.submission_id IS NULL THEN
    RETURN jsonb_build_object('passed', false, 'refusal_code', 'SUBMISSION_NOT_FOUND');
  END IF;

  -- Derived from the state alone. Deriving it from prior_version_ref
  -- being present would make the "must be absent on a first submission"
  -- check below unreachable: the field's presence would itself declare
  -- the submission a resubmission, and a first submission carrying a
  -- stale reference would pass silently.
  v_resubmission := (s.state = 'RESUBMITTED');

  IF s.participant_id     IS NULL THEN v_missing := v_missing || 'participant_id'::text; END IF;
  IF s.source_version_id  IS NULL THEN v_missing := v_missing || 'source_version_id'::text; END IF;
  IF s.stage_instance_id  IS NULL THEN v_missing := v_missing || 'stage_instance_id'::text; END IF;
  IF s.assigned_at        IS NULL THEN v_missing := v_missing || 'assigned_at'::text; END IF;
  IF s.deadline_at        IS NULL THEN v_missing := v_missing || 'deadline_at'::text; END IF;
  IF s.submitted_at       IS NULL THEN v_missing := v_missing || 'submitted_at'::text; END IF;
  IF s.artifact_ref       IS NULL THEN v_missing := v_missing || 'artifact_ref'::text; END IF;
  IF s.authorship_attestation IS NULL THEN v_missing := v_missing || 'authorship_attestation'::text; END IF;
  IF s.assistance_declaration IS NULL THEN v_missing := v_missing || 'assistance_declaration'::text; END IF;
  IF s.state              IS NULL THEN v_missing := v_missing || 'state'::text; END IF;

  -- Named separately because it has its own refusal code.
  IF s.tooling_declaration IS NULL THEN
    RETURN jsonb_build_object('passed', false,
      'refusal_code', 'AI_USE_DECLARATION_REQUIRED');
  END IF;

  -- The twelfth field, and only on a resubmission.
  IF v_resubmission AND s.prior_version_ref IS NULL THEN
    v_missing := v_missing || 'prior_version_ref'::text;
  END IF;

  -- On a first submission it must be absent, not merely unchecked.
  IF NOT v_resubmission AND s.prior_version_ref IS NOT NULL THEN
    RETURN jsonb_build_object('passed', false,
      'refusal_code', 'PRIOR_VERSION_REF_ON_FIRST_SUBMISSION');
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RETURN jsonb_build_object('passed', false,
      'refusal_code', 'PROVENANCE_FIELD_MISSING',
      'missing', array_to_string(v_missing, ', '));
  END IF;

  -- The affirmation is required to submit.
  IF NOT s.authorship_attestation THEN
    RETURN jsonb_build_object('passed', false,
      'refusal_code', 'AUTHORSHIP_ATTESTATION_NOT_AFFIRMED');
  END IF;

  RETURN jsonb_build_object('passed', true,
    'fields_checked', CASE WHEN v_resubmission THEN 12 ELSE 11 END,
    'resubmission', v_resubmission);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 3. Section 8.3 — Stage 4 shared session
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_group_session (
  group_session_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id     uuid,
  stage_instance_id     uuid,
  facilitator_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  observed_participant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  composed_at           timestamptz NOT NULL DEFAULT now(),
  accommodation_settled boolean NOT NULL DEFAULT false,
  started_at            timestamptz,
  ended_at              timestamptz,
  paused_at             timestamptz
);

COMMENT ON TABLE public.t3a_d1_group_session IS
  'Section 8.3. One shared interaction, ONE OBSERVED PARTICIPANT. The column is singular because the rule is: one observation record is written, for the observed participant only. Accommodation needs are settled before composition, never during the session.';

CREATE TABLE IF NOT EXISTS public.t3a_d1_group_session_member (
  member_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id uuid NOT NULL REFERENCES public.t3a_d1_group_session(group_session_id) ON DELETE CASCADE,
  participant_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  member_role      text NOT NULL CHECK (member_role IN ('observed','co_participant')),
  pre_brief_ref    text,
  disconnected_at  timestamptz,
  withdrew_at      timestamptz,
  UNIQUE (group_session_id, participant_id)
);

COMMENT ON TABLE public.t3a_d1_group_session_member IS
  'Section 8.3. Co-participants are role players for that run; they generate the pressure the observed participant meets. They generate no observation record, no determination and no statement from this session. A shared interaction never produces a shared record, and never produces a record for someone it did not observe.';

-- Exactly one observed member per session.
CREATE UNIQUE INDEX IF NOT EXISTS t3a_d1_group_session_one_observed
  ON public.t3a_d1_group_session_member (group_session_id)
  WHERE member_role = 'observed';

-- The observed member must be the participant the session names.
CREATE OR REPLACE FUNCTION public.t3a_d1_group_member_guard()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_observed uuid;
BEGIN
  SELECT observed_participant_id INTO v_observed
  FROM public.t3a_d1_group_session WHERE group_session_id = NEW.group_session_id;

  IF NEW.member_role = 'observed' AND NEW.participant_id <> v_observed THEN
    RAISE EXCEPTION 'GROUP_SESSION_OBSERVED_MEMBER_MISMATCH'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.member_role = 'co_participant' AND NEW.participant_id = v_observed THEN
    RAISE EXCEPTION 'GROUP_SESSION_OBSERVED_CANNOT_BE_CO_PARTICIPANT'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_group_member_guard_trg ON public.t3a_d1_group_session_member;
CREATE TRIGGER t3a_d1_group_member_guard_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_group_session_member
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_group_member_guard();

-- Capture is permitted for the observed participant only. A co-participant
-- generates no observation record by any route.
CREATE OR REPLACE FUNCTION public.t3a_d1_group_capture_permitted(
  p_group_session_id uuid,
  p_participant_id   uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_role text;
BEGIN
  SELECT member_role INTO v_role FROM public.t3a_d1_group_session_member
   WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'NOT_A_MEMBER_OF_THIS_SESSION');
  END IF;

  IF v_role = 'co_participant' THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'CO_PARTICIPANT_GENERATES_NO_OBSERVATION_RECORD');
  END IF;

  RETURN jsonb_build_object('permitted', true, 'capture_lanes', 1);
END;
$fn$;

-- A co-participant disconnecting or withdrawing is an administration
-- variance on the observed record, never a judgment about the absence
-- and never a removal of anything the co-participant holds, because they
-- hold nothing.
CREATE OR REPLACE FUNCTION public.t3a_d1_group_member_event(
  p_group_session_id uuid,
  p_participant_id   uuid,
  p_event            text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_role text;
BEGIN
  SELECT member_role INTO v_role FROM public.t3a_d1_group_session_member
   WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NOT_A_MEMBER_OF_THIS_SESSION');
  END IF;

  IF p_event = 'disconnect' THEN
    UPDATE public.t3a_d1_group_session_member SET disconnected_at = now()
     WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;
  ELSIF p_event = 'withdraw' THEN
    UPDATE public.t3a_d1_group_session_member SET withdrew_at = now()
     WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;
  ELSE
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'UNKNOWN_EVENT');
  END IF;

  IF v_role = 'observed' AND p_event = 'disconnect' THEN
    UPDATE public.t3a_d1_group_session SET paused_at = now()
     WHERE group_session_id = p_group_session_id;
    RETURN jsonb_build_object('recorded', true, 'effect', 'STAGE_INSTANCE_PAUSED');
  END IF;

  IF v_role = 'observed' AND p_event = 'withdraw' THEN
    RETURN jsonb_build_object('recorded', true,
      'effect', 'DETERMINATIONS_EXCLUDED_FROM_CURRENT_COMPOSITION_RETAINED_IN_HISTORY');
  END IF;

  -- A co-participant. Nothing of theirs is removed, because they hold
  -- nothing; the observed record carries the variance.
  RETURN jsonb_build_object('recorded', true,
    'effect', 'ADMINISTRATION_VARIANCE_ON_OBSERVED_RECORD',
    'co_participant_records_removed', 0);
END;
$fn$;

ALTER TABLE public.t3a_d1_s1_workbench_session      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_work_sample_submission    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_group_session             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_group_session_member      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_s1_workbench_session_access ON public.t3a_d1_s1_workbench_session;
CREATE POLICY t3a_d1_s1_workbench_session_access ON public.t3a_d1_s1_workbench_session
  FOR ALL USING (
    captured_by = auth.uid() OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context())
  WITH CHECK (captured_by = auth.uid() OR public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_d1_work_sample_own ON public.t3a_d1_work_sample_submission;
CREATE POLICY t3a_d1_work_sample_own ON public.t3a_d1_work_sample_submission
  FOR ALL USING (
    participant_id = auth.uid() OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context()
    OR EXISTS (SELECT 1 FROM public.t3a_mentor_assignment m
               WHERE m.mentor_id = auth.uid() AND m.participant_id = participant_id))
  WITH CHECK (participant_id = auth.uid() OR public.t3a_is_service_context());

-- No participant sees any determination, record, capture lane or
-- progression, at any point, by any route — including the observed
-- participant. Only the facilitator reads the session rows.
DROP POLICY IF EXISTS t3a_d1_group_session_access ON public.t3a_d1_group_session;
CREATE POLICY t3a_d1_group_session_access ON public.t3a_d1_group_session
  FOR ALL USING (
    facilitator_id = auth.uid() OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context())
  WITH CHECK (facilitator_id = auth.uid() OR public.t3a_is_service_context());

-- A pack is never visible to anyone else, so a member reads only their
-- own row and never another member's.
DROP POLICY IF EXISTS t3a_d1_group_member_access ON public.t3a_d1_group_session_member;
CREATE POLICY t3a_d1_group_member_access ON public.t3a_d1_group_session_member
  FOR SELECT USING (
    participant_id = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context()
    OR EXISTS (SELECT 1 FROM public.t3a_d1_group_session g
               WHERE g.group_session_id = group_session_id AND g.facilitator_id = auth.uid()));

DROP POLICY IF EXISTS t3a_d1_group_member_write ON public.t3a_d1_group_session_member;
CREATE POLICY t3a_d1_group_member_write ON public.t3a_d1_group_session_member
  FOR ALL USING (
    public.t3a_is_service_context()
    OR EXISTS (SELECT 1 FROM public.t3a_d1_group_session g
               WHERE g.group_session_id = group_session_id AND g.facilitator_id = auth.uid()))
  WITH CHECK (
    public.t3a_is_service_context()
    OR EXISTS (SELECT 1 FROM public.t3a_d1_group_session g
               WHERE g.group_session_id = group_session_id AND g.facilitator_id = auth.uid()));

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s1_workbench_may_open(uuid),
  public.t3a_d1_s1_may_confirm(uuid, jsonb, jsonb, jsonb),
  public.t3a_d1_s1_capture_contemporaneity(uuid),
  public.t3a_d1_work_sample_provenance_check(uuid),
  public.t3a_d1_group_capture_permitted(uuid, uuid),
  public.t3a_d1_group_member_event(uuid, uuid, text)
TO anon, authenticated;
