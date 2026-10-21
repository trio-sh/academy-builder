-- Rollback of 20261216000000_step3_consent_routes_and_timing.sql: restores every re-emitted function as it was before this step and drops what the step added.
drop trigger if exists t3a_2_bound_item_guard_trg on public.t3a_d1_content_version;
drop function if exists public.t3a_bound_item_guard();
drop function if exists public.t3a_bound_item_integrity(jsonb);
drop function if exists public.t3a_dimension_consent_check(uuid, text, text);
drop function if exists public.t3a_dimension_consent_state(uuid, text, text);
drop function if exists public.t3a_consent_read(uuid, text);
drop function if exists public.t3a_contact_initiation_attempt(uuid, uuid, text);
drop function if exists public.t3a_decision_point_pause(text);
drop function if exists public.t3a_record_timing_comparability(uuid, boolean, boolean);
drop function if exists public.t3a_security_timing(text);
drop function if exists public.t3a_security_timing_gate(text, text);
alter table public.t3a_observation_timing_flag disable trigger t3a_append_only;
drop table if exists public.t3a_observation_timing_flag;
alter table public.t3a_contact_permission disable trigger t3a_append_only;
drop table if exists public.t3a_contact_permission;
-- the superseded route logger is dropped after the three route functions that call it are restored below
drop function if exists public.t3a_es_obs(uuid, text, boolean) cascade;
CREATE OR REPLACE FUNCTION public.t3a_es_obs(p_participant uuid, p_dimension text, p_include_test boolean)
 RETURNS TABLE(cid uuid, oref uuid, stage text, src uuid, observer uuid, ci jsonb, conds jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cs.composed_statement_id, cs.observation_ref, cs.stage_code, cs.source_version_id, o.observer_id, cs.clause_instances, cs.conditions
    from public.t3a_dimension_composed_statement cs join public.t3a_observation_record o on o.observation_record_id = cs.observation_ref
   where cs.participant_id = p_participant and cs.dimension_id = p_dimension and o.dimension_id = p_dimension and o.is_committed is true and (p_include_test or not cs.test_mode)
     and not exists (select 1 from public.t3a_dimension_composed_statement x where x.supersedes_composed_statement_id = cs.composed_statement_id)
     and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id)
