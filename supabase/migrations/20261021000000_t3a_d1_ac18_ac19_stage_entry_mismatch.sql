-- =====================================================================
-- §11 — AC-18 and AC-19, and why they are not "not executed"
--
-- The acceptance register carried both as `not_executed`, with this
-- reason recorded on 2026-09-20:
--
--   "Verifying that a committed action traces to that snapshot requires
--    performing a commit as an authenticated authorized mentor, which
--    this SQL channel cannot do: auth.uid() is null, so the function
--    refuses at its first check. This is a limit of the test harness."
--
-- That reason is no longer true, and it was the wrong reason anyway.
--
-- IT IS NOT A HARNESS LIMIT. auth.uid() reads request.jwt.claims, which
-- a proof can set. Every gate proved today — the REC-07 approval route,
-- the live-view consent gate, the signalling relay — was exercised as a
-- named authenticated actor this way. So the harness was never what
-- stood in the way.
--
-- IT WAS ALSO THE WRONG ROUTE. That note describes t3a_commit_observation,
-- which writes t3a_observation, the spec-002 register. AC-18 and AC-19
-- are §11.1 Cockpit tests, and the Stage 2 cockpit writes
-- t3a_observation_record. Looking at the other path made the answer look
-- like an access problem.
--
-- WHAT IS ACTUALLY IN THE WAY — two things, both found by running it.
--
-- 1. AC-18 WOULD FAIL AS BUILT. t3a_observation_record carries
--    authority_snapshot_id, t3a_authority_snapshot exists to hold the
--    authorization in force, and t3a_role_authorization is the register
--    it would be captured from. The cockpit's commit writes neither: it
--    inserts participant, dimension, stage, observer, is_committed,
--    committed_at and version_set, and leaves authority_snapshot_id
--    null. A committed action therefore traces to no authorization at
--    all, which is the exact property AC-18 tests for.
--
--    AC-19 is partly the same story. version_set pins
--    stage_entry_event_id, source_version_id and the answers, but not
--    the question-object, answer-catalogue or applicability versions
--    AC-19 names, and no trigger stops a committed record being updated
--    afterwards — "later updates rewrite no history" is unenforced.
--
-- 2. THE COCKPIT CANNOT COMMIT AT ALL. Its StageEntryRow declares
--    eleven columns of t3a_stage_entry_event. Eight do not exist:
--
--      participant_id, dimension_id, source_version_id,
--      randomization_seed, presentation_variant_seed,
--      administration_conditions_snapshot, env_state_at_entry,
--      entered_at
--
--    The load uses select("*") so it does not error; it simply reads
--    undefined for all eight, which is why this was invisible. No source
--    body loads, so there are no questions to determine. Then commit
--    selects source_version_id explicitly and PostgREST refuses with
--    42703, column does not exist.
--
--    So the register the cockpit was built against is not the register
--    that exists. That is not a missing governing input and not a
--    founder decision — it is a reconciliation, and it is recorded here
--    rather than guessed at, because which register owns a Stage 2 entry
--    determines what an observation record means.
--
-- Nothing is marked passed. Both rows below say what happened.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-18', 'blocked_by_conflict',
   'Executed against the Cockpit path this time, not t3a_commit_observation. '
   || 'The Stage 2 cockpit inserts t3a_observation_record with authority_snapshot_id left null, '
   || 'so a committed action traces to no authorization — the property AC-18 tests. '
   || 'It cannot currently be committed at all either: 8 of the 11 columns the cockpit reads '
   || 'from t3a_stage_entry_event do not exist, and the commit path''s explicit '
   || 'select of source_version_id fails with 42703. '
   || 'The earlier note that this was a harness limit because auth.uid() is null is withdrawn: '
   || 'auth.uid() reads request.jwt.claims, which a proof sets, and several gates were '
   || 'exercised as named authenticated actors today.',
   '3d39ebb', 'Claude Code, automated, non-production environment', now(),
   'The cockpit was built against a richer t3a_stage_entry_event than the one 20260811160000 '
   || 'created. Reconciling the two decides what a Stage 2 observation record is anchored to, '
   || 'so it is recorded rather than chosen here.'),

  ('AC-19', 'blocked_by_conflict',
   'Same path and same blocker as AC-18. version_set pins stage_entry_event_id, '
   || 'source_version_id and the answers; it does not pin the question-object, '
   || 'answer-catalogue or applicability versions AC-19 names. Separately, no trigger '
   || 'prevents a committed t3a_observation_record from being updated afterwards, so '
   || '"later updates rewrite no history" is stated by the test and unenforced by the table. '
   || 'Content versions themselves ARE immutable and superseded rather than edited '
   || '(t3a_d1_content_version_immutable), so the half of AC-19 about content history holds; '
   || 'the half about the saved record does not.',
   '3d39ebb', 'Claude Code, automated, non-production environment', now(),
   'Two parts, neither a missing governing input: the version set is narrower than AC-19 '
   || 'specifies, and the committed record is not sealed.');

-- The gate reads the latest evidence per test, so these rows change what
-- it reports without erasing the earlier ones. AC-18 and AC-19 move from
-- "not executed, for a reason that was wrong" to "executed, and blocked
-- by something nameable".
