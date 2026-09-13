-- =====================================================================
-- T3A-D1-EXEC-001 §5 — the spelling conflict, settled
--
-- Five occurrences of the British spelling `behavioural` sat inside the
-- quoted source bodies loaded by 20260926000000. Two rules governed and
-- they conflicted:
--
--   T3A-D1-EXEC-001 §5 — nothing in the content is "derived from prose,
--   inferred, or authored by the developer".
--
--   T3A-DEV-SPEC-002 §1.4 and AC-61 — U.S. spelling in all new code and
--   interface strings, enforced by a build-failing check.
--
-- The developer did not settle it. The file was grandfathered in
-- scripts/check-vocabulary.mjs with the reason stated at the entry and
-- the question recorded in docs/d1-execution/EXEC-001-content-load.md.
--
-- THE FOUNDER SETTLED IT: correct the five. This migration applies that
-- decision to the loaded content, and scripts/extract-d1-content.mjs
-- carries the same correction by name so a regeneration cannot
-- reintroduce them.
--
-- HOW, and why not the obvious way. A loaded version body is immutable —
-- t3a_d1_content_version_immutable refuses an in-place edit, which is
-- the same doctrine that makes a composed statement superseded rather
-- than rewritten. So the correction supersedes: each affected version is
-- marked superseded by a new version carrying the corrected body. The
-- original stays exactly as it was loaded, and the history shows a
-- content change made under a recorded decision rather than a body that
-- silently differs from what was issued.
--
-- Scope is exactly that word. The substitution is written out case by
-- case rather than as a case-insensitive replace, so it cannot reach a
-- word it was not meant to, and no other text in any source is altered.
-- =====================================================================

DO $correct$
DECLARE
  v          record;
  v_new      uuid;
  v_corrected text;
  v_rows     int := 0;
  v_left     int;
BEGIN
  FOR v IN
    SELECT cv.content_version_id, cv.content_object_id, cv.version_no, cv.body
    FROM public.t3a_d1_content_version cv
    WHERE cv.superseded_by IS NULL
      AND cv.body::text ILIKE '%behavioural%'
  LOOP
    v_corrected := replace(
                     replace(
                       replace(v.body ->> 'verbatim', 'BEHAVIOURAL', 'BEHAVIORAL'),
                     'Behavioural', 'Behavioral'),
                   'behavioural', 'behavioral');

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v.content_object_id,
            v.version_no || '-us-spelling',
            'drafting'::public.t3a_approval_status,
            'not_loaded'::public.t3a_operational_state,
            jsonb_set(v.body, '{verbatim}', to_jsonb(v_corrected)))
    RETURNING content_version_id INTO v_new;

    UPDATE public.t3a_d1_content_version
       SET superseded_by = v_new
     WHERE content_version_id = v.content_version_id;

    -- Recorded per object, not once in aggregate: the load event is
    -- keyed to the content it describes.
    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::public.t3a_env_state,
            v.content_object_id, v_new,
            'DISABLED_PENDING_DECISION'::public.t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5 spelling conflict settled by the founder: correct the occurrences of the British spelling to U.S. spelling. This version supersedes the loaded one and differs from it in that word alone.');

    v_rows := v_rows + 1;
  END LOOP;

  SELECT count(*) INTO v_left
  FROM public.t3a_d1_content_version
  WHERE superseded_by IS NULL
    AND body::text ILIKE '%behavioural%';

  RAISE NOTICE 'spelling correction: % version(s) superseded, % standing version(s) still carry it', v_rows, v_left;

  IF v_left > 0 THEN
    RAISE EXCEPTION 'SPELLING_CORRECTION_INCOMPLETE: % standing version(s) still carry the British spelling', v_left;
  END IF;
END;
$correct$;
