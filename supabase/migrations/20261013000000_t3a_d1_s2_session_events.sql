-- =====================================================================
-- T3A-D1-EXEC-001 §3.2, AC-15 and AC-16 — pause, and ending without
-- committing
--
-- "Pause: distinct pause event; blocks source advancement pending
--  clearance; NOT A PROGRESSION OUTCOME." (AC-15)
--
-- "End without commit: controlled end event written; captured material
--  NOT SILENTLY DISCARDED; NOTHING SILENTLY COMMITTED." (AC-16)
--
-- Found while executing §11: neither event existed. The cockpit held a
-- `paused` flag in component state and an End Session control that wrote
-- nothing, so a pause left no record, cleared itself on refresh, and
-- blocked nothing; and ending a session was indistinguishable from
-- closing the tab.
--
-- Both are events now, and both are append-only, because a pause that
-- can be deleted afterwards is not a record of a pause.
--
-- The three things each must not be are enforced structurally:
--
--   A pause is NOT A PROGRESSION OUTCOME. This table has no progression
--   column, no outcome column and no participant-facing consequence, and
--   section 4 refuses to let one be added. A pause says the
--   administration stopped, never anything about the person.
--
--   Ending without commit DISCARDS NOTHING. The end event is a row
--   alongside the captured determinations; it deletes none of them, and
--   nothing here is permitted to.
--
--   Ending without commit COMMITS NOTHING. Committing goes through
--   t3a_commit_observation and nowhere else. No path in this file writes
--   t3a_observation_record.
-- =====================================================================

DO $mkenum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 't3a_d1_s2_session_event_kind') THEN
    CREATE TYPE public.t3a_d1_s2_session_event_kind AS ENUM
      ('paused', 'pause_cleared', 'ended_without_commit');
  END IF;
END;
$mkenum$;

CREATE TABLE IF NOT EXISTS public.t3a_d1_s2_session_event (
  session_event_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id uuid NOT NULL,
  event_kind        public.t3a_d1_s2_session_event_kind NOT NULL,
  beat_code         text,
  -- A pause has a reason. Clearing one has a reason. Ending a session
  -- without committing has a reason. None of the three is a shrug.
  reason            text NOT NULL,
  recorded_by       uuid NOT NULL,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT t3a_d1_s2_session_event_reason_present
    CHECK (length(btrim(reason)) > 0)
);

ALTER TABLE public.t3a_d1_s2_session_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_s2_session_event_own ON public.t3a_d1_s2_session_event;
CREATE POLICY t3a_d1_s2_session_event_own ON public.t3a_d1_s2_session_event
  FOR SELECT TO authenticated USING (recorded_by = auth.uid());

DROP POLICY IF EXISTS t3a_d1_s2_session_event_record ON public.t3a_d1_s2_session_event;
CREATE POLICY t3a_d1_s2_session_event_record ON public.t3a_d1_s2_session_event
  FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid());

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_session_event_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'SESSION_EVENT_APPEND_ONLY: % refused; a pause that can be deleted is not a record of a pause', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_s2_session_event_append_only_trg
  ON public.t3a_d1_s2_session_event;
CREATE TRIGGER t3a_d1_s2_session_event_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_s2_session_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s2_session_event_append_only();

-- ---------------------------------------------------------------------
-- 2. A pause blocks source advancement pending clearance
-- ---------------------------------------------------------------------

-- AC-15. "Pending clearance" means the block lifts on a recorded
-- clearance and on nothing else — not on a timer, not on a refresh, and
-- not on the mentor pressing on.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_advancement_permitted(
  p_stage_instance_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_last public.t3a_d1_s2_session_event_kind;
  v_reason text;
  v_at timestamptz;
BEGIN
  SELECT e.event_kind, e.reason, e.recorded_at
    INTO v_last, v_reason, v_at
  FROM public.t3a_d1_s2_session_event e
  WHERE e.stage_instance_id = p_stage_instance_id
    AND e.event_kind IN ('paused', 'pause_cleared')
  ORDER BY e.recorded_at DESC, e.session_event_id DESC
  LIMIT 1;

  IF v_last = 'paused' THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'SOURCE_ADVANCEMENT_BLOCKED_PENDING_PAUSE_CLEARANCE',
      'paused_reason', v_reason,
      'paused_at', v_at,
      -- Said in the return so no caller has to infer it from the absence
      -- of a progression field.
      'is_a_progression_outcome', false);
  END IF;

  IF EXISTS (SELECT 1 FROM public.t3a_d1_s2_session_event
             WHERE stage_instance_id = p_stage_instance_id
               AND event_kind = 'ended_without_commit') THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'SESSION_ENDED_WITHOUT_COMMIT',
      'is_a_progression_outcome', false);
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'is_a_progression_outcome', false);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 3. Ending without committing
-- ---------------------------------------------------------------------

