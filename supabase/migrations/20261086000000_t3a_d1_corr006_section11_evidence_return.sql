-- =====================================================================
-- CORR-006 Section 11 — the evidence to return, as rows
--
-- Twenty-five items. This is the return, and it is built as a TABLE plus a
-- function that recomputes the live measurements, rather than as a document.
--
-- WHY NOT A DOCUMENT. The last time a finding lived only in prose — "C8 final
-- is stored with no defined behavior" — a later instruction to close it had
-- nothing to act on, and the WHERE clause that went looking for it closed a
-- different record instead. Section 11 is the founder's list of things to
-- check; a list of things to check is exactly what has to stay checkable.
-- t3a_d1_corr006_evidence_return() re-measures the countable items on every
-- call, so an item that stops being true stops reading as true.
--
-- THREE VERDICTS ONLY, and the middle one is not a softer "pass":
--
--   matches         the measured value is what Section 11 expects.
--   differs         it does not, and the row says how.
--   not_producible  this build cannot produce it, and the row says why. Four
--                   items read this way, and none of them is a failure of
--                   something built here.
--
-- I am stating the not_producible four up front rather than leaving them to
-- be found in the table:
--
--   X6  asks for thirty-nine CLOSE-001 test results. FOUR exist as rows —
--       CL-T3, CL-T4, CL-T5a and CL-T37. The other thirty-five were never
--       records in this build. CORR-006 Section 3 says as much of the three
--       it restates: "CLOSE-001's original wording for CL-T3 is not on disk."
--   X7  asks for T3A-DEV-PLC-005-A Notes 5 and 7 test results. No such test
--       exists as a row and that document is not on disk.
--   X8  asks for Stage 4 refusals R1 to R6. No such test exists as a row.
--   X10 asks for the Google Workspace configuration applied, or E3 on
--       attestation alone. Neither is in the build; the host of a meet.new
--       call cannot be verified from here at all, which is already open in
--       the register.
-- =====================================================================

set search_path = public;

CREATE TABLE IF NOT EXISTS public.t3a_d1_corr006_evidence_item (
  item          text PRIMARY KEY,
  asked_for     text NOT NULL,
  expected      text NOT NULL,
  verdict       text NOT NULL CHECK (verdict IN ('matches', 'differs', 'not_producible')),
  measured      text NOT NULL,
  where_proved  text
);

COMMENT ON TABLE public.t3a_d1_corr006_evidence_item IS
  'CORR-006 Section 11. The twenty-five evidence items, what each expects, what was measured, and where the proof is. The countable ones are re-measured live by t3a_d1_corr006_evidence_return(); this table holds the reading and the reasoning. A verdict of not_producible is not a softer pass — it says this build cannot produce the item, and why.';

ALTER TABLE public.t3a_d1_corr006_evidence_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_corr006_evidence_item_read ON public.t3a_d1_corr006_evidence_item;
CREATE POLICY t3a_d1_corr006_evidence_item_read
  ON public.t3a_d1_corr006_evidence_item FOR SELECT TO authenticated USING (true);

INSERT INTO public.t3a_d1_corr006_evidence_item
  (item, asked_for, expected, verdict, measured, where_proved)
