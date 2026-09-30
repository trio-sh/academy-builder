-- =====================================================================
-- Repair: migration 20261069000000 closed the wrong register entry
--
-- WHAT I DID WRONG. Section 3 closed the "C8 final" finding with
--
--   UPDATE ... WHERE note ILIKE '%C8 final%' AND status <> 'closed'
--
-- That matched exactly one row, and it was the wrong one:
-- CORR-006/CX-01/superseded-labels, which quotes the string "C8 final"
-- because the whole point of that entry is that C8 is a SUPERSEDED label
-- and the original fault was the spoken text "C8 final". So the migration
-- closed an entry that is open for the founder to rule on, set its
-- classification to "stale finding — the behavior was already built",
-- which is false of it, and appended a closure note that belongs to a
-- different finding.
--
-- Matching prose to find a record is what AS-41 warns against: name an
-- editable object. I wrote a WHERE clause against note text in the same
-- file whose comments quote that rule.
--
-- AND THE FINDING I MEANT TO CLOSE WAS NEVER A ROW. Nothing in the
-- register says "C8 final is stored with no defined behavior" — that
-- sentence lived in the close-out REPORT, which is prose. So the UPDATE
-- could never have found its target, and a WHERE clause that matched
-- nothing would have been the honest outcome. This is SOP-002 Stage 5.4
-- exactly: anything an instrument will later amend must be a row.
--
-- WHAT THIS MIGRATION DOES.
--   1. Restores CORR-006/CX-01/superseded-labels to what 20261067000000
--      wrote, by re-asserting that exact row. Its note is overwritten, so
--      the appended closure text is gone rather than crossed out.
--   2. Creates the C8-final finding AS A ROW and closes it as stale, so
--      CX-06's "close the finding and record that it was stale; do not
--      delete it" has something to refer to.
--   3. Asserts afterwards that no entry still carries the appended text
--      and that the CX-01 entry is open again — because a repair that is
--      not checked is a second guess.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Restore the entry that should never have been touched
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-01/superseded-labels', 'CORR-006 Section 1',
   'Which capture-set labels may never appear in mentor speech',
   'most restrictive behavior taken; founder to confirm or narrow',
   'open',
   'Founder: confirm that C4, C5 and C8 stay refused in spoken text, or narrow the rule to the '
   || 'register alone and accept that "C8 final" would then load.',
   'CX-01 refuses "a capture-set label that exists in the dimension''s capture register". READ '
   || 'LITERALLY THAT RE-OPENS THE HOLE CL-50 CLOSED. The fault CL-50 was written for was the '
   || 'literal spoken text "C8 final", and C8 IS NOT IN THE REGISTER: the register holds thirteen '
   || 'labels (C1, C2, C3, C4a, C4b, C5a, C5b1, C5b2, C5c, C6, C7, C8a, C8b) because C4, C5 and C8 '
   || 'were split when it was revised. A register-only check accepts "C8 final". '
   || 'THE BUILD TOOK THE MOST RESTRICTIVE READING, as the DEVELOPER JUDGMENT BOUNDARY directs, and '
   || 'refuses the register PLUS those three superseded labels — held in '
   || 't3a_d1_superseded_capture_label, taken from the translation table the Stage 2 parse already '
   || 'uses rather than invented. Nothing currently loaded is affected either way: zero of 210 beats '
   || 'carry any of the sixteen labels in speech. '
   || 'ALSO WORTH THE FOUNDER''S EYE: CX-01 is a tightening as well as a loosening. The issued check '
   || 'matched the SHAPE C[0-9]+[a-z0-9]*, so it refused anything that merely looked like a label. '
   || 'Asking the register is the narrower and more accurate claim, and it is what CX-01 says. '
   || 'NOTE ON THIS ROW''S HISTORY: migration 20261069000000 closed this entry by mistake, matching '
   || '"C8 final" in this note while looking for a different finding. Restored by 20261070000000.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by      = EXCLUDED.opened_by,
  scope          = EXCLUDED.scope,
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;

-- ---------------------------------------------------------------------
-- 2. The C8-final finding, as a row, then closed as stale
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CLOSE-001/c8-final-no-defined-behavior', 'T3A-D1-EXEC-CLOSE-001 close-out report',
   'Whether the "final" capture qualifier has defined behavior',
   'stale finding — the behavior was already built',
   'closed',
   NULL,
   'THE FINDING, as the close-out report stated it: "C8 final is stored with no defined behavior." '
   || 'The founder noticed the report also described CLOSE-001 Section 1 as built and said one of '
   || 'those statements must be wrong. It was the finding. '
   || 'CREATED HERE AS A ROW because it never was one — it lived only in the report, which is prose, '
   || 'so CX-06''s instruction to close it and record that it was stale had nothing to act on. '
   || 'SOP-002 Stage 5.4: anything an instrument will later amend must be a row. '
   || 'CLOSED AS STALE under CORR-006 CX-06. CLOSE-001 Section 1 (migration 20261054000000) built '
   || 'all three rules and this finding outlived them. Proved by scripts/proofs/'
   || 'c8-final-close-proof.sql: CL-T3 — C8a closes at B7, C1 closes at commit; CL-T4 — the '
   || 'whole-session line is offered false at B3 and true at the closing beat, closes_at B7; CL-T5a '
   || '— advance past the closing beat refused with DETERMINATION_UNANSWERED_AT_CLOSING_BEAT. '
   || 'NOT DELETED, per CX-06.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;

-- ---------------------------------------------------------------------
-- 3. Check the repair, rather than assume it
-- ---------------------------------------------------------------------

DO $verify$
DECLARE
  v_stray  int;
  v_cx01   text;
  v_c8     text;
BEGIN
  -- No entry other than the real finding may carry the closure text.
  SELECT count(*) INTO v_stray
    FROM public.t3a_d1_build_conflict_register
   WHERE note ILIKE '%CLOSED AS STALE under CORR-006 CX-06%'
     AND entry_id <> 'CLOSE-001/c8-final-no-defined-behavior';

  SELECT status INTO v_cx01 FROM public.t3a_d1_build_conflict_register
   WHERE entry_id = 'CORR-006/CX-01/superseded-labels';
  SELECT status INTO v_c8 FROM public.t3a_d1_build_conflict_register
   WHERE entry_id = 'CLOSE-001/c8-final-no-defined-behavior';

  IF v_stray <> 0 THEN
    RAISE EXCEPTION 'REPAIR_INCOMPLETE: % entries still carry the CX-06 closure text that do not own it.', v_stray;
  END IF;
  IF v_cx01 IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'REPAIR_INCOMPLETE: CORR-006/CX-01/superseded-labels reads % and must read open — it is the founder''s to rule on.', v_cx01;
  END IF;
  IF v_c8 IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION 'REPAIR_INCOMPLETE: the C8-final finding reads % and must read closed.', v_c8;
  END IF;

  RAISE NOTICE 'repair verified: CX-01 entry open again, C8-final finding exists as a row and is closed as stale, no stray closure text.';
END;
$verify$;
