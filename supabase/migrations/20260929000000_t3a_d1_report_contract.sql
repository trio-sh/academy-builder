-- =====================================================================
-- T3A-D1-EXEC-001 section 6 — the report contract
--   6.1 the twenty-one item evidence review checklist
--   6.2 the eleven-block face, and its controlled texts
--   6.3 the fifteen-field statement traceability sheet
--
-- "A FAILED ITEM BLOCKS ISSUANCE. The system records the block and its
-- rule reference and PERMITS NO MANUAL OVERRIDE. A checklist with an
-- override is a checklist that will be overridden."
--
-- There is deliberately no override column, no waiver table and no
-- force flag anywhere below. A reviewer cannot pass a failed item, and
-- neither can an administrator: PLC-005 Note 4 already refuses every
-- administrative write to t3a_d1_ber_report.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Section 6.1 — the checklist, held as data
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_review_checklist_item (
  item_no        integer PRIMARY KEY,
  requirement    text NOT NULL,
  rule_reference text
);

COMMENT ON TABLE public.t3a_d1_review_checklist_item IS
  'Section 6.1. Twenty-one items. A failed item blocks issuance and permits no manual override. The reviewer is not re-deciding the determinations: a reviewer who disagrees with a mentor capture line is not correcting it here, that is a reconsideration with its own route and eligibility.';

INSERT INTO public.t3a_d1_review_checklist_item (item_no, requirement, rule_reference) VALUES
  (1,'Approved source version exists and was eligible to serve at the observation date.','REC-07'),
  (2,'Observation Path Gateway and Stage Entry Event exist and are linked correctly.',NULL),
  (3,'Observation consent version and applicable assistance and administration rules are present.','Section 7'),
  (4,'Authorized human observer or confirmation provenance exists as required for the Stage.','Section 8'),
  (5,'Mentor authorization was valid at the date of each consequential action.',NULL),
  (6,'Determination answers, missing states and composed statement references are complete and approved.','Section 5.5'),
  (7,'Every report statement traces to one or more observation records and source versions.','Section 6.3'),
  (8,'Current evidence state is derived by rule and has no manual override.',NULL),
  (9,'The approved language rules permit the exact wording rendered for that state.','Section 5.17'),
  (10,'Mixed and divergent evidence and applicable limitations are preserved.','Section 5.14'),
  (11,'Earlier attempts that differ are noted and remain in the full record.','L-D1-ATT-001'),
  (12,'Not-observed dimensions are not presented as adverse results.','UNREP-001'),
  (13,'Evidence currency has been applied using the configured value.',NULL),
  (14,'Participant pre-issue review is complete.','Section 2 INS-006'),
  (15,'No unresolved pre-issue correction blocks any rendered statement.',NULL),
  (16,'Current permitted-use and disclosure-limits statement versions are resolvable.','Sections 6.2.5, 6.2.6'),
  (17,'Required retention configuration and the approved REC-04 rows are in force before any issuance.','REC-04'),
  (18,'Calibration and authorization gate for D1 is cleared.','Section 2 INS-008'),
  (19,'The reviewer and the issuer hold current authority for the exact report. Where the report contains observations from more than one mentor, Evidence Review and Issuing are performed by two distinct authorized mentors, each of whom observed, confirmed, recorded progression for, and reviewed none of the included observation records. Reviewing makes an actor involved: the reviewer can never issue the report they reviewed.','FD-D1-07'),
  (20,'No prohibited rating, rank, trait, prediction, recommendation or hidden employer-only quality field exists, in text or visual form.','Section 13'),
  (21,'Verification identifier and render-from-source linkage are available.','Section 6.2')
ON CONFLICT (item_no) DO NOTHING;

