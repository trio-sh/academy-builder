-- =====================================================================
-- Stage 1 provenance: the founder has acknowledged the gap, and the
-- "old library" it was expected to come from cannot supply it
--
-- WHY THIS IS RECORDED. The close-out reported that no Stage 1 AI
-- administration provenance was ever issued. The founder has now answered:
-- the script he sent did not contain the Stage 1 content, he had assumed it
-- would be pulled from the old library, and he is preparing it.
--
-- That closes the question of ownership, which was the open part. It does
-- NOT close the gap, and the reason the expectation failed is worth
-- recording rather than leaving as a misunderstanding that could recur.
--
-- THE OLD LIBRARY EXISTS AND MUST NOT BE USED FOR THIS. It is
-- src/data/interactiveSkillAssessment.ts with
-- src/components/assessment/InteractiveSkillAssessment.tsx. Measured, not
-- recalled:
--
--   · It SCORES responses. `score: 80`, `score: 30`, `ethicalScore: 90`,
--     `practicalScore: 70`.
--   · It has CORRECT ANSWERS. `correctIndex` on multiple items.
--   · It RANKS response quality as excellent / good / acceptable / poor.
--   · Its own copy says "Prioritization Tests — Rank tasks under deadline
--     pressure".
--
-- Any one of those is disqualifying. §7 and §16.3 forbid a scalar that
-- ranks or grades, and the Employer Desk states the same refusal on its
-- face: no scores, no rankings, no recommendations.
--
-- IT IS ALREADY OUTSIDE THE EVIDENCE CHAIN, WHICH IS WHY NOBODY NOTICED.
-- The component writes to candidate_profiles, mentor_assignments,
-- mentor_assigned_dimensions and observation_loops, and to no table whose
-- name begins t3a_. Every one of those four is listed in
-- docs/legacy-schema-mapping.md as superseded or retired. So the library
-- has been sitting beside the build, not inside it, and pulling Stage 1
-- prompt text out of it would have carried a scoring instrument across
-- that boundary in one step.
--
-- ONE DETAIL THAT LOOKS LIKE A FIX AND IS NOT. The library's own
-- introduction reads "No scores or feedback are shown during the session".
-- The scores are still in the data; only the display was changed. A
-- restriction asserted by a screen is not a restriction, which is the same
-- lesson as CL-10 and as the refusals proved by requesting the route
-- directly rather than by observing that the interface hides a control.
--
-- ALSO RECORDED, BECAUSE IT NARROWS THE FOUNDER'S WORK: THE TEN STAGE 1
-- SITUATIONS ARE ALREADY LOADED AND APPROVED AND DO NOT NEED RE-AUTHORING.
-- Each sheet carries the situation in full — workplace_demand,
-- information_made_available, information_withheld, enquiry_point,
-- stated_standard, min_seconds and max_seconds, and the rest. What no
-- sheet carries is any reference to the machine: there is no
-- model_reference key and no prompt_text_ref key on any of the ten. So
-- what is missing is the administering layer, not the assessment content.
-- =====================================================================

set search_path = public;

UPDATE public.t3a_d1_build_conflict_register
   SET blocked_on = 'Founder — ACKNOWLEDGED and in preparation. He has confirmed the script he sent did '
                 || 'not contain the Stage 1 content and that he is preparing it. Separately: the test '
                 || 'accounts item is CLOSED (S1-RUN-LIFT-2).',
       note = note || ' '
           || 'FOUNDER RESPONSE RECORDED: the Stage 1 content was absent from the issued script because '
           || 'it was expected to come from the old library, and he is preparing it now. THE OLD '
           || 'LIBRARY CANNOT SUPPLY IT. src/data/interactiveSkillAssessment.ts scores responses '
           || '(score, ethicalScore, practicalScore), marks correct answers (correctIndex) and ranks '
           || 'response quality excellent/good/acceptable/poor — each disqualifying on its own under '
           || 'the no-scores-no-rankings rule. It writes only to candidate_profiles, '
           || 'mentor_assignments, mentor_assigned_dimensions and observation_loops, all listed as '
           || 'superseded or retired, and to no t3a_ table, so it sits beside the evidence chain rather '
           || 'than in it; drawing Stage 1 prompt text from it would carry a scoring instrument across '
           || 'that boundary. Its own text claims no scores are shown during the session, which changed '
           || 'the display and not the data. '
           || 'NARROWING THE WORK: the ten Stage 1 SITUATIONS are loaded and approved and need no '
           || 're-authoring. No S1 sheet holds a model_reference or prompt_text_ref key at all, so what '
           || 'is absent is the administering machine, not the assessment content.'
 WHERE entry_id = 'CLOSE-001/E8-E9/s1-provenance';

UPDATE public.t3a_d1_lift_condition
   SET condition_text = condition_text
         || ' FOUNDER HAS ACKNOWLEDGED AND IS PREPARING THIS. It may NOT be satisfied from '
         || 'src/data/interactiveSkillAssessment.ts: that library scores, marks correct answers and '
         || 'ranks response quality, and is outside the evidence chain by design.'
 WHERE lift_condition_id = 'S1-RUN-LIFT-1';

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('LEGACY/interactive-skill-assessment-scores', 'Stage 1 provenance enquiry',
   'The legacy interactive skill assessment library',
   'retired concept still present in source — a scoring instrument',
   'open',
   'Developer, once its last reader is removed. Not urgent and not blocking D1; recorded so it is '
   || 'never mistaken for a source of issued Stage 1 content.',
   'src/data/interactiveSkillAssessment.ts (914 lines) holds per-response scores, correct answers and '
   || 'excellent/good/acceptable/poor quality rankings. docs/legacy-schema-mapping.md already retires '
   || 'candidate_self_assessments without replacement for the same reason — it "ranked the participant '
   || 'on the same instrument the register carries". The library is read by '
   || 'InteractiveSkillAssessment.tsx, aiResponseAnalysis.ts and CandidateDashboard.tsx, and writes '
   || 'only to legacy tables. It was nearly drawn on as the source of Stage 1 provenance, which is the '
   || 'specific risk this entry exists to prevent recurring. Its own copy saying no scores are shown '
   || 'during the session addressed the display only.')
ON CONFLICT (entry_id) DO UPDATE SET
  status = EXCLUDED.status, blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
