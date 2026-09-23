-- =====================================================================
-- T3A-D1-EXEC-CORR-004 Section 3 — the carry-forward, with its condition
--
-- The ruling upheld the REC-07 carry-forward: REC-07 approved the source
-- version as written in the issued edition, not a database row. The row
-- was a defective transcription, and fixing the parse brought it INTO
-- conformity with what was approved rather than changing it away.
--
-- CS-I-44 makes that checkable rather than asserted. The diff must be
-- provably confined to PARSE RECOVERY: the corrected value, whitespace
-- normalized, must be a SUPERSET of the previous, every character of the
-- previous appearing in order. That is what a recovered soft-wrap looks
-- like. A value that CHANGED rather than EXTENDED is not a recovered
-- transcription, and CS-I-45 voids its carry-forward.
--
-- THE CONDITION FOUND THREE SOURCES, AND IT WAS RIGHT TO. Nine fields
-- across SRC-D1-S1-010, SRC-D1-S2-010 and SRC-D1-S3-010 changed rather
-- than extended — for example S1-010 attribution_support_set went from
-- "Stated per source. Where empty, any attribution to another person maps
-- to no item" to "AS1 Victor told the client the participant could handle
-- it. AS2 ...".
--
-- Those are not truncations that grew. They are the DEFINITIONAL-RUN
-- values being replaced by the source's real data — the second fault
-- CORR-003 fixed, where "fullest value wins" had preferred a prose
-- definition over the entry. That is a different class of correction from
-- a soft-wrap recovery, and CS-I-44 is precisely the instrument that
-- distinguishes them. So the carry-forward is void for those three: they
-- are withdrawn, unservable, and logged for re-approval.
--
-- TWO CONTROLS THIS RAN INTO, NEITHER ROUTED AROUND
--
-- 1. t3a_d1_source_approval takes INSERT ONLY —
--    SOURCE_APPROVAL_APPEND_ONLY refuses UPDATE and DELETE. So the forty
--    carried rows cannot be annotated in place, and CS-I-46's "shows on
--    its face that it was carried" is met by making the READ carry it:
--    t3a_d1_source_approval_standing shows the basis, the version carried
--    from and the assertion result beside every approval.
--
-- 2. Voiding under CS-I-45 cannot delete an approval either. It records a
--    WITHDRAWAL, which is the mechanism the trigger names. That means a
--    withdrawn version still has its old 'approved' row, so STANDING IS
--    THE LATEST STATUS PER VERSION, never the existence of an approved
--    row. t3a_d1_source_version_approved encodes that, and anything
--    asking "may this be served" must use it.
--
-- A NOTE ON THIS MIGRATION'S OWN TABLES. The first run of it scoped the
-- assertion to every superseded pair, and this content has TWO supersede
-- generations (v1 to v1-hashed, then v1-hashed to v2 under CORR-003). It
-- therefore wrote provenance against the ORIGINAL approvals as well,
-- marking approvals Tony gave directly as "carried" — the exact
-- misrepresentation CS-I-46 exists to prevent. The two tables below are
-- dropped and rebuilt so that cannot persist, and the pair is now scoped
-- to the CURRENT version and the one it superseded, which is the CORR-003
-- generation by definition.
-- =====================================================================

set search_path = public;

ALTER TABLE public.t3a_d1_source_approval
  DROP COLUMN IF EXISTS carry_forward_basis,
  DROP COLUMN IF EXISTS carried_from_version_id,
  DROP COLUMN IF EXISTS identity_assertion_passed;

DROP VIEW IF EXISTS public.t3a_d1_source_approval_standing;
DROP TABLE IF EXISTS public.t3a_d1_source_approval_provenance;
DROP TABLE IF EXISTS public.t3a_d1_content_identity_assertion;

