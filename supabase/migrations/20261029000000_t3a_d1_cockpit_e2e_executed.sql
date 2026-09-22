-- =====================================================================
-- §11.1 — the Stage 2 cockpit tests, executed in a browser
--
-- e2e/mentor-cockpit.spec.ts drives the real cockpit at
-- /dashboard/mentor/cockpit/:id as a signed-in mentor, against
-- SRC-D1-S2-001 — a source holding a standing REC-07 approval.
--
-- Getting it to run at all found three faults, each of which had made the
-- cockpit unusable for the person it exists for.
--
-- 1. THE COCKPIT COULD NOT OPEN FOR A MENTOR. t3a_stage_entry_event
--    carried one policy, FOR ALL USING is_admin(), and no SELECT policy.
--    The read policy 20260903000000 defines never landed — another thing
--    lost by the same partial application as the eight columns — and the
--    policy it defines would not have been enough anyway, because it
--    admits the participant and an admin and no mentor. Fixed in
--    20261028000000.
--
-- 2. PANE 1 RENDERED AN EMPTY SCRIPT. The cockpit read
--    body -> 'canonical_body'. The register stores the approved text
--    under 'verbatim': the forty loaded versions carry source_identifier,
--    title, stage_code, source_sheet, verbatim, source_version_hash,
--    rec07_approval_ref and name_clearance_status, and nothing writes a
--    canonical_body. So the pane that must render "the exact active
--    approved version" rendered nothing, silently, against a source ten
--    thousand characters long.
--
-- 3. THE E2E SUITE POINTED AT A DEAD PROJECT. e2e/auth.setup.ts
--    hardcodes bloujipdkyjsgzwxnoej, which is unreachable and not on this
--    account, and injects a session under a localStorage key the client
--    does not read. Two independent reasons nothing it wrote could have
--    been read, so no end-to-end test in this repository has been
--    passing. The cockpit suite signs in through the real form instead.
--
-- WHAT RAN AND WHAT HAPPENED
--
--   AC-01  pass  six regions simultaneously visible, each with a real
--                layout box, and no dialog overlaying the session
--   AC-04  pass  Pane 1 renders the approved text, compared against the
--                register rather than checked for non-emptiness, and
--                carries no textarea, text input or contenteditable
--   AC-17  pass  a reload returns the same Stage instance and the same
--                route; no duplicate instance
--   AC-24  pass  no recording indicator, no "REC", and no control that
--                would start one. The test matches media-recording
--                wording specifically, because the cockpit HAS a "Record
--                an administration variance at this beat" control and a
--                test that banned the word would fail on the thing §11
--                requires
--   AC-26  pass  both live views stay visible while the determination
--                pane is used
--   AC-28  pass  the variance control sits at the beat rather than
--                behind a session-end step
--
--   AC-27  FAIL  and correctly. "Current beat, timing, applicable
--                question set, source-bound choices and approved branch
--                surface automatically from governed records." No
--                question surfaces: Pane 2 shows "No determination
--                questions to serve for this source at this Stage."
--
-- WHY AC-27 FAILS, AND WHY IT IS NOT FIXED HERE
--
-- The cockpit expects the served questions, their options and their
-- branch conditions to arrive pre-baked inside the source body. They do
-- not live there and never did. They live in registers:
-- t3a_d1_question_object holds the fifteen questions,
-- t3a_d1_capture_set and t3a_d1_capture_line hold the thirteen answer
-- catalogues, t3a_d1_branch_rule holds the ten branch rules, and
-- t3a_d1_served_questions(source_sheet, answers) already decides which
-- questions a given source serves.
--
-- Everything needed is built except one fact: WHICH capture set answers
-- WHICH question. It is nearly positional and not reliably so —
-- Q-D1-03a pairs with C3, not C3a — and it is recorded nowhere. The
-- capture sets' applicability_note carries conditions, not question
-- codes.
--
-- That mapping is a governing input from the issued Execution Edition.
-- Inferring it from the numbering would be a developer assumption about
-- which approved answers a participant is offered for a given question,
-- which is exactly the class of decision this build does not make. It is
-- recorded as a conflict instead.
--
-- AC-05, AC-06, AC-08, AC-12 and AC-13 all depend on the same mapping —
-- prompt-to-capture synchronisation, a question's approved answer set, a
-- triggered child, and beat timing all require a served question to
-- exist — so they stay blocked, and on this rather than on REC-07.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-01', 'pass',
   'Executed in Chromium against /dashboard/mentor/cockpit/:id as a signed-in mentor at '
   || '1440x900. All six regions visible simultaneously — participant live view, mentor '
   || 'live view, Pane 1, Pane 2, header and session control strip — each with a non-zero '
   || 'layout box, and no element with role="dialog" overlaying the session.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-04', 'pass',
   'Pane 1 renders the approved source text for SRC-D1-S2-001. The assertion compares the '
   || 'rendered pane against the text held in t3a_d1_content_version rather than checking '
   || 'that the pane is non-empty. Read-only confirmed: no textarea, no text input and no '
   || 'contenteditable in the pane. This failed on first run — the cockpit read '
   || 'body->>''canonical_body'', a key no loaded source carries, and rendered an empty '
   || 'script; it reads ''verbatim'' now.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-17', 'pass',
   'A reload of the cockpit returns the same Stage instance on the same route, with no '
   || 'duplicate instance created and no silent advance.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-26', 'pass',
   'Both live views remain visible while the determination pane is used. The mentor is not '
   || 'required to leave the cockpit for anything the test exercises.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-28', 'pass',
   'The administration variance control is present AT the beat, in the cockpit, rather '
   || 'than behind a post-session step.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-24', 'pass',
   'Browser run, additional to the mechanism evidence already recorded. No recording '
   || 'indicator, no "REC" and no control that would start a recording. The assertion '
   || 'matches media-recording wording specifically: the cockpit carries a "Record an '
   || 'administration variance at this beat" control, which §11 requires, and a test that '
   || 'banned the word "record" would have failed on it.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL);

