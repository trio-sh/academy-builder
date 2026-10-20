-- Rollback for 20261101000000_day1_field_registry.sql and 20261102000000_day1_event_registry.sql.
-- Safe only while t3a_event_log holds no rows written under the new envelope; check first:
--   select count(*) from public.t3a_event_log where event_sequence_no is not null;
-- Restores the pre-change event log from docs/day1/evidence/event-log-snapshot-before-prod.json.
-- The five enum labels added to t3a_event_category (REPORT, REHEARSAL, PROGRAM, REGISTRY, COMMERCIAL) cannot be removed in PostgreSQL and are harmless.
begin;
-- event registry migration
drop trigger if exists t3a_event_log_envelope on public.t3a_event_log;
drop function if exists public.t3a_event_log_envelope();
drop function if exists public.t3a_verify_event_chain(interval, boolean);
drop function if exists public.t3a_event_chain_findings(interval);
drop function if exists public.t3a_emit_event(text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,uuid,uuid,text,text);
drop function if exists public.t3a_ingest_event(text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,uuid,uuid,text,text,text,uuid,uuid,text,uuid);
drop function if exists public.t3a_check_event_references(jsonb);
drop function if exists public.t3a_check_event_payload(text,jsonb,timestamptz,text);
drop function if exists public.t3a_event_actor_uuid(text);
drop function if exists public.t3a_event_canonical_hash(uuid,text,timestamptz,uuid,jsonb);
drop index if exists public.t3a_event_log_idem_accepted_idx;
drop index if exists public.t3a_event_log_stream_seq_idx;
drop index if exists public.t3a_event_log_ingested_idx;
alter table public.t3a_event_log drop constraint if exists t3a_event_log_record_property_check;
alter table public.t3a_event_log drop constraint if exists t3a_event_log_processing_state_check;
alter table public.t3a_event_log
  drop column if exists schema_version, drop column if exists dictionary_version, drop column if exists previous_hash,
  drop column if exists record_property, drop column if exists event_idempotency_key, drop column if exists event_sequence_no,
  drop column if exists event_processing_state, drop column if exists actor_role_code, drop column if exists policy_decision_ref,
  drop column if exists change_request_ref, drop column if exists application_session_id, drop column if exists actor_ref,
  drop column if exists stream_key;
alter table public.t3a_event_log drop constraint if exists t3a_event_log_actor_type_check;
alter table public.t3a_event_log add constraint t3a_event_log_actor_type_check
  check (actor_type = any (array['PARTICIPANT','MENTOR','EMPLOYER','REVIEWER','AI_ENGINE','SYSTEM','ADMIN']));
grant insert, update, delete on public.t3a_event_log to authenticated;
drop table if exists public.t3a_event_name_alias, public.t3a_event_reference_rule, public.t3a_event_idempotency,
  public.t3a_event_rejection, public.t3a_quality_event, public.t3a_event_registry, public.t3a_event_config;
drop function if exists public.t3a_event_registry_append_only();
-- field registry migration
drop function if exists public.t3a_field_registry_dt01(text);
drop table if exists public.t3a_field_physical_map, public.t3a_field_prohibited_item, public.t3a_field_registry, public.t3a_field_registry_version;
drop function if exists public.t3a_field_registry_append_only();
drop function if exists public.t3a_field_physical_map_touch();
commit;
