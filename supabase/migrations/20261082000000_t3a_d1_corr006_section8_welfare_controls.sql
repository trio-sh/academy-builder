-- =====================================================================
-- CORR-006 Section 8 — CX-30(a) and (b): the two controls, server-side
--
-- (a) Stop for welfare, at Stages 2 and 4, available at every beat. Ends the
--     session without commit and records the event under CX-28.
-- (b) Withhold for welfare, at Stage 1 confirmation and Stage 3 review.
--     Records no determination, withholds under CX-28 and CX-29, and cannot
--     be undone by the confirmer.
--
-- ---------------------------------------------------------------------
-- THE THING FOUND WHILE BUILDING THESE, WHICH MATTERS MORE THAN EITHER.
--
-- t3a_d1_s2_session_event carries a free-text `reason`, and the existing
-- route t3a_d1_live_session_report(stage_entry_event_id, event_kind,
-- beat_code, NARRATIVE) writes it. So a mentor stopping a session because a
-- participant disclosed self-harm could type what was said into the session
-- log — a table keyed to the stage instance, sitting beside the evidence.
--
-- Annex C5e: "Nothing is recorded, and the mentor makes no notes of the
-- disclosure beyond the safety event record." C2: "A disclosure is never
-- evidence." C.7 records no disclosure content anywhere, on purpose.
--
-- Two things follow, and both are built here.
--
--   The welfare stop route takes NO narrative parameter at all. There is
--   nowhere for a caller to put one. It writes a controlled reason token.
--
--   Once a welfare withholding exists on a stage instance, any further
--   session event on it must carry no free-text reason. That closes the
--   route where it would actually be used: a mentor stops the session, then
--   writes up what happened a moment later in the same log.
--
-- The existing route is NOT removed and its narrative is NOT taken away —
-- a pause or an interruption has legitimate reasons to record, and removing
-- a field used for those to prevent a misuse of it would break working
-- behavior. The guard is scoped to the case that is dangerous.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. C5e — no notes of the disclosure in the session log
-- ---------------------------------------------------------------------

-- The one reason token a welfare stop writes. Held as a constant so the
-- guard below and the route agree by construction.
CREATE OR REPLACE FUNCTION public.t3a_d1_welfare_stop_reason_token()
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT 'STOPPED_FOR_WELFARE_UNDER_CX30A';
$fn$;

COMMENT ON FUNCTION public.t3a_d1_welfare_stop_reason_token() IS
  'The ONLY reason text a welfare stop writes to the session log. A token, not a sentence: C5e forbids notes of the disclosure beyond the safety event record, and the safety event record holds no disclosure content either.';

CREATE OR REPLACE FUNCTION public.t3a_d1_session_event_no_welfare_narrative()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_withheld boolean;
BEGIN
  IF coalesce(btrim(NEW.reason), '') = ''
     OR NEW.reason = public.t3a_d1_welfare_stop_reason_token() THEN
    RETURN NEW;
  END IF;

  SELECT public.t3a_d1_withheld_for_welfare(NEW.stage_instance_id) INTO v_withheld;

  IF v_withheld THEN
    RAISE EXCEPTION 'SESSION_EVENT_CARRIES_A_WELFARE_NARRATIVE: this session was stopped for welfare, and C5e allows no notes of the disclosure beyond the safety event record — which records that an event occurred, not what was said. Record the safety event; do not write it here.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_session_event_no_welfare_narrative() IS
  'C5e and C2. Once a stage instance is withheld for welfare, a further session event on it may carry no free-text reason. Scoped to that case deliberately: a pause or an interruption has legitimate reasons to record, and removing the field to prevent one misuse of it would break behavior that works. It closes the route where it would actually be used — a mentor stops the session, then writes up what happened in the same log a moment later.';

DROP TRIGGER IF EXISTS t3a_d1_s2_session_event_no_welfare_narrative_trg
  ON public.t3a_d1_s2_session_event;
CREATE TRIGGER t3a_d1_s2_session_event_no_welfare_narrative_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_s2_session_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_session_event_no_welfare_narrative();

