-- =====================================================================
-- T3A-D1-REC07-REAPP-001 — verified, and NOT executed
--
-- The re-approval pack for SRC-D1-S1-010, SRC-D1-S2-010 and SRC-D1-S3-010
-- arrived. NO APPROVAL IS WRITTEN BY THIS MIGRATION, for two independent
-- reasons, and both are the pack's own rules working rather than
-- obstacles to route around.
--
-- 1. SECTION 4 IS UNSIGNED. The founder signature and date lines are
--    blank. RA-01 begins "On receipt of a signed Section 4", and the
--    pack's own closing line reads "Section 4 requires the founder
--    only". A build session does not supply a founder signature, and an
--    approval written without one would be exactly the thing the whole
--    REC-07 route exists to prevent.
--
-- 2. RA-03 FAILS ON TWO FIELDS, and the difference is the pack's rather
--    than the data's. Run scripts/verify-reapp-001.mjs to reproduce:
--
--      sources 3 · exact 45 · elided 6 · missing 0 · differing 2
--
--    SRC-D1-S2-010 and SRC-D1-S3-010 available_routes. Section 2
--    transcribes each with the NEXT FIELD'S TEXT still attached:
--
--      "...the commissioning manager's superior.
--       other_route_classificationPermitted where stated aloud."
--
--    The loaded value stops at "superior." and carries "Permitted where
--    stated aloud." as other_route_classification, which is what
--    CORR-003 CS-I-21 and CS-I-22 instruct and what CORR-004 baseline B4
--    re-verifies. So Section 2 contradicts a rule two earlier
--    corrections established, and RA-03 applied literally would refuse
--    two of the three re-approvals it exists to enable.
--
--    This is recorded rather than decided. Taking the pack's value would
--    undo the boundary recovery on two sources; taking the live value
--    would approve content that differs from the signed transcription.
--    Neither is a build decision.
--
-- WHAT WAS VERIFIED AND HOLDS
--
--   Baseline B1  the register reads 30 of 30
--   Baseline B2  exactly SRC-D1-S1-010, SRC-D1-S2-010 and SRC-D1-S3-010
--                return false from t3a_d1_source_version_approved
--   Baseline B3  exactly three withdrawals exist, no other source is
--                withdrawn
--   RA-03        45 of 53 fields match exactly; 6 more are cut at
--                exactly 430 characters in the pack and are verified as
--                correct prefixes of the live value. 430 on the nose
--                across six unrelated fields is a rendering limit, not a
--                statement about content, and the verifier reports them
--                as elided rather than passing them as exact.
--
-- RA-05 ALREADY STANDS. The sheet-boundary rule — a source sheet is the
-- contiguous bullet run carrying the most distinct sheet field names,
-- terminating before any following common section — is implemented in
-- scripts/extract-d1-content.mjs and the CS-I-19/CS-I-20 assertions are
-- retained. Section 1 of the pack explains why only these three could
-- fail: each is the LAST SOURCE IN ITS BANK, so no next heading
-- terminates its sheet and the following bank's common section — which
-- defines fields rather than populating them — ran on into it.
--
-- ONE MORE THING FOR THE FOUNDERS, found while transcribing Section 2.
-- It lists relevant_conduct TWICE for SRC-D1-S3-010, at lines 5741 and
-- 5745, with different values. A field holds one value. The loaded value
-- matches the 5741 entry exactly — including its trailing ".ir", which
-- is itself a run-together fragment of the following word. The 5745
-- entry ("The quality of the evaluation, whether the recommendation is
-- sound, formatting, structure, length...") reads as a NOT-RECORDED list
-- rather than as relevant conduct, so it is likely a different field
-- whose name was lost to the same conversion fault. Recorded, not
-- resolved.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-31', 'pass',
   'T3A-D1-REC07-REAPP-001 received and verified; NO approval written. Baselines B1, B2 and B3 '
   || 'all hold: the register reads 30 of 30, exactly SRC-D1-S1-010, SRC-D1-S2-010 and '
   || 'SRC-D1-S3-010 are unservable, and exactly three withdrawals exist. RA-03 executed through '
   || 'scripts/verify-reapp-001.mjs: 45 fields match exactly, 6 are elided in the pack at exactly '
   || '430 characters and verified as correct prefixes, 0 are missing, and 2 differ. '
   || 'RA-05 already stands: the sheet-boundary rule and the CS-I-19 and CS-I-20 assertions are '
   || 'implemented and retained.',
   'b4c9ba9', 'scripts/verify-reapp-001.mjs', now(),
   'BLOCKED ON TWO THINGS, BOTH FOR THE FOUNDERS. '
   || '(1) Section 4 carries no signature or date. RA-01 requires a signed Section 4 and the pack '
   || 'states Section 4 requires the founder only, so no approval is written. '
   || '(2) RA-03 fails on SRC-D1-S2-010 and SRC-D1-S3-010 available_routes. Section 2 transcribes '
   || 'both with the following field''s text still attached — '
   || '"...superior.other_route_classificationPermitted where stated aloud." — while the loaded '
   || 'value stops at "superior." and carries the remainder as other_route_classification, which '
   || 'is what CORR-003 CS-I-21 and CS-I-22 instruct and CORR-004 baseline B4 re-verifies. '
   || 'Section 2 therefore contradicts a rule two earlier corrections established, and RA-03 '
   || 'applied literally refuses two of the three re-approvals it exists to enable. Taking the '
   || 'pack''s value would undo the boundary recovery on two sources; taking the live value would '
   || 'approve content differing from the signed transcription. Neither is a build decision. '
   || 'ALSO: Section 2 lists relevant_conduct twice for SRC-D1-S3-010, at lines 5741 and 5745, '
   || 'with different values. The loaded value matches the 5741 entry exactly, including a '
   || 'trailing ".ir" fragment; the 5745 entry reads as a not-recorded list and is likely a '
   || 'different field whose name was lost to the same conversion fault.');
