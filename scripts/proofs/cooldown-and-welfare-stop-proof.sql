-- CORR-006 CX-27 / CX-28. SELF-ABORTING: read the result from the error
-- message. Every attempt row below is synthetic and nothing commits — a
-- build does not write attempts about real people.
--
-- The cases are chosen so that each one can only pass for the stated reason:
-- a cooldown test that only ever checks "refused" would pass against a
-- function that refuses everything, so every wait is tested on BOTH sides of
-- its boundary.
set search_path = public;

DO $p$
DECLARE
  v_out text := '';
  v_p   uuid;
  v_a   uuid;
  v_r   jsonb;
  v_e   text;
BEGIN
  SELECT id INTO v_p FROM public.profiles LIMIT 1;
  IF v_p IS NULL THEN
    RAISE EXCEPTION 'CX27_NO_SUBJECT: no profile exists, so an attempt cannot be written and the test would have nothing to count.';
  END IF;

  -- (1) Nothing yet: permitted.
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S1');
  v_out := v_out || 'noHistory='
        || CASE WHEN (v_r ->> 'permitted')::boolean THEN 'PERMITTED' ELSE (v_r ->> 'refusal_code') END || ' ';

  -- (2) One completed observation, finished a minute ago: seven-day wait.
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, outcome, counted, ended_at)
  VALUES (v_p, 'D1', 'S1', 'completed', true, now() - interval '1 minute');
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S1');
  v_out := v_out || 'afterOne=' || coalesce(v_r ->> 'refusal_code', 'PERMITTED')
        || '/' || coalesce(v_r ->> 'wait_days', '-') || ' ';

  -- (3) The same one, finished eight days ago: the wait has run.
  UPDATE public.t3a_attempt SET ended_at = now() - interval '8 days'
   WHERE participant_id = v_p AND dimension_id = 'D1' AND stage_code = 'S1';
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S1');
  v_out := v_out || 'afterOneEightDays='
        || CASE WHEN (v_r ->> 'permitted')::boolean THEN 'PERMITTED' ELSE (v_r ->> 'refusal_code') END || ' ';

  -- (4) Two completed, latest eight days ago: fourteen-day wait, still in force.
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, outcome, counted, ended_at)
  VALUES (v_p, 'D1', 'S1', 'completed', true, now() - interval '8 days');
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S1');
  v_out := v_out || 'afterTwoEightDays=' || coalesce(v_r ->> 'refusal_code', 'PERMITTED')
        || '/' || coalesce(v_r ->> 'wait_days', '-') || ' ';

  -- (5) Two completed, latest fifteen days ago: the wait has run.
  UPDATE public.t3a_attempt SET ended_at = now() - interval '15 days'
   WHERE participant_id = v_p AND dimension_id = 'D1' AND stage_code = 'S1';
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S1');
  v_out := v_out || 'afterTwoFifteenDays='
        || CASE WHEN (v_r ->> 'permitted')::boolean THEN 'PERMITTED' ELSE (v_r ->> 'refusal_code') END || ' ';

  -- (6) Three completed: the cap, not a cooldown. The CX-27 row for three
  --     carries NULL, and this must NOT read as "no wait".
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, outcome, counted, ended_at)
  VALUES (v_p, 'D1', 'S1', 'completed', true, now() - interval '30 days');
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S1');
  v_out := v_out || 'afterThree=' || coalesce(v_r ->> 'refusal_code', 'PERMITTED') || ' ';

  -- (7) Another Stage is untouched by all of it: the cooldown is per Stage
  --     and dimension, and a guard that refused everywhere would pass (1)-(6).
  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S2');
  v_out := v_out || 'otherStage='
        || CASE WHEN (v_r ->> 'permitted')::boolean THEN 'PERMITTED' ELSE (v_r ->> 'refusal_code') END || ' ';

  -- ---------------------------------------------------------------
  -- CX-28
  -- ---------------------------------------------------------------

  -- (8) A welfare stop: the withdrawal event, no attempt consumed.
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, outcome, counted, ended_at)
  VALUES (v_p, 'D1', 'S3', 'participant_withdrew', false, now())
  RETURNING attempt_id INTO v_a;
  INSERT INTO public.t3a_d1_welfare_withdrawal (attempt_id, stopped_by, stage_code)
  VALUES (v_a, 'mentor', 'S3');

  v_r := public.t3a_d1_next_attempt_permitted(v_p, 'D1', 'S3');
  v_out := v_out || 'afterWelfareStop=' || coalesce(v_r ->> 'refusal_code', 'PERMITTED') || ' ';

  -- (9) The actor is recorded even though the coded outcome says otherwise.
  SELECT w.stopped_by INTO v_e FROM public.t3a_d1_welfare_withdrawal w WHERE w.attempt_id = v_a;
  v_out := v_out || 'actorRecorded=' || v_e || ' codedOutcome='
        || (SELECT outcome FROM public.t3a_attempt WHERE attempt_id = v_a) || ' ';

  -- (10) A welfare row on an attempt that is not the withdrawal event.
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, outcome, counted, ended_at)
  VALUES (v_p, 'D1', 'S4', 'abandoned', false, now())
  RETURNING attempt_id INTO v_a;
  BEGIN
    INSERT INTO public.t3a_d1_welfare_withdrawal (attempt_id, stopped_by, stage_code)
    VALUES (v_a, 'mentor', 'S4');
    v_e := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_e := CASE WHEN SQLERRM LIKE 'WELFARE_STOP_WRONG_EVENT_CLASS%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 50) || ')' END;
  END;
  v_out := v_out || 'wrongEventClass=' || v_e || ' ';

  -- (11) A welfare row on an attempt that DID consume one.
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, outcome, counted, ended_at)
  VALUES (v_p, 'D1', 'S2', 'participant_withdrew', true, now())
  RETURNING attempt_id INTO v_a;
  BEGIN
    INSERT INTO public.t3a_d1_welfare_withdrawal (attempt_id, stopped_by, stage_code)
    VALUES (v_a, 'participant', 'S2');
    v_e := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_e := CASE WHEN SQLERRM LIKE 'WELFARE_STOP_CONSUMED_AN_ATTEMPT%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 50) || ')' END;
  END;
  v_out := v_out || 'consumedAnAttempt=' || v_e || ' ';

  -- (12) CX-28: "No new event class is created." The closed list, read live.
  v_out := v_out || 'outcomeValues='
        || (SELECT count(*)::text FROM regexp_matches(
              (SELECT pg_get_constraintdef(oid) FROM pg_constraint
                WHERE conrelid = 'public.t3a_attempt'::regclass
                  AND conname = 't3a_attempt_outcome_check'), '''[a-z_]+''', 'g'));

  RAISE EXCEPTION 'CX2728_RESULT %', v_out;
END;
$p$;