-- ---------------------------------------------------------------------
-- 2. CX-30(a) — Stop for welfare
--
-- One transaction: the session ends without commit, the attempt is the CX-28
-- withdrawal consuming nothing, the observation is withheld under CX-29, and
-- the safety event is opened. Either all of that happens or none of it does.
-- A stop that ended the session but failed to open the safety event would be
-- the worst of the possible partial outcomes.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_stop_for_welfare(
  p_stage_entry_event_id uuid,
  p_beat_code            text,
  p_concerns_person      uuid,
  p_signposted           boolean DEFAULT true,
  p_emergency_services_contacted boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_e         public.t3a_stage_entry_event;
  v_actor     uuid := auth.uid();
  v_attempt   uuid;
  v_event     uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'NO_ACTOR_IDENTIFIED');
  END IF;

  SELECT * INTO v_e FROM public.t3a_stage_entry_event
   WHERE stage_entry_event_id = p_stage_entry_event_id;

  IF v_e.stage_entry_event_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'STAGE_ENTRY_NOT_FOUND');
  END IF;

  -- WHO MAY STOP WHAT, AND WHY THIS IS NOT JUST CX-30(a)'s LIST.
  --
  -- CX-30(a) is the MENTOR'S control, in the Cockpit, at Stages 2 and 4 —
  -- the Stages where someone is watching live. My first draft refused every
  -- other case, and the proof's stopAtS1 line showed what that meant: a
  -- Stage 1 participant could not stop their own session.
  --
  -- That is wrong, and two things say so. Annex A's opening TELLS the
  -- participant "use Stop at the top of the screen", in the words they read
  -- before they begin. C4b says "Stop is always available, and is recorded
  -- under CX-28" — and C4b is the Stage 1 and 3 rule. A control the
  -- participant is promised and cannot use is worse than one never offered.
  --
  -- So: a MENTOR stops at Stages 2 and 4 (CX-30a). A PARTICIPANT stops their
  -- own session at any Stage (C1, C4b). Nobody stops anyone else's Stage 1 or
  -- 3 session through here — there is no mentor present to do it, and the
  -- confirmer's control is Withhold under CX-30(b).
  IF v_e.participant_id IS DISTINCT FROM v_actor
     AND v_e.stage_code NOT IN ('S2', 'S4') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'ONLY_THE_PARTICIPANT_STOPS_A_STAGE_1_OR_3_SESSION',
      'remedy', 'Nobody is watching live at Stages 1 and 3, so there is no mentor to stop the session. The participant may stop their own; a confirmer meeting a disclosure uses Withhold for welfare under CX-30(b).');
  END IF;

  -- AX-08's rule, applied here: the actor must be the assigned mentor.
  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id)
     AND v_e.participant_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NOT_THIS_SESSIONS_MENTOR_OR_PARTICIPANT',
      'remedy', 'C1: a session may be stopped by the participant or by the mentor. Nobody else.');
  END IF;

  IF public.t3a_d1_withheld_for_welfare(v_e.stage_instance_id) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'ALREADY_STOPPED_FOR_WELFARE',
      'remedy', 'C5b: the observation is not resumed, and it is not stopped twice.');
  END IF;

  -- (i) The session ends without commit. No narrative: there is no parameter
  -- for one, and the reason is a controlled token.
  INSERT INTO public.t3a_d1_s2_session_event
    (stage_instance_id, event_kind, beat_code, reason, recorded_by)
  VALUES (v_e.stage_instance_id, 'ended_without_commit'::public.t3a_d1_s2_session_event_kind,
          p_beat_code, public.t3a_d1_welfare_stop_reason_token(), v_actor);

  -- (ii) CX-28. The withdrawal event, consuming no attempt.
  INSERT INTO public.t3a_attempt
    (participant_id, dimension_id, stage_code, stage_entry_event_id, outcome, counted, ended_at)
  VALUES (v_e.participant_id, v_e.dimension_id, v_e.stage_code, p_stage_entry_event_id,
          'participant_withdrew', false, now())
  RETURNING attempt_id INTO v_attempt;

  INSERT INTO public.t3a_d1_welfare_withdrawal
    (attempt_id, stopped_by, stopped_by_actor, stage_code)
  VALUES (v_attempt,
          CASE WHEN v_e.participant_id = v_actor THEN 'participant' ELSE 'mentor' END,
          v_actor, v_e.stage_code);

  -- (iii) CX-30(c). The safety event. Opened by the control, as CX-30 says.
  INSERT INTO public.t3a_safety_event
    (occurred_at, stage_code, source_version_id, acted_by, acted_as,
     stopped, signposted, escalated_to_safety_contact, escalated_at,
     emergency_services_contacted, concerns_person)
  VALUES (now(), v_e.stage_code, v_e.source_version_id, v_actor,
          CASE WHEN v_e.participant_id = v_actor THEN 'participant'
               WHEN v_e.stage_code = 'S4' THEN 'facilitator' ELSE 'mentor' END,
          true, p_signposted, true, now(),
          p_emergency_services_contacted,
          coalesce(p_concerns_person, v_e.participant_id))
  RETURNING safety_event_id INTO v_event;

  -- (iv) CX-29. The observation is withheld.
  INSERT INTO public.t3a_d1_welfare_withholding
    (stage_instance_id, participant_id, dimension_id, stage_code, safety_event_id, withheld_by)
  VALUES (v_e.stage_instance_id, v_e.participant_id, v_e.dimension_id, v_e.stage_code,
          v_event, v_actor);

  RETURN jsonb_build_object('recorded', true,
    'session_ended_without_commit', true,
    'attempt_consumed', false,
    'observation_withheld', true,
    'safety_event_opened', true,
    'escalation_required_today', true,
    'safety_contact', public.t3a_current_safety_contact());
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_stop_for_welfare(uuid, text, uuid, boolean, boolean) IS
  'CX-30(a) and C4b. Stop for welfare: a MENTOR at Stages 2 and 4 at any beat, and a PARTICIPANT at any Stage on their own session — because Annex A''s opening tells the Stage 1 participant to use Stop and C4b says it is always available and recorded under CX-28, so refusing it there would break a promise made in the words they read before they begin. In ONE transaction: the session ends without commit, the CX-28 withdrawal is recorded consuming no attempt, the safety event is opened, and the observation is withheld under CX-29. All or none — a stop that ended the session and failed to open the safety event is the worst partial outcome available. TAKES NO NARRATIVE: C5e allows no notes of the disclosure, so there is nowhere to put one. Returns the Safety Contact state, because C4d and C5d require escalation the same day and the caller needs to know whether there is anyone to escalate to.';

