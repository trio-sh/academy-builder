-- =====================================================================
-- T3A-D1-EXEC-CLOSE-001 Section 1 — when a determination closes
--
-- BASELINE VERIFIED BEFORE EXECUTING, because B3 gates this section.
--   B1  forty standing approvals, twenty-three sequences, register 30 of 30
--   B2  SRC-D1-S2-001 displays seven beats B1 to B7
--   B3  committed non-demonstration observations = ZERO. t3a_observation,
--       t3a_observation_record, t3a_observation_gateway and
--       t3a_d1_s1_determination are all empty, and the only two Stage
--       entry events are design_only. So this section may run: it changes
--       how a determination may be captured and must never be applied
--       beneath committed real evidence.
--
-- THE DEFECT. Issue 3 CS-I-51d says a selection holds once made. That
-- correctly protects a C2 answer recorded at B2 from being overwritten at
-- B3. It also let a mentor select "Did not raise it at any point in the
-- session" during the silent B2 pause — locking in an answer the rest of
-- the session may disprove. C2 has no final beat to catch it.
--
-- WHY THIS NEEDED A NEW TABLE. Determinations were held in the Cockpit's
-- own state until commit, and written in one call at the end. Nothing
-- recorded WHEN a selection was made, so "no revision accepted after the
-- final beat" and "an occurrence is never revised to a later occurrence"
-- had nothing to bind to: every selection looked like it happened at
-- commit. t3a_d1_capture_selection is that record — append-only, per
-- beat, server-enforced. The rules below are not advisory.
--
-- CL-02 IS OBEYED BY DECIDING ONCE AND STORING IT. The instruction is to
-- identify a whole-session line by its ANSWER VALUE, never by position and
-- never by matching one wording alone — because the capture catalogue and
-- BR-09 word the C8a line differently ("Did not disclose during the
-- observation" versus "Not within the observed period"). So the two lines
-- are identified here, once, and marked with a column. Nothing downstream
-- matches text or trusts an ordinal.
--
--   C2  line 4  "Did not raise it at any point in the session."
--   C8a line 4  "Did not disclose during the observation."
--
-- C8b carries no whole-session line — all three of its lines are
-- occurrences — which is consistent with CL-04: under BR-09 it is served
-- only once C8a records a disclosure, so "no disclosure" cannot arise.
--
-- CL-50 IS ENFORCED LITERALLY, AND THE RISK IS RECORDED. The instruction
-- is that no beat's verbatim may contain a capture-set label or a
-- qualifier. Measured first: across all twenty-three loaded sequences,
-- ZERO beats contain a label token and ZERO contain the words "update" or
-- "final". So enforcing it literally breaks nothing today.
--
-- The risk, flagged rather than silently narrowed: a future script could
-- legitimately say "That's the final question", and this check would
-- refuse that sequence. It is enforced as written because the instrument
-- says so and the evidence says it is currently safe. If a future source
-- needs the word, the founder narrows the rule — a build does not narrow
-- an instruction to suit itself.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 0. Baseline B3, asserted rather than assumed
-- ---------------------------------------------------------------------

DO $b3$
DECLARE v_n int := 0;
BEGIN
  SELECT (SELECT count(*) FROM public.t3a_observation)
       + (SELECT count(*) FROM public.t3a_observation_record)
       + (SELECT count(*) FROM public.t3a_d1_s1_determination)
    INTO v_n;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'B3_FAILED: % committed observation or determination rows exist. Section 1 must not be applied beneath committed real evidence — log it and leave the current binding behavior in place.', v_n;
  END IF;
END;
$b3$;

-- ---------------------------------------------------------------------
-- 1. CL-03 — which sets record a first occurrence
-- ---------------------------------------------------------------------

ALTER TABLE public.t3a_d1_capture_set
  ADD COLUMN IF NOT EXISTS records_first_occurrence boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.t3a_d1_capture_set.records_first_occurrence IS
  'CL-03. The set records WHEN something first happened, not what was said. C2, C8a and C8b. Once an occurrence line is recorded it is never revised to a later occurrence, and "update" on such a set never overwrites a recorded occurrence.';

UPDATE public.t3a_d1_capture_set
   SET records_first_occurrence = true
 WHERE capture_set_code IN ('C2', 'C8a', 'C8b');

-- ---------------------------------------------------------------------
-- 2. CL-02 — the whole-session lines, identified once by answer value
-- ---------------------------------------------------------------------

ALTER TABLE public.t3a_d1_capture_line
  ADD COLUMN IF NOT EXISTS is_whole_session_answer boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.t3a_d1_capture_line.is_whole_session_answer IS
  'CL-02. The line can only be true once the session has ended, so it is offered only when the determination closes. Identified ONCE here by answer value and stored, because the capture catalogue and BR-09 word the C8a line differently and no reader may match text or trust an ordinal.';

UPDATE public.t3a_d1_capture_line
   SET is_whole_session_answer = true
 WHERE (capture_set_code = 'C2'  AND line_text = 'Did not raise it at any point in the session.')
    OR (capture_set_code = 'C8a' AND line_text = 'Did not disclose during the observation.');

DO $chk$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM public.t3a_d1_capture_line WHERE is_whole_session_answer;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'CL_02_FAILED: expected exactly two whole-session lines (C2 and C8a), marked %. The catalogue wording has moved and must be re-identified by answer value, not patched.', v_n;
  END IF;
END;
$chk$;

-- ---------------------------------------------------------------------
-- 3. CL-08 — the qualifier vocabulary is closed at three, in the schema
-- ---------------------------------------------------------------------

ALTER TABLE public.t3a_d1_beat_capture_binding
  DROP CONSTRAINT IF EXISTS t3a_d1_beat_capture_binding_qualifier_vocabulary;
ALTER TABLE public.t3a_d1_beat_capture_binding
  ADD CONSTRAINT t3a_d1_beat_capture_binding_qualifier_vocabulary
  CHECK (qualifier_as_written IS NULL OR qualifier_as_written IN ('update', 'final'));

COMMENT ON COLUMN public.t3a_d1_beat_capture_binding.qualifier_as_written IS
  'CL-08. The vocabulary is closed at three: no qualifier, "update" (CL-03, revises an uncommitted selection but never a recorded occurrence) and "final" (CL-01, closes the determination at that beat). Any other word refuses the sequence load for that source. An unrecognized qualifier is never stored without behavior — which is what it was before this instrument, deliberately and on the record, pending this ruling.';

-- ---------------------------------------------------------------------
-- 4. CL-50 — verbatim mentor speech carries nothing but speech
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_verbatim_carries_only_speech()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.content_verbatim ~ '\yC[0-9]+[a-z0-9]*\y' THEN
    RAISE EXCEPTION 'VERBATIM_CARRIES_CAPTURE_LABEL: % beat % — a capture-set label is inside the mentor''s spoken line. The binding belongs in t3a_d1_beat_capture_binding, never in the words read aloud.',
      NEW.source_identifier, NEW.beat_code
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.content_verbatim ~* '\y(update|final)\y' THEN
    RAISE EXCEPTION 'VERBATIM_CARRIES_QUALIFIER: % beat % — a binding qualifier is inside the mentor''s spoken line.',
      NEW.source_identifier, NEW.beat_code
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_verbatim_carries_only_speech() IS
  'CL-50. Checked AT LOAD, so a sequence arriving later is checked as it arrives rather than audited afterwards. "C8 final" was found inside a mentor''s spoken line during the Stage 2 parse and moved out; this makes that permanent. Enforced literally per the instrument: the bare words "update" and "final" are also refused, which could refuse a legitimate future line such as "that''s the final question". Recorded as a risk for the founder to narrow, not narrowed here.';

DROP TRIGGER IF EXISTS t3a_d1_verbatim_only_speech_trg
  ON public.t3a_d1_mentor_action_sequence;
CREATE TRIGGER t3a_d1_verbatim_only_speech_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_mentor_action_sequence
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_verbatim_carries_only_speech();

-- ---------------------------------------------------------------------
-- 5. CL-01 — the closing beat, one definition
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_capture_close_beat(
  p_source_identifier text,
  p_capture_set_code  text)
RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT b.beat_code
    FROM public.t3a_d1_beat_capture_binding b
   WHERE b.source_identifier = p_source_identifier
     AND b.capture_set_code  = p_capture_set_code
     AND b.qualifier_as_written = 'final'
   ORDER BY b.beat_code
   LIMIT 1;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_capture_close_beat(text, text) IS
  'CL-01. The beat at which this set''s determination closes on this source, or NULL where the set has no final beat — in which case it closes at commit. One definition, so the offer rule, the revision guard and the advance guard cannot disagree about when a determination is closed.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_capture_close_beat(text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. The per-beat selection record
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_capture_selection (
  capture_selection_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_entry_event_id  uuid NOT NULL
    REFERENCES public.t3a_stage_entry_event(stage_entry_event_id) ON DELETE RESTRICT,
  question_code         text NOT NULL,
  capture_set_code      text NOT NULL
    REFERENCES public.t3a_d1_capture_set(capture_set_code) ON DELETE RESTRICT,
  beat_code             text NOT NULL,
  line_order            integer NOT NULL,
  selected_by           uuid,
  selected_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_capture_selection IS
  'Append-only, one row per selection as it is made, carrying the beat it was made at. Without it "no revision after the final beat" and "an occurrence is never revised to a later occurrence" cannot be enforced: determinations were held in the Cockpit until commit, so every selection looked as though it happened at commit. A revision is a later row, never an edit — the same shape as an approval withdrawal.';

CREATE INDEX IF NOT EXISTS t3a_d1_capture_selection_entry_idx
  ON public.t3a_d1_capture_selection (stage_entry_event_id, question_code, selected_at);

CREATE OR REPLACE FUNCTION public.t3a_d1_capture_selection_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'CAPTURE_SELECTION_APPEND_ONLY: % refused. A revision is a later row, so the history shows what the mentor first recorded and when.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_capture_selection_append_only_trg
  ON public.t3a_d1_capture_selection;
CREATE TRIGGER t3a_d1_capture_selection_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_capture_selection
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_capture_selection_append_only();

ALTER TABLE public.t3a_d1_capture_selection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_capture_selection_read ON public.t3a_d1_capture_selection;
CREATE POLICY t3a_d1_capture_selection_read
  ON public.t3a_d1_capture_selection FOR SELECT TO authenticated
  USING (selected_by = auth.uid() OR public.is_admin());

GRANT SELECT ON public.t3a_d1_capture_selection TO authenticated;

-- ---------------------------------------------------------------------
-- 7. CL-01 / CL-02 / CL-03 — the guard on what may be recorded
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_capture_selection_guard()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_source        text;
  v_close_beat    text;
  v_close_ord     int;
  v_this_ord      int;
  v_occurrence    boolean;
  v_whole_session boolean;
  v_prior         record;
BEGIN
  SELECT cv.body ->> 'source_identifier' INTO v_source
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = e.source_version_id
   WHERE e.stage_entry_event_id = NEW.stage_entry_event_id;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'CAPTURE_SELECTION_NO_SOURCE: the Stage entry names no source version'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.records_first_occurrence INTO v_occurrence
    FROM public.t3a_d1_capture_set s WHERE s.capture_set_code = NEW.capture_set_code;

  SELECT l.is_whole_session_answer INTO v_whole_session
    FROM public.t3a_d1_capture_line l
   WHERE l.capture_set_code = NEW.capture_set_code
     AND l.line_order = NEW.line_order;

  IF v_whole_session IS NULL THEN
    RAISE EXCEPTION 'CAPTURE_LINE_NOT_IN_SET: line % is not a line of %', NEW.line_order, NEW.capture_set_code
      USING ERRCODE = 'check_violation';
  END IF;

  v_close_beat := public.t3a_d1_capture_close_beat(v_source, NEW.capture_set_code);

  SELECT beat_ordinal INTO v_this_ord
    FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier = v_source AND beat_code = NEW.beat_code;

  IF v_close_beat IS NOT NULL THEN
    SELECT beat_ordinal INTO v_close_ord
      FROM public.t3a_d1_mentor_action_sequence
     WHERE source_identifier = v_source AND beat_code = v_close_beat;

    -- CL-01. After a final beat, nothing further is accepted for that
    -- determination.
    IF v_this_ord IS NOT NULL AND v_close_ord IS NOT NULL AND v_this_ord > v_close_ord THEN
      RAISE EXCEPTION 'DETERMINATION_CLOSED: % closed at beat % on %; no selection or revision is accepted after it.',
        NEW.capture_set_code, v_close_beat, v_source
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- CL-02. A whole-session line is offered only when the determination
  -- closes: at its final beat, or at commit where it has none.
  IF v_whole_session THEN
    IF v_close_beat IS NULL THEN
      -- Closes at commit. The commit route records it; a mid-session beat
      -- may not.
      IF NEW.beat_code <> '__COMMIT__' THEN
        RAISE EXCEPTION 'WHOLE_SESSION_ANSWER_BEFORE_CLOSE: % line % can only be true once the session has ended, and % has no final beat for it, so it is offered at commit — not at beat %.',
          NEW.capture_set_code, NEW.line_order, v_source, NEW.beat_code
          USING ERRCODE = 'check_violation';
      END IF;
    ELSIF NEW.beat_code <> v_close_beat THEN
      RAISE EXCEPTION 'WHOLE_SESSION_ANSWER_BEFORE_CLOSE: % line % is offered only at its closing beat % on %, not at beat %.',
        NEW.capture_set_code, NEW.line_order, v_close_beat, v_source, NEW.beat_code
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- CL-03. An occurrence, once recorded, is never revised to a later
  -- occurrence. "update" does not overwrite a recorded occurrence.
  IF coalesce(v_occurrence, false) THEN
    SELECT s.line_order, s.beat_code, l.is_whole_session_answer
      INTO v_prior
      FROM public.t3a_d1_capture_selection s
      JOIN public.t3a_d1_capture_line l
        ON l.capture_set_code = s.capture_set_code AND l.line_order = s.line_order
     WHERE s.stage_entry_event_id = NEW.stage_entry_event_id
       AND s.question_code = NEW.question_code
       AND s.capture_set_code = NEW.capture_set_code
     ORDER BY s.selected_at, s.capture_selection_id
     LIMIT 1;

    IF v_prior.line_order IS NOT NULL
       AND NOT coalesce(v_prior.is_whole_session_answer, false)
       AND v_prior.line_order IS DISTINCT FROM NEW.line_order THEN
      RAISE EXCEPTION 'OCCURRENCE_ALREADY_RECORDED: % recorded occurrence line % at beat %; an occurrence is fixed where it happened and is never revised to a later one.',
        NEW.capture_set_code, v_prior.line_order, v_prior.beat_code
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_capture_selection_guard() IS
  'CL-01, CL-02 and CL-03 enforced on the table rather than in a screen, so a caller cannot route around them. CL-05 is the Cockpit''s: nothing here ever selects a line on the mentor''s behalf.';

DROP TRIGGER IF EXISTS t3a_d1_capture_selection_guard_trg
  ON public.t3a_d1_capture_selection;
CREATE TRIGGER t3a_d1_capture_selection_guard_trg
  BEFORE INSERT ON public.t3a_d1_capture_selection
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_capture_selection_guard();

-- ---------------------------------------------------------------------
-- 8. CL-04 — what is visible at a beat
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_capture_visible_at_beat(
  p_stage_entry_event_id uuid,
  p_question_code        text,
  p_capture_set_code     text,
  p_beat_code            text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_source      text;
  v_first_ord   int;
  v_this_ord    int;
  v_close_beat  text;
  v_close_ord   int;
  v_answered    boolean;
  v_occurrence  boolean;
  v_disclosed   boolean;
BEGIN
  SELECT cv.body ->> 'source_identifier' INTO v_source
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = e.source_version_id
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  SELECT min(m.beat_ordinal) INTO v_first_ord
    FROM public.t3a_d1_beat_capture_binding b
    JOIN public.t3a_d1_mentor_action_sequence m
      ON m.source_identifier = b.source_identifier AND m.beat_code = b.beat_code
   WHERE b.source_identifier = v_source AND b.capture_set_code = p_capture_set_code;

  IF v_first_ord IS NULL THEN
    RETURN jsonb_build_object('visible', false, 'reason', 'SET_NOT_BOUND_ON_THIS_SOURCE');
  END IF;

  SELECT beat_ordinal INTO v_this_ord
    FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier = v_source AND beat_code = p_beat_code;

  v_close_beat := public.t3a_d1_capture_close_beat(v_source, p_capture_set_code);
  IF v_close_beat IS NOT NULL THEN
    SELECT beat_ordinal INTO v_close_ord
      FROM public.t3a_d1_mentor_action_sequence
     WHERE source_identifier = v_source AND beat_code = v_close_beat;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.t3a_d1_capture_selection s
                  WHERE s.stage_entry_event_id = p_stage_entry_event_id
                    AND s.question_code = p_question_code
                    AND s.capture_set_code = p_capture_set_code)
    INTO v_answered;

  SELECT s.records_first_occurrence INTO v_occurrence
    FROM public.t3a_d1_capture_set s WHERE s.capture_set_code = p_capture_set_code;

  -- Nothing is visible before the set's first bound beat, and nothing
  -- after it has closed.
  IF v_this_ord IS NULL OR v_this_ord < v_first_ord THEN
    RETURN jsonb_build_object('visible', false, 'reason', 'BEFORE_FIRST_BOUND_BEAT');
  END IF;
  IF v_close_ord IS NOT NULL AND v_this_ord > v_close_ord THEN
    RETURN jsonb_build_object('visible', false, 'reason', 'DETERMINATION_CLOSED');
  END IF;

  -- CL-04. C8b is conditional: under BR-09 it is served only once C8a has
  -- recorded a disclosure, so it becomes visible from that beat and not
  -- before. "Disclosure" is an occurrence line, never the whole-session
  -- line, and is read by the line's stored property rather than its text.
  IF p_capture_set_code = 'C8b' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.t3a_d1_capture_selection s
        JOIN public.t3a_d1_capture_line l
          ON l.capture_set_code = s.capture_set_code AND l.line_order = s.line_order
       WHERE s.stage_entry_event_id = p_stage_entry_event_id
         AND s.capture_set_code = 'C8a'
         AND NOT l.is_whole_session_answer)
      INTO v_disclosed;
    IF NOT v_disclosed THEN
      RETURN jsonb_build_object('visible', false, 'reason', 'C8A_RECORDS_NO_DISCLOSURE');
    END IF;
  END IF;

  -- CL-04. C2 and C8a stay visible at every beat from their first bound
  -- beat until answered or closed, because the occurrence can happen at
  -- any beat. Every other set keeps its per-beat bindings unchanged.
  IF p_capture_set_code IN ('C2', 'C8a') AND NOT v_answered THEN
    RETURN jsonb_build_object(
      'visible', true,
      'reason', 'UNANSWERED_OCCURRENCE_SET_STAYS_VISIBLE',
      'whole_session_lines_offered', (v_close_ord IS NOT NULL AND v_this_ord = v_close_ord),
      'closes_at', coalesce(v_close_beat, 'commit'));
  END IF;

  RETURN jsonb_build_object(
    'visible', EXISTS (SELECT 1 FROM public.t3a_d1_beat_capture_binding b
                        WHERE b.source_identifier = v_source
                          AND b.capture_set_code = p_capture_set_code
                          AND b.beat_code = p_beat_code),
    'reason', 'PER_BEAT_BINDING',
    -- CL-02. Whole-session lines are offered only where the determination
    -- closes at this beat.
    'whole_session_lines_offered', (v_close_ord IS NOT NULL AND v_this_ord = v_close_ord),
    'records_first_occurrence', coalesce(v_occurrence, false),
    'closes_at', coalesce(v_close_beat, 'commit'));
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_capture_visible_at_beat(uuid, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 9. CL-06 — the Cockpit does not advance past a final beat unanswered
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_beat_advance_permitted(
  p_stage_entry_event_id uuid,
  p_beat_code            text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_source  text;
  v_pending text;
BEGIN
  SELECT cv.body ->> 'source_identifier' INTO v_source
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = e.source_version_id
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  -- Every set that closes at THIS beat and holds no selection.
  SELECT string_agg(b.capture_set_code, ', ' ORDER BY b.capture_set_code)
    INTO v_pending
    FROM public.t3a_d1_beat_capture_binding b
   WHERE b.source_identifier = v_source
     AND b.beat_code = p_beat_code
     AND b.qualifier_as_written = 'final'
     AND NOT EXISTS (
       SELECT 1 FROM public.t3a_d1_capture_selection s
        WHERE s.stage_entry_event_id = p_stage_entry_event_id
          AND s.capture_set_code = b.capture_set_code);

  IF v_pending IS NOT NULL THEN
    RETURN jsonb_build_object(
      'permitted', false,
      'refusal', 'DETERMINATION_UNANSWERED_AT_CLOSING_BEAT',
      'sets', v_pending,
      'beat_code', p_beat_code,
      'source_identifier', v_source);
  END IF;

  RETURN jsonb_build_object('permitted', true, 'beat_code', p_beat_code);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_beat_advance_permitted(uuid, text) IS
  'CL-06. A beat that closes a determination cannot be passed while that determination is unanswered. It reads the bindings rather than naming the four bearing-interest sources, so the two Stage 4 sources take the rule automatically when their sequences load under Section 3A — no list to keep in step.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_beat_advance_permitted(uuid, text) TO authenticated;
