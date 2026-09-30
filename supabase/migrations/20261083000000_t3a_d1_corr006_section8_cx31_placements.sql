-- =====================================================================
-- CORR-006 Section 8, CX-31 — where the safety wording is shown
--
-- CX-31 has four placements:
--   (i)   the Annex C support information on the participant's pre-session
--         screen for EVERY Stage, BEFORE any Google Meet link;
--   (ii)  the same on every Stage 1 and Stage 3 screen;
--   (iii) the Stage 3 line at Annex C.4a on every Stage 3 screen;
--   (iv)  for SRC-D1-S4-007 and SRC-D1-S4-010, the Annex D theme line on
--         the pre-session screen.
--
-- MEASURED FIRST: THERE IS NO PARTICIPANT PRE-SESSION SCREEN. The only
-- surface in the build that shows a Google Meet link is the MENTOR'S
-- Cockpit. No participant-facing screen shows a Meet link, or exists to be
-- shown before one. So (i) and (iv) have no host today, and the ordering
-- "before any Google Meet link" has nothing to be before.
--
-- That is said rather than worked around. What is built is the part that can
-- be true now and the part that makes the rest true when the screen exists:
--
--   one route that returns the wording for a Stage and a source, so a screen
--   never holds any of it in code;
--   the two Annex D theme lines loaded as rows, sliced from the instrument
--   rather than retyped, with their hashes;
--   a surface contract asserting that in any participant-facing file where a
--   Meet link appears, the support information appears BEFORE it — which is
--   enforceable now and catches the screen that does not exist yet.
--
-- Annex C's support information already loads under T3A-PARTICIPANT-SAFETY-001
-- (Section 4). This adds no second copy of it: the route reads that object.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The two Annex D theme lines
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_s4_theme_line (
  source_identifier text PRIMARY KEY,
  theme_line        text NOT NULL,
  theme_line_hash   text NOT NULL,
  issued_under      text NOT NULL
);

COMMENT ON TABLE public.t3a_d1_s4_theme_line IS
  'Annex D, heightened welfare attention, and CX-31(iv). One neutral line naming the theme, shown on the pre-session screen for the two Stage 4 sources that carry heightened welfare attention. Annex D: "Each line states only what that source''s pre-brief already tells the participant," so it changes nothing about the observation. Sliced from the instrument, with a hash checked against what was stored.';

INSERT INTO public.t3a_d1_s4_theme_line
  (source_identifier, theme_line, theme_line_hash, issued_under)
VALUES
  ('SRC-D1-S4-007', 'This session involves a decision about someone you know personally.', '9cd70c4f334f6ed97a66fab8fc8b418e479a56bcb02483cdeca8dc5688a28c49',
   'T3A-D1-EXEC-CORR-006 Annex D, heightened welfare attention'),
  ('SRC-D1-S4-010', 'This session involves a safety near-miss at work. Nobody was hurt.', 'd5f60a5caea1b94edb20088ccdca9807d06866a1eb43e8c8639c6c17a78ebdc2',
   'T3A-D1-EXEC-CORR-006 Annex D, heightened welfare attention')
ON CONFLICT (source_identifier) DO UPDATE SET
  theme_line = EXCLUDED.theme_line, theme_line_hash = EXCLUDED.theme_line_hash,
  issued_under = EXCLUDED.issued_under;

