-- =====================================================================
-- CORR-006 Section 6 — the legacy scenario library, quarantined
--
-- CX-19 asks for the inventory, CX-20 for every reach made unreachable
-- SERVER-SIDE, CX-21 for nothing deleted and no stored row altered, and
-- CX-22 for a live non-retired feature not to be broken by any of it.
--
-- ---------------------------------------------------------------------
-- THE FIRST THING MEASURING SHOWED: THE LIBRARY SHIPS TO PARTICIPANTS
-- TODAY, AND IT IS NOT REACHED THROUGH THE DATABASE AT ALL.
--
-- Its content is a TypeScript module — src/data/interactiveSkillAssessment.ts
-- — bundled into the client. Four of its literal strings were found verbatim
-- in dist/assets/index-*.js of a fresh production build, and the route
-- /dashboard/candidate/assessment/interactive is live and renders it.
--
-- THAT BREAKS CX-20'S METHOD, NOT JUST ITS SUBJECT. "Make every one
-- unreachable, server-side... never by observing that a screen hides it"
-- assumes a server the route asks for something. This library asks the
-- server for nothing: the scenarios, the correct answers and the grading
-- bands are constants in the bundle. There is no route to refuse.
--
-- So the quarantine is split, and each half is enforced by the only
-- mechanism that can actually enforce it:
--
--   THE CONTENT leaves the client bundle, by removing the route and every
--   import of it from a routed component. That is checkable and checked: a
--   test greps the BUILT bundle for the library's own strings. Not "the
--   screen hides it" — the bytes are not shipped.
--
--   THE WRITES are refused in the database, by policy and by trigger, and
--   proved by requesting them directly.
--
-- ---------------------------------------------------------------------
-- THE SECOND THING: THREE OF THE FOUR TABLES HAVE LIVE WRITERS, SO CX-22
-- GOVERNS THEM RATHER THAN CX-20.
--
--   observation_loops              0 rows, NO live writer  -> writes blocked
--   mentor_assigned_dimensions     0 rows, live writer at
--                                  MentorDashboard.tsx:1787 -> CX-22
--   mentor_assignments             0 rows, live writer at
--                                  GetStarted.tsx:344       -> CX-22
--   candidate_profiles             1 row,  live writers in resumeParser,
--                                  storage, mentorMatching, VerifyPassport,
--                                  CandidateDashboard        -> CX-22
--
-- candidate_profiles carries no scoring column at all — resume_url, skills,
-- experience_years, education, work_history, current_tier, mentor_loops,
-- has_skill_passport, has_talentvisa, is_listed_on_t3x, entry_path. It is a
-- profile table the library also wrote to, not the library. Blocking its
-- writes would break resume upload, the skill passport flag and T3X
-- listing. CX-22's first clause — "do not break it" — governs.
--
-- The same is true of the two mentor tables: blocking them would stop
-- onboarding matching a mentor and stop a mentor assigning dimensions. Their
-- writes are kept, their reads are kept, and every dependency is recorded
-- below with the file and line that would break, so the founder can see
-- exactly what the alternative costs.
--
-- NOTHING D1 USES IS AFFECTED: D1 reads t3a_mentor_assignment, a different
-- table. t3a_d1_is_assigned_mentor does not touch mentor_assignments.
--
-- CX-21: nothing is deleted and no stored row is altered. The counts are
-- asserted at the end — 1, 0, 0, 0, exactly as found.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CX-19 — the inventory, as rows
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_retired_library_reach (
  reach_id      text PRIMARY KEY,
  kind          text NOT NULL
                  CHECK (kind IN ('route', 'page', 'component', 'service',
                                  'data_module', 'table', 'navigation', 'policy')),
  what_it_is    text NOT NULL,
  reaches       text NOT NULL,
  state_now     text NOT NULL
                  CHECK (state_now IN ('removed', 'writes_blocked',
                                       'kept_under_cx22', 'already_unreachable')),
  why           text NOT NULL,
  recorded_under text NOT NULL DEFAULT 'T3A-D1-EXEC-CORR-006 Section 6, CX-19'
);

COMMENT ON TABLE public.t3a_retired_library_reach IS
  'CX-19. Every route, page, component, service, data module, table, navigation entry and policy found to reach the legacy scenario library or write to its four tables, with what became of each. Held as rows rather than prose so the inventory can be queried and so a later instruction to act on one of them has something to name — SOP-002 Stage 5.4.';

