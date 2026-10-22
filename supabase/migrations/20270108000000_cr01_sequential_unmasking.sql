-- CORR-007 Rev 1.6 rule CR-01: sequential unmasking at Stage 2. Supersedes D1 instruction 057 (the Stage 1 outcome goes to the Stage 2 mentor
-- before Stage 2) and the Stage 1 workbench row of the Section 8 screen table.
--  a. Stage 2 entry needs only that Stage 1 is confirmed on the dimension. No Stage 1 outcome is delivered to the Stage 2 mentor first.
--  b. One access rule, evaluated in one place (t3a_s1_access_decision): before the Stage 2 commit nobody reads a participant's Stage 1 content on that
--     dimension except the participant, the Stage 1 confirmer, and the Safety Contact acting on a welfare event. Every refusal on the read route is logged.
--  c. Committing a Stage 2 observation writes a lock event (t3a_s2_determination_lock); determinations are append-only already, so an edit is refused.
--  d. After the lock the Stage 2 mentor reads the Stage 1 responses, determinations and confirmation record in full, read only.
--  e. The Stage 2 mentor then records how the Stages relate on each conduct element, from a controlled list; this never alters a Stage 2 determination.

create or replace function public.t3a_s2_committed(p_participant uuid, p_dimension text) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id::text = p_dimension and o.stage_code::text = 'S2' and o.is_committed is true)
$fn$;
revoke all on function public.t3a_s2_committed(uuid, text) from public, anon;
grant execute on function public.t3a_s2_committed(uuid, text) to authenticated, service_role;

-- The one access rule for the Stage 1 record.
create or replace function public.t3a_s1_access_decision(p_reader uuid, p_participant uuid, p_dimension text) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
begin
  if p_reader is not null and p_reader = p_participant then return jsonb_build_object('allowed', true, 'reason', 'participant_own_record'); end if;
  if p_reader is not null and exists (select 1 from public.t3a_d1_s1_confirmation c where c.participant_id = p_participant and c.dimension_id = p_dimension and c.confirmed_by = p_reader) then
    return jsonb_build_object('allowed', true, 'reason', 'stage1_confirmer');
  end if;
  if p_reader is not null and exists (select 1 from public.t3a_safety_contact sc where not sc.awaiting_designation and sc.designated_person = p_reader
                                         and sc.safety_contact_id = (select safety_contact_id from public.t3a_safety_contact order by designated_at desc, safety_contact_id desc limit 1))
     and (exists (select 1 from public.t3a_d1_welfare_withholding w where w.participant_id = p_participant and w.dimension_id = p_dimension)
          or exists (select 1 from public.t3a_safety_event e where e.concerns_person = p_participant)) then
    return jsonb_build_object('allowed', true, 'reason', 'safety_contact_on_welfare_event');
  end if;
  if public.t3a_s2_committed(p_participant, p_dimension) then return jsonb_build_object('allowed', true, 'reason', 'stage2_committed'); end if;
  return jsonb_build_object('allowed', false, 'reason', 'masked_until_stage2_commit');
end $fn$;
revoke all on function public.t3a_s1_access_decision(uuid, uuid, text) from public, anon;
grant execute on function public.t3a_s1_access_decision(uuid, uuid, text) to authenticated, service_role;

create or replace function public.t3a_s1_access_allowed(p_participant uuid, p_dimension text) returns boolean language sql stable security definer set search_path = public as $fn$
  select (public.t3a_s1_access_decision(auth.uid(), p_participant, p_dimension) ->> 'allowed')::boolean
$fn$;
revoke all on function public.t3a_s1_access_allowed(uuid, text) from public, anon;
grant execute on function public.t3a_s1_access_allowed(uuid, text) to authenticated, service_role;

-- The mask on the tables that hold Stage 1 content: a restrictive policy narrows every other policy, so no role (an administrator included) reads
-- these rows through the API before the Stage 2 commit unless the rule above allows it.
drop policy if exists t3a_cr01_mask on public.t3a_d1_s1_confirmation;
create policy t3a_cr01_mask on public.t3a_d1_s1_confirmation as restrictive for select to authenticated using (public.t3a_s1_access_allowed(participant_id, dimension_id));
drop policy if exists t3a_cr01_mask on public.t3a_d1_s1_determination;
create policy t3a_cr01_mask on public.t3a_d1_s1_determination as restrictive for select to authenticated using (public.t3a_s1_access_allowed(participant_id, dimension_id));
drop policy if exists t3a_cr01_mask on public.t3a_d1_s1_routing;
create policy t3a_cr01_mask on public.t3a_d1_s1_routing as restrictive for select to authenticated using (public.t3a_s1_access_allowed(participant_id, dimension_id));
drop policy if exists t3a_cr01_mask on public.t3a_d1_s1_reveal_response;
create policy t3a_cr01_mask on public.t3a_d1_s1_reveal_response as restrictive for select to authenticated using (
  exists (select 1 from public.t3a_d1_ai_administration_run r where r.ai_administration_run_id = t3a_d1_s1_reveal_response.ai_administration_run_id and public.t3a_s1_access_allowed(r.participant_id, r.dimension_id)));

