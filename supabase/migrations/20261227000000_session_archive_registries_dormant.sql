-- Session Archive (internal prefix lsa): the seven versioned registries and the state mapping, as one append only record table.
-- T3A-DEV-REQ-LSA-001 v1.14 Sections 7 and 12.1. Dormant: every record loads as draft_for_approval, nothing here is active, and a record
-- cannot become active while the activation flag is off. Building is not enabling.
--
-- Flags (v1.14, CORR-001 b): `lsa_activation` gates activation and `lsa_retention_sweep` gates automated deletion. Both are read from the
-- configuration table, default off, and anything other than the exact value 'on' reads as off. This step sets neither.

create table if not exists public.t3a_lsa_registry_record (
  lsa_registry_record_id uuid primary key default gen_random_uuid(),
  registry text not null check (registry in ('families','direction_rules','sufficiency_rules','entries','history_rules','dimension_rules','dimension_entries','state_mapping')),
  record_key text not null,
  version int not null check (version >= 1),
  dimension_id text check (dimension_id is null or dimension_id ~ '^D[0-9]{1,2}$'),
  status text not null default 'draft_for_approval' check (status in ('draft_for_approval','active','retired')),
  effective_from date, effective_to date,
  approved_by text, approved_at timestamptz,
  package_id text,
  body jsonb not null,
  loaded_at timestamptz not null default now(),
  unique (registry, record_key, version),
  -- an active record carries a recorded approval and an effective date; a draft carries neither
  check (status <> 'active' or (approved_by is not null and approved_at is not null and effective_from is not null)),
  check (status <> 'draft_for_approval' or (approved_by is null and approved_at is null))
);
alter table public.t3a_lsa_registry_record enable row level security;
revoke all on public.t3a_lsa_registry_record from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_lsa_registry_record;
create trigger t3a_append_only before update or delete on public.t3a_lsa_registry_record for each row execute function public.t3a_deny_mutation();

create or replace function public.t3a_lsa_flag(p_flag text) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_flag in ('lsa_activation', 'lsa_retention_sweep')
     and coalesce((select btrim(configuration_value) from public.t3a_configuration_value where configuration_key = p_flag order by configuration_seq desc limit 1), '') = 'on'
$fn$;
revoke all on function public.t3a_lsa_flag(text) from public, anon, authenticated;
grant execute on function public.t3a_lsa_flag(text) to service_role;

-- an active record cannot be written while activation is off: refuse, log, write nothing
create or replace function public.t3a_lsa_registry_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'active' and not public.t3a_lsa_flag('lsa_activation') then
    perform public.t3a_capture_refuse('lsa.registry', 'lsa_not_activated', new.registry || ':' || new.record_key, 'an active registry record cannot be written while the activation flag is off');
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_lsa_registry_guard_trg on public.t3a_lsa_registry_record;
create trigger t3a_0_lsa_registry_guard_trg before insert on public.t3a_lsa_registry_record for each row execute function public.t3a_lsa_registry_guard();

-- the loader: service route only; every record of a package loads as a draft. A record that names an approval, or any status but a draft, refuses the whole package.
create or replace function public.t3a_lsa_load_package(p_package jsonb) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare reg text; r jsonb; n int := 0; pid text := p_package ->> 'package_id'; dim text := p_package ->> 'dimension_id'; keyf text;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('lsa.load', 'service_route_only', coalesce(pid, ''), 'the package loader is the service route only'); end if;
  if pid is null then return public.t3a_capture_refuse('lsa.load', 'package_invalid', '', 'no package_id'); end if;
  for reg in select unnest(array['families','direction_rules','sufficiency_rules','entries','history_rules','dimension_rules','dimension_entries']) loop
    for r in select * from jsonb_array_elements(coalesce(p_package -> 'registries' -> reg, '[]'::jsonb)) loop
      if coalesce(r ->> 'status', '') <> 'draft_for_approval' or r ->> 'approved_by' is not null or r ->> 'approved_at' is not null then
        return public.t3a_capture_refuse('lsa.load', 'record_not_a_draft', pid, reg || ': ' || coalesce(r ->> 'status', 'null'));
      end if;
    end loop;
  end loop;
  for reg in select unnest(array['families','direction_rules','sufficiency_rules','entries','history_rules','dimension_rules','dimension_entries']) loop
    keyf := case reg when 'families' then 'family_id' when 'direction_rules' then 'rule_id' when 'sufficiency_rules' then 'rule_id' when 'entries' then 'entry_id'
                     when 'history_rules' then 'rule_id' when 'dimension_rules' then 'rule_id' else 'entry_id' end;
    for r in select * from jsonb_array_elements(coalesce(p_package -> 'registries' -> reg, '[]'::jsonb)) loop
      insert into public.t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, package_id, body)
        values (reg, r ->> keyf, coalesce((r ->> 'version')::int, 1), coalesce(r ->> 'dimension_id', dim), 'draft_for_approval', pid, r);
      n := n + 1;
    end loop;
  end loop;
  if p_package ? 'state_mapping' then
    insert into public.t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, package_id, body)
      select 'state_mapping', k, 1, dim, 'draft_for_approval', pid, v from jsonb_each(p_package -> 'state_mapping') x(k, v);
    n := n + (select count(*) from jsonb_object_keys(p_package -> 'state_mapping'));
  end if;
  return jsonb_build_object('outcome', 'loaded', 'package_id', pid, 'records', n, 'status', 'draft_for_approval');
end $fn$;
revoke all on function public.t3a_lsa_load_package(jsonb) from public, anon, authenticated;
grant execute on function public.t3a_lsa_load_package(jsonb) to service_role;
