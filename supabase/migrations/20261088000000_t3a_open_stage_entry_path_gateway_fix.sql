-- t3a_open_stage_entry: fix long-standing schema drift against the new
-- observation-path-gateway tables.
--
-- Pre-fix state: the function inserted into t3a_observation_gateway
-- (legacy table) and referenced t3a_stage_entry_event.observation_gateway_id,
-- but t3a_stage_entry_event has observation_path_gateway_id and FKs to
-- t3a_observation_path_gateway. The function therefore raised
--   ERROR: column "observation_gateway_id" of relation "t3a_stage_entry_event"
--          does not exist
-- on every call. No real call site was reaching S1/S2 Stage entry.
--
-- This migration rewrites the function body to:
--   1. Create (or reuse) a t3a_stage_instance row for (participant, dimension,
--      stage) at attempt_no 1.
--   2. Insert a t3a_observation_path_gateway row with the fields the current
--      schema requires: session_identity_method, observation_consent_version,
--      assistance_rules_version, coaching_terminated_at. Defaults match the
--      pilot_active ATTESTATION_ONLY policy wired in migration 20261087; a
--      future PR can parameterize these when the pre-session screen (CX-31)
--      exists to collect them from the participant.
--   3. Insert the t3a_stage_entry_event with the correct FK column
--      (observation_path_gateway_id) and the NOT-NULL columns the current
--      schema requires: stage_instance_id, dimensions_in_play (as the enum
--      array), session_identity, assistance_rules_version.
--   4. Keep the attempt row insert against t3a_attempt unchanged.
--
-- The signature is unchanged — callers do not need to be rewritten. The
-- guards (S4 disabled, env capability, identity assurance, cooldown,
-- source servability) are all preserved verbatim; this is a bug fix, NOT
-- a doctrine change.

CREATE OR REPLACE FUNCTION public.t3a_open_stage_entry(
  p_participant uuid,
  p_dimension text,
  p_stage t3a_stage_code,
  p_source_version_id uuid DEFAULT NULL::uuid,
  p_randomization_seed bigint DEFAULT NULL::bigint,
  p_presentation_variant_seed bigint DEFAULT NULL::bigint
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_identity text := public.t3a_registration_identity_policy();
  v_cooldown text;
  v_stage_instance uuid;
  v_gateway uuid;
  v_stage_entry uuid;
BEGIN
  IF p_participant IS NULL OR p_dimension IS NULL OR p_stage IS NULL THEN
    RAISE EXCEPTION 'STAGE_ENTRY_MISSING_ARGS';
  END IF;

  -- FD-D1-09 fail-closed interim + Stage 4 block.
  IF p_stage = 'S4' THEN
    RAISE EXCEPTION 'STAGE_4_DISABLED_REC12: Stage 4 serving is not available until REC-12 is approved';
  END IF;

  -- Environment gate.
  IF v_env = 'design_only' OR v_env = 'observation_capable_inactive' THEN
    RAISE EXCEPTION 'ENV_CAPABILITY: environment (%) does not accept real Stage entry', v_env;
  END IF;

  -- Identity assurance.
  IF v_env IN ('pilot_active','production_active') AND v_identity <> 'AVAILABLE' THEN
    RAISE EXCEPTION 'IDENTITY_ASSURANCE_REQUIRED: real Stage entry cannot proceed';
  END IF;

  -- Attempt / cooldown.
  v_cooldown := public.t3a_cooldown_status(p_participant, p_dimension, p_stage);
  IF v_cooldown = 'ATTEMPTS_EXCEEDED' THEN
    RAISE EXCEPTION 'ATTEMPTS_EXCEEDED';
  ELSIF v_cooldown LIKE 'ON_COOLDOWN%' THEN
    RAISE EXCEPTION 'ON_COOLDOWN: %', v_cooldown;
  END IF;

  -- Source servability.
  IF p_source_version_id IS NOT NULL
     AND NOT public.t3a_content_is_servable(p_source_version_id) THEN
    RAISE EXCEPTION 'CONTENT_INACTIVE_OR_UNAPPROVED';
  END IF;

  -- Stage instance. One per (participant, dimension, stage, attempt).
  SELECT stage_instance_id
    INTO v_stage_instance
    FROM public.t3a_stage_instance
   WHERE participant_id = p_participant
     AND dimension_id   = p_dimension::public.t3a_dimension_code
     AND stage_code     = p_stage
     AND state IN ('eligible','scheduled','active')
   ORDER BY attempt_no DESC
   LIMIT 1;

  IF v_stage_instance IS NULL THEN
    INSERT INTO public.t3a_stage_instance (
      participant_id, stage_code, dimension_id, attempt_no, state
    ) VALUES (
      p_participant, p_stage, p_dimension::public.t3a_dimension_code, 1, 'active'
    ) RETURNING stage_instance_id INTO v_stage_instance;
  ELSE
    UPDATE public.t3a_stage_instance
       SET state = 'active', activated_at = coalesce(activated_at, now())
     WHERE stage_instance_id = v_stage_instance;
  END IF;

  -- Observation path gateway (one per entry, since there is no uniqueness
  -- constraint on the new schema).
  INSERT INTO public.t3a_observation_path_gateway (
    participant_id, session_identity_method, observation_consent_version,
    assistance_rules_version, coaching_terminated_at
  ) VALUES (
    p_participant, 'participant_self_attestation', 'v1.0', 'v1.0', now()
  ) RETURNING observation_path_gateway_id INTO v_gateway;

  -- Stage entry event.
  INSERT INTO public.t3a_stage_entry_event (
    observation_path_gateway_id, stage_instance_id, stage_code,
    dimensions_in_play, session_identity, assistance_rules_version,
    participant_id, dimension_id, source_version_id,
    randomization_seed, presentation_variant_seed,
    env_state_at_entry, session_identity_receipt_id
  ) VALUES (
    v_gateway, v_stage_instance, p_stage,
    ARRAY[p_dimension::public.t3a_dimension_code],
    'participant_self_attestation', 'v1.0',
    p_participant, p_dimension, p_source_version_id,
    coalesce(p_randomization_seed, (extract(epoch from clock_timestamp())*1000)::bigint),
    coalesce(p_presentation_variant_seed, (extract(epoch from clock_timestamp())*997)::bigint),
    v_env, 'stub-receipt'
  ) RETURNING stage_entry_event_id INTO v_stage_entry;

  -- Attempt row.
  INSERT INTO public.t3a_attempt (
    participant_id, dimension_id, stage_code, stage_entry_event_id
  ) VALUES (
    p_participant, p_dimension, p_stage, v_stage_entry
  );

  RETURN v_stage_entry;
END
$function$;
