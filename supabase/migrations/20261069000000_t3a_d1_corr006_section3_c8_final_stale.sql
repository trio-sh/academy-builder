-- =====================================================================
-- CORR-006 Section 3 — "C8 final" has defined behavior; the finding was
-- stale, and it is closed rather than deleted
--
-- THE CONTRADICTION THE FOUNDER SPOTTED. The close-out report listed
-- "C8 final is stored with no defined behavior" as open while reporting
-- CLOSE-001 Section 1 as built. He said one of those statements is wrong
-- and restated the required behavior in full. He was right, and it was
-- the finding: Section 1 built all three rules and the finding outlived
-- them.
--
-- CX-06 says run CL-T3, CL-T4 and CL-T5a; if all pass, close the finding
-- and record that it was stale. All three pass.
--
--   R-a  C8a closes at B7 on SRC-D1-S2-005; C1, which carries no final
--        binding, closes at COMMIT.
--   R-b  The whole-session line is offered false at B3 and true at the
--        closing beat, with closes_at reported as B7.
--   R-c  Advance past the closing beat is refused with
--        DETERMINATION_UNANSWERED_AT_CLOSING_BEAT.
--
-- ---------------------------------------------------------------------
-- TWO THINGS ABOUT HOW THIS WAS RUN, BOTH WORTH MORE THAN THE RESULT.
--
-- FIRST, R-c HAD NO SUBJECT AND WOULD HAVE PASSED FOR FREE. Every stage
-- entry in the database points at SRC-D1-S2-001, which binds fourteen
-- capture sets and NOT ONE with a 'final' qualifier. A test of "does not
-- advance past a final beat" run against that entry asks nothing. The
-- proof refuses to run without a subject, and synthesizes an entry on
-- SRC-D1-S2-005 — one of the four sources R-c names — inside the aborted
-- transaction. This is the CS-I-54a fault caught before it produced a
-- green tick rather than after.
--
-- SECOND, I NEARLY REPORTED A DEFECT THAT WAS MY OWN MEASUREMENT. The
-- first draft read a key named whole_session_line_offered, singular, and
-- fell back to counting a 'lines' array. The function returns neither: it
-- returns whole_session_lines_offered, PLURAL, as a boolean. So the draft
-- read zero at both beats and R-b looked like a failure — the
-- whole-session line apparently never offered, even at close. Dumping the
-- raw payload settled it in one call. SOP-002 Appendix 6 question 8 asks
-- whether a reported content fault is actually the build's; here it was
-- the test's, and on D1 that has been the answer four times in five.
--
-- The proof now fails loudly if that key is absent, so the same
-- misreading cannot recur silently.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The three definitions
--
-- Their wording comes from CORR-006 Section 3, which restates the
-- required behavior in full. CLOSE-001's original phrasing for CL-T3,
-- CL-T4 and CL-T5a is not on disk, so the instrument's own restatement is
-- the authority used, and that is said here rather than implied.
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CL-T3', 'T3A-D1-EXEC-CORR-006 Section 3 R-a',
   '"final" closes the determination at that beat; a set with no final beat closes at commit',
   'SRC-D1-S2-005, which binds C8a and C8b with the final qualifier at B7, and C1, which binds no '
   || 'final qualifier.',
   't3a_d1_capture_close_beat returns B7 for C8a and NULL — meaning closes at commit — for C1.',
   'CX-06', NULL,
   'Definition taken from CORR-006 Section 3''s restatement in full, because CLOSE-001''s original '
   || 'wording for CL-T3 is not on disk.'),

  ('CL-T4', 'T3A-D1-EXEC-CORR-006 Section 3 R-b',
   'A whole-session line is offered only at close, identified by answer value',
   'A stage entry on SRC-D1-S2-005, question Q-D1-08a, capture set C8a, read at B3 and at the '
   || 'closing beat.',
   't3a_d1_capture_visible_at_beat reports whole_session_lines_offered false before the closing '
   || 'beat and true at it, with closes_at naming that beat. The two lines are identified by ANSWER '
   || 'VALUE — C2 "Did not raise it at any point in the session." and C8a "Did not disclose during '
   || 'the observation." — never by text match or ordinal, because the catalogue and BR-09 word the '
   || 'C8a line differently.',
   'CX-06', NULL,
   'Definition taken from CORR-006 Section 3''s restatement in full.'),

  ('CL-T5a', 'T3A-D1-EXEC-CORR-006 Section 3 R-c',
   'The Cockpit does not advance past a final beat while that determination is unanswered',
   'A stage entry on SRC-D1-S2-005. NOT the existing fixture: every stage entry in the database '
   || 'points at SRC-D1-S2-001, which carries no final binding, so the test would pass for free.',
   't3a_d1_beat_advance_permitted returns permitted false at the closing beat with '
   || 'DETERMINATION_UNANSWERED_AT_CLOSING_BEAT.',
   'CX-06', 'Any fixture on SRC-D1-S2-001, which has no final binding and therefore no subject.',
   'Definition taken from CORR-006 Section 3''s restatement in full. The fixture requirement is '
   || 'stated explicitly because the obvious fixture is the wrong one.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

-- ---------------------------------------------------------------------
-- 2. The outcomes, from the run
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CL-T3', 'pass',
   'scripts/proofs/c8-final-close-proof.sql against SRC-D1-S2-005: C8a closes=B7, C1 closes=<commit>. '
   || 'Matches R-a exactly.',
   '20261069000000', 'Claude Code, automated, non-production environment', NULL),

  ('CL-T4', 'pass',
   'Same proof: whole_session_lines_offered false at B3, true at the closing beat, closes_at=B7. '
   || 'Matches R-b.',
   '20261069000000', 'Claude Code, automated, non-production environment',
   'An earlier draft of the proof read a singular key name and a lines array, neither of which the '
   || 'function returns, and therefore read zero at both beats — which would have been reported as a '
   || 'build defect that does not exist. The proof now raises if the key is absent so the same '
   || 'misreading cannot recur silently.'),

  ('CL-T5a', 'pass',
   'Same proof: t3a_d1_beat_advance_permitted returned permitted=false with '
   || 'DETERMINATION_UNANSWERED_AT_CLOSING_BEAT at the closing beat. Matches R-c.',
   '20261069000000', 'Claude Code, automated, non-production environment',
   'Run against a stage entry synthesized on SRC-D1-S2-005 inside the aborted transaction, because '
   || 'every existing stage entry points at SRC-D1-S2-001, which binds no final qualifier. Against '
   || 'the existing fixture this test would have passed for free.');

