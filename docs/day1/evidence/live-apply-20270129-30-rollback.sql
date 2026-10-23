-- Generated rollback. Run in one transaction.
begin;
set local search_path to public, extensions;
CREATE OR REPLACE FUNCTION public.t3a_commit_seal_key()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.t3a_commit_seal_key_for(public.t3a_commit_seal_current_version())
$function$;
revoke all on function t3a_commit_seal_key() from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_commit_seal_rotate(p_new_version text, p_secret_name text, p_mode text DEFAULT 'vault_shared'::text, p_public_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;
revoke all on function t3a_commit_seal_rotate(text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function t3a_commit_seal_rotate(text,text,text,text) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_seal_composed(p_composed uuid, p_superseding boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v text := public.t3a_commit_seal_current_version(); k text := public.t3a_commit_seal_key_for(v); pl text := public.t3a_commit_payload(p_composed); c public.t3a_dimension_composed_statement;
begin
  if k is null then raise exception 'COMMIT_SEAL_KEY_UNLOADED'; end if;
  select * into c from public.t3a_dimension_composed_statement where composed_statement_id = p_composed;
  insert into public.t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal, key_version)
    values (p_composed, c.observation_ref, c.participant_id, c.dimension_id, p_superseding, encode(extensions.digest(pl, 'sha256'), 'hex'), encode(extensions.hmac(pl, k, 'sha256'), 'hex'), v);
end $function$;
revoke all on function t3a_seal_composed(uuid,boolean) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_verify_commit_seal(p_composed uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
end $function$;
revoke all on function t3a_verify_commit_seal(uuid) from public, anon, authenticated, service_role;
grant execute on function t3a_verify_commit_seal(uuid) to service_role;
drop table if exists public."t3a_commit_seal_request" cascade;
drop function if exists t3a_commit_seal_pending() cascade;
drop function if exists t3a_commit_seal_store(uuid,text,text) cascade;
drop function if exists t3a_ed25519_add(numeric[],numeric[]) cascade;
drop function if exists t3a_ed25519_decode(bytea) cascade;
drop function if exists t3a_ed25519_le(bytea) cascade;
drop function if exists t3a_ed25519_modpow(numeric,numeric,numeric) cascade;
drop function if exists t3a_ed25519_mul(numeric,numeric[]) cascade;
drop function if exists t3a_ed25519_verify(bytea,bytea,bytea) cascade;
commit;
