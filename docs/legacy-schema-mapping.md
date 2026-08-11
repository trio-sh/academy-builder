# Legacy → T3A-DEV-SPEC-002 schema mapping

**Spec reference:** T3A-DEV-SPEC-002 v2.0 §21 · Data model.

Every spec-superseded legacy table is listed here with its new-schema replacement and the reason for the change. New code must target the replacement; the legacy table is a candidate for outright drop once its dashboards are rewired. Deprecation is also stamped in the database as `COMMENT ON TABLE` (`supabase/migrations/20260811200000_t3a_spec_002_legacy_deprecation.sql`) so it is discoverable from a live `\d+`.

Tables not listed here (e.g. `profiles`, `bridgefast_*`, `messages`, `notifications`, `liveworks_*`, `talentvisa_nominations`, `t3x_connections`) sit outside the spec's evidence chain and remain in service unchanged.

## Superseded — do not write

| Legacy | Replacement | Why the shape changed |
| :--- | :--- | :--- |
| `mentor_observations` | `t3a_observation` + `t3a_stage_instance` + `t3a_mentor_judgment` | Legacy row is a mentor conclusion (JSONB `behavioral_scores`). The new layer is an append-only source-of-truth observation with a resolved `composed_statement_id`. The two cannot be merged: a conclusion is not evidence. |
| `observation_feedback` | `t3a_mentor_judgment` (S1 confirmation + progression decision) + `t3a_composed_statement` (statement text) | The L1/L2 AI-then-mentor split collapses into the S1..S4 Stage model. Text of a statement is composed server-side from `t3a_statement_library`; mentors never author it. |
| `observation_sessions` | `t3a_stage_instance` | Sessions were the loose per-encounter row. Stage instances are the canonical `(participant, dimension, stage, attempt)` entity — attempts are capped and spaced per §5.2. |
| `observation_loops` | `t3a_stage_instance.attempt_no` | "Loops" were an ad-hoc iteration counter with no cap. The spec caps and spaces attempts by design. |
| `observation_synthesis` | `t3a_ber_statement` (via `composed_statement_id`) + `t3a_dimension_evidence` (sufficiency state) | Synthesis was hand-rolled JSON. The new layer separates the composed statement from the sufficiency derivation, both computed by rule (AC-54: no interface permits override). |
| `mentor_assigned_dimensions` | `t3a_mentor_authorization` | Dimension scope is now per approved reference-set version with authorization windows (§21.12 + OD-12). |
| `skill_passports` | `t3a_ber_report` | "Passport" was retired platform-wide (see also the vocabulary lock). Every reference in code should read `t3a_ber_report`. Prior versions are superseded, never deleted (AC-45). |
| `scenario_selection_audit` | `t3a_event_log` | All audit trails collapse into the single evidence-domain event backbone (§21.6). |
| `behavioral_consistency_index` | *(none — concept retired)* | BCI produced a single scalar that ranks/grades. §7 + §16.3 forbid it. No replacement is planned; the table is a candidate for outright drop. |
| `endorsements` | `t3a_mentor_judgment.progression_decision` (`proceed` \| `redirect` \| `pause`) | "Endorsement" as a discrete artifact is retired; the decision itself is what the register carries. |
| `candidate_self_assessments` | *(none — concept retired)* | Self-assessment ranked the participant on the same instrument the register carries — spec-hostile. Retired without direct replacement. |
| `mentor_assignments` | `t3a_mentor_assignment` (note singular) | Now binds a mentor to a specific `stage_instance` with method + prior allocation count + optional conflict declaration ref — not to a candidate for the whole journey. |

## Migration strategy

- **Data port:** none. We have no production users; nothing needs to be carried forward. Any legacy row that exists is developer test data and stays where it is until its table is dropped.
- **Dashboard rewire:** incremental, one dashboard file per PR. Each PR removes queries against a legacy table and replaces them with the new-schema equivalent (or removes the surface if the concept is retired). Order: Mentor → Candidate → Employer → Admin. AIAgent is last (it touches many of them).
- **Legacy table drop:** landed table-by-table once its last reader is removed. A grep for `from("<legacy_name>")` must return zero results across `src/` before the DROP migration lands.
- **Types file:** `src/integrations/supabase/types.ts` and `src/types/database.types.ts` are regenerated after each drop.
- **Vocabulary lock:** `scripts/check-vocabulary.mjs` already forbids `skill_passport` in new code; more forbidden identifiers will land as concepts retire (`behavioral_consistency_index`, `endorsement`, `observation_loop`, `synthesis`).

## Rewire checklist (rolling)

- [ ] `src/pages/dashboard/MentorDashboard.tsx` — 30 legacy references
- [ ] `src/pages/dashboard/CandidateDashboard.tsx` — 9 legacy references
- [ ] `src/pages/dashboard/AdminDashboard.tsx` — 6 legacy references
- [ ] `src/pages/dashboard/EmployerDashboard.tsx` — 1 legacy reference
- [ ] `src/pages/dashboard/AIAgent.tsx` — 6 legacy references
- [ ] `src/pages/VerifyPassport.tsx` — 2 legacy references (may retire in favour of `VerifyBER`)
- [ ] `src/components/assessment/InteractiveSkillAssessment.tsx` — 4 legacy references
- [ ] `src/lib/observationLoops.ts` — 6 legacy references (may retire outright)
- [ ] `src/lib/observationIntegrity.ts` — 11 legacy references

Counts are indicative — a rewire PR should re-grep before starting.
