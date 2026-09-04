-- T3A-D1-DEV-INS-006 · Participant review, correction, reconsideration
-- and amendment.
--
-- Instruction numbers 093..098 of Part One §3.
--
-- Governing rules (locked, not defaults):
--   093  Two state machines are the GOVERNING ENUMS.
--        BER status:         participant_review, challenge_open,
--                            ready_to_issue, issued, amended, withdrawn
--        challenge_case:     open, evidence_disclosed, response_received,
--                            under_reconsideration, then terminal
--                            upheld, amended or withdrawn
--   094  The locked mapping:
--        `correction open` is PARTICIPANT-FACING LANGUAGE for
--        challenge_case = open, and where it blocks a report, for
--        ber_status = challenge_open.
--        `review_available` is AN INTERFACE CONDITION ONLY and MUST
--        NEVER be stored as either enum value. No correction is an
--        EVENT OUTCOME, not a state.
--   095  THREE terminal outcomes only: upheld, amended, withdrawn.
--        `awaiting_information` is an ASSIGNMENT STATE inside
--        `under_reconsideration` — the case does NOT close and the
--        report stays correction-open.
--   096  Pre-issue participant review is a PRECONDITION of issuance.
--        Review completes only on an explicit record of
--        `reviewed_no_correction` or `correction_raised`. NON-RESPONSE
--        IS NOT COMPLETION and BLOCKS ISSUANCE while FD-D1-11 is unset.
--   097  Amendment BY SUPERSESSION. A successful correction produces
--        a NEW composed statement (via the existing INS-003
--        t3a_supersede_composed_statement function). Nothing is edited
--        in place; nothing is silently deleted.
--   098  A confidential concern route INDEPENDENT of the observing
--        mentor and of any employer.
--
-- Auto-close under founder direction (fail-closed positions carried
-- forward from Design Return v0.1):
--   FD-D1-11 non-response timeout                   UNSET.
--     Non-response blocks issuance with reason
--     NON_RESPONSE_BLOCKS_ISSUANCE and the report stays in
--     `participant_review`. No timeout is invented.
--   FD-D1-04 production evidence-review authority   UNSET.
--     Issuance is refused with EVIDENCE_REVIEW_AUTHORITY_UNSET.
--
-- Guardrails: schema-qualified extension functions; per-object
-- SELECT 1 verification after apply.

set search_path = public;