-- The result of running the checklist against one report. Append-only:
-- a review result is evidence about how a report came to issue.
CREATE TABLE IF NOT EXISTS public.t3a_d1_review_result (
  review_result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ber_report_id    uuid NOT NULL,
  item_no          integer NOT NULL REFERENCES public.t3a_d1_review_checklist_item(item_no),
  outcome          text NOT NULL CHECK (outcome IN ('pass','fail','not_established')),
  detail           text,
  reviewed_by      uuid,
  reviewed_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_review_result IS
  'Section 6.1. One row per checklist item per report. There is no override column and no waiver: a failed item blocks issuance, and not_established is not a pass.';

CREATE OR REPLACE FUNCTION public.t3a_d1_review_result_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'REVIEW_RESULT_APPEND_ONLY: % refused', TG_OP
    USING ERRCODE = 'check_violation';
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_review_result_no_change ON public.t3a_d1_review_result;
CREATE TRIGGER t3a_d1_review_result_no_change
  BEFORE UPDATE OR DELETE ON public.t3a_d1_review_result
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_review_result_append_only();

-- ---------------------------------------------------------------------
-- 2. Section 6.2 — the eleven-block face and its controlled texts
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_report_block (
  block_no          integer PRIMARY KEY,
  block_name        text NOT NULL,
  render_behaviour  text NOT NULL,
  controlled_text_ref text,
  renders_always    boolean NOT NULL,
  render_target     text NOT NULL DEFAULT 'report_face'
);

COMMENT ON TABLE public.t3a_d1_report_block IS
  'Section 6.2. A content contract, not a visual suggestion. Eleven blocks in fixed order. Render targets are not interchangeable: REPORT FACE is recipient-facing, FULL RECORD is the participant and evidence-domain record, TRACEABILITY SHEET is an internal audit artifact and is never part of the ordinary report face.';

INSERT INTO public.t3a_d1_report_block
  (block_no, block_name, render_behaviour, controlled_text_ref, renders_always) VALUES
  (1,'Header','Participant identity after release; record identifier; report status; current-through date',NULL,true),
  (2,'Explanatory statement','Renders the controlled text at 6.2.1','6.2.1',true),
  (3,'Divergence callout','Only where triggered','L-D1-DIV-001',false),
  (4,'Observed conduct table','Columns: Dimension, Recorded Contexts, Observed Conduct, Differences Across Settings. Blank capacity rows may remain but are LAYOUT-ONLY and carry no symbols, status, completion meaning or count semantics',NULL,true),
  (5,'Legend, attribution and evidence note','Renders the controlled text at 6.2.3. MENTOR NAMES NEVER RENDER','6.2.3',true),
  (6,'Dimensions not represented','Explicit no-result and out-of-scope treatment','UNREP-001',true),
  (7,'Verification block','Renders the controlled text at 6.2.4, with the verification address','6.2.4',true),
  (8,'Mentors, attempts and record integrity','Renders the controlled text at 6.2.2','6.2.2',true),
  (9,'Permitted use','Renders the controlled text at 6.2.5','6.2.5',true),
  (10,'Disclosure limits','Renders the controlled text at 6.2.6','6.2.6',true),
  (11,'Job family','Remains EMPTY unless separately documented job-family evidence exists. NO EMPTY LABEL OR PLACEHOLDER RENDERS',NULL,false)
ON CONFLICT (block_no) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.t3a_d1_report_controlled_text (
  text_ref   text PRIMARY KEY,
  block_no   integer REFERENCES public.t3a_d1_report_block(block_no),
  body       text NOT NULL,
  verbatim   boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.t3a_d1_report_controlled_text IS
  'Sections 6.2.1 to 6.2.7. Blocks 2, 5, 7, 8, 9 and 10 render these exact texts. They are not the developer to write, to shorten or to reword, and where the text for a mandatory block is not loaded the render refuses rather than omitting the block.';

INSERT INTO public.t3a_d1_report_controlled_text (text_ref, block_no, body) VALUES
  ('6.2.1', 2,
   'This report records selected conduct observed in defined workplace situations. Report statements are composed from recorded factual determinations and enter the record only under the applicable authorized-human observation or confirmation process. This report contains no score, rank or recommendation. Whether the documented conduct is relevant to a particular role or decision is for the reader to determine.'),
  ('6.2.2', 8,
   'Contributing observations were recorded under the authorization and calibration controls applicable to D1. Attempts are separately recorded and governed by the applicable attempt and cooldown rules. No attempt is discarded or overwritten. The full record retains each contributing observation, condition, amendment and source or version link.'),
  ('6.2.3', 5,
   'Stage labels used in this report: S1 Guided Scenario Response; S2 Mentor Live Observation; S3 Work Sample Evaluation; S4 Peer-Team Simulation. Every statement in this report was recorded by, or confirmed by, an authorized person accountable for what entered the record. The names of the people who observed are held in the record and are not printed here. Where evidence was recorded under an arrangement with an employer, that restriction is stated with the statement it affects.'),
  ('6.2.4', 7,
   'The authoritative status of this report is held by The 3rd Academy and can be checked at the address shown with this report. What you are reading is a snapshot taken at the issue date and may since have been amended or withdrawn. Verification confirms status only: it returns whether this report is current, amended or withdrawn, and it returns no content. Holding this report is not proof of the identity of the person it describes.'),
  ('6.2.5', 9,
   'This report may be read by the recipient named in the release, for the purpose the participant released it for. It may not be copied to another party, added to a database, used to build a profile, or used for any decision about a person other than the participant. It records conduct observed in defined situations. It is not a reference or a recommendation, and it states nothing about suitability for any role.'),
  ('6.2.6', 10,
   'The participant controls this disclosure. They may revoke it at any time, after which this report must not be read, retained or relied upon further. This release covers this report at this version only; a later version is not covered and must be released separately. Onward disclosure to any other person or organization is not permitted.'),
  ('6.2.7-watermark', NULL,
   'SERVICE-RENDERED PILOT SPECIMEN — NOT AN ISSUED REPORT.'),
  ('6.2.7-notice', NULL,
   'This is a demonstration. Nothing recorded here enters a record or a report, and no report can be issued from it.')
ON CONFLICT (text_ref) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Section 6.3 — the traceability sheet
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_traceability_field (
  field_no   integer PRIMARY KEY,
  field_name text NOT NULL UNIQUE,
  records    text NOT NULL
);

COMMENT ON TABLE public.t3a_d1_traceability_field IS
  'Section 6.3. Fifteen fields per rendered sentence, retained internally and never part of the report face. The test this sheet must pass: pick any sentence on any report and walk back to the source observation record and its provenance. If any link is missing, the sentence is not defensible and should not have issued.';

INSERT INTO public.t3a_d1_traceability_field (field_no, field_name, records) VALUES
  (1,'report_version_and_issue_status','Which report, and its state'),
  (2,'rendered_sentence_or_note_identifier','Including the controlled template identifier applied'),
  (3,'source_observation_identifiers','Every observation contributing to the sentence'),
  (4,'source_versions_and_rendered_instance_references','The source, and what the participant actually saw'),
  (5,'determination_question_and_answer_identifiers','The answers that composed it, with versions'),
  (6,'observation_statement_identifier_and_version','The composed statement'),
  (7,'report_frame_identifier_and_version','Which frame, and the state that selected it'),
  (8,'condition_rule_identifier_and_version','Which conditions, in which order'),
  (9,'technical_comparison_references','Where cross-context language is used'),
  (10,'ca04_part_c_map_version','Required whenever the report makes a cross-context comparison, a same-conduct-across-settings statement, or a recurrence claim. Merely listing separate source-linked observations from more than one context does not itself create or require a recurrence relationship'),
  (11,'sufficiency_rules_version','Rules applied at assembly and issuance'),
  (12,'permitted_use_version_and_disclosure_limits_version','The exact statements rendered'),
  (13,'evidence_review_actor_and_authorization_snapshot','Who performed evidence review, and under what authority'),
  (14,'issuer_actor_and_authorization_snapshot','Who issued, and under what authority'),
  (15,'participant_review_and_correction_references','Proof of pre-issue rights completion and any amendments')
ON CONFLICT (field_no) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.t3a_d1_statement_trace (
  trace_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ber_report_id    uuid NOT NULL,
  sentence_ref     text NOT NULL,
  trace_body       jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ber_report_id, sentence_ref)
);

COMMENT ON TABLE public.t3a_d1_statement_trace IS
  'Section 6.3. One row per rendered sentence. Never part of the report face: the render target for this table is TRACEABILITY SHEET only.';

ALTER TABLE public.t3a_d1_review_checklist_item   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_review_result           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_report_block            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_report_controlled_text  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_traceability_field      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_statement_trace         ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['t3a_d1_review_checklist_item','t3a_d1_report_block',
                           't3a_d1_report_controlled_text','t3a_d1_traceability_field'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write ON public.%I FOR ALL
       USING (public.t3a_is_service_context()) WITH CHECK (public.t3a_is_service_context())', t, t);
  END LOOP;
END;
$rls$;

-- The traceability sheet and the review results are internal evidence
-- artifacts. They never reach a recipient surface.
DROP POLICY IF EXISTS t3a_d1_statement_trace_read ON public.t3a_d1_statement_trace;
CREATE POLICY t3a_d1_statement_trace_read ON public.t3a_d1_statement_trace
  FOR SELECT USING (
    public.t3a_is_oversight_admin() OR public.t3a_is_service_context()
    OR public.t3a_is_reviewer());

DROP POLICY IF EXISTS t3a_d1_review_result_read ON public.t3a_d1_review_result;
CREATE POLICY t3a_d1_review_result_read ON public.t3a_d1_review_result
  FOR SELECT USING (
    public.t3a_is_oversight_admin() OR public.t3a_is_service_context()
    OR public.t3a_is_reviewer());

DROP POLICY IF EXISTS t3a_d1_review_result_insert ON public.t3a_d1_review_result;
CREATE POLICY t3a_d1_review_result_insert ON public.t3a_d1_review_result
  FOR INSERT WITH CHECK (public.t3a_is_reviewer() OR public.t3a_is_service_context());

-- ---------------------------------------------------------------------
-- 4. The gate — a failed item blocks issuance, with no override
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_review_blocks_issuance(
  p_ber_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_total    integer;
  v_recorded integer;
  v_failed   integer;
  v_unset    integer;
  v_blocking jsonb;
BEGIN
  SELECT count(*) INTO v_total FROM public.t3a_d1_review_checklist_item;

  SELECT count(DISTINCT item_no) INTO v_recorded
  FROM public.t3a_d1_review_result WHERE ber_report_id = p_ber_report_id;

  -- not_established is not a pass. It blocks exactly as a failure does.
  SELECT count(*) INTO v_failed
  FROM public.t3a_d1_review_result
  WHERE ber_report_id = p_ber_report_id AND outcome IN ('fail','not_established');

  v_unset := v_total - v_recorded;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'item_no', r.item_no, 'outcome', r.outcome,
           'rule_reference', i.rule_reference, 'requirement', i.requirement)
           ORDER BY r.item_no), '[]'::jsonb)
    INTO v_blocking
  FROM public.t3a_d1_review_result r
  JOIN public.t3a_d1_review_checklist_item i ON i.item_no = r.item_no
  WHERE r.ber_report_id = p_ber_report_id AND r.outcome IN ('fail','not_established');

  RETURN jsonb_build_object(
    'blocked', (v_failed > 0 OR v_unset > 0),
    'items_total', v_total,
    'items_recorded', v_recorded,
    'items_not_recorded', v_unset,
    'items_blocking', v_failed,
    'blocking_detail', v_blocking,
    -- Stated in the return so no caller can believe one exists.
    'override_available', false);
