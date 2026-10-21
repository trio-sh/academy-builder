-- The payload checker allowed no time after the event. An expiry or an end is a future moment by nature (stage_entry_hold_expires_at, consent_expires_at, cooldown_ends_at), so keys ending _expires_at or _ends_at are exempt (CR-069).
create or replace function public.t3a_check_event_payload(p_event_name text, p_payload jsonb, p_occurred_at timestamptz, p_dictionary_version text default null)
returns text[] language plpgsql stable as $$
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
            -- a time that names a future moment (an expiry or an end) is allowed to be after the event; every other time must not be
            if (val #>> '{}')::timestamptz > p_occurred_at and k !~ '(_expires_at|_ends_at)$' then v := v || ('TIMESTAMP_AFTER_OCCURRED:' || k); end if;
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
end $$;


-- Day 1 live writers, the remaining seven (CR-069). Behind a switch that is off: nothing a caller sees changes until it is activated.

insert into public.t3a_event_config (key, value) values ('canonical_writers', 'off') on conflict (key) do nothing;

create or replace function public.t3a_canonical_writers_on() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'on' from public.t3a_event_config where key = 'canonical_writers'), false)
$$;

-- A required setting is read from the configuration values, then from the deployment configuration. If it is unset the route refuses and
-- does not default (DT-39).
create or replace function public.t3a_required_setting(p_key text) returns text language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  select configuration_value into v from public.t3a_configuration_value where configuration_key = p_key order by configuration_seq desc limit 1;
  if v is null then select (to_jsonb(c) ->> p_key) into v from public.t3a_deployment_config c where singleton; end if;
  if v is null then
    raise exception 'CONFIGURATION_UNSET: % is not set; this route refuses and does not default', p_key using errcode = '55000';
  end if;
  return v;
end $$;
revoke all on function public.t3a_required_setting(text) from public, anon;

-- What stands between the live writers and the canonical path.
create or replace function public.t3a_canonical_readiness() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k text; missing text[] := '{}'; v text;
begin
  foreach k in array array['attempt_rules_version', 'stage_entry_hold_ttl', 'response_time_committed_version'] loop
    begin v := public.t3a_required_setting(k); exception when others then missing := missing || k; end;
  end loop;
  return jsonb_build_object('canonical_writers', (select value from public.t3a_event_config where key = 'canonical_writers'),
    'ingest_mode', (select value from public.t3a_event_config where key = 'ingest_mode'), 'missing_settings', to_jsonb(missing), 'ready', cardinality(missing) = 0);
end $$;
revoke all on function public.t3a_canonical_readiness() from public, anon;
grant execute on function public.t3a_canonical_readiness() to authenticated, service_role;

create or replace function public.t3a_activate_canonical_writers() returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public.t3a_canonical_readiness();
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_ACTIVATION_SERVICE_ONLY' using errcode = '42501'; end if;
  if not (r->>'ready')::boolean then return jsonb_build_object('outcome', 'refused', 'reason', 'SETTINGS_MISSING', 'readiness', r); end if;
  update public.t3a_event_config set value = 'on', updated_at = now() where key = 'canonical_writers';
  update public.t3a_event_config set value = 'strict', updated_at = now() where key = 'ingest_mode';
  return jsonb_build_object('outcome', 'activated', 'readiness', public.t3a_canonical_readiness());
end $$;
revoke all on function public.t3a_activate_canonical_writers() from public, anon, authenticated;
grant execute on function public.t3a_activate_canonical_writers() to service_role;

-- The snapshot hash of an observation is taken when the row is written: sha256 over the row as stored, without the hash itself.
create or replace function public.t3a_observation_snapshot_hash() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.record_snapshot_hash is null then
    new.record_snapshot_hash := encode(digest(convert_to(((to_jsonb(new)) - 'record_snapshot_hash')::text, 'UTF8'), 'sha256'), 'hex');
  end if;
  return new;
end $$;
drop trigger if exists t3a_8_observation_snapshot_hash_trg on public.t3a_observation;
create trigger t3a_8_observation_snapshot_hash_trg before insert on public.t3a_observation for each row execute function public.t3a_observation_snapshot_hash();