-- ========================================================================
-- §1 · State-machine enums (INS-006 093)
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_ber_status AS ENUM (
    'participant_review',
    'challenge_open',
    'ready_to_issue',
    'issued',
    'amended',
    'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_challenge_case_status AS ENUM (
    'open',
    'evidence_disclosed',
    'response_received',
    'under_reconsideration',
    'upheld',
    'amended',
    'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INS-006 095: awaiting_information is a distinct ASSIGNMENT STATE, NOT
-- a challenge_case terminal outcome. It sits alongside the existing
-- t3a_reconsideration_status enum from INS-011.
DO $$ BEGIN
  CREATE TYPE public.t3a_d1_reconsideration_assignment_state AS ENUM (
    'assigned',
    'in_review',
    'awaiting_information',
    'resolved',
    'HELD_OPEN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_review_action AS ENUM (
    'reviewed_no_correction',
    'correction_raised'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_issuance_refusal_reason AS ENUM (
    'REVIEW_NOT_COMPLETED_BY_PARTICIPANT',
    'CHALLENGE_OPEN',
    'NON_RESPONSE_BLOCKS_ISSUANCE',
    'ISSUANCE_FLOOR_NOT_APPROVED',
    'ISSUANCE_FLOOR_NOT_MET',
    'EVIDENCE_REVIEW_AUTHORITY_UNSET',
    'ENV_CAPABILITY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_d1_ber_report
-- ========================================================================
--
-- One row per (participant, dimension, version_set). The status
-- follows the machine in §1. `superseded_by` names a later report
-- when a correction produces an amended version; the original is
-- retained (INS-006 097 amendment by supersession).

CREATE TABLE IF NOT EXISTS public.t3a_d1_ber_report (
  ber_report_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  status public.t3a_d1_ber_status not null default 'participant_review',
  version_set jsonb not null default '{}'::jsonb,
  supersedes uuid references public.t3a_d1_ber_report(ber_report_id) on delete restrict,
  assembled_at timestamptz not null default now(),
  review_completed_at timestamptz,
  issued_at timestamptz,
  amended_at timestamptz,
  withdrawn_at timestamptz,
  UNIQUE (participant_id, dimension_id, assembled_at)
);

CREATE INDEX IF NOT EXISTS t3a_d1_ber_report_participant_idx
  ON public.t3a_d1_ber_report (participant_id, dimension_id, status);

ALTER TABLE public.t3a_d1_ber_report ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_ber_report_read" ON public.t3a_d1_ber_report;
CREATE POLICY "t3a_d1_ber_report_read"
  ON public.t3a_d1_ber_report FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_d1_ber_report_write_admin" ON public.t3a_d1_ber_report;
CREATE POLICY "t3a_d1_ber_report_write_admin"
  ON public.t3a_d1_ber_report FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_ber_report TO authenticated;

-- Legal status transitions (INS-006 093 state machine). Anything else
-- is rejected by the trigger.
CREATE OR REPLACE FUNCTION public.t3a_d1_ber_report_status_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'participant_review' AND NEW.status IN ('challenge_open','ready_to_issue','withdrawn'))
      OR (OLD.status = 'challenge_open'    AND NEW.status IN ('participant_review','ready_to_issue','amended','withdrawn'))
      OR (OLD.status = 'ready_to_issue'    AND NEW.status IN ('issued','withdrawn'))
      OR (OLD.status = 'issued'            AND NEW.status IN ('amended','withdrawn'))
      OR (OLD.status = 'amended'           AND NEW.status IN ('withdrawn'))
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'BER_STATUS_TRANSITION_INVALID: ' || OLD.status || ' -> ' || NEW.status,
        ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_ber_report_status_guard_trg ON public.t3a_d1_ber_report;
CREATE TRIGGER t3a_d1_ber_report_status_guard_trg
  BEFORE UPDATE ON public.t3a_d1_ber_report
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_ber_report_status_guard();

-- ========================================================================
-- §3 · Participant review action (INS-006 096)
-- ========================================================================
--
-- Explicit record of `reviewed_no_correction` or `correction_raised`.
-- Non-response is NOT a row here; the ABSENCE of a row is the
-- precondition failure the issuance service checks against.

CREATE TABLE IF NOT EXISTS public.t3a_d1_participant_review_action (
  review_action_id uuid primary key default gen_random_uuid(),
  ber_report_id uuid not null unique references public.t3a_d1_ber_report(ber_report_id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  action public.t3a_d1_review_action not null,
  correction_case_id uuid,
  recorded_at timestamptz not null default now(),
  actor_context jsonb not null default '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS t3a_d1_participant_review_action_participant_idx
  ON public.t3a_d1_participant_review_action (participant_id, recorded_at DESC);

ALTER TABLE public.t3a_d1_participant_review_action ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_participant_review_action_read" ON public.t3a_d1_participant_review_action;
CREATE POLICY "t3a_d1_participant_review_action_read"
  ON public.t3a_d1_participant_review_action FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_d1_participant_review_action_insert_own" ON public.t3a_d1_participant_review_action;
CREATE POLICY "t3a_d1_participant_review_action_insert_own"
  ON public.t3a_d1_participant_review_action FOR INSERT TO authenticated
  WITH CHECK (participant_id = auth.uid());

-- No UPDATE / DELETE for anyone but admin.
REVOKE UPDATE, DELETE ON public.t3a_d1_participant_review_action FROM authenticated;
GRANT SELECT, INSERT ON public.t3a_d1_participant_review_action TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_participant_review_action_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'PARTICIPANT_REVIEW_ACTION_IMMUTABLE: a review action is a historical fact; correct via the governed correction path',
    ERRCODE = '22023';
END $$;

DROP TRIGGER IF EXISTS t3a_d1_participant_review_action_immutable_trg ON public.t3a_d1_participant_review_action;
CREATE TRIGGER t3a_d1_participant_review_action_immutable_trg
  BEFORE UPDATE ON public.t3a_d1_participant_review_action
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_participant_review_action_immutable();

-- ========================================================================
-- §4 · Extend t3a_correction_case with the INS-006 093 status enum
-- ========================================================================
--
-- The existing t3a_correction_case (from INS-011) carries a text
-- status. Here we add a strongly-typed `challenge_status` column that
-- drives the state machine, and a `terminal_outcome` for the three
-- allowed close outcomes (INS-006 095).

ALTER TABLE public.t3a_correction_case
  ADD COLUMN IF NOT EXISTS challenge_status public.t3a_d1_challenge_case_status
    NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS terminal_outcome public.t3a_d1_challenge_case_status,
  ADD COLUMN IF NOT EXISTS ber_report_id uuid REFERENCES public.t3a_d1_ber_report(ber_report_id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS t3a_correction_case_challenge_status_idx
  ON public.t3a_correction_case (challenge_status)
  WHERE terminal_outcome IS NULL;

CREATE OR REPLACE FUNCTION public.t3a_d1_challenge_case_transition_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.challenge_status IS DISTINCT FROM NEW.challenge_status THEN
    IF NOT (
      (OLD.challenge_status = 'open'                   AND NEW.challenge_status IN ('evidence_disclosed','withdrawn'))
      OR (OLD.challenge_status = 'evidence_disclosed'  AND NEW.challenge_status IN ('response_received','withdrawn'))
      OR (OLD.challenge_status = 'response_received'   AND NEW.challenge_status IN ('under_reconsideration','withdrawn'))
      OR (OLD.challenge_status = 'under_reconsideration' AND NEW.challenge_status IN ('upheld','amended','withdrawn'))
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'CHALLENGE_STATUS_TRANSITION_INVALID: ' || OLD.challenge_status || ' -> ' || NEW.challenge_status,
        ERRCODE = '22023';
    END IF;
  END IF;
  -- Terminal-outcome discipline (INS-006 095).
  IF NEW.terminal_outcome IS NOT NULL
     AND NEW.terminal_outcome NOT IN ('upheld','amended','withdrawn') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'CHALLENGE_TERMINAL_OUTCOME_INVALID: only upheld / amended / withdrawn are terminal',
      ERRCODE = '22023';
  END IF;
  -- Once terminal, the row is closed.
  IF TG_OP = 'UPDATE' AND OLD.terminal_outcome IS NOT NULL
     AND (OLD.terminal_outcome IS DISTINCT FROM NEW.terminal_outcome
          OR OLD.challenge_status IS DISTINCT FROM NEW.challenge_status) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'CHALLENGE_CLOSED: a case with a terminal outcome cannot be re-opened; raise a fresh case',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_challenge_case_transition_guard_trg ON public.t3a_correction_case;
CREATE TRIGGER t3a_d1_challenge_case_transition_guard_trg
  BEFORE UPDATE ON public.t3a_correction_case
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_challenge_case_transition_guard();

-- ========================================================================
-- §5 · Reconsideration assignment: add `awaiting_information` state
-- ========================================================================
--
-- The existing t3a_reconsideration_assignment (from INS-011) uses the
-- t3a_reconsideration_status enum. INS-006 095 says awaiting_information
-- is an ASSIGNMENT STATE inside under_reconsideration, not a
-- challenge_case outcome. Add an INS-006-scoped state column
-- alongside so the two do not conflict.

ALTER TABLE public.t3a_reconsideration_assignment
  ADD COLUMN IF NOT EXISTS ins006_state public.t3a_d1_reconsideration_assignment_state
    NOT NULL DEFAULT 'assigned',
  ADD COLUMN IF NOT EXISTS awaiting_information_since timestamptz;

-- Trigger: when ins006_state flips to awaiting_information, record when.
CREATE OR REPLACE FUNCTION public.t3a_d1_reconsideration_assignment_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ins006_state = 'awaiting_information'
     AND (OLD.ins006_state IS NULL OR OLD.ins006_state <> 'awaiting_information') THEN
    NEW.awaiting_information_since := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_reconsideration_assignment_touch_trg ON public.t3a_reconsideration_assignment;
CREATE TRIGGER t3a_d1_reconsideration_assignment_touch_trg
  BEFORE UPDATE ON public.t3a_reconsideration_assignment
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_reconsideration_assignment_touch();

-- ========================================================================
-- §6 · Confidential concern route (INS-006 098)
-- ========================================================================
--
-- A participant-side route that is INDEPENDENT of the observing mentor
-- and of any employer. The row records a concern narrative and is
-- routable by an administrator to a coordinator with
-- operational_coordination_quality authority. The observing mentor
-- CANNOT read this row — enforced at the RLS policy.

CREATE TABLE IF NOT EXISTS public.t3a_d1_confidential_concern (
  concern_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text,
  narrative text not null,
  status text not null default 'open' check (status IN ('open','in_review','resolved','withdrawn')),
  routed_to uuid references public.profiles(id) on delete set null,
  raised_at timestamptz not null default now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS t3a_d1_confidential_concern_participant_idx
  ON public.t3a_d1_confidential_concern (participant_id, status);

ALTER TABLE public.t3a_d1_confidential_concern ENABLE ROW LEVEL SECURITY;

-- Read: participant themselves, the routed coordinator, admin. Never
-- the observing mentor.
DROP POLICY IF EXISTS "t3a_d1_confidential_concern_read" ON public.t3a_d1_confidential_concern;
CREATE POLICY "t3a_d1_confidential_concern_read"
  ON public.t3a_d1_confidential_concern FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR routed_to = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "t3a_d1_confidential_concern_insert_own" ON public.t3a_d1_confidential_concern;
CREATE POLICY "t3a_d1_confidential_concern_insert_own"
  ON public.t3a_d1_confidential_concern FOR INSERT TO authenticated
  WITH CHECK (participant_id = auth.uid());

DROP POLICY IF EXISTS "t3a_d1_confidential_concern_update_admin" ON public.t3a_d1_confidential_concern;
CREATE POLICY "t3a_d1_confidential_concern_update_admin"
  ON public.t3a_d1_confidential_concern FOR UPDATE TO authenticated
  USING (public.is_admin() OR routed_to = auth.uid())
  WITH CHECK (public.is_admin() OR routed_to = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_confidential_concern TO authenticated;

-- ========================================================================
-- §7 · Pre-issue readiness check (INS-006 096)
-- ========================================================================
--
-- t3a_d1_can_issue(ber_report_id) returns t3a_d1_issuance_refusal_reason
-- when a report cannot issue, and NULL when it can. FD-D1-11
-- non-response timeout is UNSET at issue, so a report without a
-- participant review action refuses with
-- NON_RESPONSE_BLOCKS_ISSUANCE. FD-D1-04 is UNSET too, so every real
-- issuance call also refuses with EVIDENCE_REVIEW_AUTHORITY_UNSET
-- until an approved authority row lands.

CREATE OR REPLACE FUNCTION public.t3a_d1_can_issue(
  p_ber_report_id uuid
) RETURNS public.t3a_d1_issuance_refusal_reason
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_report public.t3a_d1_ber_report%rowtype;
  v_floor public.t3a_d1_issuance_floor_config%rowtype;
  v_review public.t3a_d1_participant_review_action%rowtype;
  v_open_challenges int;
  v_committed int;
  v_distinct_observers int;
  v_distinct_stages int;
BEGIN
  IF v_env IN ('design_only','observation_capable_inactive') THEN
    RETURN 'ENV_CAPABILITY';
  END IF;

  SELECT * INTO v_report FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'BER_REPORT_NOT_FOUND', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_floor FROM public.t3a_d1_issuance_floor_config WHERE singleton = 1;
  IF v_floor.status = 'not_approved' THEN
    RETURN 'ISSUANCE_FLOOR_NOT_APPROVED';
  END IF;

  SELECT
    count(*),
    count(DISTINCT o.observer_id),
    count(DISTINCT o.stage_code)
  INTO v_committed, v_distinct_observers, v_distinct_stages
  FROM public.t3a_observation_record o
  JOIN public.t3a_d1_composed_statement cs USING (observation_record_id)
  WHERE o.participant_id = v_report.participant_id
    AND o.dimension_id = v_report.dimension_id
    AND o.is_committed = true;

  IF (v_floor.minimum_committed_observations IS NOT NULL AND v_committed < v_floor.minimum_committed_observations)
     OR (v_floor.minimum_distinct_observers IS NOT NULL AND v_distinct_observers < v_floor.minimum_distinct_observers)
     OR (v_floor.minimum_distinct_stages IS NOT NULL AND v_distinct_stages < v_floor.minimum_distinct_stages) THEN
    RETURN 'ISSUANCE_FLOOR_NOT_MET';
  END IF;

  SELECT count(*) INTO v_open_challenges
    FROM public.t3a_correction_case c
   WHERE c.participant_id = v_report.participant_id
     AND c.terminal_outcome IS NULL;
  IF v_open_challenges > 0 THEN
    RETURN 'CHALLENGE_OPEN';
  END IF;

  SELECT * INTO v_review
    FROM public.t3a_d1_participant_review_action
   WHERE ber_report_id = p_ber_report_id;
  IF NOT FOUND THEN
    -- INS-006 096: non-response BLOCKS ISSUANCE while FD-D1-11 is unset.
    RETURN 'NON_RESPONSE_BLOCKS_ISSUANCE';
  END IF;

  -- FD-D1-04: production evidence-review authority is UNSET. No
  -- interim exists. Every real-path issuance call refuses until this
  -- lands.
  RETURN 'EVIDENCE_REVIEW_AUTHORITY_UNSET';
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_can_issue(uuid) TO authenticated;

-- ========================================================================
-- §8 · Participant-facing helpers
-- ========================================================================
--
-- Called by the ReportReview surface to move the report through
-- participant_review. Both refuse if the report is not currently in
-- participant_review status.

CREATE OR REPLACE FUNCTION public.t3a_d1_record_reviewed_no_correction(
  p_ber_report_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_report public.t3a_d1_ber_report%rowtype;
  v_action_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  SELECT * INTO v_report FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'BER_REPORT_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_report.participant_id <> auth.uid() THEN
    RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN', ERRCODE = '22023';
  END IF;
  IF v_report.status <> 'participant_review' THEN
    RAISE EXCEPTION USING MESSAGE = 'REPORT_NOT_IN_PARTICIPANT_REVIEW', ERRCODE = '22023';
  END IF;

  INSERT INTO public.t3a_d1_participant_review_action (
    ber_report_id, participant_id, action
  ) VALUES (
    p_ber_report_id, auth.uid(), 'reviewed_no_correction'
  )
  ON CONFLICT (ber_report_id) DO NOTHING
  RETURNING review_action_id INTO v_action_id;

  -- Move the report to ready_to_issue. Actual issuance still gates on
  -- t3a_d1_can_issue.
  UPDATE public.t3a_d1_ber_report
     SET status = 'ready_to_issue',
         review_completed_at = now()
   WHERE ber_report_id = p_ber_report_id
     AND status = 'participant_review';

  RETURN v_action_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_record_reviewed_no_correction(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_raise_correction(
  p_ber_report_id uuid,
  p_ground text,
  p_narrative text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_report public.t3a_d1_ber_report%rowtype;
  v_case_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  IF p_ground IS NULL OR btrim(p_ground) = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'GROUND_REQUIRED', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_report FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'BER_REPORT_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_report.participant_id <> auth.uid() THEN
    RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN', ERRCODE = '22023';
  END IF;
  IF v_report.status NOT IN ('participant_review','challenge_open','ready_to_issue') THEN
    RAISE EXCEPTION USING MESSAGE = 'REPORT_NOT_CORRECTABLE_IN_CURRENT_STATE', ERRCODE = '22023';
  END IF;

  INSERT INTO public.t3a_correction_case (
    raised_by, participant_id, ground, narrative,
    challenge_status, ber_report_id
  ) VALUES (
    auth.uid(), auth.uid(), p_ground, p_narrative,
    'open', p_ber_report_id
  )
  RETURNING correction_case_id INTO v_case_id;

  INSERT INTO public.t3a_d1_participant_review_action (
    ber_report_id, participant_id, action, correction_case_id
  ) VALUES (
    p_ber_report_id, auth.uid(), 'correction_raised', v_case_id
  )
  ON CONFLICT (ber_report_id) DO NOTHING;

  -- Report transitions to challenge_open where it was in
  -- participant_review or ready_to_issue.
  UPDATE public.t3a_d1_ber_report
     SET status = 'challenge_open'
   WHERE ber_report_id = p_ber_report_id
     AND status IN ('participant_review','ready_to_issue');

  RETURN v_case_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_raise_correction(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
