# Table index (as built)

304 `t3a_` tables in production; 263 foreign keys; 18 connected groups drawn as diagrams; 144 tables with no foreign key to another `t3a_` table are listed below.

| Diagram | Tables |
|---|---|
| `erd-01-t3a_attempt.mmd` | 95 |
| `erd-02-t3a_account.mmd` | 22 |
| `erd-03-t3a_employer_application.mmd` | 7 |
| `erd-04-t3a_event_name_alias.mmd` | 6 |
| `erd-05-t3a_calibration_clearance.mmd` | 4 |
| `erd-06-t3a_d1_consent.mmd` | 4 |
| `erd-07-t3a_d1_group_session.mmd` | 3 |
| `erd-08-t3a_d1_pilot_cohort.mmd` | 3 |
| `erd-09-t3a_change_request.mmd` | 2 |
| `erd-10-t3a_d1_acceptance_evidence.mmd` | 2 |
| `erd-11-t3a_d1_correction_test.mmd` | 2 |
| `erd-12-t3a_d1_production_release.mmd` | 2 |
| `erd-13-t3a_d1_report_block.mmd` | 2 |
| `erd-14-t3a_d1_review_checklist_item.mmd` | 2 |
| `erd-15-t3a_coverage_snapshot.mmd` | 1 |
| `erd-16-t3a_d1_work_sample_submission.mmd` | 1 |
| `erd-17-t3a_event_log.mmd` | 1 |
| `erd-18-t3a_governance_config.mmd` | 1 |

## Tables with no foreign key

