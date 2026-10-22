-- CORR-007 Rev 1.6 rule CR-26 (CR-198): eligibility before entry and rehearsal exposure.
--   A successful eligibility request creates exactly one Stage entry event and one reservation. A source request outside an allocation event is refused. Within the stated
--   threat model, rehearsal exposure cannot be told apart from any other ineligibility: every refusal has the same shape and the same words, whatever the reason.
-- Nothing here activates a Stage or turns an enforcement switch on.

create table if not exists public.t3a_source_reservation (
  reservation_id       uuid primary key default gen_random_uuid(),
  stage_entry_event_id uuid not null unique references public.t3a_stage_entry_event(stage_entry_event_id),
  participant_id       uuid not null,
  dimension_id         text not null,
  stage_code           text not null,
  source_version_id    uuid not null,
  reserved_at          timestamptz not null default now()
);
create table if not exists public.t3a_entry_request (
  idempotency_key      text not null,
  participant_id       uuid not null,
  stage_entry_event_id uuid not null references public.t3a_stage_entry_event(stage_entry_event_id),
  requested_at         timestamptz not null default now(),
  primary key (participant_id, idempotency_key)      -- a key means something only to the participant who sent it
);
do $do$ declare t text; begin
  foreach t in array array['t3a_source_reservation', 't3a_entry_request'] loop
    execute format('drop trigger if exists t3a_deny_mutation_trg on public.%I', t);
    execute format('create trigger t3a_deny_mutation_trg before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

-- The one answer to every request that cannot proceed. It carries no reason, no count, no time and no hint of which test failed.
create or replace function public.t3a_cr26_not_eligible() returns jsonb language sql immutable as $fn$
  select jsonb_build_object('outcome', 'not_eligible', 'message', 'We cannot start a session for you right now.')
$fn$;
revoke all on function public.t3a_cr26_not_eligible() from public, anon, authenticated;
grant execute on function public.t3a_cr26_not_eligible() to service_role;

-- The eligibility request: the allocation event. It tests the attempt rules, any eligibility hold, the dimension's permission and the availability of a source the participant
-- has not met; on success it makes one gateway use, one Stage entry event and one reservation, and on any failure it answers t3a_cr26_not_eligible() and nothing else.
create or replace function public.t3a_cr26_request_entry(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_key text, p_seed bigint default 1) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_prev uuid; v_el jsonb; v_sel jsonb; v_gw uuid; v_inst uuid; v_entry uuid; v_no int; v_res uuid; v_why text;
begin
  if not public.t3a_is_service_context() then return public.t3a_cr26_not_eligible(); end if;
  if p_key is null or p_key = '' then return public.t3a_cr26_not_eligible(); end if;
  perform pg_advisory_xact_lock(hashtextextended('cr26:' || p_participant::text || p_dimension || p_stage::text, 0));
  select stage_entry_event_id into v_prev from public.t3a_entry_request where participant_id = p_participant and idempotency_key = p_key;
  if v_prev is not null then
    return jsonb_build_object('outcome', 'eligible', 'stage_entry_event_id', v_prev, 'reservation_id', (select reservation_id from public.t3a_source_reservation where stage_entry_event_id = v_prev));
  end if;
  v_el := public.t3a_attempt_eligibility(p_participant, p_dimension, p_stage, now());
  if (v_el ->> 'permitted')::boolean is not true then v_why := coalesce(v_el ->> 'refusal_code', 'attempt_rules'); end if;
  if v_why is null and p_dimension <> 'D1' and public.t3a_dimension_consent_state(p_participant, p_dimension, null) <> 'granted' then v_why := 'permission_not_in_effect'; end if;
  if v_why is null and exists (select 1 from public.t3a_attempt_live a where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage and a.outcome = 'initiated') then v_why := 'attempt_active'; end if;
  if v_why is null then
    v_sel := public.t3a_source_select(p_participant, p_dimension, p_stage::text, p_seed);
    if v_sel ->> 'outcome' is distinct from 'selected' then v_why := coalesce(v_sel ->> 'reason', 'no_source'); end if;
  end if;
  if v_why is not null then
    perform public.t3a_capture_refuse('entry.request', 'ENTRY_NOT_ELIGIBLE', p_participant::text || ' ' || p_dimension || ' ' || p_stage::text, 'internal reason: ' || v_why);
    return public.t3a_cr26_not_eligible();
  end if;
  select observation_path_gateway_id into v_gw from public.t3a_observation_path_gateway where participant_id = p_participant order by created_at desc limit 1;
  if v_gw is null then
    insert into public.t3a_observation_path_gateway (participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at)
      values (p_participant, 'account_authentication', '1.0', '1.0', now()) returning observation_path_gateway_id into v_gw;
  end if;
  select coalesce(max(attempt_no), 0) + 1 into v_no from public.t3a_stage_instance where participant_id = p_participant and stage_code = p_stage and dimension_id::text = p_dimension;
  insert into public.t3a_stage_instance (participant_id, stage_code, dimension_id, attempt_no, state) values (p_participant, p_stage, p_dimension::public.t3a_dimension_code, v_no, 'scheduled') returning stage_instance_id into v_inst;
  insert into public.t3a_stage_entry_event (participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id)
    values (p_participant, p_dimension, p_stage, v_gw, v_inst, 'account_authentication', '1.0', '{}'::jsonb, array[p_dimension::public.t3a_dimension_code], '{}'::jsonb, (v_sel ->> 'source_version_id')::uuid) returning stage_entry_event_id into v_entry;
  insert into public.t3a_source_reservation (stage_entry_event_id, participant_id, dimension_id, stage_code, source_version_id) values (v_entry, p_participant, p_dimension, p_stage::text, (v_sel ->> 'source_version_id')::uuid) returning reservation_id into v_res;
  insert into public.t3a_entry_request (idempotency_key, participant_id, stage_entry_event_id) values (p_key, p_participant, v_entry);
  return jsonb_build_object('outcome', 'eligible', 'stage_entry_event_id', v_entry, 'reservation_id', v_res);
end $fn$;
revoke all on function public.t3a_cr26_request_entry(uuid, text, public.t3a_stage_code, text, bigint) from public, anon, authenticated;
grant execute on function public.t3a_cr26_request_entry(uuid, text, public.t3a_stage_code, text, bigint) to service_role;

-- A source is released only inside the allocation event that reserved it, and only to the participant it was reserved for. Anything else gets the one answer.
create or replace function public.t3a_cr26_source_for_entry(p_stage_entry_event_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); r public.t3a_source_reservation;
begin
  select * into r from public.t3a_source_reservation where stage_entry_event_id = p_stage_entry_event_id;
  if r.reservation_id is null or v_actor is null or r.participant_id <> v_actor then
    return public.t3a_cr26_not_eligible();
  end if;
  return jsonb_build_object('outcome', 'source', 'source_version_id', r.source_version_id, 'stage_entry_event_id', r.stage_entry_event_id);
end $fn$;
revoke all on function public.t3a_cr26_source_for_entry(uuid) from public, anon;
grant execute on function public.t3a_cr26_source_for_entry(uuid) to authenticated;

-- A source request that names no allocation event at all.
create or replace function public.t3a_cr26_source_request(p_dimension text, p_stage text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  perform public.t3a_capture_refuse('entry.source_request', 'SOURCE_REQUEST_OUTSIDE_ALLOCATION', coalesce(auth.uid()::text, ''), 'a source is released only inside an allocation event');
  return public.t3a_cr26_not_eligible();
end $fn$;
revoke all on function public.t3a_cr26_source_request(text, text) from public, anon;
grant execute on function public.t3a_cr26_source_request(text, text) to authenticated;
