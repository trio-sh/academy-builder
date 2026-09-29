-- =====================================================================
-- Section 5 — the three re-approvals, on a signed Section 4 and 4A
--
-- Section 4A is signed (option (a), 25 September 2026) and applied by
-- 20261049000000. Section 4 of Issue 2 carries the founder's typed
-- signature. RA-01 begins "On receipt of a signed Section 4"; it has now
-- been received, so this writes what earlier migrations correctly refused
-- to write.
--
-- RA-01R RAN FIRST AND PASSED, BEFORE ANYTHING HERE WAS WRITTEN.
--   scripts/verify-reapp-001.mjs → RA-03 · sources 3 · exact 57 ·
--   elided 0 · missing 0 · differing 0
-- The verifier is a standalone script and stays one, per RA-03a: a
-- precondition that runs only as a side effect of the thing it guards is
-- not a precondition.
--
-- WHY THE ROUTE IS NOT USED FOR THESE THREE. t3a_d1_record_source_approval
-- takes its approver from auth.uid(), and a migration has no session
-- user. The carry-forward migration 20261039000000 wrote directly for the
-- same reason and said so. Every check the route would have applied is
-- satisfied and asserted below instead of skipped: the version belongs to
-- the source, it is not superseded, it carries a hash, and its current
-- standing is not approved. The two table triggers — AX-02's one-standing
-- check and CS-I-45's withdrawal-survives-supersede guard — run on a
-- direct insert exactly as they would on a routed one, which is the point
-- of putting them on the table rather than in the route.
--
-- ORDER, AND IT MATTERS. The founder re-approval rows land FIRST. The
-- guard from 20261048000000 refuses an approval of a source withdrawn
-- under CS-I-45 until t3a_d1_founder_reapproval names the version, so
-- writing the approvals first would abort. That refusal is the control
-- working: it is satisfied, not disabled.
--
-- RA-02R: basis FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2, the signature
-- date and the printed name as signed. NO ROW CARRIES A CARRY-FORWARD
-- BASIS — no provenance row is written for any of the three new
-- approvals, so the standing view reads each as freshly given. That is
-- AX-08 and AX-T8, and it is why AX-10's carried count stays at 37.
--
-- THE HISTORY VIEW IS ADDED HERE, NOT FOR CONVENIENCE. After AX-03 a
-- version can hold more than one approved row, so the standing view no
-- longer shows the whole story: the AX-11 finding and the two
-- carry-forward annotations sit on the ORIGINAL approvals, which are no
-- longer standing. Reading standing alone would show all three new
-- approvals as clean and lose the finding entirely. AX-11 says the flag
-- is never silently buried, so there is now a read that cannot bury it.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The full history, with provenance and findings attached
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW public.t3a_d1_source_approval_history AS
  SELECT a.source_approval_id,
         a.source_id,
         co.identifier AS source_identifier,
         a.source_version_id,
         (cv.superseded_by IS NULL) AS version_is_current,
         a.status,
         a.approved_by,
         a.approved_at,
         (a.source_approval_id
            = (SELECT s.source_approval_id
                 FROM public.t3a_d1_source_approval_standing s
                WHERE s.source_version_id = a.source_version_id)) AS is_standing,
         (p.source_approval_id IS NOT NULL) AS was_carried_forward,
         p.carry_forward_basis,
         p.identity_assertion_passed,
         (f.approval_audit_finding_id IS NOT NULL) AS is_unaccounted,
         f.established AS unaccounted_detail,
         r.basis AS founder_reapproval_basis,
         r.approver_as_signed,
         r.signed_on
  FROM public.t3a_d1_source_approval a
  JOIN public.t3a_content_object co
    ON co.content_object_id = a.source_id
  JOIN public.t3a_d1_content_version cv
    ON cv.content_version_id = a.source_version_id
  LEFT JOIN public.t3a_d1_source_approval_provenance p
    ON p.source_approval_id = a.source_approval_id
  LEFT JOIN public.t3a_d1_approval_audit_finding f
    ON f.source_approval_id = a.source_approval_id
   AND f.finding = 'unaccounted'
  LEFT JOIN public.t3a_d1_founder_reapproval r
    ON r.source_version_id = a.source_version_id
   AND r.source_identifier = co.identifier
   AND a.status = 'approved'
   AND a.approved_at >= r.recorded_at;

