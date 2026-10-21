-- Rollback for 20261111 (Domain H). Applied to production 20 Oct 2026 with the challenge tables empty.
drop trigger if exists t3a_capture_state_fill on public.t3a_challenge_case;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_challenge_case;
alter table public.t3a_challenge_case drop column if exists evidence_disclosed_at_capture_state, drop column if exists opened_by, drop column if exists challenge_target_ref, drop column if exists second_check_actor_id, drop column if exists challenge_outcome, drop column if exists outcome_reason_code, drop column if exists resolved_at, drop column if exists response_time_committed_version, drop column if exists issuance_hold, drop column if exists d1_ber_report_id;
drop trigger if exists t3a_capture_state_fill on public.t3a_reconsideration_assignment;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_reconsideration_assignment;
drop trigger if exists t3a_1_second_check_trg on public.t3a_challenge_case;
drop trigger if exists t3a_1_issuance_hold_trg on public.t3a_d1_report_issuance;
drop table if exists public.t3a_complaint, public.t3a_correction_request cascade;
delete from public.t3a_field_physical_map where qualified_name like 'H.%';
drop function if exists public.t3a_challenge_second_check(), public.t3a_issuance_hold();
