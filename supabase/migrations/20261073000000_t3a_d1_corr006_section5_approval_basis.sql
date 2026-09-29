-- =====================================================================
-- CORR-006 Section 5 — the approval basis (CX-16, CX-17, CX-18)
--
-- THE FINDING Section 5.1 states. Forty approvals were recorded in one
-- minute and twenty-seven seconds and the record could not show what they
-- rested on. The founder attests at Section 12 that he reviewed the D1
-- production sources during the authoring of T3A-D1-EXEC-001, before it
-- was issued. CX-16 records that attestation as a basis against each of
-- the twenty-seven carried standing approvals, in a separate table keyed
-- to each approval, NEVER by altering an approval row. CX-18 then makes a
-- basis required on every future approval, from a closed list of three.
--
-- ---------------------------------------------------------------------
-- WHICH TWENTY-SEVEN, AND WHY THE INSTRUMENT'S ARITHMETIC IS NOT THE TEST
--
-- Section 5.1 derives the number as "the thirty-seven carried forward
-- under T3A-D1-EXEC-CORR-004, less the ten Stage 4 approvals withdrawn
-- under CL-16". Measured before writing a single row:
--
--     t3a_d1_source_approval_provenance rows            39   (not 37)
--     of those, the STANDING approval for their version 27
--     of those, no longer standing                      12
--
-- So 37 − 10 does not describe this table; 39 − 12 does, and it lands on
-- the same 27. The twelve are the ten Stage 4 carry-forwards, whose
-- versions now stand withdrawn under CL-16, PLUS SRC-D1-S1-010 and
-- SRC-D1-S2-010, which were carried under a different basis
-- (CORR_003_SHEET_RELOAD_CARRY_FORWARD rather than
-- PARSE_RECOVERY_CORR_003) and whose carry-forward approvals were
-- superseded by the founder's own re-approvals of 25 September 2026.
--
-- THE SET IS THEREFORE DEFINED BY AN OBJECT, NOT BY SUBTRACTION: the
-- standing approvals that carry a provenance row. That set is exactly
-- SRC-D1-S1-001..009, SRC-D1-S2-001..009 and SRC-D1-S3-001..009, which is
-- also exactly the set CX-17 leaves after excluding the three -010 rows
-- and the ten Stage 4 rows. Both readings agree on the membership, so the
-- discrepancy is in the stated derivation only and is recorded in the
-- register rather than resolved here.
--
-- ---------------------------------------------------------------------
-- WHAT IS NOT TOUCHED, per CX-17
--
--   — SRC-D1-S1-010, SRC-D1-S2-010, SRC-D1-S3-010 carry their own basis
--     already, in t3a_d1_founder_reapproval, as
--     FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2 signed 25 September
--     2026. No CX-16 row attaches to them, and this migration asserts
--     those three rows are still there and still say that.
--   — The ten Stage 4 approvals are withdrawn. No basis attaches to a
--     withdrawn approval.
--   — The unaccounted Stage 3 row — the SRC-D1-S3-010 approval of
--     2026-09-25 20:03:59, which AX-11 raised as 'unaccounted' — stays an
--     audit finding, unaltered. It is not the standing approval for its
--     version and nothing here writes to it or to its finding.
--   — No approval row is altered by anything in this file. The approval
--     table is append-only and this migration does not insert into it
--     either.
--
-- ---------------------------------------------------------------------
-- THE ATTESTATION IS NOT TRANSCRIBED
--
-- SOP-002 Stage 0.2: never transcribe; transcription drift is the kind no
-- test catches. The basis text below was extracted from
-- docs/d1-execution/T3A-D1-EXEC-CORR-006-Post-Close-Out.md rather than
-- retyped, and this migration asserts that what it stored hashes to
--
--     sha256 5acf14bdc0d870bd68f2fc792a0ab817c54c58adf877396e21740edea406c3f7
--
-- which is the sha256 of the 227 bytes following "**Attestation.** " in
-- that file. If a later edit to this file changes so much as a semicolon,
-- the migration refuses to commit rather than storing a paraphrase of a
-- signed attestation.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CX-18's closed list, as rows
--
-- SOP-002 Stage 5.4: anything an instrument may later amend must be a
-- row. An enum would put the list in a type definition, where amending it
-- is a migration and where the "requires an identifier" fact — which
-- Section 5.2's table states for two of the three — has nowhere to live.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_approval_basis_kind (
  basis_kind                      text PRIMARY KEY,
  records                         text NOT NULL,
  requires_referenced_identifier  boolean NOT NULL,
  closed_list_under               text NOT NULL
);

