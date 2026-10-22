-- CORR-007 Rev 1.6 rule CR-17: retake pools and source selection at a retake.
-- The pool of a source is never encoded in its identifier. It comes from a signed pool map per dimension, loaded here as rows
-- (map identifier, SHA-256 of the signed file, one row per source version and pool); a source missing from the map, or a value outside the
-- four pools, refuses (RETAKE_POOL_MISSING_OR_INVALID). A source moves between pools only by a later row (a recorded, versioned change).
-- The engine reads the attempt number from the attempt record, draws from the matching pool among approved sources the participant has not
-- met and whose interaction pattern family they have not met, borrows from the other pools in order, falls back to an unmet source of a met
-- family (not comparable) only when nothing else is left, and never serves a met source again. The selection log keeps only the selected
-- source, the policy receipt and the seed.

create table if not exists public.t3a_retake_pool_map (
  map_seq bigint generated always as identity primary key,
  map_identifier text not null,
  map_sha256 text not null check (map_sha256 ~ '^[0-9a-f]{64}$'),
  dimension_id text not null,
  source_key text not null,           -- source identifier and version, as the signed map lists them: SRC-D2-S1-001@2.1
  retake_pool text not null check (retake_pool in ('first_attempt', 'retake_1', 'retake_2', 'retake_3')),
  loaded_at timestamptz not null default now()
);
create index if not exists t3a_retake_pool_map_key on public.t3a_retake_pool_map (source_key, map_seq desc);
drop trigger if exists t3a_append_only on public.t3a_retake_pool_map;
create trigger t3a_append_only before update or delete on public.t3a_retake_pool_map for each row execute function public.t3a_deny_mutation();
alter table public.t3a_retake_pool_map enable row level security;
revoke all on public.t3a_retake_pool_map from anon, authenticated;

create table if not exists public.t3a_source_selection_log (
  selection_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  dimension_id text not null,
  stage_code text not null,
  attempt_number int not null,
  selected_source_version_id uuid not null,
  policy_receipt text not null,
  seed bigint not null,
  selected_pool text not null,
  selection_reason text,
  comparison text not null check (comparison in ('by_family', 'not_eligible')),
  selected_at timestamptz not null default now()
);
comment on table public.t3a_source_selection_log is 'CR-17: only the selected source, the policy receipt and the seed. No excluded identifier and no reason for an exclusion is ever written.';
drop trigger if exists t3a_append_only on public.t3a_source_selection_log;
create trigger t3a_append_only before update or delete on public.t3a_source_selection_log for each row execute function public.t3a_deny_mutation();
alter table public.t3a_source_selection_log enable row level security;
revoke all on public.t3a_source_selection_log from anon, authenticated;

-- Load one signed pool map. All or nothing: any value outside the four pools refuses and nothing is written.
create or replace function public.t3a_retake_pool_load(p_map_identifier text, p_dimension text, p_map_sha256 text, p_sources jsonb) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare e record; n int := 0;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_RETAKE_POOL_SERVICE_ONLY: pool maps are loaded by the service route only' using errcode = '42501'; end if;
  if p_sources is null or jsonb_typeof(p_sources) <> 'object' or p_map_sha256 !~ '^[0-9a-f]{64}$' then
    return public.t3a_capture_refuse('retake_pool.load', 'RETAKE_POOL_MISSING_OR_INVALID', coalesce(p_map_identifier, ''), 'a pool map is an object of source keys and pools, with the SHA-256 of the signed file');
  end if;
  for e in select key, value #>> '{}' as pool from jsonb_each(p_sources) loop
    if e.pool is null or e.pool not in ('first_attempt', 'retake_1', 'retake_2', 'retake_3') then
      return public.t3a_capture_refuse('retake_pool.load', 'RETAKE_POOL_MISSING_OR_INVALID', e.key, 'the pool of ' || e.key || ' is missing or outside the four pools; nothing was loaded');
    end if;
  end loop;
  for e in select key, value #>> '{}' as pool from jsonb_each(p_sources) loop
    insert into public.t3a_retake_pool_map (map_identifier, map_sha256, dimension_id, source_key, retake_pool) values (p_map_identifier, p_map_sha256, p_dimension, e.key, e.pool);
    n := n + 1;
  end loop;
  return jsonb_build_object('outcome', 'loaded', 'sources', n);