-- ---------------------------------------------------------------------
-- 3. CX-30(b) — Withhold for welfare
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_withhold_for_welfare(
  p_stage_entry_event_id uuid,
  p_signposted           boolean DEFAULT true,
  p_emergency_services_contacted boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_e       public.t3a_stage_entry_event;
  v_actor   uuid := auth.uid();
  v_attempt uuid;
  v_event   uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'NO_ACTOR_IDENTIFIED');
  END IF;

  IF NOT public.t3a_has_administrative_standing()
     AND NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NOT_A_CONFIRMER_FOR_THIS_OBSERVATION',
      'remedy', 'C4d: the confirmer at Stage 1, or the reviewing mentor at Stage 3.');
  END IF;

  SELECT * INTO v_e FROM public.t3a_stage_entry_event
   WHERE stage_entry_event_id = p_stage_entry_event_id;

  IF v_e.stage_entry_event_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'STAGE_ENTRY_NOT_FOUND');
  END IF;

  -- C4d is the Stage 1 and Stage 3 rule. At Stages 2 and 4 a mentor is
  -- present and the control is Stop (CX-30a), which also ends the session.
  IF v_e.stage_code NOT IN ('S1', 'S3') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'WITHHOLD_IS_A_STAGE_1_AND_3_CONTROL',
      'remedy', 'A mentor is present at Stages 2 and 4. Use Stop for welfare under CX-30(a), which also ends the session.');
  END IF;

  IF public.t3a_d1_withheld_for_welfare(v_e.stage_instance_id) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'ALREADY_WITHHELD',
      'remedy', 'CX-30(b): a withholding cannot be undone, and it is not recorded twice.');
  END IF;

  -- CX-30(b): "records no determination". Nothing in this route writes one,
  -- and the CX-29 triggers refuse one afterwards.
  INSERT INTO public.t3a_attempt
    (participant_id, dimension_id, stage_code, stage_entry_event_id, outcome, counted, ended_at)
  VALUES (v_e.participant_id, v_e.dimension_id, v_e.stage_code, p_stage_entry_event_id,
          'participant_withdrew', false, now())
  RETURNING attempt_id INTO v_attempt;

  INSERT INTO public.t3a_d1_welfare_withdrawal
    (attempt_id, stopped_by, stopped_by_actor, stage_code)
  VALUES (v_attempt, 'confirmer', v_actor, v_e.stage_code);

  INSERT INTO public.t3a_safety_event
    (occurred_at, stage_code, source_version_id, acted_by, acted_as,
     stopped, signposted, escalated_to_safety_contact, escalated_at,
     emergency_services_contacted, concerns_person)
  VALUES (now(), v_e.stage_code, v_e.source_version_id, v_actor, 'confirmer',
          true, p_signposted, true, now(), p_emergency_services_contacted,
          v_e.participant_id)
  RETURNING safety_event_id INTO v_event;

  INSERT INTO public.t3a_d1_welfare_withholding
    (stage_instance_id, participant_id, dimension_id, stage_code, safety_event_id, withheld_by)
  VALUES (v_e.stage_instance_id, v_e.participant_id, v_e.dimension_id, v_e.stage_code,
          v_event, v_actor);

  RETURN jsonb_build_object('recorded', true,
    'determination_recorded', false,
    'attempt_consumed', false,
    'observation_withheld', true,
    'safety_event_opened', true,
    'can_be_undone', false,
    'escalation_required_today', true,
    'safety_contact', public.t3a_current_safety_contact());
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_withhold_for_welfare(uuid, boolean, boolean) IS
  'CX-30(b). Withhold for welfare at Stage 1 confirmation and Stage 3 review. Records NO determination — nothing here writes one, and the CX-29 triggers refuse one afterwards — withholds the observation under CX-28 and CX-29, opens the safety event, and cannot be undone: t3a_d1_welfare_withholding refuses UPDATE and DELETE outright, so there is no route back even for the person who did it. Takes no narrative, for the same reason as CX-30(a).';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_welfare_stop_reason_token(),
  public.t3a_d1_stop_for_welfare(uuid, text, uuid, boolean, boolean),
  public.t3a_d1_withhold_for_welfare(uuid, boolean, boolean)
TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Neither route takes anywhere to write a disclosure, asserted
-- ---------------------------------------------------------------------

DO $verify$
DECLARE v_args text; v_bad text := '';
BEGIN
  FOREACH v_args IN ARRAY ARRAY[
    'public.t3a_d1_stop_for_welfare(uuid,text,uuid,boolean,boolean)',
    'public.t3a_d1_withhold_for_welfare(uuid,boolean,boolean)']
  LOOP
    -- No text parameter other than the beat code. A free-text parameter on a
    -- welfare route is a place for the disclosure to be typed.
    IF (SELECT count(*) FROM unnest(string_to_array(
          pg_get_function_identity_arguments(v_args::regprocedure), ', ')) a
         WHERE a ~ 'text' AND a NOT LIKE '%beat_code%') > 0 THEN
      v_bad := v_bad || v_args || ' ';
    END IF;
  END LOOP;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'WELFARE_ROUTE_TAKES_FREE_TEXT: % — C5e allows no notes of the disclosure, so a welfare route must offer nowhere to write one.', v_bad;
  END IF;

  RAISE NOTICE 'CX-30(a) and (b) built; neither route accepts free text beyond a beat code.';
END;
$verify$;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-30/session-log-was-a-place-to-write-a-disclosure',
   'CORR-006 Section 8, found while building the Stop control',
   'Where a mentor could record what a participant disclosed',
   'closed — the route where it would be used is refused; the field itself is kept',
   'closed',
   NULL,
   'THE SESSION LOG TAKES FREE TEXT. t3a_d1_s2_session_event carries a `reason`, and the existing '
   || 'route t3a_d1_live_session_report(stage_entry_event_id, event_kind, beat_code, NARRATIVE) writes '
   || 'it. So a mentor stopping a session because a participant disclosed self-harm could type what '
   || 'was said into the session log — a table keyed to the stage instance, sitting beside the '
   || 'evidence, readable by anyone who can read the session. '
   || 'THAT IS WHAT C5e FORBIDS: "Nothing is recorded, and the mentor makes no notes of the disclosure '
   || 'beyond the safety event record." And the safety event record holds no disclosure content '
   || 'either, by design — C.7''s right column, asserted by name in migration 20261081000000. '
   || 'TWO THINGS BUILT. The welfare stop route takes NO narrative parameter: there is nowhere for a '
   || 'caller to put one, it writes a controlled reason token, and the migration asserts that neither '
   || 'welfare route accepts free text beyond a beat code. And once a stage instance is withheld for '
   || 'welfare, any further session event on it is refused if it carries a free-text reason — which '
   || 'closes the route where it would actually be used: the mentor stops the session, then writes up '
   || 'what happened in the same log a moment later. '
   || 'WHAT WAS DELIBERATELY NOT DONE: the `reason` field is not removed and the existing route keeps '
   || 'its narrative. A pause or an interruption has legitimate reasons to record, and taking away a '
   || 'field used for those in order to prevent a misuse of it would break behavior that works. The '
   || 'guard is scoped to the dangerous case.'),

  ('CORR-006/CX-30a/participant-could-not-stop-their-own-stage-1-session',
   'CORR-006 Section 8, found by a proof line that expected a refusal',
   'Who may stop a session, at which Stage',
   'defect in the build''s first draft, corrected before anything shipped',
   'closed',
   NULL,
   'CX-30(a) describes the MENTOR''S control: "Stop for welfare in the Mentor Cockpit, available at '
   || 'every beat at Stages 2 and 4." I built exactly that and refused every other case, which meant '
   || 'A STAGE 1 PARTICIPANT COULD NOT STOP THEIR OWN SESSION. '
   || 'TWO THINGS SAY THAT IS WRONG. Annex A''s opening, which the participant reads before they '
   || 'begin, tells them "use Stop at the top of the screen" and that "stopping does not use up one of '
   || 'your attempts". And C4b — the Stage 1 and 3 rule — says "Stop is always available, and is '
   || 'recorded under CX-28". A control someone is promised in the words they read and then cannot use '
   || 'is worse than one never offered. '
   || 'HOW IT WAS FOUND: the proof asserted stopAtS1 and read '
   || 'STOP_FOR_WELFARE_IS_A_LIVE_SESSION_CONTROL. I had written that line expecting the refusal and '
   || 'treating it as correct scoping. Reading the refusal message back against Annex A''s opening is '
   || 'what showed it was a defect rather than a boundary. '
   || 'CORRECTED: a mentor stops at Stages 2 and 4; a participant stops their own session at any '
   || 'Stage; nobody stops another person''s Stage 1 or 3 session through this route, because no '
   || 'mentor is present at those and the confirmer''s control is Withhold under CX-30(b).')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CX-30AB-WELFARE-CONTROLS', 'T3A-D1-EXEC-CORR-006 Section 8, CX-30(a) and (b)',
   'Stop for welfare and Withhold for welfare do all four things at once, and the session log will not take a disclosure',
   'A real Stage 2 stage-entry event with a real assigned mentor, acting as that mentor; the same '
   || 'participant''s Stage 1 entry, acting first as the mentor and then AS THE PARTICIPANT; and an '
   || 'ordinary session with no withholding, as the control for the C5e guard.',
   'The Stage 2 stop records with attempt_consumed false, observation_withheld true and a safety event '
   || 'opened. A second stop is refused. A free-text reason on the stopped session is refused by name, '
   || 'while the same write on an ordinary session is ACCEPTED. A mentor stopping a Stage 1 session is '
   || 'refused; the participant stopping their own is recorded. Withhold at Stage 2 is refused. A '
   || 'determination after the stop is refused by name.',
   'CX-30', NULL,
   'The C5e control is the point of the fixture: a guard that refused every session reason would pass '
   || 'the welfare line and break every pause.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CX-30AB-WELFARE-CONTROLS', 'pass',
   'scripts/proofs/welfare-controls-proof.sql, self-aborting: stopS2=RECORDED attemptConsumed=false '
   || 'withheld=true safetyEvent=true contactState=SAFETY_CONTACT_NOT_DESIGNATED '
   || 'stopTwice=ALREADY_STOPPED_FOR_WELFARE narrativeAfterStop=REFUSED_BY_NAME '
   || 'narrativeOnOrdinarySession=ACCEPTED '
   || 'mentorStopsS1=ONLY_THE_PARTICIPANT_STOPS_A_STAGE_1_OR_3_SESSION '
   || 'participantStopsOwnS1=RECORDED withholdAtS2=WITHHOLD_IS_A_STAGE_1_AND_3_CONTROL '
   || 'determinationAfterStop=REFUSED_BY_NAME. Nothing committed.',
   '20261082000000', 'Claude Code, automated, non-production environment',
   'THE PROOF FOUND A DEFECT IN MY READING OF CX-30. The first draft refused a stop at any Stage but 2 '
   || 'and 4, because that is what CX-30(a) lists — which meant a Stage 1 PARTICIPANT could not stop '
   || 'their own session, while Annex A''s opening tells them to use Stop and C4b says it is always '
   || 'available. I had written the stopAtS1 assertion EXPECTING the refusal and calling it correct '
   || 'scoping; reading the refusal back against Annex A''s opening is what showed it was a defect. '
   || 'Open-and-closed at CORR-006/CX-30a/participant-could-not-stop-their-own-stage-1-session. '
   || 'contactState=SAFETY_CONTACT_NOT_DESIGNATED is returned by the route on purpose: C4d and C5d '
   || 'require escalation the same day, and the caller needs to know there is currently nobody to '
   || 'escalate to.');
