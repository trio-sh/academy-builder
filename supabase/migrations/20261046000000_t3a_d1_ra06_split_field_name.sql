-- =====================================================================
-- RA-06 — a field name the conversion split in two
--
-- T3A-D1-REC07-REAPP-001 Issue 2 confirmed what the Issue 1 return had
-- only flagged as a suspicion: the trailing ".ir" on SRC-D1-S3-010
-- relevant_conduct is not prose. It is the first two characters of
-- `irrelevant_conduct`, and the "second" relevant_conduct bullet is that
-- field with its name beheaded. A field holds one value, so a sheet
-- stating the same name twice is showing a conversion fault.
--
-- THE GUARD. Three conditions must hold together for a repair: the next
-- bullet repeats the CURRENT field's name, the current value ends in a
-- short lowercase fragment, and fragment + next name is a field the
-- register knows. Requiring the repeat is what keeps this off ordinary
-- prose ending in a short word — and the repeat is itself the symptom.
--
-- BLAST RADIUS, MEASURED BEFORE IMPLEMENTING RATHER THAN AFTER. A split
-- repair SHRINKS a value, which under CS-I-44 reads as changed rather
-- than extended and would void a carry-forward. Scanning all forty live
-- source sheets for a value ending in a period plus a short lowercase
-- fragment returns exactly ONE hit: this field, on a source already
-- withdrawn. So no source holding a standing approval is touched, and no
-- further carry-forward is voided. The other six occurrences Issue 2
-- counts sit outside source sheets, in prose this parser never reads.
--
-- Only SRC-D1-S3-010 is superseded here. Re-running the whole load would
-- have produced thirty-nine identical bodies and thirty-nine pointless
-- versions.
-- =====================================================================

set search_path = public;

DO $ra06$
DECLARE
  v_old public.t3a_d1_content_version%ROWTYPE;
  v_new uuid;
