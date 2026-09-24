-- =====================================================================
-- Beat timestamps, and the timing determination that depends on them
--
-- AC-13: "A missing required beat timestamp prevents the dependent
-- timing determination." Q-D1-08a asks when a disclosure was first made
-- RELATIVE TO THE DECISION POINT. The decision point is a beat. If the
-- beat was never timestamped there is no point to be relative to, and a
-- mentor answering "before the decision point" would be recording a
-- comparison against nothing.
--
-- So the determination is refused, not defaulted and not left to
-- judgment.
--
-- WHAT IS NOT BUILT HERE, AND WHY. The beat a source names as its
-- decision point comes from that source's mentor action sequence. NO
-- LOADED SOURCE CARRIES ONE: all eighty-one content versions hold
-- source_identifier, title, stage_code, source_sheet, verbatim,
-- source_version_hash, rec07_approval_ref, name_clearance_status and
-- register, and nothing else. The beat script exists in the issued
-- edition's prose and was never extracted into a structured sequence.
--
-- Naming a beat code here — guessing that the decision point is 'B2'
-- because an acceptance test mentions a B2 pause — would be inventing
-- the structure of an approved script. So the gate reads the beat script
-- from the source and refuses with BEAT_SCRIPT_NOT_LOADED when there is
-- none. That is the correct behavior today and remains correct once the
-- scripts load: the refusal simply stops firing.
-- =====================================================================

set search_path = public;

CREATE TABLE IF NOT EXISTS public.t3a_d1_beat_timestamp (
  stage_entry_event_id uuid NOT NULL
    REFERENCES public.t3a_stage_entry_event(stage_entry_event_id) ON DELETE CASCADE,
  beat_code            text NOT NULL,
  recorded_at          timestamptz NOT NULL DEFAULT now(),
  -- Where a beat is a held pause, how long it was actually held. AC-12
  -- asks for ten to fifteen seconds; the observed value is recorded
  -- rather than assumed, so a short pause is visible instead of tidy.
  duration_seconds     integer,
  recorded_by          uuid NOT NULL DEFAULT auth.uid(),
  PRIMARY KEY (stage_entry_event_id, beat_code)
);

COMMENT ON TABLE public.t3a_d1_beat_timestamp IS
  'When each beat of the mentor action sequence was reached, recorded at the beat. A timing determination that has no timestamp to be relative to is refused rather than answered.';

ALTER TABLE public.t3a_d1_beat_timestamp ENABLE ROW LEVEL SECURITY;

-- The same party rule the commit route and the live-view gate apply:
-- the participant, the assigned mentor, and administrative standing.
DROP POLICY IF EXISTS t3a_d1_beat_timestamp_read ON public.t3a_d1_beat_timestamp;
CREATE POLICY t3a_d1_beat_timestamp_read
  ON public.t3a_d1_beat_timestamp FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.t3a_stage_entry_event e
    WHERE e.stage_entry_event_id = t3a_d1_beat_timestamp.stage_entry_event_id
      AND (e.participant_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.t3a_mentor_assignment ma
                      WHERE ma.mentor_id = auth.uid()
                        AND ma.participant_id = e.participant_id)
           OR public.is_admin()
           OR public.t3a_has_administrative_standing())));

-- A beat is recorded by the mentor running the session, at the beat.
DROP POLICY IF EXISTS t3a_d1_beat_timestamp_write ON public.t3a_d1_beat_timestamp;
CREATE POLICY t3a_d1_beat_timestamp_write
  ON public.t3a_d1_beat_timestamp FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.t3a_stage_entry_event e
    WHERE e.stage_entry_event_id = t3a_d1_beat_timestamp.stage_entry_event_id
      AND EXISTS (SELECT 1 FROM public.t3a_mentor_assignment ma
                  WHERE ma.mentor_id = auth.uid()
                    AND ma.participant_id = e.participant_id)));

-- A beat timestamp is a record of when something happened. It is not
-- revised: no UPDATE policy and no DELETE policy, so neither is
-- permitted for any authenticated account.

GRANT SELECT, INSERT ON public.t3a_d1_beat_timestamp TO authenticated;

-- ---------------------------------------------------------------------
-- The gate
-- ---------------------------------------------------------------------

-- Which questions are timing-dependent is read from the register's own
-- answer_type rather than from a list kept here, so a question that
-- becomes timing-dependent later does not need this function edited.
CREATE OR REPLACE FUNCTION public.t3a_d1_timing_determination_permitted(
  p_stage_entry_event_id uuid,
  p_question_code        text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_answer_type text;
  v_beats       jsonb;
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

  -- Not a timing determination: nothing to gate.
  IF v_answer_type !~* 'timing relative to' THEN
    RETURN jsonb_build_object('permitted', true, 'timing_dependent', false);
  END IF;

  SELECT cv.body -> 'mentor_action_sequence' INTO v_beats
  FROM public.t3a_stage_entry_event e
  JOIN public.t3a_d1_content_version cv
    ON cv.content_version_id = e.source_version_id
  WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  IF v_beats IS NULL OR jsonb_typeof(v_beats) <> 'array' THEN
    RETURN jsonb_build_object('permitted', false,
      'timing_dependent', true,
      'refusal', 'BEAT_SCRIPT_NOT_LOADED',
      'detail', 'This source carries no mentor action sequence, so no beat '
             || 'marks the decision point. A timing determination cannot be '
             || 'made relative to a point that was never recorded.');
  END IF;

  SELECT b ->> 'code' INTO v_required
  FROM jsonb_array_elements(v_beats) b
  WHERE coalesce(b ->> 'decision_point', '') = 'true'
  LIMIT 1;

  IF v_required IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'timing_dependent', true,
      'refusal', 'DECISION_POINT_BEAT_NOT_NAMED');
  END IF;

  SELECT bt.recorded_at INTO v_stamp
  FROM public.t3a_d1_beat_timestamp bt
  WHERE bt.stage_entry_event_id = p_stage_entry_event_id
    AND bt.beat_code = v_required;

  IF v_stamp IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'timing_dependent', true,
      'required_beat', v_required,
      'refusal', 'BEAT_TIMESTAMP_MISSING',
      'detail', 'The decision-point beat was never timestamped, so there is '
             || 'nothing for this determination to be relative to.');
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'timing_dependent', true,
    'required_beat', v_required,
    'decision_point_at', v_stamp);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_timing_determination_permitted(uuid, text) TO authenticated;
