-- Rollback for 20261105 (consent). Applied to production 20 Oct 2026 with no consent rows written.
-- Only safe while t3a_consent_record is empty or its rows are not needed.
drop trigger if exists t3a_1_consent_gate_trg on public.t3a_stage_entry_event;
drop trigger if exists t3a_1_consent_gate_trg on public.t3a_observation;
update public.t3a_event_reference_rule set ref_table = 't3a_d1_consent', ref_column = 'consent_id', note = null where payload_key = 'consent_id';
delete from public.t3a_field_physical_map where qualified_name like 'B.%';
drop table if exists public.t3a_group_participation_socket, public.t3a_lsa_consent, public.t3a_contact_consent, public.t3a_privacy_notice_acknowledgement,
  public.t3a_consent_state_ref, public.t3a_consent_supersession, public.t3a_consent_refusal, public.t3a_consent_config, public.t3a_consent_record cascade;
drop function if exists public.t3a_record_consent(uuid,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz),
  public.t3a_consent_current(uuid,text,text,text), public.t3a_consent_refuse(uuid,text,text,text), public.t3a_lsa_consent_state(uuid), public.t3a_require_consent();
