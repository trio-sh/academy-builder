-- Rollback of 20270233000000_assemble_route_fills_required_fields.sql: the assemble route as it stood before (it wrote a report row without the required fields).
CREATE OR REPLACE FUNCTION public.t3a_d1_assemble_ber_for(p_participant uuid, p_dimension text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor       uuid := auth.uid();
  v_env_mode    text;
  v_committed_n integer;
  v_ber_id      uuid;
  v_checklist   record;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  SELECT count(*) INTO v_committed_n
    FROM public.t3a_observation_record o
    JOIN public.t3a_d1_composed_statement s
      ON s.observation_record_id = o.observation_record_id
   WHERE o.participant_id = p_participant
     AND o.dimension_id   = p_dimension
     AND o.is_committed;

  IF v_committed_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'refusal',
      'NO_COMMITTED_OBSERVATIONS',
      'detail', 'Record at least one committed observation before assembling a BER.');
  END IF;

  SELECT identity_assurance_mode INTO v_env_mode
    FROM public.t3a_env_capability WHERE singleton = 1;

  -- Create or reuse an existing assembling/assembled BER row for this
  -- participant+dimension. Never overwrite an issued one — amend instead.
  SELECT ber_report_id INTO v_ber_id FROM public.t3a_d1_ber_report
   WHERE participant_id = p_participant
     AND dimension_id   = p_dimension
     AND status IN ('participant_review','challenge_open','ready_to_issue')
   LIMIT 1;

  IF v_ber_id IS NULL THEN
    INSERT INTO public.t3a_d1_ber_report (
      participant_id, dimension_id, status, version_set, assembled_at
    ) VALUES (
      p_participant, p_dimension,
      'ready_to_issue',
      jsonb_build_object('question_set_version','v1.0',
                         'assembled_by', v_actor,
                         'assembled_at', now()),
      now()
    ) RETURNING ber_report_id INTO v_ber_id;
  END IF;

  -- Auto-pass the 21 review checklist items in pilot mode. In production
  -- this is replaced by the mentor review UI; a non-pilot caller never
  -- reaches this path because v_env_mode = 'IDV_VERIFIED' would require
  -- an explicit mentor review.
  IF v_env_mode = 'ATTESTATION_ONLY' THEN
    FOR v_checklist IN
      SELECT item_no FROM public.t3a_d1_review_checklist_item
      WHERE item_no NOT IN (
        SELECT item_no FROM public.t3a_d1_review_result
         WHERE ber_report_id = v_ber_id
      )
    LOOP
      INSERT INTO public.t3a_d1_review_result (
        ber_report_id, item_no, outcome, detail,
        reviewed_by, reviewed_at
      ) VALUES (
        v_ber_id, v_checklist.item_no, 'pass',
        'PILOT_AUTO_PASS: identity mode ATTESTATION_ONLY; mentor-attested review UI not yet live.',
        v_actor, now()
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true,
    'ber_report_id', v_ber_id,
    'committed_statements', v_committed_n,
    'review_mode', coalesce(v_env_mode, 'UNAVAILABLE'));
END;
$function$

;
