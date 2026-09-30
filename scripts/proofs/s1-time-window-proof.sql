-- CORR-006 AC-B3a. SELF-ABORTING: read the result from the error message.
--
-- WHY THE SUBJECTS ARE SYNTHETIC. The honest way to prove "the run refuses
-- where a loaded value differs" is to show it a source whose loaded value
-- differs. The ten real ones all agree, and mutating an issued source_sheet
-- to manufacture a disagreement would mean editing issued content to test a
-- guard — even inside an aborted transaction, that is the wrong instinct to
-- practise. So two synthetic Stage 1 sources are created here, one whose
-- loaded window disagrees with its issued window and one whose agrees, and
-- the issued windows for them are inserted alongside. The real ten are not
-- touched, read or written.
set search_path = public;

DO $p$
DECLARE
  v_out text := '';
  v_r   text;
  v_c   jsonb;
  v_bad_obj uuid; v_bad_ver uuid;
  v_ok_obj  uuid; v_ok_ver  uuid;
  v_tmpl public.t3a_d1_ai_administration_run;
BEGIN
  -- ---------------------------------------------------------------
  -- (1) The parser refuses to guess.
  -- ---------------------------------------------------------------
  v_c := public.t3a_d1_s1_parse_loaded_window('600 / 1500.');
  v_out := v_out || 'parseNormal='
        || CASE WHEN (v_c ->> 'readable')::boolean
                     AND (v_c ->> 'min_seconds') = '600'
                     AND (v_c ->> 'max_seconds') = '1500'
                THEN 'READ_600_1500' ELSE 'WRONG(' || v_c::text || ')' END || ' ';

  v_c := public.t3a_d1_s1_parse_loaded_window(',');
  v_out := v_out || 'parseTheLoadedMinField='
        || CASE WHEN NOT (v_c ->> 'readable')::boolean THEN 'UNREADABLE' ELSE 'READ(' || v_c::text || ')' END || ' ';

  -- The one that matters: a third number must not be silently dropped.
  v_c := public.t3a_d1_s1_parse_loaded_window('600 / 1500 per session, 90 grace');
  v_out := v_out || 'parseThreeNumbers='
        || CASE WHEN NOT (v_c ->> 'readable')::boolean THEN 'UNREADABLE' ELSE 'READ(' || v_c::text || ')' END || ' ';

  v_c := public.t3a_d1_s1_parse_loaded_window('1500 / 600.');
  v_out := v_out || 'parseReversed='
        || CASE WHEN NOT (v_c ->> 'readable')::boolean THEN 'UNREADABLE' ELSE 'READ(' || v_c::text || ')' END || ' ';

  -- ---------------------------------------------------------------
  -- (2) Two synthetic subjects.
  -- ---------------------------------------------------------------
  INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
  VALUES ('SRC-D1-S1-997', 'source'::public.t3a_content_family,
          'SYNTHETIC — aborted transaction only', 'D1')
  RETURNING content_object_id INTO v_bad_obj;
  INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
  VALUES (v_bad_obj, 1, jsonb_build_object(
            'synthetic_test_only', true,
            'source_version_hash', encode(sha256('s1-997'::bytea), 'hex'),
            'source_sheet', jsonb_build_object('max_seconds', '111 / 222.')))
  RETURNING content_version_id INTO v_bad_ver;

  INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
  VALUES ('SRC-D1-S1-996', 'source'::public.t3a_content_family,
          'SYNTHETIC — aborted transaction only', 'D1')
  RETURNING content_object_id INTO v_ok_obj;
  INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
  VALUES (v_ok_obj, 1, jsonb_build_object(
            'synthetic_test_only', true,
            'source_version_hash', encode(sha256('s1-996'::bytea), 'hex'),
            'source_sheet', jsonb_build_object('max_seconds', '600 / 1500.')))
  RETURNING content_version_id INTO v_ok_ver;

  INSERT INTO public.t3a_d1_s1_time_window (source_identifier, min_seconds, max_seconds, issued_under)
  VALUES ('SRC-D1-S1-997', 600, 1500, 'SYNTHETIC — aborted transaction only'),
         ('SRC-D1-S1-996', 600, 1500, 'SYNTHETIC — aborted transaction only');

  v_c := public.t3a_d1_s1_window_check('SRC-D1-S1-997');
  v_out := v_out || 'checkDisagreeing=' || coalesce(v_c ->> 'refusal_code', 'AGREES') || ' ';
  v_c := public.t3a_d1_s1_window_check('SRC-D1-S1-996');
  v_out := v_out || 'checkAgreeing='
        || CASE WHEN (v_c ->> 'agrees')::boolean THEN 'AGREES' ELSE (v_c ->> 'refusal_code') END || ' ';
  v_c := public.t3a_d1_s1_window_check('SRC-D1-S9-001');
  v_out := v_out || 'checkUnlisted=' || coalesce(v_c ->> 'refusal_code', 'AGREES') || ' ';

  -- ---------------------------------------------------------------
  -- (3) The run refuses. The template is the one existing demonstration
  --     run, so every other NOT NULL column and FK is a real value rather
  --     than something invented for a test.
  -- ---------------------------------------------------------------
  SELECT * INTO v_tmpl FROM public.t3a_d1_ai_administration_run LIMIT 1;
  IF v_tmpl.ai_administration_run_id IS NULL THEN
    RAISE EXCEPTION 'ACB3A_NO_RUN_TEMPLATE: no run row exists to copy, so the trigger path has no subject and would pass for free.';
  END IF;

  BEGIN
    INSERT INTO public.t3a_d1_ai_administration_run
      (stage_entry_event_id, participant_id, dimension_id, source_version_id,
       model_ref_version_id, prompt_ref_version_id, admin_config_version_id,
       safety_config_version_id, rendered_body, env_state_at_run, run_started_at, status)
    VALUES (v_tmpl.stage_entry_event_id, v_tmpl.participant_id, v_tmpl.dimension_id, v_bad_ver,
            v_tmpl.model_ref_version_id, v_tmpl.prompt_ref_version_id, v_tmpl.admin_config_version_id,
            v_tmpl.safety_config_version_id, 'SYNTHETIC', v_tmpl.env_state_at_run, now(), v_tmpl.status);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'S1_RUN_WINDOW_DISAGREES%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 70) || ')' END;
  END;
  v_out := v_out || 'runOnDisagreeing=' || v_r || ' ';

  -- The negative control. If this also refuses, the guard is refusing
  -- everything and the line above proves nothing.
  BEGIN
    INSERT INTO public.t3a_d1_ai_administration_run
      (stage_entry_event_id, participant_id, dimension_id, source_version_id,
       model_ref_version_id, prompt_ref_version_id, admin_config_version_id,
       safety_config_version_id, rendered_body, env_state_at_run, run_started_at, status)
    VALUES (v_tmpl.stage_entry_event_id, v_tmpl.participant_id, v_tmpl.dimension_id, v_ok_ver,
            v_tmpl.model_ref_version_id, v_tmpl.prompt_ref_version_id, v_tmpl.admin_config_version_id,
            v_tmpl.safety_config_version_id, 'SYNTHETIC', v_tmpl.env_state_at_run, now(), v_tmpl.status);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := 'REFUSED(' || left(SQLERRM, 70) || ')';
  END;
  v_out := v_out || 'runOnAgreeing=' || v_r;

  RAISE EXCEPTION 'ACB3A_RESULT %', v_out;
END;
$p$;
