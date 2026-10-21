-- Rollback of 20261207000000_step3_source_gateway.sql
drop trigger if exists t3a_0_source_approval_backstop_trg on public.t3a_d1_source_approval;
drop trigger if exists t3a_0_drafting_test_guard_trg on public.t3a_source_drafting_test;
drop function if exists public.t3a_source_serving_gate(uuid, text, uuid);
drop function if exists public.t3a_s4_activation_state();
drop function if exists public.t3a_prior_exposure(uuid, uuid);
drop function if exists public.t3a_pattern_compare(text, text, text, text);
drop function if exists public.t3a_source_approval_backstop();
drop function if exists public.t3a_source_submit_for_approval(uuid);
drop function if exists public.t3a_source_approval_preconditions(uuid);
drop function if exists public.t3a_drafting_test_guard();
drop function if exists public.t3a_administration_form_of(text);
alter table public.t3a_source_authorship disable trigger t3a_append_only;
-- (the tables are append only and empty at rollback time; drop them in dependency order)
drop table if exists public.t3a_source_approval_request, public.t3a_source_rights_record, public.t3a_source_drafting_test, public.t3a_source_authorship, public.t3a_cross_dimension_pattern_map, public.t3a_interaction_pattern_family, public.t3a_administration_form;
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D2';
CREATE OR REPLACE FUNCTION public.t3a_d1_record_source_approval(p_source_id uuid, p_source_version_id uuid, p_status text, p_basis_kind text DEFAULT NULL::text, p_referenced_identifier text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor    uuid := auth.uid();
  v_body     jsonb;
  v_object   uuid;
  v_standing text;
  v_requires boolean;
  v_approval uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NO_APPROVER_IDENTIFIED');
  END IF;

  -- Standing is checked here, not taken from the caller's word for it.
  IF NOT public.t3a_has_administrative_standing() THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'APPROVER_LACKS_STANDING');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'withdrawn') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'STATUS_NOT_IN_CONTROLLED_SET');
  END IF;

  -- CX-18. Checked BEFORE anything is written, so a missing basis is a
  -- named refusal rather than a deferred constraint error at commit.
  IF p_status = 'approved' THEN
    IF coalesce(btrim(p_basis_kind), '') = '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_REQUIRED',
        'remedy', 'An approval records what it rested on. Select one of the three bases at CORR-006 Section 5.2.',
        'closed_list', (SELECT jsonb_agg(jsonb_build_object(
                                 'basis_kind', k.basis_kind,
                                 'records', k.records,
                                 'requires_referenced_identifier', k.requires_referenced_identifier)
                                 ORDER BY k.basis_kind)
                          FROM public.t3a_d1_approval_basis_kind k));
    END IF;

    SELECT k.requires_referenced_identifier INTO v_requires
      FROM public.t3a_d1_approval_basis_kind k
     WHERE k.basis_kind = p_basis_kind;

    IF v_requires IS NULL THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_NOT_IN_CLOSED_LIST',
        'remedy', 'The list of bases is closed. It is widened by an instrument, not by an approver.');
    END IF;

    IF v_requires AND coalesce(btrim(p_referenced_identifier), '') = '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER',
        'remedy', 'That basis records a named document or instrument. Name it.');
    END IF;

    IF NOT v_requires AND coalesce(btrim(p_referenced_identifier), '') <> '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_TAKES_NO_IDENTIFIER',
        'remedy', 'That basis records that the text was read in this screen. It names no document.');
    END IF;
  END IF;

  SELECT body, content_object_id INTO v_body, v_object
    FROM public.t3a_d1_content_version
   WHERE content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- The object and the version must be the same source. Retained
  -- verbatim: this file replaces the route, and a replacement that drops
  -- a check is a regression dressed as a fix.
  IF v_object IS DISTINCT FROM p_source_id THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE');
  END IF;

  -- A superseded version cannot be approved. Approving one would mean a
  -- source served text that a later correction had already replaced.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_content_version
             WHERE content_version_id = p_source_version_id
               AND superseded_by IS NOT NULL) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_SUPERSEDED');
  END IF;

  -- §5.18: an approval names an exact version, and the version must be
  -- able to say which text it is. No hash, no approval.
  IF coalesce(btrim(v_body ->> 'source_version_hash'), '') = ''
     AND p_status = 'approved' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_CARRIES_NO_HASH',
      'remedy', 'An approval names an exact text. Assign the source-version hash before approving it.');
  END IF;

  -- AX-04. Lock before reading standing, on the same key the trigger
  -- uses, so the route and the backstop serialize against each other
  -- rather than each against itself.
  IF p_status = 'approved' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_source_id::text || ':' || p_source_version_id::text, 0));

    -- AX-08. This was an EXISTS on status = 'approved', which refused any
    -- re-approval of a withdrawn version — the same defect as the index,
    -- in the route. It now asks what is STANDING.
    v_standing := public.t3a_d1_version_standing_status(p_source_version_id);

    IF v_standing = 'approved' THEN
      -- AX-03: refused AND logged. This row commits because the function
      -- returns rather than raising.
      INSERT INTO public.t3a_d1_approval_refusal_log
        (source_id, source_version_id, attempted_status, refusal_code,
         standing_at_refusal, attempted_by)
      VALUES (p_source_id, p_source_version_id, p_status,
              'SOURCE_VERSION_ALREADY_APPROVED', v_standing, v_actor);

      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'SOURCE_VERSION_ALREADY_APPROVED',
        'remedy', 'The version holds a standing approval. Record a withdrawal before approving it again; the withdrawal stays in the history.');
    END IF;
  END IF;

  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (p_source_id, p_source_version_id, p_status, v_actor, now())
  RETURNING source_approval_id INTO v_approval;

  -- CX-16's shape, for a live approval: a separate row keyed to the
  -- approval. The approval row itself carries no basis column and gains
  -- none.
  IF p_status = 'approved' THEN
    INSERT INTO public.t3a_d1_approval_basis
      (source_approval_id, basis_kind, referenced_identifier, basis_text,
       basis_entered_on, recorded_under)
    VALUES (v_approval, p_basis_kind, nullif(btrim(p_referenced_identifier), ''),
            NULL, current_date,
            'Selected in the approval screen under CORR-006 Section 5.2, CX-18');
  END IF;

  RETURN jsonb_build_object('recorded', true,
    'status', p_status,
    'approved_by', v_actor,
    'basis_kind', CASE WHEN p_status = 'approved' THEN p_basis_kind END);
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_next_attempt_permitted(p_participant_id uuid, p_dimension_id text, p_stage_code t3a_stage_code)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_completed  int;
  v_last_end   timestamptz;
  v_wait       int;
  v_has_wait   boolean;
  v_available  timestamptz;
  v_welfare    timestamptz;
