-- CORR-007 Rev 1.6 rule CR-02 (CR-190): prior access bar and mentor rotation.
--   At Stage 2 a mentor who has accessed the participant's Stage 1 on the dimension (as confirmer, or after the Stage 2 commit) never observes that
--   participant's Stage 2 on the dimension again. At Stages 1, 3 and 4 a repeat attempt uses a different mentor from the immediately preceding one.
--   At Stage 4 the group composition differs from every earlier attempt and an attempt with no composition record refuses before entry.
--   The planner enforces it; a participant never chooses an observer. Rotation is applied after every stricter exclusion.
-- Kept now (3.2.4): an audit record of every access to a participant's Stage 1 record, by mentor and dimension.

create table if not exists public.t3a_s1_access_audit (
  audit_seq      bigint generated always as identity primary key,
  participant_id uuid not null,
  dimension_id   text not null,
  reader_id      uuid,
  basis          text not null,
  route          text not null,
  accessed_at    timestamptz not null default now()
);
create index if not exists t3a_s1_access_audit_pd_idx on public.t3a_s1_access_audit (participant_id, dimension_id);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_s1_access_audit;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_s1_access_audit for each row execute function public.t3a_deny_mutation();
alter table public.t3a_s1_access_audit enable row level security;
revoke all on public.t3a_s1_access_audit from anon, authenticated;

-- A Stage 1 confirmer has accessed the Stage 1 record by confirming it.
create or replace function public.t3a_s1_audit_confirmer() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.t3a_s1_access_audit (participant_id, dimension_id, reader_id, basis, route) values (new.participant_id, new.dimension_id, new.confirmed_by, 'confirmer', 'confirmation');
  return new;
end $fn$;
drop trigger if exists t3a_9_s1_audit_confirmer_trg on public.t3a_d1_s1_confirmation;
create trigger t3a_9_s1_audit_confirmer_trg after insert on public.t3a_d1_s1_confirmation for each row execute function public.t3a_s1_audit_confirmer();

-- The logged read route now writes the access audit on every successful read.
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
  insert into public.t3a_s1_access_audit (participant_id, dimension_id, reader_id, basis, route) values (p_participant, p_dimension, v_reader, d ->> 'reason', coalesce(p_route, 'unknown'));
  return jsonb_build_object('outcome', 'read', 'basis', d ->> 'reason',
    'responses', coalesce((select jsonb_agg(to_jsonb(x) order by x.reveal_ordinal) from public.t3a_d1_s1_reveal_response x join public.t3a_d1_ai_administration_run r on r.ai_administration_run_id = x.ai_administration_run_id where r.participant_id = p_participant and r.dimension_id = p_dimension), '[]'::jsonb),
    'determinations', coalesce((select jsonb_agg(to_jsonb(x) order by x.captured_at) from public.t3a_d1_s1_determination x where x.participant_id = p_participant and x.dimension_id = p_dimension), '[]'::jsonb),
    'confirmation', coalesce((select jsonb_agg(to_jsonb(x) order by x.captured_at) from public.t3a_d1_s1_confirmation x where x.participant_id = p_participant and x.dimension_id = p_dimension), '[]'::jsonb));
end $fn$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Assignments and the rotation check
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_observer_assignment (
  assignment_seq    bigint generated always as identity primary key,
  participant_id    uuid not null,
  dimension_id      text not null,
  stage_code        text not null check (stage_code in ('S1', 'S2', 'S3', 'S4')),
  mentor_id         uuid not null,
  group_composition text,
  assigned_at       timestamptz not null default now()
);
create index if not exists t3a_observer_assignment_pds_idx on public.t3a_observer_assignment (participant_id, dimension_id, stage_code, assignment_seq desc);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_observer_assignment;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_observer_assignment for each row execute function public.t3a_deny_mutation();
alter table public.t3a_observer_assignment enable row level security;
revoke all on public.t3a_observer_assignment from anon, authenticated;

