# Day 1 Reconciliation Report (final)

Package T3A-DEV-DAY1-001 v1.3. Database: production. Built by `tools/day1/reconciliation_report.py` from the live registry, physical map and aggregate row counts (no row content was read). The first pass (R1 inventory, automated R2) is `reconciliation-report-first-pass.md`.

## Steps

| Step | Status | Evidence |
|---|---|---|
| R1 Inventory | Done | `evidence/inventory.min.json`, `evidence/row-counts.json` |
| R2 Map | Done: every ACTIVE and DORMANT field has one class and one physical column | this report, `evidence/reconciliation_report.json` |
| R3 Plan | Done: one additive migration per domain (`supabase/migrations/20261104` to `20261127`), generated from `tools/day1/plans/`; no destructive statement | the migration files |
| R4 Apply | Done: every migration was tested on the throwaway database (`test-environment.md`), then applied to production | `evidence/*-test.json`, `evidence/production-apply-*-verification.json` |
| R5 Mark history | Done: rows that predate a new field are `not_captured` by default; nothing was invented. Existing rows touched are listed below | below |
| R6 Report | This document and the JSON | `evidence/reconciliation_report.json` |

## Counts

522 fields (ACTIVE and DORMANT) mapped; DT-01 passes in production (522 of 522).

| Class | Meaning | Fields |
|---|---|---|
| M1 | EXACT | 89 |
| M2 | RENAME | 19 |
| M3 | TYPE | 4 |
| M5 | MISSING (added) | 410 |

Extra columns not in the dictionary (M7, status LEGACY, existing writes unchanged, no new reader): 1,591 columns in 255 of the t3a tables (2,453 columns in all). Listed in `evidence/dt56-m7-undeclared-columns.json`.

Prohibited items present (M6): frozen in place, not deleted, no new reader; the register is CR-006 (code and data hits, 1,939 in the baseline) and CR-014 (new D1 tables). The `forbidden_ratchet.py` check stops the count from growing.

## Existing rows touched (R5)

No existing value was changed and no row was deleted. The only writes to rows that already existed:

| Table | Rows | What |
|---|---|---|
| `t3a_attempt` | 4 | attempt_no numbered in time order (new column) |
| `t3a_stage_entry_event` | 8 | administration_conditions capture state set to captured (new column) |
| `growth_log_entries` | 5 | platform generated rows hidden, not deleted (new column) |

Structure changed on existing objects (no data): one check widened (`t3a_employer_application.approval_decision` now also allows `declined`, table empty); guards added (observation append only, free text refusal on two mentor tables, issuance and consent gates, set once milestones); the 5 Growth Log rows hidden by a new column and a narrower read policy; nothing dropped.

`t3a_event_log` holds 0 rows: the event registry and envelope were built before any event had been written. Backfills write no events (no history is invented, CR-032).

## Every field

