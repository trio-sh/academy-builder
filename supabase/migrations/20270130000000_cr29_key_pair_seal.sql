-- CR-29 (Rev 1.6) part b: before activation the commit seal is a signature made with a key pair. The commit service alone holds the private key (it is never in the database);
-- the database holds the public key and checks every signature (t3a_ed25519_verify). A seal in a key_pair version is written only with a valid signature over the commit payload.
-- Sealing is then two steps: the compose function records a seal request, and the service signs and stores. Until it has, the report cannot be issued (commit_seal_pending).
-- Versions in vault_shared mode (k1) behave exactly as before, and their earlier seals keep verifying under their own key.

create table if not exists public.t3a_commit_seal_request (
  composed_statement_id uuid primary key references public.t3a_dimension_composed_statement(composed_statement_id),
  observation_ref uuid not null,
  is_superseding boolean not null default false,
  requested_at timestamptz not null default now()
);
create unique index if not exists t3a_commit_seal_request_one_per_observation on public.t3a_commit_seal_request (observation_ref) where not is_superseding;
alter table public.t3a_commit_seal_request enable row level security;
revoke all on public.t3a_commit_seal_request from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_commit_seal_request;
create trigger t3a_append_only before update or delete on public.t3a_commit_seal_request for each row execute function public.t3a_deny_mutation();

-- "the signing key is loaded": for a key pair version the database holds no private key, so readiness is the version being current with a public key
create or replace function public.t3a_commit_seal_key() returns text language sql stable security definer set search_path = public as $fn$
  select case when kv.mode = 'key_pair' then 'key_pair:' || kv.key_version else public.t3a_commit_seal_key_for(kv.key_version) end
    from public.t3a_commit_seal_key_version kv where kv.status = 'current'
$fn$;

create or replace function public.t3a_seal_composed(p_composed uuid, p_superseding boolean default false) returns void
language plpgsql security definer set search_path = public, extensions as $fn$
declare kv public.t3a_commit_seal_key_version; k text; pl text := public.t3a_commit_payload(p_composed); c public.t3a_dimension_composed_statement;
begin
  select * into kv from public.t3a_commit_seal_key_version where status = 'current';
  select * into c from public.t3a_dimension_composed_statement where composed_statement_id = p_composed;
  if kv.mode = 'key_pair' then
    insert into public.t3a_commit_seal_request(composed_statement_id, observation_ref, is_superseding) values (p_composed, c.observation_ref, p_superseding) on conflict do nothing;
    return;
  end if;
  k := public.t3a_commit_seal_key_for(kv.key_version);
  if k is null then raise exception 'COMMIT_SEAL_KEY_UNLOADED'; end if;
  insert into public.t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal, key_version)
    values (p_composed, c.observation_ref, c.participant_id, c.dimension_id, p_superseding, encode(extensions.digest(pl, 'sha256'), 'hex'), encode(extensions.hmac(pl, k, 'sha256'), 'hex'), kv.key_version);
end $fn$;

create or replace function public.t3a_verify_commit_seal(p_composed uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $fn$
declare s public.t3a_commit_seal; kv public.t3a_commit_seal_key_version; k text; pl text := public.t3a_commit_payload(p_composed);
begin
  select * into s from public.t3a_commit_seal where composed_statement_id = p_composed;
  if s.composed_statement_id is null then
    if exists (select 1 from public.t3a_commit_seal_request r where r.composed_statement_id = p_composed) then return jsonb_build_object('valid', false, 'reason', 'commit_seal_pending'); end if;
    return jsonb_build_object('valid', false, 'reason', 'commit_seal_absent');
  end if;
  select * into kv from public.t3a_commit_seal_key_version where key_version = s.key_version;
  if kv.key_version is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_key_version_unknown'); end if;
  if kv.mode = 'key_pair' then
    if not public.t3a_ed25519_verify(decode(kv.public_key, 'hex'), convert_to(pl, 'UTF8'), decode(s.seal, 'hex')) then return jsonb_build_object('valid', false, 'reason', 'commit_seal_invalid'); end if;
    return jsonb_build_object('valid', true, 'key_version', s.key_version);
  end if;
  k := public.t3a_commit_seal_key_for(s.key_version);
  if k is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_key_unloaded'); end if;
  if encode(extensions.hmac(pl, k, 'sha256'), 'hex') <> s.seal then return jsonb_build_object('valid', false, 'reason', 'commit_seal_invalid'); end if;
  return jsonb_build_object('valid', true, 'key_version', s.key_version);
end $fn$;

-- the service reads what is waiting to be signed
create or replace function public.t3a_commit_seal_pending() returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare kv public.t3a_commit_seal_key_version;
begin
  if not public.t3a_is_service_context() then return jsonb_build_object('outcome', 'refused', 'reason', 'service_route_only'); end if;
  select * into kv from public.t3a_commit_seal_key_version where status = 'current';
  if kv.mode is distinct from 'key_pair' then return jsonb_build_object('outcome', 'none', 'reason', 'current_key_is_not_a_key_pair'); end if;
  return jsonb_build_object('outcome', 'pending', 'key_version', kv.key_version, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('composed_statement_id', r.composed_statement_id, 'payload', public.t3a_commit_payload(r.composed_statement_id)) order by r.requested_at)
      from (select * from public.t3a_commit_seal_request q where not exists (select 1 from public.t3a_commit_seal s where s.composed_statement_id = q.composed_statement_id) order by q.requested_at limit 100) r), '[]'::jsonb));