$function$
;
CREATE OR REPLACE FUNCTION public.t3a_source_serving_gate(p_version uuid, p_stage text, p_participant uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; st text := upper(p_stage); ex jsonb;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('source.serve', 'source_version_not_found', p_version::text, 'no such version'); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  if p_participant is not null and not public.t3a_pilot_path_open(p_participant, o.dimension_id::text, 'new') then
    return public.t3a_capture_refuse('source.serve', 'pilot_path_stopped', p_participant::text, 'a pilot stop is in force for this participant or dimension');
  end if;
  if st = 'S4' and public.t3a_s4_activation_state() is null then
    return public.t3a_capture_refuse('source.serve', 's4_not_activated', p_version::text, 'Stage 4 entry is disabled behind s4_activation_state, which is not loaded');
  end if;
  if coalesce(v.body ->> 'stage_code', '') <> st then return public.t3a_capture_refuse('source.serve', 'source_stage_mismatch', p_version::text, 'the source belongs to Stage ' || coalesce(v.body ->> 'stage_code', '?')); end if;
  if v.superseded_by is not null or v.retired_at is not null or o.retired_at is not null then return public.t3a_capture_refuse('source.serve', 'source_superseded_or_retired', p_version::text, 'superseded and retired versions do not serve'); end if;
  if v.approval_status <> 'approved' or not public.t3a_d1_source_version_approved(p_version) then return public.t3a_capture_refuse('source.serve', 'source_not_approved', p_version::text, 'only an exact approved version serves'); end if;
  if v.operational_state <> 'active' then return public.t3a_capture_refuse('source.serve', 'source_not_active', p_version::text, 'the version is not loaded and active'); end if;
  if p_participant is not null then
    ex := public.t3a_prior_exposure(p_participant, p_version);
    if (ex ->> 'excluded')::boolean then return public.t3a_capture_refuse('source.serve', 'prior_exposure_exclusion', p_participant::text, ex ->> 'reasons'); end if;
  end if;
  return jsonb_build_object('outcome', 'servable', 'source_version_id', p_version);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_report_issuance_gate(p_ber_report_id uuid, p_reviewer uuid DEFAULT NULL::uuid, p_issuer uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; dims text[]; d text; items int[]; blockers jsonb := '[]'::jsonb; passed int; latest_hash text; cs jsonb; act jsonb; rv uuid;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return jsonb_build_object('permitted', false, 'blockers', jsonb_build_array(jsonb_build_object('code', 'BER_REPORT_NOT_FOUND'))); end if;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);

  -- 083: pre-issue participant review is a precondition; non-response is not completion; no timeout, no deemed acceptance
  if not exists (select 1 from public.t3a_d1_participant_review_action a where a.ber_report_id = p_ber_report_id and a.action in ('reviewed_no_correction', 'correction_raised')) then
    blockers := blockers || jsonb_build_object('code', 'participant_review_incomplete', 'detail', 'no explicit recorded outcome; silence is never consent and no timeout applies');
  end if;
  -- 082: a correction open against any record in the report blocks the whole report
  cs := public.t3a_report_correction_state(p_ber_report_id);
  if (cs ->> 'open')::boolean then blockers := blockers || jsonb_build_object('code', 'correction_open', 'detail', cs); end if;
  -- 090: the checklist runs once per dimension present; a pass on one dimension never carries another
  foreach d in array dims loop
    items := public.t3a_review_items_for(d);
    select count(distinct r.item_no) into passed from public.t3a_dimension_review_result r
      where r.ber_report_id = p_ber_report_id and r.dimension_id = d and r.item_no = any (items)
        and r.outcome = 'pass' and r.recorded_at = (select max(x.recorded_at) from public.t3a_dimension_review_result x where x.ber_report_id = r.ber_report_id and x.dimension_id = r.dimension_id and x.item_no = r.item_no);
    if passed < cardinality(items) then
      blockers := blockers || jsonb_build_object('code', 'checklist_incomplete_or_failed', 'dimension_id', d, 'items_required', cardinality(items), 'items_passed', passed);
    end if;
    -- 091: the review is for the exact version set
    select r.version_set_hash into latest_hash from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.dimension_id = d order by r.recorded_at desc limit 1;
    if latest_hash is not null and b.version_set is not null and b.version_set <> '{}'::jsonb
       and latest_hash <> encode(extensions.digest(b.version_set::text, 'sha256'), 'hex') then
      blockers := blockers || jsonb_build_object('code', 'review_not_for_this_version_set', 'dimension_id', d);
    end if;
  end loop;
  -- 019 / 011: two distinct actors, neither involved in any record in the report
  if p_reviewer is not null then act := public.t3a_report_actor_gate(p_reviewer, p_ber_report_id, 'evidence_review'); if act ->> 'outcome' <> 'eligible' then blockers := blockers || jsonb_build_object('code', 'reviewer_not_eligible', 'detail', act ->> 'reason'); end if; end if;
  if p_issuer is not null then
    act := public.t3a_report_actor_gate(p_issuer, p_ber_report_id, 'issue');
    if act ->> 'outcome' <> 'eligible' then blockers := blockers || jsonb_build_object('code', 'issuer_not_eligible', 'detail', act ->> 'reason');
    elsif exists (select 1 from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.reviewer_id = p_issuer) then
      blockers := blockers || jsonb_build_object('code', 'issuer_not_eligible', 'detail', 'reviewer_cannot_issue');
    end if;
  end if;
  -- 013 / item 13: the evidence currency value must be loaded
  if coalesce((select btrim(configuration_value) from public.t3a_configuration_value where configuration_key = 'evidence_currency' order by configuration_seq desc limit 1), '') = '' then blockers := blockers || jsonb_build_object('code', 'evidence_currency_unloaded'); end if;
  return jsonb_build_object('permitted', jsonb_array_length(blockers) = 0, 'blockers', blockers, 'override_available', false);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_issuance_gate_backstop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; g jsonb;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = new.ber_report_id;
  if b.ber_report_id is not null and exists (select 1 from unnest(coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) x where x <> 'D1') then
    g := public.t3a_report_issuance_gate(new.ber_report_id, null, new.issued_by);
    if not (g ->> 'permitted')::boolean then
      raise exception 'ISSUANCE_GATE: %', (g -> 'blockers')::text using errcode = '42501';
    end if;
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_pool_make_available(p_ber_report_id uuid, p_stated_role_or_field text DEFAULT NULL::text, p_work_location_preference text DEFAULT NULL::text, p_availability_to_start text DEFAULT NULL::text, p_work_authorization_jurisdiction text DEFAULT NULL::text, p_open_to_liveworks boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_actor uuid := auth.uid(); r public.t3a_d1_ber_report; v_name text; v_rel uuid;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.pool_make_available', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  select * into r from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if r.ber_report_id is null then return public.t3a_capture_refuse('release.pool_make_available', 'BER_REPORT_NOT_FOUND', v_actor::text, 'no such report'); end if;
  if r.participant_id <> v_actor then return public.t3a_capture_refuse('release.pool_make_available', 'ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT', v_actor::text, 'nobody releases a report for the participant'); end if;
  if r.issued_at is null then return public.t3a_capture_refuse('release.pool_make_available', 'REPORT_NOT_ISSUED', v_actor::text, 'only an issued report can be made available'); end if;
  if r.withdrawn_at is not null then return public.t3a_capture_refuse('release.pool_make_available', 'REPORT_WITHDRAWN', v_actor::text, 'a withdrawn report cannot be made available'); end if;
  if r.amended_at is not null then return public.t3a_capture_refuse('release.pool_make_available', 'REPORT_SUPERSEDED', v_actor::text, 'an amended report is replaced by its later version; make that one available'); end if;
  if exists (select 1 from public.t3a_report_release where ber_report_id = p_ber_report_id and release_mode = 'approved_employer_pool' and token_state = 'active') then
    return public.t3a_capture_refuse('release.pool_make_available', 'ALREADY_AVAILABLE', v_actor::text, 'this report is already available to approved employers');
  end if;

  select coalesce(nullif(btrim(pp.display_name), ''), nullif(btrim(pp.legal_name), ''), nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')) into v_name
    from public.profiles p left join public.t3a_participant_profile pp on pp.account_id = p.id where p.id = v_actor;
  if v_name is null then return public.t3a_capture_refuse('release.pool_make_available', 'NAME_NOT_STATED', v_actor::text, 'the participant has not stated a name to show'); end if;

  -- Its own consent, per dimension (employer_share, recorded through t3a_record_consent). Never inherited from another dimension.
  if public.t3a_consent_current(v_actor, 'employer_share', r.dimension_id) is distinct from 'granted' then
    return public.t3a_capture_refuse('release.pool_make_available', 'EMPLOYER_SHARE_CONSENT_REQUIRED', v_actor::text, 'employer_share consent for dimension ' || r.dimension_id || ' is not granted');
  end if;

  insert into public.t3a_report_release (ber_report_id, release_mode, token_state, employer_visibility_state)
    values (p_ber_report_id, 'approved_employer_pool', 'active', 'available_to_approved_employers') returning recipient_release_id into v_rel;

  insert into public.t3a_employer_pool_entry (participant_id, stated_full_name, stated_role_or_field, work_location_preference, availability_to_start, work_authorization_jurisdiction,
      open_to_liveworks, ber_report_id, report_status, current_through)
    values (v_actor, v_name, p_stated_role_or_field, p_work_location_preference, p_availability_to_start, p_work_authorization_jurisdiction, p_open_to_liveworks,
      p_ber_report_id, 'issued', r.issued_at::date);

  if public.t3a_canonical_writers_on() then
    perform public.t3a_emit_event('release.changed', 'PARTICIPANT', v_actor::text, 'participant', 'release', v_rel,
      jsonb_build_object('release_mode', 'approved_employer_pool', 'employer_visibility_state', 'available_to_approved_employers', 'availability_changed_at', to_jsonb(now())),
      'pool_available:' || v_rel::text, null, v_actor);
  end if;
  return jsonb_build_object('outcome', 'available', 'recipient_release_id', v_rel);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_record_consent(p_account uuid, p_type text, p_status text, p_dim text, p_stage text, p_copy_version text, p_copy_hash text, p_method text, p_language text, p_purpose text, p_reuse text DEFAULT 'future_only'::text, p_consequence_displayed boolean DEFAULT NULL::boolean, p_ip_hash text DEFAULT NULL::text, p_expires timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_actor uuid := coalesce(auth.uid(), p_account); v_id uuid := gen_random_uuid(); v_prev uuid; v_evt text;
begin
  if not public.t3a_is_service_context() and auth.uid() is distinct from p_account then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ACTOR_MISMATCH', 'a person records consent only for their own account');
  end if;
  if p_type is null or p_type ~ '[,;\[\]{} ]' then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ONE_TYPE_PER_INTERACTION', 'one interaction carries exactly one consent_type');
  end if;
  if p_type in ('followup_contact', 'aggregate_regional', 'research_participation') then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ROUTE_DISABLED', p_type || ' capture is not enabled');
  end if;
  if p_type not in ('scenario_logging', 'mentor_observation', 'employer_share') then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_TYPE_UNKNOWN', 'not a listed consent_type');
  end if;
  if p_status = 'withdrawn' and p_consequence_displayed is not true then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSEQUENCE_NOT_DISPLAYED', 'the consequence of withdrawal must be shown before it is processed');
  end if;
  if not exists (select 1 from public.t3a_account where account_id = p_account) then
    return public.t3a_consent_refuse(p_account, p_type, 'ACCOUNT_UNKNOWN', 'no such account');
  end if;
  select consent_id into v_prev from public.t3a_consent_record
   where account_id = p_account and consent_type = p_type and consent_scope_dimension_id is not distinct from p_dim
     and consent_scope_stage_code is not distinct from p_stage
     and not exists (select 1 from public.t3a_consent_supersession s where s.consent_id = t3a_consent_record.consent_id)
   order by recorded_seq desc limit 1;
  insert into public.t3a_consent_record (consent_id, account_id, consent_type, consent_status, consent_copy_version, consent_copy_hash, consent_method,
      consent_language, consent_scope_dimension_id, consent_scope_stage_code, consequence_displayed, ip_address_hash, processing_purpose_id,
      authorization_basis_type, consent_actor_id, consent_effective_at, consent_expires_at, historical_reuse_scope)
  values (v_id, p_account, p_type, p_status, p_copy_version, p_copy_hash, p_method, p_language, p_dim, p_stage, p_consequence_displayed,
      p_ip_hash, p_purpose, 'consent', v_actor, now(), p_expires, p_reuse);
  if v_prev is not null then
    insert into public.t3a_consent_supersession (consent_id, superseded_by) values (v_prev, v_id);
  end if;
  v_evt := 'consent.' || p_status;
  perform public.t3a_emit_event(v_evt, 'PARTICIPANT', v_actor::text, 'participant', 'consent', v_id,
    case when p_status = 'withdrawn' then jsonb_build_object('consent_id', v_id, 'consequence_displayed', true) else jsonb_build_object('consent_id', v_id) end,
    'consent:' || v_id, null, p_account);
  return jsonb_build_object('outcome', 'recorded', 'consent_id', v_id, 'event', v_evt);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_d1_issue_release_token(p_ber_report_id uuid, p_recipient_name text, p_recipient_org text, p_recipient_address text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.t3a_capture_refuse('release.named_recipient', 'NAMED_RECIPIENT_RELEASE_RETIRED', coalesce(p_ber_report_id::text, ''), 'the named recipient release route is closed; reports are released to the approved employer pool');
  return jsonb_build_object('issued', false, 'refusal_code', 'NAMED_RECIPIENT_RELEASE_RETIRED');
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_d1_redeem_release_token(p_token text, p_verified_address text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.t3a_capture_refuse('release.named_recipient_redeem', 'PLATFORM_RELEASE_MIGRATION_REQUIRES_GOVERNED_RECORD', '', 'a named recipient token is not honoured; an older release must be re-made through the pool under a governed record');
  return jsonb_build_object('content', false, 'state', 'PLATFORM_RELEASE_MIGRATION_REQUIRES_GOVERNED_RECORD');
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_create_disclosure(p_ber_report_id uuid, p_recipient_org_id uuid, p_recipient_email text, p_access_scope text, p_access_period_starts timestamp with time zone, p_access_period_ends timestamp with time zone, p_release_identity_now boolean DEFAULT false, p_release_report_now boolean DEFAULT false, p_recipient_binding_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.t3a_capture_refuse('release.named_recipient', 'NAMED_RECIPIENT_RELEASE_RETIRED', coalesce(p_ber_report_id::text, ''), 'the named recipient release route is closed; no disclosure was created');
  return null;
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_named_route_closed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_table_name = 't3a_report_release' and new.release_mode is distinct from 'named_pilot_recipient' then return new; end if;
  perform public.t3a_capture_refuse('release.named_recipient', 'NAMED_RECIPIENT_RELEASE_RETIRED', tg_table_name, 'a direct insert on a closed release route was refused');
  return null;
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_pattern_compare(p_dim_a text, p_pattern_a text, p_dim_b text, p_pattern_b text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_dim_a = p_dim_b then return jsonb_build_object('outcome', 'compared', 'same_pattern', p_pattern_a = p_pattern_b); end if;
  if exists (select 1 from public.t3a_cross_dimension_pattern_map m where (m.dimension_a, m.pattern_a, m.dimension_b, m.pattern_b) in ((p_dim_a, p_pattern_a, p_dim_b, p_pattern_b), (p_dim_b, p_pattern_b, p_dim_a, p_pattern_a))) then
    return jsonb_build_object('outcome', 'compared', 'same_pattern', true, 'via', 'approved mapping');
  end if;
  return public.t3a_capture_refuse('exposure.pattern', 'cross_dimension_pattern_unmapped', p_dim_a || ':' || p_pattern_a || ' / ' || p_dim_b || ':' || p_pattern_b, 'no approved mapping row; pattern identifiers of different dimensions are not interchangeable');
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_evidence_state(p_participant uuid, p_dimension text, p_include_test boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n int; state text := 'not_observed'; frame text := 'FR-' || p_dimension || '-0';
  stages text[]; mentors uuid[]; related boolean; all_s1 boolean;
  conds text[] := '{}'; blocked jsonb := '[]'::jsonb; rec jsonb := '[]'::jsonb; ordered jsonb;
  locked boolean; keyed record; codes text[]; has_blocker boolean; n_stage int; n_ctx int; n_ci int; reasons text[]; contexts uuid[]; x uuid; y uuid; pair_ok boolean;
begin
  select count(*) into n from public.t3a_es_obs(p_participant, p_dimension, p_include_test);
  if n = 0 then
    return jsonb_build_object('dimension_id', p_dimension, 'state', state, 'frame', frame, 'observations', 0, 'conditions', '[]'::jsonb, 'recurrence', '[]'::jsonb, 'blocked', '[]'::jsonb);
  end if;
  state := 'observed_once'; frame := 'FR-' || p_dimension || '-1';
  select array_agg(distinct stage), array_agg(distinct observer) filter (where stage in ('S2', 'S3', 'S4') and observer is not null), bool_and(stage = 'S1')
    into stages, mentors, all_s1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test);

  -- breadth: two or more observations in approved distinct contexts, with Stage and observer diversity
  select exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) a join public.t3a_es_obs(p_participant, p_dimension, p_include_test) b
                  on a.cid < b.cid where public.t3a_contexts_related(p_dimension, a.src, b.src)) into related;
  if n > 1 and not related then blocked := blocked || jsonb_build_object('frame', 'multiple_contexts', 'reason', 'no_approved_cross_context_relationship'); end if;
  if related then
    if coalesce(array_length(stages, 1), 0) >= 2 and coalesce(array_length(mentors, 1), 0) >= 2 then
      state := 'observed_multiple_contexts'; frame := 'FR-' || p_dimension || '-2';
    else
      blocked := blocked || jsonb_build_object('frame', 'multiple_contexts', 'reason', 'stage_or_observer_diversity_absent');
    end if;
  end if;

  -- recurrence, clause by clause: gather the FULL current set for the key, test for material contradiction FIRST, then the threshold
  select configuration_value = 'locked' into locked from public.t3a_configuration_value where configuration_key = 'recurrence_config_locked' order by configuration_seq desc limit 1;
  for keyed in select distinct c ->> 'recurrence_equivalence_key_id' as k from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c loop
    select array_agg(distinct c ->> 'state_code'), bool_or((c ->> 'recurrence_blocker')::boolean), count(distinct o.stage), count(distinct o.src), count(*)
      into codes, has_blocker, n_stage, n_ctx, n_ci
      from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where c ->> 'recurrence_equivalence_key_id' = keyed.k;
    reasons := '{}';
    if cardinality(codes) > 1 then
      reasons := reasons || 'material_contradiction_in_current_set'::text;   -- same key, differing state codes: a key groups the states of one variable and does not assert one conduct
    else
      if n_ci < 3 then reasons := reasons || 'fewer_than_three_qualifying_observations'::text; end if;
      if n_stage < 3 then reasons := reasons || 'fewer_than_three_distinct_stages'::text; end if;
      if n_ctx < 3 then reasons := reasons || 'fewer_than_three_contexts'::text; end if;
      if coalesce(has_blocker, false) then reasons := reasons || 'recurrence_blocker_statement'::text; end if;
      if coalesce(array_length(mentors, 1), 0) < 2 then reasons := reasons || 'fewer_than_two_authorized_observers'::text; end if;
      if not coalesce(locked, false) then reasons := reasons || 'recurrence_configuration_not_locked'::text; end if;
      if cardinality(reasons) = 0 then
        select array_agg(distinct o.src) into contexts from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where c ->> 'recurrence_equivalence_key_id' = keyed.k;
        pair_ok := true;
        foreach x in array contexts loop foreach y in array contexts loop
          if x < y and not public.t3a_contexts_related(p_dimension, x, y) then pair_ok := false; end if;
        end loop; end loop;
        if not pair_ok then reasons := reasons || 'contexts_not_approved_distinct'::text; end if;
      end if;
    end if;
    if cardinality(reasons) = 0 then
      rec := rec || jsonb_build_object('recurrence_equivalence_key_id', keyed.k, 'state_code', codes[1], 'available', true);
      state := 'recurring_across_stages'; frame := 'FR-' || p_dimension || '-3';
    else
      rec := rec || jsonb_build_object('recurrence_equivalence_key_id', keyed.k, 'available', false, 'reasons', to_jsonb(reasons));
      if 'material_contradiction_in_current_set' = any (reasons) then conds := conds || 'mixed_or_divergent'::text; end if;
    end if;
  end loop;

  -- cross-cutting conditions, in the fixed precedence of 5.13 (limitation first)
  if exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o where o.conds ? 'conditions_compromised') then conds := conds || 'conditions_compromised'::text; end if;
  if all_s1 then conds := conds || 'stage_1_only'::text; end if;
  conds := conds || (case when coalesce(array_length(mentors, 1), 0) >= 2 then 'multiple_observers' else 'single_observer' end);
  if exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) a join public.t3a_es_obs(p_participant, p_dimension, p_include_test) b
              on a.cid < b.cid and a.stage = b.stage and a.src = b.src and a.ci::text <> b.ci::text) then conds := conds || 'earlier_attempt_differs'::text; end if;
  select coalesce(jsonb_agg(c order by p), '[]'::jsonb) into ordered from (
    select distinct c, case c when 'conditions_compromised' then 1 when 'evidence_expired' then 2 when 'correction_open' then 3 when 'amendment_or_withdrawal' then 4 when 'stage_1_only' then 5
      when 'single_observer' then 6 when 'multiple_observers' then 6 when 'mixed_or_divergent' then 7 when 'earlier_attempt_differs' then 8 else 9 end p from unnest(conds) c) z;
  return jsonb_build_object('dimension_id', p_dimension, 'state', state, 'frame', frame, 'observations', n, 'conditions', ordered, 'recurrence', rec, 'blocked', blocked);
end $function$
;
drop function if exists public.t3a_superseded_route_log(text);
