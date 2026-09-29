-- =====================================================================
-- Issue 3 Section 6, PHASE 3 — the suite run
--
-- Phase 1 changed the definitions, Phase 2 ran the parse, and only now are
-- the redefined tests executed. Running Phase 3 before Phase 2 could not
-- have worked: AC-13's new fixture needs a LOADED sequence and CS-32 needs
-- a count of twenty-three.
--
-- WHAT THE RE-RUN FOUND, AND IT IS THE POINT OF CS-I-54a
--
-- CS-I-54a says a pass on an empty script pane is not evidence for a
-- populated one. It was right, and the reason is worse than a stale
-- fixture: THE COCKPIT WAS NOT READING THE SEQUENCE TABLE AT ALL.
--
-- Pane 1 rendered body.mentor_action_sequence, a field NO source version
-- carries — zero of forty. So the Source and Script Pane had rendered an
-- empty script for every source since it was built, while 140 beats sat in
-- t3a_d1_mentor_action_sequence unread. The thirteen sequences loaded
-- under CORR-004 were never displayed either; nothing had ever shown a
-- script, so nothing looked broken.
--
-- The same empty array drives the beat dropdown on the variance control,
-- so "record an administration variance at this beat" had no beat to
-- record against. A mentor could not have reported a departure from the
-- script at the beat it happened.
--
-- FIXED BY READING THE TABLE, NOT BY WRITING THE BODY. The sequence must
-- not go into the version body: the body is immutable once approved, so
-- loading a script into it would mean superseding the version, which would
-- void its REC-07 approval — the exact trap Section 4A was just spent
-- undoing. The cockpit now reads t3a_d1_mentor_action_sequence by source
-- identifier. The action type is rendered alongside the beat code, because
-- a script that shows the words without saying whether to say, ask or
-- pause is not a script.
--
-- ONE MORE THING FOR THE FOUNDERS, found next to it and NOT changed.
-- fallbackStubBody() in the cockpit carries an INVENTED four-step script
-- — READ, ASK, PAUSE, SAY — and an invented question with invented
-- options, shown when no approved source loads. It is guarded by a
-- CONTENT_UNLOADED refusal banner and did not fire in any test here, so it
-- is left alone rather than changed on my own initiative. But a surface
-- whose fallback is fabricated content is a surface that can render
-- something no one approved, and it is now written down rather than
-- noticed and forgotten.
--
-- A SECOND BINDING QUALIFIER IS UNDEFINED. "final" appears at B7 on
-- SRC-D1-S2-005 and SRC-D1-S2-010, written "C8 final", and no instruction
-- defines it. It is stored in qualifier_as_written, given no behavior, and
-- put to the founder. Four binding rows carry it.
-- =====================================================================

set search_path = public;

DO $verify$
DECLARE
  v_total int; v_demo int; v_s1 int; v_s2 int; v_s3 int; v_s4 int;
  v_beats int; v_bind int; v_bare int; v_qcode int;