COMMENT ON TABLE public.t3a_d1_approval_basis_kind IS
  'CX-18. The CLOSED list of bases an approval may rest on. Three rows, taken from the table at CORR-006 Section 5.2. Held as rows rather than as an enum so that the list can be amended by an instrument and so that "requires the document''s identifier" is a stored fact the route reads rather than a rule written twice. No insert or update policy exists: the list is widened by a migration under an instrument, not by a caller.';

INSERT INTO public.t3a_d1_approval_basis_kind
  (basis_kind, records, requires_referenced_identifier, closed_list_under)
VALUES
  ('READ_IN_FULL_IN_THIS_SCREEN',
   'That the text was read at the point of approval',
   false, 'T3A-D1-EXEC-CORR-006 Section 5.2, CX-18'),
  ('REVIEWED_DURING_AUTHORING_OF_ISSUED_DOCUMENT',
   'The document''s identifier',
   true,  'T3A-D1-EXEC-CORR-006 Section 5.2, CX-18'),
  ('COMPARED_AGAINST_SPECIFIED_VALUES_UNDER_INSTRUMENT',
   'The instrument''s identifier',
   true,  'T3A-D1-EXEC-CORR-006 Section 5.2, CX-18')
ON CONFLICT (basis_kind) DO UPDATE SET
  records                        = EXCLUDED.records,
  requires_referenced_identifier = EXCLUDED.requires_referenced_identifier,
  closed_list_under              = EXCLUDED.closed_list_under;

ALTER TABLE public.t3a_d1_approval_basis_kind ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_approval_basis_kind_read ON public.t3a_d1_approval_basis_kind;
CREATE POLICY t3a_d1_approval_basis_kind_read
  ON public.t3a_d1_approval_basis_kind FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 2. CX-16's basis table
