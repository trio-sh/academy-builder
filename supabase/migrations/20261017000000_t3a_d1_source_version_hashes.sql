-- =====================================================================
-- §5.18 — assigning the source-version hashes
--
-- REC-07 approval names an exact text, and the route refuses to approve
-- a version that cannot say which text it is
-- (SOURCE_VERSION_CARRIES_NO_HASH). All forty stood at
-- source_version_hash = NULL, so nothing could be approved even by
-- someone with standing.
--
-- Computing a hash is arithmetic over text that is already loaded. It
-- asserts nothing about whether the source is fit to serve — that is the
-- approval, and it is still nobody's to write but a person with
-- standing. This migration makes the approval POSSIBLE; it does not make
-- it, and no approval row is written here.
--
-- The hash is sha256 over the verbatim body exactly as loaded, so two
-- versions with the same text hash the same and a single changed
-- character does not.
--
-- HOW. A loaded version body is immutable, so this supersedes rather
-- than edits, exactly as the spelling correction and the source-sheet
-- re-extraction did. Each standing version is superseded by one carrying
-- its own hash, and the hash is computed from the new version's own
-- verbatim so it always names the text it travels with.
-- =====================================================================

DO $hashes$
DECLARE
  v        record;
  v_new    uuid;
  v_hash   text;
  v_rows   int := 0;
  v_left   int;
BEGIN
  FOR v IN
    SELECT cv.content_version_id, cv.content_object_id, cv.version_no, cv.body
    FROM public.t3a_d1_content_version cv
    WHERE cv.superseded_by IS NULL
      AND cv.body ? 'verbatim'
      AND coalesce(btrim(cv.body ->> 'source_version_hash'), '') = ''
  LOOP
    v_hash := encode(extensions.digest(v.body ->> 'verbatim', 'sha256'), 'hex');

    INSERT INTO public.t3a_d1_content_version
      (content_object_id, version_no, approval_status, operational_state, body)
    VALUES (v.content_object_id,
            v.version_no || '-hashed',
            'drafting'::public.t3a_approval_status,
            'not_loaded'::public.t3a_operational_state,
            jsonb_set(v.body, '{source_version_hash}', to_jsonb(v_hash)))
    RETURNING content_version_id INTO v_new;

    UPDATE public.t3a_d1_content_version
       SET superseded_by = v_new
     WHERE content_version_id = v.content_version_id;

    INSERT INTO public.t3a_d1_content_load_event
      (env_state, content_object_id, content_version_id, governed_status, notes)
    VALUES ('synthetic_test_only'::public.t3a_env_state,
            v.content_object_id, v_new,
            'DISABLED_PENDING_DECISION'::public.t3a_governed_config_status,
            'T3A-D1-EXEC-001 section 5.18: source-version hash assigned. sha256 over the verbatim body as loaded. This states which text the version is; it states nothing about whether the source may serve, which remains a REC-07 approval by a person with standing.');

    v_rows := v_rows + 1;
  END LOOP;

  SELECT count(*) INTO v_left
  FROM public.t3a_d1_content_version
  WHERE superseded_by IS NULL
    AND body ? 'verbatim'
    AND coalesce(btrim(body ->> 'source_version_hash'), '') = '';

  RAISE NOTICE 'source-version hashes: % assigned, % standing version(s) still without one', v_rows, v_left;

  IF v_left > 0 THEN
    RAISE EXCEPTION 'HASH_ASSIGNMENT_INCOMPLETE: % standing version(s) carry no hash', v_left;
  END IF;
END;
$hashes$;

-- A hash must name the text it travels with. If a later migration ever
-- writes a body whose hash does not match its own verbatim, this says so
-- rather than letting an approval point at text that changed under it.
CREATE OR REPLACE FUNCTION public.t3a_d1_source_hash_integrity()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT jsonb_build_object(
    'standing_versions',
      count(*),
    'hash_matches_verbatim',
      count(*) FILTER (
        WHERE body ->> 'source_version_hash'
              = encode(extensions.digest(body ->> 'verbatim', 'sha256'), 'hex')),
    'mismatched',
      coalesce(string_agg(body ->> 'source_identifier', ', ') FILTER (
        WHERE body ->> 'source_version_hash'
              IS DISTINCT FROM encode(extensions.digest(body ->> 'verbatim', 'sha256'), 'hex')), ''))
  FROM public.t3a_d1_content_version
  WHERE superseded_by IS NULL AND body ? 'verbatim';
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_source_hash_integrity() TO authenticated;
