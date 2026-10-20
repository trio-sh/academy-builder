-- Rollback for 20261106 (Domain C). Applied to production 20 Oct 2026. Existing rows are untouched except the new nullable columns.
-- Dropping the columns discards attempt numbers (re-derivable from created_at order) and any values written to the new columns since.
drop trigger if exists t3a_1_attempt_sequence_trg on public.t3a_attempt;
drop trigger if exists t3a_1_stage_entry_time_trg on public.t3a_stage_entry_event;
do $$ declare t text; begin
  foreach t in array array['t3a_observation_path_gateway','t3a_stage_entry_event','t3a_attempt','t3a_mentor_assignment','t3a_observation'] loop
    execute format('drop trigger if exists t3a_2_required_fields_trg on public.%I', t);
    execute format('drop trigger if exists t3a_capture_state_fill on public.%I', t);
  end loop; end $$;
alter table public.t3a_observation_path_gateway drop column if exists observation_notification_timestamp, drop column if exists observation_path_completed_at;
alter table public.t3a_stage_entry_event drop column if exists session_id, drop column if exists entry_authority_actor_id, drop column if exists entry_authority_actor_id_capture_state,
  drop column if exists observation_mode, drop column if exists live_media_provider, drop column if exists live_media_provider_capture_state, drop column if exists stage_entry_hold_expires_at,
  drop column if exists administration_conditions_capture_state;
alter table public.t3a_attempt drop column if exists attempt_no, drop column if exists attempt_event_class, drop column if exists attempt_rules_version, drop column if exists cooldown_class, drop column if exists cooldown_class_capture_state,
  drop column if exists cooldown_ends_at, drop column if exists cooldown_ends_at_capture_state, drop column if exists attempt_reason, drop column if exists attempt_reason_capture_state,
  drop column if exists prior_progression_decision_ref, drop column if exists prior_progression_decision_ref_capture_state, drop column if exists cooldown_completed_at, drop column if exists cooldown_completed_at_capture_state,
  drop column if exists s1_not_required_ruleset_id, drop column if exists s1_not_required_ruleset_id_capture_state;
alter table public.t3a_mentor_assignment drop column if exists guidance_between_stages_received, drop column if exists guidance_between_stages_received_capture_state, drop column if exists guide_account_id, drop column if exists guide_account_id_capture_state;
alter table public.t3a_observation drop column if exists accommodation_applied, drop column if exists accommodation_applied_capture_state, drop column if exists accommodation_class_capture_state, drop column if exists assistance_declaration_capture_state, drop column if exists abandonment_state_capture_state;
delete from public.t3a_field_physical_map where qualified_name like 'C.%';
drop function if exists public.t3a_attempt_sequence(), public.t3a_stage_entry_time();
