-- =====================================================================
-- Serving readiness said "no" as a constant
--
-- 20261015000000 built the REC-07 approval route and, in the same
-- migration, a readiness function that reported:
--
--   'any_source_servable', false,
--   'blocked_on', 'REC-07 approval is a governance act by a person with
--                  standing. It is not recorded by a build...'
--
-- Both were literals. They were true when they were written — nothing
-- was approved and nothing could be served — and they were a statement
-- about the state of the world rather than a reading of it.
--
-- On 2026-09-21 the founder approved all forty sources through the
-- route, each against an exact version hash. The function went on saying
-- no source is servable and that the whole thing is blocked on an
-- approval that has now happened.
--
-- A readiness check that cannot become ready is not a check. This one
-- reads the registers.
--
-- A source is servable when all three hold:
--   * it is loaded as a source content object;
--   * its STANDING version carries a source-version hash, so an approval
--     can name an exact text;
--   * that standing version has an approval with status 'approved'.
--
-- The third condition is deliberately against the standing version and
-- not the source. An approval belongs to a text, so a correction that
-- supersedes a version takes its approval with it — which is what
-- 20261015000000 §5 established and what this must not quietly undo.
-- =====================================================================

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_d1_serving_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH standing AS (
    SELECT co.content_object_id,
           cv.content_version_id,
           coalesce(btrim(cv.body ->> 'source_version_hash'), '') <> '' AS has_hash
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id
     AND cv.superseded_by IS NULL
    WHERE co.family = 'source'::public.t3a_content_family
  ),
  servable AS (
    SELECT s.content_object_id
    FROM standing s
    WHERE s.has_hash
      AND EXISTS (
        SELECT 1 FROM public.t3a_d1_source_approval a
        WHERE a.source_id = s.content_object_id
          AND a.source_version_id = s.content_version_id
          AND a.status = 'approved')
  )
  SELECT jsonb_build_object(
    'sources_loaded',
      (SELECT count(*) FROM standing),
    'versions_carrying_a_hash',
      (SELECT count(*) FROM standing WHERE has_hash),
    'sources_approved',
      (SELECT count(DISTINCT source_id) FROM public.t3a_d1_source_approval
        WHERE status = 'approved'),
    'sources_servable',
      (SELECT count(*) FROM servable),
    'any_source_servable',
      (SELECT count(*) > 0 FROM servable),
    'blocked_on',
      CASE
        WHEN (SELECT count(*) FROM servable) > 0 THEN NULL
        WHEN (SELECT count(*) FROM standing) = 0
          THEN 'No source is loaded.'
        WHEN (SELECT count(*) FROM standing WHERE has_hash) = 0
          THEN 'No standing version carries a source-version hash, so no approval can name an exact text.'
        ELSE 'No standing version holds a REC-07 approval. That is a governance act by a person with standing; it is not recorded by a build, and no build may record one.'
      END,
    -- Named so a caller can tell "approved, but the text moved underneath
    -- it" from "never approved". A superseded version's approval does not
    -- carry forward, and this is where that shows.
    'approved_but_superseded',
      (SELECT count(*) FROM public.t3a_d1_source_approval a
        JOIN public.t3a_d1_content_version cv
          ON cv.content_version_id = a.source_version_id
       WHERE a.status = 'approved' AND cv.superseded_by IS NOT NULL));
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_serving_readiness() TO authenticated;