-- ---------------------------------------------------------------------
-- 1. CS-I-44 — the assertion
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_is_subsequence(p_prev text, p_curr text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_prev text := btrim(regexp_replace(coalesce(p_prev, ''), '\s+', ' ', 'g'));
  v_curr text := btrim(regexp_replace(coalesce(p_curr, ''), '\s+', ' ', 'g'));
  i int := 1;
  j int := 1;
BEGIN
  WHILE i <= length(v_prev) LOOP
    WHILE j <= length(v_curr) AND substr(v_curr, j, 1) <> substr(v_prev, i, 1) LOOP
      j := j + 1;
    END LOOP;
    IF j > length(v_curr) THEN RETURN false; END IF;
    i := i + 1;
    j := j + 1;
  END LOOP;
  RETURN true;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_is_subsequence(text, text) IS
  'CS-I-44. True where every character of the previous value appears in the corrected value in the same order, whitespace normalized. Not a substring test: recovery inserts text at a wrap boundary, so the old characters stay in order without staying contiguous.';

CREATE TABLE public.t3a_d1_content_identity_assertion (
  source_identifier      text NOT NULL,
  superseded_version_id  uuid NOT NULL,
  current_version_id     uuid NOT NULL,
  field_name             text NOT NULL,
  previous_value         text,
  corrected_value        text,
  is_superset            boolean NOT NULL,
  asserted_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_identifier, superseded_version_id, field_name)
);

COMMENT ON TABLE public.t3a_d1_content_identity_assertion IS
  'CS-I-44 and CS-I-47. Per-source, per-field evidence that the CORR-003 correction extended a value rather than changed it. Both values are held so the assertion can be re-checked rather than trusted.';

-- ---------------------------------------------------------------------
-- 2. CS-I-46 — provenance, append-only, read with the approval
-- ---------------------------------------------------------------------

