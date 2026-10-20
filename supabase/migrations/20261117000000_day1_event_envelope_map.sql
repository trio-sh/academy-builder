-- Day 1 Domain N: event envelope (mapping only) (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_n.py
-- and tools/day1/plans/domain_n_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py N      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 29 fields into t3a_field_physical_map.

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


-- t3a_event_log: extended in place (existing rows are kept)

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'N.event_id', 'M1', 't3a_event_log', 'event_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.event_name', 'M1', 't3a_event_log', 'event_name', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.event_category', 'M1', 't3a_event_log', 'event_category', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.occurred_at', 'M1', 't3a_event_log', 'occurred_at', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.ingested_at', 'M1', 't3a_event_log', 'ingested_at', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.actor_type', 'M1', 't3a_event_log', 'actor_type', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.actor_id', 'M1', 't3a_event_log', 'actor_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.subject_id', 'M1', 't3a_event_log', 'subject_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.session_id', 'M1', 't3a_event_log', 'session_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.correlation_id', 'M1', 't3a_event_log', 'correlation_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.resource_type', 'M1', 't3a_event_log', 'resource_type', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.resource_id', 'M1', 't3a_event_log', 'resource_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.payload', 'M1', 't3a_event_log', 'payload', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.artifact_ref_id', 'M3', 't3a_event_log', 'artifact_ref_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.schema_version', 'M1', 't3a_event_log', 'schema_version', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.dictionary_version', 'M5', 't3a_event_log', 'dictionary_version', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.integrity_status', 'M1', 't3a_event_log', 'integrity_status', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.integrity_hash', 'M1', 't3a_event_log', 'integrity_hash', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.previous_hash', 'M5', 't3a_event_log', 'previous_hash', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.supersedes_event_id', 'M1', 't3a_event_log', 'supersedes_event_id', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.source_system', 'M1', 't3a_event_log', 'source_system', null, 'day1-domain-N-generator', now(), null),
  ('1.3', 'N.record_property', 'M5', 't3a_event_log', 'record_property', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.event_idempotency_key', 'M5', 't3a_event_log', 'event_idempotency_key', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.event_sequence_no', 'M5', 't3a_event_log', 'event_sequence_no', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.event_processing_state', 'M5', 't3a_event_log', 'event_processing_state', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.actor_role_code', 'M5', 't3a_event_log', 'actor_role_code', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.policy_decision_ref', 'M5', 't3a_event_log', 'policy_decision_ref', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.change_request_ref', 'M5', 't3a_event_log', 'change_request_ref', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000'),
  ('1.3', 'N.application_session_id', 'M5', 't3a_event_log', 'application_session_id', null, 'day1-domain-N-generator', now(), 'added to t3a_event_log in 20261102000000')
on conflict (dictionary_version, qualified_name) do nothing;

