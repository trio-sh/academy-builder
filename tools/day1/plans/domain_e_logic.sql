-- ---------------------------------------------------------------------------------------------
-- Domain E behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

alter table public.t3a_capture_config add column if not exists enforce_sequence boolean not null default false;
comment on column public.t3a_capture_config.enforce_sequence is 'Domain E: when true, S2 Stage entry needs the S1 outcome delivered to the mentor (DT-19). Off until the live S1 flow writes t3a_stage_sequence (CR-047).';

create table if not exists public.t3a_capture_refusal (
  refusal_id uuid primary key default gen_random_uuid(),
  route text not null,
  reason_code text not null,
  subject_ref text,
  detail text,
  refused_at timestamptz not null default now()
);
comment on table public.t3a_capture_refusal is 'Refused capture attempts that reached a function route (DT-15, DT-18, DT-20, DT-21). A refusal is written and returned, not raised, so the log is kept.';
drop trigger if exists t3a_append_only on public.t3a_capture_refusal;
create trigger t3a_append_only before update or delete on public.t3a_capture_refusal for each row execute function public.t3a_deny_mutation();
alter table public.t3a_capture_refusal enable row level security;
revoke all on public.t3a_capture_refusal from anon, authenticated;

create or replace function public.t3a_capture_refuse(p_route text, p_reason text, p_subject text, p_detail text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  insert into public.t3a_capture_refusal (route, reason_code, subject_ref, detail) values (p_route, p_reason, left(p_subject, 120), p_detail);
  return jsonb_build_object('outcome', 'refused', 'reason', p_reason, 'detail', p_detail);
end $$;

-- Set once: a milestone time, once written, never changes and never clears.
create or replace function public.t3a_set_once() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(old)->>c is not null and to_jsonb(new)->c is distinct from to_jsonb(old)->c then
      raise exception 'T3A_SET_ONCE: % was set at % and cannot change', c, to_jsonb(old)->>c using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists t3a_set_once_trg on public.t3a_stage_sequence;
create trigger t3a_set_once_trg before update on public.t3a_stage_sequence for each row
  execute function public.t3a_set_once('s1_outcome_delivered_to_mentor_at', 's2_determinations_locked_at', 's1_output_unmasked_at');

-- Observer rules (DT-15, DT-16). The trigger is the backstop for any route; t3a_commit_observation is the route that logs.
create or replace function public.t3a_observer_rules() returns trigger language plpgsql as $$
begin
  if new.stage_code::text = 'S1' and new.observer_id is not null then
    raise exception 'T3A_OBSERVER_NOT_ALLOWED_AT_S1: observer_id is not set on a Stage 1 record; use the confirmer fields (s1_human_confirmation_actor_id, s1_human_confirmation_at)' using errcode = '23514';
  end if;
  if new.stage_code::text in ('S2', 'S4') and new.observer_id is null and (select enforce_required from public.t3a_capture_config) then
    raise exception 'T3A_REQUIRED_FIELD_MISSING: observer_id is required on a % record', new.stage_code using errcode = '23502';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_observer_rules_trg on public.t3a_observation;
create trigger t3a_1_observer_rules_trg before insert on public.t3a_observation for each row execute function public.t3a_observer_rules();

-- One observation commit from a jsonb of column values. Refusals are logged and returned.
-- S2 and S4 need an observer; S1 must not carry one; the record must name a source version that has a hash and a served instance
-- whose rendered instance has a hash (DT-17: the source hash and the rendered hash are two different objects).
create or replace function public.t3a_commit_observation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
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
end $$;
revoke all on function public.t3a_commit_observation(jsonb) from public, anon, authenticated;
grant execute on function public.t3a_commit_observation(jsonb) to service_role;

-- Sequential unmasking (DT-18, DT-19).
create or replace function public.t3a_open_s1_output(p_stage_instance uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.t3a_stage_sequence;
begin
  select * into v from public.t3a_stage_sequence where stage_instance_id = p_stage_instance;
  if not found or v.s2_determinations_locked_at is null then
    return public.t3a_capture_refuse('s1_output.open', 'S2_DETERMINATIONS_NOT_LOCKED', p_stage_instance::text, 'the S1 output opens only after the S2 determinations are locked');
  end if;
  if v.s1_output_unmasked_at is null then
    update public.t3a_stage_sequence set s1_output_unmasked_at = now() where stage_instance_id = p_stage_instance;
  end if;
  return jsonb_build_object('outcome', 'opened', 's1_output_unmasked_at', (select s1_output_unmasked_at from public.t3a_stage_sequence where stage_instance_id = p_stage_instance));
end $$;
revoke all on function public.t3a_open_s1_output(uuid) from public, anon;
grant execute on function public.t3a_open_s1_output(uuid) to authenticated, service_role;

create or replace function public.t3a_s2_entry_needs_s1() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage_code::text <> 'S2' or not (select enforce_sequence from public.t3a_capture_config) then return new; end if;
  if not exists (select 1 from public.t3a_stage_sequence q where q.participant_id = new.participant_id and q.dimension_id = new.dimension_id
                  and q.s1_outcome_delivered_to_mentor_at is not null) then
    raise exception 'S1_OUTCOME_NOT_DELIVERED: Stage 2 entry waits for the Stage 1 outcome to be delivered to the mentor' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_s2_needs_s1_trg on public.t3a_stage_entry_event;
create trigger t3a_1_s2_needs_s1_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_s2_entry_needs_s1();

-- No free text to a mentor endpoint (DT-20, DT-21). Only controlled keys, with codes or identifiers as values.
create or replace function public.t3a_mentor_input_guard(p_route text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; bad text[] := '{}';
begin
  for k, v in select * from jsonb_each(p) loop
    if k ~* '(rationale|reason|conclusion|comment|note|free_?text|explanation|narrative)' and k !~* '_code$' then bad := bad || k;
    elsif jsonb_typeof(v) = 'string' and (v #>> '{}') !~ '^[A-Za-z0-9_.:-]{1,64}$' and (v #>> '{}') !~ '^[0-9a-fA-F-]{36}$' and (v #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then bad := bad || k;
    end if;
  end loop;
  if cardinality(bad) > 0 then
    return public.t3a_capture_refuse(p_route, case when exists (select 1 from unnest(bad) b where b ~* 'accommodation') then 'ACCOMMODATION_REASON_REFUSED' else 'FREE_TEXT_REFUSED' end,
      null, 'only controlled codes and identifiers are accepted; refused keys: ' || array_to_string(bad, ', '));
  end if;
  return jsonb_build_object('outcome', 'accepted');
end $$;
grant execute on function public.t3a_mentor_input_guard(text, jsonb) to authenticated, service_role;
revoke all on function public.t3a_mentor_input_guard(text, jsonb) from public, anon;

-- The live mentor tables hold two free text columns the package forbids (CR-014, CR-046). Both tables are empty in production.
create or replace function public.t3a_refuse_free_text() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new)->>c is not null then
      raise exception 'T3A_FREE_TEXT_REFUSED: % takes controlled codes only; free text is not stored', c using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists t3a_1_no_free_text_trg on public.t3a_mentor_judgment;
create trigger t3a_1_no_free_text_trg before insert or update on public.t3a_mentor_judgment for each row execute function public.t3a_refuse_free_text('decision_rationale', 'session_technical_issues');
drop trigger if exists t3a_1_no_free_text_trg on public.t3a_d1_progression_decision;
create trigger t3a_1_no_free_text_trg before insert or update on public.t3a_d1_progression_decision for each row execute function public.t3a_refuse_free_text('rationale');
