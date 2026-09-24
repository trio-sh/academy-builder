-- =====================================================================
-- T3A-D1-EXEC-CORR-004 Section 1 — three determinations, three fields
--
-- CS-I-27 was drawn too wide and CS-I-32 amends it. It was right to
-- forbid deriving a reference from a pause. It should not have forbidden
-- the source-sheet fields that already carry one, and because it did, the
-- build refused three timing determinations whose reference points were
-- sitting in the register the whole time.
--
--   Q-D1-02   when first raised      <- enquiry_point
--   Q-D1-07   what changed on test   <- account_test_point
--   Q-D1-08a  disclosure timing      <- the decision point stated
--                                       inside bearing_interest
--
-- CS-I-33, THE PROHIBITION THAT STANDS, and it is the load-bearing half:
-- never derive a reference from the presence, position or duration of a
-- pause, and never assume a beat code carries a fixed role across
-- sources. DEMO-D1-S1-001 pauses at B3 and DEMO-D1-S2-001 at B2. B4 is
-- the corrective prompt in one demonstration source while SRC-D1-S2-001
-- puts the corrective prompt at B5 and the timing question at B6. A beat
-- code means nothing without its loaded sequence.
--
-- CS-I-36 forbids hand-entering the six decision points, so they are
-- parsed from bearing_interest and a later source revision carries
-- through. The six sources carrying one are exactly those CORR-004
-- Section 1.2 names, confirmed by query before this was written:
-- SRC-D1-S1-009, S2-005, S2-010, S3-010, S4-001 and S4-007.
--
-- THE PARSE, and why the first beat code is the right token:
--
--   S1-009  "Decision point is the Monday recommendation; the direct
--            question at R2 comes at that point"            -> R2
--   S2-005  "...accepting the panel seat; the direct question at B3
--            comes at that point"                           -> B3
--   S2-010  "...accepting the review; the direct question at B3..."-> B3
--   S4-001  "Decision point is the agreement at B4; the enquiry at B3
--            precedes it"                                   -> B4
--   S4-007  "Decision point is the agreement at B4."         -> B4
--   S3-010  "The decision point is the submission of the
--            recommendation. The enquiry follows it"        -> no beat
--
-- On the first three the decision point and the enquiry point COINCIDE,
-- which CS-I-37 says is deliberate and is why all four C8a lines are
-- reachable there. On S4-001 the enquiry PRECEDES the decision (CS-I-38),
-- and on S3-010 it FOLLOWS. The ordering is per source and nothing here
-- assumes one.
--
-- S3-010 names its decision point in words rather than as a beat, so no
-- beat resolves. Stage 3 carries no sequence and needs none, so the
-- determination refuses by name under CS-I-35 rather than guessing.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The reference beat, resolved from the governing field
-- ---------------------------------------------------------------------

