-- Day 1 step 11.1.x live writers, first two (CR-068).
-- Two of the nine live D1 pathway functions can produce their canonical event from data they already hold. They now emit through
-- t3a_emit_event (strict payload, hash chain, idempotency) instead of inserting into the event log:
--   t3a_create_observation_path_gateway  -> observation.path_opened
--   t3a_record_progression_decision      -> observation.progression_recorded
-- The progression function also stops storing free text. A progression decision takes a controlled rationale code (DT-20); no code list is
-- loaded, so the code is optional and the capture state is not_authored. The old p_rationale parameter stays so a caller that still sends
-- it gets a clear refusal rather than a missing function. The mentor screen is changed in the same release.
-- The other seven writers cannot yet supply the canonical payload (CR-068) and stay on the tolerant path.

CREATE OR REPLACE FUNCTION public.t3a_create_observation_path_gateway(p_session_identity_method text, p_observation_consent_version text, p_assistance_rules_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participant uuid := auth.uid();
  v_id uuid;
BEGIN
  -- §13 authority: participant on their own action.
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createObservationPathGateway',
      'no auth.uid(): unauthenticated caller cannot open a gateway');
  END IF;

  -- §21.1 precondition: registration identity must exist.
  IF NOT EXISTS (
    SELECT 1 FROM t3a_identity_assurance
      WHERE participant_id = v_participant
  ) THEN
    PERFORM t3a_raise('§14.2 identity assurance',
      'registration identity not established for participant; open a gateway is refused');
  END IF;

  -- §21.1 precondition: observation-consent must be granted and current.
  IF NOT EXISTS (
    SELECT 1 FROM t3a_consent_state
      WHERE participant_id = v_participant
        AND consent_type = 'mentor_observation'
        AND consent_status = 'granted'
  ) THEN
    PERFORM t3a_raise('§21.1 consent',
      'mentor_observation consent not granted; gateway refused');
  END IF;

  IF p_session_identity_method IS NULL OR btrim(p_session_identity_method) = '' THEN
    PERFORM t3a_raise('§14.2', 'session_identity_method required');
  END IF;
  IF p_observation_consent_version IS NULL OR btrim(p_observation_consent_version) = '' THEN
    PERFORM t3a_raise('§21.2', 'observation_consent_version required');
  END IF;
  IF p_assistance_rules_version IS NULL OR btrim(p_assistance_rules_version) = '' THEN
    PERFORM t3a_raise('§21.2', 'assistance_rules_version required');
  END IF;

  INSERT INTO t3a_observation_path_gateway (
    participant_id, session_identity_method,
    observation_consent_version, assistance_rules_version,
    coaching_terminated_at
  ) VALUES (
    v_participant, p_session_identity_method,
    p_observation_consent_version, p_assistance_rules_version,
    now()
  ) RETURNING observation_path_gateway_id INTO v_id;

  -- Canonical event (observation.path_opened). The emit raises if the event is refused, so the gateway is not left without its event (12.1.6).
  PERFORM public.t3a_emit_event(
    'observation.path_opened', 'PARTICIPANT', v_participant::text, 'participant',
    'observation', v_id,
    jsonb_build_object(
      'observation_path_gateway_id', v_id,
      'gateway_opened_at', to_jsonb(now()),
      'coaching_terminated_at', to_jsonb(now())
    ),
    'path_opened:' || v_id::text, NULL, v_participant);

  RETURN v_id;
END;
$function$
;

DROP FUNCTION IF EXISTS public.t3a_record_progression_decision(uuid, t3a_dimension_code, t3a_progression_decision, text);
CREATE OR REPLACE FUNCTION public.t3a_record_progression_decision(p_stage_instance_id uuid, p_dimension_id t3a_dimension_code, p_decision t3a_progression_decision, p_rationale text DEFAULT NULL, p_rationale_code text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_stage t3a_stage_code;
  v_participant uuid;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 recordProgressionDecision',
      'authorized mentor role required');
  END IF;
  -- DT-20: a rationale is a controlled code, never free text. No code list is loaded yet, so the code is optional and its capture state is
  -- not_authored (package 2.5.25); the route stays open without it.
  IF p_rationale IS NOT NULL AND length(btrim(p_rationale)) > 0 THEN
    PERFORM t3a_raise('DT-20 FREE_TEXT_REFUSED',
      'a progression decision takes a controlled rationale code, not free text');
  END IF;
  IF p_rationale_code IS NOT NULL AND p_rationale_code !~ '^[A-Za-z0-9_.:-]{1,64}$' THEN
    PERFORM t3a_raise('DT-20 FREE_TEXT_REFUSED', 'rationale code must be a code');
  END IF;

  SELECT stage_code, participant_id
    INTO v_stage, v_participant
    FROM t3a_stage_instance
    WHERE stage_instance_id = p_stage_instance_id;

  IF v_stage IS NULL THEN
    PERFORM t3a_raise('§13', 'stage_instance not found');
  END IF;

  -- AC-59: cannot record a progression decision for an S1 instance
  -- that has not been confirmed.
  IF v_stage = 'S1' AND NOT EXISTS (
    SELECT 1 FROM t3a_mentor_judgment
      WHERE stage_instance_id = p_stage_instance_id
        AND human_confirmation_actor_id IS NOT NULL
  ) THEN
    PERFORM t3a_raise('AC-59',
      'S1 instance has no confirmation; progression decision refused');
  END IF;

  INSERT INTO t3a_mentor_judgment (
    stage_instance_id,
    progression_decision, progression_dimension_id
  ) VALUES (
    p_stage_instance_id,
    p_decision, p_dimension_id
  ) RETURNING mentor_judgment_id INTO v_id;

  -- Redirect holds the next Stage; Pause suspends observation on the
  -- dimension.  State transitions per §11.
  IF p_decision = 'redirect' THEN
    UPDATE t3a_stage_instance
       SET state = 'redirected'
     WHERE stage_instance_id = p_stage_instance_id;
  ELSIF p_decision = 'pause' THEN
    UPDATE t3a_stage_instance
       SET state = 'paused'
     WHERE stage_instance_id = p_stage_instance_id;
  ELSIF p_decision = 'proceed' THEN
    UPDATE t3a_stage_instance
       SET state = 'completed', completed_at = now()
     WHERE stage_instance_id = p_stage_instance_id
       AND state IN ('active', 'scheduled', 'eligible');
  END IF;

  -- Canonical event (observation.progression_recorded).
  PERFORM public.t3a_emit_event(
    'observation.progression_recorded', 'MENTOR', v_actor::text, 'mentor',
    'observation', p_stage_instance_id,
    jsonb_build_object(
      'progression_decision_id', v_id,
      'decision', p_decision,
      'decided_by', v_actor,
      'decided_at', to_jsonb(now())
    ) || CASE WHEN p_rationale_code IS NOT NULL THEN jsonb_build_object('decision_rationale_code', p_rationale_code) ELSE '{}'::jsonb END,
    'progression:' || v_id::text, NULL, v_participant);

  RETURN v_id;
END;
$function$
;
