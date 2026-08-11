# WorkRehearsal ↔ Evidence firewall — boundary diagram

**Spec reference:** T3A-DEV-SPEC-002 v2.0 §6, §12.1 #1, AC-01, AC-02, AC-03.

Every arrow between the two domains is listed here. Adding a new arrow requires justifying it in this file **before** the migration lands. If an arrow is not documented here it does not exist in the schema.

## Rehearsal domain
- `t3a_rehearsal_session`
- `t3a_rehearsal_artifact`
- `t3a_coaching_feedback`
- `t3a_rehearsal_activity_history`

## Evidence domain (all other `t3a_*` tables)
Landed in Steps 2–4. Full list: `t3a_consent_state`, `t3a_identity_assurance`, `t3a_observation_path_gateway`, `t3a_stage_entry_event`, `t3a_stage_instance`, `t3a_source_version`, `t3a_observation`, `t3a_determination_question`, `t3a_statement_library`, `t3a_composed_statement`, `t3a_mentor_authorization`, `t3a_conflict_declaration`, `t3a_mentor_assignment`, `t3a_mentor_judgment`, `t3a_provenance`, `t3a_event_log`, `t3a_dimension_evidence`, `t3a_ber_report`, `t3a_ber_statement`, `t3a_disclosure`, `t3a_discoverability`, `t3a_challenge_case`, `t3a_followup_metadata`, `t3a_moderation_sample`, `t3a_retention_schedule`, `t3a_destruction_event`, `t3a_anonymization_event`, `t3a_privileged_access_event`, `t3a_discovery_query_log`, `t3a_suppression_event`, `t3a_employment_link`, `t3a_role_grant`.

## Aggregate telemetry (write-only, isolated)
- `t3a_rehearsal_telemetry_aggregate` — physically neither in the rehearsal domain (holds no identifier) nor in the evidence domain (holds no observation reference). Write-only aggregate sink per §21.11. A trigger enforces "no UUID-shaped value may enter" so it cannot be tricked into carrying an identifier.

## Cross-domain arrows currently present

| From | To | Justification |
| :--- | :--- | :--- |
| `t3a_observation_path_gateway.participant_id` | `auth.users(id)` | Gateway must know **who** crossed, or it cannot answer AC-04. Identity is not rehearsal content; participant_id alone does not disclose activity. |
| `t3a_rehearsal_session.participant_id` | `auth.users(id)` | Rehearsal must know whose rehearsal it is. Never joined to evidence tables — same identity anchor, separate readers. |

**All other arrows are absent by design.** In particular:
- No `t3a_observation.source_version_id` may resolve to a rehearsal-class source. Enforced twice: at the service endpoint (`t3a_commit_observation`) and at the DB layer (`t3a_observation_reject_rehearsal_source` trigger).
- No `t3a_event_log` row may carry a `t3a_rehearsal_*` `resource_id`. The audit backbone is evidence-domain only.
- No `t3a_provenance` row may reference a rehearsal artifact.
- No view, materialized view, or index in either domain names a table from the other.

## Verification
`npm run check:firewall` runs the automated reconstruction attempt described in AC-03. The attempt log is appended to `docs/firewall-reconstruction-attempts/<date>.md` each run.
