-- Rollback for 20261110 (Domain G). Applied to production 20 Oct 2026. The one existing report row is unchanged (new columns null).
drop trigger if exists t3a_capture_state_fill on public.t3a_dimension_evidence;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_dimension_evidence;
alter table public.t3a_dimension_evidence drop column if exists insufficiency_reason_capture_state, drop column if exists dimension_evidence_state, drop column if exists cross_cutting_condition_flags, drop column if exists cross_cutting_condition_flags_capture_state;
drop trigger if exists t3a_capture_state_fill on public.t3a_d1_ber_report;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_d1_ber_report;
alter table public.t3a_d1_ber_report drop column if exists ber_version, drop column if exists ber_standard_version, drop column if exists permitted_use_version, drop column if exists represented_dimension_ids, drop column if exists observer_multiplicity_statement_code, drop column if exists source_link, drop column if exists ber_status, drop column if exists participant_review_opened_at, drop column if exists participant_review_opened_at_capture_state, drop column if exists participant_review_completed_at, drop column if exists participant_review_completed_at_capture_state, drop column if exists specimen_render_flag, drop column if exists report_type, drop column if exists report_preview_digest, drop column if exists preview_state, drop column if exists report_content_digest, drop column if exists verification_code;
drop trigger if exists t3a_capture_state_fill on public.t3a_d1_report_issuance;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_d1_report_issuance;
drop trigger if exists t3a_1_verification_code_trg on public.t3a_d1_ber_report;
drop trigger if exists t3a_1_reviewer_not_issuer_trg on public.t3a_d1_report_issuance;
drop index if exists public.t3a_d1_ber_report_verification_code_uq;
drop table if exists public.t3a_job_family_socket, public.t3a_verification_check, public.t3a_report_access, public.t3a_report_release, public.t3a_evidence_review cascade;
delete from public.t3a_field_physical_map where qualified_name like 'G.%';
drop function if exists public.t3a_ber_verification_code(), public.t3a_reviewer_not_issuer(), public.t3a_issuer_not_reviewer(), public.t3a_release_visibility_time();