-- Checks in order, stricter first: Stage 1 access (Stage 2 only), Stage 4 composition, then the consecutive repeat. Order is by transaction sequence, never by clock.
create or replace function public.t3a_observer_rotation_check(p_mentor uuid, p_participant uuid, p_dimension text, p_stage text, p_composition text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v_prev uuid;
begin
  if p_stage = 'S2' and exists (select 1 from public.t3a_s1_access_audit a where a.participant_id = p_participant and a.dimension_id = p_dimension and a.reader_id = p_mentor) then
    return jsonb_build_object('allowed', false, 'reason', 'OBSERVER_HAS_STAGE1_ACCESS');
  end if;
  if p_stage = 'S4' then
    if p_composition is null or btrim(p_composition) = '' then return jsonb_build_object('allowed', false, 'reason', 'S4_COMPOSITION_MISSING'); end if;
    if exists (select 1 from public.t3a_observer_assignment x where x.participant_id = p_participant and x.dimension_id = p_dimension and x.stage_code = 'S4' and x.group_composition = p_composition) then
      return jsonb_build_object('allowed', false, 'reason', 'S4_COMPOSITION_REPEATED');
    end if;
  end if;
  select x.mentor_id into v_prev from public.t3a_observer_assignment x
    where x.participant_id = p_participant and x.dimension_id = p_dimension and x.stage_code = p_stage order by x.assignment_seq desc limit 1;
  if v_prev is not null and v_prev = p_mentor then return jsonb_build_object('allowed', false, 'reason', 'OBSERVER_REPEATS_PRECEDING_ATTEMPT'); end if;
  return jsonb_build_object('allowed', true);
end $fn$;
revoke all on function public.t3a_observer_rotation_check(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_observer_rotation_check(uuid, uuid, text, text, text) to service_role;

-- The planner picks the observer. The participant never does. A mentor must pass the observer gate (authorization, calibration, conflicts) and rotation.
-- The mentor with the fewest assignments is taken first, then the lowest identifier, so the choice is repeatable.
create or replace function public.t3a_observer_plan(p_participant uuid, p_dimension text, p_stage text, p_composition text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare m record; v_rot jsonb; v_first text; v_n int := 0;
begin
  if not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('observer.plan', 'SERVICE_ONLY', coalesce(p_participant::text, ''), 'only the planner assigns an observer');
  end if;
  if p_stage not in ('S1', 'S2', 'S3', 'S4') then return public.t3a_capture_refuse('observer.plan', 'STAGE_NOT_KNOWN', coalesce(p_stage, ''), 'unknown Stage'); end if;
  if p_stage = 'S4' and (p_composition is null or btrim(p_composition) = '') then
    return public.t3a_capture_refuse('observer.plan', 'S4_COMPOSITION_MISSING', p_participant::text, 'a Stage 4 attempt needs its composition record before entry');
  end if;
  for m in select a.mentor_id from public.t3a_mentor_authorization a where a.dimension_id::text = p_dimension and a.mentor_id <> p_participant group by a.mentor_id
            order by (select count(*) from public.t3a_observer_assignment x where x.mentor_id = a.mentor_id), a.mentor_id loop
    if (public.t3a_mentor_may_observe(m.mentor_id, p_dimension, p_participant) ->> 'authorized')::boolean is not true
       or (public.t3a_mentor_may_observe(m.mentor_id, p_dimension, p_participant) ->> 'conflict_open')::boolean is true then continue; end if;
    v_rot := public.t3a_observer_rotation_check(m.mentor_id, p_participant, p_dimension, p_stage, p_composition);
    if (v_rot ->> 'allowed')::boolean then
      insert into public.t3a_observer_assignment (participant_id, dimension_id, stage_code, mentor_id, group_composition) values (p_participant, p_dimension, p_stage, m.mentor_id, p_composition);
      return jsonb_build_object('outcome', 'assigned', 'mentor_id', m.mentor_id, 'stage', p_stage);
    end if;
    v_n := v_n + 1; v_first := coalesce(v_first, v_rot ->> 'reason');
  end loop;
  return public.t3a_capture_refuse('observer.plan', 'NO_ELIGIBLE_OBSERVER', p_participant::text || ' ' || p_dimension || ' ' || p_stage,
    'no authorized mentor passes rotation' || case when v_n > 0 then ' (' || v_n || ' excluded, first: ' || v_first || ')' else '' end);
end $fn$;
revoke all on function public.t3a_observer_plan(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_observer_plan(uuid, text, text, text) to service_role;
