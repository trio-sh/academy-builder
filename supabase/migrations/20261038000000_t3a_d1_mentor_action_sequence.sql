-- =====================================================================
-- CS-I-26 — the mentor action sequence, as a register
--
-- AC-12 and AC-13 both depend on beats, and until now no beat existed as
-- data anywhere. This is the schema CORR-003 specifies, built so that
-- loading the remaining sequences is a data operation and not a code
-- change.
--
-- WHAT IS LOADED, AND A DISCREPANCY WITH THE CORRECTION. CS-I-25 says
-- "the thirteen demonstration sources at Section 5.11 already carry
-- structured beat sequences". The issued file carries FOUR demonstration
-- sources — DEMO-D1-S1-001, S2-001, S3-001 and S4-001 at lines 1268,
-- 1327, 1397 and 1441 — and only TWO of them carry a Mentor script block
-- with beat-coded lines. DEMO-D1-S3-001 and S4-001 have none, which fits:
-- S3 is a written submission and S4 is disabled.
--
-- A third "Mentor script" string at line 4678 is not a script. It sits
-- inside run-together prose in the Stage 2 bank register, the same
-- conversion fault CS-I-21 covers.
--
-- So two sequences load, not thirteen. Recorded rather than made up: the
-- count is reported to the founders and the schema takes whatever loads.
--
-- WHY THIS IS A TABLE AND NOT A BODY FIELD. The timing gate previously
-- read body -> 'mentor_action_sequence'. The demonstration sources are
-- not content versions at all — no DEMO-D1-% object exists in the
-- register — so there is no body to read. A register keyed on the source
-- identifier holds beats for both, and the gate reads it.
--
-- CS-I-27 IS THE LOAD-BEARING RULE HERE. is_decision_point is set ONLY
-- from a loaded sequence that marks one. Neither script marks a decision
-- point, so neither carries one, so the timing determination still
-- refuses — by name, as it does today. It is not derived from the beat
-- code, not from enquiry_point, and not from the presence of a pause.
-- The two scripts are precisely why: DEMO-D1-S1-001 pauses at B3 and
-- DEMO-D1-S2-001 pauses at B2, so a pause does not locate anything.
-- =====================================================================

set search_path = public;

CREATE TABLE IF NOT EXISTS public.t3a_d1_mentor_action_sequence (
  source_identifier  text NOT NULL,
  beat_ordinal       integer NOT NULL,
  beat_code          text,
  action_type        text NOT NULL
                     CHECK (action_type IN ('READ','ASK','PAUSE','SAY','BRIEF')),
  content_verbatim   text NOT NULL,
  is_decision_point  boolean NOT NULL DEFAULT false,
  pause_seconds_min  integer,
  pause_seconds_max  integer,
  role_label         text,
  PRIMARY KEY (source_identifier, beat_ordinal)
);

COMMENT ON TABLE public.t3a_d1_mentor_action_sequence IS
  'CS-I-26. The beats of a source''s mentor script, loaded from the issued edition. content_verbatim is the approved line and is never paraphrased. A BRIEF line is not read aloud.';

COMMENT ON COLUMN public.t3a_d1_mentor_action_sequence.is_decision_point IS
  'CS-I-27. Set only where the loaded sequence marks the beat as the decision point. Never derived from the beat code, from enquiry_point, or from the presence of a pause: DEMO-D1-S1-001 pauses at B3 and DEMO-D1-S2-001 at B2, so a pause locates nothing. Where no beat carries it, the dependent timing determination refuses by name.';

ALTER TABLE public.t3a_d1_mentor_action_sequence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_mentor_action_sequence_read
  ON public.t3a_d1_mentor_action_sequence;
CREATE POLICY t3a_d1_mentor_action_sequence_read
  ON public.t3a_d1_mentor_action_sequence FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_d1_mentor_action_sequence_write
  ON public.t3a_d1_mentor_action_sequence;
CREATE POLICY t3a_d1_mentor_action_sequence_write
  ON public.t3a_d1_mentor_action_sequence FOR ALL
  USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

GRANT SELECT ON public.t3a_d1_mentor_action_sequence TO authenticated;

-- CS-I-29. The pause window is uniform and is not per-source: 10 to 15
-- seconds wherever a pause beat exists, with a three-second minimum
-- between turns. THE BEAT THE PAUSE SITS ON IS PER-SOURCE. THE DURATION
-- IS NOT.
CREATE OR REPLACE FUNCTION public.t3a_d1_pause_window()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $fn$
  SELECT jsonb_build_object(
    'b2_pause_range_seconds', jsonb_build_array(10, 15),
    'between_turn_minimum_wait_seconds', 3);
$fn$;

-- ---------------------------------------------------------------------
-- The two sequences the issued file carries
-- ---------------------------------------------------------------------

-- DEMO-D1-S1-001 — The corrected figure. Issued file lines 1284-1295.
-- PAUSE sits at B3.
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim,
   pause_seconds_min, pause_seconds_max, role_label)
