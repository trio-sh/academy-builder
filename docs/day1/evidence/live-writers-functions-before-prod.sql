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

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id, subject_id,
    resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'observation_path_gateway_opened', 'PARTICIPANT', 'PARTICIPANT',
    v_participant, v_participant, 'observation_path_gateway', v_id,
    jsonb_build_object(
      'observation_consent_version', p_observation_consent_version,
      'assistance_rules_version', p_assistance_rules_version
    ),
    encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_record_progression_decision(p_stage_instance_id uuid, p_dimension_id t3a_dimension_code, p_decision t3a_progression_decision, p_rationale text)
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
  IF p_rationale IS NULL OR length(btrim(p_rationale)) < 20 THEN
    PERFORM t3a_raise('§21.4',
      'decision_rationale is required and minimum two sentences');
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
    progression_decision, progression_dimension_id, decision_rationale
  ) VALUES (
    p_stage_instance_id,
    p_decision, p_dimension_id, p_rationale
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

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'progression_decision_recorded', 'MENTOR', 'MENTOR', v_actor,
    v_participant, 'stage_instance', p_stage_instance_id,
    jsonb_build_object(
      'decision', p_decision,
      'dimension_id', p_dimension_id,
      'stage_code', v_stage
    ),
    encode(digest(v_id::text || p_stage_instance_id::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$function$

