-- =====================================================================
-- T3A-D1-EXEC-001 §11 — AC-10 and AC-11, executed against build 21b4661
--
-- Both were recorded as not_executed for build 7e597da. Executing them
-- found that neither could have passed: the missing-state enum existed
-- and no column anywhere used it, nothing refused the two codes §5.5
-- forbids at commit, and `selection` was NOT NULL so a determination
-- could not exist without a substantive answer.
--
-- 20261011000000 closed all three. These are the results of running the
-- tests against that, and they are new rows rather than edits: the
-- evidence table is append-only, so the earlier not_executed records
-- stand and the history shows both.
-- =====================================================================

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('AC-10', 'pass',
   $lit$A determination row carrying neither a substantive answer nor a missing state is refused by t3a_d1_s1_determination_answer_xor_missing, so an unresolved item cannot reach the record at all rather than being caught at commit. A row carrying both is refused for the same reason. Executed: answer-only accepted, missing-state-only accepted, neither refused, both refused.$lit$,
   '21b4661', 'Claude Code, automated, non-production environment', NULL),
  ('AC-11', 'pass',
   $lit$t3a_d1_missing_states() returns the eight codes with six marked applicable at commit. A missing state is recorded in its own column typed by the enum: a ninth code is unrepresentable and was refused; not_applicable and not_yet_observed were refused; and a missing-state code written inside the substantive selection was refused, so it cannot be smuggled into the answer list. The S1 workbench reads that function rather than its own copy of the list.$lit$,
   '21b4661', 'Claude Code, automated, non-production environment', NULL);