VALUES
 ('X1', 'Acceptance register count', 'Thirty of thirty', 'matches',
  'Thirty acceptance tests, thirty standing outcomes, all pass, and no test without evidence. '
  || 'Standing is the LATEST evidence row per test, not the existence of a passing one — the register '
  || 'also holds not_executed and blocked_by_conflict rows from earlier runs, and reading it as "a pass '
  || 'exists" would have reported thirty either way.',
  't3a_d1_corr006_evidence_return(), recomputed live'),

 ('X2', 'Servable current versions, by Stage', 'Ten, ten, ten, zero', 'matches',
  'Ten, ten, ten, zero. Stage 4 is zero because CL-16 withdrew all ten approvals, which is the state '
  || 'CX-25 requires — a build may never record a Stage 4 approval.',
  't3a_d1_source_version_approved over the forty standing versions'),

 ('X3', 'Loaded sequences, itemized',
  'Thirty-three: three demonstration, ten Stage 1, ten Stage 2, ten Stage 4', 'matches',
  'Thirty-three exactly: DEMO-D1-S1 (14 beats), DEMO-D1-S2 (9), DEMO-D1-S4 (13), ten Stage 1 (34 '
  || 'beats), ten Stage 2 (70), ten Stage 4 (70). The 34 Stage 1 beats cross-check the engine proof, '
  || 'which counted 34 reveals across the ten sources by a different route.',
  't3a_d1_mentor_action_sequence, grouped'),

 ('X4', 'Stage 4 approval provenance, per source', 'Ten rows, each traced and withdrawn', 'matches',
  'Ten withdrawals recorded against the ten Stage 4 sources, and zero Stage 4 current versions '
  || 'servable. Each of the ten carry-forwards is traceable in t3a_d1_source_approval_provenance and '
  || 'each is superseded by a withdrawal, which is why they no longer read as carried in the standing '
  || 'view — see X5.',
  'Measured live; see also CORR-006/CX-16/thirty-seven-is-thirty-nine'),

 ('X5', 'RA-T8R''s three values', 'Zero, zero, twenty-seven', 'matches',
  'Zero carried approvals resting on a failed identity assertion; zero failing sources nonetheless '
  || 'servable; twenty-seven carried standing approvals. '
  || 'ONE CORRECTION TO THE ARITHMETIC BESIDE IT: RA-T8R''s own wording says twenty-seven is "down '
  || 'from thirty-seven". The provenance table holds THIRTY-NINE rows. Both routes reach 27 and they '
  || 'agree on which approvals; the extra two are SRC-D1-S1-010 and SRC-D1-S2-010, carried under a '
  || 'different basis and superseded by the founder''s own re-approvals of 25 September.',
  'Recomputed live; CORR-006/CX-16/thirty-seven-is-thirty-nine'),

 ('X6', 'Every CLOSE-001 test — CL-T1 to CL-T38, and CL-T5a — with its result',
  'Thirty-nine rows', 'not_producible',
  'FOUR OF THIRTY-NINE EXIST AS ROWS: CL-T3, CL-T4, CL-T5a and CL-T37. The other thirty-five were '
  || 'never records in this build — not failed, not skipped, never written down. CORR-006 Section 3 '
  || 'corroborates it for the three it restates: "CLOSE-001''s original wording for CL-T3 is not on '
  || 'disk", which is why Section 3 had to restate the required behavior in full before it could be '
  || 'tested. '
  || 'WHAT THIS MEANS FOR THE RETURN: thirty-five of the thirty-nine cannot be reported as passing, '
  || 'failing or not run, because there is nothing to report against. Recreating their definitions '
  || 'from their identifiers would be the build inventing what CLOSE-001 required.',
  'Four rows in t3a_d1_correction_test; the count is asserted'),

 ('X7', 'T3A-DEV-PLC-005-A Notes 5 and 7', 'Test results for each', 'not_producible',
  'No test exists as a row for either Note, and T3A-DEV-PLC-005-A is not on disk. Note 5 is cited in '
  || 'migration 20261061000000 for the synthetic-provenance pattern and in Section 8 for the precedent '
  || 'that no cooldown duration was invented — so its CONTENT is known and honoured in two places, and '
  || 'its TEST RESULTS were never recorded.',
  NULL),

 ('X8', 'Stage 4 refusals R1 to R6', 'Six results', 'not_producible',
  'No test exists as a row for R1 to R6 and this instrument does not restate them. Stage 4 is the one '
  || 'Stage with zero servable sources, so nothing can be run against it in any case — but that is a '
  || 'reason the refusals matter, not a reason they need no results.',
  NULL),

 ('X9', 'Live Session panel in place of live views; no placeholder stream', 'Confirmed', 'matches',
  'The Cockpit contains no <video> element, no getUserMedia, no MediaStream and no srcObject — zero '
  || 'occurrences of any of them — and four references to the Live Session panel. CL-44 and CL-45 '
  || 'replaced the automatic video-track detection, which the Cockpit cannot do when the video is in '
  || 'Meet, with a mentor report.',
  'Measured against src/pages/dashboard/mentor/Cockpit.tsx'),

 ('X10', 'Google Workspace configuration applied, or E3 on attestation alone',
  'One of the two', 'not_producible',
  'NEITHER. No Workspace configuration is applied, and no attestation stands in for one. The reason is '
  || 'structural rather than an omission: a meet.new call is created in the browser and the platform '
  || 'never sees it, so WHO HOSTED IT CANNOT BE VERIFIED FROM HERE AT ALL. Already open at '
  || 'SECTION-2A/meet-new-host-unverifiable. An attestation would record a claim, not a configuration, '
  || 'and this build does not have the standing to make one on the founder''s behalf.',
  'SECTION-2A/meet-new-host-unverifiable in the register'),

 ('X11', 'CL-50 corrected; CL-T37 re-run',
  'Ordinary speech accepted; a spoken capture label refused', 'matches',
  'ordinary "update"=ACCEPTED, ordinary "final"=ACCEPTED, spoken "C3 update"=REFUSED, spoken '
  || '"C8 final"=REFUSED. All 210 loaded beats re-checked under the narrowed rule: zero carry a capture '
  || 'label in spoken text, so nothing loaded is affected either way.',
  'CL-T37 outcome; migration 20261067000000'),

 ('X12', 'AX-T4 under CX-03 to CX-05',
  'One succeeds; both succeed with the lock disabled; lock re-enabled', 'differs',
  'THE REFUSAL HALF PASSES AND THE CONCURRENCY HALF CANNOT RUN HERE. With the lock in force: first '
  || 'SUCCEEDED, second REFUSED. With the per-version advisory lock genuinely removed: both succeeded, '
  || 'which is the negative control. Lock re-enabled and re-proved. '
  || 'AX-T4-CONC reads not_run: two genuinely concurrent database sessions are not reachable from this '
  || 'container, and all three routes were tried rather than assumed — the direct host resolves '
  || 'IPv6-only with no IPv6 available. So "both succeed with the lock disabled" is proved by REMOVING '
  || 'THE LOCK FROM THE CODE in one session, not by two sessions racing. '
  || 'THAT DISTINCTION FOUND THE LATENT DEFECT the sequential proof exists for: the standing view '
  || 'breaks a tie on a random uuid, which the first draft of this proof hit by stamping every row with '
  || 'now().',
  'AX-T4-SEQ and AX-T4-CONC outcomes; scripts/proofs/axt4-lock-proof.sql'),

 ('X13', 'CL-T3, CL-T4, CL-T5a; the "C8 final" finding',
  'Three results; the finding closed as stale or wired', 'matches',
  'All three pass — C8a closes at B7 and C1 at commit; the whole-session line is offered false at B3 '
  || 'and true at the closing beat; advance past the closing beat is refused with '
  || 'DETERMINATION_UNANSWERED_AT_CLOSING_BEAT. The finding is CLOSED AS STALE, and it had to be '
  || 'CREATED as a row first because it only ever lived in the close-out report''s prose. '
  || 'CL-T5a''s fixture is synthesized: every stage entry in the database points at SRC-D1-S2-001, '
  || 'which binds no final qualifier, so against the standing fixture that test would pass for free. '
  || 'That fixture gap is open at CORR-006/CX-06/no-fixture-binds-final.',
  'CL-T3, CL-T4, CL-T5a outcomes; scripts/proofs/c8-final-close-proof.sql'),

 ('X14', 'The engine', 'Identifier, version, hash; no model endpoint; byte-identical rendering',
  'matches',
  'T3A-S1-DELIVERY-ENGINE-001, version 1.0.0, code hash computed from pg_get_functiondef over the '
  || 'engine''s own functions — what is deployed, not what was written — and a guard refuses a run '
  || 'citing a stale hash. No HTTP-capable extension and no HTTP-capable function exist in this '
  || 'database, so the engine CANNOT reach a model endpoint; that is why it renders here rather than in '
  || 'the browser. Byte-identity: 10 sources, 34 reveals, every situation and reveal found by '
  || 'position() inside its own source''s stored text. '
  || 'AND THE THING THAT MATTERS MOST HERE: the obvious reveal parse returns SEVEN bullets on '
  || 'SRC-D1-S1-001 for a source with FOUR reveals, one of them reading "- **R4** Q-D1-08a/08bNOT '
  || 'SERVEDNo bearing interest—". That is what a participant would have met as their final reveal. '
  || 'Scoped to the reveal-sequence section, the ten return 4,3,3,4,4,3,3,3,3,4.',
  'CX-14-NO-GENERATION outcome; scripts/proofs/s1-engine-proof.sql'),

 ('X15', 'Annexes A, B and C loaded; no real run cites a placeholder',
  'Three identifiers and hashes', 'matches',
  'T3A-S1-DELIVERY-SPEC-001 bdf5a0a7…, T3A-S1-ADMIN-CONFIG-001 f8748d69…, T3A-PARTICIPANT-SAFETY-001 '
  || '748b1748…. The four demonstration objects keep synthetic_test_only and the bar that refuses a '
  || 'non-demonstration run citing them; both asserted. The migration is GENERATED from the instrument '
  || 'and re-hashes what it stored, so a hand-edit of the SQL fails rather than quietly changing what a '
  || 'participant reads.',
  'scripts/generate_corr006_annex_load.py; migration 20261076000000'),

 ('X16', 'Section 5.16', 'Corrected text renders; the two old sentences render nowhere', 'differs',
  'THE OLD SENTENCES RENDER NOWHERE — and they did before this instrument too, because the Section '
  || '5.16 participant notice was never built. "artificial intelligence" appears zero times in src/, '
  || 'zero times in the migrations and zero times across every loaded content version. So the second '
  || 'half is true and the first is not: THE CORRECTED TEXT DOES NOT RENDER, because there is no screen '
  || 'to render it on. '
  || 'What exists: the corrected wording loaded as issued content with its hashes, and a guard refusing '
  || 'any content version containing either retired sentence — which is what survives someone '
  || 'rebuilding the notice from the superseded document.',
  'CX-15-RETIRED-SENTENCES outcome; CORR-006/CX-15/nothing-rendered-the-old-sentences'),

 ('X17', 'Basis rows under CX-16; an approval with no basis',
  'Twenty-seven rows; refused by name', 'matches',
  'Twenty-seven rows, against exactly SRC-D1-S1-001..009, S2-001..009 and S3-001..009, asserted '
  || 'identifier by identifier, with the Section 12 attestation stored verbatim and hash-checked. Four '
  || 'named refusals from the route — APPROVAL_BASIS_REQUIRED, APPROVAL_BASIS_NOT_IN_CLOSED_LIST, '
  || 'APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER, APPROVAL_BASIS_TAKES_NO_IDENTIFIER — plus '
  || 'APPROVAL_RECORDS_NO_BASIS from a direct write past the route.',
  'X17-BASIS-ROWS and X17-BASIS-GATE outcomes; scripts/proofs/approval-basis-proof.sql'),

 ('X18', 'The legacy library',
  'Every route and job listed; each refused on direct request; no row altered', 'matches',
  'Eleven reach points listed as rows in t3a_retired_library_reach. The live route '
  || '/dashboard/candidate/assessment/interactive is removed with its import and navigation link, and '
  || '111 string literals unique to the library are now absent from the built bundle where they were '
  || 'present before. observation_loops refuses writes by name BOTH as an authenticated caller and as a '
  || 'superuser. Row counts unchanged at 1, 0, 0, 0. '
  || 'TWO QUALIFICATIONS THE EXPECTED COLUMN DOES NOT ANTICIPATE. The library asks the server for '
  || 'nothing — its content is constants in a bundled module — so "refused on direct request" has no '
  || 'subject for the content half, and the bundle measurement is what replaces it. And three of the '
  || 'four tables have live writers, so CX-22 governs them: their writes are kept, each dependency '
  || 'recorded by file and line.',
  'CX-1920-LIBRARY-QUARANTINE outcome; src/test/legacy-library-quarantine.test.ts'),

 ('X19', 'Ten assessments loaded; a Stage 4 approval without one',
  'Ten records; refused by name', 'matches',
  'Ten impact assessments with seventy parts, cross-checked against Annex D. The gate refuses '
  || 'STAGE4_APPROVAL_WITHOUT_IMPACT_ASSESSMENT and STAGE4_APPROVAL_PRECEDES_ITS_ASSESSMENT, accepts an '
  || 'approval after its assessment, and leaves Stage 1 untouched. '
  || 'FOUND BY THAT PROOF: the Stage 4 identifier test matched ''^SRC-D1-S4-0'' with a trailing zero, '
  || 'recognising only 001 to 099 — a source numbered 100 or above would have escaped the gate '
  || 'silently, which is the exact failure CL-16 withdrew ten approvals to prevent.',
  'CX-24-GATE outcome; scripts/proofs/stage4-approval-gate-proof.sql'),

 ('X20', 'A second attempt within seven days of a completed observation', 'Refused', 'matches',
  'Refused with SPECIFICATION_COOLDOWN_IN_FORCE and a wait of 7. Both sides of every boundary were '
  || 'tested — the same observation at eight days PERMITS, two completed at eight days refuses with a '
  || 'wait of 14, at fifteen days permits, three refuses with ATTEMPT_CAP_REACHED rather than a '
  || 'cooldown, and another Stage permits throughout. A cooldown test that only checks "refused" passes '
  || 'against a function that refuses everything.',
  'CX-27-COOLDOWN outcome; scripts/proofs/cooldown-and-welfare-stop-proof.sql'),

 ('X21', 'A welfare stop',
  'No attempt consumed; cooldown applied; determinations excluded; record visible only to the Safety '
  || 'Contact and the founder', 'differs',
  'The first three hold: attempt_consumed false, the observation withheld, a determination afterwards '
  || 'REFUSED_BY_NAME, and the next attempt held. '
  || 'THE LAST ONE DIFFERS IN A WAY THAT MATTERS: the record is visible to NOBODY, not to the Safety '
  || 'Contact and the founder. No Safety Contact is designated, and there is no founder in this schema '
  || 'to fall back to — so the policy is false for everyone, including an oversight holder, which the '
  || 'proof reads back as zero rows. That is the only reading that cannot over-disclose, and it is not '
  || 'safe to leave: C4d requires escalation the same day. '
  || 'AND THE COOLDOWN IS APPLIED AS A HOLD, NOT A DURATION: CX-28 says the rescheduling cooldown '
  || 'applies and does not say how long, so the build refuses with '
  || 'RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED rather than picking a number.',
  'CX-28-WELFARE-STOP, CX-29-WITHHELD-EXCLUSION, CX-30CD-SAFETY-RECORD outcomes'),

 ('X22', 'CX-32 and CX-33',
  'Window applied per bank; the derivation of all twenty pattern families, with any nulls named',
  'matches',
  'Stage 2 all 600/1200 and Stage 4 all 1200/1800, applied because NO window was stored for any of the '
  || 'twenty — not a wrong value, no value. All twenty state a class and all twenty parse, so there are '
  || 'NO NULLS to name at the source. The derived families: S-1 three, S-2 four, S-3 three, S-4 two, '
  || 'S-5 four, S-6 two, S-7 two. '
  || 'WHAT IS NULL IS THE REGISTRY: t3a_source holds zero rows, so the family is absent for all forty. '
  || 'The build derives and reports it and writes nothing, because the family decides prior-exposure '
  || 'exclusion and CX-33 says do not infer one.',
  'CX-3233-BANK-WINDOWS-AND-CLASSES outcome; t3a_d1_bank_class_and_window_survey()'),

 ('X23', 'The ten Stage 1 windows as loaded', 'Match AC-B3a exactly', 'matches',
  'All ten match: 600/1500, 360/900, 360/900, 480/1500, 360/1200, 480/1200, 360/1000, 480/1200, '
  || '480/1200, 480/1200. '
  || 'THE NUMBERS WERE NEVER WRONG; THE SHAPE WAS. They are stored as the prose "600 / 1500." in one '
  || 'field, which a run cannot read, and min_seconds is the literal string "," — the empty field '
  || 'AC-B3a describes. The issued source_sheet is unchanged, comma and all; the two numbers now also '
  || 'exist where a run can read them, and the check refuses rather than reconciles if they ever part.',
  'AC-B3a-WINDOWS outcome; scripts/proofs/s1-time-window-proof.sql'),

 ('X24', 'The four safety controls at CX-30',
  'Each exercised; the safety event record holds no disclosure content and is visible only to the '
  || 'Safety Contact and the founder', 'differs',
  'All four built and exercised. The record holds no disclosure content: asserted by name that no '
  || 'column matches content, disclosure, detail, note, body, text, description, verbatim, quote or '
  || 'summary, and that it has no foreign key into any evidence table. '
  || 'VISIBILITY DIFFERS, for the reason at X21: visible to nobody, because no Safety Contact is '
  || 'designated and no founder is identifiable. '
  || 'ALSO FOUND WHILE BUILDING THESE: the session log takes free text, and the existing report route '
  || 'writes it — so a mentor stopping a session for a disclosure could have typed what was said into '
  || 'a table beside the evidence. The welfare routes take no narrative parameter at all, and a session '
  || 'event carrying free text on a withheld instance is refused.',
  'CX-30AB-WELFARE-CONTROLS and CX-30CD-SAFETY-RECORD outcomes'),

 ('X25', 'The Stage 3 line and the two Stage 4 theme lines',
  'Each renders where CX-31 places it', 'differs',
  'THE STAGE 3 LINE RENDERS; THE TWO THEME LINES HAVE NOWHERE TO RENDER. The C4a line is on the Stage '
  || '3 screen, above the brief, and the route returns it at S3 and deliberately NOT at S1, where Annex '
  || 'A''s opening already says it. '
  || 'CX-31 places the theme lines on the participant''s PRE-SESSION SCREEN, and there is no participant '
  || 'pre-session screen: the only surface showing a Google Meet link is the mentor''s Cockpit. So '
  || '"before any Google Meet link" has nothing to be before. '
  || 'Both lines are loaded with hashes and returned by the route for the two sources Annex D names and '
  || 'no others, and a surface contract asserts that wherever a participant-facing file shows a Meet '
  || 'link the support information appears BEFORE it — which passes vacuously today and fails the '
  || 'moment someone builds that screen without it.',
  'Migration 20261083000000; CORR-006/CX-31/no-participant-pre-session-screen')