-- ---------------------------------------------------------------------
-- 3. The finding is closed as stale, and kept
-- ---------------------------------------------------------------------

DO $close$
DECLARE v_n int;
BEGIN
  UPDATE public.t3a_d1_build_conflict_register
     SET status = 'closed',
         classification = 'stale finding — the behavior was already built',
         blocked_on = NULL,
         note = note || ' '
             || 'CLOSED AS STALE under CORR-006 CX-06. The behavior existed: CLOSE-001 Section 1 '
             || '(migration 20261054000000) built all three rules and this finding outlived them. '
             || 'CL-T3, CL-T4 and CL-T5a all pass — C8a closes at B7 and C1 at commit; the '
             || 'whole-session line is offered false at B3 and true at close; advance past the '
             || 'closing beat is refused with DETERMINATION_UNANSWERED_AT_CLOSING_BEAT. '
             || 'NOT DELETED, per CX-06.'
   WHERE note ILIKE '%C8 final%'
     AND status <> 'closed';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'C8 final: % register entries closed as stale.', v_n;
END;
$close$;

-- The fixture gap R-c exposed is not closed by this migration and gets its
-- own entry, because a test that needs a synthesized subject every time is
-- a fixture problem, not a passing test.
INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-06/no-fixture-binds-final', 'CORR-006 Section 3',
   'No stage entry exists on a source that binds a final qualifier',
   'fixture gap — the test passes only because the proof builds its own subject',
   'open',
   'Developer: extend scripts/seed-e2e-fixtures.mjs so at least one Cockpit fixture sits on one of '
   || 'SRC-D1-S2-005, SRC-D1-S2-010, SRC-D1-S4-001 or SRC-D1-S4-007.',
   'Every stage entry in the database points at SRC-D1-S2-001, which binds fourteen capture sets and '
   || 'NOT ONE with a final qualifier. So R-c — the Cockpit does not advance past a final beat while '
   || 'that determination is unanswered — has no subject in the standing fixture and would pass for '
   || 'free against it. CL-T5a passes here only because the proof synthesizes an entry on '
   || 'SRC-D1-S2-005 inside an aborted transaction. '
   || 'THAT IS FINE FOR A SQL PROOF AND NOT FINE FOR THE BROWSER SUITE, which is where R-c actually '
   || 'lives: the rule is about what the Cockpit does. Until a fixture binds a final qualifier, the '
   || 'fourteen Cockpit tests cannot exercise closing behavior at all — the same shape as CS-I-54a, '
   || 'where fourteen tests were green over a pane that had never worked.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;
