-- =====================================================================
-- CORR-006 evidence item X17 — "Basis rows under CX-16; an approval with
-- no basis" / required result "Twenty-seven rows; refused by name"
--
-- Recorded as rows rather than as a sentence in a report, because the last
-- time a finding lived only in prose (the "C8 final" one) a later
-- instruction to close it had nothing to act on, and the WHERE clause that
-- went looking for it closed a different record instead.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('X17-BASIS-ROWS', 'T3A-D1-EXEC-CORR-006 Section 11, evidence item X17',
   'The Section 12 attestation attaches to the twenty-seven carried standing approvals and to nothing else',
   'The live approval register. The set is named by an OBJECT — the standing approvals carrying a '
   || 'carry-forward provenance row — and NOT by the arithmetic at Section 5.1, which subtracts ten '
   || 'from a "thirty-seven" that measures thirty-nine.',
   'Exactly 27 rows in t3a_d1_approval_basis, against SRC-D1-S1-001..009, SRC-D1-S2-001..009 and '
   || 'SRC-D1-S3-001..009; no row against SRC-D1-S1-010, SRC-D1-S2-010, SRC-D1-S3-010, any Stage 4 '
   || 'source, or any approval that is not standing-approved; the stored basis text hashing to the '
   || 'Section 12 attestation byte for byte.',
   'CX-16, CX-17', NULL,
   'Fixture stated as an object rather than a count because the instrument''s own derivation reaches '
   || 'the right number by the wrong route, and subtracting would have attached the attestation to '
   || 'two of the founder''s own re-approvals, which CX-17 expressly excludes.'),

  ('X17-BASIS-GATE', 'T3A-D1-EXEC-CORR-006 Section 11, evidence item X17',
   'An approval with no basis, or a basis outside the closed list, is refused by name',
   'A synthetic Stage 1 source created inside an aborted transaction, requested through '
   || 't3a_d1_record_source_approval as a person who actually holds administrative standing. NOT a '
   || 'Stage 4 source, so CX-24''s assessment gate is not what refuses; NOT a source already holding '
   || 'a row at this instant, because the AX-T4 guard added under Section 2 refuses two rows at one '
   || 'instant and the route stamps now(), which is constant in a transaction.',
   'Four named refusals from the route — APPROVAL_BASIS_REQUIRED, APPROVAL_BASIS_NOT_IN_CLOSED_LIST, '
   || 'APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER, APPROVAL_BASIS_TAKES_NO_IDENTIFIER — a well-formed '
   || 'approval accepted with its basis row written, a withdrawal accepted with no basis, and a '
   || 'direct write past the route refused with APPROVAL_RECORDS_NO_BASIS.',
   'CX-18', NULL,
   'Standing Rule 6: the refusal is requested from the route, and the backstop from the table '
   || 'directly. Neither is inferred from the screen hiding a control.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('X17-BASIS-ROWS', 'pass',
   '27 rows written by migration 20261073000000, which asserts the set identifier by identifier and '
   || 'refuses to commit otherwise. Verified live afterwards: basis_rows=27, kinds=3. The stored '
   || 'attestation hashes to 5acf14bdc0d870bd68f2fc792a0ab817c54c58adf877396e21740edea406c3f7, the '
   || 'sha256 of the 227 bytes after "**Attestation.** " in the instrument on disk. The three -010 '
   || 'sources still carry FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2 and the unaccounted Stage 3 '
   || 'audit finding is still one row, unaltered.',
   '20261073000000', 'Claude Code, automated, non-production environment',
   'The instrument''s derivation does not describe the table: provenance holds 39 rows, not 37. '
   || 'Recorded as CORR-006/CX-16/thirty-seven-is-thirty-nine. Membership is unaffected.'),

  ('X17-BASIS-GATE', 'pass',
   'scripts/proofs/approval-basis-proof.sql, self-aborting: withdrawalUngated=ACCEPTED '
   || 'noBasis=APPROVAL_BASIS_REQUIRED outsideList=APPROVAL_BASIS_NOT_IN_CLOSED_LIST '
   || 'missingIdentifier=APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER '
   || 'surplusIdentifier=APPROVAL_BASIS_TAKES_NO_IDENTIFIER wellFormed=ACCEPTED basisRowWritten=YES '
   || 'basisEditByCaller=NO_ROWS_VISIBLE_TO_WRITE basisAppendOnly=REFUSED_BY_NAME '
   || 'directInsertNoBasis=REFUSED_BY_NAME. Nothing committed; verified afterwards that the synthetic '
   || 'source is absent and the basis table still holds exactly the 27 CX-16 rows.',
   '20261073000000', 'Claude Code, automated, non-production environment',
   'TWO THINGS THE FIRST DRAFT GOT WRONG, both of the same shape — a test reading ACCEPTED because '
   || 'nothing happened. (1) The append-only check ran as an authenticated caller, where the table has '
   || 'a read policy and no write policy, so the UPDATE matched zero rows, the trigger never fired, '
   || 'and nothing raised. Under RLS that is indistinguishable from the edit succeeding; only a row '
   || 'count tells them apart. It is now two tests: the caller sees no row to write, and a writer that '
   || 'does see it is refused by name. (2) The deferred constraint trigger fires at commit, and a '
   || 'self-aborting proof never commits, so the illegal insert read as accepted. SET CONSTRAINTS ALL '
   || 'IMMEDIATE fires the pending event without committing. Without that line the gate looks absent.');