-- The logged read route for every caller: the API, an export and an administrative tool all come through it. Refusals are logged with the route named.
create or replace function public.t3a_s1_content_read(p_participant uuid, p_dimension text, p_route text default 'api') returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare d jsonb; v_reader uuid := auth.uid(); v_stage2_mentor boolean;
begin
  d := public.t3a_s1_access_decision(v_reader, p_participant, p_dimension);
  v_stage2_mentor := exists (select 1 from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id::text = p_dimension and o.stage_code::text = 'S2' and o.is_committed is true and o.observer_id = v_reader);
  if not (d ->> 'allowed')::boolean then
    return public.t3a_capture_refuse('s1_content.read', 'S1_MASKED_UNTIL_STAGE2_COMMIT', coalesce(v_reader::text, 'no_identity') || ' via ' || coalesce(p_route, 'unknown') || ' for ' || p_participant::text || ' ' || coalesce(p_dimension, ''), 'Stage 1 content on this dimension opens after the Stage 2 commit');
  end if;
  if (d ->> 'reason') = 'stage2_committed' and not v_stage2_mentor then
    return public.t3a_capture_refuse('s1_content.read', 'S1_READ_NOT_AUTHORIZED', coalesce(v_reader::text, 'no_identity') || ' via ' || coalesce(p_route, 'unknown') || ' for ' || p_participant::text || ' ' || coalesce(p_dimension, ''), 'after the Stage 2 commit the Stage 1 content opens to the Stage 2 mentor, read only');
  end if;
  return jsonb_build_object('outcome', 'read', 'basis', d ->> 'reason',
    'responses', coalesce((select jsonb_agg(to_jsonb(x) order by x.reveal_ordinal) from public.t3a_d1_s1_reveal_response x join public.t3a_d1_ai_administration_run r on r.ai_administration_run_id = x.ai_administration_run_id where r.participant_id = p_participant and r.dimension_id = p_dimension), '[]'::jsonb),
    'determinations', coalesce((select jsonb_agg(to_jsonb(x) order by x.captured_at) from public.t3a_d1_s1_determination x where x.participant_id = p_participant and x.dimension_id = p_dimension), '[]'::jsonb),
    'confirmation', coalesce((select jsonb_agg(to_jsonb(x) order by x.captured_at) from public.t3a_d1_s1_confirmation x where x.participant_id = p_participant and x.dimension_id = p_dimension), '[]'::jsonb));
end $fn$;
revoke all on function public.t3a_s1_content_read(uuid, text, text) from public, anon;
grant execute on function public.t3a_s1_content_read(uuid, text, text) to authenticated;

-- The lock event: written when a Stage 2 observation is committed. Stage 2 determinations are append-only, so the lock is the record of the moment.
create table if not exists public.t3a_s2_determination_lock (
  lock_id uuid primary key default gen_random_uuid(),
  observation_record_id uuid not null unique,
  participant_id uuid not null,
  dimension_id text not null,
  observer_id uuid,
  locked_at timestamptz not null default now()
);
drop trigger if exists t3a_append_only on public.t3a_s2_determination_lock;
create trigger t3a_append_only before update or delete on public.t3a_s2_determination_lock for each row execute function public.t3a_deny_mutation();
alter table public.t3a_s2_determination_lock enable row level security;
revoke all on public.t3a_s2_determination_lock from anon, authenticated;

create or replace function public.t3a_s2_lock_on_commit() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.stage_code::text = 'S2' and new.is_committed is true and (tg_op = 'INSERT' or old.is_committed is distinct from true) then
    insert into public.t3a_s2_determination_lock (observation_record_id, participant_id, dimension_id, observer_id)
    values (new.observation_record_id, new.participant_id, new.dimension_id::text, new.observer_id) on conflict (observation_record_id) do nothing;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_s2_lock_on_commit_trg on public.t3a_observation_record;
