-- =====================================================================
-- T3A-D1-EXEC-CLOSE-001 CL-49 — five register tests restated
--
-- Five of the thirty AC tests assume the live video is inside the Cockpit.
-- After Section 2A it is in Google Meet, in another window, so all five
-- would fail by design. The instrument restates them and REMOVES NONE:
-- the register is exactly thirty tests and removing one would break the
-- count that CS-52 and the register reading both depend on.
--
-- THE REGISTER IS THE ISSUED SPECIFICATION, SO CHANGING IT NEEDS A
-- SIGNATURE, AND HAS ONE. t3a_d1_acceptance_test carries no outcome column
-- by design — a passing test can never be recorded by editing the
-- specification of the test. What is edited here is the requirement, on the
-- founder's signature at Section 6A, and the previous wording is preserved
-- in t3a_d1_correction_test so the change is auditable. A restatement that
-- erases what the test used to require reads as though it had always said
-- this.
--
-- AC-31 IS THE ONE WORTH READING TWICE. As issued it tested the mentor's
-- own live view becoming unavailable. There is no mentor live view any
-- more, so the restated test asserts the ABSENCE — no mentor live view and
-- no placeholder stream — and routes the interruption case to CL-44. A
-- test whose subject has been removed either becomes a test that the
-- subject is gone, or it becomes nothing. It is not removed.
-- =====================================================================

set search_path = public;

-- Preserve what each required before, then restate it.
INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
SELECT t.test_id || '-PRE-CL49',
       'T3A-D1-EXEC-001 (as issued)',
       t.test_name,
       'As issued, before CLOSE-001 Section 2A moved live video to Google Meet.',
       t.required_result,
       'CL-49',
       t.required_result,
       'The test assumed the live video was inside the Cockpit. Section 2A removed the Participant '
       || 'and Mentor Live View regions, so this wording could no longer pass. Restated, not removed: '
       || 'the register is exactly thirty tests.'
  FROM public.t3a_d1_acceptance_test t
 WHERE t.test_id IN ('AC-01', 'AC-23', 'AC-24', 'AC-26', 'AC-31')
ON CONFLICT (correction_test_id) DO NOTHING;

UPDATE public.t3a_d1_acceptance_test SET required_result =
  'All FIVE Cockpit regions are visible simultaneously in the Cockpit window: Pane 1 Source and '
  || 'Script, Pane 2 Determination Capture, the persistent header, the Session Control Strip, and the '
  || 'Live Session panel. No step overlays any of them. The 1280x800 minimum applies to the Cockpit '
  || 'window; below it, Stage 2 and Stage 4 live capture refuses.'
 WHERE test_id = 'AC-01';

UPDATE public.t3a_d1_acceptance_test SET required_result =
  'A mentor-reported live video interruption follows CL-44: the pause route is taken, the event is '
  || 'written, source advancement is blocked until restoration is recorded, and resumption is recorded '
  || 'as an administration variance. It is a technical or platform failure under REC-10 — no attempt '
  || 'consumed, no cooldown.'
 WHERE test_id = 'AC-23';

UPDATE public.t3a_d1_acceptance_test SET required_result =
  'Session-start attestations A1 and A2 are recorded with their actor and time; a recording indicator '
  || 'appearing mid-session ends the session without commit under CL-45; and the platform persists no '
  || 'media. Where the Workspace configuration at CL-40 is not confirmed applied, the session record '
  || 'says E3 rests on attestation alone.'
 WHERE test_id = 'AC-24';

UPDATE public.t3a_d1_acceptance_test SET required_result =
  'The mentor completes a synthetic Stage 2 interaction using ONLY the Cockpit and the Meet window — '
  || 'no other document, notes tool, timing tool or question form.'
 WHERE test_id = 'AC-26';

UPDATE public.t3a_d1_acceptance_test SET required_result =
  'The Cockpit shows NO mentor live view and NO placeholder stream. An interruption of the mentor''s '
  || 'own video in Meet is handled under CL-44. Restated, not removed — the register holds exactly '
  || 'thirty tests.'
 WHERE test_id = 'AC-31';

DO $verify$
DECLARE v_total int; v_kept int;
BEGIN
  SELECT count(*) INTO v_total FROM public.t3a_d1_acceptance_test;
  IF v_total <> 30 THEN
    RAISE EXCEPTION 'CL_49_FAILED: the register must hold exactly thirty tests, found %. None may be removed.', v_total;
  END IF;

  SELECT count(*) INTO v_kept FROM public.t3a_d1_correction_test
   WHERE correction_test_id LIKE '%-PRE-CL49';
  IF v_kept <> 5 THEN
    RAISE EXCEPTION 'CL_49_FAILED: expected the five previous requirements preserved, found %', v_kept;
  END IF;

  -- None of the five may still describe a live view inside the Cockpit.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_acceptance_test
              WHERE test_id IN ('AC-01', 'AC-23', 'AC-24', 'AC-26', 'AC-31')
                AND required_result ~* 'live view'
                AND required_result !~* 'NO mentor live view') THEN
    RAISE EXCEPTION 'CL_49_FAILED: a restated test still requires a live view inside the Cockpit';
  END IF;
END;
$verify$;
