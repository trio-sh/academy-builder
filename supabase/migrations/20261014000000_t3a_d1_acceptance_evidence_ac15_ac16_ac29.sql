-- =====================================================================
-- T3A-D1-EXEC-001 §11 — AC-15, AC-16 and AC-29 against build 9f2810c
--
-- All three were recorded as not_executed for build 7e597da. Executing
-- them found that none could have passed: no pause event existed, no
-- controlled end event existed, and nothing prevented advancing past an
-- unresolved determination. 20261013000000 built all three.
--
-- New rows, not edits. The evidence table is append-only and the earlier
-- not_executed records stand.
--
-- AC-18 and AC-19 remain not executed, and the reason is recorded below
-- rather than left as a bare line.
-- =====================================================================

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('AC-15', 'pass',
   $lit$A pause writes a distinct append-only event. t3a_d1_s2_advancement_permitted then refused with SOURCE_ADVANCEMENT_BLOCKED_PENDING_PAUSE_CLEARANCE, and permitted advancement again only after a clearance event. Editing the event was refused. The verdict returns is_a_progression_outcome false, the table carries no progression, outcome, verdict or participant column, and adding one was refused.$lit$,
   '9f2810c', 'Claude Code, automated, non-production environment', NULL),
  ('AC-16', 'pass',
   $lit$t3a_d1_s2_end_without_commit wrote the end event and returned captured_items_still_held 1, captured_items_discarded 0, observation_committed false. No committed row appeared in t3a_observation_record. A missing reason was refused with END_REASON_REQUIRED and a second end with SESSION_ALREADY_ENDED.$lit$,
   '9f2810c', 'Claude Code, automated, non-production environment', NULL),
  ('AC-29', 'pass',
   $lit$With Q-D1-01 answered and Q-D1-02 and Q-D1-03a unresolved, advancement was refused with REQUIRED_DETERMINATION_UNRESOLVED and the two unresolved questions were named in the verdict. After recording a missing state for each, advancement was permitted. Prevention and the list are both present, which is what the test asks for.$lit$,
   '9f2810c', 'Claude Code, automated, non-production environment', NULL),
  ('AC-18', 'not_executed',
   $lit$Not executed. t3a_commit_observation snapshots the mentor authorization in force at the moment of commit and refuses where none is current, and t3a_observation_record carries authority_snapshot_id. Verifying that a committed action traces to that snapshot requires performing a commit as an authenticated authorized mentor, which this SQL channel cannot do: auth.uid() is null, so the function refuses at its first check. This is a limit of the test harness, not a missing governing input, and it is recorded as such rather than as a conflict.$lit$,
   '9f2810c', 'Claude Code, automated, non-production environment', NULL),
  ('AC-19', 'not_executed',
   $lit$Not executed, for the same reason as AC-18. t3a_observation_record carries version_set, and content versions are immutable and superseded rather than edited, so the shape the test asks for exists. Proving that a saved record pins the exact source, question, answer-catalog and applicability versions requires a committed record, and committing requires an authenticated authorized mentor.$lit$,
   '9f2810c', 'Claude Code, automated, non-production environment', NULL);