-- The failure, recorded as a failure.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-27', 'blocked_by_conflict',
   'Executed and DID NOT PASS. Pane 2 shows "No determination questions to serve for this '
   || 'source at this Stage", so the applicable question set does not surface. The cockpit '
   || 'expects served questions, their options and their branch conditions pre-baked inside '
   || 'the source body; they are not there and never were. They live in '
   || 't3a_d1_question_object (15), t3a_d1_capture_set (13) and t3a_d1_capture_line (44), '
   || 'with t3a_d1_branch_rule (10) and t3a_d1_served_questions(source_sheet, answers) '
   || 'already deciding what a source serves. '
   || 'The one thing missing is which capture set answers which question. It is nearly '
   || 'positional and not reliably so — Q-D1-03a pairs with C3, not C3a — and no register '
   || 'records it.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(),
   'The question-to-capture-set mapping is a governing input from the issued Execution '
   || 'Edition. Inferring it from the numbering would be a developer assumption about which '
   || 'approved answers a participant is offered for a given question. Recorded rather than '
   || 'decided.');

-- The four that depend on the same mapping, restated against it.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
SELECT t.test_id, 'blocked_by_conflict',
   'The browser harness exists and runs — six of these Stage 2 tests now pass in Chromium. '
   || 'This one cannot run until a determination question is served, and no question is '
   || 'served: see AC-27. Prompt-to-capture synchronisation, a question''s approved answer '
   || 'set, a triggered child and beat timing all require a served question to exist.',
   '39c5d12', 'Playwright, e2e/mentor-cockpit.spec.ts', now(),
   'Same governing input as AC-27: which capture set answers which question is recorded in '
   || 'no register.'
FROM public.t3a_d1_acceptance_test t
WHERE t.test_id IN ('AC-05', 'AC-06', 'AC-08', 'AC-12', 'AC-13');
