-- Generated rollback. Run in one transaction.
begin;
set local search_path to public, extensions;
drop trigger if exists "t3a_0_cr29_activation_guard_trg" on public."t3a_configuration_value";
drop trigger if exists "t3a_cr28_stamp_rule_version_trg" on public."t3a_d1_ber_report";
alter table public."t3a_d1_ber_report" drop column if exists "claim_package_rule_version" cascade;
CREATE OR REPLACE FUNCTION public.t3a_commit_seal_key()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 't3a_commit_seal_key' order by created_at desc limit 1 $q$ into k;
    if nullif(k, '') is not null then return k; end if;
  end if;
  return nullif(current_setting('t3a.commit_seal_key', true), '');
end $function$;
revoke all on function t3a_commit_seal_key() from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_seal_composed(p_composed uuid, p_superseding boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare k text := public.t3a_commit_seal_key(); pl text := public.t3a_commit_payload(p_composed); c public.t3a_dimension_composed_statement;
begin
  if k is null then raise exception 'COMMIT_SEAL_KEY_UNLOADED'; end if;
  select * into c from public.t3a_dimension_composed_statement where composed_statement_id = p_composed;
  insert into public.t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal)
    values (p_composed, c.observation_ref, c.participant_id, c.dimension_id, p_superseding, encode(extensions.digest(pl, 'sha256'), 'hex'), encode(extensions.hmac(pl, k, 'sha256'), 'hex'));
end $function$;
revoke all on function t3a_seal_composed(uuid,boolean) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_verify_commit_seal(p_composed uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.t3a_commit_seal; k text := public.t3a_commit_seal_key(); pl text := public.t3a_commit_payload(p_composed);
begin
  select * into s from public.t3a_commit_seal where composed_statement_id = p_composed;
  if s.composed_statement_id is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_absent'); end if;
  if k is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_key_unloaded'); end if;
  if encode(extensions.hmac(pl, k, 'sha256'), 'hex') <> s.seal then return jsonb_build_object('valid', false, 'reason', 'commit_seal_invalid'); end if;
  return jsonb_build_object('valid', true);
end $function$;
revoke all on function t3a_verify_commit_seal(uuid) from public, anon, authenticated, service_role;
grant execute on function t3a_verify_commit_seal(uuid) to service_role;
drop table if exists public."t3a_commit_seal_key_version" cascade;
drop function if exists t3a_commit_seal_current_version() cascade;
drop function if exists t3a_commit_seal_key_for(text) cascade;
drop function if exists t3a_commit_seal_rotate(text,text,text,text) cascade;
drop function if exists t3a_cr28_review(uuid) cascade;
drop function if exists t3a_cr28_rule_version() cascade;
drop function if exists t3a_cr28_select_entry(uuid,text,boolean) cascade;
drop function if exists t3a_cr28_stamp_rule_version() cascade;
drop function if exists t3a_cr29_activation_guard() cascade;
commit;