ALTER TABLE public.t3a_d1_s4_theme_line ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_s4_theme_line_read ON public.t3a_d1_s4_theme_line;
CREATE POLICY t3a_d1_s4_theme_line_read
  ON public.t3a_d1_s4_theme_line FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 2. The one route a participant screen asks
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_participant_safety_notice(
  p_stage_code        public.t3a_stage_code DEFAULT NULL,
  p_source_identifier text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_c     jsonb;
  v_theme text;
BEGIN
  SELECT cv.body INTO v_c
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'T3A-PARTICIPANT-SAFETY-001';

  IF v_c IS NULL THEN
    RETURN jsonb_build_object('available', false,
      'refusal_code', 'PARTICIPANT_SAFETY_CONFIGURATION_NOT_LOADED',
      'remedy', 'Annex C loads as T3A-PARTICIPANT-SAFETY-001. With it absent a participant screen has no support information to show, and must show none of its own.');
  END IF;

  SELECT t.theme_line INTO v_theme
    FROM public.t3a_d1_s4_theme_line t
   WHERE t.source_identifier = p_source_identifier;

  RETURN jsonb_build_object(
    'available', true,
    -- C.3, shown before every session and available throughout, at every
    -- Stage. Annex C holds it as configuration so it can be localized
    -- without a code change.
    'support_information', jsonb_build_object(
      'from', 'T3A-PARTICIPANT-SAFETY-001 (C.3)',
      'text', v_c ->> 'support_information'),
    -- C4a, exactly, and ONLY at Stage 3. Stage 1 says this through Annex A's
    -- opening instead, so returning it at Stage 1 would show the participant
    -- the same assurance twice in different words.
    'stage3_line', CASE WHEN p_stage_code = 'S3' THEN jsonb_build_object(
      'from', 'T3A-PARTICIPANT-SAFETY-001 (C4a)',
      'text', v_c ->> 'stage3_pre_start_wording') END,
    -- Annex D, only for the two sources that carry heightened welfare
    -- attention.
    'theme_line', CASE WHEN v_theme IS NOT NULL THEN jsonb_build_object(
      'from', 'T3A-D1-EXEC-CORR-006 Annex D',
      'text', v_theme) END);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_participant_safety_notice(public.t3a_stage_code, text) IS
  'CX-31. Everything a participant screen must show about safety, for one Stage and one source, read from the loaded Annex C and the Annex D theme lines. A screen holds none of this wording. The Stage 3 line is returned ONLY at Stage 3: Annex A''s opening already says it at Stage 1, and returning both would show the participant the same assurance twice in different words.';

GRANT EXECUTE ON FUNCTION
  public.t3a_participant_safety_notice(public.t3a_stage_code, text)
TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Assert, from what was stored
-- ---------------------------------------------------------------------

DO $verify$
DECLARE v_n int; v_s3 jsonb; v_s1 jsonb; v_s4 jsonb;
BEGIN
  SELECT count(*) INTO v_n FROM public.t3a_d1_s4_theme_line;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'CX31_WRONG_COUNT: % theme lines, and Annex D names exactly two sources.', v_n;
  END IF;

  IF EXISTS (SELECT 1 FROM public.t3a_d1_s4_theme_line t
              WHERE encode(sha256(convert_to(t.theme_line, 'UTF8')), 'hex') <> t.theme_line_hash) THEN
    RAISE EXCEPTION 'CX31_THEME_LINE_DRIFTED: a theme line does not hash to its stored hash. This is wording a participant reads before a heightened-welfare session.';
  END IF;

  -- Every theme line must name a real Stage 4 source.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_s4_theme_line t
              WHERE NOT EXISTS (SELECT 1 FROM public.t3a_content_object co
                                 WHERE co.identifier = t.source_identifier)) THEN
    RAISE EXCEPTION 'CX31_THEME_LINE_NAMES_NO_SOURCE.';
  END IF;

  v_s3 := public.t3a_participant_safety_notice('S3', NULL);
  v_s1 := public.t3a_participant_safety_notice('S1', NULL);
  v_s4 := public.t3a_participant_safety_notice('S4', 'SRC-D1-S4-007');

  IF coalesce(v_s3 -> 'support_information' ->> 'text', '') = ''
     OR coalesce(v_s3 -> 'stage3_line' ->> 'text', '') = '' THEN
    RAISE EXCEPTION 'CX31_STAGE3_INCOMPLETE: %', v_s3::text;
  END IF;
  IF v_s1 -> 'stage3_line' <> 'null'::jsonb AND v_s1 -> 'stage3_line' IS NOT NULL THEN
    RAISE EXCEPTION 'CX31_STAGE3_LINE_LEAKED_TO_STAGE_1: C4a''s Stage 3 wording must not be returned at Stage 1, which says it through Annex A''s opening.';
  END IF;
  IF coalesce(v_s4 -> 'theme_line' ->> 'text', '') = '' THEN
    RAISE EXCEPTION 'CX31_THEME_LINE_NOT_RETURNED for SRC-D1-S4-007.';
  END IF;
  IF (public.t3a_participant_safety_notice('S4', 'SRC-D1-S4-001') -> 'theme_line') IS NOT NULL
     AND (public.t3a_participant_safety_notice('S4', 'SRC-D1-S4-001') -> 'theme_line') <> 'null'::jsonb THEN
    RAISE EXCEPTION 'CX31_THEME_LINE_ON_THE_WRONG_SOURCE: only the two sources Annex D names carry one.';
  END IF;

  RAISE NOTICE 'CX-31: two theme lines, hashed and matching; the Stage 3 line returns at S3 and not at S1; the theme line returns for the two named sources and no others.';
END;
$verify$;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-31/no-participant-pre-session-screen',
   'CORR-006 Section 8, measured before building',
   'Where the support information is shown before a Google Meet link',
   'two of four placements have no host; the wording and the ordering rule are ready for when one exists',
   'open',
   'Developer: build the participant pre-session screen. The route and the surface contract are in '
   || 'place, so the support information and any theme line will be available and the ordering will be '
   || 'enforced the moment a Meet link appears on a participant screen.',
   'CX-31 places the Annex C support information "on the participant''s pre-session screen for every '
   || 'Stage, before any Google Meet link", and the Annex D theme line for SRC-D1-S4-007 and '
   || 'SRC-D1-S4-010 on the same screen. '
   || 'MEASURED: THERE IS NO PARTICIPANT PRE-SESSION SCREEN. The only surface in the build that shows '
   || 'a Google Meet link is the MENTOR''S Cockpit; no participant-facing screen shows one or exists '
   || 'to precede one. So those two placements have no host today and the ordering has nothing to be '
   || 'before. '
   || 'SAID RATHER THAN WORKED AROUND, because the alternative is reporting CX-31 as placed when two '
   || 'of its four placements are not. WHAT IS READY: one route, '
   || 't3a_participant_safety_notice(stage, source), returns the support information, the C4a Stage 3 '
   || 'line and the theme line, so no screen holds any of that wording; the two theme lines are loaded '
   || 'with hashes; and a surface contract asserts that in any participant-facing file where a Meet '
   || 'link appears, the support information appears BEFORE it — which is enforceable today and is '
   || 'what will catch the screen when someone builds it.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
