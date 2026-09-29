-- =====================================================================
-- CLOSE-001 CL-16 — the ten Stage 4 approvals are withdrawn
--
-- AUTHORITY. CL-16 instructs the withdrawal and the founder authorized it
-- by signature at Section 6A. It was held back at the account holder's
-- explicit instruction ("don't withdraw yet, tell me what you find"), the
-- findings were reported, and the account holder has now instructed that
-- everything be closed. Both permissions are therefore in hand.
--
-- WHY, IN ONE SENTENCE. T3A-D1-EXEC-001 states that NO Stage 4 source may
-- be submitted for REC-07 approval until it has a completed seven-part
-- impact assessment, and that the hold sits BEFORE review rather than
-- merely before activation. No assessment exists for any of the ten.
--
-- WHAT THESE APPROVALS ARE AND ARE NOT. They are ATTRIBUTABLE: every one
-- traces to Ekosse Mofoke <tony.3rdacademy@gmail.com>, the only holder in
-- t3a_oversight_holder, standing live and unrevoked, through the governed
-- route, with the CORR-003 identity assertion passing. Nothing about them
-- resembles the unaccounted SRC-D1-S3-010 row. What is missing is the
-- PRECONDITION, not the actor — and that is why this is a withdrawal
-- rather than an audit finding alone.
--
-- THIS MOVES THE NUMBERS THE WRONG WAY, AND THAT IS CORRECT. Servable
-- sources go from forty to thirty. Stage 4 servable goes to zero. A
-- reader looking only for a rising number will read this as a regression.
-- It is the opposite: ten sources were servable on approvals that the
-- governing document says could not properly have been sought. Leaving
-- them standing to keep a count at forty would be the precise failure this
-- whole build has been correcting — a control that measures the wrong
-- thing and reports success.
--
-- NOTHING IS DELETED. The approval rows stay. Each source's history now
-- reads approved, then withdrawn, with the reason. Under Section 4A a
-- version may hold several approval rows, and standing is the latest — so
-- the withdrawal is a row, never an erasure, and the record continues to
-- show that the approval was once given and by whom.
--
-- CL-18, CL-19 and CL-20 restate three tests whose expected values this
-- changes. They are restated here from the ACTUAL outcome rather than from
-- the instrument's forecast, because the instrument said "thirty if all ten
-- are withdrawn" and the build's job is to report what happened.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The withdrawals
-- ---------------------------------------------------------------------

DO $wd$
DECLARE
  r record;
  v_n int := 0;