BEGIN
  SELECT count(*), max(a.ended_at) INTO v_completed, v_last_end
    FROM public.t3a_attempt a
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code
     AND a.outcome = 'completed'
     AND a.counted;

  -- AC-B1: the attempt cap of three. Read from CX-27's own table: the row
  -- for three completed observations carries no wait BECAUSE there is no
  -- fourth attempt, and reading its NULL as "no wait" is the mistake this
  -- guards against.
  IF v_completed >= 3 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'ATTEMPT_CAP_REACHED',
      'completed_observations', v_completed,
      'remedy', 'CX-27: there is no cooldown after the third completed observation because there is no fourth attempt.');
  END IF;

  IF v_completed >= 1 THEN
    SELECT c.wait_days, (c.wait_days IS NOT NULL) INTO v_wait, v_has_wait
      FROM public.t3a_d1_specification_cooldown c
     WHERE c.completed_observations = v_completed;

    IF NOT coalesce(v_has_wait, false) THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'NO_COOLDOWN_ISSUED_FOR_THIS_COUNT',
        'completed_observations', v_completed,
        'remedy', 'CX-27 issues a wait for one and two completed observations. A count with no issued wait is held rather than allowed through.');
    END IF;

    IF v_last_end IS NULL THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'COMPLETED_ATTEMPT_HAS_NO_END_TIME',
        'remedy', 'The cooldown counts from the end of the completed observation. Without that instant there is nothing to count from, and guessing one would shorten a wait.');
    END IF;

    v_available := v_last_end + make_interval(days => v_wait);
    IF now() < v_available THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'SPECIFICATION_COOLDOWN_IN_FORCE',
        'completed_observations', v_completed,
        'wait_days', v_wait,
        'available_from', v_available);
    END IF;
  END IF;

  -- CX-28. A welfare stop consumes no attempt, so none of the above sees it,
  -- and "the rescheduling cooldown applies" — whose duration this instrument
  -- does not give. Held rather than guessed.
  SELECT max(w.recorded_at) INTO v_welfare
    FROM public.t3a_d1_welfare_withdrawal w
    JOIN public.t3a_attempt a ON a.attempt_id = w.attempt_id
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code;

  IF v_welfare IS NOT NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED',
      'welfare_stop_at', v_welfare,
      'remedy', 'CX-28 says a welfare stop consumes no attempt and that the rescheduling cooldown applies. Its duration is named nowhere in this instrument, so the build does not supply one. The participant is held until the founder issues it — which is also the protective reading, because the point of a wait after distress is not to be re-observed straight away.');
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'completed_observations', v_completed);
END;
$function$;
