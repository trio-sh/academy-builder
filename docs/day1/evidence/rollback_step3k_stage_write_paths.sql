-- Rollback of 20261214000000_step3_stage_write_paths.sql
drop policy if exists t3a_d1_work_sample_read on public.t3a_d1_work_sample_submission;
drop policy if exists t3a_d1_work_sample_write on public.t3a_d1_work_sample_submission;
drop policy if exists t3a_d1_group_session_read on public.t3a_d1_group_session;
drop policy if exists t3a_d1_group_session_write on public.t3a_d1_group_session;
drop policy if exists t3a_d1_group_member_write on public.t3a_d1_group_session_member;
create policy t3a_d1_group_member_write on public.t3a_d1_group_session_member for all using ((t3a_is_service_context() OR (EXISTS ( SELECT 1
   FROM t3a_d1_group_session g
  WHERE ((g.group_session_id = g.group_session_id) AND (g.facilitator_id = auth.uid())))))) with check ((t3a_is_service_context() OR (EXISTS ( SELECT 1
   FROM t3a_d1_group_session g
  WHERE ((g.group_session_id = g.group_session_id) AND (g.facilitator_id = auth.uid()))))));
create policy t3a_d1_group_session_access on public.t3a_d1_group_session for all using (((facilitator_id = auth.uid()) OR t3a_is_oversight_admin() OR t3a_is_service_context())) with check (((facilitator_id = auth.uid()) OR t3a_is_service_context()));
create policy t3a_d1_work_sample_own on public.t3a_d1_work_sample_submission for all using (((participant_id = auth.uid()) OR t3a_is_oversight_admin() OR t3a_is_service_context() OR (EXISTS ( SELECT 1
   FROM t3a_mentor_assignment m
  WHERE ((m.mentor_id = auth.uid()) AND (m.participant_id = m.participant_id)))))) with check (((participant_id = auth.uid()) OR t3a_is_service_context()));
CREATE OR REPLACE FUNCTION public.t3a_d1_group_member_event(p_group_session_id uuid, p_participant_id uuid, p_event text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role text;
BEGIN
  SELECT member_role INTO v_role FROM public.t3a_d1_group_session_member
   WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NOT_A_MEMBER_OF_THIS_SESSION');
  END IF;

  IF p_event = 'disconnect' THEN
    UPDATE public.t3a_d1_group_session_member SET disconnected_at = now()
     WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;
  ELSIF p_event = 'withdraw' THEN
    UPDATE public.t3a_d1_group_session_member SET withdrew_at = now()
     WHERE group_session_id = p_group_session_id AND participant_id = p_participant_id;
  ELSE
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'UNKNOWN_EVENT');
  END IF;

  IF v_role = 'observed' AND p_event = 'disconnect' THEN
    UPDATE public.t3a_d1_group_session SET paused_at = now()
     WHERE group_session_id = p_group_session_id;
    RETURN jsonb_build_object('recorded', true, 'effect', 'STAGE_INSTANCE_PAUSED');
  END IF;

  IF v_role = 'observed' AND p_event = 'withdraw' THEN
    RETURN jsonb_build_object('recorded', true,
      'effect', 'DETERMINATIONS_EXCLUDED_FROM_CURRENT_COMPOSITION_RETAINED_IN_HISTORY');
  END IF;

  -- A co-participant. Nothing of theirs is removed, because they hold
  -- nothing; the observed record carries the variance.
  RETURN jsonb_build_object('recorded', true,
    'effect', 'ADMINISTRATION_VARIANCE_ON_OBSERVED_RECORD',
    'co_participant_records_removed', 0);
END;
$function$
;
grant execute on function public.t3a_d1_group_member_event(uuid, uuid, text), public.t3a_d1_group_capture_permitted(uuid, uuid), public.t3a_d1_work_sample_provenance_check(uuid), public.t3a_d1_s1_workbench_may_open(uuid), public.t3a_d1_s1_may_confirm(uuid, jsonb, jsonb, jsonb), public.t3a_d1_s1_capture_contemporaneity(uuid) to anon, authenticated;
