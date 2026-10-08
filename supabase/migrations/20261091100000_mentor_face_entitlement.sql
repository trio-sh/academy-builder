-- t3a_d1_report_face: extend the entitlement check so the assigned
-- mentor can render the face through the cockpit alongside the
-- participant and administrative-standing actors. Pre-change the
-- mentor who assembled the BER could not see its rendered face even
-- while sitting on the drafting cockpit — the RPC returned
-- CALLER_NOT_ENTITLED_TO_THIS_REPORT.
--
-- A mentor on an active t3a_mentor_assignment for the participant is
-- the person composing and reviewing the record; the face they see is
-- the drafting view, not a release. §6.3 (traceability sheet never on
-- the face), §6.2 (controlled text verbatim), and the "mentor names
-- never render" rule in block 5 all continue to apply through the
-- unchanged t3a_d1_report_face_assemble pipeline.

CREATE OR REPLACE FUNCTION public.t3a_d1_report_face(p_ber_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_actor       uuid := auth.uid();
  v_participant uuid;
  v_is_mentor   boolean;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'NO_CALLER_IDENTIFIED');
  END IF;

  SELECT participant_id INTO v_participant
    FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;

  IF v_participant IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'BER_REPORT_NOT_FOUND');
  END IF;

  v_is_mentor := EXISTS (
    SELECT 1 FROM public.t3a_mentor_assignment m
     WHERE m.mentor_id      = v_actor
       AND m.participant_id = v_participant
  );

  IF v_actor <> v_participant
     AND NOT public.t3a_has_administrative_standing()
     AND NOT v_is_mentor THEN
    -- Holding the identifier is not entitlement. An employer reaching
    -- here with a pool ber_report_id is refused, and refused again
    -- after a release is revoked, because the release route is
    -- section 2 and this one never served them.
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'CALLER_NOT_ENTITLED_TO_THIS_REPORT',
      'remedy', 'A named recipient reads a report through the release the participant issued, not by its identifier.');
  END IF;

  RETURN public.t3a_d1_report_face_assemble(p_ber_report_id);
END;
$function$;
