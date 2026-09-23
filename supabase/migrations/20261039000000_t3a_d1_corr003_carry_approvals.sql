-- =====================================================================
-- The forty REC-07 approvals, carried to the corrected transcriptions
--
-- 20261037000000 superseded each source version to fix a parse defect in
-- the load. t3a_d1_source_approval keys on source_version_id, so all
-- forty approvals were left pointing at superseded rows and NOTHING WAS
-- SERVABLE. The seed's own guard caught it:
--
--   NO_APPROVED_SOURCE: SRC-D1-S2-001 holds no standing REC-07 approval,
--   so there is nothing the cockpit may serve
--
-- That refusal is the control working. It is not routed around here; the
-- approval is carried, deliberately and on the record.
--
-- THIS WAS NOT DECIDED BY THE BUILD. Writing an approval row for a
-- version no human inspected touches authority, which a coding session
-- records rather than decides. It was put to the founders with the
-- alternatives — leave v2 unapproved until the forty are re-approved, or
-- roll back and keep serving the truncated families — and the ruling was
-- to carry them forward.
--
-- WHAT IS AND IS NOT CLAIMED. The REC-07 approval was granted against the
-- issued source text, which T3A-D1-EXEC-CORR-003 Section 1 confirms is
-- intact and unchanged. The v1 rows were a defective machine
-- transcription of that text; the v2 rows are a more faithful
-- transcription of the same text. No source's words changed, no sheet
-- field gained a value the issued file does not state, and the verbatim
-- body is carried through untouched — only source_sheet was replaced.
--
-- So this asserts that an approval of a text survives a correction to how
-- that text was PARSED. It does not assert that anyone approved new
-- content, and it grants nothing that was not already granted.
--
-- The original approver and approval timestamp are preserved exactly. A
-- new row is not signed by this session: approved_by and approved_at are
-- copied from the superseded row, so the register continues to name the
-- person who actually approved and the moment they did.
--
-- The old rows are left in place, still pointing at the superseded
-- versions. Nothing is deleted, and the history shows both what was
-- approved and what replaced it.
-- =====================================================================

set search_path = public;

DO $carry$
DECLARE
  v_n int := 0;
BEGIN
  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  SELECT a.source_id, new_cv.content_version_id, a.status, a.approved_by, a.approved_at
  FROM public.t3a_d1_source_approval a
  JOIN public.t3a_d1_content_version old_cv
    ON old_cv.content_version_id = a.source_version_id
  JOIN public.t3a_d1_content_version new_cv
    ON new_cv.content_version_id = old_cv.superseded_by
  WHERE old_cv.superseded_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.t3a_d1_source_approval a2
      WHERE a2.source_version_id = new_cv.content_version_id);

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'REC-07 approvals carried to corrected transcriptions: %', v_n;
END
$carry$;