--
-- Keyed to the approval, one basis per approval, and a separate table so
-- that recording a basis never writes to t3a_d1_source_approval. The
-- primary key IS source_approval_id: Section 5.2 says the approver
-- "selects one of", singular, so two bases against one approval would be
-- a second answer to a question that has one.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_approval_basis (
  source_approval_id    uuid PRIMARY KEY
                          REFERENCES public.t3a_d1_source_approval(source_approval_id),
  basis_kind            text NOT NULL
                          REFERENCES public.t3a_d1_approval_basis_kind(basis_kind),
  referenced_identifier text,
  basis_text            text,
  basis_entered_on      date NOT NULL,
  recorded_under        text NOT NULL,
  recorded_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_approval_basis IS
  'CX-16. What an approval rested on, keyed to the approval and NEVER written into the approval row. Append-only. basis_text carries the words of an attestation where there are any — the twenty-seven CX-16 rows carry the Section 12 attestation verbatim; a basis of "read in full in this screen" has no separate text and leaves it null. basis_entered_on is the date entered with the basis, which for the CX-16 rows is the date at Section 12 and not the date this ran.';

COMMENT ON COLUMN public.t3a_d1_approval_basis.referenced_identifier IS
  'The document or instrument the basis names. Required exactly where t3a_d1_approval_basis_kind.requires_referenced_identifier says so, and refused where it does not — checked by t3a_d1_approval_basis_wellformed() against the kind row rather than restated as a CHECK, so the list and the rule cannot disagree.';

ALTER TABLE public.t3a_d1_approval_basis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_approval_basis_read ON public.t3a_d1_approval_basis;
CREATE POLICY t3a_d1_approval_basis_read
  ON public.t3a_d1_approval_basis FOR SELECT TO authenticated USING (true);

-- Append-only, for the same reason the approval table is: a basis that
-- can be edited after the fact is not evidence of what the approver saw.
CREATE OR REPLACE FUNCTION public.t3a_d1_approval_basis_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'APPROVAL_BASIS_APPEND_ONLY: % refused; a basis records what an approver rested on at one moment, so it is never edited or removed. Withdraw the approval and record a new one with its own basis.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_approval_basis_append_only_trg ON public.t3a_d1_approval_basis;
CREATE TRIGGER t3a_d1_approval_basis_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_approval_basis
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_approval_basis_append_only();

-- The identifier rule, read from the kind row.
CREATE OR REPLACE FUNCTION public.t3a_d1_approval_basis_wellformed()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_requires boolean;
  v_has      boolean := coalesce(btrim(NEW.referenced_identifier), '') <> '';
BEGIN
  SELECT k.requires_referenced_identifier INTO v_requires
    FROM public.t3a_d1_approval_basis_kind k
   WHERE k.basis_kind = NEW.basis_kind;

  IF v_requires IS NULL THEN
    RAISE EXCEPTION 'APPROVAL_BASIS_NOT_IN_CLOSED_LIST: % is not one of the bases at CORR-006 Section 5.2.', NEW.basis_kind
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_requires AND NOT v_has THEN
    RAISE EXCEPTION 'APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER: the basis % records a named document or instrument, so it must name one.', NEW.basis_kind
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT v_requires AND v_has THEN
    RAISE EXCEPTION 'APPROVAL_BASIS_TAKES_NO_IDENTIFIER: the basis % records that the text was read in the screen; it names no document, and storing one would suggest a review that did not happen.', NEW.basis_kind
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_approval_basis_wellformed_trg ON public.t3a_d1_approval_basis;
CREATE TRIGGER t3a_d1_approval_basis_wellformed_trg
  BEFORE INSERT ON public.t3a_d1_approval_basis
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_approval_basis_wellformed();

-- ---------------------------------------------------------------------
-- 3. CX-16 — the twenty-seven rows
--
-- The set is named by the object that defines it: a standing approval
-- that carries a carry-forward provenance row. Not a list of identifiers
-- typed out here, and not "37 − 10".
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_approval_basis
  (source_approval_id, basis_kind, referenced_identifier, basis_text,
   basis_entered_on, recorded_under)
SELECT s.source_approval_id,
       'REVIEWED_DURING_AUTHORING_OF_ISSUED_DOCUMENT',
       'T3A-D1-EXEC-001',
       'I reviewed the D1 production sources during the authoring of T3A-D1-EXEC-001, before it was issued. The approvals I recorded in the approval screen recorded that prior review; they were not made on first reading in that screen.',
       DATE '2026-09-29',
       'T3A-D1-EXEC-CORR-006 Section 12 attestation, recorded under CX-16'
  FROM public.t3a_d1_source_approval_standing s
 WHERE s.was_carried_forward
   AND s.status = 'approved'
ON CONFLICT (source_approval_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Assert what was written, and what was left alone
-- ---------------------------------------------------------------------

DO $verify$
DECLARE
  v_n        int;
  v_expect   text := 'SRC-D1-S1-001, SRC-D1-S1-002, SRC-D1-S1-003, SRC-D1-S1-004, SRC-D1-S1-005, '
                  || 'SRC-D1-S1-006, SRC-D1-S1-007, SRC-D1-S1-008, SRC-D1-S1-009, '
                  || 'SRC-D1-S2-001, SRC-D1-S2-002, SRC-D1-S2-003, SRC-D1-S2-004, SRC-D1-S2-005, '
                  || 'SRC-D1-S2-006, SRC-D1-S2-007, SRC-D1-S2-008, SRC-D1-S2-009, '
                  || 'SRC-D1-S3-001, SRC-D1-S3-002, SRC-D1-S3-003, SRC-D1-S3-004, SRC-D1-S3-005, '
                  || 'SRC-D1-S3-006, SRC-D1-S3-007, SRC-D1-S3-008, SRC-D1-S3-009';
  v_actual   text;
  v_hash     text;
  v_excluded int;
  v_reapp    int;
  v_finding  int;
BEGIN
  SELECT count(*) INTO v_n FROM public.t3a_d1_approval_basis;
  IF v_n <> 27 THEN
    RAISE EXCEPTION 'CX16_WRONG_COUNT: % basis rows exist, expected exactly twenty-seven.', v_n;
  END IF;

  SELECT string_agg(co.identifier, ', ' ORDER BY co.identifier) INTO v_actual
    FROM public.t3a_d1_approval_basis b
    JOIN public.t3a_d1_source_approval a ON a.source_approval_id = b.source_approval_id
    JOIN public.t3a_content_object co ON co.content_object_id = a.source_id;

  IF v_actual IS DISTINCT FROM v_expect THEN
    RAISE EXCEPTION 'CX16_WRONG_SET: the basis attaches to % — expected %', v_actual, v_expect;
  END IF;

  -- SOP-002 Stage 0.2. The stored attestation is the file's bytes, not a
  -- retyping of them.
  SELECT DISTINCT encode(sha256(convert_to(b.basis_text, 'UTF8')), 'hex')
    INTO v_hash FROM public.t3a_d1_approval_basis b;
  IF v_hash IS DISTINCT FROM '5acf14bdc0d870bd68f2fc792a0ab817c54c58adf877396e21740edea406c3f7' THEN
    RAISE EXCEPTION 'CX16_ATTESTATION_DRIFTED: the stored basis text hashes to %, not to the Section 12 attestation. A paraphrase of a signed attestation is not the attestation.', coalesce(v_hash, '<more than one text stored>');
  END IF;

  -- CX-17. Nothing the instrument excludes carries this basis.
  SELECT count(*) INTO v_excluded
    FROM public.t3a_d1_approval_basis b
    JOIN public.t3a_d1_source_approval a ON a.source_approval_id = b.source_approval_id
    JOIN public.t3a_content_object co ON co.content_object_id = a.source_id
   WHERE co.identifier IN ('SRC-D1-S1-010', 'SRC-D1-S2-010', 'SRC-D1-S3-010')
      OR public.t3a_d1_is_stage4_source(co.identifier)
      OR a.status <> 'approved';
  IF v_excluded <> 0 THEN
    RAISE EXCEPTION 'CX17_BREACHED: % basis rows attach to an approval CX-17 excludes — a -010 re-approval, a withdrawn Stage 4 approval, or a row that is not an approval.', v_excluded;
  END IF;

  -- CX-17. The three -010 rows still carry their own basis, unaltered.
  SELECT count(*) INTO v_reapp FROM public.t3a_d1_founder_reapproval
   WHERE source_identifier IN ('SRC-D1-S1-010', 'SRC-D1-S2-010', 'SRC-D1-S3-010')
     AND basis = 'FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2';
  IF v_reapp <> 3 THEN
    RAISE EXCEPTION 'CX17_REAPPROVAL_BASIS_MISSING: % of the three -010 sources carry FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2.', v_reapp;
  END IF;

  -- CX-17. The unaccounted Stage 3 finding is still there.
  SELECT count(*) INTO v_finding
    FROM public.t3a_d1_approval_audit_finding f
    JOIN public.t3a_d1_source_approval a ON a.source_approval_id = f.source_approval_id
    JOIN public.t3a_content_object co ON co.content_object_id = a.source_id
   WHERE co.identifier = 'SRC-D1-S3-010' AND f.finding = 'unaccounted';
  IF v_finding <> 1 THEN
    RAISE EXCEPTION 'CX17_AUDIT_FINDING_DISTURBED: the unaccounted Stage 3 finding reads % rows, expected one, unaltered.', v_finding;
  END IF;

  RAISE NOTICE 'CX-16: 27 basis rows, the Section 12 attestation verbatim, against exactly the carried standing approvals. CX-17: nothing excluded carries it; the three -010 bases and the Stage 3 audit finding untouched.';
END;
$verify$;

-- ---------------------------------------------------------------------
-- 5. CX-18 — a basis is required, and it is required server-side
--
-- Standing Rule 6: a refusal is proved by requesting the route directly,
-- not by observing that a screen hides a control. So this is enforced in
-- two places.
--
--   (a) The route returns a named refusal, which is what a screen can
--       show a person.
--   (b) A DEFERRED constraint trigger on t3a_d1_source_approval refuses
--       at commit if an approved row has no basis. Deferred because the
--       basis row references the approval, so it cannot exist before the
--       approval does — a BEFORE INSERT check could only ever see an
--       empty table and would refuse everything.
--
-- It applies to INSERTS, so the approvals already on record are not
-- retrospectively put in breach: CX-18 governs "every future approval", and
-- CX-16 is what accounts for the twenty-seven already there.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_approval_records_its_basis()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  -- A withdrawal is ungated. Withdrawing needs no evidence of what was
  -- read; refusing a withdrawal for want of a basis would make the safer
  -- act the harder one.
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_approval_basis b
                  WHERE b.source_approval_id = NEW.source_approval_id) THEN
    RAISE EXCEPTION 'APPROVAL_RECORDS_NO_BASIS: approval % records nothing about what it rested on. Every approval carries one of the three bases at CORR-006 Section 5.2.', NEW.source_approval_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_approval_records_its_basis() IS
  'CX-18. Refuses, at commit, an approval that carries no row in t3a_d1_approval_basis. Deferred rather than BEFORE INSERT because the basis references the approval and therefore cannot precede it. Withdrawals are ungated (AX-06''s principle: withdrawal behavior is not tightened by a rule about approving).';

DROP TRIGGER IF EXISTS t3a_d1_approval_records_its_basis_trg ON public.t3a_d1_source_approval;
CREATE CONSTRAINT TRIGGER t3a_d1_approval_records_its_basis_trg
  AFTER INSERT ON public.t3a_d1_source_approval
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_approval_records_its_basis();

-- ---------------------------------------------------------------------
-- 6. CX-18 — the route takes the basis
--
-- The three-argument route is DROPPED rather than left beside the new
-- one. An overload that can still be called and that now always fails at
-- commit is worse than no overload: the caller gets a constraint error
-- from a trigger instead of a named refusal naming the missing input.
-- The function is not renamed (Standing Rule 4); its signature grows.
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.t3a_d1_record_source_approval(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.t3a_d1_record_source_approval(
  p_source_id             uuid,
  p_source_version_id     uuid,
  p_status                text,
  p_basis_kind            text DEFAULT NULL,
  p_referenced_identifier text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor    uuid := auth.uid();
  v_body     jsonb;
  v_object   uuid;
  v_standing text;
  v_requires boolean;
  v_approval uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NO_APPROVER_IDENTIFIED');
  END IF;

  -- Standing is checked here, not taken from the caller's word for it.
  IF NOT public.t3a_has_administrative_standing() THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'APPROVER_LACKS_STANDING');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'withdrawn') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'STATUS_NOT_IN_CONTROLLED_SET');
  END IF;

  -- CX-18. Checked BEFORE anything is written, so a missing basis is a
  -- named refusal rather than a deferred constraint error at commit.
  IF p_status = 'approved' THEN
    IF coalesce(btrim(p_basis_kind), '') = '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_REQUIRED',
        'remedy', 'An approval records what it rested on. Select one of the three bases at CORR-006 Section 5.2.',
        'closed_list', (SELECT jsonb_agg(jsonb_build_object(
                                 'basis_kind', k.basis_kind,
                                 'records', k.records,
                                 'requires_referenced_identifier', k.requires_referenced_identifier)
                                 ORDER BY k.basis_kind)
                          FROM public.t3a_d1_approval_basis_kind k));
    END IF;

    SELECT k.requires_referenced_identifier INTO v_requires
      FROM public.t3a_d1_approval_basis_kind k
     WHERE k.basis_kind = p_basis_kind;

    IF v_requires IS NULL THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_NOT_IN_CLOSED_LIST',
        'remedy', 'The list of bases is closed. It is widened by an instrument, not by an approver.');
    END IF;

    IF v_requires AND coalesce(btrim(p_referenced_identifier), '') = '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER',
        'remedy', 'That basis records a named document or instrument. Name it.');
    END IF;

    IF NOT v_requires AND coalesce(btrim(p_referenced_identifier), '') <> '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_TAKES_NO_IDENTIFIER',
        'remedy', 'That basis records that the text was read in this screen. It names no document.');
    END IF;
  END IF;

  SELECT body, content_object_id INTO v_body, v_object
    FROM public.t3a_d1_content_version
   WHERE content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- The object and the version must be the same source. Retained
  -- verbatim: this file replaces the route, and a replacement that drops
  -- a check is a regression dressed as a fix.
  IF v_object IS DISTINCT FROM p_source_id THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE');
  END IF;

  -- A superseded version cannot be approved. Approving one would mean a
  -- source served text that a later correction had already replaced.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_content_version
             WHERE content_version_id = p_source_version_id
               AND superseded_by IS NOT NULL) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_SUPERSEDED');
  END IF;

  -- §5.18: an approval names an exact version, and the version must be
  -- able to say which text it is. No hash, no approval.
  IF coalesce(btrim(v_body ->> 'source_version_hash'), '') = ''
     AND p_status = 'approved' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_CARRIES_NO_HASH',
      'remedy', 'An approval names an exact text. Assign the source-version hash before approving it.');
  END IF;

  -- AX-04. Lock before reading standing, on the same key the trigger
  -- uses, so the route and the backstop serialize against each other
  -- rather than each against itself.
  IF p_status = 'approved' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_source_id::text || ':' || p_source_version_id::text, 0));

    -- AX-08. This was an EXISTS on status = 'approved', which refused any
    -- re-approval of a withdrawn version — the same defect as the index,
    -- in the route. It now asks what is STANDING.
    v_standing := public.t3a_d1_version_standing_status(p_source_version_id);

    IF v_standing = 'approved' THEN
      -- AX-03: refused AND logged. This row commits because the function
      -- returns rather than raising.
      INSERT INTO public.t3a_d1_approval_refusal_log
        (source_id, source_version_id, attempted_status, refusal_code,
         standing_at_refusal, attempted_by)
      VALUES (p_source_id, p_source_version_id, p_status,
              'SOURCE_VERSION_ALREADY_APPROVED', v_standing, v_actor);

      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'SOURCE_VERSION_ALREADY_APPROVED',
        'remedy', 'The version holds a standing approval. Record a withdrawal before approving it again; the withdrawal stays in the history.');
    END IF;
  END IF;

  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (p_source_id, p_source_version_id, p_status, v_actor, now())
  RETURNING source_approval_id INTO v_approval;

  -- CX-16's shape, for a live approval: a separate row keyed to the
  -- approval. The approval row itself carries no basis column and gains
  -- none.
  IF p_status = 'approved' THEN
    INSERT INTO public.t3a_d1_approval_basis
      (source_approval_id, basis_kind, referenced_identifier, basis_text,
       basis_entered_on, recorded_under)
    VALUES (v_approval, p_basis_kind, nullif(btrim(p_referenced_identifier), ''),
            NULL, current_date,
            'Selected in the approval screen under CORR-006 Section 5.2, CX-18');
  END IF;

  RETURN jsonb_build_object('recorded', true,
    'status', p_status,
    'approved_by', v_actor,
    'basis_kind', CASE WHEN p_status = 'approved' THEN p_basis_kind END);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_record_source_approval(uuid, uuid, text, text, text) IS
  'The only route by which a REC-07 approval is written. AX-03 and AX-08: an approved row is admitted only where the version''s CURRENT STANDING is not approved, which is what lets a withdrawn version be approved again on the same version. A refused attempt is logged to t3a_d1_approval_refusal_log. CX-18: an approval also carries one of the three bases at CORR-006 Section 5.2, written to t3a_d1_approval_basis in the same transaction, and refuses by name without one — APPROVAL_BASIS_REQUIRED, APPROVAL_BASIS_NOT_IN_CLOSED_LIST, APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER, APPROVAL_BASIS_TAKES_NO_IDENTIFIER. Withdrawals need no basis.';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_record_source_approval(uuid, uuid, text, text, text)
