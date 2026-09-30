-- CORR-006 CX-29 / CX-30(c) / CX-30(d). SELF-ABORTING: read the result from
-- the error message.
--
-- Every exclusion is tested WITH the negative control beside it — the same
-- write attempted on an observation that was NOT withheld. Without that, a
-- guard that refused every determination would pass every line here.
set search_path = public;

DO $p$
DECLARE
  v_out   text := '';
  v_r     text;
  v_p     uuid;
  v_actor uuid;
  v_si_w  uuid := gen_random_uuid();   -- the withheld observation
  v_si_ok uuid := gen_random_uuid();   -- the control
  v_ev    uuid;
  v_obs_w uuid;
  v_obs_ok uuid;
  v_n     int;
BEGIN
  SELECT id INTO v_p FROM public.profiles ORDER BY id LIMIT 1;
  SELECT id INTO v_actor FROM public.profiles ORDER BY id DESC LIMIT 1;
  IF v_p IS NULL THEN
    RAISE EXCEPTION 'CX29_NO_SUBJECT: no profile exists, so nothing can be withheld and the test would have no subject.';
  END IF;

  -- ---------------------------------------------------------------
  -- (1) CX-30(d). The Safety Contact is not designated, and says so.
  -- ---------------------------------------------------------------
  v_out := v_out || 'safetyContact='
        || coalesce(public.t3a_current_safety_contact() ->> 'refusal_code', 'DESIGNATED') || ' ';

  -- ---------------------------------------------------------------
  -- (2) CX-30(c). A safety event record, and who can read it.
  -- ---------------------------------------------------------------
  INSERT INTO public.t3a_safety_event
    (occurred_at, stage_code, acted_by, acted_as, stopped, escalated_to_safety_contact,
     escalated_at, concerns_person)
  VALUES (now(), 'S2', v_actor, 'mentor', true, true, now(), v_p)
  RETURNING safety_event_id INTO v_ev;
  v_out := v_out || 'safetyEventWritten=YES ';

  -- Escalation with no time is refused: C4d requires the same day, which
  -- cannot be shown without the instant.
  BEGIN
    INSERT INTO public.t3a_safety_event
      (occurred_at, stage_code, acted_by, acted_as, escalated_to_safety_contact, concerns_person)
    VALUES (now(), 'S2', v_actor, 'mentor', true, v_p);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'SAFETY_ESCALATION_HAS_NO_TIME%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 50) || ')' END;
  END;
  v_out := v_out || 'escalationWithoutTime=' || v_r || ' ';

  -- An event where nothing was done at all is refused.
  BEGIN
    INSERT INTO public.t3a_safety_event
      (occurred_at, stage_code, acted_by, acted_as, concerns_person)
    VALUES (now(), 'S2', v_actor, 'mentor', v_p);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED'; END;
  v_out := v_out || 'eventWithNothingDone=' || v_r || ' ';

  -- Append-only.
  BEGIN
    UPDATE public.t3a_safety_event SET stopped = false WHERE safety_event_id = v_ev;
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'SAFETY_EVENT_APPEND_ONLY%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 50) || ')' END;
  END;
  v_out := v_out || 'safetyEventEdit=' || v_r || ' ';

  -- C.7: visible only to the Safety Contact and the founder. With neither
  -- designated, visible to NOBODY. Checked as an authenticated caller who is
  -- an oversight holder, so this is not merely "a random user cannot see it".
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT holder_id::text FROM public.t3a_oversight_holder
                               WHERE revoked_at IS NULL LIMIT 1),
                      'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO v_n FROM public.t3a_safety_event;
  v_out := v_out || 'rowsVisibleToOversightHolder=' || v_n || ' ';
  v_out := v_out || 'isSafetyContact=' || public.t3a_is_safety_contact()::text || ' ';

  -- CLEAR THE CLAIM, not just the role. The first run left
  -- request.jwt.claims set to the oversight holder, and an existing guard —
  -- OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE — then refused the CONTROL
  -- determination below. The control read REFUSED and the withheld one read
  -- REFUSED_BY_NAME, which looked like the guard working while the control
  -- was actually being refused for an unrelated reason. Impersonation has to
  -- be undone completely or a later line inherits it.
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ---------------------------------------------------------------
  -- (3) CX-29. The withholding, and its four exclusions, each against a
  --     control that was not withheld.
  -- ---------------------------------------------------------------
  INSERT INTO public.t3a_d1_welfare_withholding
    (stage_instance_id, participant_id, dimension_id, stage_code, safety_event_id, withheld_by)
  VALUES (v_si_w, v_p, 'D1', 'S1', v_ev, v_actor);

  -- Determination.
  BEGIN
    INSERT INTO public.t3a_d1_s1_determination
      (stage_instance_id, participant_id, dimension_id, captured_by, question_id, selection)
    VALUES (v_si_w, v_p, 'D1', v_actor, 'Q-D1-01', '{"synthetic": true}'::jsonb);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'OBSERVATION_WITHHELD_FOR_WELFARE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 55) || ')' END;
  END;
  v_out := v_out || 'determinationOnWithheld=' || v_r || ' ';

  BEGIN
    INSERT INTO public.t3a_d1_s1_determination
      (stage_instance_id, participant_id, dimension_id, captured_by, question_id, selection)
    VALUES (v_si_ok, v_p, 'D1', v_actor, 'Q-D1-01', '{"synthetic": true}'::jsonb);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || left(SQLERRM, 55) || ')'; END;
  v_out := v_out || 'determinationOnControl=' || v_r || ' ';

  -- Confirmation.
  BEGIN
    INSERT INTO public.t3a_d1_s1_confirmation
      (stage_instance_id, participant_id, dimension_id, confirmed_by)
    VALUES (v_si_w, v_p, 'D1', v_actor);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'OBSERVATION_WITHHELD_FOR_WELFARE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 55) || ')' END;
  END;
  v_out := v_out || 'confirmationOnWithheld=' || v_r || ' ';

  -- Commit of the observation record. Keyed by participant, dimension and
  -- stage, so the withheld one is S1 and the control is S2.
  BEGIN
    INSERT INTO public.t3a_observation_record
      (participant_id, dimension_id, stage_code, observer_id, is_committed)
    VALUES (v_p, 'D1', 'S1', v_actor, true)
    RETURNING observation_record_id INTO v_obs_w;
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'OBSERVATION_WITHHELD_FOR_WELFARE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 55) || ')' END;
  END;
  v_out := v_out || 'commitOnWithheld=' || v_r || ' ';

  BEGIN
    INSERT INTO public.t3a_observation_record
      (participant_id, dimension_id, stage_code, observer_id, is_committed)
    VALUES (v_p, 'D1', 'S2', v_actor, true)
    RETURNING observation_record_id INTO v_obs_ok;
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || left(SQLERRM, 55) || ')'; END;
  v_out := v_out || 'commitOnControl=' || v_r || ' ';

  -- An UNCOMMITTED record on the withheld observation is still allowed: the
  -- responses are retained in history (CX-29), and refusing the row would
  -- delete the history the instruction says to keep.
  BEGIN
    INSERT INTO public.t3a_observation_record
      (participant_id, dimension_id, stage_code, observer_id, is_committed)
    VALUES (v_p, 'D1', 'S3', v_actor, false);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || left(SQLERRM, 55) || ')'; END;
  v_out := v_out || 'uncommittedOnWithheld=' || v_r || ' ';

  -- Composed statement, reached through its observation record.
  IF v_obs_ok IS NOT NULL THEN
    INSERT INTO public.t3a_d1_welfare_withholding
      (stage_instance_id, participant_id, dimension_id, stage_code, withheld_by)
    VALUES (gen_random_uuid(), v_p, 'D1', 'S2', v_actor);
    BEGIN
      INSERT INTO public.t3a_d1_composed_statement
        (observation_record_id, composed_body, composed_by)
      VALUES (v_obs_ok, 'SYNTHETIC', v_actor);
      v_r := 'ACCEPTED';
    EXCEPTION WHEN others THEN
      v_r := CASE WHEN SQLERRM LIKE 'OBSERVATION_WITHHELD_FOR_WELFARE%'
                  THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 55) || ')' END;
    END;
    v_out := v_out || 'statementOnWithheld=' || v_r || ' ';
  END IF;

  -- CX-30(b): a withholding cannot be undone by the confirmer.
  BEGIN
    DELETE FROM public.t3a_d1_welfare_withholding WHERE stage_instance_id = v_si_w;
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'WELFARE_WITHHOLDING_CANNOT_BE_UNDONE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 50) || ')' END;
  END;
  v_out := v_out || 'withholdingUndone=' || v_r || ' ';

  -- (4) The report assembly reads committed observations only, which is what
  --     makes report and release exclusion follow from commit exclusion
  --     rather than needing guards of their own. Read from the catalogue.
  v_out := v_out || 'reportAssemblyRequiresCommitted='
        || (pg_get_functiondef('public.t3a_d1_report_face_assemble(uuid)'::regprocedure)
            ~ 'o\.is_committed')::text;

  RAISE EXCEPTION 'CX2930_RESULT %', v_out;
END;
$p$;