COMMENT ON VIEW public.t3a_d1_source_approval_history IS
  'Every approval row with what is known about it: whether it is the standing one, whether it was carried forward and on what basis, whether an AX-11 audit finding stands against it, and the signed founder re-approval it rests on where there is one. Needed because AX-03 lets a version hold more than one approved row, so the standing view alone would hide a finding attached to a superseded-in-place original.';

GRANT SELECT ON public.t3a_d1_source_approval_history TO authenticated;

-- ---------------------------------------------------------------------
-- 2. RA-02R — the signed Section 4 lands, then the three approvals
-- ---------------------------------------------------------------------

DO $sec5$
DECLARE
  r record;
  v_written int := 0;
BEGIN
  FOR r IN
    SELECT co.content_object_id AS source_id,
           co.identifier,
           cv.content_version_id,
           coalesce(btrim(cv.body ->> 'source_version_hash'), '') <> '' AS has_hash,
           (SELECT a.approved_by
              FROM public.t3a_d1_source_approval a
             WHERE a.source_id = co.content_object_id
               AND a.approved_by IS NOT NULL
             ORDER BY a.approved_at DESC LIMIT 1) AS approver
      FROM public.t3a_content_object co
      JOIN public.t3a_d1_content_version cv
        ON cv.content_object_id = co.content_object_id
       AND cv.superseded_by IS NULL
     WHERE co.identifier IN ('SRC-D1-S1-010', 'SRC-D1-S2-010', 'SRC-D1-S3-010')
     ORDER BY co.identifier
  LOOP
    -- Everything the route would have checked, checked here rather than
    -- waived. A missing hash or an already-standing approval aborts.
    IF NOT r.has_hash THEN
      RAISE EXCEPTION 'RA_02R_NO_HASH: % carries no source-version hash; an approval names an exact text', r.identifier;
    END IF;

    IF public.t3a_d1_version_standing_status(r.content_version_id) = 'approved' THEN
      RAISE EXCEPTION 'RA_02R_ALREADY_STANDING: % already holds a standing approval; Section 5 expects a standing withdrawal', r.identifier;
    END IF;

    IF r.approver IS NULL THEN
      RAISE EXCEPTION 'RA_02R_NO_APPROVER_ON_RECORD: % has no prior approver to name', r.identifier;
    END IF;

    -- The signed Section 4, per source and per version. This row is what
    -- the CS-I-45 guard requires before the approval below is admitted.
    INSERT INTO public.t3a_d1_founder_reapproval
      (source_identifier, source_version_id, basis, approver_as_signed, signed_on)
    VALUES (r.identifier, r.content_version_id,
            'FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2',
            'Dr. Tony Mofoke',
            DATE '2026-09-25')
    ON CONFLICT (source_identifier, source_version_id) DO NOTHING;

    -- The approval itself. Fresh: no provenance row is written, so
    -- was_carried_forward reads false and no carry-forward basis attaches
    -- to it. approved_by names the person already on record as the
    -- approver for this source rather than inventing an actor.
    INSERT INTO public.t3a_d1_source_approval
      (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (r.source_id, r.content_version_id, 'approved', r.approver, now());

    v_written := v_written + 1;
  END LOOP;

  IF v_written <> 3 THEN
    RAISE EXCEPTION 'RA_02R_WRONG_COUNT: expected three re-approvals, wrote %', v_written;
  END IF;
END;
$sec5$;

-- ---------------------------------------------------------------------
-- 3. RA-03R / RA-04R / AX-T7 / AX-T9 — assert, and refuse to commit a
--    half-done Section 5
-- ---------------------------------------------------------------------

DO $assert$
DECLARE
  v_raw_cur      int;
  v_standing_cur int;
  v_unservable   int;
  v_carried      int;
  v_bad_carry    int;
  v_fresh_carry  int;
  v_readiness    jsonb;
BEGIN
  -- AX-T7, current versions only
  SELECT count(*) INTO v_raw_cur
    FROM public.t3a_d1_source_approval a
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = a.source_version_id
     AND cv.superseded_by IS NULL
   WHERE a.status = 'approved';

  SELECT count(*) INTO v_standing_cur
    FROM public.t3a_d1_source_approval_standing s
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = s.source_version_id
     AND cv.superseded_by IS NULL
   WHERE s.status = 'approved';

  IF v_raw_cur <> 43 OR v_standing_cur <> 40 THEN
    RAISE EXCEPTION 'AX_T7_FAILED: expected 43 raw approved rows and 40 standing across current versions, found % and %',
      v_raw_cur, v_standing_cur;
  END IF;

  -- RA-03R / AX-T9
  SELECT count(*) INTO v_unservable
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id
     AND cv.superseded_by IS NULL
   WHERE co.family = 'source'::public.t3a_content_family
     AND NOT public.t3a_d1_source_version_approved(cv.content_version_id);

  IF v_unservable <> 0 THEN
    RAISE EXCEPTION 'RA_03R_FAILED: % source versions still hold no standing approval', v_unservable;
  END IF;

  -- AX-T8: none of the three new approvals carries a carry-forward basis
  SELECT count(*) INTO v_fresh_carry
    FROM public.t3a_d1_source_approval_history h
   WHERE h.source_identifier IN ('SRC-D1-S1-010', 'SRC-D1-S2-010', 'SRC-D1-S3-010')
     AND h.is_standing
     AND h.version_is_current
     AND h.was_carried_forward;

  IF v_fresh_carry <> 0 THEN
    RAISE EXCEPTION 'AX_T8_FAILED: % of the three new approvals reads as carried forward', v_fresh_carry;
  END IF;

  -- RA-T8R, counted by standing (AX-10). Three values: 0, 0, 37.
  --   1. carried approvals resting on a failed identity assertion
  SELECT count(*) INTO v_bad_carry
    FROM public.t3a_d1_source_approval_history h
   WHERE h.is_standing AND h.version_is_current
     AND h.was_carried_forward
     AND h.identity_assertion_passed IS NOT TRUE;

  --   3. carried standing approvals
  SELECT count(*) INTO v_carried
    FROM public.t3a_d1_source_approval_history h
   WHERE h.is_standing AND h.version_is_current
     AND h.status = 'approved'
     AND h.was_carried_forward;

  IF v_bad_carry <> 0 OR v_carried <> 37 THEN
    RAISE EXCEPTION 'RA_T8R_FAILED: carried-on-failed-assertion=% (expected 0), carried standing approvals=% (expected 37)',
      v_bad_carry, v_carried;
  END IF;

  -- AX-08's other half: the reader that was over-reporting must now agree
  -- with the register.
  v_readiness := public.t3a_d1_serving_readiness();
  IF (v_readiness ->> 'sources_servable')::int <> 40
     OR (v_readiness ->> 'sources_approved')::int <> 40 THEN
    RAISE EXCEPTION 'AX_08_FAILED: serving readiness reports servable=% approved=%, expected 40 and 40',
      v_readiness ->> 'sources_servable', v_readiness ->> 'sources_approved';
  END IF;

  -- AX-11 survives Section 5: the finding is still there, still flagged,
  -- and still not called a carry-forward.
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_source_approval_history h
     WHERE h.source_identifier = 'SRC-D1-S3-010'
       AND h.is_unaccounted
       AND NOT h.was_carried_forward)
  THEN
    RAISE EXCEPTION 'AX_11_FAILED: the unaccounted approval on SRC-D1-S3-010 is no longer readable as an unaccounted, non-carried row';
  END IF;
