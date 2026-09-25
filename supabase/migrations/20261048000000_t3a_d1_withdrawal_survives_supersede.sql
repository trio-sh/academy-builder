-- =====================================================================
-- A withdrawn source became servable again by being superseded
--
-- SRC-D1-S3-010 was withdrawn under CS-I-45 on 23 September, correctly.
-- RA-06 then superseded it on 25 September to repair the split field
-- name. Afterwards:
--
--   t3a_d1_source_version_approved(v3) = true
--
-- A source that must not be servable until a founder re-approves it was
-- servable. The withdrawal applied to v2, and v3 is a different row, so
-- nothing carried the refusal forward.
--
-- HOW THE APPROVAL ROW GOT THERE IS NOT ESTABLISHED, and that is recorded
-- rather than glossed. An 'approved' row for v3 exists with approved_at
-- 2026-09-25 20:03:59 and the same actor as every other approval. It
-- bears the marks of the governed route t3a_d1_record_source_approval,
-- which stamps now() — not of the CORR-003 carry-forward migration, which
-- copies the original timestamp. 20261046000000 does not write approvals,
-- no trigger on t3a_d1_content_version or t3a_content_object writes them,
-- and the seed does not. So an approval exists that this build cannot
-- account for. It is treated as unauthorised, not as a puzzle to leave
-- pending.
--
-- WHAT IS DONE
--
-- 1. The v3 approval is WITHDRAWN. It cannot be deleted — the approval
--    table is append-only, correctly — so a withdrawal is recorded, which
--    is the sanctioned mechanism and leaves the history legible.
--
-- 2. A WITHDRAWAL NOW SURVIVES SUPERSEDING. The structural fault is that
--    CS-I-45's refusal attached to a version rather than to the source,
--    so any new version escaped it. The trigger below refuses an
--    'approved' row for a version whose immediate predecessor holds a
--    standing withdrawal, unless a founder re-approval has been recorded
--    for that source in t3a_d1_founder_reapproval.
--
--    That table ships EMPTY and is where a signed REAPP Section 4 lands.
--    Until one exists, no route — governed or otherwise — can make these
--    three servable, which is what CS-I-45 meant.
--
-- WHY A TRIGGER RATHER THAN A FIX TO THE ROUTE. The route already refuses
-- a superseded version and an unhashed one. It did not refuse this,
-- and something reached the table anyway. A guard on the table holds
-- whatever the caller is.
-- =====================================================================

set search_path = public;

CREATE TABLE IF NOT EXISTS public.t3a_d1_founder_reapproval (
  source_identifier   text NOT NULL,
  source_version_id   uuid NOT NULL
    REFERENCES public.t3a_d1_content_version(content_version_id) ON DELETE RESTRICT,
  basis               text NOT NULL CHECK (length(btrim(basis)) > 0),
  approver_as_signed  text NOT NULL CHECK (length(btrim(approver_as_signed)) > 0),
  signed_on           date NOT NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_identifier, source_version_id)
);

COMMENT ON TABLE public.t3a_d1_founder_reapproval IS
  'Where a signed REAPP Section 4 lands. A source withdrawn under CS-I-45 cannot be approved again — by any route, on any version — until a row here names the version, the basis, the approver as signed and the date. Ships empty.';

ALTER TABLE public.t3a_d1_founder_reapproval ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_founder_reapproval_read ON public.t3a_d1_founder_reapproval;
CREATE POLICY t3a_d1_founder_reapproval_read
  ON public.t3a_d1_founder_reapproval FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_d1_founder_reapproval_write ON public.t3a_d1_founder_reapproval;
CREATE POLICY t3a_d1_founder_reapproval_write
  ON public.t3a_d1_founder_reapproval FOR INSERT
  WITH CHECK (public.t3a_is_service_context());

GRANT SELECT ON public.t3a_d1_founder_reapproval TO authenticated;

