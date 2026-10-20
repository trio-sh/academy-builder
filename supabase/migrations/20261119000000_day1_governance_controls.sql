-- Day 1 Domain P: retention, privileged access, content reads, incidents, deployment and the error journal (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_p.py
-- and tools/day1/plans/domain_p_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py P      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 30 fields into t3a_field_physical_map.

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


-- t3a_retention_schedule: extended in place (existing rows are kept)

alter table public.t3a_retention_schedule add column if not exists counsel_ratified_at_capture_state text not null default 'not_captured' check (counsel_ratified_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_retention_schedule add column if not exists retention_period_value integer ;

alter table public.t3a_retention_schedule add column if not exists retention_period_value_capture_state text not null default 'not_captured' check (retention_period_value_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_retention_schedule set counsel_ratified_at_capture_state = 'captured' where counsel_ratified_at is not null and counsel_ratified_at_capture_state = 'not_captured';

update public.t3a_retention_schedule set retention_period_value_capture_state = 'captured' where retention_period_value is not null and retention_period_value_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_retention_schedule;
create trigger t3a_capture_state_fill before insert or update on public.t3a_retention_schedule for each row execute function public.t3a_capture_state_fill('counsel_ratified_at:counsel_ratified_at_capture_state', 'retention_period_value:retention_period_value_capture_state');

create table if not exists public.t3a_retention_run_socket (
  destruction_run_id uuid,
  anonymization_run_id uuid
);

comment on table public.t3a_retention_run_socket is 'Domain P SOCKET: destruction and anonymization runs. Structure only; every write is refused until counsel ratifies the schedule.';

drop trigger if exists t3a_append_only on public.t3a_retention_run_socket;
create trigger t3a_append_only before update or delete on public.t3a_retention_run_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_retention_run_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_retention_run_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_retention_run_socket enable row level security;
revoke all on public.t3a_retention_run_socket from anon, authenticated;

create table if not exists public.t3a_privileged_access (
  actor_id uuid not null,
  access_basis text not null check (access_basis ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  privileged_access_id uuid primary key default gen_random_uuid(),
  accessed_at timestamptz not null default now()
);

comment on table public.t3a_privileged_access is 'Domain P privileged access: each use of a privileged role, with its basis. Insert only.';

drop trigger if exists t3a_append_only on public.t3a_privileged_access;
create trigger t3a_append_only before update or delete on public.t3a_privileged_access for each row execute function public.t3a_deny_mutation();

alter table public.t3a_privileged_access enable row level security;
revoke all on public.t3a_privileged_access from anon, authenticated;

-- t3a_oversight_log: extended in place (existing rows are kept)

create table if not exists public.t3a_control_run (
  control_code text not null check (control_code ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  result text not null check (result in ('pass', 'fail', 'not_run')),
  control_run_id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now()
);

comment on table public.t3a_control_run is 'Domain P control runs: each time a control is operated, and its result. Insert only.';

drop trigger if exists t3a_append_only on public.t3a_control_run;
create trigger t3a_append_only before update or delete on public.t3a_control_run for each row execute function public.t3a_deny_mutation();

alter table public.t3a_control_run enable row level security;
revoke all on public.t3a_control_run from anon, authenticated;

create table if not exists public.t3a_suppression (
  suppression_id uuid primary key default gen_random_uuid(),
  suppression_reason text not null,
  applied_at timestamptz not null default now(),
  check (suppression_reason is null or suppression_reason in ('small_n', 'dominance', 'integrity_low', 'gate_not_met'))
);

comment on table public.t3a_suppression is 'Domain P suppressions applied to an aggregate output, with the reason. Insert only.';

drop trigger if exists t3a_append_only on public.t3a_suppression;
create trigger t3a_append_only before update or delete on public.t3a_suppression for each row execute function public.t3a_deny_mutation();

alter table public.t3a_suppression enable row level security;
revoke all on public.t3a_suppression from anon, authenticated;

create table if not exists public.t3a_data_access_request (
  account_id uuid not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  data_access_request_id uuid primary key default gen_random_uuid()
);

comment on table public.t3a_data_access_request is 'Domain P data access requests. The resolution time is set once.';

drop trigger if exists t3a_immutable_columns on public.t3a_data_access_request;
create trigger t3a_immutable_columns before update on public.t3a_data_access_request for each row execute function public.t3a_refuse_column_change('data_access_request_id', 'account_id', 'requested_at');

alter table public.t3a_data_access_request enable row level security;
revoke all on public.t3a_data_access_request from anon, authenticated;

create table if not exists public.t3a_data_correction_request (
  account_id uuid not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  data_correction_request_id uuid primary key default gen_random_uuid()
);

comment on table public.t3a_data_correction_request is 'Domain P data correction requests. The resolution time is set once.';

drop trigger if exists t3a_immutable_columns on public.t3a_data_correction_request;
create trigger t3a_immutable_columns before update on public.t3a_data_correction_request for each row execute function public.t3a_refuse_column_change('data_correction_request_id', 'account_id', 'requested_at');

alter table public.t3a_data_correction_request enable row level security;
revoke all on public.t3a_data_correction_request from anon, authenticated;

create table if not exists public.t3a_incident (
  opened_at timestamptz not null default now(),
  incident_id uuid primary key default gen_random_uuid(),
  severity text,
  affected_record_count integer,
  notified_at timestamptz,
  check (severity is null or severity in ('low', 'medium', 'high', 'critical'))
);

comment on table public.t3a_incident is 'Domain P incidents: severity, affected record count and notification time.';

drop trigger if exists t3a_immutable_columns on public.t3a_incident;
create trigger t3a_immutable_columns before update on public.t3a_incident for each row execute function public.t3a_refuse_column_change('incident_id', 'opened_at');

alter table public.t3a_incident enable row level security;
revoke all on public.t3a_incident from anon, authenticated;

create table if not exists public.t3a_deployment_config (
  singleton boolean primary key default true check (singleton),
  hosting_region text,
  backup_region text,
  verification_link_ttl integer,
  verification_resend_cooldown integer,
  mentor_invitation_ttl integer,
  recipient_release_token_ttl integer,
  recipient_passcode_ttl integer,
  stage_entry_hold_ttl integer,
  retention_policy_version text,
  retention_review_at timestamptz,
  updated_at timestamptz not null default now(),
  check (hosting_region is null or hosting_region in ('ca')),
  check (backup_region is null or backup_region in ('ca')),
  check (retention_policy_version is null or retention_policy_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_deployment_config is 'Domain P deployment and timing configuration, one row. A value that is null is unset; its route refuses and never defaults (DT-39).';

drop trigger if exists t3a_immutable_columns on public.t3a_deployment_config;
create trigger t3a_immutable_columns before update on public.t3a_deployment_config for each row execute function public.t3a_refuse_column_change('singleton');

alter table public.t3a_deployment_config enable row level security;
revoke all on public.t3a_deployment_config from anon, authenticated;

create table if not exists public.t3a_error_journal (
  event_name text not null,
  error_detail text,
  parent_ref text,
  error_journal_id uuid primary key default gen_random_uuid(),
  error_journal_written_at timestamptz default now(),
  reconciled_event_id uuid
);

comment on table public.t3a_error_journal is 'Domain P error journal: a failed event emission, written outside the event log, reconciled when the store recovers (DT-59).';

drop trigger if exists t3a_immutable_columns on public.t3a_error_journal;
create trigger t3a_immutable_columns before update on public.t3a_error_journal for each row execute function public.t3a_refuse_column_change('error_journal_id', 'event_name', 'error_journal_written_at');

alter table public.t3a_error_journal enable row level security;
revoke all on public.t3a_error_journal from anon, authenticated;

create table if not exists public.t3a_legal_hold (
  resource_type text not null,
  resource_id uuid not null,
  placed_at timestamptz not null default now(),
  released_at timestamptz,
  legal_hold_ref uuid primary key default gen_random_uuid()
);

comment on table public.t3a_legal_hold is 'Domain P legal holds on a resource. A hold is placed and later released; retention and destruction skip a held resource (DT-54).';

drop trigger if exists t3a_immutable_columns on public.t3a_legal_hold;
create trigger t3a_immutable_columns before update on public.t3a_legal_hold for each row execute function public.t3a_refuse_column_change('legal_hold_ref', 'resource_type', 'resource_id', 'placed_at');

alter table public.t3a_legal_hold enable row level security;
revoke all on public.t3a_legal_hold from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'P.retention_class', 'M1', 't3a_retention_schedule', 'retention_class', null, 'day1-domain-P-generator', now(), 'live enum names differ from the dictionary: observation_evidence / audit_logs / challenge_records vs underlying_evidence / audit_log / challenge_record (CR-062)'),
  ('1.3', 'P.counsel_ratified_at', 'M1', 't3a_retention_schedule', 'counsel_ratified_at', 'counsel_ratified_at_capture_state', 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.retention_period_value', 'M5', 't3a_retention_schedule', 'retention_period_value', 'retention_period_value_capture_state', 'day1-domain-P-generator', now(), 'months'),
  ('1.3', 'P.destruction_run_id', 'M5', 't3a_retention_run_socket', 'destruction_run_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.anonymization_run_id', 'M5', 't3a_retention_run_socket', 'anonymization_run_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.privileged_access_id', 'M5', 't3a_privileged_access', 'privileged_access_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.content_read_id', 'M3', 't3a_oversight_log', 'entry_id', null, 'day1-domain-P-generator', now(), 'the existing oversight log already records each read with holder, time, subject and basis (CR-063)'),
  ('1.3', 'P.control_run_id', 'M5', 't3a_control_run', 'control_run_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.suppression_id', 'M5', 't3a_suppression', 'suppression_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.suppression_reason', 'M5', 't3a_suppression', 'suppression_reason', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.data_access_request_id', 'M5', 't3a_data_access_request', 'data_access_request_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.data_correction_request_id', 'M5', 't3a_data_correction_request', 'data_correction_request_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.incident_id', 'M5', 't3a_incident', 'incident_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.severity', 'M5', 't3a_incident', 'severity', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.affected_record_count', 'M5', 't3a_incident', 'affected_record_count', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.notified_at', 'M5', 't3a_incident', 'notified_at', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.hosting_region', 'M5', 't3a_deployment_config', 'hosting_region', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.backup_region', 'M5', 't3a_deployment_config', 'backup_region', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.verification_link_ttl', 'M5', 't3a_deployment_config', 'verification_link_ttl', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.verification_resend_cooldown', 'M5', 't3a_deployment_config', 'verification_resend_cooldown', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.mentor_invitation_ttl', 'M5', 't3a_deployment_config', 'mentor_invitation_ttl', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.recipient_release_token_ttl', 'M5', 't3a_deployment_config', 'recipient_release_token_ttl', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.recipient_passcode_ttl', 'M5', 't3a_deployment_config', 'recipient_passcode_ttl', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.stage_entry_hold_ttl', 'M5', 't3a_deployment_config', 'stage_entry_hold_ttl', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.retention_policy_version', 'M5', 't3a_deployment_config', 'retention_policy_version', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.retention_review_at', 'M5', 't3a_deployment_config', 'retention_review_at', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.error_journal_id', 'M5', 't3a_error_journal', 'error_journal_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.error_journal_written_at', 'M5', 't3a_error_journal', 'error_journal_written_at', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.reconciled_event_id', 'M5', 't3a_error_journal', 'reconciled_event_id', null, 'day1-domain-P-generator', now(), null),
  ('1.3', 'P.legal_hold_ref', 'M5', 't3a_legal_hold', 'legal_hold_ref', null, 'day1-domain-P-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

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