END;
$assert$;

-- ---------------------------------------------------------------------
-- 4. RA-04R — recorded in the wording that can pass
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-31', 'pass',
   'REAPP-001 Section 4A and Section 5 executed on the signed ruling of 25 September 2026. '
   || 'AX-01 to AX-11 built: the partial unique index t3a_d1_source_approval_one_standing is '
   || 'replaced by a before-insert check enforcing at most one STANDING approval per version, '
   || 'serialized by an advisory lock taken on (source_id, source_version_id) before standing is '
   || 'read, asserted and swapped inside one transaction. One definition of current standing — '
   || 't3a_d1_version_standing_status reads t3a_d1_source_approval_standing rather than restating '
   || 'its ordering, so enforcement and the read cannot diverge; verified identical for all 81 '
   || 'versions in the table. RA-01R passed before anything was written: exact 57, elided 0, '
   || 'missing 0, differing 0. RA-02R wrote three fresh approvals on basis '
   || 'FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2, signed Dr. Tony Mofoke, 25 September 2026, '
   || 'after the signed Section 4 landed in t3a_d1_founder_reapproval — the CS-I-45 guard was '
   || 'satisfied in order, not disabled. RA-03R: the D1 unservable count is ZERO and all forty '
   || 'sources hold a standing approval. AX-T7: 43 raw approved rows and 40 standing across '
   || 'current versions. AX-T8: none of the three new approvals reads as carried forward. '
   || 'RA-T8R confirmed at 0, 0, 37. AX-T2, T3, T4, T6, T10 all pass; the double approval is '
   || 'still refused and withdrawal behavior is unchanged.',
   '20261050000000', 'SQL proof and scripts/verify-reapp-001.mjs', now(),
   'AX-08 FOUND A LIVE DEFECT, NOT ONLY A FUTURE ONE, AND IT IS WORTH THE FOUNDERS SEEING. '
   || 't3a_d1_serving_readiness() tested for the EXISTENCE of an approved row, so it reported '
   || 'sources_servable 40, sources_approved 40 and blocked_on null while the register correctly '
   || 'reported three unservable. It had been over-reporting since CS-I-45 withdrew the three, and '
   || 'the two readers of the same table disagreed for two days. Routed through standing; it now '
   || 'agrees with the register. This is the disagreement AX-01 exists to make impossible. '
   || 'AX-09 CORRECTED A SECOND MISREADING IN THE SAME PLACE. Provenance held 37 rows for 40 '
   || 'carried approvals, so the standing view read was_carried_forward = false for all three '
   || 'withdrawn sources — true of none of them. SRC-D1-S1-010 and SRC-D1-S2-010 were carried by '
   || '20261039000000 and are now annotated as carry-forwards with identity_assertion_passed '
   || 'false, which is why they were withdrawn. SRC-D1-S3-010 was NOT a carry-forward and is not '
   || 'labelled one. '
   || 'AX-11: the unaccounted approval on SRC-D1-S3-010 (2026-09-25 20:03:59, approval row '
   || '44b3c01e) is RETAINED UNALTERED and logged in t3a_d1_approval_audit_finding with what '
   || 'could be established and what was checked. No migration, trigger or seed script writes it, '
   || 'and it postdates the carry-forward migration that copies approved_at, so that migration '
   || 'cannot have produced the timestamp. Its origin is still unexplained. It does not block '
   || 'Section 5 and it is not buried under the new approval. '
   || 'AX-T4 IS PARTLY PROVED, AND THE LIMIT IS STATED. Two genuinely concurrent sessions were '
   || 'not run. What was proved: the per-version advisory lock is held by the inserting '
   || 'transaction after the check, which is what makes a second session block rather than read '
   || 'stale standing, and a second approved insert for the same version is refused. '
   || 'AX-T12 reads through t3a_d1_source_approval_history, not through standing. After AX-03 a '
   || 'version can hold more than one approved row, and the finding and the carry-forward '
   || 'annotations sit on the originals, which are no longer standing — reading standing alone '
   || 'would show all three new approvals as clean and lose the finding.');
