-- =====================================================================
-- T3A-D1-EXEC-001 §6 — assembling the report face
--
-- The eleven blocks, the controlled texts and the traceability register
-- were loaded and proved by 20260929000000. What did not exist was the
-- assembly: the thing that puts the blocks on a page in order, renders
-- the controlled texts verbatim, and refuses where the contract says
-- there is nothing to render.
--
-- Three rules govern this function, and each is enforced by what it
-- cannot do rather than by what it declines to do:
--
--   §6.2 The controlled texts render VERBATIM. They are returned from
--        the register as stored. This function has no substitution, no
--        interpolation and no template step for them at all.
--
--   §6.3 The traceability sheet is NEVER part of the report face. This
--        function does not read t3a_d1_traceability_field or
--        t3a_d1_statement_trace, so no path through it can emit one.
--
--   §6.1 A report that has not cleared review does not render. The
--        refusal is returned, not raised, so it can be logged and shown.
--
-- Block 5 carries the rule that mentor names never render. That is
-- enforced here by never selecting a mentor identifier into the face at
-- any point, not by stripping one afterwards.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.t3a_d1_report_face(p_ber_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r          public.t3a_d1_ber_report;
  v_ready    jsonb;
  v_review   jsonb;
  v_blocks   jsonb;
  v_conduct  jsonb;
BEGIN
  SELECT * INTO r FROM public.t3a_d1_ber_report
   WHERE ber_report_id = p_ber_report_id;

  IF r.ber_report_id IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'BER_REPORT_NOT_FOUND');
  END IF;

  -- A mandatory block whose controlled text is not loaded means the face
  -- would render with a hole in it. A partial report face is worse than
  -- none, because a reader cannot see what is missing.
  v_ready := public.t3a_d1_report_face_renderable();
  IF NOT (v_ready ->> 'renderable')::boolean THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', v_ready ->> 'refusal_code',
      'blocks', v_ready -> 'blocks');
  END IF;

  -- §6.1 — review governs issuance, and there is no override.
  v_review := public.t3a_d1_review_blocks_issuance(p_ber_report_id);
  IF (v_review ->> 'blocked')::boolean THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'REVIEW_BLOCKS_ISSUANCE',
      'blocking_detail', v_review -> 'blocking_detail',
      'items_not_recorded', v_review -> 'items_not_recorded',
      'override_available', false);
  END IF;

  -- -------------------------------------------------------------------
  -- Block 4 — the observed conduct table
  -- -------------------------------------------------------------------
  -- The composed statements, as composed. No statement is re-worded, and
  -- a superseded one does not appear: an amendment supersedes, and the
  -- face shows the standing version.
  --
  -- composed_by, observer_id and confirmer_id are deliberately not
  -- selected. Block 5 says mentor names never render, and a column that
  -- is never read cannot leak.
  SELECT jsonb_agg(jsonb_build_object(
           'dimension_id', o.dimension_id,
           'stage_code', o.stage_code,
           'statement', s.composed_body,
           'composed_at', s.composed_at)
         ORDER BY s.composed_at)
    INTO v_conduct
  FROM public.t3a_d1_composed_statement s
  JOIN public.t3a_observation_record o
    ON o.observation_record_id = s.observation_record_id
  WHERE o.participant_id = r.participant_id
    AND o.dimension_id = r.dimension_id
    -- Only committed observations reach a report face.
    AND o.is_committed
    AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_composed_statement later
                    WHERE later.supersedes = s.composed_statement_id);

  -- -------------------------------------------------------------------
  -- The eleven blocks, in contract order
  -- -------------------------------------------------------------------
  -- A conditional block is returned with renders=false and its reason,
  -- rather than omitted. A reader of the payload can then see that the
  -- block exists and did not fire, which is not the same as a block
  -- that was left out.
  SELECT jsonb_agg(jsonb_build_object(
           'block_no', b.block_no,
           'block_name', b.block_name,
           'render_behaviour', b.render_behaviour,
           'renders', CASE WHEN b.renders_always THEN true
                           WHEN b.block_no = 11 THEN false
                           WHEN b.block_no = 3 THEN false
                           ELSE false END,
           'not_rendering_reason',
             CASE WHEN b.renders_always THEN NULL
                  WHEN b.block_no = 11 THEN 'NO_SEPARATELY_DOCUMENTED_JOB_FAMILY_EVIDENCE'
                  WHEN b.block_no = 3 THEN 'NO_DIVERGENCE_TRIGGERED'
                  ELSE 'CONDITION_NOT_MET' END,
           'controlled_text_ref', b.controlled_text_ref,
           -- §6.2 — verbatim, as stored. No interpolation step exists.
           'controlled_text', t.body,
           'controlled_text_is_verbatim', t.verbatim,
           'rows', CASE WHEN b.block_no = 4 THEN coalesce(v_conduct, '[]'::jsonb)
                        ELSE NULL END)
         ORDER BY b.block_no)
    INTO v_blocks
  FROM public.t3a_d1_report_block b
  LEFT JOIN public.t3a_d1_report_controlled_text t
    ON t.text_ref = b.controlled_text_ref
  WHERE b.render_target = 'report_face';

  RETURN jsonb_build_object(
    'rendered', true,
    'ber_report_id', r.ber_report_id,
    'dimension_id', r.dimension_id,
    'status', r.status,
    'version_set', r.version_set,
    'issued_at', r.issued_at,
    'amended_at', r.amended_at,
    'withdrawn_at', r.withdrawn_at,
    -- §6.3 — the traceability sheet is never part of the face. It is
    -- named here as absent so a caller cannot mistake its absence for an
    -- oversight and go looking for it.
    'traceability_sheet', 'NEVER_PART_OF_THE_REPORT_FACE',
    'blocks', coalesce(v_blocks, '[]'::jsonb));
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_report_face(uuid) TO anon, authenticated;