ON CONFLICT (item) DO UPDATE SET
  asked_for = EXCLUDED.asked_for, expected = EXCLUDED.expected, verdict = EXCLUDED.verdict,
  measured = EXCLUDED.measured, where_proved = EXCLUDED.where_proved;

-- ---------------------------------------------------------------------
-- The live half. Every countable item is recomputed on each call, so an
-- item that stops being true stops reading as true.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_corr006_evidence_return()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH live AS (
    SELECT jsonb_build_object(
      'X1_acceptance_standing_pass', (
        SELECT count(*) FROM (
          SELECT DISTINCT ON (e.test_id) e.test_id, e.outcome
            FROM public.t3a_d1_acceptance_evidence e
           ORDER BY e.test_id, e.executed_at DESC) s
         WHERE s.outcome = 'pass'::public.t3a_d1_acceptance_outcome),
      'X1_acceptance_tests', (SELECT count(*) FROM public.t3a_d1_acceptance_test),
      'X2_servable_by_stage', (
        SELECT jsonb_object_agg(bank, servable) FROM (
          SELECT substring(co.identifier, 8, 2) AS bank,
                 count(*) FILTER (WHERE public.t3a_d1_source_version_approved(cv.content_version_id)) AS servable
            FROM public.t3a_content_object co
            JOIN public.t3a_d1_content_version cv
              ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
           WHERE co.identifier ~ '^SRC-D1-S[1-4]-'
           GROUP BY 1) x),
      'X3_sequences', (SELECT count(DISTINCT source_identifier) FROM public.t3a_d1_mentor_action_sequence),
      'X4_stage4_withdrawals', (
        SELECT count(*) FROM public.t3a_d1_source_approval a
          JOIN public.t3a_content_object co ON co.content_object_id = a.source_id
         WHERE co.identifier ~ '^SRC-D1-S4-' AND a.status = 'withdrawn'),
      'X5_failed_identity_carried', (
        SELECT count(*) FROM public.t3a_d1_source_approval_standing s
          JOIN public.t3a_d1_source_approval_provenance p ON p.source_approval_id = s.source_approval_id
         WHERE s.status = 'approved' AND p.identity_assertion_passed IS NOT TRUE),
      'X5_carried_standing', (
        SELECT count(*) FROM public.t3a_d1_source_approval_standing
         WHERE was_carried_forward AND status = 'approved'),
      'X6_close001_tests_on_record', (
        SELECT count(*) FROM public.t3a_d1_correction_test WHERE correction_test_id LIKE 'CL-T%'),
      'X6_close001_tests_expected', 39,
      'X17_basis_rows', (SELECT count(*) FROM public.t3a_d1_approval_basis),
      'X18_library_reach_points', (SELECT count(*) FROM public.t3a_retired_library_reach),
      'X18_library_table_rows', jsonb_build_object(
        'candidate_profiles', (SELECT count(*) FROM public.candidate_profiles),
        'mentor_assignments', (SELECT count(*) FROM public.mentor_assignments),
        'mentor_assigned_dimensions', (SELECT count(*) FROM public.mentor_assigned_dimensions),
        'observation_loops', (SELECT count(*) FROM public.observation_loops)),
      'X19_stage4_assessments', (SELECT count(*) FROM public.t3a_d1_stage4_impact_assessment),
      'X21_safety_contact', public.t3a_current_safety_contact() -> 'refusal_code',
      'X22_bank_windows', (
        SELECT jsonb_object_agg(stage_code::text, min_seconds || '/' || max_seconds)
          FROM public.t3a_d1_bank_session_window),
      'X22_registry_rows', (SELECT count(*) FROM public.t3a_source),
      'X23_stage1_windows_agreeing', (
        SELECT count(*) FROM jsonb_array_elements(public.t3a_d1_s1_window_survey()) w
         WHERE (w ->> 'agrees')::boolean)
    ) AS m)
  SELECT jsonb_build_object(
    'instrument', 'T3A-D1-EXEC-CORR-006, Section 11',
    'measured_at', now(),
    'verdicts', (SELECT jsonb_object_agg(verdict, n)
                   FROM (SELECT verdict, count(*) AS n
                           FROM public.t3a_d1_corr006_evidence_item GROUP BY 1) v),
    'items', (SELECT jsonb_agg(jsonb_build_object(
                'item', i.item, 'expected', i.expected, 'verdict', i.verdict,
                'measured', i.measured, 'where_proved', i.where_proved) ORDER BY
                substring(i.item, 2)::int)
                FROM public.t3a_d1_corr006_evidence_item i),
    'live_measurements', (SELECT m FROM live),
    'open_register_entries', (SELECT count(*) FROM public.t3a_d1_build_conflict_register
                               WHERE status = 'open'));