CREATE TABLE public.t3a_d1_source_approval_provenance (
  source_approval_id        uuid PRIMARY KEY
    REFERENCES public.t3a_d1_source_approval(source_approval_id) ON DELETE RESTRICT,
  carry_forward_basis       text NOT NULL,
  carried_from_version_id   uuid NOT NULL,
  identity_assertion_passed boolean NOT NULL,
  recorded_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_source_approval_provenance IS
  'CS-I-46. Present only for an approval that was CARRIED rather than freshly given. Append-only, like the approvals themselves.';

CREATE OR REPLACE FUNCTION public.t3a_d1_source_approval_provenance_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'APPROVAL_PROVENANCE_APPEND_ONLY: % refused', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_source_approval_provenance_append_only_trg
  ON public.t3a_d1_source_approval_provenance;
CREATE TRIGGER t3a_d1_source_approval_provenance_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_source_approval_provenance
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_source_approval_provenance_append_only();

-- ---------------------------------------------------------------------
-- 3. Standing is the LATEST status, not the presence of an approval
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW public.t3a_d1_source_approval_standing AS
  SELECT DISTINCT ON (a.source_version_id)
         a.source_approval_id,
         a.source_id,
         a.source_version_id,
         a.status,
         a.approved_by,
         a.approved_at,
         (p.source_approval_id IS NOT NULL) AS was_carried_forward,
         p.carry_forward_basis,
         p.carried_from_version_id,
         p.identity_assertion_passed
  FROM public.t3a_d1_source_approval a
  LEFT JOIN public.t3a_d1_source_approval_provenance p
    ON p.source_approval_id = a.source_approval_id
  ORDER BY a.source_version_id, a.approved_at DESC, a.source_approval_id DESC;

COMMENT ON VIEW public.t3a_d1_source_approval_standing IS
  'The STANDING approval for each source version: the latest status, never merely the existence of an approved row, because a withdrawal cannot delete the approval it withdraws. Carries was_carried_forward and, where true, the basis, the version carried from and the CS-I-44 result, so a carried approval never reads as a freshly given one.';

-- The one question serving asks. A withdrawn version is not servable even
-- though an 'approved' row for it still exists.
CREATE OR REPLACE FUNCTION public.t3a_d1_source_version_approved(p_version_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_d1_source_approval_standing s
    WHERE s.source_version_id = p_version_id AND s.status = 'approved');
$fn$;

COMMENT ON FUNCTION public.t3a_d1_source_version_approved(uuid) IS
  'Whether a source version holds a STANDING REC-07 approval. Use this rather than testing for an approved row: CS-I-45 voids a carry-forward by recording a withdrawal, which leaves the approval row in place.';

ALTER TABLE public.t3a_d1_content_identity_assertion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_source_approval_provenance ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['t3a_d1_content_identity_assertion',
                           't3a_d1_source_approval_provenance'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR INSERT
         WITH CHECK (public.t3a_is_service_context())', t, t);
  END LOOP;
END;
$rls$;

GRANT SELECT ON public.t3a_d1_content_identity_assertion TO authenticated;
GRANT SELECT ON public.t3a_d1_source_approval_provenance TO authenticated;
GRANT SELECT ON public.t3a_d1_source_approval_standing TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_source_version_approved(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Run it, scoped to the CORR-003 generation
-- ---------------------------------------------------------------------

DO $identity$
DECLARE
  r      record;
  v_pass int := 0;
  v_fail int := 0;
  v_void int := 0;
  v_bad  int;
  v_appr uuid;
BEGIN
  FOR r IN
    -- The current live row and the row it superseded. That pair IS the
    -- CORR-003 correction; earlier generations are not this correction's
    -- to assert about.
    SELECT old_cv.content_version_id AS old_id,
           new_cv.content_version_id AS new_id,
           new_cv.body ->> 'source_identifier' AS src,
           old_cv.body -> 'source_sheet' AS old_sheet,
           new_cv.body -> 'source_sheet' AS new_sheet
    FROM public.t3a_d1_content_version new_cv
    JOIN public.t3a_d1_content_version old_cv
      ON old_cv.superseded_by = new_cv.content_version_id
    WHERE new_cv.superseded_by IS NULL
      AND new_cv.body ? 'source_identifier'
  LOOP
    INSERT INTO public.t3a_d1_content_identity_assertion
      (source_identifier, superseded_version_id, current_version_id,
       field_name, previous_value, corrected_value, is_superset)
    SELECT r.src, r.old_id, r.new_id, k,
           r.old_sheet ->> k, r.new_sheet ->> k,
           public.t3a_d1_is_subsequence(r.old_sheet ->> k, r.new_sheet ->> k)
    FROM jsonb_object_keys(r.new_sheet) k
    ON CONFLICT (source_identifier, superseded_version_id, field_name) DO NOTHING;

    SELECT count(*) INTO v_bad
    FROM public.t3a_d1_content_identity_assertion
    WHERE source_identifier = r.src
      AND superseded_version_id = r.old_id
      AND NOT is_superset;

    SELECT s.source_approval_id INTO v_appr
    FROM public.t3a_d1_source_approval_standing s
    WHERE s.source_version_id = r.new_id AND s.status = 'approved';

    IF v_bad > 0 THEN
      v_fail := v_fail + 1;
      IF v_appr IS NOT NULL THEN
        INSERT INTO public.t3a_d1_source_approval
          (source_id, source_version_id, status, approved_by, approved_at)
        SELECT a.source_id, a.source_version_id, 'withdrawn', a.approved_by, now()
        FROM public.t3a_d1_source_approval a
        WHERE a.source_approval_id = v_appr;
        v_void := v_void + 1;
      END IF;
      RAISE NOTICE 'CS-I-45 carry-forward VOID for % — % field(s) changed rather than extended', r.src, v_bad;
    ELSE
      v_pass := v_pass + 1;
      IF v_appr IS NOT NULL THEN
        INSERT INTO public.t3a_d1_source_approval_provenance
          (source_approval_id, carry_forward_basis, carried_from_version_id,
           identity_assertion_passed)
        VALUES (v_appr, 'PARSE_RECOVERY_CORR_003', r.old_id, true)
        ON CONFLICT (source_approval_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  -- CS-I-47: reportable, not silent.
  RAISE NOTICE 'CS-I-44 content identity: % passed, % failed, % carry-forwards withdrawn',
    v_pass, v_fail, v_void;
END
$identity$;
