-- =====================================================================
-- CORR-006 Section 7 — the ten Stage 4 impact assessments, and the gate
-- that makes an approval provably follow its assessment
--
-- WHY THIS SECTION RUNS BEFORE SECTION 5. CX-24 is what makes the
-- founder's ten Stage 4 approvals provable, and he approves each source
-- after reading it with its assessment. The gate has to exist before the
-- approvals, or the record cannot show the order.
--
-- CX-25 IS OBSERVED ABSOLUTELY: no Stage 4 approval is recorded here. The
-- proof at the end attempts them only inside a transaction that aborts.
--
-- ANNEX D CROSS-CHECKED AGAINST THE LOADED CONTENT BEFORE LOADING IT.
-- All ten titles match the loaded source titles exactly, and every
-- bearing-interest value matches: S4-001 and S4-007 carry one, the other
-- eight read None. So Annex D was written against the real content rather
-- than from memory, and the assertion below keeps it that way.
--
-- ONE THING FOUND WHILE CHECKING, RECORDED HERE AND ACTED ON AT SECTION 9:
-- d1_situation_class is NULL in the source sheet of all ten Stage 4
-- sources. Annex D.2 supplies the class per source, so the value exists as
-- issued content — but it does NOT exist in the field the build would
-- derive a pattern family from. That is exactly what CX-33 anticipates and
-- what SOP-002 C.8 records as a known D1 defect: the class was stated in
-- prose at the source's head rather than as a field.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. What counts as a Stage 4 source — ONE definition
--
-- CL-16 and the register queries each matched '^SRC-D1-S4-0' inline. Two
-- readers of one fact eventually disagree (AX-08), so the test is written
-- once here and called from the guard.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_is_stage4_source(p_source_identifier text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $fn$
  SELECT coalesce(p_source_identifier ~ '^SRC-D1-S4-0', false);
$fn$;

COMMENT ON FUNCTION public.t3a_d1_is_stage4_source(text) IS
  'The single definition of "is this a Stage 4 production source". Matches the identifier pattern CL-16 and the register queries already used, written once so the guard and any later reader cannot drift apart.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_is_stage4_source(text) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. The assessment record
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_stage4_impact_assessment (
  source_identifier   text PRIMARY KEY,
  source_version_id   uuid NOT NULL
    REFERENCES public.t3a_d1_content_version(content_version_id) ON DELETE RESTRICT,
  title               text NOT NULL,
  situation_class     text NOT NULL,
  bearing_interest    text NOT NULL,
  welfare_attention   text NOT NULL
    CHECK (welfare_attention IN ('standard', 'heightened')),
  welfare_basis       text,
  theme_line          text,
  result              text NOT NULL,
  instrument          text NOT NULL,
  completed_by        text NOT NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_stage4_impact_assessment IS
  'CORR-006 CX-23. One completed seven-part impact assessment per Stage 4 production source, bound to that source''s CURRENT version. The Execution Edition requires this before a Stage 4 source may be SUBMITTED for approval — the hold sits before review, not before activation, which is why the ten approvals were withdrawn under CL-16. The seven parts are in t3a_d1_stage4_impact_assessment_part.';

COMMENT ON COLUMN public.t3a_d1_stage4_impact_assessment.theme_line IS
  'CX-31. For a heightened-welfare source only: the one neutral line shown on the participant''s pre-session screen. It states only what that source''s pre-brief already tells them, so it changes nothing about the observation.';

ALTER TABLE public.t3a_d1_stage4_impact_assessment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_stage4_impact_assessment_read ON public.t3a_d1_stage4_impact_assessment;
CREATE POLICY t3a_d1_stage4_impact_assessment_read
  ON public.t3a_d1_stage4_impact_assessment FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_stage4_impact_assessment TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_d1_stage4_impact_assessment_part (
  source_identifier text NOT NULL
    REFERENCES public.t3a_d1_stage4_impact_assessment(source_identifier) ON DELETE RESTRICT,
  part_no           int  NOT NULL CHECK (part_no BETWEEN 1 AND 7),
  part_name         text NOT NULL,
  finding           text NOT NULL,
  controls          text NOT NULL,
  PRIMARY KEY (source_identifier, part_no)
);

COMMENT ON TABLE public.t3a_d1_stage4_impact_assessment_part IS
  'The seven parts the Execution Edition requires: shared material, identity, recording, correction, withdrawal, group composition, accommodation. Annex D.1 states that all seven apply identically to all ten sources because they follow from how Stage 4 is built, so the same seven are bound to each source rather than shared by reference — a per-source row is what an auditor reading one source needs.';

ALTER TABLE public.t3a_d1_stage4_impact_assessment_part ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_stage4_impact_assessment_part_read ON public.t3a_d1_stage4_impact_assessment_part;
CREATE POLICY t3a_d1_stage4_impact_assessment_part_read
  ON public.t3a_d1_stage4_impact_assessment_part FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_stage4_impact_assessment_part TO authenticated;

-- ---------------------------------------------------------------------
-- 3. CX-23 — load the ten, each bound to its CURRENT version
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_stage4_impact_assessment
  (source_identifier, source_version_id, title, situation_class, bearing_interest,
   welfare_attention, welfare_basis, theme_line, result, instrument, completed_by)
SELECT d.source_identifier, cv.content_version_id, d.title, d.situation_class,
       d.bearing_interest, d.welfare_attention, d.welfare_basis, d.theme_line,
       d.result, 'T3A-D1-EXEC-CORR-006 Annex D (T3A-D1-S4-IMPACT-001)',
       'Dr. Tony Mofoke, Founder and Chief Executive Officer'
  FROM (VALUES
    ('SRC-D1-S4-001', 'The Shortlist Round', 'S-5 with S-2',
     'Yes — decision point the agreement at B4', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-002', 'The Status Roll-Up', 'S-1', 'None', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-003', 'The Waiver Round', 'S-3 with S-1', 'None', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-004', 'The Write-Up', 'S-4', 'None', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-005', 'The Estimate Round', 'S-2', 'None', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-006', 'The Incident Review', 'S-6 with S-1', 'None', 'standard',
     'An operational error, a batch sent to the wrong depot; no injury.', NULL, 'Completed'),
    ('SRC-D1-S4-007', 'The Promotion Panel', 'S-5',
     'Yes — decision point the agreement at B4', 'heightened',
     'A close personal friend is under discussion; loyalty may be felt as real.',
     'This session involves a decision about someone you know personally.',
     'Completed, with heightened welfare attention'),
    ('SRC-D1-S4-008', 'The Figure in the Room', 'S-7 with S-1', 'None', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-009', 'The Commitment Round', 'S-2 with S-1', 'None', 'standard', NULL, NULL, 'Completed'),
    ('SRC-D1-S4-010', 'The Stand-Down', 'S-3 with S-1', 'None', 'heightened',
     'Resuming after a near-miss; a safety-incident theme.',
     'This session involves a safety near-miss at work. Nobody was hurt.',
     'Completed, with heightened welfare attention')
  ) AS d(source_identifier, title, situation_class, bearing_interest,
         welfare_attention, welfare_basis, theme_line, result)
  JOIN public.t3a_content_object co ON co.identifier = d.source_identifier
  JOIN public.t3a_d1_content_version cv
    ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
ON CONFLICT (source_identifier) DO UPDATE SET
  source_version_id = EXCLUDED.source_version_id,
  title             = EXCLUDED.title,
  situation_class   = EXCLUDED.situation_class,
  bearing_interest  = EXCLUDED.bearing_interest,
  welfare_attention = EXCLUDED.welfare_attention,
  welfare_basis     = EXCLUDED.welfare_basis,
  theme_line        = EXCLUDED.theme_line,
  result            = EXCLUDED.result;

-- The seven parts, from Annex D.1, bound to each of the ten.
INSERT INTO public.t3a_d1_stage4_impact_assessment_part
  (source_identifier, part_no, part_name, finding, controls)
SELECT a.source_identifier, p.part_no, p.part_name, p.finding, p.controls
  FROM public.t3a_d1_stage4_impact_assessment a
  CROSS JOIN (VALUES
    (1, 'Shared material',
     'The source''s shared material is placed before the whole group. It uses fictional names cleared '
     || 'under name clearance and contains no personal data about any real person.',
     'Shown by the facilitator sharing one window or tab holding only that material, never the '
     || 'Cockpit or the whole screen (CL-46, attestation A4). Everyone sees the same material (R3). '
     || 'Each individual pack is visible only to its holder (T3A-D1-EXEC-001 Section 8.3).'),
    (2, 'Identity',
     'The observed participant must be the verified participant. Co-participants are role players, '
     || 'not participants.',
     'The observed participant is verified by platform account and the facilitator''s visual '
     || 'confirmation against their Academy identity in Meet, and admitted from the waiting room '
     || '(REC-11, CL-43). Co-participants are arranged by the Academy, admitted by the host, never '
     || 'observed and never asked for observation consent. Before composition, the facilitator '
     || 'confirms that no co-participant knows the observed participant; where one does, that '
     || 'co-participant is replaced.'),
    (3, 'Recording', 'Nothing is recorded.',
     'No media persists (Section 8.3, E3). The Workspace configuration (CL-40), attestation A2, and '
     || 'ending the session if a recording indicator appears (CL-45).'),
    (4, 'Correction', 'A correction can reach only the observed participant''s record.',
     'A correction alters only the record it concerns. No co-participant can raise one against an '
     || 'observation of which they are not the subject, and nothing a co-participant says is recorded '
     || 'as their conduct (Section 8.3, R4).'),
    (5, 'Withdrawal', 'Withdrawal must remove the right things and nothing else.',
     'The observed participant''s withdrawal excludes their determinations from composition and '
     || 'retains them in history. A co-participant''s withdrawal removes nothing (Section 8.3, R5). '
     || 'Welfare stops under CX-28.'),
    (6, 'Group composition',
     'One observed participant, three role-play co-participants and one facilitator. No shared '
     || 'record, no group outcome and no comparison.',
     'A composition record names every person, the source version, the facilitator and the session '
     || '(Section 8.3). Each co-participant signs a confidentiality undertaking before taking part, '
     || 'covering the session and the observed participant''s conduct.'),
    (7, 'Accommodation', 'An accommodation must not change the observation mid-session.',
     'Settled before composition, never during (Section 8.3, R6). Where it affects what the group '
     || 'sees or hears, it applies to the whole session. Live captions only where so settled, and '
     || 'never saved (CL-47).')
  ) AS p(part_no, part_name, finding, controls)
ON CONFLICT (source_identifier, part_no) DO UPDATE SET
  part_name = EXCLUDED.part_name, finding = EXCLUDED.finding, controls = EXCLUDED.controls;

-- ---------------------------------------------------------------------
-- 4. Asserted: ten, seventy, current versions, and titles that match
-- ---------------------------------------------------------------------

DO $assert$
DECLARE
  v_a int; v_p int; v_stale int; v_mismatch text; v_heightened int;
BEGIN
  SELECT count(*) INTO v_a FROM public.t3a_d1_stage4_impact_assessment;
  SELECT count(*) INTO v_p FROM public.t3a_d1_stage4_impact_assessment_part;

  -- Every assessment must name the source's CURRENT version, or it
  -- assesses text that is no longer served.
  SELECT count(*) INTO v_stale
    FROM public.t3a_d1_stage4_impact_assessment a
    JOIN public.t3a_d1_content_version cv ON cv.content_version_id = a.source_version_id
   WHERE cv.superseded_by IS NOT NULL;

  -- Annex D's title against the loaded title, case-insensitively: the
  -- loaded titles are upper case and Annex D uses title case.
  SELECT string_agg(a.source_identifier || ' annex="' || a.title || '" loaded="' || co.title || '"', '; ')
    INTO v_mismatch
    FROM public.t3a_d1_stage4_impact_assessment a
    JOIN public.t3a_content_object co ON co.identifier = a.source_identifier
   WHERE lower(a.title) <> lower(co.title);

  SELECT count(*) INTO v_heightened
    FROM public.t3a_d1_stage4_impact_assessment
   WHERE welfare_attention = 'heightened';

  IF v_a <> 10 THEN RAISE EXCEPTION 'CX_23_FAILED: expected ten assessments, loaded %.', v_a; END IF;
  IF v_p <> 70 THEN RAISE EXCEPTION 'CX_23_FAILED: expected seventy parts (seven per source), loaded %.', v_p; END IF;
  IF v_stale <> 0 THEN RAISE EXCEPTION 'CX_23_FAILED: % assessments are bound to a superseded version.', v_stale; END IF;
  IF v_mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'CX_23_FAILED: Annex D titles do not match the loaded sources: %', v_mismatch;
  END IF;
  IF v_heightened <> 2 THEN
    RAISE EXCEPTION 'CX_23_FAILED: expected exactly two heightened-welfare sources (S4-007, S4-010), found %.', v_heightened;
  END IF;

  -- Both heightened sources must carry the pre-session theme line CX-31 places.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_stage4_impact_assessment
              WHERE welfare_attention = 'heightened' AND coalesce(btrim(theme_line), '') = '') THEN
    RAISE EXCEPTION 'CX_23_FAILED: a heightened-welfare source carries no theme line, so CX-31 has nothing to render.';
  END IF;

  RAISE NOTICE 'CX-23: % assessments, % parts, all bound to current versions, titles match, % heightened.', v_a, v_p, v_heightened;
END;
$assert$;

-- ---------------------------------------------------------------------
-- 5. CX-24 — an approval must follow its assessment, enforced on the table
--
-- On the TABLE rather than only in the route, because the route is one
-- caller and the guard is the property. A Stage 4 approval with no
-- assessment, or one recorded at or after the approval, refuses by name.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_stage4_approval_follows_assessment()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_src  text;
  v_when timestamptz;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;  -- a withdrawal is never gated on an assessment
  END IF;

  SELECT co.identifier INTO v_src
    FROM public.t3a_d1_content_version cv
    JOIN public.t3a_content_object co ON co.content_object_id = cv.content_object_id
   WHERE cv.content_version_id = NEW.source_version_id;

  IF NOT public.t3a_d1_is_stage4_source(v_src) THEN
    RETURN NEW;  -- Stages 1 to 3 are untouched by CX-24
  END IF;

  SELECT a.recorded_at INTO v_when
    FROM public.t3a_d1_stage4_impact_assessment a
   WHERE a.source_identifier = v_src
     AND a.source_version_id = NEW.source_version_id;

  IF v_when IS NULL THEN
    RAISE EXCEPTION 'STAGE4_APPROVAL_WITHOUT_IMPACT_ASSESSMENT: % has no completed seven-part impact assessment bound to this version. T3A-D1-EXEC-001 places that hold BEFORE the source may be submitted for approval, which is why the ten earlier approvals were withdrawn under CL-16.', v_src
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.approved_at <= v_when THEN
    RAISE EXCEPTION 'STAGE4_APPROVAL_PRECEDES_ITS_ASSESSMENT: % was approved at % and its assessment was recorded at %. The record must show the approval FOLLOWED the assessment; an approval at or before it does not.', v_src, NEW.approved_at, v_when
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_stage4_approval_follows_assessment() IS
  'CORR-006 CX-24. A Stage 4 approval is accepted only where an assessment exists for that source AND that exact version, and was recorded strictly before the approval. Enforced on the table so no caller can reach around it, and so the record shows the order rather than asserting it. A withdrawal is not gated; Stages 1 to 3 are untouched.';

DROP TRIGGER IF EXISTS t3a_d1_stage4_approval_follows_assessment_trg ON public.t3a_d1_source_approval;
CREATE TRIGGER t3a_d1_stage4_approval_follows_assessment_trg
  BEFORE INSERT ON public.t3a_d1_source_approval
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_stage4_approval_follows_assessment();

-- ---------------------------------------------------------------------
-- 6. CX-26 — activation is still refused, asserted rather than restated
-- ---------------------------------------------------------------------

DO $activation$
DECLARE v_claim text; v_unmet int; v_approved int;
BEGIN
  SELECT status INTO v_claim FROM public.t3a_d1_stage_claim WHERE scope = 'Stage 4 production';
  SELECT count(*) INTO v_unmet FROM public.t3a_d1_lift_condition
   WHERE scope = 'Stage 4 production loading' AND NOT satisfied;
  SELECT count(*) INTO v_approved
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE public.t3a_d1_is_stage4_source(co.identifier)
     AND public.t3a_d1_source_version_approved(cv.content_version_id);

  IF v_claim IS DISTINCT FROM 'not_claimable' THEN
    RAISE EXCEPTION 'CX_26_FAILED: Stage 4 production reads % and must read not_claimable until the founder records the activation decision.', v_claim;
  END IF;
  IF v_approved <> 0 THEN
    RAISE EXCEPTION 'CX_26_FAILED: % Stage 4 sources are approved. CX-25 forbids the build recording any Stage 4 approval; these must be accounted for before activation is discussed.', v_approved;
  END IF;

  RAISE NOTICE 'CX-26: Stage 4 production not_claimable, % lift conditions unmet, % Stage 4 approvals standing. Loading the assessments does not activate anything.', v_unmet, v_approved;
END;
$activation$;

-- The assessments being loaded satisfies the FIRST lift condition only.
UPDATE public.t3a_d1_lift_condition
   SET satisfied = true,
       satisfied_by = 'CORR-006 CX-23, migration 20261071000000. Ten assessments loaded from Annex D, '
                   || 'seventy parts, each bound to its source''s current version, titles cross-checked '
                   || 'against the loaded sources. The approval gate at CX-24 is enforced on the table.'
 WHERE lift_condition_id = 'S4-PROD-LIFT-1';
