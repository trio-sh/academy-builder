-- Step 3i: calibration and the controlled pilot (D2 INS-008 101 to 109, INS-009 110 to 115).
--
-- A clearance is a governance act and is never recorded by this build: t3a_record_calibration_clearance refuses until the approved parameters are loaded and the
-- agreement is computable for every question of every source. Authorization for a later dimension requires a clearance record for that dimension (D1 clearance confers nothing).
-- The pilot stop control has three levels, scoped per dimension: pilot wide, affected path, pause new scheduling.

create table if not exists public.t3a_calibration_participant (
  actor_id uuid not null, dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  status text not null default 'provisional' check (status in ('provisional', 'cleared', 'ended')),
  recorded_at timestamptz not null default now(),
  primary key (actor_id, dimension_id)
);
create table if not exists public.t3a_calibration_clearance (
  clearance_id uuid primary key default gen_random_uuid(),
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  reference_set_version text not null,
  construct_version text not null, determination_version text not null, statement_version text not null,
  source_version_ids uuid[] not null check (cardinality(source_version_ids) > 0),
  exercise_id uuid references public.t3a_d1_calibration_exercise(id),
  recorded_by uuid, recorded_at timestamptz not null default now()
);
alter table public.t3a_d1_calibration_exercise add column if not exists dimension_id text not null default 'D1' check (dimension_id ~ '^D[0-9]{1,2}$');
create table if not exists public.t3a_pilot_stop (
  pilot_stop_id uuid primary key default gen_random_uuid(),
  stop_level text not null check (stop_level in ('pilot_wide', 'affected_path', 'pause_new_scheduling')),
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  participant_id uuid,
  reason_code text not null check (reason_code ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  set_by uuid, set_at timestamptz not null default now(), lifted_at timestamptz, lifted_by uuid,
  check ((stop_level = 'affected_path') = (participant_id is not null))
);
do $$ declare t text; begin
  foreach t in array array['t3a_calibration_participant', 't3a_calibration_clearance', 't3a_pilot_stop'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
drop trigger if exists t3a_append_only on public.t3a_calibration_clearance;
create trigger t3a_append_only before update or delete on public.t3a_calibration_clearance for each row execute function public.t3a_deny_mutation();

-- 106: a provisional calibration participant may not act on any real record, in any dimension.
create or replace function public.t3a_calibration_boundary() returns trigger language plpgsql security definer set search_path = public as $fn$
declare actor uuid; j jsonb := to_jsonb(new); col text;
begin
  foreach col in array tg_argv loop
    actor := nullif(j ->> col, '')::uuid;
    if actor is not null and exists (select 1 from public.t3a_calibration_participant p where p.actor_id = actor and p.status = 'provisional') then
      perform public.t3a_capture_refuse('calibration.boundary', 'calibration_participant_boundary', actor::text, tg_table_name || '.' || col || ': a provisional calibration participant may not observe, confirm, progress, review, issue or reconsider a real record');
      return null;
    end if;
  end loop;
  return new;
end $fn$;
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_observation_record;
create trigger t3a_5_calibration_boundary_trg before insert on public.t3a_observation_record for each row execute function public.t3a_calibration_boundary('observer_id', 'confirmer_id');
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_d1_progression_decision;
create trigger t3a_5_calibration_boundary_trg before insert on public.t3a_d1_progression_decision for each row execute function public.t3a_calibration_boundary('recorded_by');
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_evidence_review;
create trigger t3a_5_calibration_boundary_trg before insert on public.t3a_evidence_review for each row execute function public.t3a_calibration_boundary('reviewer_id');
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_reconsideration_assignment;
create trigger t3a_5_calibration_boundary_trg before insert on public.t3a_reconsideration_assignment for each row execute function public.t3a_calibration_boundary('reconsiderer_id');
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_d1_report_issuance;
create trigger t3a_5_calibration_boundary_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_calibration_boundary('issued_by');

-- 102, 108: authorization for a later dimension needs a clearance record for that dimension naming the version set. D1 rows are not re-judged.
create or replace function public.t3a_authorization_needs_clearance() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.dimension_id::text = 'D1' then return new; end if;
  if not exists (select 1 from public.t3a_calibration_clearance c where c.dimension_id = new.dimension_id::text and c.reference_set_version = new.reference_set_version) then
    perform public.t3a_capture_refuse('authorization.create', 'no_clearance_for_dimension', new.mentor_id::text || ' ' || new.dimension_id::text,
      'authorization needs a calibration clearance for this dimension that names the version set; another dimension''s clearance confers nothing');
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_authorization_needs_clearance_trg on public.t3a_mentor_authorization;
create trigger t3a_0_authorization_needs_clearance_trg before insert on public.t3a_mentor_authorization for each row execute function public.t3a_authorization_needs_clearance();

-- 107: nobody sees another participant's selections before locking their own.
create or replace function public.t3a_calibration_peer_view(p_exercise uuid, p_viewer uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  if not exists (select 1 from public.t3a_d1_calibration_participation p where p.exercise_id = p_exercise and p.reviewer_id = p_viewer and p.submitted_at is not null) then
    return public.t3a_capture_refuse('calibration.view', 'selections_not_locked', p_viewer::text, 'another participant''s selections are not visible until your own are locked');
  end if;
  return jsonb_build_object('outcome', 'visible', 'selections', (select coalesce(jsonb_agg(jsonb_build_object('reviewer_id', p.reviewer_id, 'decision_body', p.decision_body)), '[]'::jsonb)
    from public.t3a_d1_calibration_participation p where p.exercise_id = p_exercise and p.submitted_at is not null and p.reviewer_id <> p_viewer));
end $fn$;
revoke all on function public.t3a_calibration_peer_view(uuid, uuid) from public, anon;
grant execute on function public.t3a_calibration_peer_view(uuid, uuid) to authenticated, service_role;

-- 103, 104, 105: agreement is computed within a source version, per question; below the per-source minimum it is NOT CALCULATED and the question stays uncleared for that source.
-- The statement concordance is reported separately and never averaged with it. The minimum unit count is an approved parameter: unloaded, the function refuses.
-- decision_body: {"units": [{"unit_id": "...", "source_version_id": "...", "question_code": "Q-D2-01", "answer": "A2"}]}
create or replace function public.t3a_calibration_agreement_by_source(p_exercise uuid, p_minimum_units int default null) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare ex public.t3a_d1_calibration_exercise; out jsonb := '[]'::jsonb; r record; units int; agree int; conc int; reviewers int;
begin
  if p_minimum_units is null then return jsonb_build_object('outcome', 'refused', 'reason', 'minimum_unit_unloaded', 'detail', 'the approved per-source minimum is not loaded; nothing is calculated'); end if;
  select * into ex from public.t3a_d1_calibration_exercise where id = p_exercise;
  if ex.id is null then return jsonb_build_object('outcome', 'refused', 'reason', 'exercise_not_found'); end if;
  select count(distinct reviewer_id) into reviewers from public.t3a_d1_calibration_participation where exercise_id = p_exercise and submitted_at is not null;
  for r in select (u ->> 'source_version_id')::uuid as src, u ->> 'question_code' as q from public.t3a_d1_calibration_participation p, jsonb_array_elements(p.decision_body -> 'units') u
            where p.exercise_id = p_exercise and p.submitted_at is not null group by 1, 2 order by 1, 2 loop
    select count(distinct u ->> 'unit_id') into units from public.t3a_d1_calibration_participation p, jsonb_array_elements(p.decision_body -> 'units') u
     where p.exercise_id = p_exercise and p.submitted_at is not null and (u ->> 'source_version_id')::uuid = r.src and u ->> 'question_code' = r.q;
    if units < p_minimum_units or reviewers < 2 then
      out := out || jsonb_build_object('source_version_id', r.src, 'question_code', r.q, 'status', 'NOT_CALCULATED', 'units', units, 'minimum', p_minimum_units, 'question_remains_uncleared_for_this_source', true);
      continue;
    end if;
    select count(*) filter (where n_answers = 1), count(*) filter (where n_statements = 1) into agree, conc from (
      select u ->> 'unit_id' as unit, count(distinct u ->> 'answer') as n_answers,
             count(distinct (select l.statement_key from public.t3a_d1_statement_library l where l.dimension_id = ex.dimension_id and l.question_code = r.q and l.answer_code = u ->> 'answer' limit 1)) as n_statements
        from public.t3a_d1_calibration_participation p, jsonb_array_elements(p.decision_body -> 'units') u
       where p.exercise_id = p_exercise and p.submitted_at is not null and (u ->> 'source_version_id')::uuid = r.src and u ->> 'question_code' = r.q group by 1) z;
    out := out || jsonb_build_object('source_version_id', r.src, 'question_code', r.q, 'status', 'CALCULATED', 'units', units,
      'question_agreement_units', agree, 'statement_concordance_units', conc, 'note', 'agreement and statement concordance are separate figures and are not combined');
  end loop;
  return jsonb_build_object('outcome', 'computed', 'exercise_id', p_exercise, 'dimension_id', ex.dimension_id, 'by_source', out);
end $fn$;
revoke all on function public.t3a_calibration_agreement_by_source(uuid, int) from public, anon;
grant execute on function public.t3a_calibration_agreement_by_source(uuid, int) to service_role;

-- A clearance is recorded only when the approved parameters are loaded and every question of every source was calculated. Never by this build.
create or replace function public.t3a_record_calibration_clearance(p_exercise uuid, p_reference_set_version text, p_construct text, p_determination text, p_statement text, p_sources uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare ex public.t3a_d1_calibration_exercise; minu int; a jsonb;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('calibration.clearance', 'CLEARANCE_IS_A_GOVERNANCE_ACT', coalesce(p_exercise::text, ''), 'a clearance is recorded through the service route by a person with standing'); end if;
  select * into ex from public.t3a_d1_calibration_exercise where id = p_exercise;
  if ex.id is null or ex.state::text <> 'closed' then return public.t3a_capture_refuse('calibration.clearance', 'exercise_not_closed', coalesce(p_exercise::text, ''), 'the exercise must be closed'); end if;
  select nullif(configuration_value, '')::int into minu from public.t3a_configuration_value where configuration_key = 'calibration_minimum_units_per_source' order by configuration_seq desc limit 1;
  if minu is null then return public.t3a_capture_refuse('calibration.clearance', 'clearance_parameters_unloaded', p_exercise::text, 'the approved per-source minimum is not loaded'); end if;
  a := public.t3a_calibration_agreement_by_source(p_exercise, minu);
  if exists (select 1 from jsonb_array_elements(a -> 'by_source') x where x ->> 'status' = 'NOT_CALCULATED') or jsonb_array_length(a -> 'by_source') = 0 then
    return public.t3a_capture_refuse('calibration.clearance', 'questions_uncleared', p_exercise::text, 'at least one question is not calculated for at least one source');
  end if;
  insert into public.t3a_calibration_clearance (dimension_id, reference_set_version, construct_version, determination_version, statement_version, source_version_ids, exercise_id, recorded_by)
    values (ex.dimension_id, p_reference_set_version, p_construct, p_determination, p_statement, p_sources, p_exercise, auth.uid());
  return jsonb_build_object('outcome', 'recorded');
end $fn$;
revoke all on function public.t3a_record_calibration_clearance(uuid, text, text, text, text, uuid[]) from public, anon, authenticated;
grant execute on function public.t3a_record_calibration_clearance(uuid, text, text, text, text, uuid[]) to service_role;

-- 110, 114: the three level stop control, per dimension.
create or replace function public.t3a_pilot_set_stop(p_level text, p_dimension text, p_participant uuid, p_reason_code text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare id uuid;
begin
  if not public.t3a_has_administrative_standing() and not public.t3a_is_service_context() then return public.t3a_capture_refuse('pilot.stop', 'APPROVER_LACKS_STANDING', p_dimension, 'a stop is set by a person with standing'); end if;
  insert into public.t3a_pilot_stop (stop_level, dimension_id, participant_id, reason_code, set_by) values (p_level, p_dimension, p_participant, p_reason_code, auth.uid()) returning pilot_stop_id into id;
  return jsonb_build_object('outcome', 'stopped', 'pilot_stop_id', id);
end $fn$;
revoke all on function public.t3a_pilot_set_stop(text, text, uuid, text) from public, anon;
grant execute on function public.t3a_pilot_set_stop(text, text, uuid, text) to authenticated, service_role;

create or replace function public.t3a_pilot_path_open(p_participant uuid, p_dimension text, p_for text default 'new') returns boolean language sql stable security definer set search_path = public as $fn$
  select not exists (select 1 from public.t3a_pilot_stop s where s.lifted_at is null and s.dimension_id = p_dimension and (
    s.stop_level = 'pilot_wide' or (s.stop_level = 'affected_path' and s.participant_id = p_participant) or (s.stop_level = 'pause_new_scheduling' and p_for = 'new')))
$fn$;

-- 112: every employer route is disabled in the pilot, and each attempt is recorded with its result.
create or replace function public.t3a_pilot_employer_attempt(p_route text, p_organization uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  return public.t3a_capture_refuse('employer.' || coalesce(p_route, 'unknown'), 'employer_route_disabled_in_pilot', coalesce(p_organization::text, ''), 'employer access, verification, invitation and release are disabled during the pilot');
end $fn$;
revoke all on function public.t3a_pilot_employer_attempt(text, uuid) from public, anon;
grant execute on function public.t3a_pilot_employer_attempt(text, uuid) to authenticated, service_role;

-- 115: the provenance trace for one observation, gateway to audit chain. Missing links are named, never filled.
create or replace function public.t3a_provenance_trace(p_observation_ref uuid) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare cs public.t3a_dimension_composed_statement; o public.t3a_observation_record; e public.t3a_stage_entry_event; missing text[] := '{}'; srv jsonb; gw uuid; audit jsonb;
begin
  select * into cs from public.t3a_dimension_composed_statement where observation_ref = p_observation_ref and supersedes_composed_statement_id is null;
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_ref;
  if o.observation_record_id is null then missing := missing || 'observation_record'::text; end if;
  if cs.composed_statement_id is null then missing := missing || 'composed_statement'::text; end if;
  select * into e from public.t3a_stage_entry_event x where x.participant_id = coalesce(o.participant_id, cs.participant_id) and x.source_version_id = cs.source_version_id order by x.entered_at desc limit 1;
  if e.stage_entry_event_id is null then missing := missing || 'stage_entry_event'::text; else gw := e.observation_path_gateway_id; if gw is null then missing := missing || 'gateway'::text; end if; end if;
  select jsonb_agg(jsonb_build_object('served_instance_id', s.served_instance_id, 'source_version_id', s.source_version_id)) into srv from public.t3a_served_instance s where s.stage_entry_event_id = e.stage_entry_event_id;
  if srv is null then missing := missing || 'served_instance'::text; end if;
  select coalesce(jsonb_agg(jsonb_build_object('event_name', l.event_name, 'ingested_at', l.ingested_at)), '[]'::jsonb) into audit from public.t3a_event_log l
   where l.resource_id in (p_observation_ref, e.stage_entry_event_id, gw);
  if audit = '[]'::jsonb then missing := missing || 'audit_chain'::text; end if;
  return jsonb_build_object('observation_ref', p_observation_ref, 'complete', cardinality(missing) = 0, 'missing_links', to_jsonb(missing),
    'gateway', gw, 'stage_entry_event', e.stage_entry_event_id, 'served_instances', srv, 'source_version_id', cs.source_version_id,
    'answers', cs.answers, 'statements', (select coalesce(jsonb_agg(c ->> 'state_code'), '[]'::jsonb) from jsonb_array_elements(coalesce(cs.clauses, '[]'::jsonb)) c), 'composed_statement_id', cs.composed_statement_id, 'audit', audit);
end $fn$;
revoke all on function public.t3a_provenance_trace(uuid) from public, anon, authenticated;
grant execute on function public.t3a_provenance_trace(uuid) to service_role;

-- The pilot stop reaches the two entry gates (re-emitted with one added check each).
create or replace function public.t3a_source_serving_gate(p_version uuid, p_stage text, p_participant uuid default null) returns jsonb language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

create or replace function public.t3a_stage_2_entry_gate(p_participant uuid, p_dimension text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare s1 record; conf record; assigned uuid; prog text;
begin
  if not public.t3a_pilot_path_open(p_participant, p_dimension, 'new') then
    return jsonb_build_object('eligible', false, 'refusal_code', 'pilot_path_stopped', 'sub_reason', 'pilot_stop_in_force');
  end if;
  select stage_instance_id, state, completed_at into s1 from public.t3a_stage_instance
   where participant_id = p_participant and dimension_id::text = p_dimension and stage_code::text = 'S1' order by attempt_no desc nulls last, created_at desc limit 1;
  if s1.stage_instance_id is null or s1.completed_at is null then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_instance_not_closed');
  end if;
  select * into conf from public.t3a_d1_s1_confirmation where stage_instance_id = s1.stage_instance_id order by captured_at desc limit 1;
  select assigned_mentor_id into assigned from public.t3a_d1_s1_routing where stage_instance_id = s1.stage_instance_id order by routed_at desc limit 1;
  if conf.s1_confirmation_id is null then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_confirmation_record_absent_or_wrong_actor', 'detail', 'absent');
  end if;
  if assigned is null or conf.confirmed_by is distinct from assigned then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_confirmation_record_absent_or_wrong_actor', 'detail', 'wrong_actor');
  end if;
  if not exists (select 1 from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id::text = p_dimension and o.stage_code::text = 'S1' and o.is_committed is true) then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_observation_not_committed');
  end if;
  prog := public.t3a_latest_progression(p_participant, p_dimension);
  if prog is distinct from 'proceed' then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_progression_absent_or_blocks', 'detail', coalesce(prog, 'absent'));
  end if;
  return jsonb_build_object('eligible', true);
end $fn$;