END;
$fn$;

-- Section 6.2: where the text for a mandatory block is not loaded, the
-- render refuses rather than omitting the block.
CREATE OR REPLACE FUNCTION public.t3a_d1_report_face_renderable()
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(b.block_no || ':' || b.controlled_text_ref, ', ' ORDER BY b.block_no)
    INTO v_missing
  FROM public.t3a_d1_report_block b
  LEFT JOIN public.t3a_d1_report_controlled_text t ON t.text_ref = b.controlled_text_ref
  WHERE b.renders_always
    AND b.controlled_text_ref IS NOT NULL
    AND b.controlled_text_ref LIKE '6.2.%'
    AND t.text_ref IS NULL;

  IF v_missing IS NOT NULL THEN
    RETURN jsonb_build_object('renderable', false,
      'refusal_code', 'MANDATORY_BLOCK_TEXT_NOT_LOADED', 'blocks', v_missing);
  END IF;

  RETURN jsonb_build_object('renderable', true,
    'blocks', (SELECT count(*) FROM public.t3a_d1_report_block));
END;
$fn$;

-- Section 6.2 names the refusal reason the render must log. The existing
-- enum does not carry it, so the value is added. This is an addition to
-- a controlled vocabulary, never a rename of one.
DO $addval$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 't3a_d1_report_refusal_reason' AND e.enumlabel = 'LAYOUT_OVERFLOW') THEN
    ALTER TYPE public.t3a_d1_report_refusal_reason ADD VALUE 'LAYOUT_OVERFLOW';
  END IF;