TO authenticated;

-- A published reader, so a screen need not restate the closed list.
CREATE OR REPLACE FUNCTION public.t3a_d1_approval_basis_closed_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'basis_kind', k.basis_kind,
           'records', k.records,
           'requires_referenced_identifier', k.requires_referenced_identifier,
           'closed_list_under', k.closed_list_under) ORDER BY k.basis_kind), '[]'::jsonb)
    FROM public.t3a_d1_approval_basis_kind k;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_approval_basis_closed_list() IS
  'CX-18. The closed list, read from the one table that holds it, so the approval screen offers exactly what the route accepts and a third place cannot drift.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_approval_basis_closed_list() TO authenticated;

-- ---------------------------------------------------------------------
-- 7. What this leaves open
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-16/thirty-seven-is-thirty-nine',
   'CORR-006 Section 5, measured before writing the basis rows',
   'How the twenty-seven carried approvals are identified',
   'stated derivation does not match the table; the membership does — recorded, nothing changed',
   'closed',
   NULL,
   'Section 5.1 derives twenty-seven as "the thirty-seven carried forward under CORR-004, less the '
   || 'ten Stage 4 approvals withdrawn under CL-16". MEASURED: t3a_d1_source_approval_provenance '
   || 'holds THIRTY-NINE rows, not thirty-seven, of which twenty-seven are the standing approval for '
   || 'their version and twelve are not. The twelve are the ten Stage 4 carry-forwards, now standing '
   || 'withdrawn, PLUS SRC-D1-S1-010 and SRC-D1-S2-010, which were carried under '
   || 'CORR_003_SHEET_RELOAD_CARRY_FORWARD rather than PARSE_RECOVERY_CORR_003 and whose '
   || 'carry-forward approvals were superseded by the founder''s own re-approvals of 25 September '
   || '2026. So 37 minus 10 does not describe this table; 39 minus 12 does, and both land on 27. '
   || 'WHY IT IS CLOSED RATHER THAN OPEN: the two readings agree on WHICH approvals, not merely how '
   || 'many. The set is SRC-D1-S1-001..009, SRC-D1-S2-001..009 and SRC-D1-S3-001..009, which is also '
   || 'exactly what CX-17 leaves after excluding the three -010 rows and the ten Stage 4 rows. '
   || 'WHAT WAS DONE WITH IT: the rows were written against an OBJECT — the standing approvals that '
   || 'carry a provenance row — rather than against the arithmetic, and the migration asserts the '
   || 'resulting set identifier by identifier. Had the build subtracted instead, it would have '
   || 'attached the attestation to twenty-nine approvals, two of them the founder''s own '
   || 're-approvals that CX-17 expressly excludes.'),

  ('CORR-006/CX-18/reapproval-basis-outside-the-closed-list',
   'CORR-006 Section 5, while building the CX-18 closed list',
   'Whether an existing signed basis maps onto the closed list of three',
   'recorded rather than decided — it would re-characterise a signed governance act',
   'open',
   'Founder: either confirm that FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2 stays outside the '
   || 'closed list as a historical basis of its own, or name which of the three it is to be read as.',
   'CX-18 makes the list of bases closed at three: read in full in this screen; reviewed during '
   || 'authoring of a named issued document; compared against specified values under a named '
   || 'instrument. The three -010 approvals of 25 September 2026 carry a FOURTH basis, '
   || 'FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2, signed by Dr. Tony Mofoke and held in '
   || 't3a_d1_founder_reapproval. It is not any of the three. It is CLOSEST to "compared against '
   || 'specified values under a named instrument" (T3A-D1-REAPP-001), but saying so would be the '
   || 'build deciding what a signed attestation meant, which is exactly what the DEVELOPER JUDGMENT '
   || 'BOUNDARY reserves. '
   || 'WHAT THE BUILD DID INSTEAD, which is the most restrictive available reading: CX-18 governs '
   || 'FUTURE approvals, so the closed list holds three and nothing was mapped. The three existing '
   || 'approvals keep their own basis, unaltered, in the table that already holds it. Nothing is '
   || 'blocked: no future approval can use the fourth basis, because the route only accepts a '
   || 'basis_kind that is a row in t3a_d1_approval_basis_kind.'),

  ('CORR-006/CX-18/basis-is-not-proof-of-reading',
   'CORR-006 Section 5.2',
   'What a selected basis actually evidences',
   'inherent limit of the control, recorded so it is not mistaken for more',
   'open',
   'Founder: note the limit, or direct a stronger control if one is wanted.',
   '"Read in full in this screen" is a statement by the approver, recorded at the moment of '
   || 'approval. THE SERVER CANNOT VERIFY IT. Nothing in the schema knows whether the text was '
   || 'displayed, scrolled or read; the control records a claim and binds it to a named person, a '
   || 'moment and an exact version hash, which is what makes the claim attributable rather than '
   || 'true. That is a real improvement on the forty approvals in eighty-seven seconds, which '
   || 'recorded no claim at all, and it is NOT proof of reading. Said here because a screen that '
   || 'offers the option and a record that stores it can easily be read as evidence of the reading '
   || 'itself. The same limit applies to the two document-naming bases: the build verifies the '
   || 'identifier is present, never that the review happened.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
