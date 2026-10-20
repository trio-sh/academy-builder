-- Step 3k: close the direct write paths around Stage 3 and Stage 4 so the routes of Step 3j are the only way to move a record.
--
-- Before: a participant could write any state, including AVAILABLE_FOR_CAPTURE, straight into their own submission row, bypassing the provenance check; a facilitator could insert sessions and
-- members directly, bypassing composition rules; and the member event function (disconnect, withdraw) was executable by anyone, signed in or not, for any member of any session.
-- After: reads stay as they were; writes happen only through the security definer routes or the service role; the member event function checks who is calling.

drop policy if exists t3a_d1_work_sample_own on public.t3a_d1_work_sample_submission;
create policy t3a_d1_work_sample_read on public.t3a_d1_work_sample_submission for select using (
  participant_id = auth.uid() or public.t3a_is_oversight_admin() or public.t3a_is_service_context()
  or exists (select 1 from public.t3a_mentor_assignment m where m.mentor_id = auth.uid() and m.participant_id = t3a_d1_work_sample_submission.participant_id));
drop policy if exists t3a_d1_work_sample_write on public.t3a_d1_work_sample_submission;
create policy t3a_d1_work_sample_write on public.t3a_d1_work_sample_submission for all using (public.t3a_is_service_context()) with check (public.t3a_is_service_context());

drop policy if exists t3a_d1_group_session_access on public.t3a_d1_group_session;
create policy t3a_d1_group_session_read on public.t3a_d1_group_session for select using (facilitator_id = auth.uid() or public.t3a_is_oversight_admin() or public.t3a_is_service_context());
drop policy if exists t3a_d1_group_session_write on public.t3a_d1_group_session;
create policy t3a_d1_group_session_write on public.t3a_d1_group_session for all using (public.t3a_is_service_context()) with check (public.t3a_is_service_context());
drop policy if exists t3a_d1_group_member_write on public.t3a_d1_group_session_member;
create policy t3a_d1_group_member_write on public.t3a_d1_group_session_member for all using (public.t3a_is_service_context()) with check (public.t3a_is_service_context());

create or replace function public.t3a_d1_group_member_event(p_group_session_id uuid, p_participant_id uuid, p_event text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_role text; v_fac uuid;
begin
  select g.facilitator_id into v_fac from public.t3a_d1_group_session g where g.group_session_id = p_group_session_id;
  if not public.t3a_is_service_context() and auth.uid() is distinct from v_fac and auth.uid() is distinct from p_participant_id then
    return public.t3a_capture_refuse('s4.member_event', 'not_permitted_for_this_session', coalesce(p_group_session_id::text, ''), 'only the facilitator, or the person themselves, records a disconnection or withdrawal');
  end if;
  select member_role into v_role from public.t3a_d1_group_session_member where group_session_id = p_group_session_id and participant_id = p_participant_id;
  if v_role is null then return jsonb_build_object('recorded', false, 'refusal_code', 'NOT_A_MEMBER_OF_THIS_SESSION'); end if;
  if p_event = 'disconnect' then
    update public.t3a_d1_group_session_member set disconnected_at = now() where group_session_id = p_group_session_id and participant_id = p_participant_id;
  elsif p_event = 'withdraw' then
    update public.t3a_d1_group_session_member set withdrew_at = now() where group_session_id = p_group_session_id and participant_id = p_participant_id;
  else
    return jsonb_build_object('recorded', false, 'refusal_code', 'UNKNOWN_EVENT');
  end if;
  if v_role = 'observed' and p_event = 'disconnect' then
    update public.t3a_d1_group_session set paused_at = now() where group_session_id = p_group_session_id;
    return jsonb_build_object('recorded', true, 'effect', 'STAGE_INSTANCE_PAUSED');
  end if;
  if v_role = 'observed' and p_event = 'withdraw' then
    return jsonb_build_object('recorded', true, 'effect', 'DETERMINATIONS_EXCLUDED_FROM_CURRENT_COMPOSITION_RETAINED_IN_HISTORY');
  end if;
  return jsonb_build_object('recorded', true, 'effect', 'ADMINISTRATION_VARIANCE_ON_OBSERVED_RECORD', 'co_participant_records_removed', 0);
end $fn$;

-- Nothing in this set is for a caller who is not signed in.
revoke execute on function public.t3a_d1_group_member_event(uuid, uuid, text) from public, anon;
revoke execute on function public.t3a_d1_group_capture_permitted(uuid, uuid) from public, anon;
revoke execute on function public.t3a_d1_work_sample_provenance_check(uuid) from public, anon;
revoke execute on function public.t3a_d1_s1_workbench_may_open(uuid) from public, anon;
revoke execute on function public.t3a_d1_s1_may_confirm(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.t3a_d1_s1_capture_contemporaneity(uuid) from public, anon;
grant execute on function public.t3a_d1_group_member_event(uuid, uuid, text), public.t3a_d1_group_capture_permitted(uuid, uuid), public.t3a_d1_work_sample_provenance_check(uuid),
  public.t3a_d1_s1_workbench_may_open(uuid), public.t3a_d1_s1_may_confirm(uuid, jsonb, jsonb, jsonb), public.t3a_d1_s1_capture_contemporaneity(uuid) to authenticated, service_role;
