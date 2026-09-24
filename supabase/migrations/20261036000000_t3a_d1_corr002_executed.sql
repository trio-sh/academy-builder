-- =====================================================================
-- T3A-D1-EXEC-CORR-002 implemented, and the five tests it unblocked
--
-- The ruling arrived and corrected the reading this build had been
-- working from. Recording what was wrong matters more than recording
-- what now passes.
--
-- THE PREMISE THAT WAS WRONG. This build had reasoned that a question is
-- either answered from a capture set or bound to a source field, and
-- that Q-D1-03b1 and Q-D1-03b2 therefore took no set. That is false.
-- Being source-bound does not remove a question from a capture set: the
-- binding supplies the OPTIONS and the set supplies the LINES. C3 is one
-- visual group holding THREE separately persisted controls — Q-D1-03a,
-- Q-D1-03b1 and Q-D1-03b2. Twelve sets hold one question each, C3 holds
-- three: fifteen across thirteen.
--
-- The guessed arithmetic reached the right total by a route that does
-- not hold, and 20261030000000 had encoded the false premise as a CHECK
-- constraint and called it structural enforcement. It would have refused
-- five of the fifteen rows now loaded. Refusing to infer the mapping was
-- correct; the reading offered alongside it was not.
--
-- WHAT THE ISSUED FILE GOT WRONG ABOUT ITSELF, and this build reported
-- as an open question rather than a contradiction: Section 5.2 says the
-- Q-D1-04b bound child is served "on one option"; BR-06 says two, and
-- BR-06 governs. t3a_d1_served_questions already implemented BR-06
-- correctly. The serving logic was right and the question asked about it
-- was the thing that was wrong.
--
-- WHAT THE TESTS THEMSELVES FOUND. All three C3 controls initially
-- rendered the same five lines — three copies of one question, asked as
-- if they were three. CS-I-03 says C3 is ONE visual group: the lines
-- belong to the first control, and lines 2, 3 and 4 say "select which"
-- in their own words, which IS Q-D1-03b1 and Q-D1-03b2. A secondary
-- control now renders its bound selection and no copy of the lines, and
-- still persists as its own determination.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-27', 'pass',
   'Executed in Chromium. Pane 2 serves nine questions for SRC-D1-S2-001, each with '
   || 'its capture set and that set''s lines, read from t3a_d1_question_capture_map at '
   || 'serve time through t3a_d1_serve_for_selection. Nothing is compiled into the '
   || 'interface (CS-I-01). The "No determination questions to serve" state no longer '
   || 'appears.',
   '6a96104', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-06', 'pass',
   'Q-D1-01 renders C1 and ONLY C1: exactly three radio controls and no fourth, with '
   || 'the line text matching the register verbatim, and no textarea beside the '
   || 'approved set. The assertion counts the options rather than checking that the '
   || 'approved ones are present, because the latter would pass with extra options '
   || 'rendered alongside them.',
   '6a96104', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-08', 'pass',
   'Before Q-D1-03a is answered neither child exists in the DOM — CS-I-14, no row at '
   || 'all rather than a disabled control. Selecting C3 line 4 (both omitted and '
   || 'unsupported) serves Q-D1-03b1 and Q-D1-03b2, each bound to the served source '
   || 'version''s own list: material_items and assertion_reference_set respectively.',
   '6a96104', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-05', 'pass',
   'Changing Q-D1-03a from line 4 to line 1 withdraws both children and their bound '
   || 'lists from the screen. "Wrong-prompt options cannot remain visible" is tested as '
   || 'removal, not as disablement: the assertion is a DOM count of zero.',
   '6a96104', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL),

  ('AC-13', 'pass',
   'Q-D1-08a asks when a disclosure was made relative to the decision point. No loaded '
   || 'source carries a mentor action sequence, so no beat marks that point and no '
   || 'timestamp exists. The determination is REFUSED and named — BEAT_SCRIPT_NOT_LOADED '
   || '— and offers zero radio controls. The test asserts the refusal is stated rather '
   || 'than that the control is absent, because an absent control would also satisfy a '
   || 'question that was simply never served.',
   '6a96104', 'Playwright, e2e/mentor-cockpit.spec.ts', now(), NULL);

