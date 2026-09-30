-- CORR-006 Section 3, CX-06. CL-T3, CL-T4 and CL-T5a against the live
-- schema. SELF-ABORTING: read the result from the error message.
--
-- The three rules, as CORR-006 Section 3 restates them in full:
--   R-a  "final" closes the determination at that beat. A set with no
--        final beat closes at commit.
--   R-b  A whole-session line is offered only at close, identified by
--        ANSWER VALUE, because the catalogue and BR-09 word the C8a line
--        differently.
--   R-c  The Cockpit does not advance past a final beat while that
--        determination is unanswered.
--
-- WHY THIS FILE BUILDS A STAGE ENTRY. Every existing stage entry points at
-- SRC-D1-S2-001, which binds fourteen capture sets and NOT ONE with a
-- 'final' qualifier. So R-c had no subject and would have passed for free
-- against the current fixture — the CS-I-54a fault. This synthesizes an
-- entry on SRC-D1-S2-005, one of the four sources CORR-006 R-c names,
-- by copying the existing entry's required columns and swapping only the
-- source version. It is undone by the abort.
set search_path = public;

DO $p$
DECLARE
  v_entry uuid; v_src text := 'SRC-D1-S2-005'; v_ver uuid; v_out text := '';
  v_close_final text; v_close_none text;
  v_before jsonb; v_at jsonb; v_adv jsonb; v_q text;
  v_lines_before int; v_lines_at int;
BEGIN
  SELECT cv.content_version_id INTO v_ver
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = v_src;

  INSERT INTO public.t3a_stage_entry_event
    (observation_path_gateway_id, stage_instance_id, stage_code, dimensions_in_play,
     session_identity, assistance_rules_version, administration_conditions,
     participant_id, dimension_id, source_version_id, env_state_at_entry)
  SELECT e.observation_path_gateway_id, e.stage_instance_id, e.stage_code, e.dimensions_in_play,
         e.session_identity, e.assistance_rules_version, e.administration_conditions,
         e.participant_id, e.dimension_id, v_ver, e.env_state_at_entry
    FROM public.t3a_stage_entry_event e
   WHERE e.stage_code::text = 'S2'
   LIMIT 1
  RETURNING stage_entry_event_id INTO v_entry;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'C8_FINAL_FIXTURE_FAILED: could not synthesize a stage entry on %.', v_src;
  END IF;
  v_out := 'subject=' || v_src || ' ';

  -- ---- CL-T3 / R-a: which beat closes each set --------------------
  v_close_final := public.t3a_d1_capture_close_beat(v_src, 'C8a');
  v_close_none  := public.t3a_d1_capture_close_beat(v_src, 'C1');
  v_out := v_out || 'R-a[C8a closes=' || coalesce(v_close_final, '<commit>')
                 || ', C1 closes=' || coalesce(v_close_none, '<commit>') || '] ';

  -- ---- CL-T4 / R-b: the whole-session line only at close ----------
  -- The question-to-capture mapping lives in t3a_d1_question_capture_map,
  -- read from the register at serve time (CS-I-01), never compiled in.
  SELECT question_code INTO v_q FROM public.t3a_d1_question_capture_map
   WHERE capture_set_code = 'C8a' LIMIT 1;

  v_before := public.t3a_d1_capture_visible_at_beat(v_entry, v_q, 'C8a', 'B3');
  v_at     := public.t3a_d1_capture_visible_at_beat(v_entry, v_q, 'C8a', coalesce(v_close_final, 'B7'));

  -- The key is whole_session_lines_offered, PLURAL. An earlier draft of
  -- this proof looked for a singular key and a 'lines' array, neither of
  -- which the function returns, and therefore read 0 at both beats — which
  -- would have been reported as a build defect that does not exist. The
  -- raw payload settled it. SOP-002 Appendix 6 question 8.
  v_out := v_out || 'R-b[offered at B3=' || coalesce((v_before ->> 'whole_session_lines_offered'), '<missing key>')
                 || ', at close=' || coalesce((v_at ->> 'whole_session_lines_offered'), '<missing key>')
                 || ', closes_at=' || coalesce(v_at ->> 'closes_at', '?') || '] ';

  IF (v_before ->> 'whole_session_lines_offered') IS NULL THEN
    RAISE EXCEPTION 'R_B_KEY_MISSING: the payload has no whole_session_lines_offered key, so this test is reading the wrong thing: %', v_before::text;
  END IF;

  -- ---- CL-T5a / R-c: no advance past a final beat unanswered ------
  v_adv := public.t3a_d1_beat_advance_permitted(v_entry, coalesce(v_close_final, 'B7'));
  v_out := v_out || 'R-c[permitted=' || coalesce(v_adv ->> 'permitted', v_adv ->> 'may_advance', '?')
                 || ' refusal=' || coalesce(v_adv ->> 'refusal', v_adv ->> 'refusal_code', 'none') || ']';

  RAISE EXCEPTION 'C8FINAL_RESULT %', v_out;
END;
$p$;