ALTER TABLE public.t3a_retired_library_reach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_retired_library_reach_read ON public.t3a_retired_library_reach;
CREATE POLICY t3a_retired_library_reach_read
  ON public.t3a_retired_library_reach FOR SELECT TO authenticated USING (true);

INSERT INTO public.t3a_retired_library_reach
  (reach_id, kind, what_it_is, reaches, state_now, why)
VALUES
  ('route:/dashboard/candidate/assessment/interactive', 'route',
   'A LIVE participant route rendering the scoring instrument',
   'AssessmentViewer, which imports src/data/interactiveSkillAssessment.ts',
   'removed',
   'This was reachable by any signed-in participant. It presented timed challenges with '
   || 'evaluationCriteria and graded responses. Removed from the router, and with it the last routed '
   || 'import of the library, so the library''s strings leave the client bundle.'),

  ('page:AssessmentViewer', 'page',
   'src/pages/... AssessmentViewer component',
   'src/data/interactiveSkillAssessment.ts',
   'already_unreachable',
   'Kept in the tree, unrouted, per CX-21''s spirit: nothing is deleted. No routed component imports '
   || 'it, which is what takes it out of the bundle.'),

  ('component:InteractiveSkillAssessment', 'component',
   'src/components/assessment/InteractiveSkillAssessment.tsx',
   'src/data/interactiveSkillAssessment.ts, candidate_profiles, mentor_assignments, '
   || 'mentor_assigned_dimensions, observation_loops',
   'already_unreachable',
   'Withdrawn from routing before this instrument, under T3A-D1-EXEC-001 sections 3.4, 8.4 and 7.1 — '
   || 'it took the microphone with no RECORDING consent and produced per-dimension scores. Confirmed '
   || 'still unrouted.'),

  ('service:aiResponseAnalysis', 'service',
   'src/services/aiResponseAnalysis.ts',
   'src/data/interactiveSkillAssessment.ts; grades responses excellent to poor',
   'already_unreachable',
   'Reached only from the library''s own components, which are unrouted. Nothing is deleted.'),

  ('service:aiSceneGeneration', 'service',
   'src/services/aiSceneGeneration.ts',
   'src/data/interactiveSkillAssessment.ts',
   'already_unreachable',
   'Same: reached only from the library''s own components.'),

  ('data_module:interactiveSkillAssessment', 'data_module',
   'src/data/interactiveSkillAssessment.ts — the library itself',
   'Is the scoring instrument: scenarios, evaluationCriteria, timed challenges',
   'removed',
   'NOT DELETED FROM THE REPOSITORY — CX-21 deletes nothing. Removed from the SHIPPED BUNDLE by '
   || 'removing the last routed import of it. Four of its literal strings were found verbatim in '
   || 'dist/assets/index-*.js before this change; a surface contract now greps the built bundle for '
   || 'them. That is a stronger claim than a hidden screen: the bytes are not sent.'),

  ('table:observation_loops', 'table',
   'The library''s loop table, carrying bars_score',
   'Written by the library only',
   'writes_blocked',
   'Zero rows and no live writer in src/. All write policies dropped and a trigger refuses INSERT, '
   || 'UPDATE and DELETE by name. Proved by requesting the write directly.'),

  ('table:mentor_assigned_dimensions', 'table',
   'Legacy per-dimension mentor assignment',
   'Written by the library AND by MentorDashboard.tsx:1787, a live feature',
   'kept_under_cx22',
   'Zero rows. Blocking writes would stop a mentor assigning dimensions, which is a current, '
   || 'non-retired feature. CX-22''s first clause governs: do not break it. Read and write kept, '
   || 'dependency recorded.'),

  ('table:mentor_assignments', 'table',
   'Legacy mentor-to-candidate assignment',
   'Written by the library AND by GetStarted.tsx:344, which matches a mentor at onboarding',
   'kept_under_cx22',
   'Zero rows. Blocking writes would stop onboarding matching a mentor. NOT the table D1 uses: '
   || 't3a_d1_is_assigned_mentor reads t3a_mentor_assignment, a different table, so nothing in D1 '
   || 'depends on this either way.'),

  ('table:candidate_profiles', 'table',
   'The participant profile table',
   'Written by the library AND by resumeParser, storage, mentorMatching, VerifyPassport and '
   || 'CandidateDashboard',
   'kept_under_cx22',
   'One row. IT CARRIES NO SCORING COLUMN AT ALL — resume_url, skills, experience_years, education, '
   || 'work_history, current_tier, mentor_loops, has_skill_passport, has_talentvisa, '
   || 'is_listed_on_t3x, entry_path. It is a profile table the library also wrote to, not the '
   || 'library. Blocking its writes would break resume upload, the skill passport flag and T3X '
   || 'listing.'),

  ('policy:mentor_assignments_allow_all', 'policy',
   'Four policies literally named "Allow all select/insert/update/delete" on mentor_assignments',
   'Any authenticated caller can read or write ANY mentor assignment',
   'kept_under_cx22',
   'FOUND BY THIS INVENTORY AND NOT CAUSED BY THE LIBRARY. These policies let any signed-in user '
   || 'insert, update or delete anybody''s mentor assignment. It is a live authorization hole, it is '
   || 'outside Section 6''s subject, and narrowing it would change who may assign a mentor — an '
   || 'authority question. Recorded in the register for the founder rather than quietly tightened or '
   || 'quietly left.')