BEGIN
  FOR r IN
    SELECT h.source_id, h.source_version_id, h.approved_by, h.source_identifier
      FROM public.t3a_d1_source_approval_history h
     WHERE h.source_identifier ~ '^SRC-D1-S4-0'
       AND h.is_standing
       AND h.version_is_current
       AND h.status = 'approved'
     ORDER BY h.source_identifier
  LOOP
    -- Belt as well as braces: never withdraw one that has an assessment.
    -- None do, but a later run of this file must not assume that.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 't3a_d1_stage4_impact_assessment')
    THEN
      RAISE EXCEPTION 'CL_16_HALTED: an impact-assessment table now exists. Check each source against it before withdrawing — CL-15 says an approval with an assessment behind it STANDS.';
    END IF;

    INSERT INTO public.t3a_d1_source_approval
      (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (r.source_id, r.source_version_id, 'withdrawn', r.approved_by, now());

    v_n := v_n + 1;
  END LOOP;

  IF v_n <> 10 THEN
    RAISE EXCEPTION 'CL_16_WRONG_COUNT: expected ten Stage 4 withdrawals, wrote %', v_n;
  END IF;

  RAISE NOTICE 'CL-16: % Stage 4 approvals withdrawn. No row deleted.', v_n;
END;
$wd$;

-- ---------------------------------------------------------------------
-- 2. CL-18 / CL-19 / CL-20 — the three restated tests, from the outcome
-- ---------------------------------------------------------------------

DO $restate$
DECLARE
  v_servable   int;
  v_unservable int;
  v_raw        int;
  v_standing   int;
  v_carried    int;
  v_badcarry   int;
  v_s4unserv   int;
BEGIN
  SELECT count(*) FILTER (WHERE public.t3a_d1_source_version_approved(cv.content_version_id)),
         count(*) FILTER (WHERE NOT public.t3a_d1_source_version_approved(cv.content_version_id))
    INTO v_servable, v_unservable
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.family = 'source'::public.t3a_content_family;

  -- CL-18. Every unservable source must be a Stage 4 source withdrawn here.
  SELECT count(*) INTO v_s4unserv
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier ~ '^SRC-D1-S4-0'
     AND NOT public.t3a_d1_source_version_approved(cv.content_version_id);

  IF v_servable <> 30 OR v_unservable <> 10 OR v_s4unserv <> 10 THEN
    RAISE EXCEPTION 'CL_18_FAILED: expected 30 servable, 10 unservable and all ten unservable being Stage 4; found % servable, % unservable, % Stage 4 unservable',
      v_servable, v_unservable, v_s4unserv;
  END IF;

  -- CL-19. The raw approved count is UNCHANGED, because a withdrawal adds
  -- a row and removes none. This is the whole point of Section 4A: the raw
  -- count and the standing count now differ by design.
  SELECT count(*) INTO v_raw
    FROM public.t3a_d1_source_approval a
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = a.source_version_id AND cv.superseded_by IS NULL
   WHERE a.status = 'approved';

  SELECT count(*) INTO v_standing
    FROM public.t3a_d1_source_approval_standing s
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = s.source_version_id AND cv.superseded_by IS NULL
   WHERE s.status = 'approved';

  IF v_raw <> 43 OR v_standing <> 30 THEN
    RAISE EXCEPTION 'CL_19_FAILED: expected 43 raw approved rows (unchanged) and 30 standing; found % and %',
      v_raw, v_standing;
  END IF;

  -- CL-20. RA-T8R's first two values are unchanged at zero. The third —
  -- carried standing approvals — falls by however many of the ten were
  -- carry-forwards. All ten were, so it falls from 37 to 27.
  SELECT count(*) INTO v_badcarry
    FROM public.t3a_d1_source_approval_history h
   WHERE h.is_standing AND h.version_is_current
     AND h.was_carried_forward AND h.identity_assertion_passed IS NOT TRUE;

  SELECT count(*) INTO v_carried
    FROM public.t3a_d1_source_approval_history h
   WHERE h.is_standing AND h.version_is_current
     AND h.status = 'approved' AND h.was_carried_forward;

  IF v_badcarry <> 0 OR v_carried <> 27 THEN
    RAISE EXCEPTION 'CL_20_FAILED: expected carried-on-failed-assertion 0 and carried standing approvals 27; found % and %',
      v_badcarry, v_carried;
  END IF;

  RAISE NOTICE 'CL-18/19/20 restated from outcome: servable 30, unservable 10 (all Stage 4), raw 43, standing 30, RA-T8R 0/0/27';
END;
$restate$;

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('AX-T9-R', 'T3A-D1-EXEC-CLOSE-001 CL-18',
   'Servable count after the Stage 4 withdrawals',
   'Current versions of all forty sources.',
   'THIRTY servable and TEN unservable, and every unservable source is a Stage 4 production source '
   || 'withdrawn under CL-16.',
   'CL-18', 'Forty servable and zero unservable (AX-T9 as written before CLOSE-001).',
   'Ten Stage 4 approvals were withdrawn because no seven-part impact assessment exists and the '
   || 'Execution Edition places that hold before review. The count falling is the correct outcome, '
   || 'not a regression.'),

  ('AX-T7-R', 'T3A-D1-EXEC-CLOSE-001 CL-19',
   'Raw approved rows versus standing approvals, current versions',
   'Current versions of all forty sources.',
   'FORTY-THREE raw approved rows — UNCHANGED, because a withdrawal adds a row and removes none — '
   || 'and THIRTY standing approvals.',
   'CL-19', 'Forty-three raw and forty standing.',
   'The withdrawals change standing without changing the raw count, which is exactly the property '
   || 'Section 4A established and the reason a raw count of approved rows is not a count of '
   || 'approvals.'),

  ('RA-T8R-R', 'T3A-D1-EXEC-CLOSE-001 CL-20',
   'RA-T8R after the Stage 4 withdrawals',
   'Current versions, counted by standing.',
   'ZERO carried approvals resting on a failed identity assertion, ZERO failing sources that are '
   || 'nonetheless servable, and TWENTY-SEVEN carried standing approvals — down from thirty-seven '
   || 'because all ten withdrawn Stage 4 approvals were carry-forwards.',
   'CL-20', 'Zero, zero, thirty-seven.',
   'Established from CL-14''s provenance trace: all ten Stage 4 approvals were CORR-003 '
   || 'carry-forwards, so withdrawing them reduces the carried count by exactly ten.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  required_result = EXCLUDED.required_result,
  restated_by     = EXCLUDED.restated_by,
  why_restated    = EXCLUDED.why_restated;

-- ---------------------------------------------------------------------
-- 3. The register and the lift conditions, brought into line
-- ---------------------------------------------------------------------

UPDATE public.t3a_d1_stage_claim
   SET status = 'not_claimable',
       reason = 'Sequences loaded, and every Stage 4 production approval WITHDRAWN under CL-16 for '
             || 'want of the seven-part impact assessment. Not claimable until each source has a '
             || 'completed assessment, a founder approval given after it, and the Stage 4 activation '
             || 'decision is recorded.',
       set_by = 'CL-16'
 WHERE scope = 'Stage 4 production';

UPDATE public.t3a_d1_lift_condition
   SET satisfied_by = 'Approvals withdrawn under CL-16 by migration 20261062000000, so no Stage 4 '
                   || 'source is servable on an unassessed approval. The assessments themselves are '
                   || 'still outstanding.'
 WHERE lift_condition_id = 'S4-PROD-LIFT-1';

UPDATE public.t3a_d1_build_conflict_register
   SET note = note || ' '
     || 'CL-16 EXECUTED by migration 20261062000000: all ten Stage 4 approvals withdrawn, no row '
     || 'deleted, each history now reading approved then withdrawn. Servable sources fall from forty '
     || 'to thirty and Stage 4 servable is zero, which is the correct state — those ten were servable '
     || 'on approvals the Execution Edition says could not properly have been sought.'
 WHERE entry_id = 'CS-I-42/stage-4';
