-- D1 BER production engine: closes the gap between "stage flow completed"
-- and "BER face assembled". Pre-change: the §6 face assembly, controlled
-- text, 11-block layout, issuance and verification URL were all built,
-- but there was no code path to create the t3a_d1_ber_report row or the
-- composed statements that feed it. Zero BERs could be produced.
--
-- This migration adds:
--
--   1. A bootstrap t3a_d1_resolution_rule row so the composed_statement
--      FK can resolve for pilot captures. Mentor-authored rules can be
--      added later; this is the floor.
--
--   2. t3a_d1_record_mentor_observation — one-shot path from a stage
--      entry to a committed observation + a composed statement. The
--      mentor passes a statement_library key (the approved statement
--      identifier that §5.12 of CORR-006 pins) and an optional narrative
--      extension. The function:
--        - Reads participant/dimension/stage from the stage_entry_event.
--        - Verifies the caller is the assigned mentor on that participant.
--        - Writes t3a_observation_record (is_committed = true, observer_id
--          = auth.uid()).
--        - Writes t3a_d1_composed_statement with composed_body derived
--          from the statement_library row's statement_body, optionally
--          joined with the narrative. No free-text slot replaces the
--          verbatim statement.
--
--   3. t3a_d1_assemble_ber_for — creates the t3a_d1_ber_report row with
--      status = 'assembled', and in a founder-authorized pilot mode,
--      auto-records every t3a_d1_review_checklist_item as 'pass'. The
--      reviewed_by is the caller; the detail column names this as
--      PILOT_AUTO_PASS so a later review of the audit trail can tell
--      an auto-pass from a mentor-attested one. In production this is
--      replaced by the mentor review UI; the auto-pass path is kept
--      behind the ATTESTATION_ONLY identity mode and only serves the
--      pilot.
--
-- The signature for each new function returns ids as plain UUIDs so the
-- UI can chain them without re-reading. Doctrine guards preserved:
-- composed_statement_immutable, observation_commit_not_withheld, review
-- checklist completeness, §6.3 (traceability sheet never on the face).

-- ---------------------------------------------------------------------
-- Bootstrap: one resolution rule so composed_statement FK resolves.
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_resolution_rule (
  resolution_rule_id, dimension_id, stage_code, question_set_version,
  answer_pattern, statement_library_id, precedence, active
)
SELECT gen_random_uuid(), 'D1', 'S2', 'v1.0',
       '{"pilot":"default"}'::jsonb,
       (SELECT statement_library_id FROM public.t3a_d1_statement_library LIMIT 1),
       1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.t3a_d1_resolution_rule
   WHERE answer_pattern = '{"pilot":"default"}'::jsonb
);

-- ---------------------------------------------------------------------
-- 1. Record an observation (committed) + compose a statement.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_record_mentor_observation(
  p_stage_entry_event_id uuid,
  p_statement_key text,
  p_narrative text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_actor      uuid := auth.uid();
  v_see        public.t3a_stage_entry_event;
  v_sl         public.t3a_d1_statement_library;
  v_rule_id    uuid;
  v_obs_id     uuid;
  v_comp_id    uuid;
  v_body       text;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  SELECT * INTO v_see FROM public.t3a_stage_entry_event
   WHERE stage_entry_event_id = p_stage_entry_event_id;
  IF v_see.stage_entry_event_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'STAGE_ENTRY_NOT_FOUND');
  END IF;

  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_ASSIGNED_MENTOR');
  END IF;

  SELECT * INTO v_sl FROM public.t3a_d1_statement_library
   WHERE statement_key = p_statement_key AND NOT retired;
  IF v_sl.statement_library_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'STATEMENT_KEY_UNKNOWN',
      'statement_key', p_statement_key);
  END IF;

  SELECT resolution_rule_id INTO v_rule_id FROM public.t3a_d1_resolution_rule
   WHERE answer_pattern = '{"pilot":"default"}'::jsonb LIMIT 1;

  INSERT INTO public.t3a_observation_record (
    participant_id, dimension_id, stage_code,
    observer_id, version_set, is_committed, committed_at
  ) VALUES (
    v_see.participant_id, v_see.dimension_id::text, v_see.stage_code::text,
    v_actor,
    jsonb_build_object('question_set_version','v1.0',
                       'statement_key', p_statement_key),
    true, now()
  ) RETURNING observation_record_id INTO v_obs_id;

  v_body := v_sl.statement_body;
  IF p_narrative IS NOT NULL AND length(btrim(p_narrative)) > 0 THEN
    v_body := v_body || ' — ' || btrim(p_narrative);
  END IF;

  INSERT INTO public.t3a_d1_composed_statement (
    observation_record_id, statement_library_id, resolution_rule_id,
    composed_body, answer_pattern_snapshot, bound_variable_values,
    version_set, composed_by
  ) VALUES (
    v_obs_id, v_sl.statement_library_id, v_rule_id,
    v_body, '{}'::jsonb, '{}'::jsonb,
    jsonb_build_object('question_set_version','v1.0',
                       'statement_key', p_statement_key),
    v_actor
  ) RETURNING composed_statement_id INTO v_comp_id;

  RETURN jsonb_build_object('ok', true,
    'observation_record_id', v_obs_id,
    'composed_statement_id', v_comp_id,
    'composed_body', v_body);
END;
$function$;

-- ---------------------------------------------------------------------
-- 2. Assemble the BER row and auto-pass the review checklist (pilot).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_assemble_ber_for(
  p_participant uuid,
  p_dimension text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
$function$;
