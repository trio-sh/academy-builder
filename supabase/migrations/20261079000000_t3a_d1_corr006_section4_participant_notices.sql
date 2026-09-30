-- =====================================================================
-- CORR-006 Section 4, CX-13 — the participant-facing notices, read from
-- the annexes rather than written in code
--
-- CX-13: "Build the Stop control and the persistent support line on every
-- Stage 1 screen, rendering their wording from Annexes A and C, never from
-- code."
--
-- Annex A's opening, closing and support line are already fields of the
-- loaded T3A-S1-DELIVERY-SPEC-001 and the engine returns them. Two more
-- pieces of participant-facing wording are NOT fields of anything:
--
--   AC-B4's timing notice, which lives inside Annex B's rules table as
--     show once: *"About five minutes remain."*
--
--   Annex C's support information, which IS a field, and is returned here
--     too so a screen has one place to ask.
--
-- WHY THESE ARE EXTRACTED AT READ TIME RATHER THAN ADDED TO THE LOADED
-- BODIES. A content version body is immutable — CONTENT_HISTORY_OVERWRITE
-- refuses an UPDATE — so adding a field would mean superseding Annex B with
-- a version 2 that differs from what the founder issued only in how the
-- build finds things in it. Slicing the sentence out of the stored verbatim
-- keeps one issued version and still satisfies "never from code": the words
-- come from the annex every time they are read, and if the annex does not
-- contain them this refuses rather than supplying its own.
--
-- The engine's function list is deliberately NOT extended with this, so the
-- CX-08 code hash is unchanged and no run's provenance goes stale.
-- =====================================================================

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_participant_notices()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_annex_b text;
  v_annex_c jsonb;
  v_annex_a jsonb;
  v_five    text;
  v_missing text := '';
BEGIN
  SELECT cv.body ->> 'verbatim' INTO v_annex_b
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'T3A-S1-ADMIN-CONFIG-001';

  SELECT cv.body INTO v_annex_c
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'T3A-PARTICIPANT-SAFETY-001';

  SELECT cv.body INTO v_annex_a
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'T3A-S1-DELIVERY-SPEC-001';

  IF v_annex_a IS NULL THEN v_missing := v_missing || 'T3A-S1-DELIVERY-SPEC-001 '; END IF;
  IF v_annex_b IS NULL THEN v_missing := v_missing || 'T3A-S1-ADMIN-CONFIG-001 '; END IF;
  IF v_annex_c IS NULL THEN v_missing := v_missing || 'T3A-PARTICIPANT-SAFETY-001 '; END IF;

  IF v_missing <> '' THEN
    RETURN jsonb_build_object('available', false,
      'refusal_code', 'ANNEX_NOT_LOADED',
      'missing', btrim(v_missing),
      'remedy', 'CX-13 renders this wording from the annexes and never from code. With an annex absent there is nothing to render, and a screen must show no Stage 1 content at all.');
  END IF;

  -- AC-B4, sliced from the rules table: show once: *"About five minutes remain."*
  SELECT m[1] INTO v_five
    FROM regexp_matches(v_annex_b, 'show once: \*"([^"]+)"\*', 'n') AS x(m);

  IF v_five IS NULL THEN
    RETURN jsonb_build_object('available', false,
      'refusal_code', 'AC_B4_NOTICE_NOT_FOUND_IN_ANNEX_B',
      'remedy', 'The timing notice is quoted inside AC-B4. If its wording moved, this must be taught where to find it rather than given a copy of its own.');
  END IF;

  RETURN jsonb_build_object(
    'available', true,

    -- AC-B4. Shown ONCE when five minutes remain. No running clock (AC-B4),
    -- and no bar, percentage or count of parts remaining (DS-4).
    'five_minute_notice', jsonb_build_object(
      'from', 'T3A-S1-ADMIN-CONFIG-001 (AC-B4)',
      'text', v_five,
      'show_once', true,
      'seconds_remaining_at_which_to_show', 300),

    -- Annex A. On every screen, beside the Stop control.
    'support_line', jsonb_build_object(
      'from', 'T3A-S1-DELIVERY-SPEC-001 (A.3)',
      'text', v_annex_a ->> 'support_line'),

    -- Annex C.3. Shown before every session and available throughout.
    'support_information', jsonb_build_object(
      'from', 'T3A-PARTICIPANT-SAFETY-001 (C.3)',
      'text', v_annex_c ->> 'support_information'),

    -- CX-13 / C4b. The control is always available. Its LABEL is the word
    -- the annex uses for it — Annex A's opening tells the participant to
    -- "use Stop at the top of the screen" — and the label is returned only
    -- where that phrase is actually there, so the screen is never putting a
    -- word in the founder's mouth.
    'stop_control', jsonb_build_object(
      'from', 'T3A-S1-DELIVERY-SPEC-001 (A.3) and T3A-PARTICIPANT-SAFETY-001 (C4b)',
      'label', CASE WHEN position('use Stop at the top of the screen'
                                  in coalesce(v_annex_a ->> 'opening', '')) > 0
                    THEN 'Stop' END,
      'always_available', true,
      'stopping_does_not_use_an_attempt', true));
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_participant_notices() IS
  'CX-13. The participant-facing notices a Stage 1 screen needs, read from the loaded annexes every time rather than held in code: AC-B4''s timing notice sliced from Annex B''s rules table, Annex A''s support line, Annex C.3''s support information, and the Stop control''s label — returned only where Annex A''s opening actually tells the participant to use Stop, so the screen never puts a word in the founder''s mouth. Refuses by name where an annex is absent, because CX-13 leaves the screen nothing of its own to fall back on. Deliberately NOT part of t3a_d1_s1_engine_functions: adding it would change the CX-08 code hash and make every run''s provenance stale.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_s1_participant_notices() TO authenticated;