-- A field states its reference as a beat code — "B3.", "R2, authored.",
-- "the agreement at B4" — or in words. The first beat code in the value
-- is the reference; where there is none, NULL means unresolved, never
-- "assume something".
CREATE OR REPLACE FUNCTION public.t3a_d1_first_beat_code(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT (regexp_match(coalesce(p_text, ''), '\m([BR][0-9]+)\M'))[1];
$fn$;

COMMENT ON FUNCTION public.t3a_d1_first_beat_code(text) IS
  'The first beat code stated in a source-sheet value. NULL where the value names its reference in words instead, which is not an error: the determination then refuses by name under CS-I-35.';

-- CS-I-32. Which field governs which determination, and nothing else.
CREATE OR REPLACE FUNCTION public.t3a_d1_reference_field(p_question_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE p_question_code
           WHEN 'Q-D1-02'  THEN 'enquiry_point'
           WHEN 'Q-D1-07'  THEN 'account_test_point'
           WHEN 'Q-D1-08a' THEN 'bearing_interest'
         END;
$fn$;

-- A source states a bearing interest as absent with "None." or "NONE.",
-- sometimes followed by an explanation. Presence is read from the start
-- of the value, on the same rule CS-I-24 applies to a bound family.
CREATE OR REPLACE FUNCTION public.t3a_d1_bearing_interest_present(p_value text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $fn$
  SELECT coalesce(p_value, '') <> ''
     AND lower(btrim(p_value)) NOT LIKE 'none%'
     AND lower(btrim(p_value)) NOT LIKE 'null%';
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_d1_reference_beat(
  p_source_sheet jsonb,
  p_question_code text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_field text := public.t3a_d1_reference_field(p_question_code);
  v_value text;
BEGIN
  IF v_field IS NULL THEN
    RETURN jsonb_build_object('timing_dependent', false);
  END IF;

  v_value := p_source_sheet ->> v_field;

  -- CS-I-34. An absent governing field means the determination is NOT
  -- SERVED under BR-07 — not served and then refused. The distinction
  -- matters: a refusal says something went wrong, and nothing has.
  IF v_field = 'bearing_interest' THEN
    IF NOT public.t3a_d1_bearing_interest_present(v_value) THEN
      RETURN jsonb_build_object('timing_dependent', true, 'served', false,
        'reason', 'BR-07', 'field', v_field);
    END IF;
  ELSIF coalesce(btrim(coalesce(v_value, '')), '') IN ('', ',', '.') THEN
    RETURN jsonb_build_object('timing_dependent', true, 'served', false,
      'reason', 'BR-07', 'field', v_field);
  END IF;

  RETURN jsonb_build_object(
    'timing_dependent', true,
    'served', true,
    'field', v_field,
    'field_value', v_value,
    'reference_beat', public.t3a_d1_first_beat_code(v_value));
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_reference_beat(jsonb, text) IS
  'CS-I-32. The reference beat for a timing determination, read from its own governing field: enquiry_point for Q-D1-02, account_test_point for Q-D1-07, the decision point inside bearing_interest for Q-D1-08a. Never from a pause (CS-I-33).';

-- ---------------------------------------------------------------------
-- 2. The gate, rebuilt on the resolver
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_timing_determination_permitted(
  p_stage_entry_event_id uuid,
  p_question_code        text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_sheet jsonb;
  v_src   text;
  v_ref   jsonb;
  v_beat  text;
  v_beats int;
  v_stamp timestamptz;
BEGIN
  IF public.t3a_d1_reference_field(p_question_code) IS NULL THEN
    RETURN jsonb_build_object('permitted', true, 'timing_dependent', false);
  END IF;

  SELECT cv.body -> 'source_sheet', cv.body ->> 'source_identifier'
    INTO v_sheet, v_src
  FROM public.t3a_stage_entry_event e
  JOIN public.t3a_d1_content_version cv
    ON cv.content_version_id = e.source_version_id
  WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  v_ref := public.t3a_d1_reference_beat(v_sheet, p_question_code);

  -- CS-I-34: not served is not a refusal, and its absence is not a
  -- missing state.
  IF (v_ref ->> 'served') IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object('permitted', false, 'served', false,
      'timing_dependent', true,
      'reason', v_ref ->> 'reason',
      'field', v_ref ->> 'field',
      'source_identifier', v_src);
  END IF;

  v_beat := v_ref ->> 'reference_beat';

  SELECT count(*) INTO v_beats
  FROM public.t3a_d1_mentor_action_sequence s
  WHERE s.source_identifier = v_src;

  -- CS-I-35. Present but unresolvable refuses by name.
  IF v_beat IS NULL THEN
    RETURN jsonb_build_object('permitted', false, 'served', true,
      'timing_dependent', true,
      'refusal', 'REFERENCE_BEAT_NOT_STATED_AS_BEAT',
      'field', v_ref ->> 'field',
      'field_value', v_ref ->> 'field_value',
      'source_identifier', v_src);
  END IF;

  IF v_beats = 0 THEN
    RETURN jsonb_build_object('permitted', false, 'served', true,
      'timing_dependent', true,
      'refusal', 'BEAT_SCRIPT_NOT_LOADED',
      'reference_beat', v_beat,
      'source_identifier', v_src);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_mentor_action_sequence s
    WHERE s.source_identifier = v_src AND s.beat_code = v_beat)
  THEN
    RETURN jsonb_build_object('permitted', false, 'served', true,
      'timing_dependent', true,
      'refusal', 'REFERENCE_BEAT_NOT_IN_SEQUENCE',
      'reference_beat', v_beat,
      'source_identifier', v_src);
  END IF;

  SELECT bt.recorded_at INTO v_stamp
  FROM public.t3a_d1_beat_timestamp bt
  WHERE bt.stage_entry_event_id = p_stage_entry_event_id
    AND bt.beat_code = v_beat;

  IF v_stamp IS NULL THEN
    RETURN jsonb_build_object('permitted', false, 'served', true,
      'timing_dependent', true,
      'refusal', 'BEAT_TIMESTAMP_MISSING',
      'reference_beat', v_beat,
      'source_identifier', v_src);
  END IF;

  RETURN jsonb_build_object('permitted', true, 'served', true,
    'timing_dependent', true,
    'reference_beat', v_beat,
    'reference_at', v_stamp,
    'source_identifier', v_src);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_reference_beat(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_reference_field(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_first_beat_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_bearing_interest_present(text) TO authenticated;
