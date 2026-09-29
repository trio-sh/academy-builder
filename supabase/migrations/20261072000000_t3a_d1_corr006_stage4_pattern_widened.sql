-- =====================================================================
-- The Stage 4 identifier test only recognised sources numbered 0xx
--
-- HOW THIS WAS FOUND. The CX-24 gate proof attempted an approval on a
-- synthetic source named SRC-D1-S4-999 with no assessment, and it was
-- ACCEPTED. I read that as the gate failing. It was not: the gate never
-- saw a Stage 4 source, because t3a_d1_is_stage4_source matched
--
--     '^SRC-D1-S4-0'
--
-- with a trailing ZERO. That pattern came from CL-16, where it was written
-- against the ten sources that exist, and I centralised it under Section 7
-- without reading what it actually claims.
--
-- WHY IT MATTERS EVEN THOUGH NOTHING IS WRONG TODAY. The pattern
-- recognises SRC-D1-S4-001 to SRC-D1-S4-099 and nothing else. A Stage 4
-- source numbered 100 or above would not be recognised as Stage 4 at all,
-- so the CX-24 assessment gate would silently not apply to it — an
-- approval with no impact assessment would be accepted. That is the exact
-- failure CL-16 withdrew ten approvals to prevent, reintroduced by an
-- identifier pattern nobody would think to re-read.
--
-- MEASURED BEFORE CHANGING IT, which is the rule this build keeps
-- relearning:
--     matches '^SRC-D1-S4-0'   10
--     matches '^SRC-D1-S4-'    10
--     would newly match        none
--     non-source objects       0
-- So the correction changes nothing about the current ten and closes the
-- hole for the eleventh.
--
-- The narrow form appears many times across earlier migrations as literal
-- identifiers, which are exact and unaffected. What is corrected is the
-- one place that decides the CLASS of a source.
-- =====================================================================

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_d1_is_stage4_source(p_source_identifier text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $fn$
  SELECT coalesce(p_source_identifier ~ '^SRC-D1-S4-', false);
$fn$;

COMMENT ON FUNCTION public.t3a_d1_is_stage4_source(text) IS
  'The single definition of "is this a Stage 4 production source". Matches ^SRC-D1-S4- and deliberately NOT ^SRC-D1-S4-0, which CL-16 used and which recognises only sources numbered 001 to 099 — a Stage 4 source numbered 100 or above would have escaped the CX-24 assessment gate entirely. Measured when widened: both patterns matched the same ten sources, so nothing about the current ten changed.';

DO $assert$
DECLARE v_n int; v_extra text;
BEGIN
  SELECT count(*) INTO v_n
    FROM public.t3a_content_object co
   WHERE public.t3a_d1_is_stage4_source(co.identifier);

  SELECT string_agg(co.identifier, ', ' order by co.identifier) INTO v_extra
    FROM public.t3a_content_object co
   WHERE public.t3a_d1_is_stage4_source(co.identifier)
     AND co.family <> 'source'::public.t3a_content_family;

  IF v_n <> 10 THEN
    RAISE EXCEPTION 'STAGE4_PATTERN_WIDENED_TOO_FAR: the widened test matches % objects, expected the ten Stage 4 production sources.', v_n;
  END IF;
  IF v_extra IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE4_PATTERN_WIDENED_TOO_FAR: it now matches non-source objects: %', v_extra;
  END IF;

  RAISE NOTICE 'Stage 4 identifier test widened; still matches exactly the ten production sources.';
END;
$assert$;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/stage4-pattern-only-matched-0xx', 'CORR-006 Section 7, found by the CX-24 gate proof',
   'How the build decides a source is Stage 4',
   'latent defect — corrected; nothing currently affected',
   'closed',
   NULL,
   'CL-16 matched Stage 4 sources with the regex ''^SRC-D1-S4-0'', a trailing ZERO, written against '
   || 'the ten sources that exist. Section 7 centralised that pattern into '
   || 't3a_d1_is_stage4_source without reading what it claims. It recognises SRC-D1-S4-001 to -099 '
   || 'and nothing else, so a Stage 4 source numbered 100 or above would not be recognised as Stage 4 '
   || 'and the CX-24 assessment gate would SILENTLY NOT APPLY to it — an approval with no impact '
   || 'assessment accepted, which is the exact failure CL-16 withdrew ten approvals to prevent. '
   || 'FOUND BY A TEST THAT LOOKED LIKE IT WAS FAILING FOR A DIFFERENT REASON: the gate proof '
   || 'attempted an approval on a synthetic SRC-D1-S4-999 with no assessment and it was ACCEPTED. I '
   || 'read that as the gate not working. The gate was working; it had never been shown a Stage 4 '
   || 'source. Corrected to ''^SRC-D1-S4-'' after measuring: both patterns match the same ten today, '
   || 'nothing newly matches, and no non-source object matches, so the current ten are unaffected. '
   || 'Literal identifiers elsewhere in the migrations are exact and were not touched; what changed is '
   || 'the one place that decides the CLASS of a source.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