-- observation commit gains an optional served instance; drop the old signature first so a call cannot be ambiguous
DROP FUNCTION IF EXISTS public.t3a_commit_observation(uuid,uuid,uuid,t3a_dimension_code,t3a_stage_code,integer,jsonb,jsonb,t3a_evidence_class,jsonb,jsonb,t3a_accommodation_class,text,integer,text,t3a_contemporaneity,integer);

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
  v_att_rules text;
  v_hold int;
  v_attempt int;
  v_sim text;
  v_mode text;
  v_session uuid;
  v_authority uuid;
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

  IF public.t3a_canonical_writers_on() THEN
    v_att_rules := public.t3a_required_setting('attempt_rules_version');
    v_hold := public.t3a_required_setting('stage_entry_hold_ttl')::int;
    SELECT attempt_no INTO v_attempt FROM t3a_stage_instance WHERE stage_instance_id = p_stage_instance_id;
    SELECT session_identity_method INTO v_sim FROM t3a_observation_path_gateway WHERE observation_path_gateway_id = v_gateway;
    v_mode := CASE v_stage::text WHEN 'S1' THEN 's1_deterministic_engine' WHEN 'S2' THEN 's2_live_video'
                                 WHEN 'S3' THEN 's3_asynchronous_submission' ELSE 's4_live_group' END;
    v_session := gen_random_uuid();
    v_authority := CASE WHEN v_stage::text <> 'S1' AND auth.uid() IS NOT NULL AND t3a_is_mentor() THEN auth.uid() END;
    UPDATE t3a_stage_entry_event
       SET session_id = v_session, observation_mode = v_mode, entry_authority_actor_id = v_authority,
           stage_entry_hold_expires_at = now() + make_interval(secs => v_hold)
     WHERE stage_entry_event_id = v_id;
    PERFORM public.t3a_emit_event(
      'observation.stage_entered', 'SYSTEM_SERVICE', 'stage_entry', 'system_service', 'observation', v_id,
      jsonb_build_object(
        'stage_entry_event_id', v_id, 'stage_instance_id', p_stage_instance_id, 'stage_code', v_stage,
        'session_id', v_session, 'session_identity_method', v_sim, 'assistance_rules_version', p_assistance_rules_version,
        'observation_mode', v_mode, 'attempt_no', v_attempt, 'attempt_rules_version', v_att_rules,
        'observation_notification_timestamp', to_jsonb(now()), 'stage_entry_hold_expires_at', to_jsonb(now() + make_interval(secs => v_hold)))
      || CASE WHEN v_authority IS NOT NULL THEN jsonb_build_object('entry_authority_actor_id', v_authority) ELSE '{}'::jsonb END,
      'stage_entered:' || v_id::text, NULL, v_participant);
  ELSE
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
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.t3a_commit_observation(p_participant_id uuid, p_stage_instance_id uuid, p_source_version_id uuid, p_dimension_id t3a_dimension_code, p_stage_code t3a_stage_code, p_attempt_no integer, p_determination_answers jsonb, p_relevance_basis jsonb, p_evidence_class t3a_evidence_class, p_administration_conditions jsonb DEFAULT '{}'::jsonb, p_administration_variance jsonb DEFAULT '{}'::jsonb, p_accommodation_class t3a_accommodation_class DEFAULT NULL::t3a_accommodation_class, p_descriptor_version text DEFAULT ''::text, p_ordinal_anchor integer DEFAULT NULL::integer, p_evidence_notes text DEFAULT NULL::text, p_contemporaneity t3a_contemporaneity DEFAULT 'contemporaneous'::t3a_contemporaneity, p_late_entry_delay_seconds integer DEFAULT NULL::integer, p_served_instance_id uuid DEFAULT NULL::uuid)
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
  v_served uuid;
  v_src_hash text;
  v_ren_hash text;
  v_snap text;
  v_committed timestamptz;
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

  IF public.t3a_canonical_writers_on() THEN
    -- DT-17: both hashes, from the stored source version and the rendered instance that was served.
    v_served := coalesce(p_served_instance_id, (
      SELECT si.served_instance_id FROM t3a_served_instance si
        JOIN t3a_stage_entry_event e ON e.stage_entry_event_id = si.stage_entry_event_id
       WHERE e.stage_instance_id = p_stage_instance_id ORDER BY si.served_at DESC LIMIT 1));
    SELECT source_version_hash INTO v_src_hash FROM t3a_source_version WHERE source_version_id = p_source_version_id;
    SELECT r.rendered_instance_hash INTO v_ren_hash FROM t3a_served_instance s
      JOIN t3a_rendered_instance r ON r.rendered_instance_id = s.rendered_instance_id WHERE s.served_instance_id = v_served;
    IF v_served IS NULL OR v_src_hash IS NULL OR v_ren_hash IS NULL THEN
      PERFORM t3a_raise('DT-17 DUAL_HASH_MISSING',
        'an observation needs a served instance whose source version and rendered instance both carry a hash');
    END IF;
  END IF;

  INSERT INTO t3a_observation (
    participant_id, stage_code, dimension_id, source_version_id,
    attempt_no, stage_instance_id, observer_id,
    observer_authorization_at_date, ordinal_anchor, descriptor_version,
    determination_answers, composed_statement_id, relevance_basis,
    evidence_class, administration_conditions, administration_variance,
    accommodation_class, comparability_class, evidence_notes,
    contemporaneity, late_entry_delay_seconds, served_instance_id
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
    p_contemporaneity, p_late_entry_delay_seconds, v_served
  ) RETURNING observation_id INTO v_id;

  IF public.t3a_canonical_writers_on() THEN
    SELECT record_snapshot_hash, created_at INTO v_snap, v_committed FROM t3a_observation WHERE observation_id = v_id;
    PERFORM public.t3a_emit_event(
      'observation.committed', 'MENTOR', v_actor::text, 'mentor', 'observation', v_id,
      jsonb_build_object(
        'observation_id', v_id, 'dimension_id', p_dimension_id, 'stage_code', p_stage_code, 'stage_instance_id', p_stage_instance_id,
        'served_instance_id', v_served, 'source_version_id', p_source_version_id, 'source_version_hash', v_src_hash,
        'rendered_instance_hash', v_ren_hash, 'record_snapshot_hash', v_snap, 'attempt_no', p_attempt_no, 'committed_at', to_jsonb(v_committed)),
      'observation_committed:' || v_id::text, NULL, p_participant_id);
  ELSE
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
  END IF;

  RETURN v_id;
