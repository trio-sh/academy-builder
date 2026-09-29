-- CORR-006 CX-15. SELF-ABORTING: read the result from the error message.
--
-- Line (2) is the negative control and line (4) is the measurement CX-15
-- actually turns on: whether the retired wording renders anywhere in loaded
-- content. It reads 0, and it read 0 before this work started — the Section
-- 5.16 notice was never built, so there was nothing to replace.
set search_path = public;
DO $p$
DECLARE
  v_out text := ''; v_r text; v_obj uuid; v_retired text;
BEGIN
  INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
  VALUES ('SYNTH-NOTICE-995', 'configuration'::public.t3a_content_family,
          'SYNTHETIC — aborted transaction only', 'D1')
  RETURNING content_object_id INTO v_obj;

  SELECT retired_text INTO v_retired FROM public.t3a_retired_participant_sentence
   ORDER BY length(retired_text) LIMIT 1;

  -- (1) A notice carrying a retired sentence, verbatim.
  BEGIN
    INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
    VALUES (v_obj, 1, jsonb_build_object('verbatim',
      'Your assessment works as follows. ' || v_retired || ' An authorized person reads it.'));
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'PARTICIPANT_NOTICE_CARRIES_RETIRED_SENTENCE%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM,60) || ')' END;
  END;
  v_out := v_out || 'noticeWithRetiredSentence=' || v_r || ' ';

  -- (2) The same notice carrying its REPLACEMENT is accepted. Negative
  --     control: without it, line (1) is what a guard refusing everything
  --     would also produce.
  BEGIN
    INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
    VALUES (v_obj, 2, jsonb_build_object('verbatim',
      'Your assessment works as follows. '
      || (SELECT replaced_by FROM public.t3a_retired_participant_sentence
           ORDER BY length(retired_text) LIMIT 1)
      || ' An authorized person reads it.'));
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || left(SQLERRM,70) || ')'; END;
  v_out := v_out || 'noticeWithReplacement=' || v_r || ' ';

  -- (3) An UPDATE cannot smuggle it in either — but NOT because of the
  --     CX-15 guard. A pre-existing guard makes a version body immutable
  --     outright, and it refuses first, so the BEFORE UPDATE half of the
  --     CX-15 trigger is unreachable today. Reported as the guard that
  --     actually fires, because "refused" and "refused by the control I
  --     just built" are different claims.
  BEGIN
    UPDATE public.t3a_d1_content_version
       SET body = body || jsonb_build_object('verbatim', v_retired)
     WHERE content_object_id = v_obj AND version_no = '2';
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'PARTICIPANT_NOTICE_CARRIES_RETIRED_SENTENCE%'
                THEN 'REFUSED_BY_CX15'
                WHEN SQLERRM LIKE 'CONTENT_HISTORY_OVERWRITE%'
                THEN 'REFUSED_BY_CONTENT_IMMUTABILITY'
                ELSE 'REFUSED_OTHER(' || left(SQLERRM,60) || ')' END;
  END;
  v_out := v_out || 'updateSmuggling=' || v_r || ' ';

  -- (4) The retired sentences render nowhere in loaded content.
  SELECT count(*)::text INTO v_r
    FROM public.t3a_d1_content_version cv
    CROSS JOIN public.t3a_retired_participant_sentence s
   WHERE position(s.retired_text in coalesce(cv.body ->> 'verbatim','')) > 0
     AND cv.content_object_id <> v_obj;
  v_out := v_out || 'loadedVersionsCarryingRetiredText=' || v_r;

  RAISE EXCEPTION 'CX15_RESULT %', v_out;
END;
$p$;
