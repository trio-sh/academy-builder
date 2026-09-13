-- =====================================================================
-- T3A-D1-EXEC-001 §5 — the corrective run, recorded
--
-- 20261007000000 carries the source-sheet re-extraction as a FRESH
-- database needs it: baseline load → corrected values.
--
-- The live non-production database did not take that path. A first
-- attempt at the re-extraction ran against it under a rule that was
-- wrong — "first occurrence wins" — and superseded thirty-two sources
-- with values that were worse than the ones they replaced. The rule was
-- then measured properly and corrected, and this migration brings those
-- standing versions to the same end state the fresh path produces.
--
-- It is here rather than folded into the previous file because the
-- previous file must keep describing the fresh path, and because a
-- mistake that reached a database is a thing to record, not to tidy
-- away. On a fresh database every row here is a no-op: the standing
-- sheet already contains these values and the @> check skips it.
--
-- End state, verified against all forty sources through the reference
-- card: material_items 40/40 well formed, unsupported assertions 40/40,
-- attribution support set 39/40, available routes 39/40. The two that
-- remain are SRC-D1-S1-010 attribution_support_set and SRC-D1-S3-010
-- available_routes, which no mechanical rule recovers from the issued
-- document. They are refused by the card and recorded as outstanding,
-- not guessed.
-- =====================================================================

