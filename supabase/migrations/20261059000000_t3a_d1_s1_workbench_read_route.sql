-- =====================================================================
-- PLC-005-A Note 7 / Note 5 Step 4 — the read route the two screens need
--
-- WHY THIS EXISTS. Note 7 built the Stage 1 gate, its refusals and its two
-- write routes, and recorded the Mentor Desk workbench interface and the
-- pending action as "interface work, ships separately". They never shipped.
-- The consequence is not cosmetic: the rule that a Stage 1 outcome must
-- reach the assigned mentor before Stage 2 begins is ENFORCED, but there is
-- no surface on which it reaches anyone. A gate nobody can see is a gate
-- that stops work without telling anyone why.
--
-- WHAT IS SYNTHESIZED HERE AND WHAT IS NOT. The INTERFACE is synthesized
-- from the governing documents, because the founder has said he is at the
-- end of his knowledge on it. The CONTENT is not synthesized at all: this
-- route returns what the database holds and nothing else. Where a required
-- input is absent the workbench refuses to open, exactly as
-- t3a_d1_s1_workbench_may_open already decides. That distinction is the
-- whole lesson of the fabricated Cockpit fallback removed under CL-10.
--
-- THE FIELD RESTRICTIONS ARE STRUCTURAL, NOT A SCREEN PROMISE. Note 7
-- Section 4 prohibits an AI suggestion, a free-text narrative and a
-- composed statement in the mentor's Stage 1 confirmation. Those are
-- already impossible: t3a_d1_s1_determination has no column for any of
-- them. This route carries none either, so a screen built on it cannot
-- offer one even by mistake. A restriction asserted by absence survives a
-- redesign; one asserted by a screen does not.
--
-- ONE ROUTE RATHER THAN CLIENT-SIDE JOINS. The pending list spans routing,
-- stage instance, stage entry and the AI administration run, each with its
-- own row-level policy. A client assembling that from four reads would get
-- a partial answer wherever one policy declined, and a partial pending list
-- reads as "nothing is waiting for you" — the worst possible failure for
-- this particular screen. SECURITY DEFINER with an explicit
-- assigned_mentor_id = auth.uid() test gives one answer or none.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CORR-02 — the pending action on the Mentor Desk
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_pending_for_mentor()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_rows  jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal_code', 'NO_MENTOR_IDENTIFIED');
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x ->> 'routed_at'), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
               'stage_instance_id', r.stage_instance_id,
               'participant_id', r.participant_id,
               'dimension_id', r.dimension_id,
               'routed_at', r.routed_at,
               'ai_administration_run_id', run.ai_administration_run_id,
               -- Whether each half of the two-step act has happened. The
               -- screen shows the order; it does not decide it.
               'determinations_captured', EXISTS (
                 SELECT 1 FROM public.t3a_d1_s1_determination d
                  WHERE d.stage_instance_id = r.stage_instance_id),
               'confirmed', EXISTS (
                 SELECT 1 FROM public.t3a_d1_s1_confirmation c
                  WHERE c.stage_instance_id = r.stage_instance_id),
               's1_closed_at', si.completed_at
             ) AS x
        FROM public.t3a_d1_s1_routing r
        JOIN public.t3a_stage_instance si
          ON si.stage_instance_id = r.stage_instance_id
        LEFT JOIN public.t3a_stage_entry_event e
          ON e.stage_instance_id = r.stage_instance_id
        LEFT JOIN public.t3a_d1_ai_administration_run run
          ON run.stage_entry_event_id = e.stage_entry_event_id
       WHERE r.assigned_mentor_id = v_actor
         -- Uncleared only: cleared_at is set by confirmation, so a cleared
         -- routing is finished work and does not sit in a pending list.
         AND r.cleared_at IS NULL
    ) s;

  RETURN jsonb_build_object('ok', true, 'pending', v_rows,
    'count', jsonb_array_length(v_rows));
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_pending_for_mentor() IS
  'CORR-02. The Stage 1 outcomes routed to the signed-in mentor and not yet confirmed. Returns [] rather than an error where there are none, because an empty list and a failed read must not look the same on a screen whose whole job is to say whether anything is waiting.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_s1_pending_for_mentor() TO authenticated;

