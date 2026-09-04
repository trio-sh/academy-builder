-- T3A-D1 · Amendment orchestration (INS-006 → INS-007 call chain).
--
-- Adjacent to INS-007. Lands the admin-callable surface that walks a
-- correction_case with terminal_outcome='amended' through the
-- amendment issuance. Fails closed on every unmet prerequisite so
-- the coordinator UI sees the same refusal codes the direct issuance
-- surface returns.
--
-- Contract:
--   t3a_d1_orchestrate_amendment(p_correction_case_id uuid)
--   returns jsonb one of:
--     * {ok:false, reason: 'NOT_ADMIN'}
--     * {ok:false, reason: 'CORRECTION_CASE_NOT_FOUND'}
--     * {ok:false, reason: 'CASE_NOT_TERMINAL_AMENDED', terminal_outcome: <text>}
--     * {ok:false, reason: 'BER_REPORT_MISSING'}
--     * {ok:false, reason: 'NO_ACTIVE_ISSUANCE'}
--     * {ok:false, reason: 'RENDER_REFUSED', render: <jsonb from t3a_d1_render_report_language>}
--     * {ok:false, reason: 'EVIDENCE_REVIEW_AUTHORITY_UNSET'} — bubbled from FD-D1-04
--     * {ok:true, new_issuance_id: <uuid>, superseded_id: <uuid>}
--
-- The function never softens any downstream refusal. Under the
-- present authority register (all FD-D1-* UNSET), the render step
-- refuses, so callers always see a structured refusal — never a
-- partial write.
--
-- Called only by administrators until activation_governance lands.

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_d1_orchestrate_amendment(
  p_correction_case_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case record;
  v_prior_issuance_id uuid;
  v_render jsonb;
  v_new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  SELECT correction_case_id, ber_report_id, challenge_status, terminal_outcome
    INTO v_case
    FROM public.t3a_correction_case
   WHERE correction_case_id = p_correction_case_id;

  IF v_case.correction_case_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'CORRECTION_CASE_NOT_FOUND');
  END IF;

  IF COALESCE(v_case.terminal_outcome, '') <> 'amended' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'CASE_NOT_TERMINAL_AMENDED',
      'terminal_outcome', v_case.terminal_outcome
    );
  END IF;

  IF v_case.ber_report_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'BER_REPORT_MISSING');
  END IF;

  SELECT issuance_id INTO v_prior_issuance_id
    FROM public.t3a_d1_report_issuance
   WHERE ber_report_id = v_case.ber_report_id
     AND state = 'issued'
   ORDER BY issued_at DESC
   LIMIT 1;

  IF v_prior_issuance_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_ACTIVE_ISSUANCE');
  END IF;

  -- Re-render the report body from the current statement library +
  -- version set on the report. INS-005 governs sufficiency + language
  -- gates. Under FD-D1-04 UNSET this refuses.
  BEGIN
    SELECT public.t3a_d1_render_report_language(v_case.ber_report_id)
      INTO v_render;
  EXCEPTION WHEN undefined_function THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RENDER_SURFACE_MISSING');
  END;

  IF v_render IS NULL
     OR (v_render ? 'ok' AND (v_render->>'ok')::boolean IS DISTINCT FROM true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RENDER_REFUSED', 'render', v_render);
  END IF;

  IF (v_render ? 'reason' AND v_render->>'reason' = 'EVIDENCE_REVIEW_AUTHORITY_UNSET') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'EVIDENCE_REVIEW_AUTHORITY_UNSET');
  END IF;

  -- The amendment service itself is service_role only; even an admin
  -- cannot invoke it directly from PostgREST. Under the present
  -- authority register we never reach this branch because render
  -- refuses first. When FD-D1-04 lands, the orchestration must be
  -- taken over by an activation_governance-scoped wrapper that runs
  -- as the authorised reviewer.
  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'AMENDMENT_INVOCATION_REQUIRES_SERVICE_ROLE',
    'note', 'render cleared; downstream call routes through activation_governance which does not exist yet'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_d1_orchestrate_amendment(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.t3a_d1_orchestrate_amendment(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
