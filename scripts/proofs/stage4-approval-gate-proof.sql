-- CORR-006 CX-24 / CX-25. SELF-ABORTING: read the result from the error
-- message. No Stage 4 approval is ever recorded — CX-25 forbids it — so
-- every attempt below happens inside a transaction that aborts.
set search_path = public;

DO $p$
DECLARE
  v_obj uuid; v_ver uuid; v_out text := ''; v_r text;
  v_s4_obj uuid; v_s4_ver uuid; v_when timestamptz;
  v_s1_obj uuid; v_s1_ver uuid;
BEGIN
  -- (a) A Stage 4 source with NO assessment: a synthetic identifier that
  -- matches the Stage 4 pattern, so the guard treats it as Stage 4.
  INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
  VALUES ('SRC-D1-S4-999', 'source'::public.t3a_content_family,
          'SYNTHETIC — aborted transaction only', 'D1')
  RETURNING content_object_id INTO v_obj;
  INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
  VALUES (v_obj, 1, jsonb_build_object('synthetic_test_only', true,
          'source_version_hash', encode(sha256('s4-999'::bytea), 'hex')))
  RETURNING content_version_id INTO v_ver;

  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'approved', gen_random_uuid(), now());
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'STAGE4_APPROVAL_WITHOUT_IMPACT_ASSESSMENT%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 60) || ')' END;
  END;
  v_out := v_out || 'noAssessment=' || v_r || ' ';

  -- (b) A real Stage 4 source, approved BEFORE its assessment was recorded.
  SELECT a.source_identifier, a.source_version_id, a.recorded_at
    INTO v_r, v_s4_ver, v_when
    FROM public.t3a_d1_stage4_impact_assessment a ORDER BY a.source_identifier LIMIT 1;
  SELECT co.content_object_id INTO v_s4_obj
    FROM public.t3a_content_object co WHERE co.identifier = v_r;

  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_s4_obj, v_s4_ver, 'approved', gen_random_uuid(), v_when - interval '1 minute');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'STAGE4_APPROVAL_PRECEDES_ITS_ASSESSMENT%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 60) || ')' END;
  END;
  v_out := v_out || 'approvalBeforeAssessment=' || v_r || ' ';

  -- (c) The same source, approved AFTER its assessment: must be ACCEPTED,
  -- proving the gate permits the correct order rather than blocking all.
  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_s4_obj, v_s4_ver, 'approved', gen_random_uuid(), v_when + interval '1 minute');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || left(SQLERRM, 70) || ')'; END;
  v_out := v_out || 'approvalAfterAssessment=' || v_r || ' ';

  -- (d) A Stage 1 source is untouched by CX-24.
  SELECT co.content_object_id, cv.content_version_id INTO v_s1_obj, v_s1_ver
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'SRC-D1-S1-002';
  INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (v_s1_obj, v_s1_ver, 'withdrawn', gen_random_uuid(), now() - interval '2 minutes');
  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_s1_obj, v_s1_ver, 'approved', gen_random_uuid(), now());
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || left(SQLERRM, 70) || ')'; END;
  v_out := v_out || 'stage1Unaffected=' || v_r;

  RAISE EXCEPTION 'CX24_RESULT %', v_out;
END;
$p$;
