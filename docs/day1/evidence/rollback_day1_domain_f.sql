-- Rollback for 20261109 (Domain F). Applied to production 20 Oct 2026 with the authorization, conflict and invitation tables empty.
drop trigger if exists t3a_capture_state_fill on public.t3a_mentor_authorization;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_mentor_authorization;
alter table public.t3a_mentor_authorization drop column if exists reference_set_version_capture_state, drop column if exists authorization_status, drop column if exists reviewer_authorization, drop column if exists issuer_authorization, drop column if exists supervised_sessions_completed, drop column if exists supervised_sessions_completed_capture_state, drop column if exists supervised_status_started_at, drop column if exists supervised_status_started_at_capture_state, drop column if exists supervision_finding_code, drop column if exists supervision_finding_code_capture_state, drop column if exists suspension_started_at, drop column if exists suspension_extension_count, drop column if exists independent_approver_id, drop column if exists observations_per_month_commitment, drop column if exists observations_per_month_commitment_capture_state, drop column if exists engagement_started_at, drop column if exists engagement_started_at_capture_state, drop column if exists sourcing_channel, drop column if exists sourcing_channel_capture_state, drop column if exists sourcing_employer_ref, drop column if exists sourcing_employer_ref_capture_state, drop column if exists observer_qualification_record_ref, drop column if exists observer_qualification_record_ref_capture_state, drop column if exists observer_specialty_domain_codes, drop column if exists observer_specialty_domain_codes_capture_state, drop column if exists qualification_reviewed_at, drop column if exists qualification_reviewed_at_capture_state;
drop trigger if exists t3a_capture_state_fill on public.t3a_conflict_declaration;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_conflict_declaration;
alter table public.t3a_conflict_declaration drop column if exists declared_entity_refs, drop column if exists recusal_id;
drop trigger if exists t3a_capture_state_fill on public.t3a_d1_involvement;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_d1_involvement;
alter table public.t3a_d1_involvement drop column if exists evidence_cycle_id, drop column if exists cycle_function, drop column if exists s1_exposure_flag;
drop trigger if exists t3a_capture_state_fill on public.t3a_moderation_sample;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_moderation_sample;
alter table public.t3a_moderation_sample drop column if exists sampling_plan_version_capture_state;
alter table public.t3a_mentor_authorization drop constraint if exists t3a_mentor_authorization_status_chk, drop constraint if exists t3a_mentor_authorization_suspension_chk,
  drop constraint if exists t3a_mentor_authorization_extension_chk, drop constraint if exists t3a_mentor_authorization_cycle_chk, drop constraint if exists t3a_mentor_authorization_channel_chk;
alter table public.t3a_d1_involvement drop constraint if exists t3a_d1_involvement_cycle_fn_chk;
drop table if exists public.t3a_mentor_confidence_socket, public.t3a_mentor_appeal, public.t3a_mentor_invitation, public.t3a_calibration_record cascade;
delete from public.t3a_field_physical_map where qualified_name like 'F.%';
drop function if exists public.t3a_redeem_invitation(uuid, text), public.t3a_mentor_may_observe(uuid, text, uuid);
