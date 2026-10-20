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
