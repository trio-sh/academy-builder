-- Day 1 Domain O: registry assets, change requests, configuration and manifest verification (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_o.py
-- and tools/day1/plans/domain_o_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py O      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 20 fields into t3a_field_physical_map.

-- shared helpers for Day 1 domain tables (idempotent)
create or replace function public.t3a_deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'T3A_APPEND_ONLY: updates and deletes are refused; write a superseding record'; end $$;

create or replace function public.t3a_refuse_column_change() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new)->c is distinct from to_jsonb(old)->c then
      raise exception 'T3A_IMMUTABLE_COLUMN: % cannot change after it is written', c;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_capture_state_fill() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array tg_argv loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->>col is not null then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'captured'));
    elsif to_jsonb(new)->>cs = 'captured' then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'not_captured'));
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_socket_closed() returns trigger language plpgsql as $$
begin raise exception 'T3A_SOCKET_ROUTE_CLOSED: % is a SOCKET structure; capture is not enabled', tg_table_name; end $$;

create table if not exists public.t3a_capture_config (
  singleton boolean primary key default true check (singleton),
  enforce_required boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.t3a_capture_config (singleton) values (true) on conflict do nothing;
alter table public.t3a_capture_config enable row level security;
revoke all on public.t3a_capture_config from anon, authenticated;

create or replace function public.t3a_require_fields() returns trigger language plpgsql as $$
declare c text;
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  foreach c in array tg_argv loop
    if to_jsonb(new)->c is null or to_jsonb(new)->c = 'null'::jsonb then
      raise exception 'T3A_REQUIRED_FIELD_MISSING: % is required on %', c, tg_table_name using errcode = '23502';
    end if;
  end loop;
  return new;
end $$;


create table if not exists public.t3a_registry_asset (
  asset_id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  current_version text not null,
  previous_version text,
  deployment_status text not null,
  updated_at timestamptz not null default now(),
  check (asset_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  check (current_version is null or current_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (previous_version is null or previous_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (previous_version is null or previous_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (deployment_status ~ '^[a-z][a-z_]{1,31}$')
);

comment on table public.t3a_registry_asset is 'Domain O registry assets: the current and previous version of each governed asset. Moves only through a change request.';

drop trigger if exists t3a_immutable_columns on public.t3a_registry_asset;
create trigger t3a_immutable_columns before update on public.t3a_registry_asset for each row execute function public.t3a_refuse_column_change('asset_id', 'asset_type');

alter table public.t3a_registry_asset enable row level security;
revoke all on public.t3a_registry_asset from anon, authenticated;

create table if not exists public.t3a_change_request (
  asset_id uuid not null references public.t3a_registry_asset(asset_id),
  change_request_id uuid primary key default gen_random_uuid(),
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  compatibility_class text not null,
  version_change_reason text not null,
  approval_authority text not null,
  version_hash char(64) not null,
  check (compatibility_class in ('A', 'B', 'C')),
  check (length(btrim(version_change_reason)) > 0),
  check (length(btrim(approval_authority)) > 0),
  check (version_hash is null or version_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.t3a_change_request is 'Domain O change requests: who changed which asset, when, why, to what version, and under whose approval. Insert only.';

drop trigger if exists t3a_append_only on public.t3a_change_request;
create trigger t3a_append_only before update or delete on public.t3a_change_request for each row execute function public.t3a_deny_mutation();

alter table public.t3a_change_request enable row level security;
revoke all on public.t3a_change_request from anon, authenticated;

create table if not exists public.t3a_configuration_value (
  configuration_key text not null,
  configuration_value text not null,
  configuration_version text not null,
  set_by uuid not null,
  set_at timestamptz not null default now(),
  configuration_seq bigint generated always as identity primary key,
  check (configuration_key ~ '^[a-z][a-z0-9_.]{1,95}$'),
  check (configuration_version is null or configuration_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_configuration_value is 'Domain O configuration: each value is a row; the current value is the latest. A key with no row is unset and its route refuses; nothing defaults.';

drop trigger if exists t3a_append_only on public.t3a_configuration_value;
create trigger t3a_append_only before update or delete on public.t3a_configuration_value for each row execute function public.t3a_deny_mutation();

alter table public.t3a_configuration_value enable row level security;
revoke all on public.t3a_configuration_value from anon, authenticated;

create table if not exists public.t3a_manifest_verification (
  manifest_ref text not null,
  verification_result text not null check (verification_result in ('pass', 'fail')),
  manifest_signature text not null,
  manifest_verified_at timestamptz not null default now(),
  verification_id uuid primary key default gen_random_uuid()
);

comment on table public.t3a_manifest_verification is 'Domain O manifest verification results, including failures. Production manifests verify only against the production public key.';

drop trigger if exists t3a_append_only on public.t3a_manifest_verification;
create trigger t3a_append_only before update or delete on public.t3a_manifest_verification for each row execute function public.t3a_deny_mutation();

alter table public.t3a_manifest_verification enable row level security;
revoke all on public.t3a_manifest_verification from anon, authenticated;

-- t3a_provenance: extended in place (existing rows are kept)

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'O.asset_id', 'M5', 't3a_registry_asset', 'asset_id', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.asset_type', 'M5', 't3a_registry_asset', 'asset_type', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.current_version', 'M5', 't3a_registry_asset', 'current_version', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.previous_version', 'M5', 't3a_registry_asset', 'previous_version', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.deployment_status', 'M5', 't3a_registry_asset', 'deployment_status', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.change_request_id', 'M5', 't3a_change_request', 'change_request_id', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.changed_by', 'M5', 't3a_change_request', 'changed_by', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.changed_at', 'M5', 't3a_change_request', 'changed_at', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.compatibility_class', 'M5', 't3a_change_request', 'compatibility_class', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.version_change_reason', 'M5', 't3a_change_request', 'version_change_reason', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.approval_authority', 'M5', 't3a_change_request', 'approval_authority', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.version_hash', 'M5', 't3a_change_request', 'version_hash', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.configuration_key', 'M5', 't3a_configuration_value', 'configuration_key', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.configuration_value', 'M5', 't3a_configuration_value', 'configuration_value', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.configuration_version', 'M5', 't3a_configuration_value', 'configuration_version', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.set_by', 'M5', 't3a_configuration_value', 'set_by', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.set_at', 'M5', 't3a_configuration_value', 'set_at', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.manifest_signature', 'M5', 't3a_manifest_verification', 'manifest_signature', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.manifest_verified_at', 'M5', 't3a_manifest_verification', 'manifest_verified_at', null, 'day1-domain-O-generator', now(), null),
  ('1.3', 'O.dimension_schema_version', 'M1', 't3a_provenance', 'dimension_schema_version', null, 'day1-domain-O-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain O behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

-- Registry assets move only through a change request: previous_version becomes the old current_version, and the request records who and why.
create or replace function public.t3a_registry_asset_change() returns trigger language plpgsql as $$
begin
  if new.current_version is distinct from old.current_version then
    new.previous_version := old.current_version;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_registry_asset_change_trg on public.t3a_registry_asset;
create trigger t3a_1_registry_asset_change_trg before update on public.t3a_registry_asset for each row execute function public.t3a_registry_asset_change();

create or replace function public.t3a_register_change(p_asset uuid, p_new_version text, p_by uuid, p_reason text, p_authority text, p_compat text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('registry.change', 'SERVICE_CONTEXT_REQUIRED', p_asset::text, 'registry assets change only through the service route');
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 or p_authority is null or length(btrim(p_authority)) = 0 then
    return public.t3a_capture_refuse('registry.change', 'REASON_AND_AUTHORITY_REQUIRED', p_asset::text, 'a change needs its reason and its approval authority');
  end if;
  insert into public.t3a_change_request (asset_id, changed_by, compatibility_class, version_change_reason, approval_authority, version_hash)
    values (p_asset, p_by, p_compat, p_reason, p_authority, p_hash) returning change_request_id into v_id;
  update public.t3a_registry_asset set current_version = p_new_version where asset_id = p_asset;
  return jsonb_build_object('outcome', 'changed', 'change_request_id', v_id);
end $$;
revoke all on function public.t3a_register_change(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_register_change(uuid, text, uuid, text, text, text, text) to service_role;

-- Configuration: set by the service route; read by key. An unset key refuses visibly and is logged. It never returns a default (DT-39).
create or replace function public.t3a_config_set(p_key text, p_value text, p_version text, p_by uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_CONFIG_SERVICE_ONLY: configuration is set by the service route only' using errcode = '42501'; end if;
  insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by) values (p_key, p_value, p_version, p_by) returning configuration_seq into v;
  return v;
end $$;
revoke all on function public.t3a_config_set(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_config_set(text, text, text, uuid) to service_role;

create or replace function public.t3a_config_get(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.t3a_configuration_value;
begin
  select * into v from public.t3a_configuration_value where configuration_key = p_key order by configuration_seq desc limit 1;
  if not found then
    return public.t3a_capture_refuse('configuration.read', 'CONFIGURATION_UNSET', p_key, 'a required configuration value is not set; the route refuses and does not default');
  end if;
  return jsonb_build_object('outcome', 'set', 'value', v.configuration_value, 'version', v.configuration_version);
end $$;
revoke all on function public.t3a_config_get(text) from public, anon;
grant execute on function public.t3a_config_get(text) to authenticated, service_role;

-- Manifest verification: a failure is recorded as a failure, with the event system.manifest_verified.
create or replace function public.t3a_record_manifest_verification(p_manifest text, p_signature text, p_valid boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  insert into public.t3a_manifest_verification (manifest_ref, verification_result, manifest_signature) values (p_manifest, case when p_valid then 'pass' else 'fail' end, p_signature) returning verification_id into v;
  return v;
end $$;
revoke all on function public.t3a_record_manifest_verification(text, text, boolean) from public, anon, authenticated;
grant execute on function public.t3a_record_manifest_verification(text, text, boolean) to service_role;