END;
$addval$;

-- Section 6.2: a one-page contract. Where mandatory content cannot
-- render legibly on one page without omission, compression, hiding
-- differences or score-like shorthand, the render FAILS AND LOGS
-- layout_overflow. It does not expand and it does not compress.
DROP FUNCTION IF EXISTS public.t3a_d1_report_face_layout(numeric, numeric);

CREATE OR REPLACE FUNCTION public.t3a_d1_report_face_layout(
  p_participant_id     uuid,
  p_measured_height_mm numeric,
  p_page_height_mm     numeric DEFAULT 297)
RETURNS jsonb LANGUAGE plpgsql AS $fn$
BEGIN
  IF p_measured_height_mm > p_page_height_mm THEN
    INSERT INTO public.t3a_d1_report_refusal_log
      (participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant_id, 'D1', 'report_face', 'LAYOUT_OVERFLOW',
            jsonb_build_object('measured_mm', p_measured_height_mm,
                               'page_mm', p_page_height_mm,
                               'note', 'Fix the content, never the contract'));
    RETURN jsonb_build_object('rendered', false, 'refusal_code', 'LAYOUT_OVERFLOW');
  END IF;
  RETURN jsonb_build_object('rendered', true);
END;
$fn$;

-- Section 6.3: pick any sentence and walk back to the source observation
-- record. If any link is missing the sentence is not defensible and
-- should not have issued.
CREATE OR REPLACE FUNCTION public.t3a_d1_trace_complete(
  p_ber_report_id uuid,
  p_sentence_ref  text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_body    jsonb;
  v_missing text;
BEGIN
  SELECT trace_body INTO v_body FROM public.t3a_d1_statement_trace
  WHERE ber_report_id = p_ber_report_id AND sentence_ref = p_sentence_ref;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('defensible', false,
      'refusal_code', 'NO_TRACE_FOR_RENDERED_SENTENCE');
  END IF;

  SELECT string_agg(f.field_name, ', ' ORDER BY f.field_no) INTO v_missing
  FROM public.t3a_d1_traceability_field f
  WHERE NOT (v_body ? f.field_name)
     OR v_body ->> f.field_name IS NULL;

  IF v_missing IS NOT NULL THEN
    RETURN jsonb_build_object('defensible', false,
      'refusal_code', 'TRACE_LINK_MISSING', 'missing_fields', v_missing);
  END IF;

  RETURN jsonb_build_object('defensible', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_report_face_layout(uuid, numeric, numeric),
  public.t3a_d1_review_blocks_issuance(uuid),
  public.t3a_d1_report_face_renderable(),
  public.t3a_d1_trace_complete(uuid, text)
TO anon, authenticated;