-- AC-12 is not claimed. The mechanism it needs exists; the content does not.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-12', 'blocked_by_conflict',
   'NOT EXECUTED and not claimed. AC-12 requires Pane 1 to show the pause instruction, '
   || 'ten to fifteen seconds to be recorded, and the timing-dependent capture to use '
   || 'that recorded timestamp. The beat register and the timing gate are built '
   || '(t3a_d1_beat_timestamp, t3a_d1_timing_determination_permitted) and AC-13 '
   || 'exercises them. What is missing is the beat script itself: all 81 content '
   || 'versions carry source_identifier, title, stage_code, source_sheet, verbatim, '
   || 'source_version_hash, rec07_approval_ref, name_clearance_status and register, and '
   || 'NONE carries a mentor_action_sequence. The beats exist in the issued edition''s '
   || 'prose and were never extracted into a structured sequence, so there is no pause '
   || 'instruction to show and no beat code to timestamp.',
   '6a96104', 'not executed', now(),
   'Naming a beat code here — inferring that the decision point is B2 because this '
   || 'acceptance test mentions a B2 pause — would be inventing the structure of an '
   || 'approved script. The gate reads the decision-point beat from the source and '
   || 'refuses with BEAT_SCRIPT_NOT_LOADED where there is none, which is correct today '
   || 'and stays correct once the scripts load: the refusal simply stops firing. What is '
   || 'needed is the mentor action sequence extracted into t3a_d1_content_version.body, '
   || 'with each beat carrying a code and the decision point marked.');

-- CORR-002's own acceptance tests, where they were executed.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-31', 'pass',
   'CORR-002 Section 5 count check (CS-12), executed against the live register: '
   || 'fifteen question objects across thirteen capture sets, C3 carrying three, five '
   || 'source-bound consuming controls fed by four families, and '
   || 't3a_d1_question_capture_gap returning zero rows. CS-02 and CS-03 proved in SQL: '
   || 'answering Q-D1-03a with C3 line 1 serves neither child and answering with line 4 '
   || 'serves both, each as its own determination. CS-08 proved in the browser: '
   || 'Q-D1-04b refuses with BOUND_FAMILY_ABSENT_OR_EMPTY on a source whose support set '
   || 'reads "Empty.", rather than rendering an empty slot or degrading to a '
   || 'fixed-option control.',
   '6a96104', 'SQL proof and Playwright', now(),
   'CS-I-13 interpretation recorded rather than assumed: C5a line 2 ("Said action was '
   || 'needed without naming a specific action") is given the same branch code as line 1, '
   || 'because BR-05 withholds the children only where the participant "did not refer to '
   || 'any corrective action", and line 2 does refer to one without naming it. The '
   || 'alternative reading — that only a specifically named action opens the children — '
   || 'is not what BR-05 says but is close enough to the wording to be flagged. The two '
   || 'lines persist as different determinations either way.');

-- A content fault the serving work surfaced, recorded against the load.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
SELECT 'AC-30', 'pass',
   'Re-checked while wiring the source-bound controls. The bound families load as prose '
   || 'carrying item identifiers, and several END MID-SENTENCE: SRC-D1-S2-001 '
   || 'material_items reads "M1 the figure is wrong. M2 the participant supplied it. M3 '
   || 'the error is the", and available_routes yields only R-a and R-b, the second '
   || 'reading "send", where CORR-002 Section 4 states SRC-D1-S3-010 carries R-a to R-d. '
   || 'The parse splits on the identifiers and keeps what follows VERBATIM — it does not '
   || 'repair, complete or trim an item — and a family yielding no identifiable item '
   || 'refuses under CS-I-07 rather than offering an invented choice.',
   '6a96104', 'SQL inspection of t3a_d1_content_version', now(),
   'Whether the issued edition truncates these values or the content load did cannot be '
   || 'settled from this repository, which does not hold the issued file. Serving a '
   || 'truncated item would offer a participant an incomplete approved answer, so this is '
   || 'raised against the content load rather than worked around in the serving code.'
WHERE EXISTS (SELECT 1 FROM public.t3a_d1_acceptance_test WHERE test_id = 'AC-30');