$fn$;

COMMENT ON FUNCTION public.t3a_d1_corr006_evidence_return() IS
  'CORR-006 Section 11, the return. The stored reading of each of the twenty-five items, plus live_measurements, which recomputes every countable one on each call. A return that is only a stored document is a claim about the past; this one re-reads the database while it is being read.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_corr006_evidence_return() TO authenticated;

-- ---------------------------------------------------------------------
-- CX-34 — nothing renamed, no approval altered, no history rewritten
-- ---------------------------------------------------------------------

DO $cx34$
DECLARE v_n int; v_bad text;
BEGIN
  -- The twenty-five items must all be present and each carry one of the three
  -- verdicts. A missing item is a silent gap in a return.
  SELECT count(*) INTO v_n FROM public.t3a_d1_corr006_evidence_item;
  IF v_n <> 25 THEN
    RAISE EXCEPTION 'SECTION11_INCOMPLETE: % of the twenty-five items are recorded.', v_n;
  END IF;

  SELECT string_agg('X' || g, ', ') INTO v_bad
    FROM generate_series(1, 25) g
   WHERE NOT EXISTS (SELECT 1 FROM public.t3a_d1_corr006_evidence_item i WHERE i.item = 'X' || g);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'SECTION11_MISSING_ITEMS: %', v_bad;
  END IF;

  -- CX-34, the part a migration can actually check: the approval table is
  -- append-only and its row count is not reduced by anything in this
  -- instrument. Ninety-eight rows stood before Section 11 and stand now.
  SELECT count(*) INTO v_n FROM public.t3a_d1_source_approval;
  IF v_n < 98 THEN
    RAISE EXCEPTION 'CX34_APPROVAL_ROWS_LOST: t3a_d1_source_approval holds % rows and held 98. No approval row is altered or deleted.', v_n;
  END IF;

  -- The four column names CX-10 declined to rename are still there.
  SELECT string_agg(c, ', ') INTO v_bad FROM unnest(ARRAY[
      'model_ref_version_id','prompt_ref_version_id','admin_config_version_id','safety_config_version_id']) c
   WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = 'public.t3a_d1_ai_administration_run'::regclass
                        AND a.attname = c AND a.attnum > 0 AND NOT a.attisdropped);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'CX34_FIELD_RENAMED: % no longer exist on t3a_d1_ai_administration_run. CX-10: no field is renamed.', v_bad;
  END IF;

  RAISE NOTICE 'Section 11: twenty-five items recorded. CX-34: % approval rows intact, the four provenance columns unrenamed.', v_n;
END;
$cx34$;