ON CONFLICT (reach_id) DO UPDATE SET
  kind = EXCLUDED.kind, what_it_is = EXCLUDED.what_it_is, reaches = EXCLUDED.reaches,
  state_now = EXCLUDED.state_now, why = EXCLUDED.why;

-- ---------------------------------------------------------------------
-- 2. CX-20 — observation_loops takes no more writes
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS observation_loops_rw ON public.observation_loops;

-- A read is kept, per CX-22's "keep the read": the one row of history that
-- may appear later is not hidden, and nothing is deleted.
DROP POLICY IF EXISTS t3a_observation_loops_read_only ON public.observation_loops;
CREATE POLICY t3a_observation_loops_read_only
  ON public.observation_loops FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.t3a_observation_loops_retired()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'LEGACY_LIBRARY_RETIRED: % on observation_loops is refused. A scoring instrument, closed under T3A-D1-EXEC-001 Section 4.3 and quarantined under T3A-D1-EXEC-CORR-006 Section 6. Existing rows are kept and readable; nothing new is written and nothing is deleted.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

COMMENT ON FUNCTION public.t3a_observation_loops_retired() IS
  'CX-20 and CX-21. Refuses every write to the library''s loop table — the one of the four with no live writer — while leaving its rows in place and readable. A trigger as well as a policy, because a policy binds the authenticated role and a trigger binds anything that reaches the table, including a definer route written later.';

DROP TRIGGER IF EXISTS t3a_observation_loops_retired_trg ON public.observation_loops;
CREATE TRIGGER t3a_observation_loops_retired_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.observation_loops
  FOR EACH ROW EXECUTE FUNCTION public.t3a_observation_loops_retired();

-- ---------------------------------------------------------------------
-- 3. CX-22 — nothing from the library sources D1 content
-- ---------------------------------------------------------------------

DO $sourcing$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM public.t3a_d1_content_version cv
   WHERE cv.body::text ~* '(interactiveSkillAssessment|evaluationCriteria|bars_score|observation_loops)';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'CX22_LIBRARY_SOURCED_D1_CONTENT: % D1 content versions carry a trace of the library. CX-22: nothing from the library may be used as a source of content for D1 or any later dimension.', v_n;
  END IF;
  RAISE NOTICE 'CX-22: no D1 content version carries any trace of the library.';
END;
$sourcing$;

-- ---------------------------------------------------------------------
-- 4. CX-21 — nothing deleted, no stored row altered
-- ---------------------------------------------------------------------

DO $cx21$
DECLARE v_cp int; v_ma int; v_mad int; v_ol int;
BEGIN
  SELECT count(*) INTO v_cp FROM public.candidate_profiles;
  SELECT count(*) INTO v_ma FROM public.mentor_assignments;
  SELECT count(*) INTO v_mad FROM public.mentor_assigned_dimensions;
  SELECT count(*) INTO v_ol FROM public.observation_loops;

  IF (v_cp, v_ma, v_mad, v_ol) IS DISTINCT FROM (1, 0, 0, 0) THEN
    RAISE EXCEPTION 'CX21_ROWS_CHANGED: counts read (%, %, %, %) and were measured as (1, 0, 0, 0) before this section. Nothing here deletes or alters a row, so a difference means something else did and this migration will not commit over it.',
      v_cp, v_ma, v_mad, v_ol;
  END IF;

  RAISE NOTICE 'CX-21: candidate_profiles 1, mentor_assignments 0, mentor_assigned_dimensions 0, observation_loops 0 — unchanged.';
