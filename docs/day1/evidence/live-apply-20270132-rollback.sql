-- Generated rollback. Run in one transaction.
begin;
set local search_path to public, extensions;
CREATE OR REPLACE FUNCTION public.t3a_d1_can_issue(p_ber_report_id uuid)
 RETURNS t3a_d1_issuance_refusal_reason
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_report public.t3a_d1_ber_report%rowtype;
  v_floor public.t3a_d1_issuance_floor_config%rowtype;
  v_review public.t3a_d1_participant_review_action%rowtype;
  v_open_challenges int;
  v_committed int;
  v_distinct_observers int;
  v_distinct_stages int;
BEGIN
  IF v_env IN ('design_only','observation_capable_inactive') THEN
    RETURN 'ENV_CAPABILITY';
  END IF;

  SELECT * INTO v_report FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'BER_REPORT_NOT_FOUND', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_floor FROM public.t3a_d1_issuance_floor_config WHERE singleton = 1;
  IF v_floor.status = 'not_approved' THEN
    RETURN 'ISSUANCE_FLOOR_NOT_APPROVED';
  END IF;

  SELECT
    count(*),
    count(DISTINCT o.observer_id),
    count(DISTINCT o.stage_code)
  INTO v_committed, v_distinct_observers, v_distinct_stages
  FROM public.t3a_observation_record o
  JOIN public.t3a_d1_composed_statement cs USING (observation_record_id)
  WHERE o.participant_id = v_report.participant_id
    AND o.dimension_id = v_report.dimension_id
    AND o.is_committed = true;

  IF (v_floor.minimum_committed_observations IS NOT NULL AND v_committed < v_floor.minimum_committed_observations)
     OR (v_floor.minimum_distinct_observers IS NOT NULL AND v_distinct_observers < v_floor.minimum_distinct_observers)
     OR (v_floor.minimum_distinct_stages IS NOT NULL AND v_distinct_stages < v_floor.minimum_distinct_stages) THEN
    RETURN 'ISSUANCE_FLOOR_NOT_MET';
  END IF;

  SELECT count(*) INTO v_open_challenges
    FROM public.t3a_correction_case c
   WHERE c.participant_id = v_report.participant_id
     AND c.terminal_outcome IS NULL;
  IF v_open_challenges > 0 THEN
    RETURN 'CHALLENGE_OPEN';
  END IF;

  SELECT * INTO v_review
    FROM public.t3a_d1_participant_review_action
   WHERE ber_report_id = p_ber_report_id;
  IF NOT FOUND THEN
    -- INS-006 096: non-response BLOCKS ISSUANCE while FD-D1-11 is unset.
    RETURN 'NON_RESPONSE_BLOCKS_ISSUANCE';
  END IF;

  -- FD-D1-04: production evidence-review authority is UNSET. No
  -- interim exists. Every real-path issuance call refuses until this
  -- lands.
  RETURN 'EVIDENCE_REVIEW_AUTHORITY_UNSET';
END $function$;
revoke all on function t3a_d1_can_issue(uuid) from public, anon, authenticated, service_role;
grant execute on function t3a_d1_can_issue(uuid) to public;
grant execute on function t3a_d1_can_issue(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.t3a_d1_issue_report(p_ber_report_id uuid, p_rendered_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_reason public.t3a_d1_issuance_refusal_reason;
  v_report public.t3a_d1_ber_report%rowtype;
  v_hash text;
  v_issuance_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  IF p_rendered_body IS NULL OR btrim(p_rendered_body) = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'RENDERED_BODY_REQUIRED', ERRCODE = '22023';
  END IF;

  v_reason := public.t3a_d1_can_issue(p_ber_report_id);
  IF v_reason IS NOT NULL THEN
    INSERT INTO public.t3a_d1_report_refusal_log(
      participant_id, dimension_id, requested_template_id, reason, detail
    )
    SELECT participant_id, dimension_id, NULL, v_reason::text::public.t3a_d1_report_refusal_reason, 'issuance refused'
      FROM public.t3a_d1_ber_report
     WHERE ber_report_id = p_ber_report_id;
    RAISE EXCEPTION USING MESSAGE = 'ISSUANCE_REFUSED: ' || v_reason, ERRCODE = '22023';
  END IF;

  -- FD-D1-04 stop: real environments refuse even after every other
  -- gate. Only synthetic_test_only permits an issuance today.
  IF v_env NOT IN ('synthetic_test_only') THEN
    RAISE EXCEPTION USING MESSAGE = 'EVIDENCE_REVIEW_AUTHORITY_UNSET: FD-D1-04 has no interim; issuance is refused', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_report FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  v_hash := encode(extensions.digest(p_rendered_body, 'sha256'), 'hex');

  INSERT INTO public.t3a_d1_report_issuance (
    ber_report_id, participant_id, dimension_id, issued_by,
    version_set_at_issuance, rendered_body_hash
  ) VALUES (
    p_ber_report_id, v_report.participant_id, v_report.dimension_id, auth.uid(),
    v_report.version_set, v_hash
  )
  RETURNING issuance_id INTO v_issuance_id;

  UPDATE public.t3a_d1_ber_report
     SET status = 'issued', issued_at = now()
   WHERE ber_report_id = p_ber_report_id
     AND status = 'ready_to_issue';

  RETURN v_issuance_id;
END $function$;
revoke all on function t3a_d1_issue_report(uuid,text) from public, anon, authenticated, service_role;
grant execute on function t3a_d1_issue_report(uuid,text) to service_role;
drop table if exists public."t3a_d1_evidence_review_authority_event" cascade;
drop function if exists t3a_d1_holds_review_authority(uuid) cascade;
drop function if exists t3a_d1_review_authority_record(uuid,text,text) cascade;
commit;
