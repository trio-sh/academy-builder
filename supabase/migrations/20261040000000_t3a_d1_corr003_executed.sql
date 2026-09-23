-- =====================================================================
-- T3A-D1-EXEC-CORR-003 executed
--
-- Three things were put to the founders on PR 292. Two were mine to fix
-- and one was right.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-30', 'pass',
   'CORR-003 Section 1. The bound families were NEVER TRUNCATED and the issued file is intact. '
   || 'The defect was in the load and it was mine: the source-sheet regex used [\s\S]*? with a '
   || 'lookahead for the next bullet, which looks as though it reads a whole bullet, but it '
   || 'carried the /m flag, under which the final $ alternative matches the end of every LINE. '
   || 'The library soft-wraps at about 95 characters, so the match stopped at the first wrap. '
   || '"M3 the error is the" was the end of a physical line. '
   || 'Two further boundary faults were found by the assertions CORR-003 asks for, not by '
   || 'reading: a source sheet is ONE contiguous bullet run and a source''s line range holds '
   || 'several, including an unheaded DEFINITIONAL run between sources that is longer than '
   || 'SRC-D1-S1-010''s real AS1/AS2 entry, so the previous "fullest value wins" rule preferred '
   || 'the definition over the data; and twenty-one sources run available_routes straight into '
   || 'other_route_classification with no separator. '
   || 'Re-parsed and superseded for all forty sources. CS-13: material_items yields four items '
   || 'ending "materially higher." CS-14: available_routes yields four routes with R-b whole. '
   || 'CS-15: SRC-D1-S3-010 yields four. CS-16: other_route_classification is its own field. '
   || 'CS-17: the load now refuses a bound family ending without terminal punctuation, and that '
   || 'assertion caught the S1-010 definitional-run fault before it reached the database. '
   || 'CS-18: SRC-D1-S3-010 attribution_support_set reads "Empty. The interest is..." and is '
   || 'empty under CS-I-24.',
   '9957200', 'scripts/extract-d1-content.mjs and SQL proof', now(),
   'I reported this as a possible CONTENT fault and asked the founders to check the issued '
   || 'file. It was a parser defect. Reading the bullet structure would have settled it here '
   || 'without the round trip.'),

  ('AC-31', 'pass',
   'CORR-003 Section 3. The C5a line 2 reading is confirmed as governing: BR-05 withholds the '
   || 'children only where the participant did not refer to any corrective action, which is C5a '
   || 'line 3. Line 2 refers to one without naming it, and its composed statement ST-D1-052 '
   || 'reads "the participant indicated that action should be taken without identifying what". '
   || 'CS-I-30 and CS-I-31 were already implemented in 20261033000000 and are unchanged: lines 1 '
   || 'and 2 carry the same branch code and persist as different determinations. No code change '
   || 'was needed. '
   || 'Also re-verified after the sheet correction: fifteen questions across thirteen capture '
   || 'sets, C3 carrying three, gap view at zero, and the thirteen browser tests green against a '
   || 'Stage entry pinned to the corrected version.',
   '9957200', 'SQL proof and Playwright', now(), NULL);

-- AC-12, split as CS-I-28 directs rather than recorded as one pass or fail.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-12', 'blocked_by_conflict',
   'SPLIT PER CS-I-28, and still not claimed for any source the cockpit serves. '
   || 'BUILT: the mentor_action_sequence register (CS-I-26) with beat_code, beat_ordinal, '
   || 'action_type, content_verbatim, is_decision_point, the pause bounds and role_label; the '
   || 'uniform pause window (CS-I-29, 10 to 15 seconds, three-second minimum between turns); and '
   || 'the timing gate reading that register. '
   || 'LOADED: the sequences the issued file actually carries. CS-19 and CS-20 pass — '
   || 'DEMO-D1-S1-001 pauses at B3 and DEMO-D1-S2-001 at B2, seventeen beats across the two, '
   || 'which is exactly why CS-I-27 forbids locating the decision point from a pause. '
   || 'NOT CLAIMED: no beat in either loaded sequence is marked as the decision point, so '
   || 'is_decision_point is false throughout and the timing-dependent capture still refuses — '
   || 'DECISION_POINT_BEAT_NOT_NAMED where a sequence is loaded, BEAT_SCRIPT_NOT_LOADED where '
   || 'none is. CS-21 passes on that refusal. The forty production sources carry no sequence at '
   || 'all, so AC-12 is not claimable for any source a participant would be observed against.',
   '9957200', 'SQL proof', now(),
   'CS-I-25 says "the thirteen demonstration sources at Section 5.11 already carry structured '
   || 'beat sequences". The issued file carries FOUR demonstration sources — DEMO-D1-S1-001, '
   || 'S2-001, S3-001 and S4-001 at lines 1268, 1327, 1397 and 1441 — and only TWO carry a '
   || 'Mentor script block with beat-coded lines. S3-001 and S4-001 carry none, which fits: S3 '
   || 'is a written submission and S4 is disabled. A third "Mentor script" string at line 4678 '
   || 'is not a script; it sits inside run-together prose in the Stage 2 bank register, the same '
   || 'conversion fault CS-I-21 covers. Two sequences were loaded, not thirteen, and the count '
   || 'is reported rather than made up. '
   || 'TWO THINGS ARE OUTSTANDING ON THE FOUNDERS, not on the build: which beat is the decision '
   || 'point in each sequence, since nothing in either script marks one and CS-I-27 forbids '
   || 'deriving it; and the mentor action sequences for the forty-one production sources, which '
   || 'CORR-003 Section 2.3 itself records as content authoring rather than a build task.');