create trigger t3a_s2_lock_on_commit_trg after insert or update on public.t3a_observation_record for each row execute function public.t3a_s2_lock_on_commit();

-- The older opener now answers from the lock event, or from the stage sequence milestone the earlier build set, and writes the unmask time once.
create or replace function public.t3a_open_s1_output(p_stage_instance uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare si record; v_locked timestamptz; v_seq public.t3a_stage_sequence;
begin
  select participant_id, dimension_id::text as dim into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance;
  select * into v_seq from public.t3a_stage_sequence where stage_instance_id = p_stage_instance;
  select min(locked_at) into v_locked from public.t3a_s2_determination_lock where participant_id = si.participant_id and dimension_id = si.dim;
  v_locked := coalesce(v_locked, v_seq.s2_determinations_locked_at);
  if v_locked is null then
    return public.t3a_capture_refuse('s1_output.open', 'S2_DETERMINATIONS_NOT_LOCKED', p_stage_instance::text, 'the S1 output opens only after the S2 determinations are locked');
  end if;
  if v_seq.stage_instance_id is not null and v_seq.s1_output_unmasked_at is null then
    update public.t3a_stage_sequence set s1_output_unmasked_at = now() where stage_instance_id = p_stage_instance;
  end if;
  return jsonb_build_object('outcome', 'opened', 'locked_at', v_locked);
end $fn$;

-- How the two Stages relate on each conduct element. Recorded by the Stage 2 mentor after the lock; it never alters a determination.
create table if not exists public.t3a_stage_relation_record (
  relation_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  dimension_id text not null,
  observation_record_id uuid not null,
  conduct_element_id text not null,
  relation text not null check (relation in ('consistent', 'different', 'stated_at_s1_not_enacted_at_s2')),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now()
);
drop trigger if exists t3a_append_only on public.t3a_stage_relation_record;
create trigger t3a_append_only before update or delete on public.t3a_stage_relation_record for each row execute function public.t3a_deny_mutation();
alter table public.t3a_stage_relation_record enable row level security;
revoke all on public.t3a_stage_relation_record from anon, authenticated;

create or replace function public.t3a_record_stage_relation(p_participant uuid, p_dimension text, p_conduct_element text, p_relation text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_obs uuid; v_reader uuid := auth.uid();
begin
  select o.observation_record_id into v_obs from public.t3a_observation_record o
   where o.participant_id = p_participant and o.dimension_id::text = p_dimension and o.stage_code::text = 'S2' and o.is_committed is true and o.observer_id = v_reader
   order by o.committed_at desc nulls last limit 1;
  if v_obs is null or not exists (select 1 from public.t3a_s2_determination_lock l where l.observation_record_id = v_obs) then
    return public.t3a_capture_refuse('stage_relation.record', 'S2_NOT_COMMITTED_BY_CALLER', coalesce(v_reader::text, 'no_identity'), 'only the Stage 2 mentor records the relation, after the Stage 2 commit');
  end if;
  if p_relation is null or p_relation not in ('consistent', 'different', 'stated_at_s1_not_enacted_at_s2') then
    return public.t3a_capture_refuse('stage_relation.record', 'RELATION_NOT_IN_LIST', coalesce(p_relation, ''), 'the relation is chosen from the controlled list');
  end if;
  insert into public.t3a_stage_relation_record (participant_id, dimension_id, observation_record_id, conduct_element_id, relation, recorded_by)
  values (p_participant, p_dimension, v_obs, p_conduct_element, p_relation, v_reader);
  return jsonb_build_object('outcome', 'recorded');
end $fn$;
revoke all on function public.t3a_record_stage_relation(uuid, text, text, text) from public, anon;
grant execute on function public.t3a_record_stage_relation(uuid, text, text, text) to authenticated;

-- Stage 2 entry (when the sequence switch is on) needs only that Stage 1 is confirmed on the dimension. The Stage 1 outcome is not delivered first.
create or replace function public.t3a_s2_entry_needs_s1() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.stage_code::text <> 'S2' or not (select enforce_sequence from public.t3a_capture_config) then return new; end if;
  if not exists (select 1 from public.t3a_d1_s1_confirmation c where c.participant_id = new.participant_id and c.dimension_id = new.dimension_id::text) then
    raise exception 'S1_NOT_CONFIRMED: Stage 2 entry needs Stage 1 confirmed on this dimension' using errcode = '42501';
  end if;
  return new;
end $fn$;