BEGIN
  SELECT cv.* INTO v_old FROM public.t3a_d1_content_version cv
  WHERE cv.body ->> 'source_identifier' = 'SRC-D1-S3-010'
    AND cv.superseded_by IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RA06_SOURCE_NOT_FOUND: SRC-D1-S3-010 has no live version';
  END IF;

  IF (v_old.body -> 'source_sheet') IS NOT DISTINCT FROM $lit${"d1_situation_class":"S-5 a bearing interest, with S-1 an issue the participant knows and others do not.","relevant_conduct":"Whether the interest is declared and where; whether the evaluation account corresponds to the information the pack provided; what is said about the participant’s own position and about the named former colleagues; whether a corrective step and route are identified; and whether the account given at the enquiry changes at the account test.","irrelevant_conduct":"The quality of the evaluation, whether the recommendation is sound, formatting, structure, length, and which organisations were shortlisted.","information_made_available":"P0 the pre-brief: former employment ending eighteen months ago, a continuing shareholding in the trading subsidiary, an annual statement received in March, nobody at Elmsworth knows. I1 the three proposals. I2 the published criteria and scoring template. I3 the panel declarations form. I4 two named former colleagues in the Marlbeck proposal. I5 the Marlbeck bid is lowest priced. I6 the enquiry question. I7 the account test question.","material_items":"M1 the participant worked at Marlbeck until eighteen months ago. M2 the participant holds a continuing shareholding in its trading subsidiary. M3 the participant received a statement in March. M4 the participant is evaluating that bidder. M5 the declarations form was in the pack.","information_withheld":"Whether the interest would disqualify the participant. Whether Elmsworth has a threshold for shareholdings. Whether the named former colleagues would recognise the participant’s involvement.","assertion_reference_set":"A1 the connection is purely historical. A2 the shareholding has been disposed of. A3 the organisation has no declaration requirement. A4 the participant became aware of the connection only at the enquiry. A5 the shareholding is too small to require declaration.","attribution_support_set":"Empty. The interest is the participant’s own and the pack provides no other responsible party.","enquiry_point":"The written enquiry, within one working day of submission. THE FIRST ENQUIRY POINT ANYWHERE IN THE STAGE 3 BANK.","account_test_point":"The written follow-up.","post_test_account_opportunity":"TRUE, one working day.","available_routes":"R-a the declarations form in the pack. R-b a note in the recommendation itself. R-c a separate message to the requesting manager before submitting. R-d the response to the enquiry.","other_route_classification":"Permitted where the submission or responses evidence the means used.","accountable_actor_available":"True — the requesting manager, the panel chair.","time_reference_called_for":"False. The brief sets deadlines for the deliverables but calls for no time reference in the corrective step.","bearing_interest":"PRESENT. The decision point is the submission of the recommendation. The enquiry follows it, so disclosure before the decision, after it, and not at all are all reachable, and the prompt condition is separately observable. Authorship provenanceCaptured across all three deliverables and both responses. Legal route statusRUNTIME RECORD NOT YET CREATED — EXPECTED, as for the rest of the Stage 3 bank. See Section 11.","administration_timing_protocol":"— SOURCE-SPECIFIC OVERRIDETHIS SOURCE OVERRIDES THE PART-LEVEL COMMON RULE. The common Stage 3 administration is three CALENDAR days from assignment. This source runs three WORKING days for submission, then up to one working day for the enquiry, then a further working-day response window for the account test. That is a materially different observation window and administration sequence, not a minor variation, and it is stated here as an override rather than left to be inferred. Duration boundsSubmission window three working days; enquiry window one working day; account-test response window one working day. Total elapsed span materially longer than the other nine Stage 3 sources. Comparability treatmentThe longer span and the review exchange make this source NOT directly comparable with the other nine on administration conditions. Pairings involving it require the CA-04 Part C relationship to state the difference explicitly."}$lit$::jsonb THEN
    RAISE NOTICE 'RA-06: SRC-D1-S3-010 already carries the repaired sheet';
    RETURN;
  END IF;

  INSERT INTO public.t3a_d1_content_version
    (content_object_id, version_no, approval_status, operational_state,
     approved_by, approved_at, effective_at, body, created_by)
  VALUES
    (v_old.content_object_id,
     'v' || (coalesce(nullif(regexp_replace(v_old.version_no, '\D', '', 'g'), ''), '1')::int + 1),
     v_old.approval_status, v_old.operational_state,
     v_old.approved_by, v_old.approved_at, v_old.effective_at,
     jsonb_set(v_old.body, '{source_sheet}', $lit${"d1_situation_class":"S-5 a bearing interest, with S-1 an issue the participant knows and others do not.","relevant_conduct":"Whether the interest is declared and where; whether the evaluation account corresponds to the information the pack provided; what is said about the participant’s own position and about the named former colleagues; whether a corrective step and route are identified; and whether the account given at the enquiry changes at the account test.","irrelevant_conduct":"The quality of the evaluation, whether the recommendation is sound, formatting, structure, length, and which organisations were shortlisted.","information_made_available":"P0 the pre-brief: former employment ending eighteen months ago, a continuing shareholding in the trading subsidiary, an annual statement received in March, nobody at Elmsworth knows. I1 the three proposals. I2 the published criteria and scoring template. I3 the panel declarations form. I4 two named former colleagues in the Marlbeck proposal. I5 the Marlbeck bid is lowest priced. I6 the enquiry question. I7 the account test question.","material_items":"M1 the participant worked at Marlbeck until eighteen months ago. M2 the participant holds a continuing shareholding in its trading subsidiary. M3 the participant received a statement in March. M4 the participant is evaluating that bidder. M5 the declarations form was in the pack.","information_withheld":"Whether the interest would disqualify the participant. Whether Elmsworth has a threshold for shareholdings. Whether the named former colleagues would recognise the participant’s involvement.","assertion_reference_set":"A1 the connection is purely historical. A2 the shareholding has been disposed of. A3 the organisation has no declaration requirement. A4 the participant became aware of the connection only at the enquiry. A5 the shareholding is too small to require declaration.","attribution_support_set":"Empty. The interest is the participant’s own and the pack provides no other responsible party.","enquiry_point":"The written enquiry, within one working day of submission. THE FIRST ENQUIRY POINT ANYWHERE IN THE STAGE 3 BANK.","account_test_point":"The written follow-up.","post_test_account_opportunity":"TRUE, one working day.","available_routes":"R-a the declarations form in the pack. R-b a note in the recommendation itself. R-c a separate message to the requesting manager before submitting. R-d the response to the enquiry.","other_route_classification":"Permitted where the submission or responses evidence the means used.","accountable_actor_available":"True — the requesting manager, the panel chair.","time_reference_called_for":"False. The brief sets deadlines for the deliverables but calls for no time reference in the corrective step.","bearing_interest":"PRESENT. The decision point is the submission of the recommendation. The enquiry follows it, so disclosure before the decision, after it, and not at all are all reachable, and the prompt condition is separately observable. Authorship provenanceCaptured across all three deliverables and both responses. Legal route statusRUNTIME RECORD NOT YET CREATED — EXPECTED, as for the rest of the Stage 3 bank. See Section 11.","administration_timing_protocol":"— SOURCE-SPECIFIC OVERRIDETHIS SOURCE OVERRIDES THE PART-LEVEL COMMON RULE. The common Stage 3 administration is three CALENDAR days from assignment. This source runs three WORKING days for submission, then up to one working day for the enquiry, then a further working-day response window for the account test. That is a materially different observation window and administration sequence, not a minor variation, and it is stated here as an override rather than left to be inferred. Duration boundsSubmission window three working days; enquiry window one working day; account-test response window one working day. Total elapsed span materially longer than the other nine Stage 3 sources. Comparability treatmentThe longer span and the review exchange make this source NOT directly comparable with the other nine on administration conditions. Pairings involving it require the CA-04 Part C relationship to state the difference explicitly."}$lit$::jsonb),
     v_old.created_by)
  RETURNING content_version_id INTO v_new;

  UPDATE public.t3a_d1_content_version
     SET superseded_by = v_new
   WHERE content_version_id = v_old.content_version_id;

  -- The source was already withdrawn under CS-I-45, so there is no
  -- standing approval to carry and none is written. It stays unservable
  -- until the signed REAPP-001 Issue 2 arrives.
  RAISE NOTICE 'RA-06: SRC-D1-S3-010 superseded, relevant_conduct repaired and irrelevant_conduct recovered';
END
$ra06$;
