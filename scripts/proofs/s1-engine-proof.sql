-- CORR-006 CX-08 / CX-11 / CX-14. SELF-ABORTING: read the result from the
-- error message.
--
-- CX-14 has two halves and they need different kinds of proof.
--
--   "makes no network call to any language-model endpoint" — proved from
--   the catalogue: this database installs no HTTP-capable extension and
--   defines no HTTP-capable function, so no function in it CAN make one.
--   Checked here rather than asserted, because the claim is only as good as
--   the moment it was last true.
--
--   "every rendered situation and reveal is byte-identical to the served
--   source version" — proved by searching for each rendered part inside the
--   stored verbatim text of that version, for all ten sources and every
--   reveal. position() = 0 means the engine produced something the source
--   does not contain.
set search_path = public;

DO $p$
DECLARE
  v_out      text := '';
  v_r        text;
  v_bad      text;
  v_n_src    int := 0;
  v_n_rev    int := 0;
  v_http     int;
  v_ext      int;
  rec        record;
  rev        jsonb;
  v_render   jsonb;
  v_verbatim text;
BEGIN
  -- ---------------------------------------------------------------
  -- (1) The engine cannot reach a language model.
  -- ---------------------------------------------------------------
  SELECT count(*) INTO v_ext FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname IN ('pg_net', 'http', 'pgsql-http', 'plpython3u', 'plperlu');
  SELECT count(*) INTO v_http FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN ('net', 'http')
      OR p.proname IN ('http', 'http_get', 'http_post', 'http_put', 'http_delete');

  v_out := v_out || 'httpCapableExtensions=' || v_ext || ' httpCapableFunctions=' || v_http || ' ';

  -- And nothing in the engine's own code names one, which is the weaker
  -- check but the one that would catch a future function added beside it.
  SELECT string_agg(sig, ', ') INTO v_bad
    FROM unnest(public.t3a_d1_s1_engine_functions()) sig
   WHERE pg_get_functiondef(sig::regprocedure)
         ~* '(pg_net|net\.http|http_post|http_get|dblink|COPY\s+PROGRAM|plpython|plperlu)';
  v_out := v_out || 'engineCodeNamesAnEndpoint='
        || CASE WHEN v_bad IS NULL THEN 'NO' ELSE 'YES(' || v_bad || ')' END || ' ';

  -- ---------------------------------------------------------------
  -- (2) Byte-identity, every source, every reveal.
  -- ---------------------------------------------------------------
  FOR rec IN
    SELECT co.identifier, cv.content_version_id, cv.body ->> 'verbatim' AS verbatim
      FROM public.t3a_content_object co
      JOIN public.t3a_d1_content_version cv
        ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
     WHERE co.identifier ~ '^SRC-D1-S1-'
     ORDER BY co.identifier
  LOOP
    v_n_src := v_n_src + 1;
    v_verbatim := rec.verbatim;
    v_render := public.t3a_d1_s1_render(rec.content_version_id);

    IF NOT (v_render ->> 'renderable')::boolean THEN
      v_bad := coalesce(v_bad, '') || rec.identifier || '=NOT_RENDERABLE(' || (v_render ->> 'refusal_code') || ') ';
      CONTINUE;
    END IF;

    IF position((v_render -> 'situation' ->> 'verbatim') in v_verbatim) = 0 THEN
      v_bad := coalesce(v_bad, '') || rec.identifier || '=SITUATION_NOT_IN_SOURCE ';
    END IF;

    FOR rev IN SELECT x FROM jsonb_array_elements(v_render -> 'reveals') x LOOP
      v_n_rev := v_n_rev + 1;
      IF position((rev ->> 'verbatim') in v_verbatim) = 0 THEN
        v_bad := coalesce(v_bad, '') || rec.identifier || '/' || (rev ->> 'label') || '=NOT_IN_SOURCE ';
      END IF;
      -- Nothing from the governance metadata may reach a participant. This
      -- is the specific fault the scoped parse exists to prevent.
      IF (rev ->> 'verbatim') ~ '(NOT SERVED|bearing interest|Q-D1-[0-9])' THEN
        v_bad := coalesce(v_bad, '') || rec.identifier || '/' || (rev ->> 'label') || '=CARRIES_GOVERNANCE_METADATA ';
      END IF;
    END LOOP;
  END LOOP;

  v_out := v_out || 'sourcesRendered=' || v_n_src || ' revealsChecked=' || v_n_rev || ' ';
  v_out := v_out || 'byteIdentity=' || CASE WHEN v_bad IS NULL THEN 'ALL_VERBATIM' ELSE 'FAILED(' || v_bad || ')' END || ' ';

  -- ---------------------------------------------------------------
  -- (3) The unscoped parse, run deliberately, to show what the scoping is
  --     for. This is the defect the engine does NOT have.
  -- ---------------------------------------------------------------
  SELECT count(*) INTO v_n_rev
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
    CROSS JOIN LATERAL regexp_matches(cv.body ->> 'verbatim', '^- \*\*R[0-9]+\*\*', 'gn') AS m
   WHERE co.identifier = 'SRC-D1-S1-001';
  v_out := v_out || 'unscopedWouldFind=' || v_n_rev || ' scopedFinds='
        || ((public.t3a_d1_s1_reveals((SELECT cv.body ->> 'verbatim'
                                        FROM public.t3a_content_object co
                                        JOIN public.t3a_d1_content_version cv
                                          ON cv.content_object_id = co.content_object_id
                                         AND cv.superseded_by IS NULL
                                       WHERE co.identifier = 'SRC-D1-S1-001')) ->> 'count')) || ' ';

  -- ---------------------------------------------------------------
  -- (4) The engine refuses rather than guessing.
  -- ---------------------------------------------------------------
  v_r := public.t3a_d1_s1_reveals('**Reveal sequence**' || E'\n' || '- **R1** a' || E'\n' || '- **R3** b') ->> 'refusal_code';
  v_out := v_out || 'gapInNumbering=' || coalesce(v_r, 'ACCEPTED') || ' ';
  v_r := public.t3a_d1_s1_reveals('no sections here at all') ->> 'refusal_code';
  v_out := v_out || 'noRevealSection=' || coalesce(v_r, 'ACCEPTED') || ' ';
  v_r := public.t3a_d1_s1_reveals('**Reveal sequence**' || E'\n' || 'prose, no bullets') ->> 'refusal_code';
  v_out := v_out || 'emptySection=' || coalesce(v_r, 'ACCEPTED') || ' ';

  -- ---------------------------------------------------------------
  -- (5) The code hash describes the deployed code.
  -- ---------------------------------------------------------------
  v_out := v_out || 'engineHash='
        || CASE WHEN (public.t3a_d1_s1_engine_hash_current() ->> 'current')::boolean
                THEN 'CURRENT'
                ELSE (public.t3a_d1_s1_engine_hash_current() ->> 'refusal_code') END || ' ';

  -- ---------------------------------------------------------------
  -- (6) All four provenance slots now name a loaded object.
  -- ---------------------------------------------------------------
  v_out := v_out || 'provenance='
        || CASE WHEN (public.t3a_d1_s1_production_provenance() ->> 'all_four_present')::boolean
                THEN 'ALL_FOUR_PRESENT'
                ELSE 'MISSING' || (public.t3a_d1_s1_production_provenance() ->> 'missing') END;

  RAISE EXCEPTION 'CX14_RESULT %', v_out;
END;
$p$;