DO $verify$
DECLARE v jsonb := public.t3a_d1_s1_participant_notices();
BEGIN
  IF NOT (v ->> 'available')::boolean THEN
    RAISE EXCEPTION 'CX13_NOTICES_UNAVAILABLE: %', v::text;
  END IF;
  IF coalesce(v -> 'five_minute_notice' ->> 'text', '') = ''
     OR coalesce(v -> 'support_line' ->> 'text', '') = ''
     OR coalesce(v -> 'support_information' ->> 'text', '') = ''
     OR coalesce(v -> 'stop_control' ->> 'label', '') = '' THEN
    RAISE EXCEPTION 'CX13_NOTICE_EMPTY: one of the four notices came back empty — %', v::text;
  END IF;
  RAISE NOTICE 'CX-13 notices: five-minute "%", support line "%", Stop label "%".',
    v -> 'five_minute_notice' ->> 'text',
    v -> 'support_line' ->> 'text',
    v -> 'stop_control' ->> 'label';
END;
$verify$;

-- ---------------------------------------------------------------------
-- The CX-13 register entry, updated to what is now true
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-13/no-participant-screen-yet',
   'CORR-006 Section 4',
   'Whether Stage 1 can be put in front of a participant',
   'screen built; the Stop control renders but cannot yet be RECORDED',
   'open',
   'Developer: build CX-28''s welfare-stop record, which Section 8 covers. Until it exists the Stop '
   || 'control reports STOP_NOT_RECORDABLE_UNTIL_CX28_IS_BUILT rather than appearing to stop a run.',
   'SUPERSEDES THIS ENTRY''S EARLIER STATE, which said no participant screen existed. It does now: '
   || 'src/pages/dashboard/candidate/S1Delivery.tsx, at observations/stage1/:runId, reached by RUN '
   || 'rather than by source so a screen cannot be opened without the governed record that precedes '
   || 'it. '
   || 'WHAT MAKES IT CX-13 COMPLIANT AND HOW IT IS ENFORCED. Every word on it comes from the server: '
   || 'the situation and reveals byte-identical from the approved source version, the opening, '
   || 'closing and support line from Annex A, the timing notice from Annex B via '
   || 't3a_d1_s1_participant_notices, the support information from Annex C. Eleven surface contracts '
   || 'in src/test/d1-surface-contracts.test.ts assert the absences: no 9-8-8 or 9-1-1 anywhere in '
   || 'the file — Annex C holds the support information as CONFIGURATION so it can be localized '
   || 'without a code change, and a crisis number baked into a component is a wrong number nobody '
   || 'can correct without a deploy — no sentence-shaped string literal at all, no progress but the '
   || 'part number (DS-4), no feedback (DS-3), no source title or sheet (DS-5), nothing a confirmer '
   || 'does (DS-6), no back or edit control (DS-2), no maxLength (AC-B8), no running clock (AC-B4), '
   || 'no pause (AC-B6). '
   || 'THE TEST CAUGHT THE AUTHOR. The first draft of the screen ended its refusal branch with the '
   || 'sentence "This part cannot be shown." — participant-facing wording written in code, in the '
   || 'very file whose header says it holds none. The literal-prose assertion failed on it. The '
   || 'fallback is now a refusal identifier, in the same register as every other refusal the screen '
   || 'shows. '
   || 'WHAT IS STILL NOT TRUE: no run can be STARTED from any screen, because starting one is gated '
   || 'on activation and on the run-begin conditions at AC-B1, and Stop cannot be recorded until '
   || 'CX-28 exists. The screen renders a run that exists; it does not create one.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