END;
$function$;

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

  IF public.t3a_canonical_writers_on() THEN
    PERFORM public.t3a_emit_event(
      'observation.s1_confirmed', 'MENTOR', v_actor::text, 'mentor', 'observation', p_observation_id,
      jsonb_build_object(
        's1_human_confirmation_actor_id', v_actor, 's1_human_confirmation_at', to_jsonb(now()), 'confirmation_role', p_confirmation_role,
        'authorization_snapshot_ref', (v_snapshot ->> 'mentor_authorization_id')::uuid, 's1_exposure_flag', true),
      's1_confirmed:' || v_judgment_id::text, NULL, NULL);
  ELSE
  INSERT INTO t3a_event_log (
      event_name, event_category, actor_type, actor_id,
      resource_type, resource_id, payload, integrity_hash
    ) VALUES (
      's1_observation_confirmed', 'MENTOR', 'MENTOR', v_actor,
      'observation', p_observation_id,
      jsonb_build_object('mentor_judgment_id', v_judgment_id, 'dimension_id', v_dim),
      encode(digest(v_judgment_id::text || p_observation_id::text || now()::text, 'sha256'), 'hex')
    );
  END IF;

  RETURN v_judgment_id;
END;
$function$;

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
  v_rt text;
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

  IF public.t3a_canonical_writers_on() THEN
    v_rt := public.t3a_required_setting('response_time_committed_version');
    UPDATE t3a_challenge_case
       SET opened_by = v_participant, challenge_target_ref = p_ber_report_id, issuance_hold = true, response_time_committed_version = v_rt
     WHERE challenge_case_id = v_id;
    PERFORM public.t3a_emit_event(
      'challenge.opened', 'PARTICIPANT', v_participant::text, 'participant', 'challenge', v_id,
      jsonb_build_object(
        'challenge_case_id', v_id, 'opened_by', v_participant, 'opened_at', to_jsonb(now()), 'challenge_target_ref', p_ber_report_id,
        'challenge_ground', p_challenge_ground, 'response_time_committed_version', v_rt, 'issuance_hold', true),
      'challenge_opened:' || v_id::text, NULL, v_participant);
  ELSE
  INSERT INTO t3a_event_log (
      event_name, event_category, actor_type, actor_id,
      subject_id, resource_type, resource_id, payload, integrity_hash
    ) VALUES (
      'challenge_opened', 'PARTICIPANT', 'PARTICIPANT', v_participant,
      v_participant, 'challenge_case', v_id,
      jsonb_build_object('ber_report_id', p_ber_report_id, 'ground', p_challenge_ground),
      encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
    );
  END IF;

  RETURN v_id;