-- AC-16. Writes the end event, and reports what is still held so that
-- "not silently discarded" is visible rather than promised. It deletes
-- nothing and commits nothing; there is no statement in it that could.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_end_without_commit(
  p_stage_instance_id uuid,
  p_reason text,
  p_recorded_by uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_held int;
  v_committed int;
BEGIN
  IF length(btrim(coalesce(p_reason, ''))) = 0 THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'END_REASON_REQUIRED');
  END IF;

  IF EXISTS (SELECT 1 FROM public.t3a_d1_s2_session_event
             WHERE stage_instance_id = p_stage_instance_id
               AND event_kind = 'ended_without_commit') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SESSION_ALREADY_ENDED');
  END IF;

  SELECT count(*) INTO v_held
  FROM public.t3a_d1_s1_determination
  WHERE stage_instance_id = p_stage_instance_id;

  INSERT INTO public.t3a_d1_s2_session_event
    (stage_instance_id, event_kind, reason, recorded_by)
  VALUES (p_stage_instance_id, 'ended_without_commit', p_reason, p_recorded_by);

  -- Counted after the event is written, so the number is what survived
  -- the end rather than what existed before it.
  SELECT count(*) INTO v_committed
  FROM public.t3a_d1_s1_determination
  WHERE stage_instance_id = p_stage_instance_id;

  RETURN jsonb_build_object(
    'recorded', true,
    'captured_items_still_held', v_committed,
    'captured_items_discarded', v_held - v_committed,
    'observation_committed', false,
    'is_a_progression_outcome', false);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 4. A pause cannot become a judgment
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_session_event_no_outcome()
RETURNS event_trigger LANGUAGE plpgsql AS $fn$
DECLARE
  r record;
  c text;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
           WHERE object_type = 'table' LOOP
    IF r.object_identity = 'public.t3a_d1_s2_session_event' THEN
      FOR c IN SELECT column_name FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = 't3a_d1_s2_session_event' LOOP
        IF c ~* '(progression|outcome|determination|score|rating|rank|verdict|participant|adverse|penalt)' THEN
          RAISE EXCEPTION 'PAUSE_IS_NOT_A_PROGRESSION_OUTCOME: column t3a_d1_s2_session_event.% would make an administration event into a consequence for a person; T3A-D1-EXEC-001 AC-15 forbids it', c
            USING ERRCODE = 'check_violation';
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$fn$;

DROP EVENT TRIGGER IF EXISTS t3a_d1_s2_session_event_no_outcome_trg;
CREATE EVENT TRIGGER t3a_d1_s2_session_event_no_outcome_trg
  ON ddl_command_end
  WHEN TAG IN ('ALTER TABLE', 'CREATE TABLE')
  EXECUTE FUNCTION public.t3a_d1_s2_session_event_no_outcome();

GRANT SELECT, INSERT ON public.t3a_d1_s2_session_event TO authenticated;
GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s2_advancement_permitted(uuid),
  public.t3a_d1_s2_end_without_commit(uuid, text, uuid)
TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Ordering that does not depend on the clock
-- ---------------------------------------------------------------------

-- The first proof run caught this: a pause and its clearance recorded in
-- the same transaction both carry the same recorded_at, because now() is
-- the transaction timestamp rather than the statement one. The tiebreak
-- was the primary key, which is a random uuid — so "the latest pause
-- event" was decided by a coin toss, and a cleared pause could still
-- read as standing.
--
-- A monotonic sequence decides it instead. Ordering by it is exact
-- whatever the clock does, including two events inside one transaction
-- and a clock that steps backwards.
ALTER TABLE public.t3a_d1_s2_session_event
  ADD COLUMN IF NOT EXISTS event_seq bigint GENERATED BY DEFAULT AS IDENTITY;

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_advancement_permitted(
  p_stage_instance_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_last public.t3a_d1_s2_session_event_kind;
  v_reason text;
  v_at timestamptz;
BEGIN
  SELECT e.event_kind, e.reason, e.recorded_at
    INTO v_last, v_reason, v_at
  FROM public.t3a_d1_s2_session_event e
  WHERE e.stage_instance_id = p_stage_instance_id
    AND e.event_kind IN ('paused', 'pause_cleared')
  ORDER BY e.event_seq DESC
  LIMIT 1;

  IF v_last = 'paused' THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'SOURCE_ADVANCEMENT_BLOCKED_PENDING_PAUSE_CLEARANCE',
      'paused_reason', v_reason,
      'paused_at', v_at,
      'is_a_progression_outcome', false);
  END IF;

  IF EXISTS (SELECT 1 FROM public.t3a_d1_s2_session_event
             WHERE stage_instance_id = p_stage_instance_id
               AND event_kind = 'ended_without_commit') THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'SESSION_ENDED_WITHOUT_COMMIT',
      'is_a_progression_outcome', false);
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'is_a_progression_outcome', false);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 6. AC-29 — advancing with a required determination unresolved
-- ---------------------------------------------------------------------

-- "Attempting to advance with a required determination unresolved is
--  PREVENTED, and the mentor is TOLD WHAT IS MISSING."
--
-- Both halves matter. Prevention without the list is a dead end the
-- mentor has to guess their way out of during a live session, which is
-- the workload trap the test is named after.
--
-- The served questions are the caller's, because serving depends on the
-- source sheet and the answers so far. What is refused is advancing past
-- one that carries neither a substantive answer nor a missing state.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_advancement_permitted(
  p_stage_instance_id uuid,
  p_required_question_codes text[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_base       jsonb;
  v_unresolved text[];
BEGIN
  -- The pause and end rules first: they hold whatever the capture state.
  v_base := public.t3a_d1_s2_advancement_permitted(p_stage_instance_id);
  IF NOT (v_base ->> 'permitted')::boolean THEN
    RETURN v_base;
  END IF;

  IF p_required_question_codes IS NULL
     OR array_length(p_required_question_codes, 1) IS NULL THEN
    RETURN v_base;
  END IF;

  SELECT array_agg(q ORDER BY q) INTO v_unresolved
  FROM unnest(p_required_question_codes) AS q
  WHERE NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_s1_determination d
    WHERE d.stage_instance_id = p_stage_instance_id
      AND d.question_id = q);

  IF v_unresolved IS NOT NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'REQUIRED_DETERMINATION_UNRESOLVED',
      -- Named, not counted.
      'unresolved_questions', to_jsonb(v_unresolved),
      'is_a_progression_outcome', false);
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'is_a_progression_outcome', false);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s2_advancement_permitted(uuid, text[])
TO anon, authenticated;
