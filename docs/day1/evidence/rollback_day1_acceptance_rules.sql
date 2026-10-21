-- Rollback for 20261123 (acceptance rules). Applied to production 20 Oct 2026 with the affected tables empty.
drop trigger if exists t3a_1_issuance_freshness_trg on public.t3a_d1_report_issuance;
drop trigger if exists t3a_1_consent_stales_preview_trg on public.t3a_consent_record;
drop trigger if exists t3a_9_observation_sidecar_trg on public.t3a_observation;
drop trigger if exists t3a_1_observation_subject_trg on public.t3a_observation;
drop trigger if exists t3a_z_profile_withheld_trg on public.t3a_participant_profile;
drop trigger if exists t3a_9_source_title_trg on public.t3a_source;
drop trigger if exists t3a_1_source_bank_trg on public.t3a_source;
drop trigger if exists t3a_2_entry_authority_trg on public.t3a_stage_entry_event;
drop table if exists public.t3a_source_title_history, public.t3a_source_bank, public.t3a_legacy_consent_coverage cascade;
alter table public.t3a_capture_config drop column if exists enable_lsa_sidecar;
drop function if exists public.t3a_issuance_freshness(), public.t3a_consent_withdrawal_stales_preview(), public.t3a_observation_sidecar(), public.t3a_record_served_instance(jsonb, text, text),
  public.t3a_observation_subject_rule(), public.t3a_profile_withheld(), public.t3a_source_title_record(), public.t3a_source_title_as_of(uuid, timestamptz),
  public.t3a_register_source_bank(text), public.t3a_source_bank_rule(), public.t3a_map_legacy_consent(uuid, text), public.t3a_entry_authority_rule();

-- 20261124 (demonstration inheritance and strict observation append-only)
drop trigger if exists t3a_0_observation_strict_append_only_trg on public.t3a_observation;
drop trigger if exists t3a_0_record_property_inherit_trg on public.t3a_event_log;
drop function if exists public.t3a_observation_strict_append_only(), public.t3a_event_record_property_inherit(), public.t3a_convert_record_property(uuid, text);
