CREATE OR REPLACE FUNCTION public.t3a_commit_observation(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_stage text := p->>'stage_code'; v_sv uuid := nullif(p->>'source_version_id','')::uuid; v_served uuid := nullif(p->>'served_instance_id','')::uuid;
  v_src_hash text; v_ren_hash text; v_row public.t3a_observation; v_cols text; v_subject text := coalesce(p->>'participant_id', '');
begin
  if v_stage = 'S1' and nullif(p->>'observer_id','') is not null then
    return public.t3a_capture_refuse('observation.commit', 'OBSERVER_NOT_ALLOWED_AT_S1', v_subject, 'S1 records carry confirmer fields, not observer_id');
  end if;
  if v_stage in ('S2', 'S4') and nullif(p->>'observer_id','') is null then
    return public.t3a_capture_refuse('observation.commit', 'OBSERVER_REQUIRED', v_subject, v_stage || ' records need observer_id');
  end if;
  select source_version_hash into v_src_hash from public.t3a_source_version where source_version_id = v_sv;
  select r.rendered_instance_hash into v_ren_hash from public.t3a_served_instance s join public.t3a_rendered_instance r on r.rendered_instance_id = s.rendered_instance_id where s.served_instance_id = v_served;
  if v_src_hash is null or v_ren_hash is null then
    return public.t3a_capture_refuse('observation.commit', 'DUAL_HASH_MISSING', v_subject, 'both the source version hash and the rendered instance hash are required');
  end if;
  -- Only the columns the caller named are inserted, so column defaults (created_at, ids) still apply.
  select string_agg(format('%I', a.attname), ', ') into v_cols from pg_attribute a
   where a.attrelid = 'public.t3a_observation'::regclass and a.attnum > 0 and not a.attisdropped and p ? a.attname::text;
  execute format('insert into public.t3a_observation (%1$s) select %1$s from jsonb_populate_record(null::public.t3a_observation, $1) returning *', v_cols) into v_row using p;
  return jsonb_build_object('outcome', 'committed', 'observation_id', v_row.observation_id, 'source_version_hash', v_src_hash, 'rendered_instance_hash', v_ren_hash);
end $function$


CREATE OR REPLACE FUNCTION public.t3a_commit_observation(p_participant_id uuid, p_stage_instance_id uuid, p_source_version_id uuid, p_dimension_id t3a_dimension_code, p_stage_code t3a_stage_code, p_attempt_no integer, p_determination_answers jsonb, p_relevance_basis jsonb, p_evidence_class t3a_evidence_class, p_administration_conditions jsonb DEFAULT '{}'::jsonb, p_administration_variance jsonb DEFAULT '{}'::jsonb, p_accommodation_class t3a_accommodation_class DEFAULT NULL::t3a_accommodation_class, p_descriptor_version text DEFAULT ''::text, p_ordinal_anchor integer DEFAULT NULL::integer, p_evidence_notes text DEFAULT NULL::text, p_contemporaneity t3a_contemporaneity DEFAULT 'contemporaneous'::t3a_contemporaneity, p_late_entry_delay_seconds integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_authorization_snapshot jsonb;
  v_composed_id uuid;
  v_statement_id uuid;
  v_source_class t3a_scenario_class;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 commitObservation',
      'authorized mentor role required (AC-11: AI layer cannot commit)');
  END IF;
  IF p_stage_code = 'S1' THEN
    PERFORM t3a_raise('§13 commitObservation',
      'S1 goes through t3a_confirm_s1_observation, not commitObservation');
  END IF;

  -- §12.1 #5: observer authorization must be current AT the observation
  -- date.  Snapshot it now — a later lookup cannot recover the state.
  SELECT jsonb_build_object(
    'mentor_authorization_id', mentor_authorization_id,
    'calibration_status', calibration_status,
    'reference_set_version', reference_set_version,
    'as_at', now()
  ) INTO v_authorization_snapshot
  FROM t3a_mentor_authorization
  WHERE mentor_id = v_actor
    AND dimension_id = p_dimension_id
    AND authorized_from <= now()
    AND (authorized_until IS NULL OR authorized_until >= now())
    AND calibration_status = 'current';

  IF v_authorization_snapshot IS NULL THEN
    PERFORM t3a_raise('§12.1 #5 / AC-08',
      format('mentor %s not currently authorized for dimension %s', v_actor, p_dimension_id));
  END IF;

  -- §5.3.1 socket refusal: source cannot be instructional/private_rehearsal.
  SELECT scenario_class INTO v_source_class
    FROM t3a_source_version WHERE source_version_id = p_source_version_id;
  IF v_source_class IS NULL THEN
    PERFORM t3a_raise('§13', 'source_version not found');
  END IF;
  IF v_source_class IN ('instructional', 'private_rehearsal') THEN
    PERFORM t3a_raise('§5.3.1',
      format('scenario class %s is structurally incapable of serving the observed pathway', v_source_class));
  END IF;

  -- §7.3 composition: determination_answers MUST resolve to a library
  -- entry.  A mentor cannot write statement text directly (AC-09, AC-50).
  SELECT statement_id INTO v_statement_id
    FROM t3a_statement_library
   WHERE dimension_id = p_dimension_id
     AND answer_key = p_determination_answers
     AND approved_at IS NOT NULL
   LIMIT 1;

  IF v_statement_id IS NULL THEN
    PERFORM t3a_raise('AC-49 / AC-50',
      format('no approved statement library entry resolves the given determinations for %s', p_dimension_id));
  END IF;

  INSERT INTO t3a_composed_statement (statement_id, rendered_body)
    SELECT v_statement_id, statement_body FROM t3a_statement_library
      WHERE statement_id = v_statement_id
    RETURNING composed_statement_id INTO v_composed_id;

  INSERT INTO t3a_observation (
    participant_id, stage_code, dimension_id, source_version_id,
    attempt_no, stage_instance_id, observer_id,
    observer_authorization_at_date, ordinal_anchor, descriptor_version,
    determination_answers, composed_statement_id, relevance_basis,
    evidence_class, administration_conditions, administration_variance,
    accommodation_class, comparability_class, evidence_notes,
    contemporaneity, late_entry_delay_seconds
  ) VALUES (
    p_participant_id, p_stage_code, p_dimension_id, p_source_version_id,
    p_attempt_no, p_stage_instance_id, v_actor,
    v_authorization_snapshot, p_ordinal_anchor, p_descriptor_version,
    p_determination_answers, v_composed_id, p_relevance_basis,
    p_evidence_class, p_administration_conditions, p_administration_variance,
    p_accommodation_class,
    CASE WHEN p_accommodation_class = 'demand_modifying'
         THEN 'interpret_individually'::t3a_comparability_class
         ELSE 'directly_comparable'::t3a_comparability_class END,
    p_evidence_notes,
    p_contemporaneity, p_late_entry_delay_seconds
  ) RETURNING observation_id INTO v_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'observation_committed', 'OBSERVATION', 'MENTOR', v_actor,
    p_participant_id, 'observation', v_id,
    jsonb_build_object(
      'stage_code', p_stage_code,
      'dimension_id', p_dimension_id,
      'source_version_id', p_source_version_id
    ),
    encode(digest(v_id::text || v_actor::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_confirm_s1_observation(p_observation_id uuid, p_confirmation_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_stage t3a_stage_code;
  v_dim   t3a_dimension_code;
  v_stage_instance uuid;
  v_snapshot jsonb;
  v_judgment_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 confirmS1Observation',
      'authorized mentor role required');
  END IF;

  SELECT stage_code, dimension_id, stage_instance_id
    INTO v_stage, v_dim, v_stage_instance
    FROM t3a_observation
    WHERE observation_id = p_observation_id;

  IF v_stage IS NULL THEN
    PERFORM t3a_raise('§13', 'observation not found');
  END IF;
  IF v_stage <> 'S1' THEN
    PERFORM t3a_raise('§13 confirmS1Observation',
      format('only S1 observations are confirmed here; got %s', v_stage));
  END IF;

  -- Authorization current AT the confirmation date must exist for this
  -- dimension (§21.4 authorization_snapshot_ref).  A later lookup cannot
  -- recover the state, so snapshot it now.
  SELECT jsonb_build_object(
    'mentor_authorization_id', mentor_authorization_id,
    'calibration_status', calibration_status,
    'reference_set_version', reference_set_version,
    'authorized_from', authorized_from,
    'authorized_until', authorized_until,
    'as_at', now()
  ) INTO v_snapshot
  FROM t3a_mentor_authorization
  WHERE mentor_id = v_actor
    AND dimension_id = v_dim
    AND authorized_from <= now()
    AND (authorized_until IS NULL OR authorized_until >= now())
    AND calibration_status = 'current';

  IF v_snapshot IS NULL THEN
    PERFORM t3a_raise('§14.2 authorization-at-date',
      format('no current authorization for dimension %s at %s', v_dim, now()));
  END IF;

  INSERT INTO t3a_mentor_judgment (
    stage_instance_id, observation_id,
    human_confirmation_actor_id, human_confirmation_at,
    confirmation_role, authorization_snapshot_ref
  ) VALUES (
    v_stage_instance, p_observation_id,
    v_actor, now(),
    p_confirmation_role, v_snapshot
  ) RETURNING mentor_judgment_id INTO v_judgment_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    's1_observation_confirmed', 'MENTOR', 'MENTOR', v_actor,
    'observation', p_observation_id,
    jsonb_build_object('mentor_judgment_id', v_judgment_id, 'dimension_id', v_dim),
    encode(digest(v_judgment_id::text || p_observation_id::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_judgment_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_create_stage_entry_event(p_stage_instance_id uuid, p_session_identity text, p_assistance_rules_version text, p_administration_conditions jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participant uuid;
  v_gateway uuid;
  v_stage t3a_stage_code;
  v_dim   t3a_dimension_code;
  v_id uuid;
BEGIN
  SELECT participant_id, stage_code, dimension_id
    INTO v_participant, v_stage, v_dim
    FROM t3a_stage_instance
    WHERE stage_instance_id = p_stage_instance_id;

  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createStageEntryEvent',
      'stage_instance not found');
  END IF;

  -- Active gateway must exist for the participant.  Gateway carries no
  -- dimension/stage key, so we pick the most recent one — the spec says
  -- "one per participant per observation path" and the path is defined
  -- by the participant's active enrolment.
  SELECT observation_path_gateway_id INTO v_gateway
    FROM t3a_observation_path_gateway
    WHERE participant_id = v_participant
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_gateway IS NULL THEN
    PERFORM t3a_raise('§5.1.1 entry conditions',
      'no observation_path_gateway for participant; cannot open Stage instance');
  END IF;

  -- §7.3.1 socket refusal: the dimension must have an approved question
  -- set + at least one approved statement library entry.  A dimension
  -- whose determination content is absent is NOT observable.
  IF NOT EXISTS (
    SELECT 1 FROM t3a_determination_question
      WHERE dimension_id = v_dim AND approved_at IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM t3a_statement_library
      WHERE dimension_id = v_dim AND approved_at IS NOT NULL
  ) THEN
    PERFORM t3a_raise('§7.3.1 socket refusal',
      format('dimension %s has no approved determination content; Stage refused', v_dim));
  END IF;

  INSERT INTO t3a_stage_entry_event (
    observation_path_gateway_id, stage_instance_id,
    stage_code, dimensions_in_play,
    session_identity, assistance_rules_version, administration_conditions
  ) VALUES (
    v_gateway, p_stage_instance_id,
    v_stage, ARRAY[v_dim],
    p_session_identity, p_assistance_rules_version, p_administration_conditions
  ) RETURNING stage_entry_event_id INTO v_id;

  UPDATE t3a_stage_instance
     SET state = 'active', activated_at = now()
   WHERE stage_instance_id = p_stage_instance_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id, subject_id,
    resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'stage_entry_event_opened', 'OBSERVATION', 'SYSTEM',
    v_participant, v_participant, 'stage_entry_event', v_id,
    jsonb_build_object(
      'stage_code', v_stage,
      'dimension_id', v_dim,
      'assistance_rules_version', p_assistance_rules_version
    ),
    encode(digest(v_id::text || p_stage_instance_id::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_open_challenge(p_ber_report_id uuid, p_disputed_statement_id uuid, p_disputed_observation_id uuid, p_challenge_ground t3a_challenge_ground)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 openChallenge', 'unauthenticated caller');
  END IF;

  SELECT participant_id INTO v_owner
    FROM t3a_ber_report WHERE ber_report_id = p_ber_report_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'ber_report not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13', 'a participant can only challenge their own report');
  END IF;

  INSERT INTO t3a_challenge_case (
    ber_report_id, participant_id,
    disputed_statement_id, disputed_observation_id,
    challenge_ground, status, observation_notification_timestamp
  ) VALUES (
    p_ber_report_id, v_participant,
    p_disputed_statement_id, p_disputed_observation_id,
    p_challenge_ground, 'open', now()
  ) RETURNING challenge_case_id INTO v_id;

  -- §8 + AC-16: an open challenge does NOT set talentvisa_active to
  -- false; do NOT touch t3a_discoverability here.

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'challenge_opened', 'PARTICIPANT', 'PARTICIPANT', v_participant,
    v_participant, 'challenge_case', v_id,
    jsonb_build_object('ber_report_id', p_ber_report_id, 'ground', p_challenge_ground),
    encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_create_disclosure(p_ber_report_id uuid, p_recipient_org_id uuid, p_recipient_email text, p_access_scope text, p_access_period_starts timestamp with time zone, p_access_period_ends timestamp with time zone, p_release_identity_now boolean DEFAULT false, p_release_report_now boolean DEFAULT false, p_recipient_binding_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createDisclosure', 'unauthenticated caller');
  END IF;

  SELECT participant_id INTO v_owner
    FROM t3a_ber_report WHERE ber_report_id = p_ber_report_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'ber_report not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13',
      'participant can only release their own report — no administrator-created release');
  END IF;
  IF p_access_period_ends <= p_access_period_starts THEN
    PERFORM t3a_raise('§13',
      'access_period_ends must be after access_period_starts');
  END IF;

  INSERT INTO t3a_disclosure (
    ber_report_id, participant_id, recipient_org_id, recipient_email,
    access_scope, access_period_starts, access_period_ends,
    identity_released_at, report_released_at,
    status, recipient_binding_token_hash
  ) VALUES (
    p_ber_report_id, v_participant, p_recipient_org_id, p_recipient_email,
    p_access_scope, p_access_period_starts, p_access_period_ends,
    CASE WHEN p_release_identity_now THEN now() END,
    CASE WHEN p_release_report_now   THEN now() END,
    'granted',
    CASE WHEN p_recipient_binding_token IS NOT NULL
         THEN encode(digest(p_recipient_binding_token, 'sha256'), 'hex')
    END
  ) RETURNING disclosure_id INTO v_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'disclosure_created', 'PARTICIPANT', 'PARTICIPANT', v_participant,
    v_participant, 'disclosure', v_id,
    jsonb_build_object(
      'ber_report_id', p_ber_report_id,
      'identity_released', p_release_identity_now,
      'report_released', p_release_report_now
    ),
    encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_revoke_disclosure(p_disclosure_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 revokeDisclosure', 'unauthenticated caller');
  END IF;
  SELECT participant_id INTO v_owner
    FROM t3a_disclosure WHERE disclosure_id = p_disclosure_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'disclosure not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13',
      'a participant can only revoke their own disclosure');
  END IF;

  UPDATE t3a_disclosure
     SET status = 'revoked', revoked_at = now()
   WHERE disclosure_id = p_disclosure_id
     AND revoked_at IS NULL;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, integrity_hash
  ) VALUES (
    'disclosure_revoked', 'PARTICIPANT', 'PARTICIPANT', v_participant,
    v_participant, 'disclosure', p_disclosure_id,
    encode(digest(p_disclosure_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN true;
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_ratify_question_set(p_dimension_id t3a_dimension_code, p_draft_version text, p_approved_version text, p_approver uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q_count int;
  v_s_count int;
BEGIN
  IF NOT t3a_is_admin() THEN
    PERFORM t3a_raise('§21.4 ratification', 'admin role required to ratify a question set');
  END IF;

  UPDATE t3a_determination_question
     SET question_set_version = p_approved_version,
         approved_at          = now(),
         approved_by          = p_approver
   WHERE dimension_id = p_dimension_id
     AND question_set_version = p_draft_version
     AND approved_at IS NULL;
  GET DIAGNOSTICS v_q_count = ROW_COUNT;

  UPDATE t3a_statement_library
     SET question_set_version = p_approved_version,
         approved_at          = now(),
         approved_by          = p_approver
   WHERE dimension_id = p_dimension_id
     AND question_set_version = p_draft_version
     AND approved_at IS NULL;
  GET DIAGNOSTICS v_s_count = ROW_COUNT;

  IF v_q_count = 0 AND v_s_count = 0 THEN
    PERFORM t3a_raise('§21.4 ratification',
      'no draft rows found for that dimension and draft version - nothing to ratify');
  END IF;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'question_set_ratified', 'GOVERNANCE', 'ADMIN', p_approver,
    p_approver, 'determination_question_set', p_approver,
    jsonb_build_object(
      'dimension_id', p_dimension_id,
      'draft_version', p_draft_version,
      'approved_version', p_approved_version,
      'questions_ratified', v_q_count,
      'statements_ratified', v_s_count
    ),
    encode(digest(p_dimension_id::text || p_approved_version || now()::text, 'sha256'), 'hex')
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.t3a_check_event_payload(p_event_name text, p_payload jsonb, p_occurred_at timestamp with time zone, p_dictionary_version text DEFAULT NULL::text)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  r public.t3a_event_registry%rowtype;
  v text[] := '{}';
  k text; val jsonb; prop jsonb; t jsonb; allowed text[]; typ text; ok boolean; cond jsonb; wf text; wv text; applies boolean; items text[]; x text;
  ver text := coalesce(p_dictionary_version, (select c.value from public.t3a_event_config c where c.key = 'dictionary_version'));
  max_bytes integer := (select c.value::integer from public.t3a_event_config c where c.key = 'max_payload_bytes');
begin
  select * into r from public.t3a_event_registry e where e.event_name = p_event_name and e.dictionary_version = ver;
  if not found then return array['EVENT_NOT_REGISTERED']; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then return array['PAYLOAD_NOT_OBJECT']; end if;
  if octet_length(p_payload::text) > coalesce(max_bytes, 4096) then v := array_append(v, 'PAYLOAD_TOO_LARGE'::text); end if;
  for k in select jsonb_array_elements_text(r.payload_schema->'required') loop
    if not (p_payload ? k) then v := v || ('MISSING_KEY:' || k); end if;
  end loop;
  for k, val in select e.key, e.value from jsonb_each(p_payload) e loop
    prop := r.payload_schema->'properties'->k;
    if prop is null then v := v || ('UNKNOWN_KEY:' || k); continue; end if;
    t := prop->'type';
    allowed := case jsonb_typeof(t) when 'array' then array(select jsonb_array_elements_text(t)) else array[t #>> '{}'] end;
    typ := jsonb_typeof(val);
    if typ = 'number' then
      ok := 'number' = any(allowed) or ('integer' = any(allowed) and (val #>> '{}')::numeric = trunc((val #>> '{}')::numeric));
    else
      ok := typ = any(allowed);
    end if;
    if not ok then v := v || ('TYPE:' || k); continue; end if;
    if typ = 'null' then continue; end if;
    if prop ? 'enum' and not ((prop->'enum') @> jsonb_build_array(val)) then v := v || ('ENUM:' || k); end if;
    if typ = 'string' then
      if prop ? 'pattern' and (val #>> '{}') !~ (prop->>'pattern') then v := v || ('PATTERN:' || k); end if;
      if prop->>'format' = 'date-time' then
        if (val #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
          v := v || ('FORMAT:' || k);
        else
          begin
            if (val #>> '{}')::timestamptz > p_occurred_at then v := v || ('TIMESTAMP_AFTER_OCCURRED:' || k); end if;
          exception when others then v := v || ('FORMAT:' || k);
          end;
        end if;
      end if;
    end if;
    if typ = 'number' and prop ? 'minimum' and (val #>> '{}')::numeric < (prop->>'minimum')::numeric then v := v || ('MINIMUM:' || k); end if;
  end loop;
  for cond in select jsonb_array_elements(r.conditional) loop
    if cond ? 'require_any' then
      items := array(select jsonb_array_elements_text(cond->'require_any'));
      if not exists (select 1 from unnest(items) i where p_payload ? i) then v := v || ('REQUIRE_ANY:' || array_to_string(items, '|')); end if;
    else
      wf := cond->>'when_field'; wv := p_payload->>wf; applies := false;
      if wv is not null then
        if cond ? 'in' then applies := wv = any(array(select jsonb_array_elements_text(cond->'in'))); end if;
        if cond ? 'not_in' then applies := not (wv = any(array(select jsonb_array_elements_text(cond->'not_in')))); end if;
      end if;
      if applies then
        if cond ? 'require' then
          for x in select jsonb_array_elements_text(cond->'require') loop
            if not (p_payload ? x) then v := v || ('CONDITIONAL_REQUIRE:' || x); end if;
          end loop;
        end if;
        if cond ? 'forbid' then
          for x in select jsonb_array_elements_text(cond->'forbid') loop
            if p_payload ? x then v := v || ('CONDITIONAL_FORBID:' || x); end if;
          end loop;
        end if;
      end if;
    end if;
  end loop;
  return v;
end $function$