END;
$function$;

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

  IF public.t3a_canonical_writers_on() THEN
    PERFORM public.t3a_emit_event(
      'release.recipient_created', 'PARTICIPANT', v_participant::text, 'participant', 'release', v_id,
      jsonb_build_object(
        'recipient_release_id', v_id,
        'recipient_address_hash', encode(digest(lower(btrim(p_recipient_email)), 'sha256'), 'hex'),
        'token_state', 'active'),
      'disclosure_created:' || v_id::text, NULL, v_participant);
  ELSE
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
  END IF;

  RETURN v_id;
END;
$function$;

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

  IF public.t3a_canonical_writers_on() THEN
    PERFORM public.t3a_emit_event(
      'release.changed', 'PARTICIPANT', v_participant::text, 'participant', 'release', p_disclosure_id,
      jsonb_build_object('release_mode', 'named_pilot_recipient', 'employer_visibility_state', 'not_available', 'availability_changed_at', to_jsonb(now())),
      'disclosure_revoked:' || p_disclosure_id::text, NULL, v_participant);
  ELSE
  INSERT INTO t3a_event_log (
      event_name, event_category, actor_type, actor_id,
      subject_id, resource_type, resource_id, integrity_hash
    ) VALUES (
      'disclosure_revoked', 'PARTICIPANT', 'PARTICIPANT', v_participant,
      v_participant, 'disclosure', p_disclosure_id,
      encode(digest(p_disclosure_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
    );
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.t3a_ratify_question_set(p_dimension_id t3a_dimension_code, p_draft_version text, p_approved_version text, p_approver uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q_count int;
  v_s_count int;
  v_hash text;
  v_approval uuid;
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

  IF public.t3a_canonical_writers_on() THEN
    v_hash := encode(digest(
      coalesce((SELECT string_agg(question_id::text || ':' || question_body, '|' ORDER BY order_index, question_id) FROM t3a_determination_question
                 WHERE dimension_id = p_dimension_id AND question_set_version = p_approved_version), '') || '#' ||
      coalesce((SELECT string_agg(statement_id::text, '|' ORDER BY statement_id) FROM t3a_statement_library
                 WHERE dimension_id = p_dimension_id AND question_set_version = p_approved_version), ''), 'sha256'), 'hex');
    v_approval := gen_random_uuid();
    PERFORM public.t3a_emit_event(
      'registry.version_approved', 'ADMINISTRATOR', p_approver::text, 'administrator', 'registry_asset', v_approval,
      jsonb_build_object('approval_record_id', v_approval, 'approved_at', to_jsonb(now()), 'source_effective_from', to_jsonb(now()), 'version_hash', v_hash),
      'version_approved:' || v_approval::text, NULL, p_approver);
  ELSE
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
  END IF;
END;
$function$;