| Table | Columns | Row level security | Open to anon or authenticated |
|---|---|---|---|
| `t3a_action_sequence_rule` | 3 | on | yes |
| `t3a_administration_form` | 2 | on | no |
| `t3a_aggregate_dataset_socket` | 19 | on | no |
| `t3a_ai_provenance_socket` | 5 | on | no |
| `t3a_anonymization_event` | 5 | on | yes |
| `t3a_calibration_participant` | 4 | on | no |
| `t3a_calibration_record` | 13 | on | no |
| `t3a_capture_config` | 5 | on | no |
| `t3a_capture_refusal` | 6 | on | no |
| `t3a_cohort` | 6 | on | no |
| `t3a_complaint` | 4 | on | no |
| `t3a_configuration_value` | 6 | on | no |
| `t3a_consent_config` | 3 | on | no |
| `t3a_consent_refusal` | 6 | on | no |
| `t3a_consent_state` | 10 | on | yes |
| `t3a_contact_permission` | 6 | on | no |
| `t3a_control_run` | 4 | on | no |
| `t3a_cross_dimension_pattern_map` | 6 | on | no |
| `t3a_d1_approval_refusal_log` | 8 | on | yes |
| `t3a_d1_assurance_check` | 7 | on | yes |
| `t3a_d1_authority_register` | 8 | on | yes |
| `t3a_d1_bank_session_window` | 5 | on | yes |
| `t3a_d1_branch_rule` | 8 | on | yes |
| `t3a_d1_build_conflict_register` | 9 | on | yes |
| `t3a_d1_co_participant_briefing` | 4 | on | yes |
| `t3a_d1_condition_precedence` | 6 | on | yes |
| `t3a_d1_confidential_concern` | 8 | on | yes |
| `t3a_d1_conflict_declaration` | 7 | on | yes |
| `t3a_d1_consent_notice_version` | 7 | on | yes |
| `t3a_d1_content_identity_assertion` | 8 | on | yes |
| `t3a_d1_corr006_evidence_item` | 6 | on | yes |
| `t3a_d1_involvement` | 11 | on | yes |
| `t3a_d1_issuance_floor_config` | 8 | on | yes |
| `t3a_d1_lift_condition` | 10 | on | yes |
| `t3a_d1_mentor_action_sequence` | 9 | on | yes |
| `t3a_d1_pathway_audit` | 10 | on | yes |
| `t3a_d1_question_object` | 7 | on | yes |
| `t3a_d1_report_refusal_log` | 7 | on | yes |
| `t3a_d1_s1_confirmation` | 9 | on | yes |
| `t3a_d1_s1_determination` | 9 | on | yes |
| `t3a_d1_s1_provenance_slot` | 5 | on | yes |
| `t3a_d1_s1_routing` | 9 | on | yes |
| `t3a_d1_s1_time_window` | 4 | on | yes |
| `t3a_d1_s2_administration_variance` | 7 | on | yes |
| `t3a_d1_s2_live_view_signal` | 7 | on | yes |
| `t3a_d1_s2_mentor_load_event` | 5 | on | yes |
| `t3a_d1_s2_session_event` | 8 | on | yes |
| `t3a_d1_s4_theme_line` | 4 | on | yes |
| `t3a_d1_specification_cooldown` | 5 | on | yes |
| `t3a_d1_stage4_refusal` | 5 | on | yes |
| `t3a_d1_stage_claim` | 7 | on | yes |
| `t3a_d1_statement_trace` | 6 | on | yes |
| `t3a_d1_superseded_capture_label` | 4 | on | yes |
| `t3a_d1_traceability_field` | 3 | on | yes |
| `t3a_data_access_request` | 4 | on | no |
| `t3a_data_correction_request` | 4 | on | no |
| `t3a_deployment_config` | 12 | on | no |
| `t3a_destruction_event` | 6 | on | yes |
| `t3a_dimension_evidence` | 11 | on | yes |
| `t3a_dimension_placeholder` | 5 | on | no |
| `t3a_discoverability` | 6 | on | yes |
| `t3a_discovery_query_log` | 6 | on | yes |
| `t3a_employer_account_audit` | 19 | on | yes |
| `t3a_employer_desk_config` | 4 | on | yes |
| `t3a_employer_desk_config_change` | 7 | on | yes |
| `t3a_employer_desk_event` | 9 | on | yes |
| `t3a_employer_free_provider` | 1 | on | no |
| `t3a_employer_hire_record` | 5 | on | yes |
| `t3a_employer_pool_entry` | 16 | on | yes |
| `t3a_employer_product_feedback` | 6 | on | yes |
| `t3a_employer_report_view` | 4 | on | yes |
| `t3a_employer_saved_report` | 4 | on | yes |
| `t3a_employer_workspace_note` | 5 | on | yes |
| `t3a_employment_linkage_socket` | 8 | on | no |
| `t3a_env_capability` | 6 | on | yes |
| `t3a_error_journal` | 6 | on | no |
| `t3a_event_config` | 3 | on | no |
| `t3a_event_idempotency` | 5 | on | no |
| `t3a_event_reference_rule` | 4 | on | no |
| `t3a_event_rejection` | 11 | on | no |
| `t3a_followup_metadata` | 10 | on | yes |
| `t3a_followup_socket` | 6 | on | no |
| `t3a_group_participation_socket` | 2 | on | no |
| `t3a_identity_assurance` | 11 | on | yes |
| `t3a_identity_assurance_socket` | 3 | on | no |
| `t3a_incident` | 5 | on | no |
| `t3a_institutional_socket` | 2 | on | no |
| `t3a_interaction_pattern_family` | 3 | on | no |
| `t3a_job_family_socket` | 2 | on | no |
| `t3a_legacy_consent_coverage` | 4 | on | no |
| `t3a_legacy_draft_retirement` | 7 | on | no |
| `t3a_legal_hold` | 5 | on | no |
| `t3a_licensee_socket` | 3 | on | no |
| `t3a_longitudinal_case` | 11 | on | no |
| `t3a_lsa_consent` | 9 | on | no |
| `t3a_lsa_registry_record` | 13 | on | no |
| `t3a_lsa_report` | 3 | on | no |
| `t3a_lsa_sidecar` | 3 | on | no |
| `t3a_lsa_snapshot` | 5 | on | no |
| `t3a_manifest_verification` | 5 | on | no |
| `t3a_mentor_appeal` | 4 | on | no |
| `t3a_mentor_authorization` | 35 | on | yes |
| `t3a_mentor_confidence_socket` | 2 | on | no |
| `t3a_mentor_invitation` | 8 | on | no |
| `t3a_mentor_request` | 11 | on | yes |
| `t3a_observation_gateway` | 7 | on | yes |
| `t3a_oversight_account_request` | 9 | on | yes |
| `t3a_oversight_action_catalogue` | 3 | on | yes |
| `t3a_oversight_disclosure` | 6 | on | yes |
| `t3a_oversight_holder` | 7 | on | yes |
| `t3a_oversight_log` | 15 | on | yes |
| `t3a_oversight_protected_surface` | 3 | on | yes |
| `t3a_participant_contact_consent` | 6 | on | yes |
| `t3a_pilot_stop` | 9 | on | no |
| `t3a_privileged_access` | 4 | on | no |
| `t3a_privileged_access_event` | 7 | on | yes |
| `t3a_provenance` | 23 | on | yes |
| `t3a_quality_event` | 6 | on | no |
| `t3a_question_definition` | 17 | on | no |
| `t3a_rce_controlled_text` | 5 | on | yes |
| `t3a_rce_controlled_text_register` | 5 | on | yes |
| `t3a_rce_pilot_authorization` | 7 | on | yes |
| `t3a_rce_prohibited_vocabulary` | 5 | on | yes |
| `t3a_rce_standing_defect` | 11 | on | yes |
| `t3a_record_informed_decision` | 7 | on | yes |
| `t3a_rehearsal_module` | 3 | on | no |
| `t3a_rehearsal_telemetry_aggregate` | 12 | on | yes |
| `t3a_research_socket` | 3 | on | no |
| `t3a_resolution_refusal_rule` | 7 | on | no |
| `t3a_retention_run_socket` | 2 | on | no |
| `t3a_retention_schedule` | 9 | on | yes |
| `t3a_retired_library_reach` | 7 | on | yes |
| `t3a_retired_participant_sentence` | 5 | on | yes |
| `t3a_role_grant` | 6 | on | yes |
| `t3a_role_grant_attempt` | 11 | on | yes |
| `t3a_s4_entry_attempt` | 6 | on | no |
| `t3a_safety_contact` | 8 | on | yes |
| `t3a_session_archive_tab` | 3 | on | no |
| `t3a_source_bank` | 3 | on | no |
| `t3a_stage_form_question` | 3 | on | no |
| `t3a_stage_form_verb` | 1 | on | no |
| `t3a_subscription_socket` | 4 | on | no |
| `t3a_suppression` | 3 | on | no |
| `t3a_suppression_event` | 4 | on | yes |