| Field | Status | Class | Table.column | Capture state column | Action (migration) | Rows in table | Rows with a value | Rows not captured |
|---|---|---|---|---|---|---|---|---|
| `A.account_created_at` | ACTIVE | M5 MISSING (added) | `t3a_account.account_created_at` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.account_creation_route` | ACTIVE | M5 MISSING (added) | `t3a_account.account_creation_route` | `account_creation_route_capture_state` | 20261104000000_day1_accounts_roles | 15 | 15 | 0 |
| `A.account_id` | ACTIVE | M5 MISSING (added) | `t3a_account.account_id` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.account_state` | ACTIVE | M5 MISSING (added) | `t3a_account.account_state` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.age_eligibility_attestation` | ACTIVE | M5 MISSING (added) | `t3a_account.age_eligibility_attestation` |  | 20261104000000_day1_accounts_roles | 15 | 0 |  |
| `A.city_of_residence` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.city_of_residence` | `city_of_residence_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.country_of_residence` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.country_of_residence` | `country_of_residence_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.display_name` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.display_name` | `display_name_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.email_address` | ACTIVE | M5 MISSING (added) | `t3a_account.email_address` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.email_verification_sent_at` | ACTIVE | M5 MISSING (added) | `t3a_account.email_verification_sent_at` | `email_verification_sent_at_capture_state` | 20261104000000_day1_accounts_roles | 15 | 0 | 15 |
| `A.email_verification_state` | ACTIVE | M5 MISSING (added) | `t3a_account.email_verification_state` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.email_verified_at` | ACTIVE | M5 MISSING (added) | `t3a_account.email_verified_at` | `email_verified_at_capture_state` | 20261104000000_day1_accounts_roles | 15 | 15 | 0 |
| `A.enrolled_at` | ACTIVE | M5 MISSING (added) | `t3a_participant_enrollment.enrolled_at` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.enrollment_event_id` | ACTIVE | M5 MISSING (added) | `t3a_participant_enrollment.enrollment_event_id` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.enrollment_scope` | ACTIVE | M5 MISSING (added) | `t3a_participant_enrollment.enrollment_scope` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.identity_assurance_method` | ACTIVE | M5 MISSING (added) | `t3a_account.identity_assurance_method` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.identity_link_status` | ACTIVE | M5 MISSING (added) | `t3a_account.identity_link_status` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.legal_name` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.legal_name` | `legal_name_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.notification_channel_preference` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.notification_channel_preference` | `notification_channel_preference_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.occupation_interest` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.occupation_interest` | `occupation_interest_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.occupational_classification_version` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.occupational_classification_version` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.participant_lifecycle_state` | ACTIVE | M5 MISSING (added) | `t3a_account.participant_lifecycle_state` | `participant_lifecycle_state_capture_state` | 20261104000000_day1_accounts_roles | 15 | 0 | 15 |
| `A.participant_pseudonym_ref` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.participant_pseudonym_ref` |  | 20261104000000_day1_accounts_roles | 15 | 6 |  |
| `A.pilot_cohort_id` | ACTIVE | M5 MISSING (added) | `t3a_account.pilot_cohort_id` | `pilot_cohort_id_capture_state` | 20261104000000_day1_accounts_roles | 15 | 0 | 15 |
| `A.preferred_language` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.preferred_language` | `preferred_language_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.privacy_jurisdiction_code` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.privacy_jurisdiction_code` | `privacy_jurisdiction_code_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.profile_document_ref` | ACTIVE | M5 MISSING (added) | `t3a_participant_document.profile_document_ref` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.profile_field_source` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.profile_field_source` | `profile_field_source_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.record_property` | ACTIVE | M5 MISSING (added) | `t3a_account.record_property` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.recruitment_channel_code` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.recruitment_channel_code` | `recruitment_channel_code_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.role_assignment_id` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_assignment_id` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_code` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_code` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_effective_from` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_effective_from` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_effective_until` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_effective_until` |  | 20261104000000_day1_accounts_roles | 15 | 0 |  |
| `A.role_grant_basis` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_grant_basis` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_granted_at` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_granted_at` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_granted_by` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_granted_by` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_revocation_basis` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment_revocation.role_revocation_basis` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.role_revoked_at` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment_revocation.role_revoked_at` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.role_revoked_by` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment_revocation.role_revoked_by` |  | 20261104000000_day1_accounts_roles | 0 | 0 |  |
| `A.role_rules_version` | ACTIVE | M5 MISSING (added) | `t3a_role_assignment.role_rules_version` |  | 20261104000000_day1_accounts_roles | 15 | 15 |  |
| `A.role_seniority_context_code` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.role_seniority_context_code` | `role_seniority_context_code_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.subdivision_of_residence` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.subdivision_of_residence` | `subdivision_of_residence_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.target_industry_code` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.target_industry_code` | `target_industry_code_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `A.timezone` | ACTIVE | M5 MISSING (added) | `t3a_participant_profile.timezone` | `timezone_capture_state` | 20261104000000_day1_accounts_roles | 0 | 0 | 0 |
| `B.authorization_basis_type` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.authorization_basis_type` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_actor_id` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_actor_id` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_copy_hash` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_copy_hash` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_copy_version` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_copy_version` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_effective_at` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_effective_at` | `consent_effective_at_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.consent_expires_at` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_expires_at` | `consent_expires_at_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.consent_id` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_id` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_language` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_language` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_method` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_method` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_scope_dimension_id` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_scope_dimension_id` | `consent_scope_dimension_id_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.consent_scope_stage_code` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_scope_stage_code` | `consent_scope_stage_code_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.consent_state_ref` | ACTIVE | M5 MISSING (added) | `t3a_consent_state_ref.consent_state_ref` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_status` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_status` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_timestamp` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_timestamp` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consent_type` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consent_type` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.consequence_displayed` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.consequence_displayed` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.contact_consent_at` | ACTIVE | M5 MISSING (added) | `t3a_contact_consent.contact_consent_at` | `contact_consent_at_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.contact_consent_status` | ACTIVE | M5 MISSING (added) | `t3a_contact_consent.contact_consent_status` | `contact_consent_status_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.historical_reuse_scope` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.historical_reuse_scope` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.ip_address_hash` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.ip_address_hash` | `ip_address_hash_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.lsa_consent_state` | DORMANT | M5 MISSING (added) | `t3a_lsa_consent.lsa_consent_state` | `lsa_consent_state_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.lsa_consent_text_version` | DORMANT | M5 MISSING (added) | `t3a_lsa_consent.lsa_consent_text_version` | `lsa_consent_text_version_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.lsa_consent_timestamp` | DORMANT | M5 MISSING (added) | `t3a_lsa_consent.lsa_consent_timestamp` | `lsa_consent_timestamp_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.lsa_withdrawal_timestamp` | DORMANT | M5 MISSING (added) | `t3a_lsa_consent.lsa_withdrawal_timestamp` | `lsa_withdrawal_timestamp_capture_state` | 20261105000000_day1_consent | 0 | 0 | 0 |
| `B.privacy_notice_hash` | ACTIVE | M5 MISSING (added) | `t3a_privacy_notice_acknowledgement.privacy_notice_hash` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.privacy_notice_version` | ACTIVE | M5 MISSING (added) | `t3a_privacy_notice_acknowledgement.privacy_notice_version` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.processing_purpose_id` | ACTIVE | M5 MISSING (added) | `t3a_consent_record.processing_purpose_id` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `B.superseded_by` | ACTIVE | M5 MISSING (added) | `t3a_consent_supersession.superseded_by` |  | 20261105000000_day1_consent | 0 | 0 |  |
| `C.abandonment_state` | ACTIVE | M1 EXACT | `t3a_observation.abandonment_state` | `abandonment_state_capture_state` | 20261106000000_day1_observation_path | 0 | 0 | 0 |
| `C.accommodation_applied` | ACTIVE | M5 MISSING (added) | `t3a_observation.accommodation_applied` | `accommodation_applied_capture_state` | 20261106000000_day1_observation_path | 0 | 0 | 0 |
| `C.accommodation_class` | ACTIVE | M1 EXACT | `t3a_observation.accommodation_class` | `accommodation_class_capture_state` | 20261106000000_day1_observation_path | 0 | 0 | 0 |
| `C.administration_conditions` | ACTIVE | M1 EXACT | `t3a_stage_entry_event.administration_conditions` | `administration_conditions_capture_state` | 20261106000000_day1_observation_path | 8 | 8 | 0 |
| `C.assignment_method` | ACTIVE | M1 EXACT | `t3a_mentor_assignment.assignment_method` |  | 20261106000000_day1_observation_path | 3 | 3 |  |
| `C.assistance_declaration` | ACTIVE | M1 EXACT | `t3a_observation.assistance_declaration` | `assistance_declaration_capture_state` | 20261106000000_day1_observation_path | 0 | 0 | 0 |
| `C.assistance_rules_version` | ACTIVE | M1 EXACT | `t3a_observation_path_gateway.assistance_rules_version` |  | 20261106000000_day1_observation_path | 7 | 7 |  |
| `C.attempt_counted` | ACTIVE | M2 RENAME | `t3a_attempt.counted` |  | 20261106000000_day1_observation_path | 4 | 4 |  |
| `C.attempt_event_class` | ACTIVE | M5 MISSING (added) | `t3a_attempt.attempt_event_class` |  | 20261106000000_day1_observation_path | 4 | 0 |  |
| `C.attempt_no` | ACTIVE | M5 MISSING (added) | `t3a_attempt.attempt_no` |  | 20261106000000_day1_observation_path | 4 | 4 |  |
| `C.attempt_reason` | ACTIVE | M5 MISSING (added) | `t3a_attempt.attempt_reason` | `attempt_reason_capture_state` | 20261106000000_day1_observation_path | 4 | 0 | 4 |
| `C.attempt_rules_version` | ACTIVE | M5 MISSING (added) | `t3a_attempt.attempt_rules_version` |  | 20261106000000_day1_observation_path | 4 | 0 |  |
| `C.coaching_terminated_at` | ACTIVE | M1 EXACT | `t3a_observation_path_gateway.coaching_terminated_at` |  | 20261106000000_day1_observation_path | 7 | 7 |  |
| `C.cooldown_class` | ACTIVE | M5 MISSING (added) | `t3a_attempt.cooldown_class` | `cooldown_class_capture_state` | 20261106000000_day1_observation_path | 4 | 0 | 4 |
| `C.cooldown_completed_at` | ACTIVE | M5 MISSING (added) | `t3a_attempt.cooldown_completed_at` | `cooldown_completed_at_capture_state` | 20261106000000_day1_observation_path | 4 | 0 | 4 |
| `C.cooldown_ends_at` | ACTIVE | M5 MISSING (added) | `t3a_attempt.cooldown_ends_at` | `cooldown_ends_at_capture_state` | 20261106000000_day1_observation_path | 4 | 0 | 4 |
| `C.dimensions_in_play` | ACTIVE | M1 EXACT | `t3a_stage_entry_event.dimensions_in_play` |  | 20261106000000_day1_observation_path | 8 | 8 |  |
| `C.entry_authority_actor_id` | ACTIVE | M5 MISSING (added) | `t3a_stage_entry_event.entry_authority_actor_id` | `entry_authority_actor_id_capture_state` | 20261106000000_day1_observation_path | 8 | 0 | 8 |
| `C.gateway_opened_at` | ACTIVE | M2 RENAME | `t3a_observation_path_gateway.created_at` |  | 20261106000000_day1_observation_path | 7 | 7 |  |
| `C.guidance_between_stages_received` | ACTIVE | M5 MISSING (added) | `t3a_mentor_assignment.guidance_between_stages_received` | `guidance_between_stages_received_capture_state` | 20261106000000_day1_observation_path | 3 | 0 | 3 |
| `C.guide_account_id` | ACTIVE | M5 MISSING (added) | `t3a_mentor_assignment.guide_account_id` | `guide_account_id_capture_state` | 20261106000000_day1_observation_path | 3 | 0 | 3 |
| `C.live_media_provider` | ACTIVE | M5 MISSING (added) | `t3a_stage_entry_event.live_media_provider` | `live_media_provider_capture_state` | 20261106000000_day1_observation_path | 8 | 0 | 8 |
| `C.mentor_assignment_id` | ACTIVE | M1 EXACT | `t3a_mentor_assignment.mentor_assignment_id` |  | 20261106000000_day1_observation_path | 3 | 3 |  |
| `C.observation_mode` | ACTIVE | M5 MISSING (added) | `t3a_stage_entry_event.observation_mode` |  | 20261106000000_day1_observation_path | 8 | 0 |  |
| `C.observation_notification_timestamp` | ACTIVE | M5 MISSING (added) | `t3a_observation_path_gateway.observation_notification_timestamp` |  | 20261106000000_day1_observation_path | 7 | 0 |  |
| `C.observation_path_completed_at` | ACTIVE | M5 MISSING (added) | `t3a_observation_path_gateway.observation_path_completed_at` |  | 20261106000000_day1_observation_path | 7 | 0 |  |
| `C.observation_path_gateway_id` | ACTIVE | M1 EXACT | `t3a_observation_path_gateway.observation_path_gateway_id` |  | 20261106000000_day1_observation_path | 7 | 7 |  |
| `C.prior_allocation_count` | ACTIVE | M1 EXACT | `t3a_mentor_assignment.prior_allocation_count` |  | 20261106000000_day1_observation_path | 3 | 3 |  |
| `C.prior_progression_decision_ref` | ACTIVE | M5 MISSING (added) | `t3a_attempt.prior_progression_decision_ref` | `prior_progression_decision_ref_capture_state` | 20261106000000_day1_observation_path | 4 | 0 | 4 |
| `C.s1_not_required_ruleset_id` | ACTIVE | M5 MISSING (added) | `t3a_attempt.s1_not_required_ruleset_id` | `s1_not_required_ruleset_id_capture_state` | 20261106000000_day1_observation_path | 4 | 0 | 4 |
| `C.session_id` | ACTIVE | M5 MISSING (added) | `t3a_stage_entry_event.session_id` |  | 20261106000000_day1_observation_path | 8 | 0 |  |
| `C.session_identity_method` | ACTIVE | M1 EXACT | `t3a_observation_path_gateway.session_identity_method` |  | 20261106000000_day1_observation_path | 7 | 7 |  |
| `C.stage_code` | ACTIVE | M1 EXACT | `t3a_stage_entry_event.stage_code` |  | 20261106000000_day1_observation_path | 8 | 8 |  |
| `C.stage_entry_event_id` | ACTIVE | M1 EXACT | `t3a_stage_entry_event.stage_entry_event_id` |  | 20261106000000_day1_observation_path | 8 | 8 |  |
| `C.stage_entry_hold_expires_at` | ACTIVE | M5 MISSING (added) | `t3a_stage_entry_event.stage_entry_hold_expires_at` |  | 20261106000000_day1_observation_path | 8 | 0 |  |
| `C.stage_instance_id` | ACTIVE | M1 EXACT | `t3a_stage_entry_event.stage_instance_id` |  | 20261106000000_day1_observation_path | 8 | 8 |  |
| `D.administration_form_id` | ACTIVE | M5 MISSING (added) | `t3a_source.administration_form_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.answer_key_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.answer_key_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.approval_authority` | ACTIVE | M5 MISSING (added) | `t3a_source_version.approval_authority` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.approval_record_id` | ACTIVE | M5 MISSING (added) | `t3a_source_version.approval_record_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.approved_at` | ACTIVE | M1 EXACT | `t3a_source_version.approved_at` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.atlas_moment_id` | ACTIVE | M5 MISSING (added) | `t3a_source.atlas_moment_id` | `atlas_moment_id_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.atlas_terrain_id` | ACTIVE | M5 MISSING (added) | `t3a_source.atlas_terrain_id` | `atlas_terrain_id_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.beat_sequence` | ACTIVE | M5 MISSING (added) | `t3a_source.beat_sequence` | `beat_sequence_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.capture_catalog_version` | ACTIVE | M5 MISSING (added) | `t3a_source.capture_catalog_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.comparison_demand_id` | DORMANT | M5 MISSING (added) | `t3a_source.comparison_demand_id` | `comparison_demand_id_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.comparison_family_id` | DORMANT | M5 MISSING (added) | `t3a_source.comparison_family_id` | `comparison_family_id_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.compatibility_class` | ACTIVE | M1 EXACT | `t3a_source_version.compatibility_class` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.content_sensitivity` | ACTIVE | M5 MISSING (added) | `t3a_source.content_sensitivity` | `content_sensitivity_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.cross_context_map` | ACTIVE | M1 EXACT | `t3a_source_version.cross_context_map` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.delivery_script_version` | ACTIVE | M5 MISSING (added) | `t3a_source.delivery_script_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.demand_conditions_version` | DORMANT | M5 MISSING (added) | `t3a_source.demand_conditions_version` | `demand_conditions_version_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.form_relationship_id` | DORMANT | M5 MISSING (added) | `t3a_source.form_relationship_id` | `form_relationship_id_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.interaction_pattern_family_id` | ACTIVE | M5 MISSING (added) | `t3a_source.interaction_pattern_family_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.irrelevant_conduct` | ACTIVE | M1 EXACT | `t3a_source_version.irrelevant_conduct` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.longitudinal_use_status` | DORMANT | M5 MISSING (added) | `t3a_source.longitudinal_use_status` | `longitudinal_use_status_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.max_seconds` | ACTIVE | M1 EXACT | `t3a_source_version.max_seconds` | `max_seconds_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.min_seconds` | ACTIVE | M1 EXACT | `t3a_source_version.min_seconds` | `min_seconds_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.name_clearance_status` | ACTIVE | M5 MISSING (added) | `t3a_source.name_clearance_status` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.observation_opportunity_id` | DORMANT | M5 MISSING (added) | `t3a_source.observation_opportunity_id` | `observation_opportunity_id_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.permitted_administration_variance` | ACTIVE | M3 TYPE | `t3a_source_version.permitted_administration_variance` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.presentation_variant_values` | ACTIVE | M1 EXACT | `t3a_rendered_instance.presentation_variant_values` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.question_set_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.question_set_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.randomization_seed` | ACTIVE | M1 EXACT | `t3a_stage_entry_event.randomization_seed` |  | 20261107000000_day1_sources | 8 | 8 |  |
| `D.recurrence_key_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.recurrence_key_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.relevant_conduct` | ACTIVE | M1 EXACT | `t3a_source_version.relevant_conduct` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.rendered_instance_hash` | ACTIVE | M1 EXACT | `t3a_rendered_instance.rendered_instance_hash` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.resolution_rule_version` | ACTIVE | M5 MISSING (added) | `t3a_source.resolution_rule_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.scenario_class` | ACTIVE | M1 EXACT | `t3a_source_version.scenario_class` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.secondary_situation_class` | ACTIVE | M5 MISSING (added) | `t3a_source.secondary_situation_class` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.served_at` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.served_at` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.served_instance_id` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.served_instance_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.served_language` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.served_language` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.serving_eligible` | ACTIVE | M5 MISSING (added) | `t3a_source.serving_eligible` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.situation_class` | ACTIVE | M5 MISSING (added) | `t3a_source.situation_class` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.situation_context` | DORMANT | M5 MISSING (added) | `t3a_source.situation_context` | `situation_context_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.source_bank_id` | ACTIVE | M5 MISSING (added) | `t3a_source.source_bank_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_created_at` | ACTIVE | M2 RENAME | `t3a_source.created_at` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_created_by` | ACTIVE | M5 MISSING (added) | `t3a_source.source_created_by` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_display_title` | ACTIVE | M5 MISSING (added) | `t3a_source.source_display_title` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_effective_from` | ACTIVE | M5 MISSING (added) | `t3a_source.source_effective_from` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_effective_until` | ACTIVE | M5 MISSING (added) | `t3a_source.source_effective_until` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_id` | ACTIVE | M1 EXACT | `t3a_source.source_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_material_manifest_ref` | ACTIVE | M5 MISSING (added) | `t3a_source.source_material_manifest_ref` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_status` | ACTIVE | M5 MISSING (added) | `t3a_source_version.source_status` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_version_hash` | ACTIVE | M1 EXACT | `t3a_source_version.source_version_hash` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.source_version_id` | ACTIVE | M1 EXACT | `t3a_source_version.source_version_id` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.stage1_engine_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.stage1_engine_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.stage1_script_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.stage1_script_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.stated_standard` | ACTIVE | M3 TYPE | `t3a_source_version.stated_standard` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.statement_library_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.statement_library_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.template_register_version` | ACTIVE | M5 MISSING (added) | `t3a_served_instance.template_register_version` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.unsupported_inferences` | ACTIVE | M1 EXACT | `t3a_source_version.unsupported_inferences` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `D.variation_intent` | DORMANT | M5 MISSING (added) | `t3a_source.variation_intent` | `variation_intent_capture_state` | 20261107000000_day1_sources | 0 | 0 | 0 |
| `D.version_change_reason` | ACTIVE | M5 MISSING (added) | `t3a_source_version.version_change_reason` |  | 20261107000000_day1_sources | 0 | 0 |  |
| `E.administration_variance` | ACTIVE | M1 EXACT | `t3a_observation.administration_variance` | `administration_variance_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.answer_option_id` | ACTIVE | M5 MISSING (added) | `t3a_determination.answer_option_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.authorization_snapshot_ref` | ACTIVE | M1 EXACT | `t3a_mentor_judgment.authorization_snapshot_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.beat_code` | ACTIVE | M5 MISSING (added) | `t3a_observation.beat_code` | `beat_code_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.beat_started_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.beat_started_at` | `beat_started_at_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.branch_trigger_ref` | ACTIVE | M5 MISSING (added) | `t3a_observation.branch_trigger_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.capture_delay_seconds` | ACTIVE | M5 MISSING (added) | `t3a_observation.capture_delay_seconds` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.capture_edit_history_ref` | ACTIVE | M5 MISSING (added) | `t3a_observation.capture_edit_history_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.captured_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.captured_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.clause_instance_id` | ACTIVE | M5 MISSING (added) | `t3a_determination.clause_instance_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.committed_at` | ACTIVE | M2 RENAME | `t3a_observation.created_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.comparability_class` | ACTIVE | M1 EXACT | `t3a_observation.comparability_class` | `comparability_class_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.conduct_element_id` | ACTIVE | M5 MISSING (added) | `t3a_determination.conduct_element_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.confirmation_role` | ACTIVE | M1 EXACT | `t3a_mentor_judgment.confirmation_role` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.contemporaneity` | ACTIVE | M1 EXACT | `t3a_observation.contemporaneity` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.corrected_decision_ref` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.corrected_decision_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.correction_effective_date` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.correction_effective_date` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.data_source` | ACTIVE | M5 MISSING (added) | `t3a_observation.data_source` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.decided_at` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.decided_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.decided_by` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.decided_by` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.decision` | ACTIVE | M1 EXACT | `t3a_d1_progression_decision.decision` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.decision_rationale_code` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.decision_rationale_code` | `decision_rationale_code_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.decision_scope` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.decision_scope` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.determination_id` | ACTIVE | M5 MISSING (added) | `t3a_determination.determination_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.determination_missing_state` | ACTIVE | M5 MISSING (added) | `t3a_determination.determination_missing_state` | `determination_missing_state_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.determined_at` | ACTIVE | M5 MISSING (added) | `t3a_determination.determined_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.determined_by` | ACTIVE | M5 MISSING (added) | `t3a_determination.determined_by` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.dimension_id` | ACTIVE | M1 EXACT | `t3a_observation.dimension_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.evidence_class` | ACTIVE | M1 EXACT | `t3a_observation.evidence_class` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.evidence_currency_expires_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.evidence_currency_expires_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.integrity_status` | ACTIVE | M1 EXACT | `t3a_observation.integrity_status` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.list_selection_ids` | ACTIVE | M5 MISSING (added) | `t3a_determination.list_selection_ids` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observation_authorization_ref` | ACTIVE | M5 MISSING (added) | `t3a_observation.observation_authorization_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observation_id` | ACTIVE | M1 EXACT | `t3a_observation.observation_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observed_at` | ACTIVE | M2 RENAME | `t3a_observation.occurred_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observed_opportunity_ref` | DORMANT | M5 MISSING (added) | `t3a_observation.observed_opportunity_ref` | `observed_opportunity_ref_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.observer_authorization_snapshot_ref` | ACTIVE | M5 MISSING (added) | `t3a_observation.observer_authorization_snapshot_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observer_calibration_version` | ACTIVE | M5 MISSING (added) | `t3a_observation.observer_calibration_version` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observer_disagreement_refs` | ACTIVE | M5 MISSING (added) | `t3a_observation.observer_disagreement_refs` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observer_id` | ACTIVE | M1 EXACT | `t3a_observation.observer_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observer_independence_state` | ACTIVE | M5 MISSING (added) | `t3a_observation.observer_independence_state` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.observer_role` | ACTIVE | M5 MISSING (added) | `t3a_observation.observer_role` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.original_decision_date` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.original_decision_date` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.participant_id` | ACTIVE | M1 EXACT | `t3a_observation.participant_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.prior_exposure_known_state` | ACTIVE | M5 MISSING (added) | `t3a_observation.prior_exposure_known_state` | `prior_exposure_known_state_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.progression_decision_id` | ACTIVE | M1 EXACT | `t3a_d1_progression_decision.progression_decision_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.prompt_material_sequence` | ACTIVE | M5 MISSING (added) | `t3a_observation.prompt_material_sequence` | `prompt_material_sequence_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.question_id` | ACTIVE | M5 MISSING (added) | `t3a_determination.question_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.question_serving_state` | ACTIVE | M5 MISSING (added) | `t3a_observation.question_serving_state` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.record_snapshot_hash` | ACTIVE | M5 MISSING (added) | `t3a_observation.record_snapshot_hash` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.recurrence_equivalence_key_id` | ACTIVE | M5 MISSING (added) | `t3a_determination.recurrence_equivalence_key_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.response_artifact_ref` | ACTIVE | M5 MISSING (added) | `t3a_observation.response_artifact_ref` | `response_artifact_ref_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.response_sequence_number` | ACTIVE | M5 MISSING (added) | `t3a_observation.response_sequence_number` | `response_sequence_number_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.response_submitted_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.response_submitted_at` | `response_submitted_at_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.reviewer_independence_state` | ACTIVE | M5 MISSING (added) | `t3a_observation.reviewer_independence_state` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.s1_human_confirmation_actor_id` | ACTIVE | M5 MISSING (added) | `t3a_observation.s1_human_confirmation_actor_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.s1_human_confirmation_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.s1_human_confirmation_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.s1_outcome_delivered_to_mentor_at` | ACTIVE | M5 MISSING (added) | `t3a_stage_sequence.s1_outcome_delivered_to_mentor_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.s1_output_unmasked_at` | ACTIVE | M5 MISSING (added) | `t3a_stage_sequence.s1_output_unmasked_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.s2_determinations_locked_at` | ACTIVE | M5 MISSING (added) | `t3a_stage_sequence.s2_determinations_locked_at` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.s3_submission_provenance` | ACTIVE | M5 MISSING (added) | `t3a_observation.s3_submission_provenance` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.served_instance_id` | ACTIVE | M5 MISSING (added) | `t3a_observation.served_instance_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.session_admin_state` | ACTIVE | M5 MISSING (added) | `t3a_observation.session_admin_state` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.session_ended_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.session_ended_at` | `session_ended_at_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.session_serving_state` | ACTIVE | M5 MISSING (added) | `t3a_observation.session_serving_state` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.session_started_at` | ACTIVE | M5 MISSING (added) | `t3a_observation.session_started_at` | `session_started_at_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.source_version_id` | ACTIVE | M1 EXACT | `t3a_observation.source_version_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.stage_code` | ACTIVE | M1 EXACT | `t3a_observation.stage_code` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.stage_instance_id` | ACTIVE | M1 EXACT | `t3a_observation.stage_instance_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.state_code` | ACTIVE | M5 MISSING (added) | `t3a_determination.state_code` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.statement_digest` | ACTIVE | M5 MISSING (added) | `t3a_composed_statement.statement_digest` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.statement_id` | ACTIVE | M1 EXACT | `t3a_composed_statement.statement_id` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.statement_version` | ACTIVE | M5 MISSING (added) | `t3a_composed_statement.statement_version` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.submission_origin` | ACTIVE | M1 EXACT | `t3a_observation.submission_origin` | `submission_origin_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.superseded_by` | ACTIVE | M1 EXACT | `t3a_observation.superseded_by` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.supersedes` | ACTIVE | M1 EXACT | `t3a_observation.supersedes` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `E.technical_issue_codes` | ACTIVE | M5 MISSING (added) | `t3a_observation.technical_issue_codes` | `technical_issue_codes_capture_state` | 20261108000000_day1_observation_record | 0 | 0 | 0 |
| `E.welfare_stop_ref` | ACTIVE | M5 MISSING (added) | `t3a_d1_progression_decision.welfare_stop_ref` |  | 20261108000000_day1_observation_record | 0 | 0 |  |
| `F.agreement_statistic_inputs` | ACTIVE | M5 MISSING (added) | `t3a_calibration_record.agreement_statistic_inputs` | `agreement_statistic_inputs_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.agreement_threshold_version` | ACTIVE | M5 MISSING (added) | `t3a_calibration_record.agreement_threshold_version` | `agreement_threshold_version_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.authorization_id` | ACTIVE | M2 RENAME | `t3a_mentor_authorization.mentor_authorization_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.authorization_status` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.authorization_status` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.authorized_dimension_id` | ACTIVE | M2 RENAME | `t3a_mentor_authorization.dimension_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.calibration_record_id` | ACTIVE | M5 MISSING (added) | `t3a_calibration_record.calibration_record_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.calibration_status` | ACTIVE | M1 EXACT | `t3a_mentor_authorization.calibration_status` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.conflict_declaration_id` | ACTIVE | M1 EXACT | `t3a_conflict_declaration.conflict_declaration_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.cycle_function` | ACTIVE | M5 MISSING (added) | `t3a_d1_involvement.cycle_function` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.decided_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_appeal.decided_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.declared_at` | ACTIVE | M1 EXACT | `t3a_conflict_declaration.declared_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.declared_entity_refs` | ACTIVE | M5 MISSING (added) | `t3a_conflict_declaration.declared_entity_refs` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.effective_from` | ACTIVE | M2 RENAME | `t3a_mentor_authorization.authorized_from` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.effective_to` | ACTIVE | M2 RENAME | `t3a_mentor_authorization.authorized_until` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.engagement_started_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.engagement_started_at` | `engagement_started_at_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.evidence_cycle_id` | ACTIVE | M5 MISSING (added) | `t3a_d1_involvement.evidence_cycle_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.independent_approver_id` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.independent_approver_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.invitation_expires_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.invitation_expires_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.invitation_redeemed_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.invitation_redeemed_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.invitation_sent_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.invitation_sent_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.invited_by` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.invited_by` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.involvement_id` | ACTIVE | M1 EXACT | `t3a_d1_involvement.involvement_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.issuer_authorization` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.issuer_authorization` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.mentor_agreement_signed_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.mentor_agreement_signed_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.mentor_agreement_version` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.mentor_agreement_version` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.mentor_appeal_id` | ACTIVE | M5 MISSING (added) | `t3a_mentor_appeal.mentor_appeal_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.mentor_invitation_id` | ACTIVE | M5 MISSING (added) | `t3a_mentor_invitation.mentor_invitation_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.moderation_sample_flag` | ACTIVE | M5 MISSING (added) | `t3a_calibration_record.moderation_sample_flag` | `moderation_sample_flag_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.observations_per_month_commitment` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.observations_per_month_commitment` | `observations_per_month_commitment_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.observer_qualification_record_ref` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.observer_qualification_record_ref` | `observer_qualification_record_ref_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.observer_specialty_domain_codes` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.observer_specialty_domain_codes` | `observer_specialty_domain_codes_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.opened_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_appeal.opened_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.paired_determination_set_id` | ACTIVE | M5 MISSING (added) | `t3a_calibration_record.paired_determination_set_id` | `paired_determination_set_id_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.qualification_reviewed_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.qualification_reviewed_at` | `qualification_reviewed_at_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.recusal_id` | ACTIVE | M5 MISSING (added) | `t3a_conflict_declaration.recusal_id` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.reference_set_version` | ACTIVE | M1 EXACT | `t3a_mentor_authorization.reference_set_version` | `reference_set_version_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.reviewer_authorization` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.reviewer_authorization` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.s1_exposure_flag` | ACTIVE | M5 MISSING (added) | `t3a_d1_involvement.s1_exposure_flag` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.sampling_plan_version` | ACTIVE | M1 EXACT | `t3a_moderation_sample.sampling_plan_version` | `sampling_plan_version_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.sourcing_channel` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.sourcing_channel` | `sourcing_channel_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.sourcing_employer_ref` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.sourcing_employer_ref` | `sourcing_employer_ref_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.stimulus_unit_id` | ACTIVE | M5 MISSING (added) | `t3a_calibration_record.stimulus_unit_id` | `stimulus_unit_id_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.supervised_sessions_completed` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.supervised_sessions_completed` | `supervised_sessions_completed_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.supervised_status_started_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.supervised_status_started_at` | `supervised_status_started_at_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.supervision_finding_code` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.supervision_finding_code` | `supervision_finding_code_capture_state` | 20261109000000_day1_mentor_assurance | 0 | 0 | 0 |
| `F.suspension_extension_count` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.suspension_extension_count` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `F.suspension_started_at` | ACTIVE | M5 MISSING (added) | `t3a_mentor_authorization.suspension_started_at` |  | 20261109000000_day1_mentor_assurance | 0 | 0 |  |
| `G.availability_changed_at` | ACTIVE | M5 MISSING (added) | `t3a_report_release.availability_changed_at` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.ber_report_id` | ACTIVE | M1 EXACT | `t3a_d1_ber_report.ber_report_id` |  | 20261110000000_day1_report_release | 1 | 1 |  |
| `G.ber_standard_version` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.ber_standard_version` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.ber_status` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.ber_status` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.ber_version` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.ber_version` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.cross_cutting_condition_flags` | ACTIVE | M5 MISSING (added) | `t3a_dimension_evidence.cross_cutting_condition_flags` | `cross_cutting_condition_flags_capture_state` | 20261110000000_day1_report_release | 0 | 0 | 0 |
| `G.dimension_evidence_state` | ACTIVE | M5 MISSING (added) | `t3a_dimension_evidence.dimension_evidence_state` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.employer_visibility_state` | ACTIVE | M5 MISSING (added) | `t3a_report_release.employer_visibility_state` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.evidence_review_id` | ACTIVE | M5 MISSING (added) | `t3a_evidence_review.evidence_review_id` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.insufficiency_reason` | ACTIVE | M1 EXACT | `t3a_dimension_evidence.insufficiency_reason` | `insufficiency_reason_capture_state` | 20261110000000_day1_report_release | 0 | 0 | 0 |
| `G.issued_at` | ACTIVE | M1 EXACT | `t3a_d1_report_issuance.issued_at` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.issued_by` | ACTIVE | M1 EXACT | `t3a_d1_report_issuance.issued_by` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.observer_multiplicity_statement_code` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.observer_multiplicity_statement_code` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.participant_review_completed_at` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.participant_review_completed_at` | `participant_review_completed_at_capture_state` | 20261110000000_day1_report_release | 1 | 0 | 1 |
| `G.participant_review_opened_at` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.participant_review_opened_at` | `participant_review_opened_at_capture_state` | 20261110000000_day1_report_release | 1 | 0 | 1 |
| `G.permitted_use_version` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.permitted_use_version` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.preview_state` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.preview_state` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.recipient_address_hash` | ACTIVE | M5 MISSING (added) | `t3a_report_release.recipient_address_hash` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.recipient_release_id` | ACTIVE | M5 MISSING (added) | `t3a_report_release.recipient_release_id` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.release_mode` | ACTIVE | M5 MISSING (added) | `t3a_report_release.release_mode` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.report_access_id` | ACTIVE | M5 MISSING (added) | `t3a_report_access.report_access_id` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.report_content_digest` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.report_content_digest` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.report_preview_digest` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.report_preview_digest` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.report_type` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.report_type` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.represented_dimension_ids` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.represented_dimension_ids` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.review_checklist_results` | ACTIVE | M5 MISSING (added) | `t3a_evidence_review.review_checklist_results` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.review_completed_at` | ACTIVE | M5 MISSING (added) | `t3a_evidence_review.review_completed_at` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.reviewer_id` | ACTIVE | M5 MISSING (added) | `t3a_evidence_review.reviewer_id` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.source_link` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.source_link` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.specimen_render_flag` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.specimen_render_flag` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.sufficiency_rules_version` | ACTIVE | M1 EXACT | `t3a_dimension_evidence.sufficiency_rules_version` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.talentvisa_active` | ACTIVE | M5 MISSING (added) | `t3a_report_release.talentvisa_active` | `talentvisa_active_capture_state` | 20261110000000_day1_report_release | 0 | 0 | 0 |
| `G.token_state` | ACTIVE | M5 MISSING (added) | `t3a_report_release.token_state` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.verification_check_id` | ACTIVE | M5 MISSING (added) | `t3a_verification_check.verification_check_id` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `G.verification_code` | ACTIVE | M5 MISSING (added) | `t3a_d1_ber_report.verification_code` |  | 20261110000000_day1_report_release | 1 | 0 |  |
| `G.version_set_hash` | ACTIVE | M5 MISSING (added) | `t3a_evidence_review.version_set_hash` |  | 20261110000000_day1_report_release | 0 | 0 |  |
| `H.challenge_case_id` | ACTIVE | M1 EXACT | `t3a_challenge_case.challenge_case_id` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.challenge_ground` | ACTIVE | M1 EXACT | `t3a_challenge_case.challenge_ground` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.challenge_outcome` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.challenge_outcome` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.challenge_target_ref` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.challenge_target_ref` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.complaint_acknowledged_at` | ACTIVE | M5 MISSING (added) | `t3a_complaint.complaint_acknowledged_at` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.complaint_id` | ACTIVE | M5 MISSING (added) | `t3a_complaint.complaint_id` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.correction_outcome` | ACTIVE | M5 MISSING (added) | `t3a_correction_request.correction_outcome` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.correction_request_id` | ACTIVE | M5 MISSING (added) | `t3a_correction_request.correction_request_id` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.evidence_disclosed_at` | ACTIVE | M1 EXACT | `t3a_challenge_case.evidence_disclosed_at` | `evidence_disclosed_at_capture_state` | 20261111000000_day1_challenge | 0 | 0 | 0 |
| `H.issuance_hold` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.issuance_hold` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.opened_at` | ACTIVE | M2 RENAME | `t3a_challenge_case.created_at` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.opened_by` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.opened_by` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.outcome_reason_code` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.outcome_reason_code` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.reconsiderer_id` | ACTIVE | M1 EXACT | `t3a_reconsideration_assignment.reconsiderer_id` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.resolved_at` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.resolved_at` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.response_time_committed_version` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.response_time_committed_version` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `H.second_check_actor_id` | ACTIVE | M5 MISSING (added) | `t3a_challenge_case.second_check_actor_id` |  | 20261111000000_day1_challenge | 0 | 0 |  |
| `I.accepting_person_name` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.accepting_person_name` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.accepting_person_title` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.accepting_person_title` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.application_status` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.application_status` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.approval_decision` | ACTIVE | M1 EXACT | `t3a_employer_application.approval_decision` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.approver_id` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.approver_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.business_registry_id` | ACTIVE | M3 TYPE | `t3a_employer_application.business_number` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.contact_request_id` | ACTIVE | M5 MISSING (added) | `t3a_employer_contact_request.contact_request_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.contact_request_state` | ACTIVE | M5 MISSING (added) | `t3a_employer_contact_request.contact_request_state` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.decided_at` | ACTIVE | M2 RENAME | `t3a_employer_application.approved_at` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.decision_basis` | ACTIVE | M2 RENAME | `t3a_employer_application.approval_basis` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.design_partner_flag` | ACTIVE | M5 MISSING (added) | `t3a_employer_organization.design_partner_flag` | `design_partner_flag_capture_state` | 20261112000000_day1_employer | 0 | 0 | 0 |
| `I.domain_age_flag` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.domain_age_flag` | `domain_age_flag_capture_state` | 20261112000000_day1_employer | 0 | 0 | 0 |
| `I.employer_application_id` | ACTIVE | M2 RENAME | `t3a_employer_application.application_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.employer_attestation_id` | ACTIVE | M5 MISSING (added) | `t3a_employer_attestation.employer_attestation_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.free_provider_refused` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.free_provider_refused` | `free_provider_refused_capture_state` | 20261112000000_day1_employer | 0 | 0 | 0 |
| `I.hire_recorded_id` | ACTIVE | M5 MISSING (added) | `t3a_hire_record.hire_recorded_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.legal_entity_name` | ACTIVE | M2 RENAME | `t3a_employer_application.organization_legal_name` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.liveworks_activation_state` | ACTIVE | M5 MISSING (added) | `t3a_employer_organization.liveworks_activation_state` | `liveworks_activation_state_capture_state` | 20261112000000_day1_employer | 0 | 0 | 0 |
| `I.organization_domain` | ACTIVE | M2 RENAME | `t3a_employer_application.email_domain` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.organization_id` | ACTIVE | M5 MISSING (added) | `t3a_employer_organization.organization_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.pool_query_id` | ACTIVE | M5 MISSING (added) | `t3a_employer_pool_query.pool_query_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.record_use_terms_version` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.record_use_terms_version` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.terms_accepted_at` | ACTIVE | M5 MISSING (added) | `t3a_employer_application.terms_accepted_at` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.verification_status` | ACTIVE | M5 MISSING (added) | `t3a_employer_organization.verification_status` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.work_email` | ACTIVE | M1 EXACT | `t3a_employer_application.work_email` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `I.workspace_note_id` | ACTIVE | M5 MISSING (added) | `t3a_workspace_note.workspace_note_id` |  | 20261112000000_day1_employer | 0 | 0 |  |
| `J.created_at` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.created_at` |  | 20261113000000_day1_growth_log | 0 | 0 |  |
| `J.created_by` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.created_by` |  | 20261113000000_day1_growth_log | 0 | 0 |  |
| `J.entry_id` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.entry_id` |  | 20261113000000_day1_growth_log | 0 | 0 |  |
| `J.entry_kind` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.entry_kind` |  | 20261113000000_day1_growth_log | 0 | 0 |  |
| `J.module_reference` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.module_reference` | `module_reference_capture_state` | 20261113000000_day1_growth_log | 0 | 0 | 0 |
| `J.schema_version` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.schema_version` |  | 20261113000000_day1_growth_log | 0 | 0 |  |
| `J.text` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.text` | `text_capture_state` | 20261113000000_day1_growth_log | 0 | 0 | 0 |
| `J.updated_at` | ACTIVE | M5 MISSING (added) | `t3a_growth_log_entry.updated_at` |  | 20261113000000_day1_growth_log | 0 | 0 |  |
| `K.consequence_horizons_displayed` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.consequence_horizons_displayed` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.feedback_acknowledged_at` | ACTIVE | M2 RENAME | `t3a_coaching_feedback.acknowledged_at` | `feedback_acknowledged_at_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.feedback_source_type` | ACTIVE | M5 MISSING (added) | `t3a_coaching_feedback.feedback_source_type` | `feedback_source_type_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.feedback_viewed_at` | ACTIVE | M5 MISSING (added) | `t3a_coaching_feedback.feedback_viewed_at` | `feedback_viewed_at_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.final_personal_sentence_ref` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.final_personal_sentence_ref` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.module_completion_at` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.module_completion_at` | `module_completion_at_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.module_completion_state` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.module_completion_state` | `module_completion_state_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.module_dimension_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.module_dimension_id` | `module_dimension_id_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.module_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.module_id` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.module_segment_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.module_segment_id` | `module_segment_id_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.module_version` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.module_version` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.participant_artifact_ref` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.participant_artifact_ref` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.participant_artifact_version` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.participant_artifact_version` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.participant_reflection_ref` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.participant_reflection_ref` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.private_scenario_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.private_scenario_id` | `private_scenario_id_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.private_scenario_version` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.private_scenario_version` | `private_scenario_version_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.reference_examples_viewed_refs` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.reference_examples_viewed_refs` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.reflection_prompt_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.reflection_prompt_id` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.reflection_prompt_version` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.reflection_prompt_version` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.rehearsal_attempt_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.rehearsal_attempt_id` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.rehearsal_attempt_no` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.rehearsal_attempt_no` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.rehearsal_choice_record_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.rehearsal_choice_record_id` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.rehearsal_completed_at` | ACTIVE | M2 RENAME | `t3a_rehearsal_session.ended_at` | `rehearsal_completed_at_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.rehearsal_completion_state` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.rehearsal_completion_state` | `rehearsal_completion_state_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.rehearsal_decision_path_ref` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.rehearsal_decision_path_ref` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.rehearsal_session_id` | ACTIVE | M1 EXACT | `t3a_rehearsal_session.rehearsal_session_id` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `K.rehearsal_started_at` | ACTIVE | M2 RENAME | `t3a_rehearsal_session.started_at` | `rehearsal_started_at_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.response_modality` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.response_modality` | `response_modality_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.retention_check_instance_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.retention_check_instance_id` | `retention_check_instance_id_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.retention_check_status` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_attempt.retention_check_status` | `retention_check_status_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.variant_tuple` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.variant_tuple` | `variant_tuple_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.voice_transcript_ref` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.voice_transcript_ref` | `voice_transcript_ref_capture_state` | 20261114000000_day1_rehearsal | 0 | 0 | 0 |
| `K.workplace_moment_id` | ACTIVE | M5 MISSING (added) | `t3a_rehearsal_session.workplace_moment_id` |  | 20261114000000_day1_rehearsal | 0 | 0 |  |
| `L.access_ends_at` | ACTIVE | M5 MISSING (added) | `t3a_order.access_ends_at` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.access_starts_at` | ACTIVE | M5 MISSING (added) | `t3a_order.access_starts_at` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.account_id` | ACTIVE | M5 MISSING (added) | `t3a_order.account_id` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.currency` | ACTIVE | M5 MISSING (added) | `t3a_order.currency` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.founding_member_flag` | ACTIVE | M5 MISSING (added) | `t3a_order.founding_member_flag` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.order_id` | ACTIVE | M5 MISSING (added) | `t3a_order.order_id` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.package_code` | ACTIVE | M5 MISSING (added) | `t3a_order.package_code` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.package_entitlements` | ACTIVE | M5 MISSING (added) | `t3a_order.package_entitlements` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.payment_provider_ref` | ACTIVE | M5 MISSING (added) | `t3a_order.payment_provider_ref` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.price_amount` | ACTIVE | M5 MISSING (added) | `t3a_order.price_amount` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.product_code` | ACTIVE | M5 MISSING (added) | `t3a_order.product_code` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.purchased_at` | ACTIVE | M5 MISSING (added) | `t3a_order.purchased_at` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.refund_id` | ACTIVE | M5 MISSING (added) | `t3a_refund.refund_id` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `L.tax_jurisdiction` | ACTIVE | M5 MISSING (added) | `t3a_order.tax_jurisdiction` |  | 20261115000000_day1_orders | 0 | 0 |  |
| `M.lsa_sidecar_id` | DORMANT | M5 MISSING (added) | `t3a_lsa_sidecar.lsa_sidecar_id` | `lsa_sidecar_id_capture_state` | 20261116000000_day1_session_archive_dormant | 0 | 0 | 0 |
| `M.session_archive_tab_state` | ACTIVE | M5 MISSING (added) | `t3a_session_archive_tab.session_archive_tab_state` |  | 20261116000000_day1_session_archive_dormant | 1 | 1 |  |
| `N.actor_id` | ACTIVE | M1 EXACT | `t3a_event_log.actor_id` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.actor_role_code` | ACTIVE | M5 MISSING (added) | `t3a_event_log.actor_role_code` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.actor_type` | ACTIVE | M1 EXACT | `t3a_event_log.actor_type` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.application_session_id` | ACTIVE | M5 MISSING (added) | `t3a_event_log.application_session_id` | `application_session_id_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.artifact_ref_id` | ACTIVE | M3 TYPE | `t3a_event_log.artifact_ref_id` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.change_request_ref` | ACTIVE | M5 MISSING (added) | `t3a_event_log.change_request_ref` | `change_request_ref_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.correlation_id` | ACTIVE | M1 EXACT | `t3a_event_log.correlation_id` | `correlation_id_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.dictionary_version` | ACTIVE | M5 MISSING (added) | `t3a_event_log.dictionary_version` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.event_category` | ACTIVE | M1 EXACT | `t3a_event_log.event_category` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.event_id` | ACTIVE | M1 EXACT | `t3a_event_log.event_id` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.event_idempotency_key` | ACTIVE | M5 MISSING (added) | `t3a_event_log.event_idempotency_key` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.event_name` | ACTIVE | M1 EXACT | `t3a_event_log.event_name` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.event_processing_state` | ACTIVE | M5 MISSING (added) | `t3a_event_log.event_processing_state` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.event_sequence_no` | ACTIVE | M5 MISSING (added) | `t3a_event_log.event_sequence_no` | `event_sequence_no_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.ingested_at` | ACTIVE | M1 EXACT | `t3a_event_log.ingested_at` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.integrity_hash` | ACTIVE | M1 EXACT | `t3a_event_log.integrity_hash` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.integrity_status` | ACTIVE | M1 EXACT | `t3a_event_log.integrity_status` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.occurred_at` | ACTIVE | M1 EXACT | `t3a_event_log.occurred_at` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.payload` | ACTIVE | M1 EXACT | `t3a_event_log.payload` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.policy_decision_ref` | ACTIVE | M5 MISSING (added) | `t3a_event_log.policy_decision_ref` | `policy_decision_ref_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.previous_hash` | ACTIVE | M5 MISSING (added) | `t3a_event_log.previous_hash` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.record_property` | ACTIVE | M5 MISSING (added) | `t3a_event_log.record_property` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.resource_id` | ACTIVE | M1 EXACT | `t3a_event_log.resource_id` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.resource_type` | ACTIVE | M1 EXACT | `t3a_event_log.resource_type` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.schema_version` | ACTIVE | M1 EXACT | `t3a_event_log.schema_version` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `N.session_id` | ACTIVE | M1 EXACT | `t3a_event_log.session_id` | `session_id_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.source_system` | ACTIVE | M1 EXACT | `t3a_event_log.source_system` | `source_system_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.subject_id` | ACTIVE | M1 EXACT | `t3a_event_log.subject_id` | `subject_id_capture_state` | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 | 0 |
| `N.supersedes_event_id` | ACTIVE | M1 EXACT | `t3a_event_log.supersedes_event_id` |  | 20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state) | 0 | 0 |  |
| `O.approval_authority` | ACTIVE | M5 MISSING (added) | `t3a_change_request.approval_authority` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.asset_id` | ACTIVE | M5 MISSING (added) | `t3a_registry_asset.asset_id` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.asset_type` | ACTIVE | M5 MISSING (added) | `t3a_registry_asset.asset_type` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.change_request_id` | ACTIVE | M5 MISSING (added) | `t3a_change_request.change_request_id` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.changed_at` | ACTIVE | M5 MISSING (added) | `t3a_change_request.changed_at` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.changed_by` | ACTIVE | M5 MISSING (added) | `t3a_change_request.changed_by` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.compatibility_class` | ACTIVE | M5 MISSING (added) | `t3a_change_request.compatibility_class` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.configuration_key` | ACTIVE | M5 MISSING (added) | `t3a_configuration_value.configuration_key` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.configuration_value` | ACTIVE | M5 MISSING (added) | `t3a_configuration_value.configuration_value` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.configuration_version` | ACTIVE | M5 MISSING (added) | `t3a_configuration_value.configuration_version` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.current_version` | ACTIVE | M5 MISSING (added) | `t3a_registry_asset.current_version` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.deployment_status` | ACTIVE | M5 MISSING (added) | `t3a_registry_asset.deployment_status` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.dimension_schema_version` | ACTIVE | M1 EXACT | `t3a_provenance.dimension_schema_version` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.manifest_signature` | ACTIVE | M5 MISSING (added) | `t3a_manifest_verification.manifest_signature` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.manifest_verified_at` | ACTIVE | M5 MISSING (added) | `t3a_manifest_verification.manifest_verified_at` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.previous_version` | ACTIVE | M5 MISSING (added) | `t3a_registry_asset.previous_version` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.set_at` | ACTIVE | M5 MISSING (added) | `t3a_configuration_value.set_at` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.set_by` | ACTIVE | M5 MISSING (added) | `t3a_configuration_value.set_by` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.version_change_reason` | ACTIVE | M5 MISSING (added) | `t3a_change_request.version_change_reason` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `O.version_hash` | ACTIVE | M5 MISSING (added) | `t3a_change_request.version_hash` |  | 20261118000000_day1_governance_registry | 0 | 0 |  |
| `P.affected_record_count` | ACTIVE | M5 MISSING (added) | `t3a_incident.affected_record_count` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.backup_region` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.backup_region` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.content_read_id` | ACTIVE | M2 RENAME | `t3a_oversight_log.entry_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.control_run_id` | ACTIVE | M5 MISSING (added) | `t3a_control_run.control_run_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.counsel_ratified_at` | ACTIVE | M1 EXACT | `t3a_retention_schedule.counsel_ratified_at` | `counsel_ratified_at_capture_state` | 20261119000000_day1_governance_controls | 14 | 0 | 14 |
| `P.data_access_request_id` | ACTIVE | M5 MISSING (added) | `t3a_data_access_request.data_access_request_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.data_correction_request_id` | ACTIVE | M5 MISSING (added) | `t3a_data_correction_request.data_correction_request_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.error_journal_id` | ACTIVE | M5 MISSING (added) | `t3a_error_journal.error_journal_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.error_journal_written_at` | ACTIVE | M5 MISSING (added) | `t3a_error_journal.error_journal_written_at` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.hosting_region` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.hosting_region` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.incident_id` | ACTIVE | M5 MISSING (added) | `t3a_incident.incident_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.legal_hold_ref` | ACTIVE | M5 MISSING (added) | `t3a_legal_hold.legal_hold_ref` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.mentor_invitation_ttl` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.mentor_invitation_ttl` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.notified_at` | ACTIVE | M5 MISSING (added) | `t3a_incident.notified_at` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.privileged_access_id` | ACTIVE | M5 MISSING (added) | `t3a_privileged_access.privileged_access_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.recipient_passcode_ttl` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.recipient_passcode_ttl` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.recipient_release_token_ttl` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.recipient_release_token_ttl` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.reconciled_event_id` | ACTIVE | M5 MISSING (added) | `t3a_error_journal.reconciled_event_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.retention_class` | ACTIVE | M1 EXACT | `t3a_retention_schedule.retention_class` |  | 20261119000000_day1_governance_controls | 14 | 14 |  |
| `P.retention_period_value` | ACTIVE | M5 MISSING (added) | `t3a_retention_schedule.retention_period_value` | `retention_period_value_capture_state` | 20261119000000_day1_governance_controls | 14 | 0 | 14 |
| `P.retention_policy_version` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.retention_policy_version` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.retention_review_at` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.retention_review_at` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.severity` | ACTIVE | M5 MISSING (added) | `t3a_incident.severity` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.stage_entry_hold_ttl` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.stage_entry_hold_ttl` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.suppression_id` | ACTIVE | M5 MISSING (added) | `t3a_suppression.suppression_id` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.suppression_reason` | ACTIVE | M5 MISSING (added) | `t3a_suppression.suppression_reason` |  | 20261119000000_day1_governance_controls | 0 | 0 |  |
| `P.verification_link_ttl` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.verification_link_ttl` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `P.verification_resend_cooldown` | ACTIVE | M5 MISSING (added) | `t3a_deployment_config.verification_resend_cooldown` |  | 20261119000000_day1_governance_controls | 1 | 0 |  |
| `R.cohort_definition_version` | ACTIVE | M5 MISSING (added) | `t3a_cohort.cohort_definition_version` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.cohort_id` | ACTIVE | M5 MISSING (added) | `t3a_cohort.cohort_id` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.cohort_type` | ACTIVE | M5 MISSING (added) | `t3a_cohort.cohort_type` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.data_use_agreement_ref` | ACTIVE | M5 MISSING (added) | `t3a_partner_organization.data_use_agreement_ref` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.jurisdiction_rule_version` | ACTIVE | M5 MISSING (added) | `t3a_cohort.jurisdiction_rule_version` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.membership_basis_ref` | ACTIVE | M5 MISSING (added) | `t3a_program_membership.membership_basis_ref` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.operating_jurisdiction_code` | ACTIVE | M5 MISSING (added) | `t3a_cohort.operating_jurisdiction_code` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.organization_industry_code` | ACTIVE | M5 MISSING (added) | `t3a_partner_organization.organization_industry_code` | `organization_industry_code_capture_state` | 20261121000000_day1_programs | 0 | 0 | 0 |
| `R.organization_program_id` | ACTIVE | M5 MISSING (added) | `t3a_program.organization_program_id` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.organization_type` | ACTIVE | M5 MISSING (added) | `t3a_partner_organization.organization_type` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.partner_relationship_effective_at` | ACTIVE | M5 MISSING (added) | `t3a_partner_organization.partner_relationship_effective_at` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.partner_relationship_ended_at` | ACTIVE | M5 MISSING (added) | `t3a_partner_organization.partner_relationship_ended_at` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.program_enrolled_at` | ACTIVE | M5 MISSING (added) | `t3a_program_membership.program_enrolled_at` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.program_exit_at` | ACTIVE | M5 MISSING (added) | `t3a_program_membership.program_exit_at` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.program_membership_id` | ACTIVE | M5 MISSING (added) | `t3a_program_membership.program_membership_id` |  | 20261121000000_day1_programs | 0 | 0 |  |
| `R.program_version` | ACTIVE | M5 MISSING (added) | `t3a_program.program_version` |  | 20261121000000_day1_programs | 0 | 0 |  |
