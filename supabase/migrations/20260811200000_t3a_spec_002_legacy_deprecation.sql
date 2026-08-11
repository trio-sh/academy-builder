-- ============================================================================
-- T3A-DEV-SPEC-002 · Track C · Legacy → new-schema deprecation
-- ============================================================================
-- Stamps every spec-superseded legacy table with a machine-readable
-- deprecation COMMENT pointing at its new-schema replacement. Tables are
-- NOT dropped or renamed in this migration — dashboards still read them
-- and will be rewired PR-by-PR. The comment is the contract: any new
-- code must target the replacement, and the incremental rewire ends by
-- dropping each legacy table once its readers are gone.
--
-- No user data is at risk (we ship pre-production) but archived legacy
-- rows are still forensic history — nothing here deletes rows.
--
-- Applied to the live schema via exec_claudecode_query on 2026-08-11
-- (see the mapping doc `docs/legacy-schema-mapping.md` for context).
-- Semicolons intentionally absent from comment bodies so the RPC
-- statement splitter admits each COMMENT as one indivisible statement.
-- ============================================================================

COMMENT ON TABLE public.mentor_observations IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §21.3] Replaced by t3a_observation + t3a_stage_instance + t3a_mentor_judgment. Legacy BARS scores are not portable into the append-only evidence layer — they encode a mentor conclusion, not a source-of-truth observation. Do not add new columns or writers. Drop once dashboards are rewired.';

COMMENT ON TABLE public.observation_feedback IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §21.4] Replaced by t3a_mentor_judgment (S1 confirmation + progression decision) and t3a_composed_statement (statement text). The L1/L2 split is superseded by the S1..S4 Stage model. Do not add new columns or writers.';

COMMENT ON TABLE public.observation_sessions IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §11] Replaced by t3a_stage_instance. Sessions were the loose per-encounter row — stage instances are the canonical per-(participant, dimension, stage, attempt) entity. Do not add new columns or writers.';

COMMENT ON TABLE public.observation_loops IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §5.2 + §11] Replaced by t3a_stage_instance (attempt_no). Loops were an ad-hoc iteration counter — stage instances track attempts by design with a spec-enforced cap and spacing rule. Do not add new columns or writers.';

COMMENT ON TABLE public.observation_synthesis IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §21.8] Replaced by t3a_ber_statement (statement text via composed_statement_id) and t3a_dimension_evidence (per-dimension sufficiency state). Do not add new columns or writers.';

COMMENT ON TABLE public.mentor_assigned_dimensions IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §21.12] Replaced by t3a_mentor_authorization. Mentor scope is per-dimension per approved reference-set version, with authorization windows. Do not add new columns or writers.';

COMMENT ON TABLE public.skill_passports IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §21.8] Replaced by t3a_ber_report. The passport construct is retired platform-wide (see also vocabulary-lock) — every reference in code should read t3a_ber_report instead. Do not add new columns or writers.';

COMMENT ON TABLE public.scenario_selection_audit IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §21.6] Replaced by t3a_event_log. All audit trails collapse into the single evidence-domain event backbone. Do not add new columns or writers.';

COMMENT ON TABLE public.behavioral_consistency_index IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §7 + §16.3] The BCI concept is retired — the spec forbids any single scalar that ranks or grades a participant. No replacement is planned. Do not add new columns or writers — the table itself is a candidate for outright drop.';

COMMENT ON TABLE public.endorsements IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §5.1.1 + §21.4] Replaced by t3a_mentor_judgment.progression_decision (proceed | redirect | pause). Endorsement as a discrete artifact is retired — the decision is what the register carries. Do not add new columns or writers.';

COMMENT ON TABLE public.mentor_assignments IS
  '[SUPERSEDED — T3A-DEV-SPEC-002 §21.12] Replaced by t3a_mentor_assignment (note singular). The new table binds a mentor to a specific stage_instance (with assignment method + prior allocation count + conflict declaration reference), not to a candidate for the whole journey. Keep this legacy table until dashboards are rewired — it is not written from new code.';

COMMENT ON TABLE public.candidate_self_assessments IS
  '[DEPRECATED — T3A-DEV-SPEC-002 §7.3 + §16.3] Self-assessment ranks the participant on the same instrument the register carries — spec-hostile. Retire without direct replacement — the platform surfaces Readiness Reflection as a private, non-evidence input.';