end $fn$;
revoke all on function public.t3a_retake_pool_load(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.t3a_retake_pool_load(text, text, text, jsonb) to service_role;

create or replace function public.t3a_retake_pool_of(p_source_key text) returns text language sql stable security definer set search_path = public as $fn$
  select retake_pool from public.t3a_retake_pool_map where source_key = p_source_key order by map_seq desc limit 1
$fn$;
revoke all on function public.t3a_retake_pool_of(text) from public, anon, authenticated;
grant execute on function public.t3a_retake_pool_of(text) to service_role;

-- Before sources of a signed package are loaded: every one must have a pool in the loaded map.
create or replace function public.t3a_source_load_check(p_source_keys text[]) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare k text;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_RETAKE_POOL_SERVICE_ONLY: sources are loaded by the service route only' using errcode = '42501'; end if;
  foreach k in array coalesce(p_source_keys, '{}') loop
    if public.t3a_retake_pool_of(k) is null then
      return public.t3a_capture_refuse('source.load', 'RETAKE_POOL_MISSING_OR_INVALID', k, k || ' has no pool in the loaded pool map; the source does not load');
    end if;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $fn$;
revoke all on function public.t3a_source_load_check(text[]) from public, anon, authenticated;
grant execute on function public.t3a_source_load_check(text[]) to service_role;

-- Every approved, active, current source of the dimension and Stage that has a pool, with what the participant has met.
create or replace function public.t3a_source_candidates(p_participant uuid, p_dimension text, p_stage text)
returns table (source_version_id uuid, retake_pool text, source_met boolean, form_met boolean, family_met boolean)
language sql stable security definer set search_path = public as $fn$
  select v.content_version_id,
         public.t3a_retake_pool_of(o.identifier || '@' || regexp_replace(v.version_no, '^v', '')),
         (x.ex -> 'reasons') ? 'source_version_met',
         (x.ex -> 'reasons') ? 'administration_form_met',
         (x.ex -> 'reasons') ? 'pattern_family_met'
    from public.t3a_d1_content_version v
    join public.t3a_content_object o on o.content_object_id = v.content_object_id
    cross join lateral (select public.t3a_prior_exposure(p_participant, v.content_version_id) as ex) x
   where o.family = 'source' and o.dimension_id::text = p_dimension and v.body ->> 'stage_code' = upper(p_stage)
     and v.approval_status = 'approved' and v.operational_state = 'active' and v.superseded_by is null and v.retired_at is null and o.retired_at is null
     and public.t3a_d1_source_version_approved(v.content_version_id)
     and public.t3a_retake_pool_of(o.identifier || '@' || regexp_replace(v.version_no, '^v', '')) is not null
$fn$;
revoke all on function public.t3a_source_candidates(uuid, text, text) from public, anon, authenticated;
grant execute on function public.t3a_source_candidates(uuid, text, text) to service_role;

create or replace function public.t3a_source_select(p_participant uuid, p_dimension text, p_stage text, p_seed bigint) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_pools text[] := array['first_attempt', 'retake_1', 'retake_2', 'retake_3'];
  v_stage public.t3a_stage_code := upper(p_stage)::public.t3a_stage_code;
  v_idx int; v_start int; v_order text[]; v_pick uuid; v_pool text; v_reason text; v_comp text := 'by_family'; k int;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_SOURCE_SELECT_SERVICE_ONLY: sources are selected by the service route only' using errcode = '42501'; end if;
  if upper(p_stage) = 'S4' and public.t3a_s4_activation_state() is null then
    return public.t3a_capture_refuse('source.select', 's4_not_activated', p_participant::text, 'Stage 4 entry is disabled behind s4_activation_state, which is not loaded');
  end if;
  -- the attempt number comes from the attempt record, never from the source
  select count(*)::int + 1 into v_idx from public.t3a_attempt_live a
   where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = v_stage and a.outcome = 'completed' and a.counted;
  v_start := least(v_idx - 1, 3);
  v_order := v_pools[v_start + 1:4] || v_pools[1:v_start];
  for k in 1 .. 4 loop
    select c.source_version_id into v_pick from public.t3a_source_candidates(p_participant, p_dimension, p_stage) c
     where c.retake_pool = v_order[k] and not c.source_met and not c.form_met and not c.family_met
     order by md5(p_seed::text || ':' || c.source_version_id::text) limit 1;
    if v_pick is not null then
      v_pool := v_order[k];
      v_reason := case when k = 1 then null when v_idx = 1 then 'first_attempt_pool_exhausted' else 'matching_pool_exhausted' end;
      exit;
    end if;
  end loop;
  if v_pick is null then
    -- founder decision of 20 October 2026: only when no source in any pool is both unmet and of an unmet family
    select c.source_version_id, c.retake_pool into v_pick, v_pool from public.t3a_source_candidates(p_participant, p_dimension, p_stage) c
     where not c.source_met and not c.form_met
     order by md5(p_seed::text || ':' || c.source_version_id::text) limit 1;
    if v_pick is not null then v_reason := 'family_exposure_fallback'; v_comp := 'not_eligible'; end if;
  end if;
  if v_pick is null then
    return public.t3a_capture_refuse('source.select', case when v_idx > 1 then 'RETAKE_SOURCE_UNAVAILABLE' else 'FIRST_ATTEMPT_SOURCE_UNAVAILABLE' end, p_participant::text,
      'no approved source the participant has not met exists; the participant is told no new situation is available yet');
  end if;
  insert into public.t3a_source_selection_log (participant_id, dimension_id, stage_code, attempt_number, selected_source_version_id, policy_receipt, seed, selected_pool, selection_reason, comparison)
  values (p_participant, p_dimension, upper(p_stage), v_idx, v_pick, 'CR-17 v1.2', p_seed, v_pool, v_reason, v_comp);
  return jsonb_build_object('outcome', 'selected', 'source_version_id', v_pick, 'pool', v_pool, 'reason', v_reason, 'comparison', v_comp, 'attempt_number', v_idx);
end $fn$;
revoke all on function public.t3a_source_select(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.t3a_source_select(uuid, text, text, bigint) to service_role;
