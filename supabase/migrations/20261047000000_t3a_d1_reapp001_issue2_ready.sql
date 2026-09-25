-- =====================================================================
-- REAPP-001 Issue 2 — everything executable without a signature, done
--
-- Issue 2 supersedes Issue 1 in full and fixes all three defects the
-- Issue 1 verification found. Issue 1 is not loaded.
--
--   the 430-character cap    removed; no value is elided
--   available_routes         boundary rule applied, and Issue 2 also
--                            supplies other_route_classification for
--                            SRC-D1-S1-010, which had the same fault and
--                            the Issue 1 return had NOT reported
--   relevant_conduct twice   confirmed as a split FIELD NAME: the
--                            trailing ".ir" is the head of
--                            irrelevant_conduct
--
-- The Issue 1 return had raised the split as a suspicion. Issue 2
-- confirms it and counts SEVEN occurrences across the issued file.
--
-- RA-06 IMPLEMENTED, AND ITS BLAST RADIUS MEASURED FIRST. A split repair
-- SHRINKS a value, which under CS-I-44 reads as changed rather than
-- extended and would void a carry-forward. Scanning all forty live source
-- sheets for a value ending in a period plus a short lowercase fragment
-- returns exactly ONE hit — SRC-D1-S3-010 relevant_conduct, on a source
-- already withdrawn. So no source holding a standing approval is touched.
-- The other six occurrences sit outside source sheets, in prose the sheet
-- parser never reads. Checking that before implementing rather than after
-- is the difference between one superseded version and several
-- unnecessary withdrawals.
--
-- RA-03a HONOURED. The verifier is a standalone script and stays one:
-- "a precondition that runs only as a side effect of the thing it guards
-- is not a precondition." It now refuses an elided value outright rather
-- than prefix-matching it, because under Issue 2 an ellipsis can only
-- mean the pack was capped again.
--
-- WHAT IS PROVED
--
--   RA-T5  scripts/verify-reapp-001.mjs reports
--          exact 57 · elided 0 · missing 0 · differing 0
--   RA-T6  SRC-D1-S1-010 other_route_classification is its own field
--   RA-T7  SRC-D1-S3-010 relevant_conduct ends "account test." with no
--          trailing fragment, and irrelevant_conduct holds its own value
--   B1-B4  register at 30 of 30; exactly the three sources unservable;
--          exactly three withdrawals; boundary recovery active
--
-- NO APPROVAL IS WRITTEN. Section 4 of Issue 2 is blank — the signature
-- and date lines are empty, as in Issue 1. RA-01 begins "On receipt of a
-- signed Section 4". Everything else in the pack is now done, so loading
-- it is one step.
--
-- RA-T8 CANNOT MEAN WHAT IT SAYS, and this is recorded rather than
-- fudged. It asks that re-running CS-I-44 across all forty sources show
-- zero failures. Three still fail, and they are exactly the three whose
-- values changed — which is the finding CS-I-44 was added to make, not a
-- regression. The assertion compares a live version against the one it
-- superseded, so for these three it must fail for as long as that history
-- exists. What is achievable, and what is true, is the claim underneath
-- it:
--
--   carried approvals resting on a failed assertion   0
--   failing sources that are nonetheless servable     0
--   carried standing approvals                        37
--
-- That is the property RA-T8 protects: no approval anywhere depends on an
-- assertion that failed. Reading it as "the assertion table is empty of
-- failures" would require deleting the evidence that three sources needed
-- re-approval, which is the opposite of the intent.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-31', 'pass',
   'REAPP-001 Issue 2: RA-06 implemented, verifier repointed, and every test executable without a '
   || 'founder signature passes. RA-T5 exact: scripts/verify-reapp-001.mjs reports exact 57, '
   || 'elided 0, missing 0, differing 0 — the count Issue 2 specifies. RA-T6: SRC-D1-S1-010 '
   || 'other_route_classification reads "Not applicable at Stage 1 while Q-D1-06 is not served." '
   || 'as its own field. RA-T7: SRC-D1-S3-010 relevant_conduct ends "account test." with no '
   || 'trailing fragment and irrelevant_conduct carries its own value. Baselines B1 to B4 hold. '
   || 'RA-06 was measured before implementing: exactly one live source sheet carries the split, '
   || 'and it was already withdrawn, so no standing approval was touched and no further '
   || 'carry-forward voided. Only SRC-D1-S3-010 was superseded.',
   '22bb3e6', 'scripts/verify-reapp-001.mjs and SQL proof', now(),
   'NO APPROVAL WRITTEN. Section 4 of Issue 2 is blank, as in Issue 1, and RA-01 requires a signed '
   || 'Section 4. The three sources stay unservable. '
   || 'RA-T8 is recorded as unachievable as literally written, and deliberately not fudged. It asks '
   || 'for zero sources failing CS-I-44 across all forty; three still fail, and they are exactly '
   || 'the three whose values changed — the finding CS-I-44 exists to make. The assertion compares '
   || 'a live version against the one it superseded, so those three must fail while that history '
   || 'exists, and making the count zero would mean deleting the evidence that they needed '
   || 're-approval. The property RA-T8 protects is proved instead: carried approvals resting on a '
   || 'failed assertion = 0, failing sources that are servable = 0, carried standing approvals = '
   || '37. Flagged for Tony to restate the test.');