DO $fixsheets$
DECLARE
  c        record;
  v        record;
  v_new    uuid;
  v_rows   int := 0;
  v_left   int;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
    ($lit$SRC-D1-S1-010$lit$, $lit${"stated_standard": "CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,", "route_observation_basis": "S2 ROUTE-OBSERVATION BASIS: a route is recorded as USED only where the", "d1_situation_class": "S-1 to S-7, stated per source. This is a D1 CONSTRUCT classification and is", "attribution_support_set": "Stated per source. Where empty, any attribution to another person maps", "max_seconds": "600 minimum, 1200 maximum per session.", "source_version_hash": "proves the canonical source;", "relevant_conduct": "without its counterpart. It states WHAT OBSERVABLE D1 CONDUCT THIS SOURCE", "name_clearance_status": "Governed by the launch naming rule at Part One, Section 5.5. A launch"}$lit$::jsonb),
    ($lit$SRC-D1-S2-001$lit$, $lit${"material_items": "M1 the figure is wrong. M2 the participant supplied it. M3 the error is the", "information_made_available": "I1 the meeting is in twenty minutes. I2 the colleague is presenting"}$lit$::jsonb),
    ($lit$SRC-D1-S2-002$lit$, $lit${"material_items": "M1 work was consistently late. M2 two deliverables were reassigned. M3 nothing", "information_made_available": "I1 the caller is hiring for a coordination role. I2 the request to"}$lit$::jsonb),
    ($lit$SRC-D1-S2-003$lit$, $lit${"material_items": "M1 the load check has not been done. M2 it is required before the permit is", "information_made_available": "I1 the night crew is due in an hour. I2 the request to sign. I3 at"}$lit$::jsonb),
    ($lit$SRC-D1-S2-004$lit$, $lit${"material_items": "M1 the redesign was largely Femi’s work. M2 Femi is not present. M3 the", "information_made_available": "I1 the outgoing lead’s attribution. I2 that it is described as the"}$lit$::jsonb),
    ($lit$SRC-D1-S2-005$lit$, $lit${"bearing_interest": "PRESENT. The decision point is accepting the panel seat; the direct question"}$lit$::jsonb),
    ($lit$SRC-D1-S2-006$lit$, $lit${"material_items": "M1 personal costs were charged to the team card. M2 they have not been repaid.", "information_made_available": "I1 the colleague has used the team card for personal costs. I2 they"}$lit$::jsonb),
    ($lit$SRC-D1-S2-007$lit$, $lit${"material_items": "M1 the milestone was not met. M2 two of five deliverables completed. M3 three", "information_made_available": "I1 the agenda reaches the milestone. I2 at B3, the direct question."}$lit$::jsonb),
    ($lit$SRC-D1-S2-008$lit$, $lit${"material_items": "M1 four of six sections were not reviewed. M2 the participant’s name would", "information_made_available": "I1 the cover note goes out in ten minutes. I2 the review question."}$lit$::jsonb),
    ($lit$SRC-D1-S2-009$lit$, $lit${"material_items": "M1 the participant has seen the draft. M2 the draft is confidential. M3 the", "information_made_available": "I1 the colleague has an external offer. I2 the deadline. I3 at B3,"}$lit$::jsonb),
    ($lit$SRC-D1-S2-010$lit$, $lit${"bearing_interest": "PRESENT. The decision point is accepting the review; the direct question at", "stated_standard": "CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,", "name_clearance_status": "Governed by the launch naming rule at Part One, Section 5.5. A launch"}$lit$::jsonb),
    ($lit$SRC-D1-S3-001$lit$, $lit${"material_items": "M1 no root cause has been concluded. M2 the engineering accounts conflict. M3", "information_made_available": "The scenario context, the trigger event, and the eleven known"}$lit$::jsonb),
    ($lit$SRC-D1-S3-002$lit$, $lit${"material_items": "M1 the labels state the wrong dosage. M2 the batch passed QA visual inspection.", "information_made_available": "The scenario context, the trigger event and the known facts, all"}$lit$::jsonb),
    ($lit$SRC-D1-S3-003$lit$, $lit${"material_items": "M1 the manager instructed action within the week. M2 policy requires a", "information_made_available": "The scenario context, trigger event and known facts, all available"}$lit$::jsonb),
    ($lit$SRC-D1-S3-004$lit$, $lit${"material_items": "M1 the cause is not yet known. M2 340 client agreement files were accessed. M3", "information_made_available": "The scenario context, trigger event and known facts, all available"}$lit$::jsonb),
    ($lit$SRC-D1-S3-005$lit$, $lit${"material_items": "M1 fourteen trades over three months show excessive turnover. M2 the client", "information_made_available": "The scenario context, trigger event and known facts, all available"}$lit$::jsonb),
    ($lit$SRC-D1-S3-006$lit$, $lit${"material_items": "M1 the same error occurred three times in six weeks. M2 the earlier reports", "information_made_available": "The scenario context, trigger event, known facts and the site"}$lit$::jsonb),
    ($lit$SRC-D1-S3-007$lit$, $lit${"material_items": "M1 the operator skipped the standard reverse-check protocol. M2 the shift was", "information_made_available": "The scenario context, trigger event and known facts, all available"}$lit$::jsonb),
    ($lit$SRC-D1-S3-008$lit$, $lit${"material_items": "M1 a complaint was made and its content. M2 policy requires documentation", "information_made_available": "The scenario context, trigger event, known facts and the policy"}$lit$::jsonb),
    ($lit$SRC-D1-S3-009$lit$, $lit${"material_items": "M1 fourteen of twenty-four completed. M2 satisfaction averaged 2.8 against a", "information_made_available": "The scenario context, trigger event, known facts and the interview"}$lit$::jsonb),
    ($lit$SRC-D1-S3-010$lit$, $lit${"d1_situation_class": "S-1 to S-7, stated per source. This is a D1 CONSTRUCT classification and is", "available_routes": ", retained deliverablesQ-D1-07DIRECTWritten account test follows the written", "min_seconds": "and", "name_clearance_status": "Governed by the launch naming rule at Part One, Section 5.5. A launch"}$lit$::jsonb),
    ($lit$SRC-D1-S4-001$lit$, $lit${"bearing_interest": "PRESENT. Decision point is the agreement at B4; the enquiry at B3 precedes"}$lit$::jsonb),
    ($lit$SRC-D1-S4-002$lit$, $lit${"material_items": "M1 the workstream is two weeks behind. M2 two of four deliverables have", "information_made_available": "P0 the pre-brief: two weeks behind, two of four deliverables"}$lit$::jsonb),
    ($lit$SRC-D1-S4-003$lit$, $lit${"material_items": "M1 a security sign-off is required before release. M2 it has not been obtained.", "information_made_available": "P0 the pre-brief: the checklist requires a security sign-off, it"}$lit$::jsonb),
    ($lit$SRC-D1-S4-004$lit$, $lit${"material_items": "M1 the redesign was largely Femi’s work. M2 the participant contributed the", "information_made_available": "P0 the pre-brief: the redesign was largely Femi’s work, built over"}$lit$::jsonb),
    ($lit$SRC-D1-S4-005$lit$, $lit${"material_items": "M1 the component took nine weeks on each of the last two builds. M2 nothing", "information_made_available": "P0 the pre-brief: the component took nine weeks twice, nothing is"}$lit$::jsonb),
    ($lit$SRC-D1-S4-006$lit$, $lit${"material_items": "M1 the participant saw a manual override. M2 Marek performed it. M3 Marek has", "information_made_available": "P0 the pre-brief: the participant saw Marek override the routing"}$lit$::jsonb),
    ($lit$SRC-D1-S4-007$lit$, $lit${"bearing_interest": "PRESENT. Decision point is the agreement at B4."}$lit$::jsonb),
    ($lit$SRC-D1-S4-008$lit$, $lit${"material_items": "M1 the working figure is forty-two. M2 the participant has seen a revised", "information_made_available": "P0 the pre-brief: the revised figure of thirty-one seen in a"}$lit$::jsonb),
    ($lit$SRC-D1-S4-009$lit$, $lit${"material_items": "M1 the dependency completes on the twenty-second. M2 the date under discussion", "information_made_available": "P0 the pre-brief: the dependency completes on the twenty-second,"}$lit$::jsonb),
    ($lit$SRC-D1-S4-010$lit$, $lit${"material_items": "M1 the pre-shift restraint check was required. M2 the participant did not", "information_made_available": "P0 the pre-brief: the participant skipped the pre-shift restraint"}$lit$::jsonb)
    ) AS t(source_identifier, sheet_patch)
  LOOP
    SELECT cv.content_version_id, cv.content_object_id, cv.version_no, cv.body
      INTO v
    FROM public.t3a_d1_content_version cv
    WHERE cv.superseded_by IS NULL
      AND cv.body ->> 'source_identifier' = c.source_identifier;

    CONTINUE WHEN v.content_version_id IS NULL;

    -- Already correct: supersede nothing. Re-running this migration must
    -- not manufacture a version that says the same thing as the one
    -- before it.
    CONTINUE WHEN coalesce(v.body -> 'source_sheet', '{}'::jsonb) @> c.sheet_patch;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v.content_object_id,
            v.version_no || '-sheet-fix',
            'drafting'::public.t3a_approval_status,
            'not_loaded'::public.t3a_operational_state,
            jsonb_set(v.body, '{source_sheet}',
                      coalesce(v.body -> 'source_sheet', '{}'::jsonb) || c.sheet_patch))
    RETURNING content_version_id INTO v_new;

    UPDATE public.t3a_d1_content_version
       SET superseded_by = v_new
     WHERE content_version_id = v.content_version_id;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::public.t3a_env_state,
            v.content_object_id, v_new,
            'DISABLED_PENDING_DECISION'::public.t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5: source-sheet fields re-extracted. The original load took the last regex match for a field, which in this source was question-applicability table text rather than the sheet entry. This version carries the values the source itself states.');

    v_rows := v_rows + 1;
  END LOOP;

  -- No standing version may still carry a question code where a sheet
  -- value belongs.
  SELECT count(*) INTO v_left
  FROM public.t3a_d1_content_version cv,
       lateral jsonb_each_text(coalesce(cv.body -> 'source_sheet', '{}'::jsonb)) kv
  WHERE cv.superseded_by IS NULL
    AND kv.value ~ '^Q-D1-[0-9]';

  RAISE NOTICE 'source sheets: % version(s) superseded, % question-coded value(s) left standing', v_rows, v_left;

  IF v_left > 0 THEN
    RAISE EXCEPTION 'SOURCE_SHEET_CORRECTION_INCOMPLETE: % question-coded value(s) still stand', v_left;
  END IF;
END;
$fixsheets$;