end $fn$;
revoke all on function public.t3a_commit_seal_pending() from public, anon, authenticated;
grant execute on function public.t3a_commit_seal_pending() to service_role;

-- the service stores a signature; it is written only if it verifies against the current public key
create or replace function public.t3a_commit_seal_store(p_composed uuid, p_signature text, p_key_version text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare kv public.t3a_commit_seal_key_version; r public.t3a_commit_seal_request; c public.t3a_dimension_composed_statement; pl text;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('commit.seal_store', 'service_route_only', coalesce(p_composed::text, ''), 'only the commit service stores a seal'); end if;
  select * into kv from public.t3a_commit_seal_key_version where status = 'current';
  if kv.mode is distinct from 'key_pair' or kv.key_version is distinct from p_key_version then
    return public.t3a_capture_refuse('commit.seal_store', 'seal_key_version_not_current', coalesce(p_composed::text, ''), 'the signature names a key version that is not the current key pair');
  end if;
  select * into r from public.t3a_commit_seal_request where composed_statement_id = p_composed;
  if r.composed_statement_id is null then return public.t3a_capture_refuse('commit.seal_store', 'seal_request_unknown', coalesce(p_composed::text, ''), 'no seal was requested for this statement'); end if;
  if exists (select 1 from public.t3a_commit_seal where composed_statement_id = p_composed) then return public.t3a_capture_refuse('commit.seal_store', 'seal_already_stored', p_composed::text, 'this statement is already sealed'); end if;
  if p_signature is null or p_signature !~ '^[0-9a-f]{128}$' then return public.t3a_capture_refuse('commit.seal_store', 'signature_invalid', p_composed::text, 'a signature is 128 lower case hex characters'); end if;
  pl := public.t3a_commit_payload(p_composed);
  if not public.t3a_ed25519_verify(decode(kv.public_key, 'hex'), convert_to(pl, 'UTF8'), decode(p_signature, 'hex')) then
    return public.t3a_capture_refuse('commit.seal_store', 'signature_invalid', p_composed::text, 'the signature does not verify against the public key');
  end if;
  select * into c from public.t3a_dimension_composed_statement where composed_statement_id = p_composed;
  insert into public.t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal, key_version)
    values (p_composed, c.observation_ref, c.participant_id, c.dimension_id, r.is_superseding, encode(extensions.digest(pl, 'sha256'), 'hex'), p_signature, kv.key_version);
  return jsonb_build_object('outcome', 'sealed', 'key_version', kv.key_version);
end $fn$;
revoke all on function public.t3a_commit_seal_store(uuid, text, text) from public, anon, authenticated;
grant execute on function public.t3a_commit_seal_store(uuid, text, text) to service_role;

-- rotation: a key pair version needs a public key that is a valid point; no secret is read for it
create or replace function public.t3a_commit_seal_rotate(p_new_version text, p_secret_name text, p_mode text default 'vault_shared', p_public_key text default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('commit.seal_rotate', 'service_route_only', coalesce(p_new_version, ''), 'rotation is the service route only'); end if;
  if exists (select 1 from public.t3a_commit_seal_key_version where key_version = p_new_version) then
    return public.t3a_capture_refuse('commit.seal_rotate', 'key_version_exists', p_new_version, 'a key version is never reused');
  end if;
  if p_new_version !~ '^[a-z0-9_]+$' or p_mode not in ('vault_shared', 'key_pair') or (p_mode = 'key_pair' and (p_public_key is null or p_public_key !~ '^[0-9a-f]{64}$' or public.t3a_ed25519_decode(decode(p_public_key, 'hex')) is null)) then
    return public.t3a_capture_refuse('commit.seal_rotate', 'key_mode_invalid', coalesce(p_new_version, ''), 'version, mode or public key invalid');
  end if;
  insert into public.t3a_commit_seal_key_version(key_version, mode, secret_name, public_key, status) values (p_new_version, p_mode, coalesce(p_secret_name, 'none'), p_public_key, 'retired');
  if p_mode = 'vault_shared' and public.t3a_commit_seal_key_for(p_new_version) is null then
    delete from public.t3a_commit_seal_key_version where key_version = p_new_version;
    return public.t3a_capture_refuse('commit.seal_rotate', 'new_key_unloaded', p_new_version, 'the new key is not loaded');
  end if;
  update public.t3a_commit_seal_key_version set status = 'retired' where status = 'current';
  update public.t3a_commit_seal_key_version set status = 'current' where key_version = p_new_version;
  return jsonb_build_object('outcome', 'rotated', 'key_version', p_new_version, 'mode', p_mode);
end $fn$;
