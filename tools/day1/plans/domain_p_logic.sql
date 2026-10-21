-- ---------------------------------------------------------------------------------------------
-- Domain P behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_data_access_request;
create trigger t3a_set_once_trg before update on public.t3a_data_access_request for each row execute function public.t3a_set_once('resolved_at');
drop trigger if exists t3a_set_once_trg on public.t3a_data_correction_request;
create trigger t3a_set_once_trg before update on public.t3a_data_correction_request for each row execute function public.t3a_set_once('resolved_at');
drop trigger if exists t3a_set_once_trg on public.t3a_error_journal;
create trigger t3a_set_once_trg before update on public.t3a_error_journal for each row execute function public.t3a_set_once('reconciled_event_id');
drop trigger if exists t3a_set_once_trg on public.t3a_legal_hold;
create trigger t3a_set_once_trg before update on public.t3a_legal_hold for each row execute function public.t3a_set_once('released_at');
insert into public.t3a_deployment_config (singleton) values (true) on conflict do nothing;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_deployment_config_ttl_chk') then
    alter table public.t3a_deployment_config add constraint t3a_deployment_config_ttl_chk check (
      coalesce(verification_link_ttl, 1) > 0 and coalesce(verification_resend_cooldown, 1) > 0 and coalesce(mentor_invitation_ttl, 1) > 0 and
      coalesce(recipient_release_token_ttl, 1) > 0 and coalesce(recipient_passcode_ttl, 1) > 0 and coalesce(stage_entry_hold_ttl, 1) > 0);
    alter table public.t3a_incident add constraint t3a_incident_severity_chk check (severity is null or severity in ('low', 'medium', 'high', 'critical'));
    alter table public.t3a_incident add constraint t3a_incident_count_chk check (affected_record_count is null or affected_record_count >= 0);
    alter table public.t3a_suppression add constraint t3a_suppression_reason_chk check (suppression_reason in ('small_n', 'dominance', 'integrity_low', 'gate_not_met'));
  end if;
end $$;

-- DT-37, DT-54: a destruction run. Nothing is destroyed here (the route is a socket); the function decides, logs and returns why.
-- Refused: schedule not ratified by counsel; resource under legal hold; otherwise the route is closed.
create or replace function public.t3a_attempt_destruction(p_class text, p_resource_type text default null, p_resource_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ratified timestamptz; v_exists boolean;
begin
  select true, counsel_ratified_at into v_exists, v_ratified from public.t3a_retention_schedule where retention_class::text = p_class;
  if v_exists is not true then
    return public.t3a_capture_refuse('retention.destruction', 'RETENTION_CLASS_UNKNOWN', p_class, 'no schedule row for this class');
  end if;
  if p_resource_id is not null and exists (select 1 from public.t3a_legal_hold h where h.resource_type = p_resource_type and h.resource_id = p_resource_id and h.released_at is null) then
    return public.t3a_capture_refuse('retention.destruction', 'LEGAL_HOLD', p_resource_id::text, 'the resource is under legal hold; the run skips it and is logged');
  end if;
  if v_ratified is null then
    return public.t3a_capture_refuse('retention.destruction', 'COUNSEL_NOT_RATIFIED', p_class, 'the schedule for this class has not been ratified by counsel; nothing is destroyed');
  end if;
  return public.t3a_capture_refuse('retention.destruction', 'DESTRUCTION_ROUTE_CLOSED', p_class, 'the destruction route is a socket and is not enabled; nothing is destroyed');
end $$;
revoke all on function public.t3a_attempt_destruction(text, text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_attempt_destruction(text, text, uuid) to service_role;

-- DT-38: record that hosting and backup are in Canada and emit system.deployment_verified. Anything other than ca is refused and not recorded.
create or replace function public.t3a_record_deployment_verification(p_hosting text, p_backup text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_hosting is distinct from 'ca' or p_backup is distinct from 'ca' then
    return public.t3a_capture_refuse('deployment.verify', 'REGION_NOT_CA', coalesce(p_hosting, 'null') || '/' || coalesce(p_backup, 'null'), 'hosting and backup must both be in Canada (ca)');
  end if;
  update public.t3a_deployment_config set hosting_region = 'ca', backup_region = 'ca', updated_at = now() where singleton;
  perform public.t3a_emit_event('system.deployment_verified', 'SYSTEM_SERVICE', 'deployment_check', 'system_service', 'configuration', gen_random_uuid(),
    jsonb_build_object('hosting_region', 'ca', 'backup_region', 'ca'), 'deployment_verified:' || to_char(now(), 'YYYYMMDDHH24MISS'), null, null);
  return jsonb_build_object('outcome', 'verified');
end $$;
revoke all on function public.t3a_record_deployment_verification(text, text) from public, anon, authenticated;
grant execute on function public.t3a_record_deployment_verification(text, text) to service_role;

-- DT-39: a required deployment value that is null refuses its route, visibly and in the log. It never falls back to a default.
create or replace function public.t3a_deployment_value(p_field text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select to_jsonb(c) -> p_field into v from public.t3a_deployment_config c where singleton;
  if v is null or v = 'null'::jsonb then
    return public.t3a_capture_refuse('deployment.value', 'CONFIGURATION_UNSET', p_field, 'a required configuration value is not set; the route refuses and does not default');
  end if;
  return jsonb_build_object('outcome', 'set', 'value', v);
end $$;
revoke all on function public.t3a_deployment_value(text) from public, anon;
grant execute on function public.t3a_deployment_value(text) to authenticated, service_role;

-- DT-59: emit first, act second. If the event cannot be written, the parent action is not performed, a journal row is written outside the
-- event log (the failure is caught in a sub transaction, so the journal row is kept) and the caller is told it was refused.
create or replace function public.t3a_emit_first(p_event_name text, p_actor_type text, p_actor_ref text, p_actor_role text, p_resource_type text, p_resource_id uuid,
  p_payload jsonb, p_idempotency_key text, p_parent_ref text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_event uuid; v_journal uuid;
begin
  begin
    v_event := public.t3a_emit_event(p_event_name, p_actor_type, p_actor_ref, p_actor_role, p_resource_type, p_resource_id, p_payload, p_idempotency_key);
    return jsonb_build_object('outcome', 'emitted', 'event_id', v_event);
  exception when others then
    insert into public.t3a_error_journal (event_name, error_detail, parent_ref) values (p_event_name, left(sqlerrm, 500), p_parent_ref) returning error_journal_id into v_journal;
    return jsonb_build_object('outcome', 'refused', 'reason', 'EVENT_STORE_UNAVAILABLE', 'error_journal_id', v_journal);
  end;
end $$;
revoke all on function public.t3a_emit_first(text, text, text, text, text, uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.t3a_emit_first(text, text, text, text, text, uuid, jsonb, text, text) to service_role;

create or replace function public.t3a_reconcile_journal(p_journal uuid, p_event_name text, p_actor_type text, p_actor_ref text, p_actor_role text, p_resource_type text, p_resource_id uuid, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_event uuid;
begin
  v_event := public.t3a_emit_event(p_event_name, p_actor_type, p_actor_ref, p_actor_role, p_resource_type, p_resource_id, p_payload, 'reconcile:' || p_journal);
  update public.t3a_error_journal set reconciled_event_id = v_event where error_journal_id = p_journal;
  return jsonb_build_object('outcome', 'reconciled', 'event_id', v_event);
end $$;
revoke all on function public.t3a_reconcile_journal(uuid, text, text, text, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.t3a_reconcile_journal(uuid, text, text, text, text, text, uuid, jsonb) to service_role;