VALUES
  ('DEMO-D1-S1-001', 1, NULL,  'BRIEF',
   'Do not confirm or deny whether the figure matters. Do not name the finance team unless the participant does.',
   NULL, NULL, 'not read aloud'),
  ('DEMO-D1-S1-001', 2, 'B1', 'READ',
   'You prepared a summary for your manager. It has already been sent on.', NULL, NULL, NULL),
  ('DEMO-D1-S1-001', 3, 'B2', 'READ',
   'An hour before it goes to the client, you notice one figure is wrong, and it changes the conclusion.',
   NULL, NULL, NULL),
  ('DEMO-D1-S1-001', 4, 'B3', 'ASK',
   'Your manager asks whether the summary is ready to go out. What do you do?', NULL, NULL, NULL),
  ('DEMO-D1-S1-001', 5, 'B3', 'PAUSE',
   'Remain silent for 10 to 15 seconds.', 10, 15, NULL),
  ('DEMO-D1-S1-001', 6, 'B4', 'SAY',
   'The finance team can reissue a corrected figure within the hour.', NULL, NULL, NULL),
  ('DEMO-D1-S1-001', 7, 'B5', 'ASK',
   'Can you confirm what you just told me?', NULL, NULL, NULL),
  ('DEMO-D1-S1-001', 8, 'B6', 'SAY',
   'Thank you. That is the end of this situation.', NULL, NULL, NULL)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

-- DEMO-D1-S2-001 — The missing approval. Issued file lines 1346-1361.
-- PAUSE sits at B2, which is the whole point of CS-I-27.
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim,
   pause_seconds_min, pause_seconds_max, role_label)
VALUES
  ('DEMO-D1-S2-001', 1, NULL, 'BRIEF',
   'Do not indicate whether a retrospective approval is acceptable. Do not supply the word approval if the participant does not. At B2 say nothing at all until the timer clears.',
   NULL, NULL, 'not read aloud'),
  ('DEMO-D1-S2-001', 2, 'B1', 'READ',
   'A supplier has begun work. They are on site now, and they started on the strength of an email from you.',
   NULL, NULL, NULL),
  ('DEMO-D1-S2-001', 3, 'B2', 'READ',
   'The written approval that should have come first was never issued.', NULL, NULL, NULL),
  ('DEMO-D1-S2-001', 4, 'B2', 'PAUSE',
   'Remain silent for 10 to 15 seconds. The timer is visible to you only.', 10, 15, NULL),
  ('DEMO-D1-S2-001', 5, 'B3', 'ASK',
   'The project lead asks how the supplier came to be on site. What do you say?', NULL, NULL, NULL),
  ('DEMO-D1-S2-001', 6, 'B4', 'SAY',
   'The project lead can issue a retrospective approval today, or stop the work.', NULL, NULL, NULL),
  ('DEMO-D1-S2-001', 7, 'B5', 'ASK',
   'Take me through the sequence again.', NULL, NULL, NULL),
  ('DEMO-D1-S2-001', 8, 'B6', 'SAY',
   'Is there anything else about how the work started?', NULL, NULL,
   'approved follow-up, only where a material item is absent'),
  ('DEMO-D1-S2-001', 9, 'B7', 'SAY',
   'Thank you. That is the end of this situation.', NULL, NULL, NULL)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

-- ---------------------------------------------------------------------
-- The timing gate, reading the register
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_timing_determination_permitted(
  p_stage_entry_event_id uuid,
  p_question_code        text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_answer_type text;
  v_src         text;
  v_beats       int;
  v_required    text;
  v_stamp       timestamptz;
BEGIN
  SELECT m.answer_type INTO v_answer_type
  FROM public.t3a_d1_question_capture_map m
  WHERE m.question_code = p_question_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal', 'CAPTURE_MAPPING_NOT_RULED');
  END IF;

  IF v_answer_type !~* 'timing relative to' THEN
    RETURN jsonb_build_object('permitted', true, 'timing_dependent', false);
  END IF;

  SELECT cv.body ->> 'source_identifier' INTO v_src
  FROM public.t3a_stage_entry_event e
  JOIN public.t3a_d1_content_version cv
    ON cv.content_version_id = e.source_version_id
  WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  SELECT count(*) INTO v_beats
  FROM public.t3a_d1_mentor_action_sequence s
  WHERE s.source_identifier = v_src;

  IF v_beats = 0 THEN
    RETURN jsonb_build_object('permitted', false,
      'timing_dependent', true,
      'source_identifier', v_src,
      'refusal', 'BEAT_SCRIPT_NOT_LOADED',
      'detail', 'This source carries no mentor action sequence, so no beat '
             || 'marks the decision point. A timing determination cannot be '
             || 'made relative to a point that was never recorded.');
  END IF;

  SELECT s.beat_code INTO v_required
  FROM public.t3a_d1_mentor_action_sequence s
  WHERE s.source_identifier = v_src AND s.is_decision_point
  ORDER BY s.beat_ordinal LIMIT 1;

  IF v_required IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'timing_dependent', true,
      'source_identifier', v_src,
      'refusal', 'DECISION_POINT_BEAT_NOT_NAMED',
      'detail', 'The sequence is loaded but no beat in it is marked as the '
             || 'decision point. CS-I-27 forbids deriving one from the beat '
             || 'code, from enquiry_point or from the presence of a pause.');
  END IF;

  SELECT bt.recorded_at INTO v_stamp
  FROM public.t3a_d1_beat_timestamp bt
  WHERE bt.stage_entry_event_id = p_stage_entry_event_id
    AND bt.beat_code = v_required;

  IF v_stamp IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'timing_dependent', true,
      'required_beat', v_required,
      'refusal', 'BEAT_TIMESTAMP_MISSING');
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'timing_dependent', true,
    'required_beat', v_required,
    'decision_point_at', v_stamp);
END;
$fn$;
