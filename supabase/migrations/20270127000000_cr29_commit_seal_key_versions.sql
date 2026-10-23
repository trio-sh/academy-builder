-- CR-29 (Rev 1.6): the commit seal key. Sandbox: the Vault held key stands (version k1, mode vault_shared).
-- Every seal records its key version (column already present; now used). Verification reads the key of the seal's own version,
-- so the key can be rotated without breaking earlier seals. The signing key is never exposed to participants or staff routes.
-- Activation refuses while the current key version is the shared Vault key; a key-pair version (mode key_pair) must be current first.

create table if not exists public.t3a_commit_seal_key_version (
  key_version text primary key,
  mode text not null check (mode in ('vault_shared', 'key_pair')),
  secret_name text not null,
  public_key text,
  status text not null default 'retired' check (status in ('current', 'retired')),
  created_at timestamptz not null default now(),
  check (mode <> 'key_pair' or public_key is not null)
);
alter table public.t3a_commit_seal_key_version enable row level security;
revoke all on public.t3a_commit_seal_key_version from anon, authenticated;
create unique index if not exists t3a_commit_seal_key_version_one_current on public.t3a_commit_seal_key_version ((true)) where status = 'current';

insert into public.t3a_commit_seal_key_version(key_version, mode, secret_name, status)
  values ('k1', 'vault_shared', 't3a_commit_seal_key', 'current')
  on conflict (key_version) do nothing;

create or replace function public.t3a_commit_seal_key_for(p_version text) returns text
language plpgsql stable security definer set search_path = public as $fn$
declare k text; sn text;
begin
  select secret_name into sn from public.t3a_commit_seal_key_version where key_version = p_version;
  if sn is null then return null; end if;
  if to_regclass('vault.decrypted_secrets') is not null then
    execute $q$ select decrypted_secret from vault.decrypted_secrets where name = $1 order by created_at desc limit 1 $q$ into k using sn;
    if nullif(k, '') is not null then return k; end if;
  end if;
  return nullif(current_setting('t3a.' || regexp_replace(sn, '^t3a_', ''), true), '');
end $fn$;
revoke all on function public.t3a_commit_seal_key_for(text) from public, anon, authenticated;

create or replace function public.t3a_commit_seal_current_version() returns text
language sql stable security definer set search_path = public as $fn$
  select key_version from public.t3a_commit_seal_key_version where status = 'current'
$fn$;
revoke all on function public.t3a_commit_seal_current_version() from public, anon, authenticated;
grant execute on function public.t3a_commit_seal_current_version() to service_role;

-- the legacy zero-argument reader now means "the current version's key"
create or replace function public.t3a_commit_seal_key() returns text
language sql stable security definer set search_path = public as $fn$
  select public.t3a_commit_seal_key_for(public.t3a_commit_seal_current_version())
$fn$;

create or replace function public.t3a_seal_composed(p_composed uuid, p_superseding boolean default false) returns void
language plpgsql security definer set search_path = public, extensions as $fn$
declare v text := public.t3a_commit_seal_current_version(); k text := public.t3a_commit_seal_key_for(v); pl text := public.t3a_commit_payload(p_composed); c public.t3a_dimension_composed_statement;
begin
  if k is null then raise exception 'COMMIT_SEAL_KEY_UNLOADED'; end if;
  select * into c from public.t3a_dimension_composed_statement where composed_statement_id = p_composed;
  insert into public.t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal, key_version)
    values (p_composed, c.observation_ref, c.participant_id, c.dimension_id, p_superseding, encode(extensions.digest(pl, 'sha256'), 'hex'), encode(extensions.hmac(pl, k, 'sha256'), 'hex'), v);
end $fn$;

create or replace function public.t3a_verify_commit_seal(p_composed uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $fn$
declare s public.t3a_commit_seal; k text; pl text := public.t3a_commit_payload(p_composed);
begin
  select * into s from public.t3a_commit_seal where composed_statement_id = p_composed;
  if s.composed_statement_id is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_absent'); end if;
  if not exists (select 1 from public.t3a_commit_seal_key_version where key_version = s.key_version) then
    return jsonb_build_object('valid', false, 'reason', 'commit_seal_key_version_unknown');
  end if;
  k := public.t3a_commit_seal_key_for(s.key_version);
  if k is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_key_unloaded'); end if;
  if encode(extensions.hmac(pl, k, 'sha256'), 'hex') <> s.seal then return jsonb_build_object('valid', false, 'reason', 'commit_seal_invalid'); end if;
  return jsonb_build_object('valid', true, 'key_version', s.key_version);
end $fn$;

-- rotation: service route only. The new version's key must already be loaded; the old version stays for verification.
create or replace function public.t3a_commit_seal_rotate(p_new_version text, p_secret_name text, p_mode text default 'vault_shared', p_public_key text default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('commit.seal_rotate', 'service_route_only', coalesce(p_new_version, ''), 'rotation is the service route only'); end if;
  if exists (select 1 from public.t3a_commit_seal_key_version where key_version = p_new_version) then
    return public.t3a_capture_refuse('commit.seal_rotate', 'key_version_exists', p_new_version, 'a key version is never reused');
  end if;
  if p_new_version !~ '^[a-z0-9_]+$' or p_mode not in ('vault_shared', 'key_pair') or (p_mode = 'key_pair' and nullif(p_public_key, '') is null) then
    return public.t3a_capture_refuse('commit.seal_rotate', 'key_mode_invalid', p_new_version, 'mode or public key invalid');
  end if;
  insert into public.t3a_commit_seal_key_version(key_version, mode, secret_name, public_key, status) values (p_new_version, p_mode, p_secret_name, p_public_key, 'retired');
  if public.t3a_commit_seal_key_for(p_new_version) is null then
    delete from public.t3a_commit_seal_key_version where key_version = p_new_version;
    return public.t3a_capture_refuse('commit.seal_rotate', 'new_key_unloaded', p_new_version, 'the new key is not loaded');
  end if;
  update public.t3a_commit_seal_key_version set status = 'retired' where status = 'current';
  update public.t3a_commit_seal_key_version set status = 'current' where key_version = p_new_version;
  return jsonb_build_object('outcome', 'rotated', 'key_version', p_new_version);
end $fn$;
revoke all on function public.t3a_commit_seal_rotate(text, text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_commit_seal_rotate(text, text, text, text) to service_role;

-- activation refuses while the shared Vault key is the current key
create or replace function public.t3a_cr29_activation_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.configuration_key = 'lsa_activation' and btrim(new.configuration_value) = 'on'
     and not exists (select 1 from public.t3a_commit_seal_key_version where status = 'current' and mode = 'key_pair') then
    perform public.t3a_capture_refuse('lsa.activation', 'commit_seal_key_pair_not_in_place', 'lsa_activation', 'activation refuses while the shared Vault seal key is in use');
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_cr29_activation_guard_trg on public.t3a_configuration_value;
create trigger t3a_0_cr29_activation_guard_trg before insert on public.t3a_configuration_value for each row execute function public.t3a_cr29_activation_guard();
