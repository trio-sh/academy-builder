-- =====================================================================
-- T3A-D1-EXEC-001 Section 5 — content load
--
-- GENERATED from the issued Execution Edition by
-- scripts/extract-d1-content.mjs. Every value below is parsed from that
-- document. Nothing is authored, inferred or defaulted here.
--
-- Section 5.18: every source loads with NO source_version_hash and NO
-- REC-07 approval. The registry admits them as content and refuses to
-- serve any of them into a real run until those records exist. That
-- refusal is the control. A source that served today would mean a
-- control had failed.
-- =====================================================================

-- ── 5.7 Layer 1 statement library — 44 statements ──
DO $stmtlib$
DECLARE v_obj uuid; v_ver uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.t3a_d1_statement_library
             WHERE dimension_id = 'D1' AND question_set_version = 'v1') THEN
    RAISE NOTICE 'D1 statement library already loaded; nothing to do';
    RETURN;
  END IF;

  INSERT INTO public.t3a_content_object
    (identifier, family, title, dimension_id, current_operational_state)
  VALUES ('T3A-D1-STMT-L1', 'statement_library'::t3a_content_family,
          'D1 Layer 1 statement library', 'D1', 'not_loaded'::t3a_operational_state)
  ON CONFLICT (family, identifier) DO UPDATE SET updated_at = now()
  RETURNING content_object_id INTO v_obj;

  INSERT INTO public.t3a_d1_content_version
    (content_object_id, version_no, approval_status, operational_state, body)
  VALUES (v_obj, 'v1', 'drafting'::t3a_approval_status,
          'not_loaded'::t3a_operational_state,
          jsonb_build_object('register', 'T3A-D1-EXEC-001 section 5.7'))
  RETURNING content_version_id INTO v_ver;

  INSERT INTO public.t3a_d1_statement_library
    (statement_library_id, content_version_id, dimension_id, question_set_version,
     stage_code, statement_key, statement_body, bound_variables,
     bound_condition_renderings, retired)
  VALUES
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-011$lit$, $lit$the participant stated that a specific issue existed and identified what it was.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-01 — Named the specific issue"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-012$lit$, $lit$the participant indicated that something was wrong without identifying what it was.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-01 — Referred to a problem without identifying it"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-013$lit$, $lit$no reference to an issue was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-01 — Did not refer to any issue"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-021$lit$, $lit$the participant raised the issue before being asked about it.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-02 — Before the enquiry"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-022$lit$, $lit$the participant raised the issue when asked about it.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-02 — After the enquiry, in response to it"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-023$lit$, $lit$the participant raised the issue later in the exchange, having not done so when asked.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-02 — After the enquiry, not in response to it"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-024$lit$, $lit$no mention of the issue was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-02 — Not within the observed period"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-031$lit$, $lit$the account the participant gave was consistent with the source-provided information identified for this observation.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-03a — Corresponded"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-032$lit$, $lit$the account was consistent with the source-provided information identified for this observation, and did not include {omitted_items}.$lit$, ARRAY['omitted_items']::text[],
     $lit${"question_and_answer":"Q-D1-03a — Corresponded, with an omission"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-033$lit$, $lit$the account included a statement the source-provided information does not support.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-03a — Included an unsupported claim"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-034$lit$, $lit$the account did not include {omitted_items} and included a statement the source-provided information does not support.$lit$, ARRAY['omitted_items']::text[],
     $lit${"question_and_answer":"Q-D1-03a — Both"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-035$lit$, $lit$no account was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-03a — No account given"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-041$lit$, $lit$the participant stated what they themselves had done.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04a — Described their own part"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-042$lit$, $lit$the participant referred to their own involvement without stating what they had done.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04a — In general terms only"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-043$lit$, $lit$no statement about the participant’s own involvement was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04a — Did not describe their own part"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-044$lit$, $lit$the participant made no statement attributing responsibility to another person.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04b — No attribution to another person"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-045$lit$, $lit$the participant used responsibility language about another person that mapped to the source’s pre-defined support set.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04b — Aligned to the support set"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-047$lit$, $lit$the participant attributed responsibility to another person, and one or more of those attributions did not correspond to the information the source provided.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04b — Both aligned and non-aligned attributions"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-046$lit$, $lit$the participant attributed responsibility to another person in terms the source information does not provide.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-04b — Not aligned to the support set"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-051$lit$, $lit$the participant identified a specific action to address the issue.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05a — Identified a specific corrective action"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-052$lit$, $lit$the participant indicated that action should be taken without identifying what.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05a — Referred to acting without identifying an action"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-053$lit$, $lit$no reference to a corrective action was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05a — Did not refer to any corrective action"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-054a$lit$, $lit$the participant identified an available actor to carry the action out.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05b1 — Identified an accountable actor"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-054b$lit$, $lit$the participant identified an available route for the action.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05b2 — Identified an available route"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-055a$lit$, $lit$where the source made an actor available, no accountable actor was identified in the response.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05b1 — Did not identify an accountable actor"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-055b$lit$, $lit$where the source made a route available, no route was identified in the response.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05b2 — Did not identify an available route"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-055c$lit$, $lit$the participant identified a route for the action that the situation did not provide.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05b2 — Identified a route not listed by the source"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-056$lit$, $lit$the participant identified when the action would occur.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05c — Identified a time reference"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-057$lit$, $lit$the participant did not identify when the action would occur.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-05c — Did not"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-061$lit$, $lit$the participant raised the issue through {route_used}.$lit$, ARRAY['route_used']::text[],
     $lit${"question_and_answer":"Q-D1-06 — Used a route listed on the source sheet"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-062$lit$, $lit$the participant raised the issue through a means the situation did not provide.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-06 — Used a route not listed"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-063$lit$, $lit$no use of an available route was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-06 — Used no route"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-071$lit$, $lit$when the account was questioned, the second account did not differ from the first on the material items defined for the source.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-07 — The account did not change"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-072$lit$, $lit$when the account was questioned, the participant added information not in the first account.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-07 — Changed by adding information"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-073$lit$, $lit$when the account was questioned, information in the first account was absent from the second.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-07 — Changed by withdrawing information"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-074$lit$, $lit$when the account was questioned, the participant added information not in the first account, and information in the first account was absent from the second.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-07 — Changed in both directions"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-075$lit$, $lit$no account was observed at the point the source places the question.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-07 — No account at the point of testing"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-081$lit$, $lit$the participant disclosed the interest before the decision was taken.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08a — Before the decision"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-085$lit$, $lit$the participant disclosed the interest at the point the decision was taken.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08a — At the decision point"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-082$lit$, $lit$the participant disclosed the interest after the decision was taken.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08a — After the decision"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-083$lit$, $lit$The disclosure followed a direct question about the interest.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08b — In response to a direct question"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-083b$lit$, $lit$The disclosure was made before any direct question about the interest.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08b — Before any direct question"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-083c$lit$, $lit$the disclosure was made after a direct question about the interest and did not answer it.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08b — After the direct question, not in response to it"}$lit$::jsonb, false),
    (gen_random_uuid(), v_ver, 'D1', 'v1',
     'S1'::t3a_stage_code, $lit$ST-D1-084$lit$, $lit$no disclosure of the interest was observed within the recorded period.$lit$, ARRAY[]::text[],
     $lit${"question_and_answer":"Q-D1-08a — Not within the observed period"}$lit$::jsonb, false)
  ON CONFLICT DO NOTHING;
END;
$stmtlib$;

-- ── 5.17 Controlled language templates — 14 templates ──
INSERT INTO public.t3a_d1_language_template
  (language_template_id, dimension_id, template_body, bound_variables,
   eligible_states, precedence, retired)
VALUES
  ($lit$L-D1-ONE-001$lit$, 'D1', $lit$In one situation, recorded in {context_label} on {observation_date}: {observation_statement}$lit$, ARRAY['context_label','observation_date','observation_statement']::text[],
   ARRAY['single_event']::t3a_d1_evidence_state[], 1, false),
  ($lit$L-D1-MC-001$lit$, 'D1', $lit$Conduct was recorded in more than one approved context. The source-linked statements are shown by setting below; they are not combined into a new conclusion.$lit$, ARRAY[]::text[],
   ARRAY['multi_context']::t3a_d1_evidence_state[], 2, false),
  ($lit$L-D1-REC-001$lit$, 'D1', $lit$Across {n} recorded Stage contexts identified in this report, the following was recorded in each: {observation_statement}$lit$, ARRAY['n','observation_statement']::text[],
   ARRAY['multi_context']::t3a_d1_evidence_state[], 3, false),
  ($lit$L-D1-DIV-001$lit$, 'D1', $lit$Differences across settings were recorded for this dimension. They are shown separately below and are not averaged into a single conclusion.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 4, false),
  ($lit$L-D1-ATT-001$lit$, 'D1', $lit$An earlier attempt recorded different conduct. Both attempts remain in the full record; neither is discarded or overwritten.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 5, false),
  ($lit$L-D1-COMP-001$lit$, 'D1', $lit$Interpretation of this observation is limited because the recorded administration conditions differed from the approved conditions in a way that affects comparability. The limitation is retained with the observation and the observation is not used to support a broader cross-context claim unless the governing comparability rule permits it.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 6, false),
  ($lit$L-D1-EXP-001$lit$, 'D1', $lit$This observation remains in the historical record but is outside the current evidence-currency period and does not contribute to the current evidence state.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 7, false),
  ($lit$L-D1-AMEND-001$lit$, 'D1', $lit$This statement was amended through the governed correction process. The earlier version is superseded and remains in the audit history.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 8, false),
  ($lit$L-D1-WITH-001$lit$, 'D1', $lit$This observation was withdrawn through the governed correction process and does not contribute to the current report.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 9, false),
  ($lit$L-D1-SINGLE-001$lit$, 'D1', $lit$The reportable evidence represented here was contributed by one authorized observer. This describes the provenance of the record and is not a quality statement.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 10, false),
  ($lit$L-D1-MULTI-001$lit$, 'D1', $lit$Reportable evidence represented here was contributed across settings by more than one authorized observer. No single observer controls the picture across those settings.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 11, false),
  ($lit$L-D1-S1-001$lit$, 'D1', $lit$Stage 1 was administered through a defined artificial-intelligence process. Any Stage 1 observation entering the evidence record required authorized human confirmation.$lit$, ARRAY[]::text[],
   ARRAY[]::t3a_d1_evidence_state[], 12, false),
  ($lit$D1-SCOPE-001$lit$, 'D1', $lit$This report currently contains observed conduct for one behavioral dimension only. It is not a complete account of the participant's workplace conduct, and unlisted dimensions have not been observed through this report.$lit$, ARRAY[]::text[],
   ARRAY['insufficient']::t3a_d1_evidence_state[], 13, false),
  ($lit$UNREP-001$lit$, 'D1', $lit$Dimensions not represented in this report are not conclusions about the participant. No recorded conduct is represented for those dimensions during this report period, or they were outside the activated report scope. No result exists for them in this report.$lit$, ARRAY[]::text[],
   ARRAY['insufficient']::t3a_d1_evidence_state[], 14, false)
ON CONFLICT (language_template_id) DO NOTHING;

-- ── 5.2, 5.3, 5.4 — moved to 20260927100000_t3a_d1_capture_content_load.sql ──
--
-- The question object register, the response capture catalogue and the
-- branch rules load into tables that 20260927000000 creates. This file
-- sorts first, so they ran before those tables existed and aborted the
-- whole load. They are unchanged, in a file that sorts after the DDL.

-- ── 5.18 The D1 source library — 40 sources ──
-- Loaded verbatim as content. Applicability is read from each source
-- sheet in the body, never inferred from the Stage.

DO $load$
DECLARE
  v_object  uuid;
  v_version uuid;
  v_source  uuid;
  v_sv      uuid;
BEGIN

  -- SRC-D1-S1-001 — THE UNSENT REPORT
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-001$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-001$lit$, 'source'::t3a_content_family, $lit$THE UNSENT REPORT$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-001$lit$,
              'title', $lit$THE UNSENT REPORT$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"workplace_demand":"Deciding what to do about a client deliverable the participant was","stated_standard":"none","stated_standard_source_quote_or_location":"none - the source establishes a deadline and an","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","relevant_conduct":"Naming the unsent report as a specific issue; the point at which it is first","d1_situation_class":"S-1. An error exists, the participant knows of it, another party is","information_made_available":"I1 the participant was responsible for sending by Friday 5:00 PM.","material_items":"M1 the report was not sent by the deadline. M2 the participant was responsible","information_withheld":"Whether the client has noticed. Whether the manager has already spoken to","assertion_reference_set":"A1 the client has not noticed. A2 the delay caused no harm. A3 the","attribution_support_set":"AS1 an urgent request from another client arrived on Friday afternoon","enquiry_point":"R2.","account_test_point":"R4.","post_test_account_opportunity":"true.","available_routes":"R-a reply to the manager. R-b send the report to the client. R-c telephone","accountable_actor_available":"True — the manager, the participant.","time_reference_called_for":"False. R3 asks what will change, not when.","bearing_interest":"None.","min_seconds":",","max_seconds":"600 / 1500."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-001 — THE UNSENT REPORT

Migrated from scenario 1.1.1 Ownership or Cover-Up. Situation class S-1.

**The situation, as the participant meets it**

You are a project coordinator at Ashcombe Practice, a consulting firm. Last week you were
responsible for sending a compliance audit report to Northmere Client Services by Friday at 5:00 PM.
The report was finished on time by your team. Your manager asked you to send it before you left. You
did not send it. An urgent request came in from another client on Friday afternoon, you dealt with
that, and you left for the weekend without sending the report. It is Monday morning. Your manager
has not mentioned it. The client has not contacted you. The unsent report is in your drafts folder.

**Reveal sequence**

- **R1** What do you do now? Describe your next steps. Opening
- **R2** A message from your manager: “Hey, just checking — did the Northmere report go out on
  Friday?” Write your reply. Enquiry point
- **R3** Your manager replies: “This is disappointing. What are you going to do to make sure this
  doesn’t happen again?” — Corrective prompt
- **R4** “Just so I have the timeline right — when did you realise it hadn’t gone?” — Account test —
  authored

**Authored account-test reveal**

The legacy narrative ended at R3. Without R4 nothing tests the account and CE-07 is unobservable.

**Source sheet**

- `workplace_demand` — Deciding what to do about a client deliverable the participant was
  responsible for sending and did not send, once the manager asks directly.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - the source establishes a deadline and an
  instruction but no explicit rule, policy or operating standard.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `relevant_conduct` — Naming the unsent report as a specific issue; the point at which it is first
  raised relative to the manager’s question; whether the account corresponds to the source-provided
  information; what is said about the participant’s own part and about the other client’s request;
  identifying a corrective action and an accountable actor; whether an available route was
  identified as part of a stated corrective action; and whether the account changes when the
  timeline is asked about.
- `d1_situation_class` — S-1. An error exists, the participant knows of it, another party is
  affected.
- `information_made_available` — I1 the participant was responsible for sending by Friday 5:00 PM.
  I2 the report was finished on time by the team. I3 the manager asked them to send it before
  leaving. I4 an urgent request from another client arrived Friday afternoon. I5 the report was not
  sent. I6 it is Monday; the manager has not mentioned it; the client has not made contact. I7 the
  report is in drafts. I8 at R2, the manager’s direct question. I9 at R3, the manager’s corrective
  prompt. I10 at R4, the timeline question.
- `material_items` — M1 the report was not sent by the deadline. M2 the participant was responsible
  for sending it. M3 BY MONDAY MORNING the participant knows the report was not sent. M4 the delay
  runs from Friday 5:00 PM to the present. CORRECTED: M3 previously read that the participant BECAME
  AWARE on Monday morning. The narrative does not establish first awareness — leaving for the
  weekend without sending it permits an inference that they knew on Friday. An ambiguous chronology
  must not be converted into a material fact.
- `information_withheld` — Whether the client has noticed. Whether the manager has already spoken to
  the client. What the other client’s request was.
- `assertion_reference_set` — A1 the client has not noticed. A2 the delay caused no harm. A3 the
  report was sent and transmission failed. A4 the team finished late. A5 the manager was told on
  Friday. A6 the other request was more urgent than the deadline.
- `attribution_support_set` — AS1 an urgent request from another client arrived on Friday afternoon
  and the participant dealt with it. One item only — blaming the team contradicts I2, blaming the
  manager contradicts I3.
- `enquiry_point` — R2.
- `account_test_point` — R4.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a reply to the manager. R-b send the report to the client. R-c telephone
  the client. R-d raise it with the team. S1 route-status ruleThe listed routes provide SOURCE
  CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at Stage 1. No
  written response in this source is recorded as using, taking, following, choosing or acting
  through a route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a
  missing-state code, because the question is not served.other_route_classificationNot applicable at
  Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — the manager, the participant.
- `time_reference_called_for` — False. R3 asks what will change, not when.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 600 / 1500.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectA defined issue exists and the participant can name
itI5, M1Q-D1-02DirectDefined enquiry point

- **R2**
- **Q-D1-03a** — Direct: Source information plus material itemsI1–I10, M1–M4Q-D1-03b1Conditional03a
  identifies an omission
- `material_items` — Q-D1-03b2Conditional03a identifies an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectThe participant’s own part is in issueI1,
  I5Q-D1-04bDirectSupport set non-emptyAS1Q-D1-05aDirectR3 invites a corrective action
- **R3**
- **Q-D1-05b1** — Direct: Actor availablemanager, participantQ-D1-05b2DirectRoutes availableR-a to
  R-dQ-D1-05cNOT SERVEDR3 asks what will change, not when—
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: First account, test and post-test window all existR2,
- **R4** Q-D1-08a/08bNOT SERVEDNo bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-002 — THE KITCHEN CONVERSATION
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-002$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-002$lit$, 'source'::t3a_content_family, $lit$THE KITCHEN CONVERSATION$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-002$lit$,
              'title', $lit$THE KITCHEN CONVERSATION$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"relevant_conduct":"Naming the factual issue in the conversation; the point at which it is first","workplace_demand":"Responding to colleagues who invite a view on a team lead, while holding","stated_standard":"none","stated_standard_source_quote_or_location":"none.","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","d1_situation_class":"S-6 conduct by another requiring a response, with S-7 restricted","information_made_available":"I1 Sarah’s characterisation of the email. I2 Amit’s","material_items":"M1 the email was factually accurate. M2 the metrics have declined. M3 the VP","information_withheld":"Whether Marcus is actually seeking the promotion. Whether anyone else has","assertion_reference_set":"A1 Marcus is seeking the VP role. A2 Marcus wrote the email to look","attribution_support_set":"AS1 Sarah characterised the email as out of line. AS2 Amit attributed","enquiry_point":"R2.","account_test_point":"R3.","post_test_account_opportunity":"true.","available_routes":"R-a answer the colleagues directly. R-b decline to comment. R-c raise it with","accountable_actor_available":"True — Marcus, the participant.","time_reference_called_for":"False.","bearing_interest":"None.","min_seconds":",","max_seconds":"360 / 900."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-002 — THE KITCHEN CONVERSATION

Migrated from scenario 1.1.2 Gossip at the Water Cooler. Situation class S-6 with S-7.

**The situation, as the participant meets it**

You work at Marlowe Ridge Agency, a marketing agency. During lunch you are in the kitchen when two
colleagues, Sarah and Amit, start talking about your team lead, Marcus. Sarah says Marcus’s email
about the new social media policy was out of line and accused everyone of wasting time on their
phones. Amit says Marcus is only trying to look good for the promotion and has been micromanaging
since he heard about the VP opening. They both turn to you: “What do you think? You work with him
the closest.”You know that Marcus’s email was firm but factually accurate — the team’s social media
metrics have declined. You have heard that Marcus is being considered for a VP role, but this has
not been announced.

**Reveal sequence**

- **R1** What do you say? Write your exact response. Opening
- **R2** Sarah presses: “Come on, you must have an opinion. Is he gunning for the VP job or not?” —
  Enquiry point
- **R3** Later that afternoon Marcus asks you: “I heard people were talking about my email at lunch.
  What was said?” — Account test — authored

**Authored account-test reveal**

The legacy narrative ended after the peer exchange. R3 places the same facts before a different
listener, which is what makes the account testable.

**Source sheet**

- `relevant_conduct` — Naming the factual issue in the conversation; the point at which it is first
  raised relative to the direct question; whether any account about the email or the promotion
  corresponds to source-provided information; and whether that account changes when Marcus later
  asks what was said.
- `workplace_demand` — Responding to colleagues who invite a view on a team lead, while holding
  accurate information about the underlying facts.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `d1_situation_class` — S-6 conduct by another requiring a response, with S-7 restricted
  information present.
- `information_made_available` — I1 Sarah’s characterisation of the email. I2 Amit’s
  characterisation of Marcus’s motive. I3 the direct question to the participant. I4 the email was
  firm and factually accurate. I5 the metrics have declined. I6 the VP consideration is unannounced.
  I7 at R2, Sarah’s press. I8 at R3, Marcus’s question.
- `material_items` — M1 the email was factually accurate. M2 the metrics have declined. M3 the VP
  consideration is unannounced.
- `information_withheld` — Whether Marcus is actually seeking the promotion. Whether anyone else has
  complained. What Marcus’s intent was.
- `assertion_reference_set` — A1 Marcus is seeking the VP role. A2 Marcus wrote the email to look
  good. A3 the email was inaccurate. A4 the whole team agrees with Sarah. A5 the VP opening has been
  announced.
- `attribution_support_set` — AS1 Sarah characterised the email as out of line. AS2 Amit attributed
  a motive to Marcus. Attributions to Sarah or Amit of what they actually said map here;
  attributions of what they meant do not.
- `enquiry_point` — R2.
- `account_test_point` — R3.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a answer the colleagues directly. R-b decline to comment. R-c raise it with
  Marcus. R-d raise it with a manager. S1 route-status ruleThe listed routes provide SOURCE CONTEXT
  FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at Stage 1. No written
  response in this source is recorded as using, taking, following, choosing or acting through a
  route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a missing-state code,
  because the question is not served.other_route_classificationNot applicable at Stage 1 while
  Q-D1-06 is not served.
- `accountable_actor_available` — True — Marcus, the participant.
- `time_reference_called_for` — False.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 360 / 900.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectThe email’s accuracy is a nameable
issueI4Q-D1-02DirectDefined enquiry point

- **R2**
- **Q-D1-03a** — Conditional: Only where the participant gives an account of the email or the VP
  matterI4, I6Q-D1-03b1/b2ConditionalOn 03alistsQ-D1-04a — ConditionalThe participant has no part in
  the events; only arises if they claim one—
- **Q-D1-04b** — Conditional: Support set covers what Sarah and Amit SAID, not what they meantAS1,
  AS2Q-D1-05a/05b1/05b2/05cNOT SERVEDNo corrective-action problem. A general what-do-you-say prompt
  is not a correction opportunity—
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: R3 places the same facts before a different listener
- **R3** Q-D1-08a/08bNOT SERVEDNo bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-003 — THE CONNECTION REQUESTS
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-003$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-003$lit$, 'source'::t3a_content_family, $lit$THE CONNECTION REQUESTS$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-003$lit$,
              'title', $lit$THE CONNECTION REQUESTS$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"serving_eligible":"false","recurrence_eligible":"false","replacement_required":"trueID reuseSRC-D1-S1-003 IS NOT REUSED. A future replacement receives a","d1_situation_class":"S-5. The participant holds a relationship bearing on a decision they are","information_made_available":"I1 three requests across three platforms. I2 the content of the","material_items":"M1 three separate requests were received. M2 the personal profiles contain","information_withheld":"Whether David expects acceptance. Whether anyone declined. Whether David","assertion_reference_set":"A1 the company has a policy. A2 everyone on the team accepted all","attribution_support_set":"Empty. Nothing here attributes responsibility to another person.","enquiry_point":"R2, authored.","account_test_point":"R3, authored.","post_test_account_opportunity":"true.","available_routes":"R-a respond to David directly. R-b accept or decline without comment. R-c ask","accountable_actor_available":"True — David, human resources.","time_reference_called_for":"False.","bearing_interest":"NONE. See the note below.","min_seconds":",","max_seconds":"360 / 900."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-003 — THE CONNECTION REQUESTS

Migrated from scenario 1.1.3 Friend Request from the Boss. Situation class S-5.

**The situation, as the participant meets it**

You have worked at Willowgate Practice Group for three months. Your direct manager, David Chen, has
sent you three connection requests: LinkedIn, Facebook and Instagram. Your Facebook profile includes
family photos, political opinions and weekend activities. Your Instagram includes travel photos and
your social life. David is well liked and has been supportive of your onboarding. Most of the team
has accepted his LinkedIn request. The company has no formal policy on manager-employee connections.

**Reveal sequence**

- **R1** What do you do with each of the three requests? Explain your reasoning. Opening
- **R2** A week later David mentions in passing: “I sent you a couple of requests — did they come
  through?” — Enquiry point — authored
- **R3** David adds: “No problem either way. I just wondered when you saw them.” — Account test —
  authored

**Authored account-test reveal**

The legacy narrative had two questions and no enquiry from another party. R2 and R3 were authored so
that CE-02 and CE-07 are observable.

**Source sheet**

source_statusretired_from_D1_production

- `serving_eligible` — false
- `recurrence_eligible` — false
- `replacement_required` — trueID reuseSRC-D1-S1-003 IS NOT REUSED. A future replacement receives a
  NEW identifier, e.g. SRC-D1-S1-011. Append-only lineage; prevents accidental reactivation.
- `d1_situation_class` — S-5. The participant holds a relationship bearing on a decision they are
  part of.
- `information_made_available` — I1 three requests across three platforms. I2 the content of the
  personal profiles. I3 David’s standing and support. I4 most of the team accepted LinkedIn. I5
  there is no company policy. I6 at R2, David’s question. I7 at R3, the timing question. CORRECTED:
  a detail about differing political views was removed. It introduced a sensitive topic without
  adding to the observable D1 demand, and could influence responses for reasons unrelated to the
  conduct being recorded. No conduct element required it.
- `material_items` — M1 three separate requests were received. M2 the personal profiles contain
  personal content. M3 there is no policy.
- `information_withheld` — Whether David expects acceptance. Whether anyone declined. Whether David
  can see who accepted.
- `assertion_reference_set` — A1 the company has a policy. A2 everyone on the team accepted all
  three. A3 David will react badly to a decline. A4 the requests were sent in error.
- `attribution_support_set` — Empty. Nothing here attributes responsibility to another person.
- `enquiry_point` — R2, authored.
- `account_test_point` — R3, authored.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a respond to David directly. R-b accept or decline without comment. R-c ask
  a colleague what they did. R-d ask human resources. S1 route-status ruleThe listed routes provide
  SOURCE CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at
  Stage 1. No written response in this source is recorded as using, taking, following, choosing or
  acting through a route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a
  missing-state code, because the question is not served.other_route_classificationNot applicable at
  Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — David, human resources.
- `time_reference_called_for` — False.
- `bearing_interest` — NONE. See the note below.
- `min_seconds` — ,
- `max_seconds` — 360 / 900.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01NOT SERVEDThe source defines no D1 issue. A participant
response cannot create the element—

- **Q-D1-02** — NOT SERVED: There is nothing to have raised. An authored enquiry point does not make
  timing observable—
- **Q-D1-03a** — NOT SERVED: The source establishes no account against which correspondence can be
  tested—Q-D1-03b1/b2NOT SERVEDParent not served—Q-D1-04a/04bNOT SERVEDNo responsibility question
  arises; support set empty—Q-D1-05a to 05cNOT SERVEDNo corrective-action problem exists—
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — NOT SERVED: R3 tests when the requests were noticed, not whether a substantive
  account changed—Q-D1-08a/08bNOT SERVEDREMOVED. See Section 12.1.2—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-004 — BATCH 47
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-004$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-004$lit$, 'source'::t3a_content_family, $lit$BATCH 47$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-004$lit$,
              'title', $lit$BATCH 47$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"workplace_demand":"Deciding whether to sign off an inspection when required checks are","stated_standard":"Every batch must pass a twelve-point inspection checklist before shipping.","stated_standard_source_quote_or_location":"Opening paragraph: every batch passes a twelve-point","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","relevant_conduct":"Naming the gaps on the check sheet; timing relative to Rachel’s question;","d1_situation_class":"S-3 a control could be bypassed advantageously, with S-1 an existing","information_made_available":"I1 the twelve-point checklist is mandatory before shipping. I2 the","material_items":"M1 points 3 and 5 lack recorded measurements. M2 point 9 takes forty-five","information_withheld":"Whether the components are in fact sound. Whether Tom performed the","assertion_reference_set":"A1 the components are fine. A2 Tom performed the tests. A3 the","attribution_support_set":"AS1 points 1 to 7 are signed off by Tom. AS2 points 3 and 5 carry no","enquiry_point":"R2.","account_test_point":"R4.","post_test_account_opportunity":"true.","available_routes":"R-a tell Rachel directly. R-b record the gaps on the sheet. R-c raise it with","accountable_actor_available":"True — Rachel, Tom, the participant.","time_reference_called_for":"TRUE. R3 asks what to tell the client, which calls for a time.","bearing_interest":"None.","min_seconds":",","max_seconds":"480 / 1500."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-004 — BATCH 47

Migrated from scenario 1.1.4 Shortcut or Violation. Situation class S-3 with S-1.

**The situation, as the participant meets it**

You are a quality assurance coordinator at Brackwater Components. The company produces safety
components for commercial elevators. Every batch passes a twelve-point inspection checklist before
shipping. It is 2:30 on Friday afternoon. A large shipment to your biggest client, Highfell Building
Systems, is scheduled to go out by 5:00 PM. Your supervisor Rachel says the company is running
behind, Highfell is already upset about the last delay, and asks you to sign off the inspection for
Batch 47 — points 1 to 7 have been completed by the morning shift, so you need only do 8 to
12.Looking at the sheet you notice that Tom’s signatures on points 3 and 5 are recorded with no
measurement values, and that point 9 requires a tensile strength test taking forty-five minutes.

**Reveal sequence**

- **R1** What do you do? Describe your next steps. Opening
- **R2** Rachel returns at 4:15: “Where are we on Batch 47? Can I tell dispatch it’s cleared?” —
  Enquiry point
- **R3** Rachel says: “If we can’t ship today, what do you want me to tell Highfell?” — Corrective
  prompt
- **R4** Rachel adds: “And when did you first see the gaps on Tom’s sheet?” — Account test —
  authored

**Authored account-test reveal**

R4 authored. The legacy narrative closed on the shipping decision without testing the account.

**Source sheet**

- `workplace_demand` — Deciding whether to sign off an inspection when required checks are
  incomplete and a shipment deadline is pressing.
- `stated_standard` — Every batch must pass a twelve-point inspection checklist before shipping.
- `stated_standard_source_quote_or_location` — Opening paragraph: every batch passes a twelve-point
  inspection checklist before shipping.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `relevant_conduct` — Naming the gaps on the check sheet; timing relative to Rachel’s question;
  correspondence of the account to the check-sheet facts; what is said about Tom’s sign-off;
  identifying a corrective action, an actor and a time; whether an available route was identified as
  part of a stated corrective action; and whether the account changes at the timeline question.
- `d1_situation_class` — S-3 a control could be bypassed advantageously, with S-1 an existing
  discrepancy.
- `information_made_available` — I1 the twelve-point checklist is mandatory before shipping. I2 the
  shipment is due by 5:00 PM, stated at the opening. I3 Highfell is upset about the last delay. I4
  Rachel’s request. I5 points 1 to 7 are signed by Tom. I6 points 3 and 5 carry no measurement
  values. I7 point 9 takes forty-five minutes. I8 at R2, Rachel’s question. I9 at R3, the corrective
  prompt. I10 at R4, the timeline question.
- `material_items` — M1 points 3 and 5 lack recorded measurements. M2 point 9 takes forty-five
  minutes and the shipment is due at 5:00 PM. M3 the checklist is mandatory before shipping. M4 the
  components are safety components.
- `information_withheld` — Whether the components are in fact sound. Whether Tom performed the
  measurements and failed to record them. Whether Rachel knows about the gaps.
- `assertion_reference_set` — A1 the components are fine. A2 Tom performed the tests. A3 the
  checklist is advisory. A4 Highfell has agreed to a partial inspection. A5 point 9 can be completed
  in time.
- `attribution_support_set` — AS1 points 1 to 7 are signed off by Tom. AS2 points 3 and 5 carry no
  measurement values. AS3 Rachel asked for sign-off on points 8 to 12 only. Attribution of the
  missing values to Tom maps to AS2; attribution of intent to Tom maps to nothing.
- `enquiry_point` — R2.
- `account_test_point` — R4.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a tell Rachel directly. R-b record the gaps on the sheet. R-c raise it with
  Tom. R-d escalate above Rachel. R-e hold the shipment. S1 route-status ruleThe listed routes
  provide SOURCE CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at
  Stage 1. No written response in this source is recorded as using, taking, following, choosing or
  acting through a route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a
  missing-state code, because the question is not served.other_route_classificationNot applicable at
  Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — Rachel, Tom, the participant.
- `time_reference_called_for` — TRUE. R3 asks what to tell the client, which calls for a time.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 480 / 1500.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectTwo defined gaps in the check sheetI6,
M1Q-D1-02DirectDefined enquiry point

- **R2**
- **Q-D1-03a** — Direct: Source information plus material itemsI1–I10,
  M1–M4Q-D1-03b1/b2ConditionalOn 03alistsQ-D1-04aDirectThe participant is asked to
  signI4Q-D1-04bDirectSupport set non-emptyAS1–AS3Q-D1-05aDirectR3 asks what to tell the client
- **R3** Q-D1-05b1/05b2DirectActor and routes availableRachel, Tom, R-a to R-eQ-D1-05cDirectR3 calls
  for a time
- **R3**
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: Account test at
- **R4** R4Q-D1-08a/08bNOT SERVEDNo bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-005 — THE LAST DAY OF THE QUARTER
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-005$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-005$lit$, 'source'::t3a_content_family, $lit$THE LAST DAY OF THE QUARTER$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-005$lit$,
              'title', $lit$THE LAST DAY OF THE QUARTER$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"workplace_demand":"Deciding what to log in a CRM at quarter end when a manager has instructed","stated_standard":"In this CRM, Closed-Won denotes a signed contract.","stated_standard_source_quote_or_location":"Opening paragraph: in this CRM, Closed-Won denotes a","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","relevant_conduct":"Naming the status of each deal; timing relative to Kevin’s question;","d1_situation_class":"S-2 the participant is incentivised to represent something as other than it","information_made_available":"I1 the team is two deals short. I2 the bonus is contingent on","material_items":"M1 neither deal is signed. M2 Larkfield gave a verbal agreement this morning.","information_withheld":"Whether Larkfield will in fact sign. Whether the practice is genuinely","assertion_reference_set":"A1 Larkfield has signed. A2 Drewton has committed. A3 the practice is","attribution_support_set":"AS1 Kevin instructed the team to log verbally committed deals as","enquiry_point":"R2.","account_test_point":"R4.","post_test_account_opportunity":"true.","available_routes":"R-a reply to Kevin. R-b log or decline to log in the CRM. R-c contact","accountable_actor_available":"True — Kevin, the participant.","time_reference_called_for":"TRUE. R3 asks what to do about a number already sent upward, which","bearing_interest":"None. The bonus is an incentive, not a bearing interest in the CE-08 sense —","min_seconds":",","max_seconds":"360 / 1200."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-005 — THE LAST DAY OF THE QUARTER

Migrated from scenario 1.1.5 Padding the Numbers. Situation class S-2 with S-1.

**The situation, as the participant meets it**

You are a sales associate at Kelsick Trading. It is the last day of the quarter and the team is two
deals short of target. If the team hits target, everyone receives a two thousand dollar bonus. In
this CRM, Closed-Won denotes a signed contract. Your manager Kevin messages the team at 2:00 PM: if
anyone has deals verbally committed but not signed, log them as Closed-Won anyway and sort the
paperwork next week. He describes this as standard practice at quarter end. You have two situations.
Larkfield Logistics verbally agreed to a fifteen thousand dollar contract this morning but has not
signed, and said they would try to get it signed by Monday. Ambervale Financial had a promising
meeting last week, has not committed, and said they would think about it. There has been no
follow-up.

**Reveal sequence**

- **R1** What do you log, and what do you do? Describe your next steps. Opening
- **R2** Kevin messages you directly at 4:30: “Are your two in? I’m about to send the numbers up.” —
  Enquiry point
- **R3** Kevin replies: “Understood. What do you want me to do about the number I’ve already flagged
  upward?” — Corrective prompt
- **R4** Kevin adds: “When did Larkfield actually say they would sign?” — Account test

**Source sheet**

- `workplace_demand` — Deciding what to log in a CRM at quarter end when a manager has instructed
  the team to record unsigned deals as closed.
- `stated_standard` — In this CRM, Closed-Won denotes a signed contract.
- `stated_standard_source_quote_or_location` — Opening paragraph: in this CRM, Closed-Won denotes a
  signed contract.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `relevant_conduct` — Naming the status of each deal; timing relative to Kevin’s question;
  correspondence of the account to what each client actually said; what is said about Kevin’s
  instruction; identifying a corrective action and a time; whether an available route was identified
  as part of a stated corrective action; and whether the account changes.
- `d1_situation_class` — S-2 the participant is incentivised to represent something as other than it
  is, with S-1.
- `information_made_available` — I1 the team is two deals short. I2 the bonus is contingent on
  target. I3 Kevin’s instruction and his characterisation of it as standard. I4 Larkfield verbally
  agreed, unsigned, will try by Monday. I5 Drewton has not committed and has not followed up. I6 at
  R2, Kevin’s direct question. I7 at R3, the corrective prompt. I8 at R4, the timeline question.
- `material_items` — M1 neither deal is signed. M2 Larkfield gave a verbal agreement this morning.
  M3 Drewton has made no commitment. M4 the CRM status Closed-Won denotes a signed contract, as
  stated at the opening.
- `information_withheld` — Whether Larkfield will in fact sign. Whether the practice is genuinely
  standard. Whether anyone above Kevin has sanctioned it.
- `assertion_reference_set` — A1 Larkfield has signed. A2 Drewton has committed. A3 the practice is
  approved above Kevin. A4 the paperwork is a formality. A5 Drewton verbally agreed.
- `attribution_support_set` — AS1 Kevin instructed the team to log verbally committed deals as
  Closed-Won. AS2 Kevin described the practice as standard at quarter end. Attribution to Kevin of
  the instruction maps here; attribution to Kevin of an intent to mislead maps to nothing.
- `enquiry_point` — R2.
- `account_test_point` — R4.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a reply to Kevin. R-b log or decline to log in the CRM. R-c contact
  Larkfield. R-d raise it above Kevin. S1 route-status ruleThe listed routes provide SOURCE CONTEXT
  FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at Stage 1. No written
  response in this source is recorded as using, taking, following, choosing or acting through a
  route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a missing-state code,
  because the question is not served.other_route_classificationNot applicable at Stage 1 while
  Q-D1-06 is not served.
- `accountable_actor_available` — True — Kevin, the participant.
- `time_reference_called_for` — TRUE. R3 asks what to do about a number already sent upward, which
  calls for a time.
- `bearing_interest` — None. The bonus is an incentive, not a bearing interest in the CE-08 sense —
  it is not a relationship or obligation bearing on a decision the participant is part of. This
  distinction is deliberate and is the reason CE-08 is not served here.
- `min_seconds` — ,
- `max_seconds` — 360 / 1200.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectTwo deals with defined statusesI4,
I5Q-D1-02DirectDefined enquiry point

- **R2**
- **Q-D1-03a** — Direct: Material items cover both deals SEPARATELY — an account may correspond on
  one and not the otherM1–M4Q-D1-03b1/b2ConditionalOn 03alistsQ-D1-04a — ConditionalThe
  participant’s own part arises only if they log or decline to log—
- **Q-D1-04b** — Direct: Support set covers Kevin’s instructionAS1, AS2Q-D1-05aDirectR3 asks about
  the number already sent upward
- **R3** Q-D1-05b1/05b2DirectKevin and four routesR-a to R-dQ-D1-05cDirectR3 calls for a time
- **R3**
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: Account test at
- **R4** R4Q-D1-08a/08bNOT SERVEDA bonus is an incentive, not a bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-006 — THE ANALYTICS MODULE
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-006$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-006$lit$, 'source'::t3a_content_family, $lit$THE ANALYTICS MODULE$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-006$lit$,
              'title', $lit$THE ANALYTICS MODULE$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"relevant_conduct":"Naming that the client has been told the participant has prior","workplace_demand":"Answering a client who asks the participant to confirm an inclusion the","stated_standard":"The participant does not have authority to include the module without","stated_standard_source_quote_or_location":"Opening paragraph: you do not have authority to","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","d1_situation_class":"S-2 pressure to represent something as other than it is, with S-3 a control","information_made_available":"I1 the contract value and its significance to the participant. I2","material_items":"M1 the participant lacks authority to include the module. M2 no approval has","information_withheld":"Whether the director would approve. Whether the module has been given","assertion_reference_set":"A1 the module is included as standard. A2 the director has approved","attribution_support_set":"AS1 Lisa Chang stated the budget committee approved the base package","enquiry_point":"R2.","account_test_point":"R3, authored.","post_test_account_opportunity":"true.","available_routes":"R-a answer Lisa directly. R-b escalate to the deputy. R-c defer the answer","accountable_actor_available":"True — the deputy, the director, the participant.","time_reference_called_for":"TRUE. Lisa needs an answer today, and R2 makes the timing explicit.","bearing_interest":"None.","min_seconds":",","max_seconds":"480 / 1200."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-006 — THE ANALYTICS MODULE

Migrated from scenario 1.1.6 Bending the Rules to Close a Deal. Situation class S-2 with S-3.

**The situation, as the participant meets it**

You are an account manager at Westhaven Account Services. You have been working for three months to
close a one hundred and twenty thousand dollar annual contract with Brightmoor Health Systems. It
would be the largest deal you have personally closed. In the final negotiation, the client’s
procurement director Lisa Chang says they are ready to sign today if you include the Premium
Analytics Module at no additional charge. Their budget committee approved the base package only and
they cannot go back for more. You do not have authority to include the module without approval. Your
director is on leave until next week.

**Reveal sequence**

- **R1** What do you say to Lisa? Write your response. Opening
- **R2** Lisa asks: “So can you confirm Analytics is included? I need to tell my committee today.” —
  Enquiry point
- **R3** After the call your director’s deputy asks: “What did you commit to on the Brightmoor
  call?” — Account test — authored

**Authored account-test reveal**

R3 authored. The legacy narrative closed with the client; the account is tested by a different
listener afterwards.

**Source sheet**

- `relevant_conduct` — Naming that the client has been told the participant has prior
  predictive-integration experience the source says they do not have; timing relative to the
  client's direct question; correspondence of the account to source-provided prior-experience facts
  and to the director's representation; attribution to the director; corrective action, accountable
  actor and time; and whether the account changes at the timeline test.
- `workplace_demand` — Answering a client who asks the participant to confirm an inclusion the
  participant has no authority to grant.
- `stated_standard` — The participant does not have authority to include the module without
  approval.
- `stated_standard_source_quote_or_location` — Opening paragraph: you do not have authority to
  include the module without approval.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `d1_situation_class` — S-2 pressure to represent something as other than it is, with S-3 a control
  that could be bypassed.
- `information_made_available` — I1 the contract value and its significance to the participant. I2
  Lisa’s request and condition. I3 the budget committee approved the base package. I4 the
  participant lacks authority to include the module. I5 the director is on leave until next week. I6
  at R2, Lisa’s confirmation request. I7 at R3, the deputy’s question.
- `material_items` — M1 the participant lacks authority to include the module. M2 no approval has
  been obtained. M3 the client is asking for confirmation today.
- `information_withheld` — Whether the director would approve. Whether the module has been given
  away before. Whether Lisa will walk if refused.
- `assertion_reference_set` — A1 the module is included as standard. A2 the director has approved
  it. A3 the deputy can approve it. A4 the client will not sign without it. A5 the discount has
  precedent.
- `attribution_support_set` — AS1 Lisa Chang stated the budget committee approved the base package
  only. AS2 Lisa Chang made inclusion a condition of signing today.
- `enquiry_point` — R2.
- `account_test_point` — R3, authored.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a answer Lisa directly. R-b escalate to the deputy. R-c defer the answer
  until the director returns. R-d put the request in writing to the client. S1 route-status ruleThe
  listed routes provide SOURCE CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use
  determination at Stage 1. No written response in this source is recorded as using, taking,
  following, choosing or acting through a route. Q-D1-06 records are ABSENT — not null, not
  not_applicable, and not a missing-state code, because the question is not
  served.other_route_classificationNot applicable at Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — the deputy, the director, the participant.
- `time_reference_called_for` — TRUE. Lisa needs an answer today, and R2 makes the timing explicit.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 480 / 1200.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectThe authority gap is a nameable issueI4,
M1Q-D1-02DirectDefined enquiry point

- **R2**
- **Q-D1-03a** — Direct: Source information plus material itemsM1–M3Q-D1-03b1/b2ConditionalOn
  03alistsQ-D1-04a — ConditionalArises if the participant describes what they committed to—
- **Q-D1-04b** — Direct: Support set covers Lisa’s statementsAS1, AS2Q-D1-05aDirectA next step is
  genuinely required
- **R2** Q-D1-05b1/05b2DirectDeputy, director, four routesR-a to R-dQ-D1-05cDirectLisa needs an
  answer todayI2,
- **R2**
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: Account test at R3 by a different listener
- **R3** Q-D1-08a/08bNOT SERVEDNo bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-007 — THE SUPPLY ROOM
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-007$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-007$lit$, 'source'::t3a_content_family, $lit$THE SUPPLY ROOM$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-007$lit$,
              'title', $lit$THE SUPPLY ROOM$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"relevant_conduct":"Naming what was observed in the supply room; timing relative to the office","workplace_demand":"Deciding what to say after observing a colleague remove company supplies, and","stated_standard":"none","stated_standard_source_quote_or_location":"none - no policy on supplies is established by the","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","d1_situation_class":"S-6. The participant becomes aware of conduct by another requiring a","information_made_available":"I1 what Derek was seen loading. I2 that these are company supplies.","material_items":"M1 Derek removed company supplies. M2 the participant saw it. M3 Derek gave a","information_withheld":"Whether Derek had permission. Whether this has happened before. What the","assertion_reference_set":"A1 Derek had permission. A2 the supplies were surplus. A3 the","attribution_support_set":"AS1 Derek stated the supplies were for his child’s school fundraiser.","enquiry_point":"R2.","account_test_point":"R3, authored.","post_test_account_opportunity":"true.","available_routes":"R-a respond to Derek at the time. R-b answer the office manager in the group.","accountable_actor_available":"True — Derek, the office manager.","time_reference_called_for":"False.","bearing_interest":"None.","min_seconds":",","max_seconds":"360 / 1000."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-007 — THE SUPPLY ROOM

Migrated from scenario 1.1.7 The Silent Witness. Situation class S-6.

**The situation, as the participant meets it**

You are a marketing coordinator at Fernbrook Associates, in an open-plan office of eight. On
Thursday afternoon you are working late. Most of the team has gone. Walking past the supply room you
see your colleague Derek loading several boxes of premium printer paper, a case of branded notebooks
and two new wireless keyboards into a large bag. These are company supplies. Derek sees you and
says: “Hey, my kid’s school is doing a fundraiser and they need supplies for the event. I figured
the company won’t miss a few boxes. Don’t worry about it.”

**Reveal sequence**

- **R1** What do you say or do? Describe your next steps. Opening
- **R2** The next morning your office manager asks the team: “Does anyone know what happened to the
  keyboards that were in the supply room?” — Enquiry point
- **R3** The office manager follows up with you privately: “When did you last see them?” — Account
  test — authored

**Authored account-test reveal**

R3 authored so the account given at R2 can be tested.

**Source sheet**

- `relevant_conduct` — Naming what was observed in the supply room; timing relative to the office
  manager's enquiry; whether any account corresponds to the source-provided facts about what was
  seen and what the colleague said; and whether the account changes when the participant is asked
  privately when they last saw the items.
- `workplace_demand` — Deciding what to say after observing a colleague remove company supplies, and
  then when the office manager asks the team.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - no policy on supplies is established by the
  source.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `d1_situation_class` — S-6. The participant becomes aware of conduct by another requiring a
  response.
- `information_made_available` — I1 what Derek was seen loading. I2 that these are company supplies.
  I3 Derek’s stated reason. I4 Derek’s request not to worry about it. I5 at R2, the office manager’s
  question to the team. I6 at R3, the private follow-up.
- `material_items` — M1 Derek removed company supplies. M2 the participant saw it. M3 Derek gave a
  reason for taking them.
- `information_withheld` — Whether Derek had permission. Whether this has happened before. What the
  company policy is.
- `assertion_reference_set` — A1 Derek had permission. A2 the supplies were surplus. A3 the
  participant did not see who it was. A4 this is common practice. A5 the school fundraiser is a
  company initiative.
- `attribution_support_set` — AS1 Derek stated the supplies were for his child’s school fundraiser.
  AS2 Derek said the company would not miss them. Attribution of the act to Derek maps to what was
  directly observed; attribution of intent does not.
- `enquiry_point` — R2.
- `account_test_point` — R3, authored.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a respond to Derek at the time. R-b answer the office manager in the group.
  R-c speak to the office manager privately. R-d raise it with a manager or human resources. S1
  route-status ruleThe listed routes provide SOURCE CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a
  Q-D1-06 route-use determination at Stage 1. No written response in this source is recorded as
  using, taking, following, choosing or acting through a route. Q-D1-06 records are ABSENT — not
  null, not not_applicable, and not a missing-state code, because the question is not
  served.other_route_classificationNot applicable at Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — Derek, the office manager.
- `time_reference_called_for` — False.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 360 / 1000.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectWhat was observed is nameableI1, I2Q-D1-02DirectDefined
enquiry point

- **R2**
- **Q-D1-03a** — Conditional: Only where the participant gives an account to the office managerR2,
- **R3** Q-D1-03b1/b2ConditionalOn 03alistsQ-D1-04a — ConditionalThe participant has no part in the
  removal—
- **Q-D1-04b** — Conditional: Support set covers what Derek SAID; attributing intent maps to
  nothingAS1, AS2Q-D1-05a to 05cNOT SERVEDThe source establishes no correction obligation. An
  implied duty to report is not a corrective-action opportunity and must not be treated as one—
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: Account test at
- **R3** R3Q-D1-08a/08bNOT SERVEDNo bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-008 — MIA’S IDEA
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-008$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-008$lit$, 'source'::t3a_content_family, $lit$MIA’S IDEA$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-008$lit$,
              'title', $lit$MIA’S IDEA$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"relevant_conduct":"Naming the authorship and credit issue; timing relative to the manager's","workplace_demand":"Responding when a manager asks for ideas and the participant holds an absent","stated_standard":"none","stated_standard_source_quote_or_location":"none.","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","d1_situation_class":"S-4. Credit and authorship are unclear or contested.","information_made_available":"I1 the recurring problem and its effect on the client. I2 Mia","material_items":"M1 the idea originated with Mia. M2 Mia described it to the participant on","information_withheld":"Whether Mia has told anyone else. Whether Jordan knows Mia was working on","assertion_reference_set":"A1 the idea was jointly developed. A2 the participant had the same","attribution_support_set":"AS1 Mia described the idea in detail on Tuesday. AS2 the idea was","enquiry_point":"R2.","account_test_point":"R3.","post_test_account_opportunity":"true.","available_routes":"R-a attribute in the meeting. R-b tell Jordan afterwards. R-c contact Mia","accountable_actor_available":"True — Jordan, Mia, the participant.","time_reference_called_for":"False.","bearing_interest":"None.","min_seconds":",","max_seconds":"480 / 1200."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-008 — MIA’S IDEA

Migrated from scenario 1.1.8 The Stolen Idea. Situation class S-4.

**The situation, as the participant meets it**

You are a business analyst at Crestline Practice Group. Your team has a recurring data reporting
problem causing weekly delays for a major client, Summit Ledger Services. Last Tuesday over lunch
your colleague Mia described an idea she had been developing: restructuring the reporting pipeline
with automated validation checkpoints. She explained it in detail. It was clearly her own thinking
and she was excited about writing it up as a proposal. On Wednesday Mia called in sick. That morning
your manager Jordan called an urgent meeting about the Summit Ledger problem and asked whether
anyone had ideas.

**Reveal sequence**

- **R1** What do you say in the meeting? Write your response. Opening
- **R2** Jordan says: “That’s good. Write it up and I’ll take it to the client Friday. Is this
  yours?” — Enquiry point
- **R3** Mia returns on Thursday and says: “Jordan mentioned the validation checkpoints idea in
  standup. Where did that come from?” — Account test

**Source sheet**

- `relevant_conduct` — Naming the authorship and credit issue; timing relative to the manager's
  direct question; correspondence of the account to the source-provided origin and timing facts; the
  participant's own part and attribution to the colleague; any corrective action and accountable
  actor where the source branch makes that applicable; and whether the account changes when the
  colleague asks where the idea came from.
- `workplace_demand` — Responding when a manager asks for ideas and the participant holds an absent
  colleague's idea.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `d1_situation_class` — S-4. Credit and authorship are unclear or contested.
- `information_made_available` — I1 the recurring problem and its effect on the client. I2 Mia
  described the idea in detail on Tuesday. I3 the idea was her own thinking. I4 she intended to
  develop it into a proposal. I5 Mia is absent Wednesday. I6 Jordan asks the meeting for ideas. I7
  at R2, Jordan’s direct question. I8 at R3, Mia’s question.
- `material_items` — M1 the idea originated with Mia. M2 Mia described it to the participant on
  Tuesday. M3 Mia intended to write it up. M4 Mia was absent when the meeting occurred.
- `information_withheld` — Whether Mia has told anyone else. Whether Jordan knows Mia was working on
  it. Whether Mia would object.
- `assertion_reference_set` — A1 the idea was jointly developed. A2 the participant had the same
  idea independently. A3 Mia had abandoned the idea. A4 Mia asked the participant to raise it. A5
  Jordan already knew it was Mia’s.
- `attribution_support_set` — AS1 Mia described the idea in detail on Tuesday. AS2 the idea was
  Mia’s original thinking. AS3 Mia intended to develop it into a formal proposal.
- `enquiry_point` — R2.
- `account_test_point` — R3.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a attribute in the meeting. R-b tell Jordan afterwards. R-c contact Mia
  before answering. R-d write it up naming Mia. S1 route-status ruleThe listed routes provide SOURCE
  CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at Stage 1. No
  written response in this source is recorded as using, taking, following, choosing or acting
  through a route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a
  missing-state code, because the question is not served.other_route_classificationNot applicable at
  Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — Jordan, Mia, the participant.
- `time_reference_called_for` — False.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 480 / 1200.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectThe origin of the idea is nameableI2,
I3Q-D1-02DirectDefined enquiry point

- **R2**
- **Q-D1-03a** — Direct: Material items establish origin, timing and
  intentM1–M4Q-D1-03b1/b2ConditionalOn 03alistsQ-D1-04aDirectThe participant’s own part is directly
  in issueI6,
- **R1**
- **Q-D1-04b** — Direct: Support set non-empty. THIS IS THE BANK’S STRONGEST CE-04
  SOURCEAS1–AS3Q-D1-05a — ConditionalA corrective step exists only where the participant has
  represented the idea as theirs. Not assumedR2,
- **R3** Q-D1-05b1/05b2ConditionalOn 05aJordan, Mia, R-a to R-dQ-D1-05cNOT SERVEDNo time reference
  is called for—
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: Mia’s question at R3 tests the account given at R1 and
- **R2** R3Q-D1-08a/08bNOT SERVEDNo bearing interest—$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-009 — THE PINEHOLLOW PROPOSAL
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-009$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-009$lit$, 'source'::t3a_content_family, $lit$THE PINEHOLLOW PROPOSAL$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-009$lit$,
              'title', $lit$THE PINEHOLLOW PROPOSAL$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"relevant_conduct":"Whether the participant discloses the family relationship bearing on the","workplace_demand":"Evaluating vendor proposals while related to an employee of one bidder, and","stated_standard":"none","stated_standard_source_quote_or_location":"none - the source deliberately leaves the","route_observation_basis":"NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","d1_situation_class":"S-5. The participant holds a relationship bearing on a decision they are","information_made_available":"I1 the participant’s evaluation role. I2 the contract value. I3","material_items":"M1 a family relationship exists with an employee of a bidding vendor. M2 the","information_withheld":"Whether the relationship would disqualify the participant. Whether Maple","assertion_reference_set":"A1 Craig is not involved in the proposal. A2 the relationship is too","attribution_support_set":"Empty.","enquiry_point":"R2.","account_test_point":"R3.","post_test_account_opportunity":"true.","available_routes":"R-a disclose to Patricia before starting. R-b disclose at R2. R-c ask to be","accountable_actor_available":"True — Patricia, human resources.","time_reference_called_for":"False.","bearing_interest":"PRESENT and central. Decision point is the Monday recommendation; the direct","min_seconds":",","max_seconds":"480 / 1200."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-009 — THE PINEHOLLOW PROPOSAL

Migrated from scenario 1.1.9 The Undisclosed Conflict. Situation class S-5.

**The situation, as the participant meets it**

You are a procurement specialist at Maple Reach Procurement. Your job is evaluating vendor proposals
and recommending to your director, Patricia, which vendors to select. The company has issued a
request for proposal for a two hundred and fifty thousand dollar annual packaging supply contract.
Three vendors have submitted. You have been assigned to evaluate all three and present your
recommendation to Patricia on Monday. One of the three is Pinehollow Supply. Your brother-in-law
Craig is the regional sales manager at Pinehollow. Craig does not know you are on the evaluation
committee. You have never discussed work contracts with him and the relationship is purely personal.

**Reveal sequence**

- **R1** What do you do? Describe your next steps. Opening
- **R2** On Monday you present. Patricia asks: “Before we go further — does anyone on the panel have
  a connection to any of the three vendors?” — Enquiry point
- **R3** Patricia follows up: “And when did you become aware of the connection?” — Account test

**Source sheet**

- `relevant_conduct` — Whether the participant discloses the family relationship bearing on the
  vendor-selection decision; when the first disclosure occurs relative to the recommendation
  decision point; and whether the first disclosure occurs before, in direct response to, or after
  the direct question about the interest.
- `workplace_demand` — Evaluating vendor proposals while related to an employee of one bidder, and
  then being asked directly about connections.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - the source deliberately leaves the
  organisation's position on such relationships unstated.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `d1_situation_class` — S-5. The participant holds a relationship bearing on a decision they are
  part of.
- `information_made_available` — I1 the participant’s evaluation role. I2 the contract value. I3
  three vendors submitted. I4 Pinehollow is one. I5 Craig is the participant’s brother-in-law and
  Pinehollow’s regional sales manager. I6 Craig does not know. I7 no work contracts have been
  discussed. I8 at R2, Patricia’s direct question. I9 at R3, the timing question.
- `material_items` — M1 a family relationship exists with an employee of a bidding vendor. M2 the
  participant is evaluating that vendor. M3 the participant knew before beginning the evaluation.
- `information_withheld` — Whether the relationship would disqualify the participant. Whether Maple
  Reach has a policy. Whether Craig is involved in the bid.
- `assertion_reference_set` — A1 Craig is not involved in the proposal. A2 the relationship is too
  distant to matter. A3 the company has no policy. A4 the participant only learned of the connection
  during the evaluation. A5 Patricia already knows.
- `attribution_support_set` — Empty.
- `enquiry_point` — R2.
- `account_test_point` — R3.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a disclose to Patricia before starting. R-b disclose at R2. R-c ask to be
  removed from the panel. R-d raise it with human resources. S1 route-status ruleThe listed routes
  provide SOURCE CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use determination at
  Stage 1. No written response in this source is recorded as using, taking, following, choosing or
  acting through a route. Q-D1-06 records are ABSENT — not null, not not_applicable, and not a
  missing-state code, because the question is not served.other_route_classificationNot applicable at
  Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — Patricia, human resources.
- `time_reference_called_for` — False.
- `bearing_interest` — PRESENT and central. Decision point is the Monday recommendation; the direct
  question at R2 comes at that point, so disclosure before, at, or not at all are all reachable.
- `min_seconds` — ,
- `max_seconds` — 480 / 1200.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectThe connection is nameableP0, M1Q-D1-02DirectPatricia’s
question is a defined enquiry point

- **R2**
- **Q-D1-03a** — Conditional: The account is about the connection, not about a set of events.
  Correspondence is testable only on the disclosure itselfM1–M3Q-D1-03b1/b2ConditionalOn
  03alistsQ-D1-04aNOT SERVEDNo responsibility for events arises—
- **Q-D1-04b** — NOT SERVED: Support set empty—
- **Q-D1-05a** — Conditional: A corrective step exists only where the participant identifies one,
  such as withdrawal from the panelR-cQ-D1-05b1/05b2ConditionalOn 05aPatricia, HR, R-a to
  R-dQ-D1-05cNOT SERVEDNo time reference called for—
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Conditional: R3 tests when awareness arose, which is an account about the connection
  rather than about events
- **R3**
- **Q-D1-08a** — DIRECT: Bearing interest present; decision point is the Monday recommendation;
  enquiry at
- **R2** P0,
- **R2**
- **Q-D1-08b** — DIRECT: Prompt condition observable against
- **R2** R2$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S1-010 — THE TABLEAU COMMITMENT
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S1-010$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S1-010$lit$, 'source'::t3a_content_family, $lit$THE TABLEAU COMMITMENT$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S1-010$lit$,
              'title', $lit$THE TABLEAU COMMITMENT$lit$,
              'stage_code', $lit$S1$lit$,
              'source_sheet', $lit${"workplace_demand":"Responding when a manager has represented the participant's prior experience","stated_standard":"CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,","stated_standard_source_quote_or_location":"none.","route_observation_basis":"S2 ROUTE-OBSERVATION BASIS: a route is recorded as USED only where the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","d1_situation_class":"S-1 to S-7, stated per source. This is a D1 CONSTRUCT classification and is","information_made_available":"I1 the client asked for advanced Tableau with predictive modelling.","material_items":"M1 the participant has not built predictive modelling integrations, as a matter","information_withheld":"Whether anyone else on the team has the skill. Whether the deadline can","assertion_reference_set":"A1 the participant has built predictive integrations. A2 the skills","attribution_support_set":"Stated per source. Where empty, any attribution to another person maps","enquiry_point":"R2.","account_test_point":"R4, authored.","post_test_account_opportunity":"true.","available_routes":"R-a tell Victor before kickoff. R-b answer the client directly at R2. R-c ask","accountable_actor_available":"True — Victor, the participant.","time_reference_called_for":"TRUE. R3 asks what is needed to hit a stated date.","bearing_interest":"None.","min_seconds":",","max_seconds":"600 minimum, 1200 maximum per session.","source_version_hash":"proves the canonical source;","proposed_compatibility_class":"A — PROPOSED, subject to source approval, administration testing","approved_observation_ready_count":"ZERO.","active_serving_count":"ZERO.SECTION 1 — WHAT APPLIES TO ALL TEN1.1 How a Stage 2 observation","relevant_conduct":"without its counterpart. It states WHAT OBSERVABLE D1 CONDUCT THIS SOURCE","rendered_instance_hash":"proves what the participant actually saw. Both are retained. This also","name_clearance_status":"Governed by the launch naming rule at Part One, Section 5.5. A launch"}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S1-010 — THE TABLEAU COMMITMENT

Migrated from scenario 1.1.10 The Overpromise. Situation class S-2.

**The situation, as the participant meets it**

You are a project analyst at Harbor Point Projects. Your team has won an engagement with Northstar
Client Group to build a financial forecasting dashboard. Kickoff is tomorrow. Your manager Victor
pulls you aside and says he needs you to lead the Tableau component. The client specifically asked
for advanced Tableau visualisations with predictive modelling integrations. Victor has told them you
can handle it. Kickoff is tomorrow at 10 AM and they will want a preliminary framework by the end of
next week. Your actual position: you have basic Tableau skills and have never built predictive
modelling integrations.

**Reveal sequence**

- **R1** What do you say to Victor? Write your response. Opening
- **R2** At kickoff the client asks you directly: “Victor says you’ve done this kind of predictive
  integration before. Can you walk us through your approach?” — Enquiry point
- **R3** After the meeting Victor asks: “That went fine. What do you need from me to hit the end of
  next week?” — Corrective prompt
- **R4** Victor adds: “And when did you first tell me where your Tableau was at?” — Account test —
  authored

**Authored account-test reveal**

R4 authored. The legacy narrative closed on the commitment without testing the account.

**Source sheet**

- `workplace_demand` — Responding when a manager has represented the participant's prior experience
  to a client in terms the source says is not accurate.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none.
- `route_observation_basis` — NOT SERVED AT STAGE 1 UNDER FD-D1-09, APPROVED AND CLOSED. Q-D1-06 is
  not served at S1 because a written fictional response does not evidence route use. Available
  routes remain source context for CE-05 only.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required rows per conduct-clause relationship:
  source_version_id; conduct_clause_or_recurrence_equivalence_key; counterpart_source_version_id;
  constant_demand; approved_contextual_difference; technical_comparability_required; eligible_claim
  (multi_context, fourth_state or neither); recurrence_blocker; CA04_partC_version. CURRENT STATUS:
  NO APPROVED CA-04 PART C COUNTERPART ROW EXISTS FOR THIS SOURCE VERSION. This source may support
  an OBSERVATION STATEMENT ONLY. It may NOT support a multi-context frame or a fourth-state
  recurrence frame until an approved CA-04 Part C row explicitly names this source version, the
  counterpart source version, the eligible conduct clause or recurrence-equivalence key, the
  approved contextual difference, and the recurrence blockers.
- `d1_situation_class` — S-2. The participant is pressed to represent a capability as other than it
  is.
- `information_made_available` — I1 the client asked for advanced Tableau with predictive modelling.
  I2 Victor told the client the participant can handle it. I3 kickoff is tomorrow. I4 a preliminary
  framework is due end of next week. I5 the participant has basic Tableau skills. I6 the participant
  has never built predictive modelling integrations. I7 at R2, the client’s direct question. I8 at
  R3, the corrective prompt. I9 at R4, the timeline question.
- `material_items` — M1 the participant has not built predictive modelling integrations, as a matter
  of STATED PRIOR EXPERIENCE. M2 Victor told the client the participant can handle it. M3 the client
  asked for advanced work with predictive modelling. M4 the framework is due end of next week. NOTE:
  these are facts about what was REPRESENTED and what the source states about prior experience. D1
  does not record a capability gap.
- `information_withheld` — Whether anyone else on the team has the skill. Whether the deadline can
  move. Whether Victor knew the participant’s level.
- `assertion_reference_set` — A1 the participant has built predictive integrations. A2 the skills
  gap can be closed before kickoff. A3 Victor was told the participant’s level in advance. A4 the
  client will accept a basic dashboard. A5 another team member is assigned to it.
- `attribution_support_set` — AS1 Victor told the client the participant could handle it. AS2 the
  client specifically asked for advanced Tableau with predictive modelling.
- `enquiry_point` — R2.
- `account_test_point` — R4, authored.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a tell Victor before kickoff. R-b answer the client directly at R2. R-c ask
  for support or training. R-d ask for the component to be reassigned. S1 route-status ruleThe
  listed routes provide SOURCE CONTEXT FOR Q-D1-05b2 ONLY. They do NOT create a Q-D1-06 route-use
  determination at Stage 1. No written response in this source is recorded as using, taking,
  following, choosing or acting through a route. Q-D1-06 records are ABSENT — not null, not
  not_applicable, and not a missing-state code, because the question is not
  served.other_route_classificationNot applicable at Stage 1 while Q-D1-06 is not served.
- `accountable_actor_available` — True — Victor, the participant.
- `time_reference_called_for` — TRUE. R3 asks what is needed to hit a stated date.
- `bearing_interest` — None.
- `min_seconds` — ,
- `max_seconds` — 480 / 1200.

**Question applicability**

Every question, with its state, its trigger and the source basis. This table governs what the
registry serves. A broad declaration such as all except two is not sufficient control.
QuestionStateTriggerSource basisQ-D1-01DirectThe source-defined issue is that the CLIENT HAS BEEN
TOLD the participant possesses prior experience the source says they do not possess. NOT a
capability gap — D1 does not record that someone lacks a capability. The observation stays on
representation and correspondence, never on competenceI5, I6, AS1Q-D1-02DirectDefined enquiry point
at the client meeting

- **R2**
- **Q-D1-03a** — Direct: Material items bound the account to STATED PRIOR EXPERIENCE, not to
  capabilityM1–M4Q-D1-03b1/b2ConditionalOn 03alistsQ-D1-04a — ConditionalArises where the
  participant describes their own position—
- **Q-D1-04b** — Direct: Support set covers Victor’s statement to the clientAS1, AS2Q-D1-05aDirectR3
  asks what is needed to hit the date
- **R3** Q-D1-05b1/05b2DirectVictor and four routesR-a to R-dQ-D1-05cDirectR3 names a stated date
- **R3**
- **Q-D1-06** — NOT SERVED: FD-D1-09 interim — a written response cannot evidence route USE—
- **Q-D1-07** — Direct: Account test at
- **R4** R4Q-D1-08a/08bNOT SERVEDNo bearing interest—SECTION 12 — THE STAGE 1 BANK REGISTER12.1
  Coverage across the tenDirect, Conditional or Not served, per source per element.
  SourceCE-0102030405060708001 Unsent ReportDDDDDNSDNS002 Kitchen ConversationDDCCNSNSDNS003
  Connection RequestsNSNSNSNSNSNSNSNS004 Batch 47DDDDDNSDNS005 Last Day of the QuarterDDDCDNSDNS006
  Analytics ModuleDDDCDNSDNS007 Supply RoomDDCCNSNSDNS008 Mia’s IdeaDDDDCNSDNS009 Pinehollow
  ProposalDDCNSCNSCD010 Tableau CommitmentDDDCDNSDNSD direct, C conditional, NS not served. CE-05 is
  DIRECT in five sources, not ten. CE-08 in ONE. CE-04 in four. CE-06 is NOT SERVED anywhere at
  Stage 1 under FD-D1-09, approved and closed. What the corrected matrix showsCE-08 has ONE direct
  source in the whole Stage 1 bank: SRC-D1-S1-009, the Pinehollow Proposal. It is the source closest
  to the construct — the participant evaluates vendors while related to a bidder’s regional sales
  manager. A single source cannot support cross-context work for that element at Stage 1, and the
  element depends on Stages 2 and 4 for its second and third contexts. CE-05 is direct in five
  sources. In the Kitchen Conversation and the Connection Requests it is not served at all, because
  neither creates a corrective-action problem — a general what-would-you-do prompt is not a
  correction opportunity. CE-06 is NOT SERVED anywhere at Stage 1 under FD-D1-09, approved and
  closed. Written identification of an available route is not recorded as route use.12.1.1 CE-05 is
  not an omnibus elementFive conditions, all required, before CE-05 is marked directA specific
  defined issue exists in the source. A genuine opportunity to address its consequences is
  presented. Naming the issue and identifying a next action are distinguishable in what the
  participant produced. An observable response window exists for the action. No requirement that the
  mentor judge whether the action is sensible. Where any of the five is absent, CE-05 is conditional
  or not served. Marking it direct everywhere would turn it into a measure of initiative,
  problem-solving or professional judgment — none of which is D1.12.1.2 CE-08 was wrongly applied to
  SRC-D1-S1-00312.1.3 Route diversity, and why single-path sources are a problemPreserve factual
  clarity; increase choice architectureSeveral sources present one very obvious path and then test
  whether the participant repeats the expected factual account. The facts need to be clear for the
  conduct to be observable, but a single plausible route narrows the observation to compliance with
  an implied script. Each source should offer at least two legitimate routes that differ in action
  and timing and do NOT require the mentor to decide which is better. In the Unsent Report the
  participant might inform the manager before sending; send and immediately notify; call the client
  then inform the manager; or hold and ask for direction. All four are recorded the same way, and
  none is preferred. The
- `available_routes` — field starts this work. 12.1.4 Triage — three queuesQueueSourcesActionRETAIN
  AND REFINE001, 004, 005, 006, 008, 009Narrow question service to the applicability tables; make
  multiple routes genuinely available; keep. REDESIGN BEFORE USE002, 007, 010002 risks becoming a
  gossip or interpersonal-boundary source rather than a D1 evidence source. 007 can become an
  accusation about a third party and an implied duty to report. 010 must be narrowed to
  source-bounded representation of prior experience, or it drifts into capability and
  self-presentation assessment. REMOVED FROM THE D1 PRODUCTION QUEUE003After the applicability
  correction, SRC-D1-S1-003 serves NO conduct element. It is out of the D1 queue. It is not retained
  to hold a tenth slot — a ninth strong source is better than a tenth that barely observes the
  construct. A replacement is authored later, around a concrete decision where a relationship
  creates a genuine bearing interest. The bank is not approved as a group. Each source clears REC-07
  on its own, one at a time, and three of the ten should not be put forward until redesigned.12.2
  Register rowsFieldStatus across the tenMigration completeTen authored. NINE in the D1 queue: six
  retain and refine, three requiring redesign. SRC-D1-S1-003 is REMOVED from the D1 production queue
  and serves no element. Drafting test 1 recordEMPTY on all ten. Must be completed by someone other
  than the author. Drafting test 2 recordEMPTY on all ten. Same. Replacement sourceAvailable. Any of
  the other nine, subject to prior-exposure exclusion and situation-class variety.
- `source_version_hash` — Not yet assigned.
- `proposed_compatibility_class` — A — PROPOSED, subject to source approval, administration testing
  and the applicable comparability controls. Compatibility class is ASSIGNED AT RELEASE, not
  inferred during authoring, and these sources have passed no drafting test, no calibration and no
  REC-07. Three separate claims, never collapsed: (1) WITHIN-SOURCE determination comparability: an
  INTENDED DESIGN PROPERTY ONLY. NOT ESTABLISHED until the approved calibration study measures
  agreement on the EXACT source version, question version, answer definitions AND administration
  protocol. Use the words PROPOSED or INTENDED in every register until CA-09 reports calibration
  results. It was previously described as claimable now, which asserts reliability before the study
  exists. (2) CROSS-SOURCE technical compatibility: NOT ESTABLISHED AT AUTHORING. Determined through
  the applicable version, administration and comparison controls. (3) CA-04 Part C context
  relationship: NOT ESTABLISHED until the approved counterpart map names the source versions, the
  constant demand, the approved contextual variation, the comparable conduct and the recurrence
  blockers. The earlier position asserted the sources were fully comparable within the bank, which
  collapsed all three. REC-07 approvalABSENT on all ten.
- `approved_observation_ready_count` — ZERO.
- `active_serving_count` — ZERO.SECTION 1 — WHAT APPLIES TO ALL TEN1.1 How a Stage 2 observation
  runsFICTIONAL ORGANISATION NAMING RULE — added after a real-name clearance reviewEvery
  organisation, client, vendor, employer, product, system and named workplace used in a source must
  either be a VERIFIED FICTIONAL NAME or be used under documented permission. A web search that
  found no exact match is NOT clearance. Absence of a search result is not evidence of absence, and
  it is not a legal opinion. Before REC-07 approval each source records the naming-clearance check:
  status, date, exact search terms used, reviewer, any real-world conflict found, the replacement
  name if one was required, and the trigger for a recheck. This is an internal source-integrity
  control, not participant-facing content. What the review found, and what was changedReal companies
  were found matching or closely matching names in the bank. TARNWELL POLSKA is a registered Polish
  plastics manufacturer in Tarnów, and the bank used Tarnwell Manufacturing for a scenario about a
  falsified safety inspection. EVERGREEN PACKAGING is a real US packaging business, and the bank
  used Evergreen Packaging Solutions as the vendor in a conflict-of-interest scenario. STONEWALL
  SOLUTIONS is a real IT consultancy, one letter from the bank’s Stonewell Solutions. ASHMORE
  appears in multiple active business names. The sector match is what makes these unsuitable rather
  than merely coincidental. A manufacturing-quality scenario naming a real manufacturer, or a
  vendor-conflict scenario naming a real vendor, could read as describing that company’s conduct,
  controls or staff — in an evidence source that may later be shown to participants, mentors,
  employers or partners. Sixty-four name instances were replaced across the four Parts. MOST OF THE
  ORIGINAL NAMES CAME FROM THE LEGACY SCENARIO LIBRARY AND THE DEMO PROJECT LIBRARY, so the same
  names are likely to appear in other T3A content and the clearance pass should cover those
  documents too.1.0A Personal namesThe bank uses given names such as Rachel, Kevin, Derek, Mia,
  Jordan, Patricia and Victor. Individually these are common and low risk. The risk comes from the
  COMBINATION — a real-looking organisation name, a named job title, a highly specific factual
  event, a recognisable industry or location, and a potentially damaging allegation. Personal names
  must stay detached from real organisation names and real client names, and the clearance record
  covers the combination rather than the name alone.1.1.2 Controlled delivery protocolNatural
  delivery was too loose for an evidence-producing interactionThe earlier position said natural
  delivery, not word-perfect recitation. That gives the mentor discretion over pace, pauses, stress,
  tone, emphasis, apparent warmth or scepticism, and follow-up timing — every one of which can
  change what the participant says BEFORE any determination is selected. REQUIRED WORDING IS
  VERBATIM, except for defined accessibility adjustments. PERMITTED variation: pronunciation only,
  within the stated pacing rule below. PACING RULE. After each participant response the mentor waits
  AT LEAST THREE SECONDS before reading the next scripted line, unless the participant continues
  speaking. At the B2 pause the mentor remains silent for TEN TO FIFTEEN SECONDS. No mentor may
  shorten, extend, repeat or fill a scripted pause except under a recorded access-preserving
  accommodation or a logged administration-variance event. Every source carries
  b2_pause_range_seconds 10 to 15 and between_turn_minimum_wait_seconds 3. Without these values,
  verbatim delivery still leaves consequential timing uncontrolled. PROHIBITED variation:
  rephrasing, added emphasis, repeated pressure, explanatory paraphrase, expressive reaction, and
  any unscripted follow-up. Audio recording or independent observation of a defined calibration
  sample. Delivery-drift review in calibration and in pilot monitoring. A structured
  administration_variance selection whenever a deviation occurs. Without this, evidence is not
  comparable across mentors, and the comparison across mentors is the whole basis of the model.
- Read the READ text verbatim, subject to the protocol above. No added facts and no added questions.
- Never answer a question the script does not cover. The scripted reply is: I would need to check
  that.
- Never signal approval or disapproval, by word, tone or expression.
- Ask each pressure beat ONCE and accept whatever answer comes. Pressing repeatedly tests
  persistence, which no question in the set records.
- Never explain the situation, restate it in other words, or help the participant towards anything.
- Record any departure from the script as administration variance, whether or not it was
  permitted.1.1.3 The mentor is the interlocutor and the observerA consequence to hold in
  viewBecause the mentor reads, the mentor is part of the situation being observed. Their delivery
  is an administration condition, not a neutral background. Two practical effects. Calibration must
  cover delivery as well as determination, or two mentors will produce materially different sessions
  from identical scripts. And administration variance now includes the mentor’s own departures,
  which is a self-report — the honesty of that record depends on the mentor, and the calibration
  study should look for it. This is not an argument against the design. It is the cost of it, and it
  is cheaper than the alternative of training and scheduling a second person for every session.1.2
  Version-level requirements held in common scenario_classobservation_ready. CONTROLLED FIVE-VALUE
  FIELD, IRREVERSIBLE: instructional, private_rehearsal, observation_ready, work_sample,
  team_simulation. The observed pathway is structurally incapable of serving instructional or
  private_rehearsal.source_formmentor_live_script
- `d1_situation_class` — S-1 to S-7, stated per source. This is a D1 CONSTRUCT classification and is
  NOT scenario_class. The earlier position put S-1 to S-7 in scenario_class, which overloaded a
  controlled irreversible field with a second classification system.dimensions_in_playD1, sampled
  through the mentor-read live exchange with a person present. The mandatory definition asks which
  dimension AND THE WORKPLACE DEMAND THROUGH WHICH IT IS SAMPLED. The earlier position said D1 only,
  which identifies the construct and not the demand. The demand is stated per source \u2014 it
  matters for job-relatedness, cross-context comparison and challenge.stageS2. Live observation.
  observer_id and observer_authorization_at_date required — no anonymous or system-attributed
  observation path exists at this Stage.ir
- `relevant_conduct` — Speaking style, accent, fluency, pace, volume, eye contact, hesitation,
  filler words, apology and politeness. None is observed and none appears in any question.
- `relevant_conduct` — MANDATORY VERSION-LEVEL FIELD, and it was MISSING from the S1, S2 and S4
  banks in earlier issues, which carried ir
- `relevant_conduct` — without its counterpart. It states WHAT OBSERVABLE D1 CONDUCT THIS SOURCE
  CREATES THE OPPORTUNITY TO RECORD — not that the dimension is D1. Stated per source.
- `cross_context_map` — MANDATORY VERSION-LEVEL FIELD, and it was MISSING from every source in
  earlier issues. The counterpart tables in the bank register are candidate pairings and do NOT
  substitute for it. This field states the other Stage and source versions this source links to,
  WHAT REMAINS CONSTANT while context varies, and what differences would prevent a recurrence claim.
  Under FD-D1-08 recurrence is unavailable without it. Stated per source.
- `route_observation_basis` — S2 ROUTE-OBSERVATION BASIS: a route is recorded as USED only where the
  participant PERFORMS the route within the observed session, or the platform captures a VERIFIABLE
  IN-SESSION ACTION through it. Speaking directly to the interlocutor is a route ONLY where the
  source explicitly identifies that live exchange as the route. A statement that the participant
  WILL send, call, escalate, submit or otherwise act AFTER the session is NOT route use and may
  support a CE-05 determination only. EVERY ROUTE ITEM CARRIES FIVE FIELDS: route_id;
  performable_in_session; observable_act; proof_event_or_artifact; q_d1_06_eligible.
- `stated_standard` — CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,
  DEADLINE OR OPERATING STANDARD ESTABLISHED BY THE SOURCE. It NEVER records a preferred behavioral
  answer. The earlier position read it as no source tells the participant what integrity conduct is
  expected, which is a different thing and left the field empty on sources that plainly contain
  standards \u2014 a twelve-point inspection required before shipment, a policy requiring a
  documented conversation before a formal process. Some sources legitimately have none. Stated per
  source.permitted_administration_varianceExtended response time. A written channel where an
  accommodation requires it, recorded as DEMAND-MODIFYING because the demand includes speaking to a
  person who is present.unsupported_inferencesThat the participant intended any outcome; was
  nervous, confident, evasive or candid; would behave the same way again. None may be recorded in a
  determination or a note.
- `min_seconds` — ,
- `max_seconds` — 600 minimum, 1200 maximum per session.
- `source_version_hash` — Assigned at registration.
- `proposed_compatibility_class` — A — PROPOSED, subject to source approval, administration testing
  and the applicable comparability controls. Compatibility class is ASSIGNED AT RELEASE, not
  inferred during authoring, and these sources have passed no drafting test, no calibration and no
  REC-07. Three separate claims, never collapsed: (1) WITHIN-SOURCE determination comparability: an
  INTENDED DESIGN PROPERTY ONLY. NOT ESTABLISHED until the approved calibration study measures
  agreement on the EXACT source version, question version, answer definitions AND administration
  protocol. Use the words PROPOSED or INTENDED in every register until CA-09 reports calibration
  results. It was previously described as claimable now, which asserts reliability before the study
  exists. (2) CROSS-SOURCE technical compatibility: NOT ESTABLISHED AT AUTHORING. Determined through
  the applicable version, administration and comparison controls. (3) CA-04 Part C context
  relationship: NOT ESTABLISHED until the approved counterpart map names the source versions, the
  constant demand, the approved contextual variation, the comparable conduct and the recurrence
  blockers. The earlier position asserted the sources were fully comparable within the bank, which
  collapsed all three.randomization_seedSelects WHICH APPROVED SOURCE VERSION is served from the
  bank. It is the record of source selection.presentation_variant_seedVaries organisation and person
  names within a served version, from an approved list, altering no material item. SEPARATE FROM
  randomization_seed. Recording a randomization seed while only varying names would let the same
  substantive source be served repeatedly under the appearance of random
  selection.source_version_idStable for the evidence record. Never varies with either
  seed.presentation_variant_valuesThe ACTUAL names rendered in the served instance. Required because
  the served text is no longer byte-for-byte the hashed source document once a variant is
  resolved.rendered_instance_hashCalculated AFTER the presentation variant is resolved. The exact
  participant-facing instance.
- `source_version_hash` — proves the canonical source;
- `rendered_instance_hash` — proves what the participant actually saw. Both are retained. This also
  closes the fictional-name clearance loop — it proves exactly which cleared names appeared in the
  observation. REC-07 naming conditionA source version CANNOT ENTER REC-07 REVIEW while fictional\_
- `name_clearance_status` — = pending. The only permitted values at submission are CLEARED and
  REPLACE_REQUIRED. A source marked replace_required is not approved until the replacement text is
  inserted, THE RENDERED INSTANCE IS RE-HASHED, and the clearance record is re-run against the final
  organisation, client, job title and scenario COMBINATION.fictional\_
- `name_clearance_status` — Governed by the launch naming rule at Part One, Section 5.5. A launch
  source that renders controlled role and entity labels only, and no proper organization, product,
  employer, vendor, client or personal name, is CLEARED because no proper name is rendered. Where a
  source does render a proper name, the status is PENDING and DOES NOT BECOME CLEARED BY ASSERTION:
  the documented combination check for that source and each selectable presentation-name set must be
  completed and recorded, or the name is replaced with a controlled label under Section 5.5. The
  field and its refusal remain built either way: a source rendering a proper name without a
  completed clearance record does not serve.clearance_date, search_terms_used, reviewerTo be
  recorded at the clearance check.known_real_world_conflictRecorded per source. Four confirmed
  conflicts were replaced; see Section 1.replacement_nameRecorded where a replacement was
  required.recheck_triggerBefore REC-07 approval, and again before pilot
  release.b2_pause_range_seconds10 to 15Q-D1-02 FAIRNESS CONTROLQ-D1-02 may be used for
  CROSS-CONTEXT TIMING only where the standard response channel and the B2 opportunity window were
  PRESERVED. Where an access-preserving accommodation, communication support or logged
  administration variance changes the response channel or the B2 window, the local observation may
  retain what was said, but Q-D1-02 IS MARKED timing_not_comparable AND EXCLUDED from cross-context
  and recurrence calculations. THE SYSTEM MUST NOT CONVERT A MODIFIED RESPONSE WINDOW INTO A
  BEHAVIORAL FINDING OF RAISED LATER. Drafting-test-2 record fields per question:
  source_version_id, question_id, communication_style, accent, disability, cultural_norm,
  language_background, accommodation_or_channel, result PASS or FAIL, defect_if_any, correction,
  independent_reviewer, review_date. TIMING RECORDEvery Stage 2 session records the timestamp of B1
  through B7, the duration of B2, and any administration variance affecting timing. A SESSION
  MISSING A REQUIRED BEAT TIMESTAMP IS NOT ELIGIBLE TO SUPPORT TIMING-RELATED DETERMINATIONS.
  Verbatim delivery controls wording and not timing; timing changes pressure and can alter CE-02 and
  CE-07 outcomes. Event fields: beat_started_at; beat_completed_at; b2_pause_seconds;
  timing_variance_ref; timing_determination_eligible.between_turn_minimum_wait_seconds3
- `attribution_support_set` — Stated per source. Where empty, any attribution to another person maps
  to no item and is recorded as not aligned.1.3 The beat patternEvery script runs the same seven
  beats. The shape is fixed so that two mentors reading two different scripts are running the same
  kind of session, which is what makes agreement measurable within a source and comparable across
  the bank. BeatSay / AskMentor actionCapture sets live hereB1 OpeningSAYRead the situation and the
  opening line. Then stop. B1 is NEVER a question. None yet. B2 The pausePAUSESay nothing for up to
  fifteen seconds. Do not prompt, nod, or fill the silence. C1, C2B3 The enquiryASK 1The direct
  question about the matter. C1, C2, C3, C4B4 The pressureASK 2The pressure question. Asked ONCE,
  accepted whatever the answer. C3 updateB5 The corrective promptASK 3What should happen now, and
  where the source calls for it, by when. C5, C6B6 The account testASK 4A neutral factual question
  about sequence or content. C7B7 CloseSAYThe closing line. End the session. C8 where the script
  carries a bearing interest.1.5 The mentor reference card, and why it holds no correct answersWhat
  the card is forEvery script now ends with a one-page

**MENTOR REFERENCE CARD**

, kept visible for the whole session. It carries the four questions, the material items, the
unsupported assertions, the attribution support set, the available routes, and which capture lines
are shown. It exists because the source sheet is a production document. During a live session the
mentor is reading, listening and capturing at the same time, and cannot be scrolling a specification
to check whether an assertion is supported. What the card deliberately does NOT containThere is no
expected response, no strong answer, no red flag and nothing indicating which capture line is the
better one. Stripping exactly that material out of the legacy scenarios was the largest single
change in the Stage 1 migration, and reintroducing it here under another name would undo it. The
reason is not squeamishness. A mentor who knows the preferred answer will find it, and two mentors
who both know it end up agreeing with each other ABOUT THE PARTICIPANT rather than about what
happened. The agreement statistic then looks excellent while measuring nothing. There is also
nothing to be correct about in most of these questions. Telling the manager first rather than
sending the report quietly is a defensible choice, not a right one. The moment the platform holds a
view about which is better, the record stops describing conduct and starts scoring judgment. ONE
PLACE CORRECTNESS GENUINELY EXISTS: whether the account corresponds to what the source provided.
That is verifiable, and Sections 2 and 3 of the card are the two lists it is checked against.
Selecting an unsupported claim is a factual check against a written list, not a judgment. How a
mentor knows which capture line fits everywhere else is what CA-08 trains and then MEASURES. If
mentors cannot apply the lines consistently, that shows up as low agreement, and the fix is the
question wording rather than a cheat sheet.1.4 The response capture catalogueThese are the lines the
mentor selects from. They are identical across all ten scripts, which is why the platform can render
them at the beat rather than repeating them in every source. Where a set is bound to the source —
routes, material items, support-set items — the source sheet supplies the options and the source is
named in the set below. The controlled catalogue is at Section 5.3 and GOVERNS. Thirteen capture
sets cover the fifteen question objects; C3 is one visual group holding three separately persisted
controls. THIS IS THE DETERMINISM REQUIREMENT. A capture set spanning several question objects means
two mentors coding an IDENTICAL RECORDING can produce different determinations by reading the
interface differently — the CA-03 drafting-test-1 failure the whole model exists to prevent. Within
every set, each line states EXACTLY which combination it covers. No line is a superset of another
and no two lines can be true at once. C1 What was said about the issue

- Named the specific issue and what it was.
- Said something was wrong without identifying what.
- Made no reference to an issue. C2 When it was first raised
- Raised it before the direct question was asked.
- Raised it in response to the direct question.
- Raised it later in the exchange, having not done so when asked.
- Did not raise it at any point in the session. C3 What the account contained
- The account included every material item and included no unsupported claim.
- The account omitted one or more material items and included no unsupported claim — SELECT WHICH
  omitted items.
- The account included one or more unsupported claims and omitted no material item — SELECT WHICH
  unsupported claims.
- The account both omitted one or more material items and included one or more unsupported claims —
  SELECT BOTH.
- No account was given. C4a What was said about the participant’s own part
- Stated what they themselves had done.
- Referred to their own involvement without stating what they did.
- Made no statement about their own involvement. C4b What was attributed to another person
- Made no attribution of responsibility to another person.
- Made one or more attributions and ALL were aligned to the source support set — SELECT WHICH.
- Made one or more attributions and NONE were aligned to the source support set.
- Made BOTH aligned and non-aligned attributions — SELECT the aligned items and record the presence
  of non-aligned attribution. C5a Corrective action
- Named one or more specific corrective actions.
- Said action was needed without naming a specific action.
- Named no corrective action. C5b1 Accountable actor — only where the source offers one
- Named who would carry out the action.
- Did not name who would carry out the action. C5b2 Corrective route — only where the source offers
  one
- Identified an available route for the corrective action — SELECT WHICH.
- Identified a route not listed by the source.
- Did not identify a route for the corrective action. C5c Time reference — only where the source
  calls for one
- Named when the action would occur.
- Did not name when the action would occur. C6 Which route was used
- Used one of the routes the source provides AND VERIFIABLE IN SESSION — SELECT WHICH.
- Used an observable means the source does not list.
- Used no route in the session. C7 What changed when the account was tested
- No material-item content changed.
- Added one or more material items that were absent from the first account, and omitted none that
  had been present.
- Omitted one or more material items that had been present in the first account, and added none.
- Both added and omitted material-item content.
- Gave no account at the test point. C8a Disclosure timing relative to the decision point — only
  where the source carries a bearing interest
- First disclosed before the decision point.
- First disclosed at the decision point.
- First disclosed after the decision point.
- Did not disclose during the observation. C8b Prompt condition — only where a disclosure occurred
- First disclosed before any direct question about the interest.
- First disclosed in direct response to the direct question about the interest.
- First disclosed after the direct question, but not in direct response to it.
- NOT APPLICABLE — no disclosure occurred. CURRENT APPLICABILITY STATUSEvery active S2, S3 and S4
  source carries a per-question Direct / Conditional / Not Served table. THAT TABLE ALONE GOVERNS
  REGISTRY SERVING.Legacy broad service statements and coverage summaries are NON-AUTHORITATIVE.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-001 — THE FIGURE ALREADY GIVEN
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-001$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-001$lit$, 'source'::t3a_content_family, $lit$THE FIGURE ALREADY GIVEN$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-001$lit$,
              'title', $lit$THE FIGURE ALREADY GIVEN$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 the figure is wrong. M2 the participant supplied it. M3 the error is the","enquiry_point":"B3.","information_made_available":"I1 the meeting is in twenty minutes. I2 the colleague is presenting","assertion_reference_set":"A1 the difference is immaterial. A2 the correct figure is not","accountable_actor_available":"True — the participant, the colleague.","available_routes":"R-a tell the colleague directly. \\[Q-D1-06 OBSERVABLE IN SESSION\\] R-b send","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Responding during a live exchange after discovering that a figure the","relevant_conduct":"Naming the inaccurate figure; when it is first raised relative to the direct","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none - the source establishes factual conditions and","information_withheld":"Whether anyone else has seen it. The correct figure numerically. Whether","attribution_support_set":"Empty.","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-001 — THE FIGURE ALREADY GIVEN

Situation class S-1. Pairs with SRC-D1-S1-001, -005 and -010.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant is an analyst. Twenty minutes before a management meeting, a senior colleague comes
to their desk to confirm a figure they are about to present: the quarterly rework rate, supplied by
the participant on Tuesday. The participant knows the figure is wrong. They used the wrong month's
data. The correct rate is materially higher. The colleague is friendly, in a hurry, and visibly
relieved the number is good.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are an analyst. On Tuesday you
sent a senior colleague the quarterly rework rate: four point one per cent. They are presenting it
to management this morning. On Wednesday afternoon, rebuilding a pivot table for a different report,
you noticed that the extract you used pulled September’s data instead of October’s. The rework rate
you sent is the wrong month. You have not recalculated it precisely, but October ran materially
higher than September. You have not told anyone. The four questions in this scriptEvery Stage 2
script asks these four, in this order, at beats B3 to B6. Nothing else in the script is a
question.#BeatASK, verbatim1B3“That’s the right number, isn’t it? Tuesday’s file?”2B4“I don’t really
have time to redo the slide. Is it close enough?”3B5“So what should happen now, and by when? I’m on
in twenty minutes.”4B6“Just so I’ve got it straight — when did you spot it?”The scriptBeatSay /
AskREAD aloud, verbatimCapture

- **B1** SAY“You’re an analyst. A senior colleague has come to your desk. They have a management
  meeting in twenty minutes and they’re presenting the quarterly rework rate — the figure you sent
  them on Tuesday.” Then: “Right, I’ve got the rework rate here for the twelve o’clock. Four point
  one per cent. That’s a good number.”—B2PAUSESay nothing. Up to fifteen seconds. Do not prompt,
  nod, or fill the silence. C1, C2B3ASK 1“That’s the right number, isn’t it? Tuesday’s file?”C1, C2,
  C3, C4B4ASK 2“I don’t really have time to redo the slide. Is it close enough?” Asked ONCE. Accept
  whatever answer comes. C3 update
- **B5** ASK 3“So what should happen now, and by when? I’m on in twenty minutes.”C5, C6B6ASK 4“Just
  so I’ve got it straight — when did you spot it?”C7B7SAY“Right. Thanks.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bNOT SERVEDSupport set empty, or not a source designed
  around attribution-Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a time
- **B5** Q-D1-06DirectSource places usable routes and the question carries a substantive
  used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A spoken statement of future intention does not. For this source
  the source-bound Q-D1-06 list is R-a, R-c, any other means actually performed and observable in
  session, and used-no-route. R-b AND R-d REMAIN CE-05 PLANNING CONTEXT unless a retained verified
  action event exists.
- `workplace_demand` — Responding during a live exchange after discovering that a figure the
  participant previously supplied is wrong and another person is about to rely on it.
- `relevant_conduct` — Naming the inaccurate figure; when it is first raised relative to the direct
  question; whether the account corresponds to the source-provided information; what is stated about
  the participant's own part in supplying the figure; identifying a corrective action, an
  accountable actor and a time; actual route use within the live exchange; and whether the account
  changes when timing is tested.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - the source establishes factual conditions and
  a twenty-minute deadline but no explicit rule, policy, control or operating standard.
- `information_made_available` — I1 the meeting is in twenty minutes. I2 the colleague is presenting
  the figure. I3 the figure as read aloud. I4 at B3, the direct question. I5 at B4, the time
  pressure and the offer. I6 at B5, the corrective prompt. I7 at B6, the timing question. P0 the
  participant pre-brief, given before B1: they supplied the figure, the extract pulled the wrong
  month, and October ran materially higher. This is source-provided information like any other.
- `material_items` — M1 the figure is wrong. M2 the participant supplied it. M3 the error is the
  wrong month’s data. M4 the correct figure is materially higher.
- `information_withheld` — Whether anyone else has seen it. The correct figure numerically. Whether
  the meeting decision depends on it.
- `assertion_reference_set` — A1 the difference is immaterial. A2 the correct figure is not
  available. A3 someone else prepared the file. A4 the colleague was told on Tuesday.
- `attribution_support_set` — Empty.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a tell the colleague directly. \[Q-D1-06 OBSERVABLE IN SESSION\] R-b send
  the corrected figure before the meeting. \[CE-05 PLANNING CONTEXT ONLY unless a retained verified
  send event exists\] R-c ask the colleague to hold the item. \[Q-D1-06 OBSERVABLE IN SESSION\] R-d
  raise it with the meeting chair. \[CE-05 PLANNING CONTEXT ONLY unless an authorised in-session
  channel is retained\]other_route_classificationPermitted where the participant states the means
  aloud.
- `accountable_actor_available` — True — the participant, the colleague.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-001

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“That’s the right
number, isn’t it? Tuesday’s file?”2B4“I don’t really have time to redo the slide. Is it close
enough?”3B5“So what should happen now, and by when? I’m on in twenty minutes.”4B6“Just so I’ve got
it straight — when did you spot it?”2 What the source established — material itemsAn account that
leaves one of these out is an account with an omission. This list is fixed before the session and
you may not add to it afterwards.

- M1 the figure is wrong.
- M2 the participant supplied it.
- M3 the error is the wrong month’s data.
- M4 the correct figure is materially higher.3 What the source does NOT support — unsupported
  assertionsIf the participant asserts one of these, the account included a claim the script
  information does not support. If they assert something outside this list, record it as outside the
  reference set and flag the source.
- A1 the difference is immaterial.
- A2 the correct figure is not available.
- A3 someone else prepared the file.
- A4 the colleague was told on Tuesday.4 Responsibility the source provides — attribution support
  setAn attribution to another person maps here only where it asserts the same responsibility about
  the same person. Anything else is not aligned, which is a factual observation and not a finding of
  fault.
- EMPTY. Nothing in this source attributes responsibility to another person, so ANY attribution to
  another is not aligned.5 Routes the source makes available
- R-a tell the colleague directly.
- R-b send the corrected figure before the meeting.
- R-c ask the colleague to hold the item.
- R-d raise it with the meeting chair.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the participant, the colleague. Serve the actor line. Time
  reference called forYES — B5 asks by when. Serve the time line. Bearing interestNO. C8 is not
  shown. Account testB6. The participant has a response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-002 — THE REFERENCE CALL
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-002$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-002$lit$, 'source'::t3a_content_family, $lit$THE REFERENCE CALL$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-002$lit$,
              'title', $lit$THE REFERENCE CALL$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 work was consistently late. M2 two deliverables were reassigned. M3 nothing","enquiry_point":"B3.","information_made_available":"I1 the caller is hiring for a coordination role. I2 the request to","assertion_reference_set":"A1 the delays were recorded formally. A2 the reassignments were","attribution_support_set":"AS1 the team lead never recorded the delays formally. AS2 two","accountable_actor_available":"True — human resources, the former team lead.","available_routes":"R-a answer the caller directly. R-b decline and refer to human resources. R-c","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Responding to a live reference request about a former colleague whose","relevant_conduct":"Naming the deliverable issues; timing relative to the direct question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none - no rule or policy on giving references is","information_withheld":"Whether Priya’s difficulties are known to the caller. Whether the","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-002 — THE REFERENCE CALL

Situation class S-2. Pairs with SRC-D1-S1-005, -006 and -010.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant took a call from a hiring manager at another organisation seeking a reference for a
former team member, Priya, who left six months ago. The participant knows Priya’s work was
consistently late and that two client deliverables were reassigned. They also know Priya was going
through a difficult period and that the team lead never recorded any of it formally. The caller is
warm, direct, and clearly hoping for a yes.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are taking a reference call
about Priya, who was on your team until six months ago. You worked alongside her for two years. Over
her final six months her work was consistently late. Two client deliverables were reassigned to
other people because of it. You know this because you took one of them over. The team lead at the
time never recorded any of it formally, so nothing appears in her file. You also knew she was going
through a difficult period. You have not been told whether you may give a reference. The four
questions in this scriptEvery Stage 2 script asks these four, in this order, at beats B3 to B6.
Nothing else in the script is a question.#BeatASK, verbatim1B3“Were there ever issues with
deliverables while you worked together?”2B4“She’s been out of work a while and this would really
help her. Is there anything you can give me?”3B5“Is there anything you’d want me to follow up on,
and with whom?”4B6“Just so I note it correctly — were the reassignments before or after she
left?”The scriptBeatSay / AskREAD aloud, verbatimCapture

- **B1** SAY“You’ve taken a call. The caller is a hiring manager at another organisation, asking for
  a reference on Priya, who left your team six months ago.” Then: “Thanks for taking this. I’m
  hiring for a coordination role and Priya’s given your name. Tell me how she handled
  deadlines.”—B2PAUSESay nothing. Up to fifteen seconds. Do not prompt, nod, or fill the silence.
  C1, C2B3ASK 1“Were there ever issues with deliverables while you worked together?”C1, C2, C3,
  C4B4ASK 2“She’s been out of work a while and this would really help her. Is there anything you can
  give me?” Asked ONCE. Accept whatever answer comes. C3 update
- **B5** ASK 3“Is there anything you’d want me to follow up on, and with whom?”C5, C6B6ASK 4“Just so
  I note it correctly — were the reassignments before or after she left?”C7B7SAY“That’s very
  helpful. Thank you.” End the call.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aNOT SERVEDSource does not place the participant role in the
  events-Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes and the question carries a substantive used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Responding to a live reference request about a former colleague whose
  performance record was never formally documented.
- `relevant_conduct` — Naming the deliverable issues; timing relative to the direct question;
  correspondence of the account to what the participant knows; what is stated about the team lead's
  failure to record; identifying a follow-up route; actual route use in the call; and whether the
  account changes when the sequence is tested.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - no rule or policy on giving references is
  established by the source, and its absence is itself source-provided information.
- `information_made_available` — I1 the caller is hiring for a coordination role. I2 the request to
  describe deadline handling. I3 at B3, the direct question about deliverables. I4 at B4, the
  appeal. I5 at B5, the follow-up prompt. I6 at B6, the sequence question. P0 the participant
  pre-brief, given before B1: work was consistently late over the final six months, two deliverables
  were reassigned and the participant took one over, nothing was recorded formally, and no guidance
  on giving references was received.
- `material_items` — M1 work was consistently late. M2 two deliverables were reassigned. M3 nothing
  was recorded formally.
- `information_withheld` — Whether Priya’s difficulties are known to the caller. Whether the
  organisation permits references. Whether the team lead would say the same.
- `assertion_reference_set` — A1 the delays were recorded formally. A2 the reassignments were
  routine. A3 Priya was not responsible for the deliverables. A4 the participant was Priya’s
  manager. A5 the delays did not affect clients.
- `attribution_support_set` — AS1 the team lead never recorded the delays formally. AS2 two
  deliverables were reassigned.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a answer the caller directly. R-b decline and refer to human resources. R-c
  offer to check what may be disclosed. R-d refer the caller to the former team
  lead.other_route_classificationPermitted where stated aloud.
- `accountable_actor_available` — True — human resources, the former team lead.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-002

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“Were there ever issues
with deliverables while you worked together?”2B4“She’s been out of work a while and this would
really help her. Is there anything you can give me?”3B5“Is there anything you’d want me to follow up
on, and with whom?”4B6“Just so I note it correctly — were the reassignments before or after she
left?”2 What the source established — material itemsAn account that leaves one of these out is an
account with an omission. This list is fixed before the session and you may not add to it
afterwards.

- M1 work was consistently late.
- M2 two deliverables were reassigned.
- M3 nothing was recorded formally.3 What the source does NOT support — unsupported assertionsIf the
  participant asserts one of these, the account included a claim the script information does not
  support. If they assert something outside this list, record it as outside the reference set and
  flag the source.
- A1 the delays were recorded formally.
- A2 the reassignments were routine.
- A3 Priya was not responsible for the deliverables.
- A4 the participant was Priya’s manager.
- A5 the delays did not affect clients.4 Responsibility the source provides — attribution support
  setAn attribution to another person maps here only where it asserts the same responsibility about
  the same person. Anything else is not aligned, which is a factual observation and not a finding of
  fault.
- AS1 the team lead never recorded the delays formally.
- AS2 two deliverables were reassigned.5 Routes the source makes available
- R-a answer the caller directly.
- R-b decline and refer to human resources.
- R-c offer to check what may be disclosed.
- R-d refer the caller to the former team lead.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — human resources, the former team lead. Time reference called
  forNO. The time line is NOT shown. Bearing interestNO. C8 is not shown. Account testB6. The
  participant has a response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-003 — THE SITE WALK
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-003$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-003$lit$, 'source'::t3a_content_family, $lit$THE SITE WALK$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-003$lit$,
              'title', $lit$THE SITE WALK$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 the load check has not been done. M2 it is required before the permit is","enquiry_point":"B3.","information_made_available":"I1 the night crew is due in an hour. I2 the request to sign. I3 at","assertion_reference_set":"A1 the check was done. A2 the check is advisory. A3 the supervisor can","attribution_support_set":"AS1 the supervisor asked for the signature. AS2 the supervisor offered","accountable_actor_available":"True — the supervisor, the participant.","available_routes":"R-a tell the supervisor directly. R-b decline to sign. R-c do the check now.","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Being asked to sign a permit during a live site walk when a required control","relevant_conduct":"Naming the incomplete load check; timing relative to the supervisor's","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"The load check is required before the permit is signed.","stated_standard_source_quote_or_location":"Participant pre-brief: the check sheet load-check","information_withheld":"Whether the scaffold is in fact sound. Whether the supervisor has","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-003 — THE SITE WALK

Situation class S-3 with S-1. Pairs with SRC-D1-S1-004 and -006.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant is a site coordinator. Walking the site with a supervisor at the end of the day, the
supervisor asks them to sign the permit for a section of scaffold so the night crew can work. The
participant knows the load check on that section has not been done. It is a required check and it
takes forty minutes. The supervisor is calm and matter-of-fact.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are a site coordinator. The
night crew is due in about an hour and your supervisor is walking the site with you. This morning
you pulled the check sheet for the east elevation scaffold. The load check line is blank and no
gauge readings are recorded, which means the check has not been done. The load check takes forty
minutes and you have not started it. The four questions in this scriptEvery Stage 2 script asks
these four, in this order, at beats B3 to B6. Nothing else in the script is a question.#BeatASK,
verbatim1B3“Checks all done on that section?”2B4“We’ll get it done first thing. Can you sign it now
and I’ll note it?”3B5“So what do you want me to do about the night crew, and by when do you need
it?”4B6“When did you last look at that section?”The scriptBeatSay / AskREAD aloud, verbatimCapture

- **B1** SAY“You’re a site coordinator, walking the site at end of day with your supervisor. They’re
  holding the permit for the scaffold on the east elevation.” Then: “Night crew’s in about an hour.
  I need this permit signed for the east elevation.”—B2PAUSESay nothing. Up to fifteen seconds. Do
  not prompt, nod, or fill the silence. C1, C2B3ASK 1“Checks all done on that section?”C1, C2, C3,
  C4B4ASK 2“We’ll get it done first thing. Can you sign it now and I’ll note it?” Asked ONCE. Accept
  whatever answer comes. C3 update
- **B5** ASK 3“So what do you want me to do about the night crew, and by when do you need it?”C5,
  C6B6ASK 4“When did you last look at that section?”C7B7SAY“Right. I’ll leave it with you.” End the
  session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a time
- **B5** Q-D1-06DirectSource places usable routes and the question carries a substantive
  used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Being asked to sign a permit during a live site walk when a required control
  has not been completed.
- `relevant_conduct` — Naming the incomplete load check; timing relative to the supervisor's
  question; correspondence of the account to the check sheet; what is stated about the supervisor's
  request and the participant's own signature; identifying a corrective action, actor and time;
  actual route use; and whether the account changes.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — The load check is required before the permit is signed.
- `stated_standard_source_quote_or_location` — Participant pre-brief: the check sheet load-check
  line is blank with no gauge readings, and the check is required before signing.
- `information_made_available` — I1 the night crew is due in an hour. I2 the request to sign. I3 at
  B3, the direct question. I4 at B4, the offer to note it retrospectively. I5 at B5, the corrective
  prompt. I6 at B6, the timing question. P0 the participant pre-brief, given before B1: the check
  sheet shows the load check line blank with no gauge readings, the check takes forty minutes, and
  it has not been started.
- `material_items` — M1 the load check has not been done. M2 it is required before the permit is
  signed. M3 it takes forty minutes. M4 the night crew is due in an hour.
- `information_withheld` — Whether the scaffold is in fact sound. Whether the supervisor has
  authority to waive the check. Whether this has happened before.
- `assertion_reference_set` — A1 the check was done. A2 the check is advisory. A3 the supervisor can
  waive it. A4 the section is not in use tonight. A5 the check takes ten minutes.
- `attribution_support_set` — AS1 the supervisor asked for the signature. AS2 the supervisor offered
  to note the check retrospectively.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a tell the supervisor directly. R-b decline to sign. R-c do the check now.
  R-d escalate above the supervisor.other_route_classificationPermitted where stated aloud.
- `accountable_actor_available` — True — the supervisor, the participant.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-003

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“Checks all done on that
section?”2B4“We’ll get it done first thing. Can you sign it now and I’ll note it?”3B5“So what do you
want me to do about the night crew, and by when do you need it?”4B6“When did you last look at that
section?”2 What the source established — material itemsAn account that leaves one of these out is an
account with an omission. This list is fixed before the session and you may not add to it
afterwards.

- M1 the load check has not been done.
- M2 it is required before the permit is signed.
- M3 it takes forty minutes.
- M4 the night crew is due in an hour.3 What the source does NOT support — unsupported assertionsIf
  the participant asserts one of these, the account included a claim the script information does not
  support. If they assert something outside this list, record it as outside the reference set and
  flag the source.
- A1 the check was done.
- A2 the check is advisory.
- A3 the supervisor can waive it.
- A4 the section is not in use tonight.
- A5 the check takes ten minutes.4 Responsibility the source provides — attribution support setAn
  attribution to another person maps here only where it asserts the same responsibility about the
  same person. Anything else is not aligned, which is a factual observation and not a finding of
  fault.
- AS1 the supervisor asked for the signature.
- AS2 the supervisor offered to note the check retrospectively.5 Routes the source makes available
- R-a tell the supervisor directly.
- R-b decline to sign.
- R-c do the check now.
- R-d escalate above the supervisor.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the supervisor, the participant. Time reference called forYES
  — B5 asks by when. Bearing interestNO. C8 is not shown. Account testB6. The participant has a
  response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-004 — THE HANDOVER
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-004$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-004$lit$, 'source'::t3a_content_family, $lit$THE HANDOVER$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-004$lit$,
              'title', $lit$THE HANDOVER$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 the redesign was largely Femi’s work. M2 Femi is not present. M3 the","enquiry_point":"B3.","information_made_available":"I1 the outgoing lead’s attribution. I2 that it is described as the","assertion_reference_set":"A1 the work was joint from the outset. A2 Femi has left the","attribution_support_set":"AS1 the redesign was largely Femi’s work. AS2 the participant","accountable_actor_available":"True — both leads, Femi.","available_routes":"R-a correct it in the room. R-b tell the incoming lead afterwards. R-c tell","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Responding in a live handover when credit for an absent colleague's work is","relevant_conduct":"Naming the misattribution; timing relative to the incoming lead's question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none - the source establishes authorship facts but no","information_withheld":"Whether Femi would object. Whether the outgoing lead knows. Whether it is","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-004 — THE HANDOVER

Situation class S-4. Pairs with SRC-D1-S1-008.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant is in a handover meeting with an incoming project lead. The outgoing lead is walking
through the work and credits the participant with the redesign of the intake process. The redesign
was largely the work of a colleague, Femi, who is on leave and is not in the room. The participant
contributed to it but did not originate it. The incoming lead is taking notes.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are in a handover meeting
between the outgoing and incoming project leads. The intake process redesign was largely the work of
your colleague Femi. He built the flow diagram and the validation logic over three weeks in March
and walked you through it before anyone else saw it. You contributed the exception-handling table.
Femi is on leave this week and is not in the room. The four questions in this scriptEvery Stage 2
script asks these four, in this order, at beats B3 to B6. Nothing else in the script is a
question.#BeatASK, verbatim1B3“So you designed the intake flow? I’ll want to talk to you about
extending it.”2B4“That means I know who to go to on it. That’s right, isn’t it?”3B5“Who else should
I be speaking to on that piece?”4B6“When was the redesign actually done?”The scriptBeatSay / AskREAD
aloud, verbatimCapture

- **B1** SAY“You’re in a handover meeting. The outgoing project lead is walking the incoming lead
  through the work.” Then, as the outgoing lead: “And the intake redesign — that was this one here.
  Honestly it’s the strongest thing in the handover.”—B2PAUSESay nothing. Up to fifteen seconds. Do
  not prompt, nod, or fill the silence. C1, C2B3ASK 1“So you designed the intake flow? I’ll want to
  talk to you about extending it.”C1, C2, C3, C4B4ASK 2“That means I know who to go to on it. That’s
  right, isn’t it?” Asked ONCE. Accept whatever answer comes. C3 update
- **B5** ASK 3“Who else should I be speaking to on that piece?”C5, C6B6ASK 4“When was the redesign
  actually done?”C7B7SAY“Got it. Next item.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes and the question carries a substantive used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Responding in a live handover when credit for an absent colleague's work is
  attributed to the participant.
- `relevant_conduct` — Naming the misattribution; timing relative to the incoming lead's question;
  correspondence of the account to what the source establishes about authorship; what is stated
  about the participant's own contribution and about Femi's; identifying a corrective step and
  route; actual route use in the room; and whether the account changes.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - the source establishes authorship facts but no
  explicit rule about attribution.
- `information_made_available` — I1 the outgoing lead’s attribution. I2 that it is described as the
  strongest part of the handover. I3 at B3, the direct question. I4 at B4, the convenience remark.
  I5 at B5, the who-else prompt. I6 at B6, the timing question. P0 the participant pre-brief, given
  before B1: Femi built the flow diagram and validation logic over three weeks in March and walked
  the participant through it; the participant contributed the exception-handling table; Femi is on
  leave.
- `material_items` — M1 the redesign was largely Femi’s work. M2 Femi is not present. M3 the
  participant contributed. M4 the participant did not originate it.
- `information_withheld` — Whether Femi would object. Whether the outgoing lead knows. Whether it is
  recorded anywhere.
- `assertion_reference_set` — A1 the work was joint from the outset. A2 Femi has left the
  organisation. A3 the participant led it. A4 Femi asked the participant to represent it.
- `attribution_support_set` — AS1 the redesign was largely Femi’s work. AS2 the participant
  contributed to it. AS3 the outgoing lead attributed it to the participant.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a correct it in the room. R-b tell the incoming lead afterwards. R-c tell
  the outgoing lead. R-d contact Femi.other_route_classificationPermitted where stated aloud.
- `accountable_actor_available` — True — both leads, Femi.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-004

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“So you designed the
intake flow? I’ll want to talk to you about extending it.”2B4“That means I know who to go to on it.
That’s right, isn’t it?”3B5“Who else should I be speaking to on that piece?”4B6“When was the
redesign actually done?”2 What the source established — material itemsAn account that leaves one of
these out is an account with an omission. This list is fixed before the session and you may not add
to it afterwards.

- M1 the redesign was largely Femi’s work.
- M2 Femi is not present.
- M3 the participant contributed.
- M4 the participant did not originate it.3 What the source does NOT support — unsupported
  assertionsIf the participant asserts one of these, the account included a claim the script
  information does not support. If they assert something outside this list, record it as outside the
  reference set and flag the source.
- A1 the work was joint from the outset.
- A2 Femi has left the organisation.
- A3 the participant led it.
- A4 Femi asked the participant to represent it.4 Responsibility the source provides — attribution
  support setAn attribution to another person maps here only where it asserts the same
  responsibility about the same person. Anything else is not aligned, which is a factual observation
  and not a finding of fault.
- AS1 the redesign was largely Femi’s work.
- AS2 the participant contributed to it.
- AS3 the outgoing lead attributed it to the participant.5 Routes the source makes available
- R-a correct it in the room.
- R-b tell the incoming lead afterwards.
- R-c tell the outgoing lead.
- R-d contact Femi.6 What this script does and does not ask forItemThis scriptAccountable actor
  offeredYES — both leads, Femi. Time reference called forNO. The time line is NOT shown. Bearing
  interestNO. C8 is not shown. Account testB6. The participant has a response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-005 — THE PANEL SEAT
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-005$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-005$lit$, 'source'::t3a_content_family, $lit$THE PANEL SEAT$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-005$lit$,
              'title', $lit$THE PANEL SEAT$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"accountable_actor_available":"True — the hiring manager, human resources.","available_routes":"R-a disclose at B1 unprompted. R-b disclose at B3. R-c decline the seat","bearing_interest":"PRESENT. The decision point is accepting the panel seat; the direct question","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Being asked in a live exchange to join a selection panel while holding an","relevant_conduct":"Whether the participant disclosed the source-defined relationship relative to","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none - the source deliberately establishes that the","information_made_available":"I1 the panel request and date. I2 the shortlist of four names. I3","material_items":"M1 a close former working relationship exists with a shortlisted person. M2 the","information_withheld":"Whether the relationship would disqualify. Whether the organisation has a","assertion_reference_set":"A1 the relationship is purely historical. A2 the organisation has no","attribution_support_set":"Empty.","enquiry_point":"B3, which is also the direct question for Q-D1-08b.","account_test_point":"B6.","post_test_account_opportunity":"true.","time_reference_called_for":"False."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-005 — THE PANEL SEAT

Situation class S-5. Pairs with SRC-D1-S1-009. One of two Stage 2 sources carrying CE-08.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant is asked by a hiring manager to sit on an interview panel next week. The shortlist
has four names on it. One of them is someone the participant worked closely with for three years and
remains in regular contact with socially. The hiring manager is brisk and treats it as a small
favour.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You have been asked to sit on an
interview panel next week and you are being handed the shortlist of four names. One of the four is
someone you worked alongside for three years at a previous employer. You remain in regular social
contact and were at their birthday two months ago. Nobody at your current organisation knows this.
The four questions in this scriptEvery Stage 2 script asks these four, in this order, at beats B3 to
B6. Nothing else in the script is a question.#BeatASK, verbatim1B3“Any reason you can’t sit on
it?”2B4“It’s only an hour and I’m short a panellist. Can you do me the favour?”3B5“If that’s a
problem, what do you want me to do about it?”4B6“When did you last work with them?”The scriptBeatSay
/ AskREAD aloud, verbatimCapture

- **B1** SAY“A hiring manager has stopped you. They want you on an interview panel next week and
  they’re handing you the shortlist.” Then: “I need a fourth on the panel next Thursday. Four names,
  here’s the list. Hour and a half at most.”—B2PAUSESay nothing. Up to fifteen seconds. Do not
  prompt, nod, or fill the silence. C1, C2, C8B3ASK 1“Any reason you can’t sit on it?”C1, C2, C3,
  C4, C8B4ASK 2“It’s only an hour and I’m short a panellist. Can you do me the favour?” Asked ONCE.
  Accept whatever answer comes. C3, C8 update
- **B5** ASK 3“If that’s a problem, what do you want me to do about it?”C5, C6B6ASK 4“When did you
  last work with them?”C7B7SAY“Leave it with me, I’ll confirm.” End the session. C8 final

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01NOT SERVEDNo source-defined issue;
CE-08 or another element is the construct-Q-D1-02NOT SERVEDNothing to have raised, or redundant with
the CE-08 timing model-Q-D1-03aNOT SERVEDNo account-comparison event-Q-D1-03b1NOT SERVEDParent not
served-Q-D1-03b2NOT SERVEDParent not served-Q-D1-04aNOT SERVEDSource does not place the participant
role in the events-Q-D1-04bNOT SERVEDSupport set empty, or not a source designed around
attribution-Q-D1-05aDirectSource creates a corrective-action prompt

- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor

- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route

- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes and the question carries a substantive used-no-route option; performable in session

- `available_routes` — Q-D1-07NOT SERVEDR3 or B6 asks about awareness or sequence, not a second
  account-Q-D1-08aDirectSource places the participant in a decision in which they hold an interest

- `bearing_interest` — Q-D1-08b — ConditionalServed where 08a records a disclosure

- `bearing_interest` — **Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.

- `workplace_demand` — Being asked in a live exchange to join a selection panel while holding an
  undisclosed relationship with a shortlisted person.

- `relevant_conduct` — Whether the participant disclosed the source-defined relationship relative to
  accepting the panel seat, and whether any disclosure followed a direct question; identifying a
  corrective step and route; actual route use in the exchange.

- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.

- `stated_standard` — none

- `stated_standard_source_quote_or_location` — none - the source deliberately establishes that the
  organisation's position on panel connections is not known to the participant.

- `information_made_available` — I1 the panel request and date. I2 the shortlist of four names. I3
  at B3, the direct question. I4 at B4, the appeal. I5 at B5, the corrective prompt. I6 at B6, the
  timing question. P0 the participant pre-brief, given before B1: three years working alongside one
  shortlisted person at a previous employer, continuing social contact, most recently two months
  ago; nobody at the current organisation knows.

- `material_items` — M1 a close former working relationship exists with a shortlisted person. M2 the
  relationship continues socially. M3 the participant is being asked to assess that person.

- `information_withheld` — Whether the relationship would disqualify. Whether the organisation has a
  policy. Whether the candidate knows.

- `assertion_reference_set` — A1 the relationship is purely historical. A2 the organisation has no
  policy. A3 the candidate is not a serious contender. A4 the participant did not recognise the
  name.

- `attribution_support_set` — Empty.

- `enquiry_point` — B3, which is also the direct question for Q-D1-08b.

- `account_test_point` — B6.

- `post_test_account_opportunity` — true.

- `available_routes` — R-a disclose at B1 unprompted. R-b disclose at B3. R-c decline the seat
  without saying why. R-d raise it with human resources.other_route_classificationPermitted where
  stated aloud.

- `accountable_actor_available` — True — the hiring manager, human resources.

- `time_reference_called_for` — False.

- `bearing_interest` — PRESENT. The decision point is accepting the panel seat; the direct question
  at B3 comes at that point, so disclosure before, at, or not at all are all reachable.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-005

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“Any reason you can’t
sit on it?”2B4“It’s only an hour and I’m short a panellist. Can you do me the favour?”3B5“If that’s
a problem, what do you want me to do about it?”4B6“When did you last work with them?”2 What the
source established — material itemsAn account that leaves one of these out is an account with an
omission. This list is fixed before the session and you may not add to it afterwards.

- M1 a close former working relationship exists with a shortlisted person.
- M2 the relationship continues socially.
- M3 the participant is being asked to assess that person.3 What the source does NOT support —
  unsupported assertionsIf the participant asserts one of these, the account included a claim the
  script information does not support. If they assert something outside this list, record it as
  outside the reference set and flag the source.
- A1 the relationship is purely historical.
- A2 the organisation has no policy.
- A3 the candidate is not a serious contender.
- A4 the participant did not recognise the name.4 Responsibility the source provides — attribution
  support setAn attribution to another person maps here only where it asserts the same
  responsibility about the same person. Anything else is not aligned, which is a factual observation
  and not a finding of fault.
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a disclose at B1 unprompted.
- R-b disclose at B3.
- R-c decline the seat without saying why.
- R-d raise it with human resources.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the hiring manager, human resources. Time reference called
  forNO. The time line is NOT shown. Bearing interestYES. C8 IS shown. Decision point is accepting
  the seat; the direct question is B3. — Account testB6. The participant has a response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-006 — THE QUIET WORD
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-006$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-006$lit$, 'source'::t3a_content_family, $lit$THE QUIET WORD$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-006$lit$,
              'title', $lit$THE QUIET WORD$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 personal costs were charged to the team card. M2 they have not been repaid.","enquiry_point":"B3.","information_made_available":"I1 the colleague has used the team card for personal costs. I2 they","assertion_reference_set":"A1 the amounts were repaid. A2 the card permits personal use. A3 the","attribution_support_set":"AS1 the colleague stated they charged personal costs to the team card.","accountable_actor_available":"True — the colleague, a manager, finance.","available_routes":"R-a respond to the colleague directly. R-b raise it with a manager. R-c raise","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Responding in a live private exchange to a colleague's disclosure of personal","relevant_conduct":"Naming the issue; timing relative to the direct question; correspondence of","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none - no policy on card use is established by the","information_withheld":"How much is involved. Whether anyone else knows. What the policy says.","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-006 — THE QUIET WORD

Situation class S-6. Pairs with SRC-D1-S1-002 and -007.

**MENTOR BRIEF — what the mentor knows and does not say**

A colleague the participant likes and has worked with for two years asks for a quiet word at the end
of the day. They say they have been putting some personal costs on the team card — a few lunches, a
train fare — and always meant to pay it back but has not. They are asking the participant not to say
anything while they sort it out. They are embarrassed and candid.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are a team member. A colleague
you have worked with for two years has asked for a quiet word at the end of the day. You do not know
what it is about. NOTE for the source register: this is the one script in the bank where the
participant learns the material facts DURING the session rather than beforehand. The pre-brief is
deliberately empty of them. The four questions in this scriptEvery Stage 2 script asks these four,
in this order, at beats B3 to B6. Nothing else in the script is a question.#BeatASK,
verbatim1B3“You’re not going to say anything, are you?”2B4“I’d lose my job over a few sandwiches.
You can see that, can’t you?”3B5“What do you think I should do?”4B6“How long have you known
something was off?”The scriptBeatSay / AskREAD aloud, verbatimCapture

- **B1** SAY“A colleague you’ve worked with for two years has asked for a quiet word at the end of
  the day.” Then: “Look — I’ve been putting a few things on the team card. Lunches, a train fare. I
  always meant to pay it back and I haven’t. Don’t say anything yet, I’ll sort it.”—B2PAUSESay
  nothing. Up to fifteen seconds. Do not prompt, nod, or fill the silence. C1, C2B3ASK 1“You’re not
  going to say anything, are you?”C1, C2, C3, C4B4ASK 2“I’d lose my job over a few sandwiches. You
  can see that, can’t you?” Asked ONCE. Accept whatever answer comes. C3 update
- **B5** ASK 3“What do you think I should do?”C5, C6B6ASK 4“How long have you known something was
  off?”C7B7SAY“Thanks. I appreciate it.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aNOT SERVEDSource does not place the participant role in the
  events-Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes and the question carries a substantive used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Responding in a live private exchange to a colleague's disclosure of personal
  use of a team payment card.
- `relevant_conduct` — Naming the issue; timing relative to the direct question; correspondence of
  the account to what the colleague stated; what is stated about the colleague's conduct relative to
  the support set; identifying a corrective action and route; actual route use; and whether the
  account changes.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - no policy on card use is established by the
  source.
- `information_made_available` — I1 the colleague has used the team card for personal costs. I2 they
  have not repaid it. I3 the request for silence. I4 at B3, the direct question. I5 at B4, the
  consequence. I6 at B5, the corrective prompt. I7 at B6, the timing question.
- `material_items` — M1 personal costs were charged to the team card. M2 they have not been repaid.
  M3 the colleague asked the participant not to say anything.
- `information_withheld` — How much is involved. Whether anyone else knows. What the policy says.
- `assertion_reference_set` — A1 the amounts were repaid. A2 the card permits personal use. A3 the
  participant only just learned of it, where they have been told otherwise. A4 a manager has
  approved it.
- `attribution_support_set` — AS1 the colleague stated they charged personal costs to the team card.
  AS2 the colleague stated they intended to repay it.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a respond to the colleague directly. R-b raise it with a manager. R-c raise
  it with finance. R-d ask the colleague to raise it themselves by a
  date.other_route_classificationPermitted where stated aloud.
- `accountable_actor_available` — True — the colleague, a manager, finance.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-006

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“You’re not going to say
anything, are you?”2B4“I’d lose my job over a few sandwiches. You can see that, can’t you?”3B5“What
do you think I should do?”4B6“How long have you known something was off?”2 What the source
established — material itemsAn account that leaves one of these out is an account with an omission.
This list is fixed before the session and you may not add to it afterwards.

- M1 personal costs were charged to the team card.
- M2 they have not been repaid.
- M3 the colleague asked the participant not to say anything.3 What the source does NOT support —
  unsupported assertionsIf the participant asserts one of these, the account included a claim the
  script information does not support. If they assert something outside this list, record it as
  outside the reference set and flag the source.
- A1 the amounts were repaid.
- A2 the card permits personal use.
- A3 the participant only just learned of it, where they have been told otherwise.
- A4 a manager has approved it.4 Responsibility the source provides — attribution support setAn
  attribution to another person maps here only where it asserts the same responsibility about the
  same person. Anything else is not aligned, which is a factual observation and not a finding of
  fault.
- AS1 the colleague stated they charged personal costs to the team card.
- AS2 the colleague stated they intended to repay it.5 Routes the source makes available
- R-a respond to the colleague directly.
- R-b raise it with a manager.
- R-c raise it with finance.
- R-d ask the colleague to raise it themselves by a date.6 What this script does and does not ask
  forItemThis scriptAccountable actor offeredYES — the colleague, a manager, finance. Time reference
  called forNO. The time line is NOT shown. Bearing interestNO. C8 is not shown. Account testB6.
  NOTE: in this script the participant learns the facts DURING the session, so the account tested at
  B6 is the one given from B3 onward.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-007 — THE CLIENT QUESTION
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-007$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-007$lit$, 'source'::t3a_content_family, $lit$THE CLIENT QUESTION$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-007$lit$,
              'title', $lit$THE CLIENT QUESTION$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 the milestone was not met. M2 two of five deliverables completed. M3 three","enquiry_point":"B3.","information_made_available":"I1 the agenda reaches the milestone. I2 at B3, the direct question.","assertion_reference_set":"A1 the milestone was met. A2 all five completed. A3 the client was","attribution_support_set":"AS1 the status report is compiled by another person. AS2 that report","accountable_actor_available":"True — the report compiler, the participant.","available_routes":"R-a answer the client directly. R-b defer and follow up in writing. R-c raise","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Answering a client directly, in a live call, about a milestone the","relevant_conduct":"Naming the missed milestone; timing relative to the client's direct question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none - the source establishes a milestone date but no","information_withheld":"Whether the client’s director will notice. Whether the slipped items will","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-007 — THE CLIENT QUESTION

Situation class S-1. Pairs with SRC-D1-S1-001 and -010.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant is in a routine review call with a client contact. The client asks whether the
second milestone was met last Friday. It was not. Two of the five deliverables were completed; the
rest slipped to this week. The internal status report the client receives is compiled by someone
else and has not gone out yet. The client is relaxed and going through a checklist.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are the project lead on a client
engagement and you are about to join a routine review call. Milestone two was due last Friday. Of
its five deliverables, two completed on Friday. Three slipped into this week and are still not
finished. The status report the client receives is compiled by someone else on the team and has not
gone out yet, so the client has not been told. The four questions in this scriptEvery Stage 2 script
asks these four, in this order, at beats B3 to B6. Nothing else in the script is a
question.#BeatASK, verbatim1B3“And milestone two — that landed Friday, yes?”2B4“I’ve already told my
director we’re on track. That’s still right, isn’t it?”3B5“If anything’s outstanding, when will I
have it?”4B6“When did the last piece actually complete?”The scriptBeatSay / AskREAD aloud,
verbatimCapture

- **B1** SAY“You’re on a routine review call with your client contact. They’re working through an
  agenda.” Then: “Right — risks, resourcing, and then milestones. Let’s do milestones.”—B2PAUSESay
  nothing. Up to fifteen seconds. Do not prompt, nod, or fill the silence. C1, C2B3ASK 1“And
  milestone two — that landed Friday, yes?”C1, C2, C3, C4B4ASK 2“I’ve already told my director we’re
  on track. That’s still right, isn’t it?” Asked ONCE. Accept whatever answer comes. C3 update
- **B5** ASK 3“If anything’s outstanding, when will I have it?”C5, C6B6ASK 4“When did the last piece
  actually complete?”C7B7SAY“Understood. Next item.” End the call.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a time
- **B5** Q-D1-06DirectSource places usable routes and the question carries a substantive
  used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Answering a client directly, in a live call, about a milestone the
  participant knows was not met.
- `relevant_conduct` — Naming the missed milestone; timing relative to the client's direct question;
  correspondence of the account to the deliverable status; what is stated about the participant's
  own part and the status report compiler; identifying a corrective action, actor and time; actual
  route use in the call; and whether the account changes.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none - the source establishes a milestone date but no
  explicit reporting rule.
- `information_made_available` — I1 the agenda reaches the milestone. I2 at B3, the direct question.
  I3 at B4, that the client has already reported upward. I4 at B5, the corrective prompt. I5 at B6,
  the completion question. P0 the participant pre-brief, given before B1: two of five deliverables
  completed Friday, three slipped into this week and are unfinished, and the status report compiled
  by another team member has not gone out.
- `material_items` — M1 the milestone was not met. M2 two of five deliverables completed. M3 three
  slipped to this week. M4 the status report has not been issued.
- `information_withheld` — Whether the client’s director will notice. Whether the slipped items will
  complete this week. Who compiles the status report.
- `assertion_reference_set` — A1 the milestone was met. A2 all five completed. A3 the client was
  already informed. A4 the slippage was agreed. A5 the report has gone out.
- `attribution_support_set` — AS1 the status report is compiled by another person. AS2 that report
  has not yet been issued.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a answer the client directly. R-b defer and follow up in writing. R-c raise
  it with the report compiler. R-d escalate internally before
  answering.other_route_classificationPermitted where stated aloud.
- `accountable_actor_available` — True — the report compiler, the participant.
- `time_reference_called_for` — TRUE. B5 asks when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-007

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“And milestone two —
that landed Friday, yes?”2B4“I’ve already told my director we’re on track. That’s still right, isn’t
it?”3B5“If anything’s outstanding, when will I have it?”4B6“When did the last piece actually
complete?”2 What the source established — material itemsAn account that leaves one of these out is
an account with an omission. This list is fixed before the session and you may not add to it
afterwards.

- M1 the milestone was not met.
- M2 two of five deliverables completed.
- M3 three slipped to this week.
- M4 the status report has not been issued.3 What the source does NOT support — unsupported
  assertionsIf the participant asserts one of these, the account included a claim the script
  information does not support. If they assert something outside this list, record it as outside the
  reference set and flag the source.
- A1 the milestone was met.
- A2 all five completed.
- A3 the client was already informed.
- A4 the slippage was agreed.
- A5 the report has gone out.4 Responsibility the source provides — attribution support setAn
  attribution to another person maps here only where it asserts the same responsibility about the
  same person. Anything else is not aligned, which is a factual observation and not a finding of
  fault.
- AS1 the status report is compiled by another person.
- AS2 that report has not yet been issued.5 Routes the source makes available
- R-a answer the client directly.
- R-b defer and follow up in writing.
- R-c raise it with the report compiler.
- R-d escalate internally before answering.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the report compiler, the participant. Time reference called
  forYES — B5 asks when. Bearing interestNO. C8 is not shown. Account testB6. The participant has a
  response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-008 — THE DRAFT APPROVAL
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-008$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-008$lit$, 'source'::t3a_content_family, $lit$THE DRAFT APPROVAL$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-008$lit$,
              'title', $lit$THE DRAFT APPROVAL$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 four of six sections were not reviewed. M2 the participant’s name would","enquiry_point":"B3.","information_made_available":"I1 the cover note goes out in ten minutes. I2 the review question.","assertion_reference_set":"A1 the whole questionnaire was reviewed. A2 another reviewer covered","attribution_support_set":"AS1 the manager described section four as something nobody reads.","accountable_actor_available":"True — the manager, the participant.","available_routes":"R-a answer the manager directly. R-b ask for the ten minutes to finish. R-c","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Confirming in a live exchange whether a review was completed when only part","relevant_conduct":"Naming the unreviewed sections; timing relative to the manager's question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"The participant's name would appear on the review line of a document going to","stated_standard_source_quote_or_location":"B3: the manager asks whether the participant's name","information_withheld":"Whether the unreviewed sections contain anything. Whether anyone else","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks how long.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-008 — THE DRAFT APPROVAL

Situation class S-2. Pairs with SRC-D1-S1-005 and -006.

**MENTOR BRIEF — what the mentor knows and does not say**

A manager stops the participant to confirm that they reviewed the vendor security questionnaire
before it went to the client. The participant reviewed the first two sections and not the remaining
four. They ran out of time and intended to come back to it. The manager is signing a cover note and
needs a yes.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are in a corridor and your
manager is about to stop you. On Monday you were asked to review the vendor security questionnaire
before it goes to the client. It has six sections. You reviewed sections one and two on Monday
afternoon, were pulled onto something else, and never came back to sections three to six. It is now
Thursday. The four questions in this scriptEvery Stage 2 script asks these four, in this order, at
beats B3 to B6. Nothing else in the script is a question.#BeatASK, verbatim1B3“So I can put your
name on the review line?”2B4“It’s a formality — nobody reads section four. Can I just put you
down?”3B5“If you need more time, how long, and what do I tell the client?”4B6“Which sections did you
get through?”The scriptBeatSay / AskREAD aloud, verbatimCapture

- **B1** SAY“Your manager has stopped you in the corridor. They’re holding a cover note.” Then:
  “This goes out in ten minutes. The vendor security questionnaire — I’m putting the review down as
  done.”—B2PAUSESay nothing. Up to fifteen seconds. Do not prompt, nod, or fill the silence. C1,
  C2B3ASK 1“So I can put your name on the review line?”C1, C2, C3, C4B4ASK 2“It’s a formality —
  nobody reads section four. Can I just put you down?” Asked ONCE. Accept whatever answer comes. C3
  update
- **B5** ASK 3“If you need more time, how long, and what do I tell the client?”C5, C6B6ASK 4“Which
  sections did you get through?”C7B7SAY“Fine. Thanks.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a time
- **B5** Q-D1-06DirectSource places usable routes and the question carries a substantive
  used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Confirming in a live exchange whether a review was completed when only part
  of it was.
- `relevant_conduct` — Naming the unreviewed sections; timing relative to the manager's question;
  correspondence of the account to what was reviewed; what is stated about the participant's own
  review and the manager's characterisation; identifying a corrective action, actor and time; actual
  route use; and whether the account changes.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — The participant's name would appear on the review line of a document going to
  a client.
- `stated_standard_source_quote_or_location` — B3: the manager asks whether the participant's name
  can go on the review line.
- `information_made_available` — I1 the cover note goes out in ten minutes. I2 the review question.
  I3 at B3, the name-on-the-line question. I4 at B4, the formality remark. I5 at B5, the corrective
  prompt. I6 at B6, the sections question. P0 the participant pre-brief, given before B1: sections
  one and two reviewed Monday afternoon, sections three to six never reached after being pulled onto
  other work, and it is now Thursday.
- `material_items` — M1 four of six sections were not reviewed. M2 the participant’s name would
  appear on the review line. M3 the questionnaire is going to the client.
- `information_withheld` — Whether the unreviewed sections contain anything. Whether anyone else
  reviewed them. Whether the client relies on the review line.
- `assertion_reference_set` — A1 the whole questionnaire was reviewed. A2 another reviewer covered
  the rest. A3 the review line is not attributed. A4 section four does not require review.
- `attribution_support_set` — AS1 the manager described section four as something nobody reads.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a answer the manager directly. R-b ask for the ten minutes to finish. R-c
  ask that the review line be left blank. R-d raise it with the client
  owner.other_route_classificationPermitted where stated aloud.
- `accountable_actor_available` — True — the manager, the participant.
- `time_reference_called_for` — TRUE. B5 asks how long.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-008

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“So I can put your name
on the review line?”2B4“It’s a formality — nobody reads section four. Can I just put you
down?”3B5“If you need more time, how long, and what do I tell the client?”4B6“Which sections did you
get through?”2 What the source established — material itemsAn account that leaves one of these out
is an account with an omission. This list is fixed before the session and you may not add to it
afterwards.

- M1 four of six sections were not reviewed.
- M2 the participant’s name would appear on the review line.
- M3 the questionnaire is going to the client.3 What the source does NOT support — unsupported
  assertionsIf the participant asserts one of these, the account included a claim the script
  information does not support. If they assert something outside this list, record it as outside the
  reference set and flag the source.
- A1 the whole questionnaire was reviewed.
- A2 another reviewer covered the rest.
- A3 the review line is not attributed.
- A4 section four does not require review.4 Responsibility the source provides — attribution support
  setAn attribution to another person maps here only where it asserts the same responsibility about
  the same person. Anything else is not aligned, which is a factual observation and not a finding of
  fault.
- AS1 the manager described section four as something nobody reads.5 Routes the source makes
  available
- R-a answer the manager directly.
- R-b ask for the ten minutes to finish.
- R-c ask that the review line be left blank.
- R-d raise it with the client owner.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the manager, the participant. Time reference called forYES —
  B5 asks how long. Bearing interestNO. C8 is not shown. Account testB6. The participant has a
  response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-009 — THE SALARY BAND
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-009$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-009$lit$, 'source'::t3a_content_family, $lit$THE SALARY BAND$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-009$lit$,
              'title', $lit$THE SALARY BAND$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"material_items":"M1 the participant has seen the draft. M2 the draft is confidential. M3 the","enquiry_point":"B3.","information_made_available":"I1 the colleague has an external offer. I2 the deadline. I3 at B3,","assertion_reference_set":"A1 the bands are final. A2 the participant has not seen them, where","accountable_actor_available":"True — human resources, the workstream owner.","available_routes":"R-a answer the colleague directly. R-b decline and say why. R-c refer them to","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Responding in a live exchange to a colleague's request for confidential","relevant_conduct":"Naming the confidentiality position; timing relative to the direct question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"The draft the participant saw is confidential and unapproved.","stated_standard_source_quote_or_location":"Participant pre-brief: the participant was told the","information_withheld":"What the bands actually say. When they will be approved. Whether the","attribution_support_set":"AS1 the participant was told the draft is confidential.","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-009 — THE SALARY BAND

Situation class S-7. Pairs with SRC-D1-S1-002.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant has seen the draft salary bands for next year as part of a workstream they support.
They were told the draft is confidential and not yet approved. A colleague they are friendly with
asks whether the bands have changed, saying they are deciding whether to accept an offer elsewhere.
The colleague is anxious and sincere.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You support the compensation
workstream. In a working session last week you saw the draft salary bands for next year. You were
told at the time that the draft is confidential and has not been approved. A colleague you are
friendly with is about to ask you about it. The four questions in this scriptEvery Stage 2 script
asks these four, in this order, at beats B3 to B6. Nothing else in the script is a
question.#BeatASK, verbatim1B3“You’ve seen them, haven’t you? Is it worth waiting?”2B4“I have to
answer them by Friday and I won’t say where it came from. Can you give me anything?”3B5“What should
I do then, and who do I ask?”4B6“When did you see the draft?”The scriptBeatSay / AskREAD aloud,
verbatimCapture

- **B1** SAY“A colleague you’re friendly with has caught you at your desk. They look anxious.” Then:
  “I’ve got an offer somewhere else and I have to answer by Friday. The salary bands for next year —
  I know you’ve been on that workstream.”—B2PAUSESay nothing. Up to fifteen seconds. Do not prompt,
  nod, or fill the silence. C1, C2B3ASK 1“You’ve seen them, haven’t you? Is it worth waiting?”C1,
  C2, C3, C4B4ASK 2“I have to answer them by Friday and I won’t say where it came from. Can you give
  me anything?” Asked ONCE. Accept whatever answer comes. C3 update
- **B5** ASK 3“What should I do then, and who do I ask?”C5, C6B6ASK 4“When did you see the
  draft?”C7B7SAY“Okay. Thanks anyway.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point at B3 and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aNOT SERVEDSource does not place the participant role in the
  events-Q-D1-04bNOT SERVEDSupport set empty, or not a source designed around
  attribution-Q-D1-05aDirectSource creates a corrective-action prompt
- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes and the question carries a substantive used-no-route option; performable in session
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.
- `workplace_demand` — Responding in a live exchange to a colleague's request for confidential
  information the participant holds.
- `relevant_conduct` — Naming the confidentiality position; timing relative to the direct question;
  correspondence of the account to what the participant was told; identifying a route the colleague
  may use; actual route use; and whether the account changes.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — The draft the participant saw is confidential and unapproved.
- `stated_standard_source_quote_or_location` — Participant pre-brief: the participant was told the
  draft is confidential and has not been approved.
- `information_made_available` — I1 the colleague has an external offer. I2 the deadline. I3 at B3,
  the direct question. I4 at B4, the assurance of confidentiality and the deadline. I5 at B5, the
  corrective prompt. I6 at B6, the timing question. P0 the participant pre-brief, given before B1:
  the draft bands were seen in a working session last week and the participant was told at the time
  that the draft is confidential and unapproved.
- `material_items` — M1 the participant has seen the draft. M2 the draft is confidential. M3 the
  draft is not approved.
- `information_withheld` — What the bands actually say. When they will be approved. Whether the
  colleague’s role is affected.
- `assertion_reference_set` — A1 the bands are final. A2 the participant has not seen them, where
  they have. A3 the information is public. A4 the participant is permitted to share it.
- `attribution_support_set` — AS1 the participant was told the draft is confidential.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a answer the colleague directly. R-b decline and say why. R-c refer them to
  human resources. R-d ask the workstream owner what may be said.other_route_classificationPermitted
  where stated aloud.
- `accountable_actor_available` — True — human resources, the workstream owner.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-009

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“You’ve seen them,
haven’t you? Is it worth waiting?”2B4“I have to answer them by Friday and I won’t say where it came
from. Can you give me anything?”3B5“What should I do then, and who do I ask?”4B6“When did you see
the draft?”2 What the source established — material itemsAn account that leaves one of these out is
an account with an omission. This list is fixed before the session and you may not add to it
afterwards.

- M1 the participant has seen the draft.
- M2 the draft is confidential.
- M3 the draft is not approved.3 What the source does NOT support — unsupported assertionsIf the
  participant asserts one of these, the account included a claim the script information does not
  support. If they assert something outside this list, record it as outside the reference set and
  flag the source.
- A1 the bands are final.
- A2 the participant has not seen them, where they have.
- A3 the information is public.
- A4 the participant is permitted to share it.4 Responsibility the source provides — attribution
  support setAn attribution to another person maps here only where it asserts the same
  responsibility about the same person. Anything else is not aligned, which is a factual observation
  and not a finding of fault.
- AS1 the participant was told the draft is confidential.5 Routes the source makes available
- R-a answer the colleague directly.
- R-b decline and say why.
- R-c refer them to human resources.
- R-d ask the workstream owner what may be said.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — human resources, the workstream owner. Time reference called
  forNO. The time line is NOT shown. Bearing interestNO. C8 is not shown. Account testB6. The
  participant has a response window.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S2-010 — THE RENEWAL RECOMMENDATION
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S2-010$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S2-010$lit$, 'source'::t3a_content_family, $lit$THE RENEWAL RECOMMENDATION$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S2-010$lit$,
              'title', $lit$THE RENEWAL RECOMMENDATION$lit$,
              'stage_code', $lit$S2$lit$,
              'source_sheet', $lit${"accountable_actor_available":"True — the commissioning manager.","available_routes":"R-a disclose at B1 unprompted. R-b disclose at B3. R-c decline the review.","bearing_interest":"PRESENT. The decision point is accepting the review; the direct question at","route_observation_basis":"Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED","workplace_demand":"Being asked in a live exchange to recommend on a supplier while holding an","relevant_conduct":"Whether the participant disclosed the source-defined interest relative to","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,","stated_standard_source_quote_or_location":"none - the source deliberately leaves the","information_made_available":"I1 the renewal review request and deadline. I2 at B3, the direct","material_items":"M1 an informal job offer exists from a director at the incumbent. M2 the offer","information_withheld":"Whether the offer is still open. Whether the director is involved in the","assertion_reference_set":"A1 the offer was declined. A2 the director has no involvement with the","attribution_support_set":"Empty.","enquiry_point":"B3, which is also the direct question for Q-D1-08b.","account_test_point":"B6.","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","source_version_hash":"Not assigned. REC-07 approvalABSENT on all ten.","approved_observation_ready_count":"ZERO.","active_serving_count":"ZERO.SECTION 1 — WHAT APPLIES TO ALL NINE1.1 What a Stage 3 observation","d1_situation_class":"S-1 to S-7, stated per source. A D1 CONSTRUCT classification, NOT","proposed_compatibility_class":"A — PROPOSED, subject to source approval, administration testing","name_clearance_status":"Governed by the launch naming rule at Part One, Section 5.5. A launch","min_seconds":"and","max_seconds":": submission window plus response windows, stated per source."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S2-010 — THE RENEWAL RECOMMENDATION

Situation class S-5 with S-2. Pairs with SRC-D1-S1-009. Second Stage 2 source carrying CE-08.

**MENTOR BRIEF — what the mentor knows and does not say**

The participant is asked to recommend whether to renew a services contract with the incumbent
supplier. A director at that supplier is the participant’s former manager, who three weeks ago
informally offered the participant a job. Nothing has been agreed and the participant has not
responded to the offer. The commissioning manager wants a recommendation by the end of the week.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

Read or displayed to the participant before B1. This is what the participant knows walking in, and
how they know it. Nothing in it is repeated during the session. You are being asked to recommend
whether to renew a services contract with the incumbent supplier. Three weeks ago a director at that
supplier — your former manager — took you for coffee and said informally that there would be a role
for you there if you wanted one. Nothing was agreed and you have not replied. Nobody at your current
organisation knows about the conversation. The four questions in this scriptEvery Stage 2 script
asks these four, in this order, at beats B3 to B6. Nothing else in the script is a
question.#BeatASK, verbatim1B3“Nothing that would stop you looking at it objectively?”2B4“It would
take someone else a fortnight to get up to speed. You’ll take it, won’t you?”3B5“If there’s an
issue, what do you suggest and by when?”4B6“When did you last speak to anyone there?”The
scriptBeatSay / AskREAD aloud, verbatimCapture

- **B1** SAY“The commissioning manager has asked to see you about the services contract that comes
  up for renewal.” Then: “I need a recommendation on the renewal by Friday. You know their delivery
  better than anyone here.”—B2PAUSESay nothing. Up to fifteen seconds. Do not prompt, nod, or fill
  the silence. C1, C2, C8B3ASK 1“Nothing that would stop you looking at it objectively?”C1, C2, C3,
  C4, C8B4ASK 2“It would take someone else a fortnight to get up to speed. You’ll take it, won’t
  you?” Asked ONCE. Accept whatever answer comes. C3, C8 update
- **B5** ASK 3“If there’s an issue, what do you suggest and by when?”C5, C6B6ASK 4“When did you last
  speak to anyone there?”C7B7SAY“Right. I’ll wait to hear.” End the session. C8 final

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01NOT SERVEDNo source-defined issue;
CE-08 or another element is the construct-Q-D1-02NOT SERVEDNothing to have raised, or redundant with
the CE-08 timing model-Q-D1-03aNOT SERVEDNo account-comparison event-Q-D1-03b1NOT SERVEDParent not
served-Q-D1-03b2NOT SERVEDParent not served-Q-D1-04aNOT SERVEDSource does not place the participant
role in the events-Q-D1-04bNOT SERVEDSupport set empty, or not a source designed around
attribution-Q-D1-05aDirectSource creates a corrective-action prompt

- **B5** Q-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor

- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route

- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a time

- **B5** Q-D1-06DirectSource places usable routes and the question carries a substantive
  used-no-route option; performable in session

- `available_routes` — Q-D1-07NOT SERVEDR3 or B6 asks about awareness or sequence, not a second
  account-Q-D1-08aDirectSource places the participant in a decision in which they hold an interest

- `bearing_interest` — Q-D1-08b — ConditionalServed where 08a records a disclosure

- `bearing_interest` — **Source sheet**

- `route_observation_basis` — Only a route PERFORMED OR VERIFIABLY INITIATED WITHIN THE RECORDED
  LIVE SESSION counts as Q-D1-06. A statement of future intention does not. The Q-D1-06 option list
  for this source must contain ONLY routes the observation record can verify as used.

- `workplace_demand` — Being asked in a live exchange to recommend on a supplier while holding an
  unanswered informal job offer from a director there.

- `relevant_conduct` — Whether the participant disclosed the source-defined interest relative to
  accepting the review, and whether any disclosure followed a direct question; identifying a
  corrective step, route and time; actual route use in the exchange.

- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.

- `stated_standard` — none

- `stated_standard_source_quote_or_location` — none - the source deliberately leaves the
  organisation's position on such interests unstated.

- `information_made_available` — I1 the renewal review request and deadline. I2 at B3, the direct
  question. I3 at B4, the convenience argument. I4 at B5, the corrective prompt. I5 at B6, the
  contact question. P0 the participant pre-brief, given before B1: three weeks ago a director at the
  incumbent, the participant’s former manager, informally said there would be a role if wanted;
  nothing was agreed, the participant has not replied, and nobody at the current organisation knows.

- `material_items` — M1 an informal job offer exists from a director at the incumbent. M2 the offer
  is three weeks old and unanswered. M3 the participant is being asked to recommend on that
  supplier.

- `information_withheld` — Whether the offer is still open. Whether the director is involved in the
  contract. Whether the organisation has a policy.

- `assertion_reference_set` — A1 the offer was declined. A2 the director has no involvement with the
  contract. A3 the offer was not serious. A4 the participant has no continuing contact.

- `attribution_support_set` — Empty.

- `enquiry_point` — B3, which is also the direct question for Q-D1-08b.

- `account_test_point` — B6.

- `post_test_account_opportunity` — true.

- `available_routes` — R-a disclose at B1 unprompted. R-b disclose at B3. R-c decline the review.
  R-d raise it with the commissioning manager’s superior.other_route_classificationPermitted where
  stated aloud.

- `accountable_actor_available` — True — the commissioning manager.

- `time_reference_called_for` — TRUE. B5 asks by when.

- `bearing_interest` — PRESENT. The decision point is accepting the review; the direct question at
  B3 comes at that point.

**MENTOR REFERENCE CARD**

— SRC-D1-S2-010

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like, because the source does not have a view about
that. The only place correctness exists is the account. Sections 2 and 3 are the lists you check an
account against: what the source established, and what it does not support. Everything else is
context you may need to hold while listening.1 The four questions#BeatASK1B3“Nothing that would stop
you looking at it objectively?”2B4“It would take someone else a fortnight to get up to speed. You’ll
take it, won’t you?”3B5“If there’s an issue, what do you suggest and by when?”4B6“When did you last
speak to anyone there?”2 What the source established — material itemsAn account that leaves one of
these out is an account with an omission. This list is fixed before the session and you may not add
to it afterwards.

- M1 an informal job offer exists from a director at the incumbent.
- M2 the offer is three weeks old and unanswered.
- M3 the participant is being asked to recommend on that supplier.3 What the source does NOT support
  — unsupported assertionsIf the participant asserts one of these, the account included a claim the
  script information does not support. If they assert something outside this list, record it as
  outside the reference set and flag the source.
- A1 the offer was declined.
- A2 the director has no involvement with the contract.
- A3 the offer was not serious.
- A4 the participant has no continuing contact.4 Responsibility the source provides — attribution
  support setAn attribution to another person maps here only where it asserts the same
  responsibility about the same person. Anything else is not aligned, which is a factual observation
  and not a finding of fault.
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a disclose at B1 unprompted.
- R-b disclose at B3.
- R-c decline the review.
- R-d raise it with the commissioning manager’s superior.6 What this script does and does not ask
  forItemThis scriptAccountable actor offeredYES — the commissioning manager. Time reference called
  forYES — B5 asks by when. Bearing interestYES. C8 IS shown. Decision point is accepting the
  review; the direct question is B3. — Account testB6. The participant has a response window.
  SECTION 12 — THE STAGE 2 BANK REGISTER12.1 CoverageSourceClass05c08a/bPairs with S1001 Figure
  Already GivenS-1Yes—001, 005, 010002 Reference CallS-2——005, 006, 010003 Site WalkS-3/S-1Yes—004,
  006004 HandoverS-4——008005 Panel SeatS-5—Yes009006 Quiet WordS-6——002, 007007 Client
  QuestionS-1Yes—001, 010008 Draft ApprovalS-2Yes—005, 006009 Salary BandS-7——002010 Renewal
  RecommendationS-5/S-2YesYes009What the bank supportsAll seven situation classes appear. Every
  source carries CE-01 to CE-07. Q-D1-05c is served by five sources; Q-D1-08a and 08b by two. Every
  Stage 1 source has at least one Stage 2 counterpart in the same situation class, which is what
  CA-04 Part C needs to build approved pairings rather than possibilities. Ten versions supports the
  attempt cap of three with a different mentor on each re-attempt and seven versions unused.12.2
  StatusFieldStatus across the tenAuthoringComplete. Drafting test 1EMPTY on all ten. Someone other
  than the author. Drafting test 2EMPTY on all ten.

**Mentor script**

trainingNOT DONE. A mentor who has not been trained on the script rules will add facts, answer
unscripted questions, or press twice — each of which changes the situation being observed. Delivery
is an administration condition, not background. Replacement sourceAvailable — any of the other nine,
subject to prior-exposure exclusion.

- `source_version_hash` — Not assigned. REC-07 approvalABSENT on all ten.
- `approved_observation_ready_count` — ZERO.
- `active_serving_count` — ZERO.SECTION 1 — WHAT APPLIES TO ALL NINE1.1 What a Stage 3 observation
  is hereFICTIONAL ORGANISATION NAMING RULE — added after a real-name clearance reviewEvery
  organisation, client, vendor, employer, product, system and named workplace used in a source must
  either be a VERIFIED FICTIONAL NAME or be used under documented permission. A web search that
  found no exact match is NOT clearance. Absence of a search result is not evidence of absence, and
  it is not a legal opinion. Before REC-07 approval each source records the naming-clearance check:
  status, date, exact search terms used, reviewer, any real-world conflict found, the replacement
  name if one was required, and the trigger for a recheck. This is an internal source-integrity
  control, not participant-facing content. What the review found, and what was changedReal companies
  were found matching or closely matching names in the bank. TARNWELL POLSKA is a registered Polish
  plastics manufacturer in Tarnów, and the bank used Tarnwell Manufacturing for a scenario about a
  falsified safety inspection. EVERGREEN PACKAGING is a real US packaging business, and the bank
  used Evergreen Packaging Solutions as the vendor in a conflict-of-interest scenario. STONEWALL
  SOLUTIONS is a real IT consultancy, one letter from the bank’s Stonewell Solutions. ASHMORE
  appears in multiple active business names. The sector match is what makes these unsuitable rather
  than merely coincidental. A manufacturing-quality scenario naming a real manufacturer, or a
  vendor-conflict scenario naming a real vendor, could read as describing that company’s conduct,
  controls or staff — in an evidence source that may later be shown to participants, mentors,
  employers or partners. Sixty-four name instances were replaced across the four Parts. MOST OF THE
  ORIGINAL NAMES CAME FROM THE LEGACY SCENARIO LIBRARY AND THE DEMO PROJECT LIBRARY, so the same
  names are likely to appear in other T3A content and the clearance pass should cover those
  documents too.1.0A Personal namesThe bank uses given names such as Rachel, Kevin, Derek, Mia,
  Jordan, Patricia and Victor. Individually these are common and low risk. The risk comes from the
  COMBINATION — a real-looking organisation name, a named job title, a highly specific factual
  event, a recognisable industry or location, and a potentially damaging allegation. Personal names
  must stay detached from real organisation names and real client names, and the clearance record
  covers the combination rather than the name alone. The participant receives a brief and produces
  work against it over a submission window. Conduct is observed through what they produced. No
  mentor is present while they work, and nothing is read aloud. The briefs already carry an
  on-screen-only access notice: the material may not be downloaded, printed, copied or distributed,
  and remains accessible only within the platform for the duration of the submission window. That is
  prior-exposure protection already written into the source, and it should be kept rather than
  replaced.1.2 Only D1 is observed, and the briefs are not only about D1The point most likely to be
  got wrongEvery brief lists three primary and one or two secondary dimensions, and asks for five to
  six hours of work across several deliverables. A participant working one of these is exercising
  communication, execution, resilience and more. NONE of that is observed. The D1 observation
  records only the eight D1 conduct elements, from the parts of the produced work where they arise.
  Everything else the participant produced is outside the observation and is not recorded, commented
  on, or held against them. A mentor reading a five-hour deliverable will form views about its
  quality. Those views are not recorded anywhere, do not enter a determination, and may not appear
  in a supporting note. This is the Stage at which that discipline is hardest, because the mentor is
  holding a finished piece of work in their hands.1.3 Three elements this bank does not carryThe
  nine cannot carry them. The tenth can. None of the nine migrated briefs contains an enquiry point,
  so there is no moment against which the timing of a disclosure can be located. None tests the
  account after it is given, because the submission ends the exchange. None places the participant
  in a decision in which they hold a personal interest. CA-04 Part B records these as launch-design
  limits rather than Stage impossibilities, and provides the route out: an approved Stage 3 source
  that creates the required observable condition. SRC-D1-S3-010 is that source. It carries a review
  exchange — the participant submits, a reviewer sends two written questions, the participant
  responds — and a bearing interest. It serves fourteen of the fifteen question objects. A
  consequence to action, not to assumeCA-04 Part B currently states that CE-02, CE-07 and CE-08 are
  not in the Stage 3 launch design. On approval of SRC-D1-S3-010 that becomes conditional: not
  served by the nine migrated briefs, SERVED by the tenth. It also changes CA-04 Part C: those three
  elements gain a Stage 3 pairing, so under FD-D1-08 they can now reach three Stages and therefore
  the fourth state.1.3B Provenance and authorship controls — required before any S3 source is
  approvedWithout these, Stage 3 is a well-described ambition rather than an administered
  observationEach source must specify: the artifact the participant is expected to produce; whether
  external tools are allowed; WHETHER AI USE IS ALLOWED, DISALLOWED OR DECLARED; how authorship
  provenance is captured; which submissions, drafts, timestamps and working-session traces are
  retained; what counts as a valid source-completion event; what happens if provenance is
  incomplete; how material supplied by an employer or third party is de-identified and legally
  cleared; and whether the task creates a genuine observable opportunity for each claimed conduct
  clause.1.4 Interim statusWhat interim means, and what it does notThese are T3A-authored demo
  briefs, intended for launch-phase use pending activation and source approval. They are interim in
  provenance, not in rigour: each carries a full source sheet and is approved through REC-07 like
  any other source. One practical advantage. The rights, confidentiality and permitted-use review
  that CA-25 requires before an S3 route can be recorded as active is materially simpler for
  T3A-authored material than for real client work, because there is no third-party owner, no client
  confidentiality and no consent to obtain. The Stage 3 legal route can therefore be cleared on this
  bank while the employer-project route is still being negotiated. When real employer projects
  arrive they do not replace these automatically. Each new project is a new source version with its
  own sheet, its own rights review and its own REC-07 record, and it enters the bank alongside these
  rather than instead of them.1.5 Version-level requirements held in common
  scenario_classwork_sample. CONTROLLED FIVE-VALUE FIELD, IRREVERSIBLE: instructional,
  private_rehearsal, observation_ready, work_sample, team_simulation.source_formwork_sample_brief
- `d1_situation_class` — S-1 to S-7, stated per source. A D1 CONSTRUCT classification, NOT
  scenario_class.dimensions_in_playD1, sampled through the work sample produced over a submission
  window. The brief exercises more dimensions; the observation records only D1. The mandatory
  definition asks which dimension AND the workplace demand through which it is sampled, and the
  demand is stated per source.stageS3. observer_id and observer_authorization_at_date required.ir
- `relevant_conduct` — Writing quality, structure, formatting, length, presentation, the
  persuasiveness of the deliverables, and whether the work is good. None is observed and none
  appears in any question.
- `relevant_conduct` — MANDATORY VERSION-LEVEL FIELD, and it was MISSING from the S1, S2 and S4
  banks in earlier issues, which carried ir
- `relevant_conduct` — without its counterpart. It states WHAT OBSERVABLE D1 CONDUCT THIS SOURCE
  CREATES THE OPPORTUNITY TO RECORD — not that the dimension is D1. Stated per source.
- `cross_context_map` — MANDATORY VERSION-LEVEL FIELD, and it was MISSING from every source in
  earlier issues. The counterpart tables in the bank register are candidate pairings and do NOT
  substitute for it. This field states the other Stage and source versions this source links to,
  WHAT REMAINS CONSTANT while context varies, and what differences would prevent a recurrence claim.
  Under FD-D1-08 recurrence is unavailable without it. Stated per source.
- `route_observation_basis` — S3 — a route EVIDENCED IN THE SUBMITTED WORK or in the review
  exchange. Putting the issue in the client email is use of that route; writing that one intends to
  raise it is not. A route is USED where the participant acts through it; saying they would use it
  is CE-05, not CE-06. Stated per source.
- `stated_standard` — CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,
  DEADLINE OR OPERATING STANDARD ESTABLISHED BY THE SOURCE. It NEVER records a preferred behavioral
  answer. The earlier position read it as no source tells the participant what integrity conduct is
  expected, which is a different thing and left the field empty on sources that plainly contain
  standards \u2014 a twelve-point inspection required before shipment, a policy requiring a
  documented conversation before a formal process. Some sources legitimately have none. Stated per
  source.permitted_administration_varianceExtended submission window under an access-preserving
  accommodation. Assistive technology. A shortened brief is DEMAND-MODIFYING and must be recorded as
  such.unsupported_inferencesThat the participant noticed or failed to notice anything; intended any
  outcome; was thorough or careless; would behave the same way again. Submission windowThree
  calendar days from assignment, as the briefs state. Estimated effort five to six hours. Authorship
  provenanceSubmission origin, timestamps, working-session evidence and version history captured. A
  submission without provenance is not observable and is refused. S3 SOURCE-REVIEW CONDITIONNO S3
  SOURCE MAY BE SUBMITTED FOR REC-07 APPROVAL until its rights, confidentiality, permitted-use and
  authorship-provenance route is documented AND APPROVED FOR THAT SOURCE VERSION. The hold sits
  BEFORE review, not merely before activation — otherwise content is approved that later proves
  impossible to administer lawfully. Legal route statusRUNTIME RECORD NOT YET CREATED — EXPECTED,
  per Section 11. The rights, confidentiality and permitted-use record is written per source; until
  it exists the source does not serve a real observation. Simpler here than for employer projects —
  see Section 1.4 — but not yet done.
- `proposed_compatibility_class` — A — PROPOSED, subject to source approval, administration testing
  and the applicable comparability controls. Compatibility class is ASSIGNED AT RELEASE, not
  inferred during authoring, and these sources have passed no drafting test, no calibration and no
  REC-07. Three separate claims, never collapsed: (1) WITHIN-SOURCE determination comparability: an
  INTENDED DESIGN PROPERTY ONLY. NOT ESTABLISHED until the approved calibration study measures
  agreement on the EXACT source version, question version, answer definitions AND administration
  protocol. Use the words PROPOSED or INTENDED in every register until CA-09 reports calibration
  results. It was previously described as claimable now, which asserts reliability before the study
  exists. (2) CROSS-SOURCE technical compatibility: NOT ESTABLISHED AT AUTHORING. Determined through
  the applicable version, administration and comparison controls. (3) CA-04 Part C context
  relationship: NOT ESTABLISHED until the approved counterpart map names the source versions, the
  constant demand, the approved contextual variation, the comparable conduct and the recurrence
  blockers. The earlier position asserted the sources were fully comparable within the bank, which
  collapsed all three. REC-07 naming conditionA source version CANNOT ENTER REC-07 REVIEW while
  fictional\_
- `name_clearance_status` — = pending. The only permitted values at submission are CLEARED and
  REPLACE_REQUIRED. A source marked replace_required is not approved until the replacement text is
  inserted, THE RENDERED INSTANCE IS RE-HASHED, and the clearance record is re-run against the final
  organisation, client, job title and scenario COMBINATION.fictional\_
- `name_clearance_status` — Governed by the launch naming rule at Part One, Section 5.5. A launch
  source that renders controlled role and entity labels only, and no proper organization, product,
  employer, vendor, client or personal name, is CLEARED because no proper name is rendered. Where a
  source does render a proper name, the status is PENDING and DOES NOT BECOME CLEARED BY ASSERTION:
  the documented combination check for that source and each selectable presentation-name set must be
  completed and recorded, or the name is replaced with a controlled label under Section 5.5. The
  field and its refusal remain built either way: a source rendering a proper name without a
  completed clearance record does not serve.clearance_date, search_terms_used, reviewerTo be
  recorded at the clearance check.known_real_world_conflictRecorded per source. Four confirmed
  conflicts were replaced; see Section 1.replacement_nameRecorded where a replacement was
  required.recheck_triggerBefore REC-07 approval, and again before pilot release. Day-1 integrity
  schedule
- `min_seconds` — and
- `max_seconds` — : submission window plus response windows, stated per source.
- `source_version_hash` — : assigned at registration.
- `proposed_compatibility_class` — : A, proposed. randomization_seed and presentation_variant_seed:
  as the common model. model_reference and prompt_text_ref: NOT_APPLICABLE — no model administers
  this source. OMISSION IS NOT AN ANSWER: where a mandatory field does not apply it carries an
  explicit not_applicable with the reason, or the schema says mandatory while the bank treats it as
  optional.1.6 Where the elements are observedElementWhere in the produced workCE-01
  IdentificationWhether any deliverable names the specific issue the brief plants, in terms
  distinguishing it from the situation generally. CE-03 CorrespondenceWhether the account given in
  the deliverables corresponds to the information the brief made available; whether a material item
  is absent; whether a claim appears that the brief does not support. CE-04 AttributionWhether the
  participant states their own part, and whether responsibility is attributed to another named
  person beyond what the brief provides. CE-05 Corrective stepWhether a specific corrective action
  is identified; whether an accountable actor is named where the brief offers one; whether a time
  reference is given where the brief calls for one. CE-06 Available routeWhich of the routes the
  brief provides in writing was used in the deliverables. CURRENT APPLICABILITY STATUSEvery active
  S2, S3 and S4 source carries a per-question Direct / Conditional / Not Served table. THAT TABLE
  ALONE GOVERNS REGISTRY SERVING.Legacy broad service statements and coverage summaries are
  NON-AUTHORITATIVE.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-001 — THE ASHPORT CLIENT CRISIS
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-001$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-001$lit$, 'source'::t3a_content_family, $lit$THE ASHPORT CLIENT CRISIS$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-001$lit$,
              'title', $lit$THE ASHPORT CLIENT CRISIS$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 no root cause has been concluded. M2 the engineering accounts conflict. M3","information_made_available":"The scenario context, the trigger event, and the eleven known","assertion_reference_set":"A1 the outage was caused by a third-party API and not by Verrick. A2","attribution_support_set":"AS1 the lead engineer stated the cause was a third-party API rate","accountable_actor_available":"True — the VP, the engineering team.","available_routes":"R-a state it in the client email. R-b state it in the internal recovery plan.","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Assembling a client-facing account and an internal recovery plan while the","relevant_conduct":"Naming the unresolved root cause and the conflicting engineering accounts;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the third-party API explanation is correct. What the SLA says.","time_reference_called_for":"TRUE. The recovery plan requires next actions with timeframes and","enquiry_point":",","account_test_point":",","bearing_interest":"None. See Section 1.3."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-001 — THE ASHPORT CLIENT CRISIS

Migrated from DEMO-01, Service Recovery Under Fire. Situation class S-1.

**The brief, in summary**

The participant is a Client Success Lead at a SaaS company. A top-20 client reports a critical
outage during their peak dispatch window, affecting 43 deliveries, and demands a formal response by
Wednesday or they will reassess the partnership. The VP forwards it with one line: own this, and
show me your plan before anything goes to the client. Deliverables: a client response email of 400
to 600 words, an internal recovery plan of one to two pages, and a decision note of 300 to 400
words. What the brief plantsRefPlantedWhere it surfacesP1The engineering thread carries conflicting
accounts and no concluded root causeThe client email and the recovery planP2A junior engineer posted
that warning signs were seen two weeks earlier and were not prioritisedThe account of what is
knownP3The uptime SLA clause language is not available to the participantAny claim about contractual
positionP4No postmortem has been initiatedThe corrective step and its actor

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Assembling a client-facing account and an internal recovery plan while the
  root cause of an outage is unresolved and engineering accounts conflict.
- `relevant_conduct` — Naming the unresolved root cause and the conflicting engineering accounts;
  whether the client email and recovery plan correspond to what the thread establishes; what is
  stated about the participant's own part and about the engineers' accounts; identifying a
  corrective action, an accountable actor and a time; and which provided route the deliverables use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, the trigger event, and the eleven known
  facts, all available from assignment. Nothing is revealed later.
- `material_items` — M1 no root cause has been concluded. M2 the engineering accounts conflict. M3
  warning signs were reported two weeks earlier and not prioritised. M4 the SLA clause language is
  not available to the participant.
- `information_withheld` — Whether the third-party API explanation is correct. What the SLA says.
  Whether the client will act on the threat.
- `assertion_reference_set` — A1 the outage was caused by a third-party API and not by Verrick. A2
  the root cause is established. A3 the SLA was not breached. A4 no warning signs existed. A5 a
  postmortem is under way.
- `attribution_support_set` — AS1 the lead engineer stated the cause was a third-party API rate
  limit. AS2 a junior engineer stated warning signs were seen two weeks earlier and were not
  prioritised. AS3 the thread has no official root cause conclusion.
- `available_routes` — R-a state it in the client email. R-b state it in the internal recovery plan.
  R-c raise it with the VP in the decision note. R-d ask engineering for a preliminary root cause.
  All four are provided in writing in the brief.
- `accountable_actor_available` — True — the VP, the engineering team.
- `time_reference_called_for` — TRUE. The recovery plan requires next actions with timeframes and
  engineering asks with due times.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None. See Section 1.3.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-002 — THE MISLABELLED BATCH
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-002$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-002$lit$, 'source'::t3a_content_family, $lit$THE MISLABELLED BATCH$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-002$lit$,
              'title', $lit$THE MISLABELLED BATCH$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 the labels state the wrong dosage. M2 the batch passed QA visual inspection.","information_made_available":"The scenario context, the trigger event and the known facts, all","assertion_reference_set":"A1 the batch has shipped. A2 no other batch is affected. A3 the QA","attribution_support_set":"AS1 the packaging operator loaded the wrong label template. AS2 the","accountable_actor_available":"True — the Director of Quality and Regulatory Affairs, the","available_routes":"R-a raise a deviation. R-b hold the batch. R-c notify the Director of Quality","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Producing a deviation report and corrective-action plan for a labelling error","relevant_conduct":"Naming the labelling discrepancy; whether the deviation report corresponds to","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether any earlier batch is affected. Whether the operator has done this","time_reference_called_for":"TRUE. The corrective action plan requires timeframes.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-002 — THE MISLABELLED BATCH

Migrated from DEMO-05, Corrective Action at Halbrook Wellness. Situation class S-1 with S-4.

**The brief, in summary**

The participant is a Quality Assurance Lead at a healthcare products manufacturer working to Good
Manufacturing Practice standards. A batch of 1,200 units of an electrolyte supplement was packaged
with labels reading take two tablets daily instead of the correct one tablet daily. The batch passed
QA visual inspection and was released to shipping staging. It has not left the facility.
Investigation shows the wrong label template was loaded by the packaging operator; the line lead
signed the pre-run check without catching it; the visual QA inspector reviewed a sample and also
missed it. What the brief plantsRefPlantedWhere it surfacesP1Three named roles each missed the
error, including the participant’s own QA functionThe deviation report and any account of causeP2The
batch has not left the facilityAny claim about exposureP3The dosage error doubles the stated dose of
a health productThe urgency and the corrective stepP4The participant has been in role eleven months
with a solid relationship with the production floorWhether attribution is softened

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Producing a deviation report and corrective-action plan for a labelling error
  that three named roles including the participant's own QA function failed to catch.
- `relevant_conduct` — Naming the labelling discrepancy; whether the deviation report corresponds to
  the check-sheet and batch facts; what is stated about the operator, the line lead and the
  participant's own QA function; identifying a corrective action, actor and time; and which provided
  route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, the trigger event and the known facts, all
  available from assignment.
- `material_items` — M1 the labels state the wrong dosage. M2 the batch passed QA visual inspection.
  M3 the batch is in staging and has not shipped. M4 the wrong template was loaded at the start of
  the shift. M5 the line lead signed the pre-run check.
- `information_withheld` — Whether any earlier batch is affected. Whether the operator has done this
  before. What the regulator would require.
- `assertion_reference_set` — A1 the batch has shipped. A2 no other batch is affected. A3 the QA
  inspection was completed correctly. A4 the error was caught by QA rather than reported by an
  operator. A5 the dosage difference is immaterial.
- `attribution_support_set` — AS1 the packaging operator loaded the wrong label template. AS2 the
  line lead signed off the pre-run check without catching the error. AS3 the visual QA inspector
  reviewed a sample and missed the discrepancy. AS4 a production line operator flagged it.
- `available_routes` — R-a raise a deviation. R-b hold the batch. R-c notify the Director of Quality
  and Regulatory Affairs. R-d raise it with the production floor team. Provided in writing in the
  brief.
- `accountable_actor_available` — True — the Director of Quality and Regulatory Affairs, the
  participant.
- `time_reference_called_for` — TRUE. The corrective action plan requires timeframes.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-003 — THE QUIET DECLINE
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-003$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-003$lit$, 'source'::t3a_content_family, $lit$THE QUIET DECLINE$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-003$lit$,
              'title', $lit$THE QUIET DECLINE$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 the manager instructed action within the week. M2 policy requires a","information_made_available":"The scenario context, trigger event and known facts, all available","assertion_reference_set":"A1 the team member has a personal problem affecting his work. A2 the","attribution_support_set":"AS1 the Operations Manager instructed the participant to address it","accountable_actor_available":"True — the Operations Manager, the participant.","available_routes":"R-a hold the informal conversation. R-b document it as policy requires. R-c","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Documenting a performance conversation under a policy sequence, while holding","relevant_conduct":"Naming the performance issue within the policy sequence; whether the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"What the personal situation is. Whether it is affecting the work. Whether","time_reference_called_for":"TRUE. The instruction carries a stated horizon.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-003 — THE QUIET DECLINE

Migrated from DEMO-07, Managing Underperformance at Oakmere. Situation class S-1 with S-7.

**The brief, in summary**

The participant is a team lead. The Operations Manager instructs them to address a team member’s
declining numbers this week, warns of a formal process in two weeks, and says to document
everything. That afternoon the participant overhears the team member tell a colleague, hanging in
there, some stuff at home. He does not elaborate. Policy requires a documented informal conversation
before any formal improvement plan. The participant is not entitled to ask for personal details; any
disclosure must be voluntary. What the brief plantsRefPlantedWhere it surfacesP1The overheard remark
is information the participant is not entitled to useWhether it appears in the documentationP2Policy
requires an informal conversation firstThe corrective step and the routeP3The last review rated the
person as meeting expectations and a strong contributorAny account of performance historyP4No
personal leave has been used in six months, against policy encouragementWhether this is stated as
fact or as inference

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Documenting a performance conversation under a policy sequence, while holding
  information overheard and not offered.
- `relevant_conduct` — Naming the performance issue within the policy sequence; whether the
  documentation corresponds to the source-provided review history and leave record; what is stated
  about the participant's own role and the manager's instruction; identifying the required informal
  conversation, actor and time; and which provided route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event and known facts, all available
  from assignment.
- `material_items` — M1 the manager instructed action within the week. M2 policy requires a
  documented informal conversation first. M3 the last review rated the person as meeting
  expectations. M4 no personal leave has been taken in six months.
- `information_withheld` — What the personal situation is. Whether it is affecting the work. Whether
  the manager knows of it.
- `assertion_reference_set` — A1 the team member has a personal problem affecting his work. A2 the
  team member disclosed a personal difficulty to the participant. A3 a formal process has begun. A4
  the manager is aware of the overheard remark.
- `attribution_support_set` — AS1 the Operations Manager instructed the participant to address it
  this week. AS2 the Operations Manager set a two-week horizon for a formal process.
- `available_routes` — R-a hold the informal conversation. R-b document it as policy requires. R-c
  refer to the Employee Assistance Programme. R-d raise the policy sequence with the Operations
  Manager. Provided in writing.
- `accountable_actor_available` — True — the Operations Manager, the participant.
- `time_reference_called_for` — TRUE. The instruction carries a stated horizon.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-004 — THE OVERNIGHT BREACH
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-004$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-004$lit$, 'source'::t3a_content_family, $lit$THE OVERNIGHT BREACH$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-004$lit$,
              'title', $lit$THE OVERNIGHT BREACH$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 the cause is not yet known. M2 340 client agreement files were accessed. M3","information_made_available":"The scenario context, trigger event and known facts, all available","assertion_reference_set":"A1 the incident was a misconfiguration. A2 the incident was","attribution_support_set":"AS1 the IT security lead stated the cause is not yet known. AS2 the","accountable_actor_available":"True — IT security, the COO, the Head of Compliance.","available_routes":"R-a the written summary to the Head of Compliance. R-b the verbal update to","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Reporting an incident of unknown cause to two audiences on the same day.","relevant_conduct":"Naming that the cause is unknown; whether both same-day accounts correspond","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether it was unauthorised. Who created the pattern. Whether any data","time_reference_called_for":"TRUE. Both audiences carry stated deadlines.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-004 — THE OVERNIGHT BREACH

Migrated from DEMO-08, Incident Response at Larkstone Wealth. Situation class S-1.

**The brief, in summary**

The participant is notified at 06:45 that a service account with elevated privileges accessed 340
client agreement files overnight, in a pattern matching no scheduled process. IT security says it
could be a misconfigured automated process or unauthorised access, and they will not know for 24 to
48 hours. The COO expects an update by phone that evening. The Head of Compliance wants a written
summary by end of day. What the brief plantsRefPlantedWhere it surfacesP1The cause is genuinely
unknown and will remain so for 24 to 48 hoursEvery account of the incidentP2The accessed set is
client agreements only — no trading, portfolio or banking dataAny characterisation of severityP3The
service account was created eight months ago by a former IT employeeThe attribution questionP4Two
audiences want the same facts on the same dayWhether the accounts to each are consistent

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Reporting an incident of unknown cause to two audiences on the same day.
- `relevant_conduct` — Naming that the cause is unknown; whether both same-day accounts correspond
  to what is established and to each other; what is stated about the participant's own part and
  about IT security; identifying a corrective action, actor and time; and which provided route is
  used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event and known facts, all available
  from assignment.
- `material_items` — M1 the cause is not yet known. M2 340 client agreement files were accessed. M3
  the access pattern matches no known process. M4 no trading, portfolio or banking data was in the
  accessed set.
- `information_withheld` — Whether it was unauthorised. Who created the pattern. Whether any data
  left the environment.
- `assertion_reference_set` — A1 the incident was a misconfiguration. A2 the incident was
  unauthorised access. A3 no data was exfiltrated. A4 the cause is established. A5 client data of
  other kinds was affected.
- `attribution_support_set` — AS1 the IT security lead stated the cause is not yet known. AS2 the
  service account was created eight months ago by a former IT employee.
- `available_routes` — R-a the written summary to the Head of Compliance. R-b the verbal update to
  the COO. R-c a request to IT security for a stated finding. R-d escalation beyond the COO.
  Provided in writing.
- `accountable_actor_available` — True — IT security, the COO, the Head of Compliance.
- `time_reference_called_for` — TRUE. Both audiences carry stated deadlines.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-005 — THE COMPLIANCE CROSSROADS
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-005$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-005$lit$, 'source'::t3a_content_family, $lit$THE COMPLIANCE CROSSROADS$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-005$lit$,
              'title', $lit$THE COMPLIANCE CROSSROADS$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 fourteen trades over three months show excessive turnover. M2 the client","information_made_available":"The scenario context, trigger event and known facts, all available","assertion_reference_set":"A1 the advisor was churning the account. A2 the trades were suitable.","attribution_support_set":"AS1 the trades were executed by the named senior advisor. AS2 the CCO","accountable_actor_available":"True — the CCO, the participant.","available_routes":"R-a escalate to the CCO. R-b document the flag in the compliance record. R-c","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Escalating a transaction pattern consistent with churning where the","relevant_conduct":"Naming the transaction pattern without asserting churning; whether the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the advisor intended it. Whether the client complained. Whether","time_reference_called_for":"False. The brief sets no date for the escalation.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-005 — THE COMPLIANCE CROSSROADS

Migrated from DEMO-11, Ethical Escalation at Thornbury. Situation class S-1 with S-2.

**The brief, in summary**

The participant is a Compliance Coordinator at a wealth management firm. Reviewing quarterly
transaction reports they find fourteen trades in one client account over three months showing
excessive turnover, consistent with potential churning. The client is 74 and has a documented
conservative risk profile. The Chief Compliance Officer has emphasised that maintaining the firm’s
clean compliance record is a strategic priority ahead of a regulatory examination next quarter. What
the brief plantsRefPlantedWhere it surfacesP1The pattern is consistent with churning but is not
established as churningEvery characterisation in the deliverablesP2The client profile is
conservative and the client is elderlyWhether this is stated or omittedP3The CCO has signalled a
preference for a clean record before an examinationWhether the account is shaped to itP4The advisor
is namedThe attribution question

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectRoute evidenced
  in the submitted work or the review exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Escalating a transaction pattern consistent with churning where the
  compliance lead has signalled a preference for a clean record.
- `relevant_conduct` — Naming the transaction pattern without asserting churning; whether the
  escalation corresponds to the source-provided trade and profile facts; what is stated about the
  advisor and about the compliance lead's signal; identifying a corrective action and actor; and
  which provided route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event and known facts, all available
  from assignment.
- `material_items` — M1 fourteen trades over three months show excessive turnover. M2 the client
  profile is conservative. M3 the client is 74. M4 the pattern is consistent with churning and is
  not established as churning.
- `information_withheld` — Whether the advisor intended it. Whether the client complained. Whether
  the firm has seen this before.
- `assertion_reference_set` — A1 the advisor was churning the account. A2 the trades were suitable.
  A3 the client authorised the pattern. A4 no regulatory issue arises. A5 the CCO has been informed.
- `attribution_support_set` — AS1 the trades were executed by the named senior advisor. AS2 the CCO
  stated that maintaining the clean record is a strategic priority.
- `available_routes` — R-a escalate to the CCO. R-b document the flag in the compliance record. R-c
  request the advisor’s rationale. R-d escalate beyond the CCO. Provided in writing.
- `accountable_actor_available` — True — the CCO, the participant.
- `time_reference_called_for` — False. The brief sets no date for the escalation.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-006 — THE REPEATED FAILURE
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-006$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-006$lit$, 'source'::t3a_content_family, $lit$THE REPEATED FAILURE$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-006$lit$,
              'title', $lit$THE REPEATED FAILURE$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 the same error occurred three times in six weeks. M2 the earlier reports","information_made_available":"The scenario context, trigger event, known facts and the site","assertion_reference_set":"A1 the workers were not at fault. A2 the shift supervisor concealed","attribution_support_set":"AS1 the shift supervisor filed three reports attributing the errors to","accountable_actor_available":"True — the Director, the shift supervisor, facilities.","available_routes":"R-a the investigation report to the Director. R-b a system change request on","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Investigating a repeated failure the existing reports attribute to individual","relevant_conduct":"Naming the systemic causes observable on site; whether the findings","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the workers were in fact careless. Whether the code format has","time_reference_called_for":"False.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-006 — THE REPEATED FAILURE

Migrated from DEMO-14, Process Investigation at Tamsden Distribution. Situation class S-4 with S-1.

**The brief, in summary**

The same loading error has occurred three times in six weeks at a distribution centre. Each time the
shift supervisor filed an incident report attributing it to individual worker carelessness. The
Director asks for an independent investigation and says explicitly: do not just give me what the
shift supervisor already wrote. On site the participant observes that two high-volume carrier codes
differ by one character in twelve, and that the lighting in the bay where two of the three errors
occurred is noticeably dimmer than elsewhere. What the brief plantsRefPlantedWhere it
surfacesP1Three prior reports attribute the errors to worker carelessnessWhether the participant
repeats or displaces that attributionP2Two systemic causes are observable on siteWhether they appear
in the findingsP3The Director has signalled scepticism of the existing accountWhether the account is
shaped to the Director rather than to the evidenceP4Named workers were the subject of the earlier
reportsThe attribution boundary

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectRoute evidenced
  in the submitted work or the review exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Investigating a repeated failure the existing reports attribute to individual
  carelessness, where systemic causes are observable on site.
- `relevant_conduct` — Naming the systemic causes observable on site; whether the findings
  correspond to the source-provided observations and prior reports; what is stated about the shift
  supervisor's attribution and about the named workers; identifying a corrective action and actor;
  and which provided route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event, known facts and the site
  observations, all available from assignment.
- `material_items` — M1 the same error occurred three times in six weeks. M2 the earlier reports
  attributed it to individual carelessness. M3 the carrier codes differ by one character. M4 the
  lighting in Bay 4 is dimmer. M5 two of the three errors occurred in Bay 4.
- `information_withheld` — Whether the workers were in fact careless. Whether the code format has
  caused errors elsewhere. Whether the lighting has been reported before.
- `assertion_reference_set` — A1 the workers were not at fault. A2 the shift supervisor concealed
  the cause. A3 the lighting has been reported before. A4 the code format is a known defect. A5 the
  errors were unrelated.
- `attribution_support_set` — AS1 the shift supervisor filed three reports attributing the errors to
  individual worker carelessness. AS2 the Director asked for an independent investigation.
- `available_routes` — R-a the investigation report to the Director. R-b a system change request on
  the carrier codes. R-c a facilities request on the lighting. R-d raising the attribution question
  with the shift supervisor. Provided in writing.
- `accountable_actor_available` — True — the Director, the shift supervisor, facilities.
- `time_reference_called_for` — False.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-007 — THE NIGHT SHIFT INCIDENT
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-007$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-007$lit$, 'source'::t3a_content_family, $lit$THE NIGHT SHIFT INCIDENT$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-007$lit$,
              'title', $lit$THE NIGHT SHIFT INCIDENT$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 the operator skipped the standard reverse-check protocol. M2 the shift was","information_made_available":"The scenario context, trigger event and known facts, all available","assertion_reference_set":"A1 the collision was caused by short staffing. A2 the operator did not","attribution_support_set":"AS1 the operator stated she skipped the reverse-check protocol. AS2","accountable_actor_available":"True — the Operations Manager, the participant.","available_routes":"R-a the incident report. R-b the corrective action plan. R-c raising the","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Producing an incident report where the operator has admitted skipping a","relevant_conduct":"Naming the skipped protocol; whether the incident report corresponds to what","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether short staffing caused the collision. Whether the protocol is","time_reference_called_for":"TRUE. The report and plan are due by noon.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-007 — THE NIGHT SHIFT INCIDENT

Migrated from DEMO-16, Team Recovery at Bellhaven Distribution. Situation class S-1.

**The brief, in summary**

A forklift collision at 02:15 damages a rack beam and about 3,500 dollars of product, and closes an
aisle for 45 minutes. Nobody is injured. The operator, two years experience and a clean record,
tells the participant she was rushing because two colleagues called in sick and the pick queue was
backed up, and that she skipped the standard reverse-check protocol. The Operations Manager wants an
incident report and corrective action plan by noon. What the brief plantsRefPlantedWhere it
surfacesP1The operator admitted skipping a required protocolWhether the report states itP2The shift
was short-staffed for a stated reasonWhether it appears as context or as excuseP3The operator is
named and is visibly upsetThe attribution boundaryP4Safety policy requires an incident report for
all incidentsThe route

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Producing an incident report where the operator has admitted skipping a
  required protocol on a short-staffed shift.
- `relevant_conduct` — Naming the skipped protocol; whether the incident report corresponds to what
  the operator stated and the source establishes; what is stated about the operator and the staffing
  level; identifying a corrective action, actor and time; and which provided route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event and known facts, all available
  from assignment.
- `material_items` — M1 the operator skipped the standard reverse-check protocol. M2 the shift was
  two people short. M3 damage of about 3,500 dollars occurred. M4 no one was injured. M5 the
  operator has a clean record.
- `information_withheld` — Whether short staffing caused the collision. Whether the protocol is
  routinely skipped. Whether the manager knew of the staffing gap.
- `assertion_reference_set` — A1 the collision was caused by short staffing. A2 the operator did not
  skip the protocol. A3 the protocol is routinely skipped. A4 the operator has had prior incidents.
  A5 the racking was already damaged.
- `attribution_support_set` — AS1 the operator stated she skipped the reverse-check protocol. AS2
  the operator stated the shift was short-staffed after two colleagues called in sick. AS3 the
  operator stated she was trying to help the team catch up.
- `available_routes` — R-a the incident report. R-b the corrective action plan. R-c raising the
  staffing level with the Operations Manager. R-d a safety observation on the protocol. Provided in
  writing.
- `accountable_actor_available` — True — the Operations Manager, the participant.
- `time_reference_called_for` — TRUE. The report and plan are due by noon.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-008 — THE HARASSMENT REPORT
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-008$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-008$lit$, 'source'::t3a_content_family, $lit$THE HARASSMENT REPORT$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-008$lit$,
              'title', $lit$THE HARASSMENT REPORT$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 a complaint was made and its content. M2 policy requires documentation","information_made_available":"The scenario context, trigger event, known facts and the policy","assertion_reference_set":"A1 the complaint is substantiated. A2 the complaint is unfounded. A3","attribution_support_set":"AS1 the complainant described two specific incidents. AS2 the","accountable_actor_available":"True — the HR Manager, the VP of Corporate Services.","available_routes":"R-a document within 24 hours. R-b notify the HR Manager. R-c escalate to the","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Documenting a harassment complaint under a policy carrying stated timescales","relevant_conduct":"Naming the complaint and the policy requirements; whether the documentation","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the complaint is substantiated. Whether the supervisor would","time_reference_called_for":"TRUE. The policy states the timescales.","enquiry_point":",","account_test_point":",","bearing_interest":"None. SENSITIVITY FLAG — FOUNDER APPROVED, 8 September 2026. This source is"}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-008 — THE HARASSMENT REPORT

Migrated from DEMO-19, Ethical Escalation at Ravensmoor. Situation class S-6 with S-1.

**The brief, in summary**

An HR Coordinator receives a complaint from a junior colleague that her supervisor has made repeated
inappropriate comments about her appearance over three weeks. She describes two specific incidents,
says she asked him to stop after the first, and that the behaviour continued. She is afraid of
retaliation because the supervisor controls her performance review and project assignments. Policy
requires documentation within 24 hours, investigation within 10 business days, confidentiality, and
escalation to the VP of Corporate Services where the HR Manager has a conflict. What the brief
plantsRefPlantedWhere it surfacesP1Policy sets a 24-hour documentation requirementWhether the
deliverables meet or address itP2The complainant asked for the behaviour not to reach the
supervisorThe confidentiality and route questionsP3A conflict-of-interest escalation route exists in
policyWhether it is identifiedP4Both parties are namedThe attribution boundary

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Documenting a harassment complaint under a policy carrying stated timescales
  and a conflict-of-interest escalation route.
- `relevant_conduct` — Naming the complaint and the policy requirements; whether the documentation
  corresponds to what the complainant described; what is stated about both named parties;
  identifying the required steps, the escalation actor and the stated timescales; and which provided
  route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event, known facts and the policy
  requirements, all available from assignment.
- `material_items` — M1 a complaint was made and its content. M2 policy requires documentation
  within 24 hours. M3 the complainant reported fear of retaliation. M4 a conflict-of-interest
  escalation route exists.
- `information_withheld` — Whether the complaint is substantiated. Whether the supervisor would
  retaliate. Whether the HR Manager has a conflict.
- `assertion_reference_set` — A1 the complaint is substantiated. A2 the complaint is unfounded. A3
  the HR Manager has a conflict. A4 the supervisor has previous complaints. A5 the complainant
  consented to the supervisor being told.
- `attribution_support_set` — AS1 the complainant described two specific incidents. AS2 the
  complainant stated she asked the supervisor to stop. AS3 the complainant stated the behaviour
  continued.
- `available_routes` — R-a document within 24 hours. R-b notify the HR Manager. R-c escalate to the
  VP of Corporate Services. R-d discuss retaliation protection with the complainant. Provided in
  writing.
- `accountable_actor_available` — True — the HR Manager, the VP of Corporate Services.
- `time_reference_called_for` — TRUE. The policy states the timescales.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None. SENSITIVITY FLAG — FOUNDER APPROVED, 8 September 2026. This source is
  marked SENSITIVE_CONTENT. A subject-matter notice is shown before assignment. The participant may
  decline with NO evidence consequence, no reason collected and no record of the decline in the
  evidence domain, and another eligible source is offered immediately. This is the final launch rule
  and requires no further decisionThis brief asks a participant to work a harassment complaint. Some
  participants will have lived experience of the conduct described, and the work is done alone over
  three days without a facilitator present. It is a legitimate and realistic workplace situation,
  and an HR or compliance participant would meet it. The recommendation is not to remove it. The
  recommendation is that participants are told the subject matter before assignment and may decline
  this source without any record of declining, and that an alternative source is offered from the
  bank in its place. CLOSED: this source is marked SENSITIVE_CONTENT — subject-matter notice before
  assignment, decline with no evidence consequence and no reason collected, and another eligible
  source offered immediately.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-009 — THE FAILED PROGRAMME
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-009$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-009$lit$, 'source'::t3a_content_family, $lit$THE FAILED PROGRAMME$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-009$lit$,
              'title', $lit$THE FAILED PROGRAMME$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"material_items":"M1 fourteen of twenty-four completed. M2 satisfaction averaged 2.8 against a","information_made_available":"The scenario context, trigger event, known facts and the interview","assertion_reference_set":"A1 the programme met its objectives in part. A2 the dropout rate is","attribution_support_set":"AS1 the curriculum was designed by a retired university professor. AS2","accountable_actor_available":"True — the Director, the participant.","available_routes":"R-a the report to the Director. R-b a recommendation on scheduling. R-c a","route_observation_basis":"Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW","workplace_demand":"Reporting on a failed programme where the director has explicitly invited an","relevant_conduct":"Naming the programme failures; whether the report corresponds to the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the designer was briefed on the audience. Whether the schedule","time_reference_called_for":"TRUE. The report is due Friday.","enquiry_point":",","account_test_point":",","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-009 — THE FAILED PROGRAMME

Migrated from DEMO-20, Learning from Failure at Fairholt Education. Situation class S-1 with S-4.

**The brief, in summary**

A first cohort has completed a twelve-week programme. Fourteen of twenty-four participants finished,
satisfaction averaged 2.8 against a target of 4.0, and feedback described it as too theoretical and
impossible to schedule. The Director forwards the results with a note: figure out what went wrong
and what we do about it, be honest, I would rather fix it than pretend it worked. Interviews with
six who dropped out show the sessions clashed with weekly staff meetings, and that the curriculum
was designed by a retired professor who had not been in a classroom for fifteen years. What the
brief plantsRefPlantedWhere it surfacesP1The Director has explicitly invited an unflattering
accountWhether the account is complete or softenedP2The curriculum designer is identified and is
externalThe attribution boundaryP3Two concrete causes emerged from interviewsWhether they appear as
findingsP4The numbers are specific and unfavourableWhether they are stated as given

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
  model-Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectRoute evidenced in the submitted work or the review
  exchange
- `available_routes` — Q-D1-07NOT SERVEDNo account test in this source-Q-D1-08aNOT SERVEDNo bearing
  interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

— D1-specific fields

- `route_observation_basis` — Only a route EVIDENCED IN THE RETAINED DELIVERABLE OR CAPTURED REVIEW
  EXCHANGE counts as Q-D1-06. An uncaptured message, call, escalation or intention does not.
- `workplace_demand` — Reporting on a failed programme where the director has explicitly invited an
  unflattering account.
- `relevant_conduct` — Naming the programme failures; whether the report corresponds to the
  source-provided figures and interview findings; what is stated about the participant's own part
  and about the curriculum designer; identifying a corrective action and actor; and which provided
  route is used.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — The scenario context, trigger event, known facts and the interview
  findings, all available from assignment.
- `material_items` — M1 fourteen of twenty-four completed. M2 satisfaction averaged 2.8 against a
  target of 4.0. M3 sessions clashed with weekly staff meetings. M4 the curriculum designer had not
  been in a K-12 classroom for fifteen years.
- `information_withheld` — Whether the designer was briefed on the audience. Whether the schedule
  was chosen by anyone in particular. Whether the target was realistic.
- `assertion_reference_set` — A1 the programme met its objectives in part. A2 the dropout rate is
  normal for the sector. A3 the designer was told the audience. A4 the schedule was imposed
  externally. A5 satisfaction improved over the twelve weeks.
- `attribution_support_set` — AS1 the curriculum was designed by a retired university professor. AS2
  that person had not been in a K-12 classroom for fifteen years. AS3 participants described the
  content as academic rather than practical.
- `available_routes` — R-a the report to the Director. R-b a recommendation on scheduling. R-c a
  recommendation on curriculum design. R-d raising it with the designer. Provided in writing.
- `accountable_actor_available` — True — the Director, the participant.
- `time_reference_called_for` — TRUE. The report is due Friday.
- `enquiry_point` — ,
- `account_test_point` — ,
- `bearing_interest` — None.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S3-010 — THE PANEL PACK
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S3-010$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S3-010$lit$, 'source'::t3a_content_family, $lit$THE PANEL PACK$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S3-010$lit$,
              'title', $lit$THE PANEL PACK$lit$,
              'stage_code', $lit$S3$lit$,
              'source_sheet', $lit${"d1_situation_class":"S-1 to S-7, stated per source. This is a D1 CONSTRUCT classification and is","relevant_conduct":"Speaking style, assertiveness, volume, how much the participant said, whether","information_made_available":"P0 the pre-brief: former employment ending eighteen months ago, a","material_items":"M1 the participant worked at Marlbeck until eighteen months ago. M2 the","information_withheld":"Whether the interest would disqualify the participant. Whether Elmsworth","assertion_reference_set":"A1 the connection is purely historical. A2 the shareholding has been","attribution_support_set":"Empty. The interest is the participant’s own and the pack provides no","enquiry_point":"The written enquiry, within one working day of submission. THE FIRST ENQUIRY","account_test_point":"The written follow-up.","post_test_account_opportunity":"TRUE, one working day.","available_routes":", retained deliverablesQ-D1-07DIRECTWritten account test follows the written","accountable_actor_available":"True — the requesting manager, the panel chair.","time_reference_called_for":"False. The brief sets deadlines for the deliverables but calls for","bearing_interest":"PRESENT. The decision point is the submission of the recommendation. The","administration_timing_protocol":"— SOURCE-SPECIFIC OVERRIDETHIS SOURCE OVERRIDES THE PART-LEVEL","source_version_hash":"Not assigned. REC-07 approvalABSENT on all ten. Mentor reference","approved_observation_ready_count":"ZERO.","active_serving_count":"ZERO.SECTION 1 — WHAT APPLIES TO ALL TEN1.1 Who is in the roomFICTIONAL","cross_context_map":"MANDATORY VERSION-LEVEL FIELD, and it was MISSING from every source in","route_observation_basis":"S4 — a route ACTUALLY USED WITHIN THE GROUP INTERACTION or through an","stated_standard":"CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,","min_seconds":"and","max_seconds":"1200 minimum, 1800 maximum per session.","proposed_compatibility_class":"A — PROPOSED, subject to source approval, administration testing","name_clearance_status":"Governed by the launch naming rule at Part One, Section 5.5. A launch"}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S3-010 — THE PANEL PACK

NEW AUTHORING, not migrated. Situation class S-5 with S-1. The only Stage 3 source carrying a review
exchange.

**The brief, as the participant receives it**

You are a procurement analyst at Elmsworth Housing Association. Three organisations have submitted
proposals to deliver a two-year tenancy support programme, and you have been asked to evaluate all
three and produce a shortlisting recommendation. The pack contains the three proposals, the
published evaluation criteria, the scoring template, and the panel declarations form. Produce: (a) a
completed evaluation against the criteria for each proposal, (b) a shortlisting recommendation of no
more than two organisations, with reasons, and (c) the completed declarations form. Return all three
within three working days.

**Participant pre-brief — given with the pack**

One of the three bidders, Marlbeck Community Trust, is where you worked until eighteen months ago.
You still hold a small shareholding in its trading subsidiary, bought while you were employed there.
You have not sold it and you receive an annual statement, most recently in March. Nobody at
Elmsworth knows either of these things.

**Why a shareholding and not just former employment**

Former employment alone is a fact a participant might reasonably regard as historical. A continuing
financial stake is not, and the March statement establishes that the participant has been reminded
of it recently. That distinction is what makes CE-08 observable here rather than arguable. It also
matters for CE-03: an account describing the connection as purely historical is one the
source-provided information does not support. What the brief plantsRefPlantedWhere it surfacesP1A
bidder at which the participant holds a continuing financial interestThe declarations form and the
recommendationP2A declarations form in the pack, asking for any interest in any bidderWhether the
route provided is usedP3Two named former colleagues in the Marlbeck proposalThe attribution
questionP4The Marlbeck bid is the lowest priced of the threeWhether the account of the evaluation
corresponds to the criteriaThe review exchangeThis is what makes the source different from the other
nine. It occurs after submission and is part of the source, not an administrative follow-up.
StepWhenContentSubmissionEnd of the three-day windowThe three deliverables. ENQUIRY — writtenWithin
one working day of submission“Before I take this to the panel — do you have, or have you had, any
connection to any of the three organisations?” Response window one working day. ACCOUNT TEST —
writtenWithin one working day of the response“Thank you. So I have the sequence right — when did you
become aware of the connection?” Response window one working day. Three rules on the exchangeThe
reviewer sends BOTH questions whatever the declarations form said. If the form disclosed the
interest, the enquiry still goes and the answer is simply consistent with it. Sending the question
only where something was omitted would make the question itself an accusation. Both questions are
factual and signal no doubt. A probe that signals doubt tests composure rather than the account. The
reviewer answers no follow-up questions, confirms and denies nothing, and does not react. Their only
role is to send the two questions and record the responses.

**Source sheet**

— D1-specific fields source_id and versionSRC-D1-S3-010, version 1.0.0. Stage S3.

- `d1_situation_class` — S-5 a bearing interest, with S-1 an issue the participant knows and others
  do not.
- `relevant_conduct` — Whether the interest is declared and where; whether the evaluation account
  corresponds to the information the pack provided; what is said about the participant’s own
  position and about the named former colleagues; whether a corrective step and route are
  identified; and whether the account given at the enquiry changes at the account test.ir
- `relevant_conduct` — The quality of the evaluation, whether the recommendation is sound,
  formatting, structure, length, and which organisations were shortlisted.
- `information_made_available` — P0 the pre-brief: former employment ending eighteen months ago, a
  continuing shareholding in the trading subsidiary, an annual statement received in March, nobody
  at Elmsworth knows. I1 the three proposals. I2 the published criteria and scoring template. I3 the
  panel declarations form. I4 two named former colleagues in the Marlbeck proposal. I5 the Marlbeck
  bid is lowest priced. I6 the enquiry question. I7 the account test question.
- `material_items` — M1 the participant worked at Marlbeck until eighteen months ago. M2 the
  participant holds a continuing shareholding in its trading subsidiary. M3 the participant received
  a statement in March. M4 the participant is evaluating that bidder. M5 the declarations form was
  in the pack.
- `information_withheld` — Whether the interest would disqualify the participant. Whether Elmsworth
  has a threshold for shareholdings. Whether the named former colleagues would recognise the
  participant’s involvement.
- `assertion_reference_set` — A1 the connection is purely historical. A2 the shareholding has been
  disposed of. A3 the organisation has no declaration requirement. A4 the participant became aware
  of the connection only at the enquiry. A5 the shareholding is too small to require declaration.
- `attribution_support_set` — Empty. The interest is the participant’s own and the pack provides no
  other responsible party.
- `enquiry_point` — The written enquiry, within one working day of submission. THE FIRST ENQUIRY
  POINT ANYWHERE IN THE STAGE 3 BANK.
- `account_test_point` — The written follow-up.
- `post_test_account_opportunity` — TRUE, one working day.
- `available_routes` — R-a the declarations form in the pack. R-b a note in the recommendation
  itself. R-c a separate message to the requesting manager before submitting. R-d the response to
  the enquiry.other_route_classificationPermitted where the submission or responses evidence the
  means used.
- `accountable_actor_available` — True — the requesting manager, the panel chair.
- `time_reference_called_for` — False. The brief sets deadlines for the deliverables but calls for
  no time reference in the corrective step.
- `bearing_interest` — PRESENT. The decision point is the submission of the recommendation. The
  enquiry follows it, so disclosure before the decision, after it, and not at all are all reachable,
  and the prompt condition is separately observable. Authorship provenanceCaptured across all three
  deliverables and both responses. Legal route statusRUNTIME RECORD NOT YET CREATED — EXPECTED, as
  for the rest of the Stage 3 bank. See Section 11.
- `administration_timing_protocol` — — SOURCE-SPECIFIC OVERRIDETHIS SOURCE OVERRIDES THE PART-LEVEL
  COMMON RULE. The common Stage 3 administration is three CALENDAR days from assignment. This source
  runs three WORKING days for submission, then up to one working day for the enquiry, then a further
  working-day response window for the account test. That is a materially different observation
  window and administration sequence, not a minor variation, and it is stated here as an override
  rather than left to be inferred. Duration boundsSubmission window three working days; enquiry
  window one working day; account-test response window one working day. Total elapsed span
  materially longer than the other nine Stage 3 sources. Comparability treatmentThe longer span and
  the review exchange make this source NOT directly comparable with the other nine on administration
  conditions. Pairings involving it require the CA-04 Part C relationship to state the difference
  explicitly.

**Question applicability**

Every question object, with its state, the pre-observation source trigger and the exact source
basis. This table alone governs registry serving. QuestionStatePre-observation source triggerSource
basisQ-D1-01NOT SERVEDThe source is a bearing-interest source; CE-08 is the parent construct, not a
generic issue-identification event-Q-D1-02NOT SERVEDDisclosure timing is governed by Q-D1-08a and
08b; the enquiry occurs after the recommendation decision point-Q-D1-03aDIRECTMaterial items and
source-provided connection and shareholding facts exist and an account is producedM1-M5,
I1-I7Q-D1-03b1CONDITIONALServed only where 03a records an omission

- `material_items` — Q-D1-03b2CONDITIONALServed only where 03a records an unsupported claim
- `assertion_reference_set` — Q-D1-04aNOT SERVEDThe source is not a responsibility-for-events
  source-Q-D1-04bNOT SERVEDAttribution support set is empty and attribution is not the designed
  construct-Q-D1-05aNOT SERVEDThe source provides declaration routes but does not create a separate
  corrective-action problem-Q-D1-05b1NOT SERVEDParent 05a not served-Q-D1-05b2NOT SERVEDParent 05a
  not served-Q-D1-05cNOT SERVEDNo time reference is called for-Q-D1-06DIRECTThe declarations form,
  the recommendation and the retained written review exchange provide observable route-use
  opportunities
- `available_routes` — , retained deliverablesQ-D1-07DIRECTWritten account test follows the written
  enquiry and can compare material account content
- `account_test_point` — Q-D1-08aDIRECTA continuing financial interest bears on the recommendation
  decision
- `bearing_interest` — , P0Q-D1-08bCONDITIONALServed only where 08a records a disclosure
- `bearing_interest` — ,
- `enquiry_point` —

**MENTOR REFERENCE CARD**

— SRC-D1-S3-010

**How to use this card**

Keep this visible while reading the submission and both responses. Everything on it is a FACT ABOUT
THE SOURCE. There is nothing here about what a good answer looks like. The only place correctness
exists is the account. Sections 2 and 3 are the lists you check it against. At Stage 3 you are
holding several hours of someone’s work. You WILL form views about its quality. None of them enters
a determination or a supporting note.1 The two questions the reviewer sends#WhenQuestion1Within one
working day of submission“Before I take this to the panel — do you have, or have you had, any
connection to any of the three organisations?”2Within one working day of the response“Thank you. So
I have the sequence right — when did you become aware of the connection?”2 What the source
established — material items

- M1 the participant worked at Marlbeck until eighteen months ago.
- M2 the participant holds a continuing shareholding in its trading subsidiary.
- M3 the participant received a statement in March.
- M4 the participant is evaluating that bidder.
- M5 the declarations form was in the pack.3 What the source does NOT support — unsupported
  assertions
- A1 the connection is purely historical.
- A2 the shareholding has been disposed of.
- A3 the organisation has no declaration requirement.
- A4 the participant became aware of the connection only at the enquiry.
- A5 the shareholding is too small to require declaration.4 Responsibility the source provides —
  attribution support set
- EMPTY. The interest is the participant’s own and the pack provides no other responsible party, so
  ANY attribution to another is not aligned.5 Routes the source makes available
- R-a the declarations form in the pack.
- R-b a note in the recommendation itself.
- R-c a separate message to the requesting manager before submitting.
- R-d the response to the enquiry.6 What this source does and does not ask forItemThis
  sourceAccountable actor offeredYES — the requesting manager, the panel chair. Time reference
  called forNO. Q-D1-05c is NOT served and its absence is not a missing state. Bearing interestYES.
  C8 IS shown. Decision point is the submission; the enquiry follows it. Enquiry pointThe written
  enquiry after submission. Account testThe written follow-up. Response window one working day.
  SECTION 11 — THE STAGE 3 BANK REGISTER11.1 CoverageSourceOriginSituation classCandidate
  counterparts001 Greyharb Client CrisisDEMO-01S-1S1-001, S2-001, S2-007002 Mislabelled
  BatchDEMO-05S-1/S-4S1-004, S2-003003 Quiet DeclineDEMO-07S-1/S-7S1-002, S2-009004 Overnight
  BreachDEMO-08S-1S1-001, S2-007005 Compliance CrossroadsDEMO-11S-1/S-2S1-005, S2-008006 Repeated
  FailureDEMO-14S-4/S-1S1-008, S2-004007 Night Shift IncidentDEMO-16S-1S1-004, S2-003008 Harassment
  ReportDEMO-19S-6/S-1S1-007, S2-006009 Failed ProgrammeDEMO-20S-1/S-4S1-008, S2-004010 The Panel
  PackAUTHOREDS-5/S-1S1-009, S2-005, S2-010, S4-001, S4-007Applicability table status: COMPLETE for
  all ten. Coverage is derived ONLY from each source Direct / Conditional / Not Served table; THIS
  REGISTER DOES NOT INDEPENDENTLY AUTHORIZE SERVING OR RECURRENCE.What the bank supportsSix
  situation classes appear — S-1, S-2, S-4, S-5, S-6 and S-7. S-3, a bypassable control, does not,
  because no demo brief places the participant in one. That class is carried at Stages 1, 2 and
  4.AUTHORING-INTENT COVERAGE, PENDING PER-SOURCE APPLICABILITY REVIEW. On authoring intent every
  source carries CE-01, CE-03, CE-04, CE-05 and CE-06, seven of the ten carry Q-D1-05c, and
  SRC-D1-S3-010 alone carries CE-02, CE-07 and CE-08. These are drafting observations, not settled
  service claims: applicability is read from each source sheet at run time, never from this note.
  The Stage 1 review showed that applying the Direct/Conditional/Not Served test properly makes
  sources LOSE elements and moves some into redesign queues. The same may happen here. CANDIDATE
  counterparts exist at S1 and S2 for the Stage 3 situation classes represented. THESE ARE NOT
  APPROVED CONDUCT-CLAUSE RELATIONSHIPS and confer NO RECURRENCE ELIGIBILITY until CA-04 Part C is
  completed and approved. Ten versions supports the attempt cap of three with seven unused.11.2
  StatusFieldStatus across the tenAuthoring and migrationComplete. Nine migrated, one authored.
  Drafting test 1EMPTY on all ten. Someone other than the author. Drafting test 2EMPTY on all ten.
  Legal routeNOT ACTIVE. Rights, confidentiality and permitted-use review outstanding — simpler for
  T3A-authored material, but not done. Authorship provenance captureRequired before serving. Not yet
  built. Replacement sourceAvailable — any of the other nine, subject to prior-exposure exclusion.
- `source_version_hash` — Not assigned. REC-07 approvalABSENT on all ten. Mentor reference
  cardsPresent for SRC-D1-S3-010 only. The nine migrated sources do not have them.
- `approved_observation_ready_count` — ZERO.
- `active_serving_count` — ZERO.SECTION 1 — WHAT APPLIES TO ALL TEN1.1 Who is in the roomFICTIONAL
  ORGANISATION NAMING RULE — added after a real-name clearance reviewEvery organisation, client,
  vendor, employer, product, system and named workplace used in a source must either be a VERIFIED
  FICTIONAL NAME or be used under documented permission. A web search that found no exact match is
  NOT clearance. Absence of a search result is not evidence of absence, and it is not a legal
  opinion. Before REC-07 approval each source records the naming-clearance check: status, date,
  exact search terms used, reviewer, any real-world conflict found, the replacement name if one was
  required, and the trigger for a recheck. This is an internal source-integrity control, not
  participant-facing content. What the review found, and what was changedReal companies were found
  matching or closely matching names in the bank. TARNWELL POLSKA is a registered Polish plastics
  manufacturer in Tarnów, and the bank used Tarnwell Manufacturing for a scenario about a falsified
  safety inspection. EVERGREEN PACKAGING is a real US packaging business, and the bank used
  Evergreen Packaging Solutions as the vendor in a conflict-of-interest scenario. STONEWALL
  SOLUTIONS is a real IT consultancy, one letter from the bank’s Stonewell Solutions. ASHMORE
  appears in multiple active business names. The sector match is what makes these unsuitable rather
  than merely coincidental. A manufacturing-quality scenario naming a real manufacturer, or a
  vendor-conflict scenario naming a real vendor, could read as describing that company’s conduct,
  controls or staff — in an evidence source that may later be shown to participants, mentors,
  employers or partners. Sixty-four name instances were replaced across the four Parts. MOST OF THE
  ORIGINAL NAMES CAME FROM THE LEGACY SCENARIO LIBRARY AND THE DEMO PROJECT LIBRARY, so the same
  names are likely to appear in other T3A content and the clearance pass should cover those
  documents too.1.0A Personal namesThe bank uses given names such as Rachel, Kevin, Derek, Mia,
  Jordan, Patricia and Victor. Individually these are common and low risk. The risk comes from the
  COMBINATION — a real-looking organisation name, a named job title, a highly specific factual
  event, a recognisable industry or location, and a potentially damaging allegation. Personal names
  must stay detached from real organisation names and real client names, and the clearance record
  covers the combination rather than the name alone. RoleNumberWhat they are toldObserved
  participantOneThe participant pre-brief. They are not told that the other three hold assigned
  positions. Co-participantsThreeTheir assigned position, in writing, before the session. They are
  told this is an observation of someone else, that they are not being observed, and that they must
  not depart from the position they were given. FacilitatorOne — the mentorReads the script, runs
  the round, asks the four questions, and captures. Facilitates AND observes. Only one participant
  is observed — and why that is not a limitationNo participant’s observation may be inferable from
  another’s record. With one observed participant that requirement is met BY CONSTRUCTION rather
  than by a control that could fail. Observing two or more at once would need REC-12 to settle how a
  correction raised by one affects material that also evidences another, and how withdrawal works
  after others have contributed. That is not authored and is not attempted here. Co-participants may
  be other T3A participants awaiting their own session, trained associates, or staff. Whoever they
  are, they are NOT being observed in that session and no record is made about them.1.1B Stage 4
  content holdNo S4 source advances to REC-07 review until REC-12 is approved AND a per-source
  impact assessment is completeTen Stage 4 sources should not be treated as ordinary content drafts
  pending REC-12. Each carries risks that are properties of the SOURCE DESIGN, not of the platform.
  A participant’s statement becoming evidence about another participant. Shared recordings creating
  linked personal-information records. One participant’s correction affecting shared source
  material. Group composition unintentionally changing the pressure level or the comparability.
  Participants recognising each other outside the session. A participant learning another person’s
  sensitive scenario facts or source-bound details. Each source therefore needs a completed
  SHARED-MATERIAL, IDENTITY, CORRECTION, WITHDRAWAL, RECORDING AND GROUP-COMPOSITION IMPACT
  ASSESSMENT before it goes forward, in addition to REC-12.1.2 The beat patternSeven beats, as at
  Stage 2, with one substitution. Stage 2 uses a fifteen-second pause as the window in which an
  unprompted disclosure can occur. At Stage 4 that window is the round of peer positions, which does
  the same job and adds the social cost. BeatSay / AskFacilitator actionCapture live hereB1
  OpeningSAYReads the situation and the task. States the speaking order and that each person will
  give a position in turn. None yet. B2 The roundROUNDInvites each co-participant in turn. They
  state their assigned positions. The facilitator does not comment. The observed participant may
  interject and is not invited to. C1, C2, and C8 where the script carries an interest. B3 The
  enquiryASK 1Turns to the observed participant and asks for their position. C1, C2, C3, C4, C8B4
  The pressureASK 2One question reflecting the room’s convergence. Asked ONCE, accepted whatever the
  answer. C3 update, C8 updateB5 The corrective promptASK 3What should happen now, and where the
  script calls for it, by when. C5, C6B6 The account testASK 4A neutral factual question about
  sequence or content. C7B7 CloseSAYThe closing line. Ends the session. C8 finalB2 is the observable
  moment, not scene-settingWhether the participant speaks during the round, and at what point in it,
  is what makes Q-D1-02 answerable at this Stage. If the facilitator invites them before the round
  finishes, every disclosure becomes a response to being asked and the element is lost. The
  facilitator therefore does not look at, gesture towards, or address the observed participant
  during B2. They are fourth in the order and the order is stated at B1 so that waiting is not
  itself a choice being made under uncertainty.1.3 CaptureThe same eight capture sets as Stage 2,
  unchanged and not repeated here. They are in Part B Section 1.4 and the platform renders them at
  the beat. Where a set is bound to the source — routes, material items, unsupported assertions,
  support-set items — the source sheet supplies the options.1.4 Facilitator rules
- Read the READ text as written. Natural delivery, no added facts, no added questions.
- Run the round in the stated order and do not comment on any position given.
- Never signal approval or disapproval, by word, tone or expression, to anyone in the room.
- Ask each pressure beat ONCE. Pressing repeatedly tests persistence, which no question records.
- Where a co-participant departs from their assigned position, record it as administration variance
  and continue. Do not correct them in the room.
- Never answer a question the script does not cover. The scripted reply is: I would need to check
  that. Delivery is an administration condition here too, and more soAt Stage 2 the mentor is one
  voice. At Stage 4 the mentor is running a room, and the quality of the round — whether the
  positions land, whether the order holds, whether the silence after each is allowed — changes what
  the participant faced. Calibration must cover facilitation as well as determination. Two mentors
  reading the same script can produce materially different rooms, and the record will not show it
  unless the variance is captured.1.5 Version-level requirements held in common
  scenario_classteam_simulation. CONTROLLED FIVE-VALUE FIELD, IRREVERSIBLE: instructional,
  private_rehearsal, observation_ready, work_sample, team_simulation. The observed pathway is
  structurally incapable of serving instructional or
  private_rehearsal.source_formgroup_simulation_script
- `d1_situation_class` — S-1 to S-7, stated per source. This is a D1 CONSTRUCT classification and is
  NOT scenario_class. The earlier position put S-1 to S-7 in scenario_class, which overloaded a
  controlled irreversible field with a second classification system.dimensions_in_playD1, sampled
  through the facilitated group setting with peer positions stated first. The mandatory definition
  asks which dimension AND THE WORKPLACE DEMAND THROUGH WHICH IT IS SAMPLED. The earlier position
  said D1 only, which identifies the construct and not the demand. The demand is stated per source
  \u2014 it matters for job-relatedness, cross-context comparison and challenge.stageS4. observer_id
  and observer_authorization_at_date required.ir
- `relevant_conduct` — Speaking style, assertiveness, volume, how much the participant said, whether
  they spoke first or last within their turn, and whether they persuaded anyone. None is observed
  and none appears in any question.
- `relevant_conduct` — MANDATORY VERSION-LEVEL FIELD, and it was MISSING from the S1, S2 and S4
  banks in earlier issues, which carried ir
- `relevant_conduct` — without its counterpart. It states WHAT OBSERVABLE D1 CONDUCT THIS SOURCE
  CREATES THE OPPORTUNITY TO RECORD — not that the dimension is D1. Stated per source.
- `cross_context_map` — MANDATORY VERSION-LEVEL FIELD, and it was MISSING from every source in
  earlier issues. The counterpart tables in the bank register are candidate pairings and do NOT
  substitute for it. This field states the other Stage and source versions this source links to,
  WHAT REMAINS CONSTANT while context varies, and what differences would prevent a recurrence claim.
  Under FD-D1-08 recurrence is unavailable without it. Stated per source.
- `route_observation_basis` — S4 — a route ACTUALLY USED WITHIN THE GROUP INTERACTION or through an
  authorised post-round channel. Speaking during the round, stating it at the enquiry, asking to
  withdraw. A route is USED where the participant acts through it; saying they would use it is
  CE-05, not CE-06. Stated per source.
- `stated_standard` — CORRECTED. This field records ANY EXPLICIT RULE, REQUIREMENT, CONTROL, POLICY,
  DEADLINE OR OPERATING STANDARD ESTABLISHED BY THE SOURCE. It NEVER records a preferred behavioral
  answer. The earlier position read it as no source tells the participant what integrity conduct is
  expected, which is a different thing and left the field empty on sources that plainly contain
  standards \u2014 a twelve-point inspection required before shipment, a policy requiring a
  documented conversation before a formal process. Some sources legitimately have none. Stated per
  source.permitted_administration_varianceExtended response time. Written contribution where an
  accommodation requires it, recorded as DEMAND-MODIFYING, because the demand includes stating a
  position aloud to peers who have already stated theirs.unsupported_inferencesThat the participant
  was influenced by the group; felt pressure; intended any outcome; is easily swayed or unusually
  independent. None may be recorded in a determination or a note. Q-D1-02 FAIRNESS CONTROLQ-D1-02
  may be used for CROSS-CONTEXT TIMING only where the standard response channel and the round
  opportunity window were PRESERVED. Where an accommodation or logged variance changes either,
  Q-D1-02 IS MARKED timing_not_comparable AND EXCLUDED from cross-context and recurrence
  calculations. A modified response window must never become a behavioral finding of raised later.
  Group composition ruleMust differ from any prior attempt by the same participant. Enforced by the
  allocation planner, not by the facilitator.
- `min_seconds` — ,
- `max_seconds` — 1200 minimum, 1800 maximum per session.
- `proposed_compatibility_class` — A — PROPOSED, subject to source approval, administration testing
  and the applicable comparability controls. Compatibility class is ASSIGNED AT RELEASE, not
  inferred during authoring, and these sources have passed no drafting test, no calibration and no
  REC-07. Three separate claims, never collapsed: (1) WITHIN-SOURCE determination comparability: an
  INTENDED DESIGN PROPERTY ONLY. NOT ESTABLISHED until the approved calibration study measures
  agreement on the EXACT source version, question version, answer definitions AND administration
  protocol. Use the words PROPOSED or INTENDED in every register until CA-09 reports calibration
  results. It was previously described as claimable now, which asserts reliability before the study
  exists. (2) CROSS-SOURCE technical compatibility: NOT ESTABLISHED AT AUTHORING. Determined through
  the applicable version, administration and comparison controls. (3) CA-04 Part C context
  relationship: NOT ESTABLISHED until the approved counterpart map names the source versions, the
  constant demand, the approved contextual variation, the comparable conduct and the recurrence
  blockers. The earlier position asserted the sources were fully comparable within the bank, which
  collapsed all three. REC-07 naming conditionA source version CANNOT ENTER REC-07 REVIEW while
  fictional\_
- `name_clearance_status` — = pending. The only permitted values at submission are CLEARED and
  REPLACE_REQUIRED. A source marked replace_required is not approved until the replacement text is
  inserted, THE RENDERED INSTANCE IS RE-HASHED, and the clearance record is re-run against the final
  organisation, client, job title and scenario COMBINATION.fictional\_
- `name_clearance_status` — Governed by the launch naming rule at Part One, Section 5.5. A launch
  source that renders controlled role and entity labels only, and no proper organization, product,
  employer, vendor, client or personal name, is CLEARED because no proper name is rendered. Where a
  source does render a proper name, the status is PENDING and DOES NOT BECOME CLEARED BY ASSERTION:
  the documented combination check for that source and each selectable presentation-name set must be
  completed and recorded, or the name is replaced with a controlled label under Section 5.5. The
  field and its refusal remain built either way: a source rendering a proper name without a
  completed clearance record does not serve.clearance_date, search_terms_used, reviewerTo be
  recorded at the clearance check.known_real_world_conflictRecorded per source. Four confirmed
  conflicts were replaced; see Section 1.replacement_nameRecorded where a replacement was
  required.recheck_triggerBefore REC-07 approval, and again before pilot release. Day-1 integrity
  schedule
- `min_seconds` — and
- `max_seconds` — : 1200 to 1800 per session.
- `source_version_hash` — : assigned at registration.
- `proposed_compatibility_class` — : A, proposed. randomization_seed and presentation_variant_seed:
  as the common model. model_reference and prompt_text_ref: NOT_APPLICABLE — no model administers
  this source; it is human-facilitated. OMISSION IS NOT AN ANSWER.S4 SOURCE-REVIEW CONDITIONNO S4
  SOURCE MAY BE SUBMITTED FOR REC-07 APPROVAL until REC-12 is approved AND the source has a
  completed shared-material, identity, recording, correction, withdrawal, group-composition AND
  ACCOMMODATION-IMPACT assessment. The hold sits BEFORE review, not merely before activation.
  ActivationREC-12 approved for design. Build the surface and its refusals now; real Stage 4
  activation is a separate gate. CURRENT APPLICABILITY STATUSEvery active S2, S3 and S4 source
  carries a per-question Direct / Conditional / Not Served table. THAT TABLE ALONE GOVERNS REGISTRY
  SERVING.Legacy broad service statements and coverage summaries are NON-AUTHORITATIVE.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-001 — THE SHORTLIST ROUND
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-001$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-001$lit$, 'source'::t3a_content_family, $lit$THE SHORTLIST ROUND$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-001$lit$,
              'title', $lit$THE SHORTLIST ROUND$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"accountable_actor_available":"True — the facilitator.","available_routes":"R-a state it during the round at B2. R-b state it at B3. R-c state it at B4.","bearing_interest":"PRESENT. Decision point is the agreement at B4; the enquiry at B3 precedes","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Stating a position on a supplier recommendation to peers who have already","relevant_conduct":"Whether the participant disclosed the family interest relative to the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 no explicit rule, policy, control,","information_made_available":"P0 the pre-brief: the family connection, known since the panel was","material_items":"M1 a director at Alderpine is the participant’s sister-in-law. M2 all three","information_withheld":"Whether the connection would disqualify. Whether the organisation has a","assertion_reference_set":"A1 the connection is too distant to matter. A2 the organisation has no","attribution_support_set":"Empty.","enquiry_point":"B3.","account_test_point":"B6.","post_test_account_opportunity":"true.","time_reference_called_for":"False."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-001 — THE SHORTLIST ROUND

Situation class S-5 with S-2. Pairs with SRC-D1-S1-009 and SRC-D1-S2-005, -010.

**MENTOR BRIEF — what the facilitator knows and does not say**

A four-person panel recommends which of two suppliers to shortlist. The observed participant has a
family connection to a director at one of them and speaks fourth. All three co-participants back
that supplier.

**PARTICIPANT PRE-BRIEF — given before the session**

You are on a four-person panel recommending which of two suppliers to shortlist for a services
contract. You have read both proposals. A director at Alderpine Supply, one of the two, is your
sister-in-law. You have known this since the panel was announced. You speak fourth. Nobody on the
panel knows about the connection. CO-PARTICIPANT POSITIONS — given to each in writing before the
sessionSpeakerPosition they state at

- **B2** Co-participant 1Backs Alderpine on delivery record. Brief, confident. Co-participant 2Backs
  Alderpine on price. Notes the other bid is higher. Co-participant 3Backs Alderpine and says the
  decision looks straightforward. The four questions#BeatASK, verbatim1B3“And your view? Which of
  the two would you recommend?”2B4“So we’re agreed on Alderpine — can I record that as
  unanimous?”3B5“If there’s something we should handle differently, what do you suggest?”4B6“When
  did you first know about that?”The scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re recommending one of two suppliers for the services contract. You’ve all seen both
  proposals. I’ll take a position from each of you in turn, in the order you’re sitting, then we’ll
  agree a recommendation.”—B2ROUNDInvite each co-participant in turn. Do not comment. Do not look at
  or address the observed participant. C1, C2, C8B3ASK 1“And your view? Which of the two would you
  recommend?”C1, C2, C3, C4, C8B4ASK 2“So we’re agreed on Alderpine — can I record that as
  unanimous?” Asked ONCE.C3, C8 update
- **B5** ASK 3“If there’s something we should handle differently, what do you suggest?”C5, C6B6ASK
  4“When did you first know about that?”C7B7SAY“Thank you all. I’ll write it up.” End the session.
  C8 final

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01NOT SERVEDNo source-defined issue;
CE-08 is the construct-Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
model-Q-D1-03aNOT SERVEDNo account-comparison event-Q-D1-03b1NOT SERVEDParent not
served-Q-D1-03b2NOT SERVEDParent not served-Q-D1-04aNOT SERVEDSource does not place the participant
role in the events-Q-D1-04bNOT SERVEDSupport set empty, or not a source designed around
attribution-Q-D1-05aDirectSource creates a corrective-action promptcorrective
promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor

- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route

- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes, performable in session, and the question carries a substantive used-no-route option

- `available_routes` — Q-D1-07NOT SERVEDThe probe asks about awareness or sequence, not a second
  account-Q-D1-08aDirectSource places the participant in a decision in which they hold an interest

- `bearing_interest` — Q-D1-08b — ConditionalServed where 08a records a disclosure

- `bearing_interest` — **Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.

- `workplace_demand` — Stating a position on a supplier recommendation to peers who have already
  backed the supplier in which the participant holds a family interest.

- `relevant_conduct` — Whether the participant disclosed the family interest relative to the
  recommendation decision point, and whether the disclosure followed the direct question;
  identifying a corrective step and route; and observable route use in the round.

- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.

- `stated_standard` — none

- `stated_standard_source_quote_or_location` — none \u2014 no explicit rule, policy, control,
  deadline or operating standard governing panel conflicts is stated in the participant-facing
  material.

- `information_made_available` — P0 the pre-brief: the family connection, known since the panel was
  announced, unknown to the panel. I1 both proposals. I2 the three co-participant positions as
  stated. I3 at B3, the request for a position. I4 at B4, the unanimity question. I5 at B5, the
  corrective prompt. I6 at B6, the timing question.

- `material_items` — M1 a director at Alderpine is the participant’s sister-in-law. M2 all three
  co-participants recommended Alderpine BEFORE the participant’s turn. CORRECTED: previously read
  that the panel is recommending Alderpine, which the participant-facing material does not establish
  — no recommendation has been made when the participant speaks. Facilitator pressure must not
  become an established fact. M3 the participant knew before the session.

- `information_withheld` — Whether the connection would disqualify. Whether the organisation has a
  policy. Whether the director is involved in the bid.

- `assertion_reference_set` — A1 the connection is too distant to matter. A2 the organisation has no
  policy. A3 the participant learned of it during the session. A4 the director has no role in the
  bid.

- `attribution_support_set` — Empty.

- `enquiry_point` — B3.

- `account_test_point` — B6.

- `post_test_account_opportunity` — true.

- `available_routes` — R-a state it during the round at B2. R-b state it at B3. R-c state it at B4.
  R-d ask to withdraw from the panel.

- `accountable_actor_available` — True — the facilitator.

- `time_reference_called_for` — False.

- `bearing_interest` — PRESENT. Decision point is the agreement at B4; the enquiry at B3 precedes
  it, so disclose-before, disclose-at, disclose-after and not-at-all are all reachable.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-001

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And your
view? Which of the two would you recommend?”2B4“So we’re agreed on Alderpine — can I record that as
unanimous?”3B5“If there’s something we should handle differently, what do you suggest?”4B6“When did
you first know about that?”2 What the source established — material items

- M1 a director at Alderpine is the participant’s sister-in-law.
- M2 all three co-participants recommended Alderpine BEFORE the participant’s turn. CORRECTED:
  previously read that the panel is recommending Alderpine, which the participant-facing material
  does not establish — no recommendation has been made when the participant speaks. Facilitator
  pressure must not become an established fact.
- M3 the participant knew before the session.3 What the source does NOT support — unsupported
  assertions
- A1 the connection is too distant to matter.
- A2 the organisation has no policy.
- A3 the participant learned of it during the session.
- A4 the director has no role in the bid.4 Responsibility the source provides — attribution support
  set
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d ask to withdraw from the panel.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator. Time reference called forNO. The time line
  is NOT shown. Bearing interestYES. C8 IS shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-002 — THE STATUS ROLL-UP
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-002$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-002$lit$, 'source'::t3a_content_family, $lit$THE STATUS ROLL-UP$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-002$lit$,
              'title', $lit$THE STATUS ROLL-UP$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the workstream is two weeks behind. M2 two of four deliverables have","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: two weeks behind, two of four deliverables","assertion_reference_set":"A1 the workstream is on track. A2 the slippage will be recovered. A3","accountable_actor_available":"True — the facilitator, the participant.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Reporting workstream status to peers who have all reported on track, when the","relevant_conduct":"Naming that the workstream is behind; timing relative to the direct question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the programme can absorb it. Whether the steering group would","attribution_support_set":"Empty.","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-002 — THE STATUS ROLL-UP

Situation class S-1. Pairs with SRC-D1-S1-001, -010 and SRC-D1-S2-001, -007.

**MENTOR BRIEF — what the facilitator knows and does not say**

Four workstream leads report status for a roll-up going to a steering group. The observed
participant’s workstream is behind. The three others report on track and speak first.

**PARTICIPANT PRE-BRIEF — given before the session**

You lead one of four workstreams on a programme. Status goes up to the steering group this
afternoon. Your workstream is two weeks behind. Two of your four deliverables have slipped and you
have not yet found a way to recover them. You confirmed the slippage with your own team on Monday.
You are fourth to report. CO-PARTICIPANT POSITIONS — given to each in writing before the
sessionSpeakerPosition they state at

- **B2** Co-participant 1Reports on track. No issues. Co-participant 2Reports on track, slightly
  ahead. Co-participant 3Reports on track and says the programme looks in good shape. The four
  questions#BeatASK, verbatim1B3“And yours — where are you?”2B4“So all four green — that’s what goes
  up this afternoon?”3B5“If anything needs flagging, what is it and by when do you need a
  decision?”4B6“When did the slippage first show up?”The scriptBeatSay / AskREAD aloud,
  verbatimCapture
- **B1** SAY“We’re collecting status for the steering group this afternoon. I’ll take each
  workstream in turn in seating order, then confirm what goes up.”—B2ROUNDInvite each co-participant
  in turn. Do not comment. C1, C2B3ASK 1“And yours — where are you?”C1, C2, C3, C4B4ASK 2“So all
  four green — that’s what goes up this afternoon?” Asked ONCE.C3 update
- **B5** ASK 3“If anything needs flagging, what is it and by when do you need a decision?”C5,
  C6B6ASK 4“When did the slippage first show up?”C7B7SAY“Understood. Thanks all.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bNOT SERVEDSupport set empty, or not a source designed
  around attribution-Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectSource places usable routes, performable in session, and
  the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Reporting workstream status to peers who have all reported on track, when the
  participant's own is behind.
- `relevant_conduct` — Naming that the workstream is behind; timing relative to the direct question;
  whether the status account corresponds to the source-provided deliverable facts; the participant's
  own part; identifying a corrective action, actor and time; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: two weeks behind, two of four deliverables
  slipped, no recovery found, confirmed with the team on Monday. I1 the three co-participant status
  reports. I2 at B3, the request. I3 at B4, the roll-up question. I4 at B5, the corrective prompt.
  I5 at B6, the timing question.
- `material_items` — M1 the workstream is two weeks behind. M2 two of four deliverables have
  slipped. M3 no recovery plan exists. M4 the slippage was confirmed on Monday.
- `information_withheld` — Whether the programme can absorb it. Whether the steering group would
  act. Whether anyone else knows.
- `assertion_reference_set` — A1 the workstream is on track. A2 the slippage will be recovered. A3
  the slippage was caused by another workstream. A4 the steering group has been told.
- `attribution_support_set` — Empty.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  raise it with the facilitator after the session.
- `accountable_actor_available` — True — the facilitator, the participant.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-002

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And
yours — where are you?”2B4“So all four green — that’s what goes up this afternoon?”3B5“If anything
needs flagging, what is it and by when do you need a decision?”4B6“When did the slippage first show
up?”2 What the source established — material items

- M1 the workstream is two weeks behind.
- M2 two of four deliverables have slipped.
- M3 no recovery plan exists.
- M4 the slippage was confirmed on Monday.3 What the source does NOT support — unsupported
  assertions
- A1 the workstream is on track.
- A2 the slippage will be recovered.
- A3 the slippage was caused by another workstream.
- A4 the steering group has been told.4 Responsibility the source provides — attribution support set
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d raise it with the facilitator afterwards.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator, the participant. Time reference called
  forYES — B5 asks by when. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-003 — THE WAIVER ROUND
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-003$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-003$lit$, 'source'::t3a_content_family, $lit$THE WAIVER ROUND$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-003$lit$,
              'title', $lit$THE WAIVER ROUND$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 a security sign-off is required before release. M2 it has not been obtained.","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the checklist requires a security sign-off, it","assertion_reference_set":"A1 the sign-off has been obtained. A2 the sign-off is advisory. A3","accountable_actor_available":"True — the facilitator, the security reviewer.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Stating a release position to peers who all favour releasing, when a required","relevant_conduct":"Naming the missing sign-off; timing relative to the direct question; whether","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the build is in fact secure. Whether the sign-off would be given.","attribution_support_set":"Empty.","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-003 — THE WAIVER ROUND

Situation class S-3 with S-1. Pairs with SRC-D1-S1-004, -006 and SRC-D1-S2-003. Closes the S-3 gap
that Stage 3 leaves open.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team decides whether to release a build without a required sign-off. The observed participant
knows the sign-off has not been obtained and speaks fourth. All three co-participants favour
releasing.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is deciding whether to release this evening. The release checklist requires a security
sign-off before any release to production. You checked this morning. The security sign-off has not
been obtained — the request is still sitting unanswered in the queue. You are fourth to speak.
Nobody has mentioned the sign-off. CO-PARTICIPANT POSITIONS — given to each in writing before the
sessionSpeakerPosition they state at

- **B2** Co-participant 1Favours releasing. Says the window is tight and the build is stable.
  Co-participant 2Favours releasing. Says the last three releases were fine. Co-participant 3Favours
  releasing and says the team should not lose another week. The four questions#BeatASK,
  verbatim1B3“And you — release tonight or hold?”2B4“So we’re going tonight. Anything that stops
  that?”3B5“If we hold, what needs to happen and by when?”4B6“When did you last check the queue?”The
  scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re deciding on tonight’s release. I’ll take a view from each of you in turn, then
  we’ll agree.”—B2ROUNDInvite each co-participant in turn. Do not comment. C1, C2B3ASK 1“And you —
  release tonight or hold?”C1, C2, C3, C4B4ASK 2“So we’re going tonight. Anything that stops that?”
  Asked ONCE.C3 update
- **B5** ASK 3“If we hold, what needs to happen and by when?”C5, C6B6ASK 4“When did you last check
  the queue?”C7B7SAY“Right. I’ll confirm the decision.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bNOT SERVEDSupport set empty, or not a source designed
  around attribution-Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectSource places usable routes, performable in session, and
  the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Stating a release position to peers who all favour releasing, when a required
  sign-off has not been obtained.
- `relevant_conduct` — Naming the missing sign-off; timing relative to the direct question; whether
  the account corresponds to the source-provided checklist facts; the participant's own part;
  identifying a corrective action, actor and time; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the checklist requires a security sign-off, it
  has not been obtained, the request is unanswered, checked this morning. I1 the three
  co-participant positions. I2 at B3, the request. I3 at B4, the confirmation question. I4 at B5,
  the corrective prompt. I5 at B6, the timing question.
- `material_items` — M1 a security sign-off is required before release. M2 it has not been obtained.
  M3 the request is unanswered. M4 the participant checked this morning.
- `information_withheld` — Whether the build is in fact secure. Whether the sign-off would be given.
  Whether anyone else knows it is outstanding.
- `assertion_reference_set` — A1 the sign-off has been obtained. A2 the sign-off is advisory. A3
  someone else is chasing it. A4 the previous releases had the same gap.
- `attribution_support_set` — Empty.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  chase the sign-off before the decision.
- `accountable_actor_available` — True — the facilitator, the security reviewer.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-003

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— release tonight or hold?”2B4“So we’re going tonight. Anything that stops that?”3B5“If we hold,
what needs to happen and by when?”4B6“When did you last check the queue?”2 What the source
established — material items

- M1 a security sign-off is required before release.
- M2 it has not been obtained.
- M3 the request is unanswered.
- M4 the participant checked this morning.3 What the source does NOT support — unsupported
  assertions
- A1 the sign-off has been obtained.
- A2 the sign-off is advisory.
- A3 someone else is chasing it.
- A4 the previous releases had the same gap.4 Responsibility the source provides — attribution
  support set
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d chase the sign-off before the decision.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator, the security reviewer. Time reference called
  forYES — B5 asks by when. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-004 — THE WRITE-UP
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-004$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-004$lit$, 'source'::t3a_content_family, $lit$THE WRITE-UP$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-004$lit$,
              'title', $lit$THE WRITE-UP$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the redesign was largely Femi’s work. M2 the participant contributed the","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the redesign was largely Femi’s work, built over","assertion_reference_set":"A1 the work was joint from the outset. A2 the participant led it. A3","attribution_support_set":"AS1 the redesign was largely Femi’s work. AS2 the participant","accountable_actor_available":"True — the facilitator.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Agreeing how to describe work in a case study when credit is being placed","relevant_conduct":"Naming the misattribution; timing relative to the direct question; whether","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether Femi would object. Whether anyone else knows. Whether the case","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-004 — THE WRITE-UP

Situation class S-4. Pairs with SRC-D1-S1-008 and SRC-D1-S2-004.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team agrees how to describe a success in a case study. Credit is being placed with the observed
participant for work largely done by an absent colleague. The participant speaks fourth.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is agreeing what goes into a case study about the intake redesign. The redesign was
largely the work of Femi, who left the organisation in June. He built the flow logic over three
weeks and walked you through it; you contributed the exception-handling table. You are fourth to
speak. CO-PARTICIPANT POSITIONS — given to each in writing before the sessionSpeakerPosition they
state at

- **B2** Co-participant 1Says the redesign should be the centrepiece and names the observed
  participant as its author. Co-participant 2Agrees, and says naming one owner keeps the case study
  clean. Co-participant 3Agrees, and says nobody else is around to ask. The four questions#BeatASK,
  verbatim1B3“And you — how should we describe it?”2B4“So we credit you as the author. That
  works?”3B5“If it should say something else, what and who needs to approve it?”4B6“When was the
  redesign actually built?”The scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re agreeing the case study. I’ll take a view from each of you in turn on how to
  describe the intake redesign, then we’ll settle it.”—B2ROUNDInvite each co-participant in turn. Do
  not comment. C1, C2B3ASK 1“And you — how should we describe it?”C1, C2, C3, C4B4ASK 2“So we credit
  you as the author. That works?” Asked ONCE.C3 update
- **B5** ASK 3“If it should say something else, what and who needs to approve it?”C5, C6B6ASK 4“When
  was the redesign actually built?”C7B7SAY“Good. I’ll draft it.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes, performable in session, and the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Agreeing how to describe work in a case study when credit is being placed
  with the participant for an absent colleague's work.
- `relevant_conduct` — Naming the misattribution; timing relative to the direct question; whether
  the account corresponds to the source-provided authorship facts; the participant's own
  contribution and attribution to the absent colleague; identifying a corrective step; and
  observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the redesign was largely Femi’s work, built over
  three weeks, he walked the participant through it, the participant contributed the
  exception-handling table, Femi left in June. I1 the three co-participant positions. I2 at B3, the
  request. I3 at B4, the credit question. I4 at B5, the corrective prompt. I5 at B6, the timing
  question.
- `material_items` — M1 the redesign was largely Femi’s work. M2 the participant contributed the
  exception-handling table. M3 the participant did not originate it. M4 Femi is no longer at the
  organisation.
- `information_withheld` — Whether Femi would object. Whether anyone else knows. Whether the case
  study will be published externally.
- `assertion_reference_set` — A1 the work was joint from the outset. A2 the participant led it. A3
  Femi asked the participant to represent it. A4 Femi’s contribution is recorded elsewhere.
- `attribution_support_set` — AS1 the redesign was largely Femi’s work. AS2 the participant
  contributed the exception-handling table. AS3 the co-participants attributed authorship to the
  participant.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  raise it with the facilitator afterwards.
- `accountable_actor_available` — True — the facilitator.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-004

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— how should we describe it?”2B4“So we credit you as the author. That works?”3B5“If it should say
something else, what and who needs to approve it?”4B6“When was the redesign actually built?”2 What
the source established — material items

- M1 the redesign was largely Femi’s work.
- M2 the participant contributed the exception-handling table.
- M3 the participant did not originate it.
- M4 Femi is no longer at the organisation.3 What the source does NOT support — unsupported
  assertions
- A1 the work was joint from the outset.
- A2 the participant led it.
- A3 Femi asked the participant to represent it.
- A4 Femi’s contribution is recorded elsewhere.4 Responsibility the source provides — attribution
  support set
- AS1 the redesign was largely Femi’s work.
- AS2 the participant contributed the exception-handling table.
- AS3 the co-participants attributed authorship to the participant.5 Routes the source makes
  available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d raise it with the facilitator afterwards.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator. Time reference called forNO. The time line
  is NOT shown. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-005 — THE ESTIMATE ROUND
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-005$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-005$lit$, 'source'::t3a_content_family, $lit$THE ESTIMATE ROUND$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-005$lit$,
              'title', $lit$THE ESTIMATE ROUND$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the component took nine weeks on each of the last two builds. M2 nothing","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the component took nine weeks twice, nothing is","assertion_reference_set":"A1 six weeks is achievable for the component. A2 the previous builds","accountable_actor_available":"True — the facilitator.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Agreeing a client estimate with peers who have all committed to a figure the","relevant_conduct":"Naming that the component cannot meet the figure; timing relative to the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the client would accept nine. Whether scope could be cut. Whether","attribution_support_set":"Empty.","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-005 — THE ESTIMATE ROUND

Situation class S-2. Pairs with SRC-D1-S1-005, -010 and SRC-D1-S2-002, -008.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team agrees an estimate to give a client. The observed participant knows their component cannot be
delivered in the figure being agreed, and speaks fourth.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is agreeing an estimate to give a client this afternoon. The figure under discussion is
six weeks. Your component alone took nine weeks the last two times it was built, and nothing about
this one is simpler. You checked both previous delivery records yesterday. You are fourth to speak.
CO-PARTICIPANT POSITIONS — given to each in writing before the sessionSpeakerPosition they state at

- **B2** Co-participant 1Says six weeks is achievable if everyone holds their scope. Co-participant
  2Says six weeks, and that the client will not accept longer. Co-participant 3Says six weeks and
  that the team has done tighter before. The four questions#BeatASK, verbatim1B3“And you — six weeks
  for your part?”2B4“So six weeks goes to the client. Everyone comfortable?”3B5“If it can’t be six,
  what should we say and by when do you need to know?”4B6“When did you last look at the delivery
  records?”The scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re agreeing an estimate to give the client this afternoon. I’ll take each of you in
  turn, then confirm.”—B2ROUNDInvite each co-participant in turn. Do not comment. C1, C2B3ASK 1“And
  you — six weeks for your part?”C1, C2, C3, C4B4ASK 2“So six weeks goes to the client. Everyone
  comfortable?” Asked ONCE.C3 update
- **B5** ASK 3“If it can’t be six, what should we say and by when do you need to know?”C5, C6B6ASK
  4“When did you last look at the delivery records?”C7B7SAY“Thanks. I’ll put it to the client.” End
  the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bNOT SERVEDSupport set empty, or not a source designed
  around attribution-Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectSource places usable routes, performable in session, and
  the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Agreeing a client estimate with peers who have all committed to a figure the
  participant's own component cannot meet.
- `relevant_conduct` — Naming that the component cannot meet the figure; timing relative to the
  direct question; whether the account corresponds to the source-provided delivery records; the
  participant's own part; identifying a corrective action, actor and time; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the component took nine weeks twice, nothing is
  simpler this time, records checked yesterday. I1 the three co-participant positions. I2 at B3, the
  request. I3 at B4, the confirmation. I4 at B5, the corrective prompt. I5 at B6, the timing
  question.
- `material_items` — M1 the component took nine weeks on each of the last two builds. M2 nothing
  about this build is simpler. M3 the figure under discussion is six weeks. M4 the participant
  checked the records yesterday.
- `information_withheld` — Whether the client would accept nine. Whether scope could be cut. Whether
  anyone else has the same problem.
- `assertion_reference_set` — A1 six weeks is achievable for the component. A2 the previous builds
  were more complex. A3 the records are not available. A4 another team member has agreed to absorb
  the difference.
- `attribution_support_set` — Empty.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  raise it with the facilitator before the client is told.
- `accountable_actor_available` — True — the facilitator.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-005

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— six weeks for your part?”2B4“So six weeks goes to the client. Everyone comfortable?”3B5“If it
can’t be six, what should we say and by when do you need to know?”4B6“When did you last look at the
delivery records?”2 What the source established — material items

- M1 the component took nine weeks on each of the last two builds.
- M2 nothing about this build is simpler.
- M3 the figure under discussion is six weeks.
- M4 the participant checked the records yesterday.3 What the source does NOT support — unsupported
  assertions
- A1 six weeks is achievable for the component.
- A2 the previous builds were more complex.
- A3 the records are not available.
- A4 another team member has agreed to absorb the difference.4 Responsibility the source provides —
  attribution support set
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d raise it with the facilitator before the client is told.6 What this script does and does not
  ask forItemThis scriptAccountable actor offeredYES — the facilitator. Time reference called forYES
  — B5 asks by when. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-006 — THE INCIDENT REVIEW
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-006$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-006$lit$, 'source'::t3a_content_family, $lit$THE INCIDENT REVIEW$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-006$lit$,
              'title', $lit$THE INCIDENT REVIEW$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the participant saw a manual override. M2 Marek performed it. M3 Marek has","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the participant saw Marek override the routing","assertion_reference_set":"A1 the misrouting was caused by a system fault. A2 the participant did","attribution_support_set":"AS1 Marek overrode the routing prompt manually. AS2 Marek attributed","accountable_actor_available":"True — the facilitator, Marek.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Contributing to an incident review where the participant saw the colleague","relevant_conduct":"Naming what was observed on the floor; timing relative to the direct","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the override caused the misrouting. Whether Marek was authorised","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-006 — THE INCIDENT REVIEW

Situation class S-6 with S-1. Pairs with SRC-D1-S1-002, -007 and SRC-D1-S2-006.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team reviews an incident. The observed participant saw a colleague take the action that caused it.
The colleague is in the room and does not mention it. The participant speaks fourth.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is reviewing an incident from Tuesday: a batch was despatched to the wrong depot. You were
on the floor and saw a colleague, Marek, override the routing prompt manually. He is in this review
and has not mentioned it. You are fourth to speak. Nobody else was on the floor at that moment.
CO-PARTICIPANT POSITIONS — given to each in writing before the sessionSpeakerPosition they state at

- **B2** Co-participant 1 (Marek)Says the routing system has been unreliable and suggests a system
  fault. Co-participant 2Agrees it is probably the system and suggests raising a ticket.
  Co-participant 3Agrees, and says these things happen. The four questions#BeatASK, verbatim1B3“And
  you — what do you think happened?”2B4“So we log it as a system fault. Agreed?”3B5“If it’s
  something else, what should we do and who needs to know?”4B6“Where were you when the batch went
  out?”The scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re reviewing Tuesday’s misrouted batch. I’ll take a view from each of you in turn,
  then we’ll agree what to log.”—B2ROUNDInvite each co-participant in turn, Marek first. Do not
  comment. C1, C2B3ASK 1“And you — what do you think happened?”C1, C2, C3, C4B4ASK 2“So we log it as
  a system fault. Agreed?” Asked ONCE.C3 update
- **B5** ASK 3“If it’s something else, what should we do and who needs to know?”C5, C6B6ASK 4“Where
  were you when the batch went out?”C7B7SAY“Right. I’ll write it up.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aNOT SERVEDSource does not place the participant role in the
  events-Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes, performable in session, and the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Contributing to an incident review where the participant saw the colleague
  present cause the incident.
- `relevant_conduct` — Naming what was observed on the floor; timing relative to the direct
  question; whether the account corresponds to what the source establishes; attribution to the
  colleague present; identifying a corrective action and actor; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the participant saw Marek override the routing
  prompt manually, Marek is in the room and has not mentioned it, nobody else was on the floor. I1
  the three co-participant positions. I2 at B3, the request. I3 at B4, the logging question. I4 at
  B5, the corrective prompt. I5 at B6, the location question.
- `material_items` — M1 the participant saw a manual override. M2 Marek performed it. M3 Marek has
  not mentioned it in the review. M4 no one else was on the floor.
- `information_withheld` — Whether the override caused the misrouting. Whether Marek was authorised
  to override. Whether the system is also faulty.
- `assertion_reference_set` — A1 the misrouting was caused by a system fault. A2 the participant did
  not see what happened. A3 Marek was authorised to override. A4 the override was routine.
- `attribution_support_set` — AS1 Marek overrode the routing prompt manually. AS2 Marek attributed
  the incident to the routing system.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  raise it with the facilitator privately afterwards.
- `accountable_actor_available` — True — the facilitator, Marek.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-006

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— what do you think happened?”2B4“So we log it as a system fault. Agreed?”3B5“If it’s something
else, what should we do and who needs to know?”4B6“Where were you when the batch went out?”2 What
the source established — material items

- M1 the participant saw a manual override.
- M2 Marek performed it.
- M3 Marek has not mentioned it in the review.
- M4 no one else was on the floor.3 What the source does NOT support — unsupported assertions
- A1 the misrouting was caused by a system fault.
- A2 the participant did not see what happened.
- A3 Marek was authorised to override.
- A4 the override was routine.4 Responsibility the source provides — attribution support set
- AS1 Marek overrode the routing prompt manually.
- AS2 Marek attributed the incident to the routing system.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d raise it with the facilitator privately afterwards.6 What this script does and does not ask
  forItemThis scriptAccountable actor offeredYES — the facilitator, Marek. Time reference called
  forNO. The time line is NOT shown. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-007 — THE PROMOTION PANEL
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-007$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-007$lit$, 'source'::t3a_content_family, $lit$THE PROMOTION PANEL$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-007$lit$,
              'title', $lit$THE PROMOTION PANEL$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"accountable_actor_available":"True — the facilitator.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","bearing_interest":"PRESENT. Decision point is the agreement at B4.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Stating a view on a promotion candidate who is a close personal friend, to","relevant_conduct":"Whether the participant disclosed the friendship relative to the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_made_available":"P0 the pre-brief: close friendship outside work with one candidate,","material_items":"M1 a close personal friendship exists with one candidate. M2 the participant is","information_withheld":"Whether the friendship would disqualify. Whether the organisation has a","assertion_reference_set":"A1 the friendship is casual. A2 the organisation has no policy. A3 the","attribution_support_set":"Empty.","enquiry_point":"B3.","account_test_point":"B6.","post_test_account_opportunity":"true.","time_reference_called_for":"False."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-007 — THE PROMOTION PANEL

Situation class S-5. Pairs with SRC-D1-S1-009 and SRC-D1-S2-005. Second Stage 4 source carrying
CE-08.

**MENTOR BRIEF — what the facilitator knows and does not say**

An internal promotion panel of four. The observed participant is close friends with one candidate
outside work and speaks fourth. The room is converging on that candidate.

**PARTICIPANT PRE-BRIEF — given before the session**

You are on a four-person internal promotion panel. Three candidates are under discussion. One of
them, Rhiannon, is a close friend outside work. You holiday together and you were at her wedding.
This is not known at work. You speak fourth. CO-PARTICIPANT POSITIONS — given to each in writing
before the sessionSpeakerPosition they state at

- **B2** Co-participant 1Favours Rhiannon on her delivery record. Co-participant 2Favours Rhiannon
  and notes she is the strongest on the criteria. Co-participant 3Favours Rhiannon and says it looks
  clear-cut. The four questions#BeatASK, verbatim1B3“And your view on the three?”2B4“So Rhiannon.
  Can I record that as agreed?”3B5“If we should do this differently, what do you suggest?”4B6“How
  long have you known her?”The scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re recommending one of three internal candidates. I’ll take a view from each of you
  in turn, then agree a recommendation.”—B2ROUNDInvite each co-participant in turn. Do not comment.
  C1, C2, C8B3ASK 1“And your view on the three?”C1, C2, C3, C4, C8B4ASK 2“So Rhiannon. Can I record
  that as agreed?” Asked ONCE.C3, C8 update
- **B5** ASK 3“If we should do this differently, what do you suggest?”C5, C6B6ASK 4“How long have
  you known her?”C7B7SAY“Thank you. I’ll record the recommendation.” End the session. C8 final

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01NOT SERVEDNo source-defined issue;
CE-08 is the construct-Q-D1-02NOT SERVEDNothing to have raised, or redundant with the CE-08 timing
model-Q-D1-03aNOT SERVEDNo account-comparison event-Q-D1-03b1NOT SERVEDParent not
served-Q-D1-03b2NOT SERVEDParent not served-Q-D1-04aNOT SERVEDSource does not place the participant
role in the events-Q-D1-04bNOT SERVEDSupport set empty, or not a source designed around
attribution-Q-D1-05aDirectSource creates a corrective-action promptcorrective
promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor

- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route

- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes, performable in session, and the question carries a substantive used-no-route option

- `available_routes` — Q-D1-07NOT SERVEDThe probe asks about awareness or sequence, not a second
  account-Q-D1-08aDirectSource places the participant in a decision in which they hold an interest

- `bearing_interest` — Q-D1-08b — ConditionalServed where 08a records a disclosure

- `bearing_interest` — **Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.

- `workplace_demand` — Stating a view on a promotion candidate who is a close personal friend, to
  peers who all favour that candidate.

- `relevant_conduct` — Whether the participant disclosed the friendship relative to the
  recommendation decision point, and whether the disclosure followed the direct question;
  identifying a corrective step and route; and observable route use.

- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.

- `stated_standard` — none

- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.

- `information_made_available` — P0 the pre-brief: close friendship outside work with one candidate,
  holidays together, attended the wedding, not known at work. I1 the three co-participant positions.
  I2 at B3, the request. I3 at B4, the agreement question. I4 at B5, the corrective prompt. I5 at
  B6, the duration question.

- `material_items` — M1 a close personal friendship exists with one candidate. M2 the participant is
  assessing that candidate. M3 the friendship is not known at work.

- `information_withheld` — Whether the friendship would disqualify. Whether the organisation has a
  policy. Whether Rhiannon expects support.

- `assertion_reference_set` — A1 the friendship is casual. A2 the organisation has no policy. A3 the
  participant knows all three candidates equally. A4 Rhiannon is unaware of the panel composition.

- `attribution_support_set` — Empty.

- `enquiry_point` — B3.

- `account_test_point` — B6.

- `post_test_account_opportunity` — true.

- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  ask to step off the panel.

- `accountable_actor_available` — True — the facilitator.

- `time_reference_called_for` — False.

- `bearing_interest` — PRESENT. Decision point is the agreement at B4.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-007

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And your
view on the three?”2B4“So Rhiannon. Can I record that as agreed?”3B5“If we should do this
differently, what do you suggest?”4B6“How long have you known her?”2 What the source established —
material items

- M1 a close personal friendship exists with one candidate.
- M2 the participant is assessing that candidate.
- M3 the friendship is not known at work.3 What the source does NOT support — unsupported assertions
- A1 the friendship is casual.
- A2 the organisation has no policy.
- A3 the participant knows all three candidates equally.
- A4 Rhiannon is unaware of the panel composition.4 Responsibility the source provides — attribution
  support set
- EMPTY. Any attribution to another person is not aligned.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d ask to step off the panel.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator. Time reference called forNO. The time line
  is NOT shown. Bearing interestYES. C8 IS shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-008 — THE FIGURE IN THE ROOM
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-008$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-008$lit$, 'source'::t3a_content_family, $lit$THE FIGURE IN THE ROOM$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-008$lit$,
              'title', $lit$THE FIGURE IN THE ROOM$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the working figure is forty-two. M2 the participant has seen a revised","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the revised figure of thirty-one seen in a","assertion_reference_set":"A1 the revised figure is final. A2 the participant has not seen a","attribution_support_set":"AS1 the participant was told the revision is confidential.","accountable_actor_available":"True — the facilitator, the budget session owner.","available_routes":"R-a say something during the round. R-b say something at B3. R-c decline to","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Contributing to a plan built on a headcount figure the participant knows from","relevant_conduct":"Naming that the working figure is superseded; timing relative to the direct","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the revision is final. When it will be announced. Whether the","post_test_account_opportunity":"true.","time_reference_called_for":"False.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-008 — THE FIGURE IN THE ROOM

Situation class S-7 with S-1. Pairs with SRC-D1-S1-002 and SRC-D1-S2-009.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team is working from a figure the observed participant knows to be superseded, from a restricted
source they were not authorised to discuss. The participant speaks fourth.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is planning against a headcount figure of forty-two for next year. In a restricted budget
session last week you saw the revised figure, which is thirty-one. You were told the revision is
confidential and not yet announced. You are fourth to speak. Nobody else in the room has seen it.
CO-PARTICIPANT POSITIONS — given to each in writing before the sessionSpeakerPosition they state at

- **B2** Co-participant 1Plans against forty-two and allocates roles accordingly. Co-participant
  2Plans against forty-two and proposes a hiring schedule. Co-participant 3Plans against forty-two
  and says the numbers give useful headroom. The four questions#BeatASK, verbatim1B3“And you — does
  the plan work on those numbers?”2B4“So we build the plan on forty-two. Agreed?”3B5“If there’s a
  problem with the number, what should we do and who should we ask?”4B6“When did you last see a
  headcount figure?”The scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re building next year’s plan on the headcount we have. I’ll take each of you in
  turn, then we’ll agree the basis.”—B2ROUNDInvite each co-participant in turn. Do not comment. C1,
  C2B3ASK 1“And you — does the plan work on those numbers?”C1, C2, C3, C4B4ASK 2“So we build the
  plan on forty-two. Agreed?” Asked ONCE.C3 update
- **B5** ASK 3“If there’s a problem with the number, what should we do and who should we ask?”C5,
  C6B6ASK 4“When did you last see a headcount figure?”C7B7SAY“Good. I’ll confirm the basis.” End the
  session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aNOT SERVEDSource does not place the participant role in the
  events-Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05cNOT SERVEDNo time reference called for-Q-D1-06DirectSource places
  usable routes, performable in session, and the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Contributing to a plan built on a headcount figure the participant knows from
  a restricted source to be superseded.
- `relevant_conduct` — Naming that the working figure is superseded; timing relative to the direct
  question; whether the account corresponds to what the participant was told; identifying a
  corrective action and actor; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the revised figure of thirty-one seen in a
  restricted session, told it is confidential and unannounced, nobody else in the room has seen it.
  I1 the three co-participant positions. I2 at B3, the request. I3 at B4, the basis question. I4 at
  B5, the corrective prompt. I5 at B6, the timing question.
- `material_items` — M1 the working figure is forty-two. M2 the participant has seen a revised
  figure of thirty-one. M3 the revision is confidential and unannounced. M4 nobody else in the room
  has seen it.
- `information_withheld` — Whether the revision is final. When it will be announced. Whether the
  participant may say anything about it.
- `assertion_reference_set` — A1 the revised figure is final. A2 the participant has not seen a
  revised figure. A3 the revision is public. A4 the participant is authorised to disclose it.
- `attribution_support_set` — AS1 the participant was told the revision is confidential.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a say something during the round. R-b say something at B3. R-c decline to
  confirm the basis at B4. R-d raise it with the facilitator privately.
- `accountable_actor_available` — True — the facilitator, the budget session owner.
- `time_reference_called_for` — False.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-008

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— does the plan work on those numbers?”2B4“So we build the plan on forty-two. Agreed?”3B5“If there’s
a problem with the number, what should we do and who should we ask?”4B6“When did you last see a
headcount figure?”2 What the source established — material items

- M1 the working figure is forty-two.
- M2 the participant has seen a revised figure of thirty-one.
- M3 the revision is confidential and unannounced.
- M4 nobody else in the room has seen it.3 What the source does NOT support — unsupported assertions
- A1 the revised figure is final.
- A2 the participant has not seen a revised figure.
- A3 the revision is public.
- A4 the participant is authorised to disclose it.4 Responsibility the source provides — attribution
  support set
- AS1 the participant was told the revision is confidential.5 Routes the source makes available
- R-a say something during the round.
- R-b say something at B3.
- R-c decline to confirm the basis at B4.
- R-d raise it with the facilitator privately.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator, the budget session owner. Time reference
  called forNO. The time line is NOT shown. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-009 — THE COMMITMENT ROUND
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-009$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-009$lit$, 'source'::t3a_content_family, $lit$THE COMMITMENT ROUND$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-009$lit$,
              'title', $lit$THE COMMITMENT ROUND$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the dependency completes on the twenty-second. M2 the date under discussion","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the dependency completes on the twenty-second,","assertion_reference_set":"A1 the dependency will complete before the fifteenth. A2 the migration","attribution_support_set":"AS1 the migration lead confirmed the twenty-second on Friday.","accountable_actor_available":"True — the facilitator, the migration lead.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Committing to a delivery date in front of a stakeholder when the","relevant_conduct":"Naming that the dependency cannot meet the date; timing relative to the","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the migration could be accelerated. Whether the stakeholder would","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-009 — THE COMMITMENT ROUND

Situation class S-2 with S-1. Pairs with SRC-D1-S1-005, -010 and SRC-D1-S2-007.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team commits to a delivery date in front of a stakeholder. The observed participant knows their
dependency will not be ready and speaks fourth.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is committing to a go-live date of the fifteenth in front of a stakeholder. Your part
depends on a data migration that is not scheduled to complete until the twenty-second. You confirmed
that with the migration lead on Friday and it has not moved. You are fourth to speak. CO-PARTICIPANT
POSITIONS — given to each in writing before the sessionSpeakerPosition they state at

- **B2** Co-participant 1Commits to the fifteenth. Co-participant 2Commits to the fifteenth and says
  the plan is tight but fine. Co-participant 3Commits to the fifteenth and says the stakeholder
  needs certainty. The four questions#BeatASK, verbatim1B3“And you — the fifteenth?”2B4“So the
  fifteenth, all four. I’ll tell them that’s firm?”3B5“If the fifteenth is at risk, what do you need
  and by when?”4B6“When did you last speak to the migration lead?”The scriptBeatSay / AskREAD aloud,
  verbatimCapture
- **B1** SAY“We’re confirming the go-live date. I’ll take each of you in turn, then I’ll take it to
  the stakeholder.”—B2ROUNDInvite each co-participant in turn. Do not comment. C1, C2B3ASK 1“And you
  — the fifteenth?”C1, C2, C3, C4B4ASK 2“So the fifteenth, all four. I’ll tell them that’s firm?”
  Asked ONCE.C3 update
- **B5** ASK 3“If the fifteenth is at risk, what do you need and by when?”C5, C6B6ASK 4“When did you
  last speak to the migration lead?”C7B7SAY“Understood. Thanks all.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bDirectNon-empty source-specific attribution support set
- `attribution_support_set` — Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectSource places usable routes, performable in session, and
  the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Committing to a delivery date in front of a stakeholder when the
  participant's dependency cannot meet it.
- `relevant_conduct` — Naming that the dependency cannot meet the date; timing relative to the
  direct question; whether the account corresponds to the source-provided migration facts; the
  participant's own part; identifying a corrective action, actor and time; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the dependency completes on the twenty-second,
  confirmed with the migration lead on Friday, unmoved. I1 the three co-participant commitments. I2
  at B3, the request. I3 at B4, the firmness question. I4 at B5, the corrective prompt. I5 at B6,
  the timing question.
- `material_items` — M1 the dependency completes on the twenty-second. M2 the date under discussion
  is the fifteenth. M3 the participant confirmed the dependency on Friday. M4 the date has not
  moved.
- `information_withheld` — Whether the migration could be accelerated. Whether the stakeholder would
  accept a later date. Whether anyone else shares the dependency.
- `assertion_reference_set` — A1 the dependency will complete before the fifteenth. A2 the migration
  lead has agreed to accelerate. A3 the participant’s part does not depend on the migration. A4 the
  stakeholder has already been told of a risk.
- `attribution_support_set` — AS1 the migration lead confirmed the twenty-second on Friday.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  raise it with the facilitator before the stakeholder is told.
- `accountable_actor_available` — True — the facilitator, the migration lead.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-009

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— the fifteenth?”2B4“So the fifteenth, all four. I’ll tell them that’s firm?”3B5“If the fifteenth is
at risk, what do you need and by when?”4B6“When did you last speak to the migration lead?”2 What the
source established — material items

- M1 the dependency completes on the twenty-second.
- M2 the date under discussion is the fifteenth.
- M3 the participant confirmed the dependency on Friday.
- M4 the date has not moved.3 What the source does NOT support — unsupported assertions
- A1 the dependency will complete before the fifteenth.
- A2 the migration lead has agreed to accelerate.
- A3 the participant’s part does not depend on the migration.
- A4 the stakeholder has already been told of a risk.4 Responsibility the source provides —
  attribution support set
- AS1 the migration lead confirmed the twenty-second on Friday.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d raise it with the facilitator before the stakeholder is told.6 What this script does and does
  not ask forItemThis scriptAccountable actor offeredYES — the facilitator, the migration lead. Time
  reference called forYES — B5 asks by when. Bearing interestNO. C8 is not shown. Account testB6.$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

  -- SRC-D1-S4-010 — THE STAND-DOWN
  IF NOT EXISTS (SELECT 1 FROM public.t3a_content_object
                 WHERE family = 'source'::t3a_content_family
                   AND identifier = $lit$SRC-D1-S4-010$lit$) THEN
    INSERT INTO public.t3a_content_object
      (identifier, family, title, dimension_id, current_operational_state)
    VALUES ($lit$SRC-D1-S4-010$lit$, 'source'::t3a_content_family, $lit$THE STAND-DOWN$lit$, 'D1',
            'not_loaded'::t3a_operational_state)
    RETURNING content_object_id INTO v_object;

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v_object, 'v1', 'drafting'::t3a_approval_status,
            'not_loaded'::t3a_operational_state,
            jsonb_build_object(
              'source_identifier', $lit$SRC-D1-S4-010$lit$,
              'title', $lit$THE STAND-DOWN$lit$,
              'stage_code', $lit$S4$lit$,
              'source_sheet', $lit${"material_items":"M1 the pre-shift restraint check was required. M2 the participant did not","enquiry_point":"B3.","information_made_available":"P0 the pre-brief: the participant skipped the pre-shift restraint","assertion_reference_set":"A1 the check was performed. A2 the previous day’s check was","accountable_actor_available":"True — the facilitator, the participant.","available_routes":"R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d","account_test_point":"B6.","route_observation_basis":"Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or","workplace_demand":"Stating a position on resuming after a near-miss, when the participant","relevant_conduct":"Naming the skipped pre-shift check; timing relative to the direct question;","cross_context_map":"CA04_partC_version: not yet issued. This field points to the clause-specific","stated_standard":"none","stated_standard_source_quote_or_location":"none \\u2014 the participant-facing material states","information_withheld":"Whether the skipped check caused the near-miss. Whether anyone else","attribution_support_set":"Empty. The omission is the participant’s own and the source provides","post_test_account_opportunity":"true.","time_reference_called_for":"TRUE. B5 asks by when.","bearing_interest":"None."}$lit$::jsonb,
              'verbatim', $lit$#### SRC-D1-S4-010 — THE STAND-DOWN

Situation class S-3 with S-1. Pairs with SRC-D1-S1-004 and SRC-D1-S2-003. The participant’s own
omission is the material fact.

**MENTOR BRIEF — what the facilitator knows and does not say**

A team decides whether to resume after a near-miss. The observed participant skipped a required
pre-shift check that morning. Nobody knows. The participant speaks fourth.

**PARTICIPANT PRE-BRIEF — given before the session**

Your team is deciding whether to resume operations after a near-miss this morning — a load shifted
on a vehicle leaving the yard. Nobody was hurt. You skipped the pre-shift restraint check on that
vehicle. You were short of time and the vehicle had been checked the previous day. Nobody knows you
skipped it. You are fourth to speak. CO-PARTICIPANT POSITIONS — given to each in writing before the
sessionSpeakerPosition they state at

- **B2** Co-participant 1Favours resuming. Says the load was within tolerance and the driver reacted
  well. Co-participant 2Favours resuming. Says the yard is already behind. Co-participant 3Favours
  resuming and suggests a reminder briefing. The four questions#BeatASK, verbatim1B3“And you —
  resume or hold?”2B4“So we resume, with a reminder briefing. Anything else we should know?”3B5“If
  something needs to change, what and by when?”4B6“When was that vehicle last checked?”The
  scriptBeatSay / AskREAD aloud, verbatimCapture
- **B1** SAY“We’re deciding whether to resume after this morning’s near-miss. I’ll take a view from
  each of you in turn, then we’ll agree.”—B2ROUNDInvite each co-participant in turn. Do not comment.
  C1, C2B3ASK 1“And you — resume or hold?”C1, C2, C3, C4B4ASK 2“So we resume, with a reminder
  briefing. Anything else we should know?” Asked ONCE.C3 update
- **B5** ASK 3“If something needs to change, what and by when?”C5, C6B6ASK 4“When was that vehicle
  last checked?”C7B7SAY“Right. I’ll confirm the decision.” End the session.—

**Question applicability**

Every question object, with its state, the PRE-OBSERVATION source trigger and the exact source
basis. Source applicability is established before observation; a participant response may activate
an approved child branch but may not create a parent element the source did not place in scope.
QuestionStatePre-observation source triggerSource basisQ-D1-01DirectSource defines a nameable issue

- `material_items` — Q-D1-02Direct — Enquiry point present and something to have raised
- `enquiry_point` — Q-D1-03aDirect
- `material_items` — and
- `information_made_available` — present
- `material_items` — Q-D1-03b1ConditionalServed only where 03a returns an omission
- `material_items` — Q-D1-03b2ConditionalServed only where 03a returns an unsupported claim
- `assertion_reference_set` — Q-D1-04aDirectSource places the participant own role in the underlying
  events
- `information_made_available` — Q-D1-04bNOT SERVEDSupport set empty, or not a source designed
  around attribution-Q-D1-05aDirectSource creates a corrective-action promptcorrective
  promptQ-D1-05b1ConditionalServed where 05a returns an action and the source offers an actor
- `accountable_actor_available` — Q-D1-05b2ConditionalServed where 05a returns an action and the
  source offers a route
- `available_routes` — Q-D1-05c — ConditionalServed where 05a returns an action and the source calls
  for a timecorrective promptQ-D1-06DirectSource places usable routes, performable in session, and
  the question carries a substantive used-no-route option
- `available_routes` — Q-D1-07Direct — Account test compares a second account of the same material
  facts
- `account_test_point` — Q-D1-08aNOT SERVEDNo bearing interest-Q-D1-08bNOT SERVEDParent not served-

**Source sheet**

- `route_observation_basis` — Only a route PERFORMED WITHIN THE RECORDED GROUP INTERACTION, or
  through an authorised post-round channel retained in the observation record, counts as Q-D1-06. A
  statement of future intention does not.
- `workplace_demand` — Stating a position on resuming after a near-miss, when the participant
  skipped the required pre-shift check.
- `relevant_conduct` — Naming the skipped pre-shift check; timing relative to the direct question;
  whether the account corresponds to what the source establishes; the participant's own part;
  identifying a corrective action, actor and time; and observable route use.
- `cross_context_map` — CA04_partC_version: not yet issued. This field points to the clause-specific
  CA-04 Part C record and holds no map of its own. Required row structure per conduct-clause
  relationship: source_version_id; conduct_clause_or_recurrence_equivalence_key;
  counterpart_source_version_id; constant_demand; approved_contextual_difference;
  technical_comparability_required; eligible_claim (multi_context, fourth_state or neither);
  recurrence_blocker; CA04_partC_version. CURRENT STATUS: NO APPROVED CA-04 PART C COUNTERPART ROW
  EXISTS FOR THIS SOURCE VERSION. This source may support an OBSERVATION STATEMENT ONLY. It may NOT
  support a multi-context frame or a fourth-state recurrence frame until an approved CA-04 Part C
  row explicitly names this source version, the counterpart source version, the eligible conduct
  clause or recurrence-equivalence key, the approved contextual difference, and the recurrence
  blockers.
- `stated_standard` — none
- `stated_standard_source_quote_or_location` — none \u2014 the participant-facing material states
  factual conditions and deadlines but no explicit rule, policy, control or operating standard.
- `information_made_available` — P0 the pre-brief: the participant skipped the pre-shift restraint
  check on that vehicle, was short of time, the vehicle was checked the previous day, nobody knows.
  I1 the three co-participant positions. I2 at B3, the request. I3 at B4, the anything-else
  question. I4 at B5, the corrective prompt. I5 at B6, the check question.
- `material_items` — M1 the pre-shift restraint check was required. M2 the participant did not
  perform it. M3 the vehicle was checked the previous day. M4 the near-miss involved a load shift on
  that vehicle.
- `information_withheld` — Whether the skipped check caused the near-miss. Whether anyone else
  skipped checks. What the investigation will find.
- `assertion_reference_set` — A1 the check was performed. A2 the previous day’s check was
  sufficient. A3 the skipped check could not have caused the near-miss. A4 another person was
  responsible for the check.
- `attribution_support_set` — Empty. The omission is the participant’s own and the source provides
  no other responsible party.
- `enquiry_point` — B3.
- `account_test_point` — B6.
- `post_test_account_opportunity` — true.
- `available_routes` — R-a state it during the round. R-b state it at B3. R-c state it at B4. R-d
  raise it with the facilitator privately.
- `accountable_actor_available` — True — the facilitator, the participant.
- `time_reference_called_for` — TRUE. B5 asks by when.
- `bearing_interest` — None.

**MENTOR REFERENCE CARD**

— SRC-D1-S4-010

**How to use this card**

Keep this visible for the whole session. Everything on it is a FACT ABOUT THE SOURCE. There is
nothing here about what a good answer looks like. The only place correctness exists is the account.
Sections 2 and 3 are the lists you check an account against.1 The four questions#BeatASK1B3“And you
— resume or hold?”2B4“So we resume, with a reminder briefing. Anything else we should know?”3B5“If
something needs to change, what and by when?”4B6“When was that vehicle last checked?”2 What the
source established — material items

- M1 the pre-shift restraint check was required.
- M2 the participant did not perform it.
- M3 the vehicle was checked the previous day.
- M4 the near-miss involved a load shift on that vehicle.3 What the source does NOT support —
  unsupported assertions
- A1 the check was performed.
- A2 the previous day’s check was sufficient.
- A3 the skipped check could not have caused the near-miss.
- A4 another person was responsible for the check.4 Responsibility the source provides — attribution
  support set
- EMPTY. The omission is the participant’s own; the source provides no other responsible party, so
  ANY attribution to another is not aligned.5 Routes the source makes available
- R-a state it during the round.
- R-b state it at B3.
- R-c state it at B4.
- R-d raise it with the facilitator privately.6 What this script does and does not ask forItemThis
  scriptAccountable actor offeredYES — the facilitator, the participant. Time reference called
  forYES — B5 asks by when. Bearing interestNO. C8 is not shown. Account testB6.SECTION 12 — THE
  STAGE 4 BANK REGISTER12.1 CoverageSourceSituation classCandidate counterparts001 Shortlist
  RoundS-5/S-2S1-009, S2-005, S2-010002 Status Roll-UpS-1S1-001, S1-010, S2-001, S2-007003 Waiver
  RoundS-3/S-1S1-004, S1-006, S2-003004 The Write-UpS-4S1-008, S2-004005 Estimate RoundS-2S1-005,
  S1-010, S2-002, S2-008006 Incident ReviewS-6/S-1S1-002, S1-007, S2-006007 Promotion
  PanelS-5S1-009, S2-005008 The Figure in the RoomS-7/S-1S1-002, S2-009009 Commitment
  RoundS-2/S-1S1-005, S1-010, S2-007010 The Stand-DownS-3/S-1S1-004, S2-003Applicability table
  status: COMPLETE for all ten. Coverage is derived ONLY from each source Direct / Conditional / Not
  Served table; THIS REGISTER DOES NOT INDEPENDENTLY AUTHORIZE SERVING OR RECURRENCE.What the$lit$,
              'rec07_approval_ref', NULL,
              'source_version_hash', NULL,
              'name_clearance_status', 'PENDING'))
    RETURNING content_version_id INTO v_version;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::t3a_env_state, v_object, v_version,
            'DISABLED_PENDING_DECISION'::t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18. Loaded as content. No REC-07 approval and no source-version hash, so this source cannot be registered for serving. The refusal is the control.');
  END IF;

END;
$load$;