-- ---------------------------------------------------------------------
-- The guard
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_withdrawal_survives_supersede()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_src       text;
  v_prev      uuid;
  v_withdrawn boolean;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;

  SELECT cv.body ->> 'source_identifier' INTO v_src
  FROM public.t3a_d1_content_version cv
  WHERE cv.content_version_id = NEW.source_version_id;

  -- Walk back one generation. A withdrawal on the row this version
  -- replaced is a refusal about the SOURCE, not about that row.
  SELECT o.content_version_id INTO v_prev
  FROM public.t3a_d1_content_version o
  WHERE o.superseded_by = NEW.source_version_id;

  IF v_prev IS NULL THEN RETURN NEW; END IF;

  SELECT s.status = 'withdrawn' INTO v_withdrawn
  FROM public.t3a_d1_source_approval_standing s
  WHERE s.source_version_id = v_prev;

  IF coalesce(v_withdrawn, false)
     AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_founder_reapproval r
                      WHERE r.source_version_id = NEW.source_version_id)
  THEN
    RAISE EXCEPTION
      'WITHDRAWAL_SURVIVES_SUPERSEDE: % was withdrawn under CS-I-45; a new version does not clear that. Record a signed founder re-approval in t3a_d1_founder_reapproval first.',
      coalesce(v_src, NEW.source_version_id::text)
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_withdrawal_survives_supersede_trg
  ON public.t3a_d1_source_approval;
CREATE TRIGGER t3a_d1_withdrawal_survives_supersede_trg
  BEFORE INSERT ON public.t3a_d1_source_approval
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_withdrawal_survives_supersede();

-- ---------------------------------------------------------------------
-- Withdraw the approval that should not exist
-- ---------------------------------------------------------------------

DO $fix$
DECLARE
  r record;
  v_n int := 0;
BEGIN
  FOR r IN
    SELECT s.source_approval_id, s.source_id, s.source_version_id, s.approved_by,
           cv.body ->> 'source_identifier' AS src
    FROM public.t3a_d1_source_approval_standing s
    JOIN public.t3a_d1_content_version cv ON cv.content_version_id = s.source_version_id
    JOIN public.t3a_d1_content_version o ON o.superseded_by = s.source_version_id
    WHERE s.status = 'approved'
      AND (SELECT s2.status FROM public.t3a_d1_source_approval_standing s2
            WHERE s2.source_version_id = o.content_version_id) = 'withdrawn'
      AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_founder_reapproval fr
                       WHERE fr.source_version_id = s.source_version_id)
  LOOP
    INSERT INTO public.t3a_d1_source_approval
      (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (r.source_id, r.source_version_id, 'withdrawn', r.approved_by, now());
    v_n := v_n + 1;
    RAISE NOTICE 'Withdrew an unaccounted approval on % (version %)', r.src, r.source_version_id;
  END LOOP;
  RAISE NOTICE 'unaccounted approvals withdrawn: %', v_n;
END
$fix$;

-- =====================================================================
-- A SECOND FAULT THE PROOF OF THE GUARD EXPOSED, recorded not fixed
--
-- Proving the guard also proved that a signed re-approval CANNOT BE
-- RECORDED for SRC-D1-S3-010 as things stand:
--
--   direct_insert    refused, WITHDRAWAL_SURVIVES_SUPERSEDE   (correct)
--   with_reapproval  refused, duplicate key value violates
--                    "t3a_d1_source_approval_one_standing"    (WRONG)
--
-- t3a_d1_source_approval_one_standing is UNIQUE (source_id,
-- source_version_id) WHERE status = 'approved'. It enforces "one approved
-- row ever per version", not "one STANDING approval per version" — a
-- withdrawal does not free the slot, because the withdrawn row keeps its
-- own 'approved' predecessor in place.
--
-- 20261015000000's own comment states the intent was the latter, and that
-- a plain unique key "cannot" express withdrawal-then-reapproval. The
-- partial index does not express it either.
--
-- CONSEQUENCE. Every version that has ever held an approval can never
-- hold another. For SRC-D1-S1-010 and SRC-D1-S2-010 that is already true
-- of their live v2, and for SRC-D1-S3-010 of its v3. So when the signed
-- REAPP-001 Issue 2 arrives, RA-01 — "write a new approval row for each of
-- the three source versions" — FAILS ON ALL THREE.
--
-- THIS IS NOT FIXED HERE. Widening the index so a withdrawal frees the
-- slot changes what "one standing approval" means in the approval
-- register, which is a governance question rather than a build one, and
-- the alternatives differ in what the history then shows:
--
--   (a) make the index count only the LATEST status per version, so a
--       withdrawal genuinely frees the slot and re-approval lands on the
--       same version;
--   (b) require a re-approval to name a NEW version, so each approval
--       decision is about a row nobody has approved before.
--
-- (b) is closer to how the rest of this register behaves — content is
-- superseded rather than edited — but it means a re-approval creates a
-- version whose body is identical to its predecessor, which every other
-- supersede in this system avoids. Recorded for the founders.
-- =====================================================================