BEGIN
  SELECT count(DISTINCT source_identifier) INTO v_total FROM public.t3a_d1_mentor_action_sequence;
  SELECT count(DISTINCT source_identifier) INTO v_demo FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier LIKE 'DEMO-%';
  SELECT count(DISTINCT source_identifier) INTO v_s1 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S1-';
  SELECT count(DISTINCT source_identifier) INTO v_s2 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S2-';
  SELECT count(DISTINCT source_identifier) INTO v_s3 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S3-';
  SELECT count(DISTINCT source_identifier) INTO v_s4 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S4-';

  -- CS-57 / CS-32 as restated by CS-I-56a. Itemized, because a bare total
  -- would pass on the wrong mix.
  IF v_total <> 23 OR v_demo <> 3 OR v_s1 <> 10 OR v_s2 <> 10 THEN
    RAISE EXCEPTION 'CS_32_FAILED: expected 23 sequences as 3 demonstration, 10 Stage 1, 10 Stage 2; found total=% demo=% s1=% s2=%',
      v_total, v_demo, v_s1, v_s2;
  END IF;

  -- CS-55 / CS-I-57 / CS-I-58
  IF v_s3 <> 0 OR v_s4 <> 0 THEN
    RAISE EXCEPTION 'CS_55_FAILED: Stage 3 and Stage 4 PRODUCTION must carry no sequence; found s3=% s4=%', v_s3, v_s4;
  END IF;

  -- CS-60
  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier = 'DEMO-D1-S4-001') THEN
    RAISE EXCEPTION 'CS_60_FAILED: DEMO-D1-S4-001 is not loaded';
  END IF;

  -- CS-38
  SELECT count(*) INTO v_beats FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S2-';
  IF v_beats <> 70 THEN
    RAISE EXCEPTION 'CS_38_FAILED: expected 70 Stage 2 beats, found %', v_beats;
  END IF;

  -- CS-48
  SELECT count(*) INTO v_bare FROM public.t3a_d1_beat_capture_binding WHERE capture_set_code IN ('C4','C5','C8');
  SELECT count(*) INTO v_bind FROM public.t3a_d1_beat_capture_binding;
  IF v_bare <> 0 THEN
    RAISE EXCEPTION 'CS_48_FAILED: % bindings still name a superseded label', v_bare;
  END IF;

  -- CS-49
  SELECT count(*) INTO v_qcode FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier ~ '^SRC-D1-S2-' AND content_verbatim ~ 'Q-D1-';
  IF v_qcode <> 0 THEN
    RAISE EXCEPTION 'CS_49_FAILED: % beat verbatims name a question code', v_qcode;
  END IF;

  -- CS-44 / CS-45 / CS-46 / CS-47
  IF (SELECT string_agg(capture_set_code, ',' ORDER BY capture_set_code)
        FROM public.t3a_d1_beat_capture_binding
       WHERE source_identifier = 'SRC-D1-S2-001' AND beat_code = 'B3') <> 'C1,C2,C3,C4a,C4b' THEN
    RAISE EXCEPTION 'CS_44_FAILED';
  END IF;

  IF (SELECT string_agg(capture_set_code, ',' ORDER BY capture_set_code)
        FROM public.t3a_d1_beat_capture_binding
       WHERE source_identifier = 'SRC-D1-S2-001' AND beat_code = 'B5') <> 'C5a,C5b1,C5b2,C5c,C6' THEN
    RAISE EXCEPTION 'CS_45_FAILED';
  END IF;

  IF (SELECT string_agg(capture_set_code, ',' ORDER BY capture_set_code)
        FROM public.t3a_d1_beat_capture_binding
       WHERE source_identifier = 'SRC-D1-S2-005' AND beat_code = 'B4' AND revisable) <> 'C3,C8a,C8b' THEN
    RAISE EXCEPTION 'CS_47_FAILED: SRC-D1-S2-005 B4 must revise C3, C8a AND C8b, not C8 alone';
  END IF;

  -- CS-52
  IF (SELECT count(*) FROM public.t3a_content_object co
        JOIN public.t3a_d1_content_version cv
          ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
       WHERE co.family = 'source'::public.t3a_content_family
         AND NOT public.t3a_d1_source_version_approved(cv.content_version_id)) <> 0 THEN
    RAISE EXCEPTION 'CS_52_FAILED: a source is unservable after Section 6';
  END IF;

  RAISE NOTICE 'Section 6 verified: % sequences, % Stage 2 beats, % bindings', v_total, v_beats, v_bind;