-- ---------------------------------------------------------------------
-- 2. CORR-03 — what the workbench may show
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_workbench_payload(
  p_stage_instance_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_r     record;
  v_run   record;
  v_open  jsonb;
  v_src   jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('may_open', false, 'refusal_code', 'NO_MENTOR_IDENTIFIED');
  END IF;

  SELECT * INTO v_r FROM public.t3a_d1_s1_routing
   WHERE stage_instance_id = p_stage_instance_id;

  IF v_r.s1_routing_id IS NULL THEN
    RETURN jsonb_build_object('may_open', false, 'refusal_code', 'NOT_ROUTED');
  END IF;

  -- The same test the write routes apply. A screen that opens for someone
  -- the write route will refuse wastes their time and teaches them the
  -- control is arbitrary.
  IF v_actor IS DISTINCT FROM v_r.assigned_mentor_id THEN
    RETURN jsonb_build_object('may_open', false, 'refusal_code', 'NOT_ASSIGNED_MENTOR');
  END IF;

  SELECT run.* INTO v_run
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_ai_administration_run run
      ON run.stage_entry_event_id = e.stage_entry_event_id
   WHERE e.stage_instance_id = p_stage_instance_id
   ORDER BY run.run_started_at DESC
   LIMIT 1;

  IF v_run.ai_administration_run_id IS NULL THEN
    RETURN jsonb_build_object('may_open', false,
      'refusal_code', 'AI_ADMINISTRATION_RUN_NOT_FOUND',
      'remedy', 'Stage 1 is administered by the AI service. Without its run there are no participant responses to confirm, and nothing may be entered by hand in their place.');
  END IF;

  -- The existing contract decides. This route does not re-implement it.
  v_open := public.t3a_d1_s1_workbench_may_open(v_run.ai_administration_run_id);
  IF (v_open ->> 'may_open') IS DISTINCT FROM 'true' THEN
    RETURN v_open;
  END IF;

  SELECT cv.body -> 'source_sheet' INTO v_src
    FROM public.t3a_d1_content_version cv
   WHERE cv.content_version_id = v_run.source_version_id;

  RETURN jsonb_build_object(
    'may_open', true,
    'stage_instance_id', p_stage_instance_id,
    'participant_id', v_r.participant_id,
    'dimension_id', v_r.dimension_id,
    'ai_administration_run_id', v_run.ai_administration_run_id,
    'source_version_id', v_run.source_version_id,
    -- The served instance and the participant's verbatim responses. These
    -- are the only two content fields Note 7 Section 4 permits, and they
    -- are returned as stored — the hash is returned with the body so a
    -- reader can tell it is the text that was served.
    'participant_responses_verbatim', v_run.rendered_body,
    'participant_responses_hash', v_run.rendered_body_hash,
    'source_sheet', v_src,
    'env_state_at_run', v_run.env_state_at_run,
    's1_closed_at', (SELECT completed_at FROM public.t3a_stage_instance
                      WHERE stage_instance_id = p_stage_instance_id),
    'determinations_captured', EXISTS (
      SELECT 1 FROM public.t3a_d1_s1_determination d
       WHERE d.stage_instance_id = p_stage_instance_id),
    'confirmed', EXISTS (
      SELECT 1 FROM public.t3a_d1_s1_confirmation c
       WHERE c.stage_instance_id = p_stage_instance_id),
    -- Stated in the payload so the screen cannot quietly offer one.
    'prohibited_fields', jsonb_build_array(
      'ai_suggestion', 'free_text_narrative', 'composed_statement'));
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_workbench_payload(uuid) IS
  'CORR-03. Everything the Stage 1 workbench may display and nothing else: the served instance, the participant''s verbatim responses with their hash, and the source sheet. No AI suggestion, no free-text narrative and no composed statement — none exists to return, and prohibited_fields names them so a later screen cannot add one and call it an oversight. Refuses through the existing t3a_d1_s1_workbench_may_open contract rather than restating its conditions.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_s1_workbench_payload(uuid) TO authenticated;