END;
$cx21$;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-20/library-is-in-the-client-bundle-not-behind-a-route',
   'CORR-006 Section 6, measured against a fresh production build',
   'How a scoring instrument that asks the server for nothing can be made unreachable',
   'CX-20''s method does not fit its subject; the stronger available enforcement was used instead',
   'open',
   'Founder: note that the library''s source file remains in the repository. Removing it is a deletion '
   || 'and CX-21 deletes nothing, so it is left for an instruction that authorizes it.',
   'CX-20: "Make every one unreachable, server-side... Prove each refusal by requesting the route '
   || 'directly, never by observing that a screen hides it." '
   || 'THE LIBRARY HAS NO SERVER SIDE. Its scenarios, correct answers and grading bands are constants '
   || 'in a TypeScript module, bundled into the client. There is no route to request and nothing for a '
   || 'server to refuse. MEASURED: four of its literal strings appear verbatim in dist/assets/index-*.js '
   || 'of a fresh production build, and /dashboard/candidate/assessment/interactive was LIVE and '
   || 'rendered it to any signed-in participant. '
   || 'WHAT WAS DONE INSTEAD, and it is stronger than the letter of CX-20 rather than weaker: the '
   || 'route is removed and with it the last routed import, so the library''s bytes are NOT SENT to '
   || 'the browser. A surface contract greps the BUILT BUNDLE for its own strings. "The screen hides '
   || 'it" would be a claim about markup; "the bundle does not contain it" is a claim about what '
   || 'crosses the network, and it is the one that can be checked. '
   || 'THE WRITES, which do have a server side, are refused there and proved by direct request.'),

  ('CORR-006/CX-22/three-of-the-four-tables-have-live-writers',
   'CORR-006 Section 6',
   'What blocking the library''s four tables would break',
   'CX-22 applied: live features not broken, dependencies recorded with file and line',
   'open',
   'Founder: decide whether the legacy mentor-matching at onboarding and the mentor dimension '
   || 'assignment are to be retired. Until then their writes stay, because CX-22 says do not break a '
   || 'current feature.',
   'CX-20 asks that no job write to the library''s four tables. THREE OF THEM HAVE LIVE, NON-RETIRED '
   || 'WRITERS: mentor_assignments from GetStarted.tsx:344, which matches a mentor during onboarding; '
   || 'mentor_assigned_dimensions from MentorDashboard.tsx:1787, where a mentor assigns dimensions; '
   || 'and candidate_profiles from resumeParser, storage, mentorMatching, VerifyPassport and '
   || 'CandidateDashboard. '
   || 'candidate_profiles CARRIES NO SCORING COLUMN — it is a profile table the library also wrote to, '
   || 'not the library — and blocking it would break resume upload, the skill passport flag and T3X '
   || 'listing. '
   || 'SO ONLY observation_loops IS BLOCKED: zero rows, no live writer, and it carries bars_score, '
   || 'which is the library''s scoring. The other three keep their reads and their writes under '
   || 'CX-22''s first clause, "do not break it", with the cost of the alternative recorded here rather '
   || 'than decided by the build. '
   || 'NOTHING IN D1 IS AFFECTED EITHER WAY: D1 reads t3a_mentor_assignment, a different table.'),

  ('CORR-006/CX-19/mentor-assignments-is-open-to-any-authenticated-caller',
   'CORR-006 Section 6, found by the CX-19 inventory',
   'Who may write a mentor assignment',
   'live authorization hole, outside this section''s subject — recorded, not touched',
   'open',
   'Founder: this is an authority question — who may assign a mentor — and narrowing it is not a '
   || 'build''s decision.',
   'mentor_assignments carries four policies literally named "Allow all select", "Allow all insert", '
   || '"Allow all update" and "Allow all delete". ANY SIGNED-IN USER CAN INSERT, UPDATE OR DELETE '
   || 'ANYBODY''S MENTOR ASSIGNMENT. '
   || 'FOUND BY LOOKING FOR SOMETHING ELSE: CX-19 asks for every route and policy that can write the '
   || 'library''s tables, and listing them is what surfaced these. It is not caused by the library and '
   || 'it is not what Section 6 is about. '
   || 'NOT TOUCHED, because narrowing it decides who may assign a mentor, which is an authority '
   || 'question and the DEVELOPER JUDGMENT BOUNDARY reserves those. Recorded rather than quietly '
   || 'tightened or quietly left. Nothing in D1 depends on this table.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;

-- ---------------------------------------------------------------------
-- 5. Found while proving the quarantine
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-22/onboarding-mentor-match-has-never-worked',
   'CORR-006 Section 6, found while writing the negative control',
   'Whether the live feature CX-22 protects actually works',
   'live feature already broken, independently of this section — recorded, NOT fixed',
   'open',
   'Founder: decide whether onboarding should match a mentor at all. Fixing it would START creating '
   || 'mentor assignments that are not being created today, which is a behavior change nobody asked '
   || 'for.',
   'GetStarted.tsx:344 inserts into mentor_assignments with status "pending". The table''s check '
   || 'constraint allows only ''active'', ''completed'' and ''transferred''. SO THAT WRITE FAILS EVERY '
   || 'TIME IT RUNS, and it is inside a try block with no error handling, so it fails silently. '
   || 'mentor_assignments holds ZERO rows, which is consistent with every insert having been rejected '
   || 'since the constraint was added. '
   || 'HOW IT WAS FOUND: the negative control for the quarantine — an insert meant to show that CX-22''s '
   || 'tables still accept writes — was refused by that same check constraint, which sent me to read '
   || 'the constraint and then the call site. The control was testing the wrong thing and found '
   || 'something better. '
   || 'WHY THIS MATTERS TO SECTION 6: CX-22 says do not break a current feature. The feature it '
   || 'protects here does not work. That does not change what the build does — the write path stays, '
   || 'because removing it is a decision about onboarding and not about the library — but it does mean '
   || 'the cost CX-22 was weighing against is zero for this table. '
   || 'DELIBERATELY NOT FIXED. Making the insert succeed would start writing mentor assignments where '
   || 'none are written now, silently changing what happens to every new participant. That is not a '
   || 'quarantine and it is not this instrument''s subject.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CX-1920-LIBRARY-QUARANTINE', 'T3A-D1-EXEC-CORR-006 Section 6, CX-19 to CX-22',
   'The library reaches no browser and writes nothing, and the tables kept under CX-22 still work',
   'The live database for the writes; a fresh production build for the bundle; and the three CX-22 '
   || 'tables as the control.',
   'An insert into observation_loops is refused by name BOTH as an authenticated caller and as a '
   || 'superuser, so the refusal is not merely a policy on one role; the read is kept; no write policy '
   || 'remains and a read policy does; the CX-22 tables still accept writes; the row counts are '
   || 'unchanged at 1, 0, 0, 0; and none of the 111 string literals unique to the library appears in '
   || 'the built bundle, where they were present before.',
   'CX-20', NULL,
   'The superuser insert is the line that makes the refusal server-side rather than role-scoped: a '
   || 'policy alone would leave any SECURITY DEFINER route written later free to write.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CX-1920-LIBRARY-QUARANTINE', 'pass',
   'scripts/proofs/library-quarantine-proof.sql, self-aborting: candidateProfilesRows=1 '
   || 'observationLoopsRows=0 insertAsAuthenticated=REFUSED_BY_NAME readAsAuthenticated=READABLE(0) '
   || 'insertAsSuperuser=REFUSED_BY_NAME writePolicies=0 readPolicies=1 '
   || 'mentorAssignmentsStillWritable=REACHED_INTEGRITY_NOT_BLOCKED cx22WritePoliciesKept=11 '
   || 'inventoryRows=11. And src/test/legacy-library-quarantine.test.ts: 111 literals unique to the '
   || 'library, none of them in dist/assets/*.js, and no evaluationCriteria in the bundle.',
   '20261084000000', 'Claude Code, automated, non-production environment',
   'MY FIRST BUNDLE MEASUREMENT WAS WRONG AND READ AS A FAILED QUARANTINE. I picked six long strings '
   || 'out of the library and found all six still in the built output. They were the fourteen dimension '
   || 'descriptions, which MentorDashboard.tsx also holds — shared vocabulary, not the library''s '
   || 'content. The test now computes the literals that appear NOWHERE ELSE in src/, and asserts there '
   || 'are more than fifty of them before checking, so the check cannot pass by having an empty '
   || 'subject. '
   || 'THE NEGATIVE CONTROL ALSO MISFIRED AND FOUND SOMETHING BETTER: it was refused by '
   || 'mentor_assignments'' status check, which allows only active, completed and transferred — while '
   || 'GetStarted.tsx:344 inserts "pending". That live onboarding write has been failing silently every '
   || 'time it ran, which is why the table holds zero rows. Open at '
   || 'CORR-006/CX-22/onboarding-mentor-match-has-never-worked, and deliberately not fixed.');