END;
$verify$;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-12', 'pass',
   'Section 6 executed in the three phases Issue 3 sets, in order. Phase 1 redefined AC-13, CS-21 '
   || 'and CS-32 without running them; Phase 2 ran the Stage 2 parse; Phase 3 ran the suite. '
   || 'CS-38: ten of ten Stage 2 sources yield exactly seven beats B1 to B7 in order, 70 beats. '
   || 'CS-49: the parse stops at the Question applicability boundary — zero beat verbatims name a '
   || 'question code, so the two applicability rows beginning "B5 Q-D1-" were not read as beats and '
   || 'no source yielded nine. CS-50: SRC-D1-S2-010 parses to B1 to B7; its start marker is split '
   || 'across a soft wrap and is found only after whitespace normalization. CS-48: 156 bindings, '
   || 'zero bare C4, C5 or C8 — the FK to t3a_d1_capture_set makes CS-I-51c structural rather than '
   || 'checked. CS-44, CS-45, CS-46 and CS-47 all exact, including SRC-D1-S2-005 B4 revising C3, '
   || 'C8a and C8b rather than C8 alone. CS-42: source-sheet values are byte-identical before and '
   || 'after, asserted in the same transaction as the parse. CS-55: zero Stage 3 and zero Stage 4 '
   || 'production sources parsed. CS-60: DEMO-D1-S4-001 still loaded. CS-57 and CS-32: twenty-three '
   || 'sequences as three demonstration, ten Stage 1, ten Stage 2. CS-53: AC-13 on its new fixture '
   || 'refuses BEAT_TIMESTAMP_MISSING with the sequence loaded and B3 resolved. CS-54: CS-21 on its '
   || 'new fixture refuses on SRC-D1-S3-010, whose enquiry point is stated in words. CS-59: the '
   || 'full Cockpit browser set re-run green against a loaded Stage 2 source. CS-52: the register '
   || 'holds and no source is unservable. CS-56 and CS-61 recorded in data.',
   '20261053000000', 'scripts/extract-d1-stage2-scripts.mjs, SQL proof, Playwright', now(),
   'CS-I-54a WAS RIGHT, AND FOR A WORSE REASON THAN A STALE FIXTURE. The cockpit was not reading '
   || 'the sequence table at all. Pane 1 rendered body.mentor_action_sequence, a field ZERO of the '
   || 'forty source versions carry, so the Source and Script Pane had shown an empty script for '
   || 'every source since it was built while 140 beats sat in t3a_d1_mentor_action_sequence unread. '
   || 'The thirteen sequences loaded under CORR-004 were never displayed either, so nothing looked '
   || 'broken. The same empty array drives the beat dropdown on the variance control, so a mentor '
   || 'could not record a departure from the script at the beat it happened. Fixed by reading the '
   || 'table, NOT by writing the body: the body is immutable once approved, so loading a script '
   || 'into it would mean superseding the version and voiding its approval — the trap Section 4A '
   || 'was just spent undoing. The action type is now rendered with the beat code. Without CS-I-54a '
   || 'this would have shipped as fourteen green tests over a pane that never worked. '
   || 'AN UNDEFINED BINDING QUALIFIER, FOR THE FOUNDER. Section 6.1 defines "update". The scripts '
   || 'also use "final", at B7 on SRC-D1-S2-005 and SRC-D1-S2-010, written "C8 final". Nothing '
   || 'defines it. It is parsed rather than ignored, because ignoring it would have left the words '
   || '"C8 final" inside content_verbatim — a binding inside an approved spoken line. It is stored '
   || 'in qualifier_as_written across four rows and given NO behavior: not treated as "update", so '
   || 'it grants no revision, and under CS-I-51d C8 is already bound at B2 without "update", so it '
   || 'is one determination that holds from B2 and re-binding at B7 changes nothing served. What '
   || '"final" means is for Tony to state. The parser''s qualifier list is closed, so any other '
   || 'trailing word refuses the source by name rather than truncating an approved line. '
   || 'ALSO NOTED AND DELIBERATELY NOT CHANGED: fallbackStubBody() in the cockpit carries an '
   || 'invented four-step script and an invented question with invented options, rendered when no '
   || 'approved source loads. It is guarded by a CONTENT_UNLOADED banner and fired in no test here, '
   || 'so it was left alone rather than altered on my own initiative — but a surface whose fallback '
   || 'is fabricated content can render something nobody approved. '
   || 'TWO REGISTERS DID NOT EXIST AS DATA. CS-I-59 says amend the CS-I-42 conflict entry and do '
   || 'not delete it; CS-I-60 says update the AC-12 per-Stage record. Both lived as prose inside the '
   || 'conflict_note of an evidence row, where the only way to amend one is to rewrite a historical '
   || 'record. They are tables now, scoped per Stage, so an amendment supersedes rather than '
   || 'overwrites. The same gap held CS-21 and CS-32 in Phase 1. '
   || 'STILL OPEN ON D1: Stage 4 production loading, deferred to REC-12 and needing a ROUND-aware '
   || 'parse rule. The Stage 2 parser refuses a ROUND shape by name rather than finding six beats '
   || 'and reporting a count error that hides the cause.');
