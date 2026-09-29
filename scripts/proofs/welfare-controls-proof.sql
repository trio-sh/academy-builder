-- CORR-006 CX-30(a) and (b). SELF-ABORTING: read the result from the error
-- message. Nothing commits — a build does not stop real sessions or open real
-- safety events.
--
-- The line that matters most is narrativeOnOrdinarySession=ACCEPTED beside
-- narrativeAfterStop=REFUSED_BY_NAME: the C5e guard must close the welfare
-- case without taking the session log away from an ordinary pause.
set search_path = public;
DO $p$
DECLARE
  v_out text := ''; v_r jsonb; v_e text;
  v_s2 uuid; v_s1 uuid; v_mentor uuid; v_si uuid;
BEGIN
  -- Subjects: an existing Stage 2 entry and an existing Stage 1 entry.
  SELECT stage_entry_event_id INTO v_s2 FROM public.t3a_stage_entry_event WHERE stage_code='S2' LIMIT 1;
  SELECT stage_entry_event_id INTO v_s1 FROM public.t3a_stage_entry_event WHERE stage_code='S1' LIMIT 1;
  v_out := v_out || 'haveS2=' || (v_s2 IS NOT NULL)::text || ' haveS1=' || (v_s1 IS NOT NULL)::text || ' ';

  IF v_s2 IS NULL THEN
    RAISE EXCEPTION 'CX30_NO_SUBJECT %', v_out || '— no Stage 2 entry exists, so Stop for welfare has no session to stop and the test would pass for free.';
  END IF;

  -- Act as the assigned mentor for that entry.
  SELECT m.mentor_id INTO v_mentor
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_mentor_assignment m ON m.participant_id = e.participant_id
   WHERE e.stage_entry_event_id = v_s2 LIMIT 1;
  v_out := v_out || 'haveAssignedMentor=' || (v_mentor IS NOT NULL)::text || ' ';
  IF v_mentor IS NULL THEN
    RAISE EXCEPTION 'CX30_NO_MENTOR %', v_out || '— no assigned mentor, so the route would refuse for standing and prove nothing about welfare.';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mentor::text, 'role', 'authenticated')::text, true);

  -- (1) Stop for welfare at Stage 2.
  v_r := public.t3a_d1_stop_for_welfare(v_s2, 'B3', NULL);
  v_out := v_out || 'stopS2='
        || CASE WHEN (v_r ->> 'recorded')::boolean THEN 'RECORDED' ELSE 'REFUSED(' || (v_r ->> 'refusal_code') || ')' END || ' ';
  v_out := v_out || 'attemptConsumed=' || coalesce(v_r ->> 'attempt_consumed','-')
        || ' withheld=' || coalesce(v_r ->> 'observation_withheld','-')
        || ' safetyEvent=' || coalesce(v_r ->> 'safety_event_opened','-')
        || ' contactState=' || coalesce(v_r -> 'safety_contact' ->> 'refusal_code','DESIGNATED') || ' ';

  -- (2) Not stopped twice.
  v_r := public.t3a_d1_stop_for_welfare(v_s2, 'B4', NULL);
  v_out := v_out || 'stopTwice=' || coalesce(v_r ->> 'refusal_code','RECORDED') || ' ';

  -- (3) C5e. A narrative on the session afterwards is refused.
  SELECT stage_instance_id INTO v_si FROM public.t3a_stage_entry_event WHERE stage_entry_event_id = v_s2;
  PERFORM set_config('role','postgres',true);
  BEGIN
    INSERT INTO public.t3a_d1_s2_session_event (stage_instance_id, event_kind, beat_code, reason, recorded_by)
    VALUES (v_si, 'paused'::public.t3a_d1_s2_session_event_kind, 'B4',
            'participant said they had been thinking about hurting themselves', v_mentor);
    v_e := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_e := CASE WHEN SQLERRM LIKE 'SESSION_EVENT_CARRIES_A_WELFARE_NARRATIVE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM,50) || ')' END;
  END;
  v_out := v_out || 'narrativeAfterStop=' || v_e || ' ';

  -- (4) Negative control: a narrative on a session NOT withheld is accepted.
  BEGIN
    INSERT INTO public.t3a_d1_s2_session_event (stage_instance_id, event_kind, beat_code, reason, recorded_by)
    VALUES (gen_random_uuid(), 'paused'::public.t3a_d1_s2_session_event_kind, 'B2',
            'the participant lost connection', v_mentor);
    v_e := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_e := 'REFUSED(' || left(SQLERRM,60) || ')'; END;
  v_out := v_out || 'narrativeOnOrdinarySession=' || v_e || ' ';

  -- (5) Stop for welfare refuses at Stage 1; Withhold refuses at Stage 2.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mentor::text, 'role', 'authenticated')::text, true);
  IF v_s1 IS NOT NULL THEN
    -- A mentor stopping somebody else's Stage 1 session: refused, no mentor
    -- is present at Stage 1.
    v_r := public.t3a_d1_stop_for_welfare(v_s1, 'B1', NULL);
    v_out := v_out || 'mentorStopsS1=' || coalesce(v_r ->> 'refusal_code','RECORDED') || ' ';

    -- The PARTICIPANT stopping their own Stage 1 session: recorded. Annex A
    -- promises them this control in the words they read before they begin.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', (SELECT participant_id::text FROM public.t3a_stage_entry_event
                                 WHERE stage_entry_event_id = v_s1),
                        'role','authenticated')::text, true);
    v_r := public.t3a_d1_stop_for_welfare(v_s1, 'B1', NULL);
    v_out := v_out || 'participantStopsOwnS1='
          || CASE WHEN (v_r ->> 'recorded')::boolean THEN 'RECORDED' ELSE 'REFUSED(' || (v_r ->> 'refusal_code') || ')' END || ' ';
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_mentor::text, 'role','authenticated')::text, true);
  END IF;
  v_r := public.t3a_d1_withhold_for_welfare(v_s2);
  v_out := v_out || 'withholdAtS2=' || coalesce(v_r ->> 'refusal_code','RECORDED') || ' ';

  -- (6) A determination on the stopped observation is refused.
  PERFORM set_config('role','postgres',true);
  BEGIN
    INSERT INTO public.t3a_d1_s1_determination
      (stage_instance_id, participant_id, dimension_id, captured_by, question_id, selection)
    SELECT v_si, e.participant_id, e.dimension_id, v_mentor, 'Q-D1-01', '{"s":1}'::jsonb
      FROM public.t3a_stage_entry_event e WHERE e.stage_entry_event_id = v_s2;
    v_e := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_e := CASE WHEN SQLERRM LIKE 'OBSERVATION_WITHHELD_FOR_WELFARE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM,50) || ')' END;
  END;
  v_out := v_out || 'determinationAfterStop=' || v_e;

  RAISE EXCEPTION 'CX30_RESULT %', v_out;
END;
$p$;
