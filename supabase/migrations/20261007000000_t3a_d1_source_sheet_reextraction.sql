-- =====================================================================
-- T3A-D1-EXEC-001 §5 — correcting the extracted source sheets
--
-- The load at 20260926000000 read each source's sheet with a regex that
-- took the LAST match for a field. Some sources state a field twice:
-- once as the source's own sheet entry, and once inside a later
-- question-applicability table whose rows read "Q-D1-03aDirect...". In
-- those sources the table text silently replaced the real value.
--
-- Taking the first match instead does not fix it, and the first attempt
-- at this migration proved it the hard way: measured against the item
-- shapes the sources themselves use (M1, A1, AS1, R-a), last-match
-- recovered 38/38/39/38 of forty and first-match 15/15/21/11. Rejecting
-- question-coded values alone was not enough either, because some of the
-- surplus occurrences are ordinary sentence fragments rather than table
-- rows — one left twenty-five sources with material_items = "and".
--
-- Position does not decide it; the value does, on two mechanical rules
-- and no knowledge of what any source says. A question-coded value is
-- never the sheet entry, and between the rest the sheet entry is the
-- fullest. That recovers 40/40/39/39, and
-- scripts/extract-d1-content.mjs now applies exactly that.
--
-- SCALE, stated plainly because the earlier report understated it. The
-- load report named two sources and two fields. Re-extracting under the
-- corrected rule changes 86 fields across 32 of the 40 sources. The
-- fields affected include material_items and assertion_reference_set —
-- which §1.5 makes the two lists a participant's claim is checked
-- against — as well as attribution_support_set, available_routes,
-- stated_standard, d1_situation_class and route_observation_basis.
--
-- TWO THE RULE CANNOT RECOVER, and they are left alone rather than
-- guessed: SRC-D1-S1-010 attribution_support_set and SRC-D1-S3-010
-- available_routes. Neither source states a recoverable sheet entry for
-- that field, so the reference card refuses the list and sends the
-- mentor to the source. They are recorded as outstanding.
--
-- HOW. A loaded version body is immutable, so this supersedes rather
-- than edits, exactly as the spelling correction did. Each affected
-- version is marked superseded by a new version carrying the corrected
-- sheet; the original stays as loaded, and the corrected value is the
-- one the source itself states.
--
-- WHAT IS NOT DONE HERE. Only the named keys change. The verbatim body
-- is carried across untouched, and no key absent from the correction set
-- is rewritten.
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
    ($lit$SRC-D1-S1-001$lit$, $lit${"material_items": "M1 the report was not sent by the deadline. M2 the participant was responsible", "assertion_reference_set": "A1 the client has not noticed. A2 the delay caused no harm. A3 the"}$lit$::jsonb),
    ($lit$SRC-D1-S1-010$lit$, $lit${"cross_context_map": "CA04_partC_version: not yet issued. This field points to the clause-specific", "available_routes": "R-a tell Victor before kickoff. R-b answer the client directly at R2. R-c ask"}$lit$::jsonb),
    ($lit$SRC-D1-S2-010$lit$, $lit${"route_observation_basis": "Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED", "relevant_conduct": "Whether the participant disclosed the source-defined interest relative to", "cross_context_map": "CA04_partC_version: not yet issued. This field points to the clause-specific", "source_version_hash": "Not assigned. REC-07 approvalABSENT on all ten.", "proposed_compatibility_class": "A — PROPOSED, subject to source approval, administration testing"}$lit$::jsonb),
    ($lit$SRC-D1-S3-010$lit$, $lit${"relevant_conduct": "Speaking style, assertiveness, volume, how much the participant said, whether", "material_items": "M1 the participant worked at Marlbeck until eighteen months ago. M2 the", "assertion_reference_set": "A1 the connection is purely historical. A2 the shareholding has been", "enquiry_point": "The written enquiry, within one working day of submission. THE FIRST ENQUIRY", "account_test_point": "The written follow-up.", "bearing_interest": "PRESENT. The decision point is the submission of the recommendation. The", "source_version_hash": "Not assigned. REC-07 approvalABSENT on all ten. Mentor reference", "max_seconds": "1200 minimum, 1800 maximum per session.", "proposed_compatibility_class": "A — PROPOSED, subject to source approval, administration testing"}$lit$::jsonb)
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
