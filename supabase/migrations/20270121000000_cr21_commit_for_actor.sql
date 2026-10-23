-- CR-21 caller: the commit is made for a named actor. Only the observer of the record, or the mentor assigned to the session, may commit it;
-- anyone else gets the same answer as for a session that does not exist. Service route; the once-only rule is unchanged (t3a_cr21_commit_once).
create or replace function public.t3a_cr21_commit_for(p_actor uuid, p_stage_instance uuid, p_key text, p_observation_record uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare o public.t3a_observation_record;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_COMMIT_FOR_SERVICE_ONLY: the commit is a service route' using errcode = '42501'; end if;
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_record;
  if p_actor is null or o.observation_record_id is null
     or not (o.observer_id = p_actor or exists (select 1 from public.t3a_mentor_assignment m where m.stage_instance_id = p_stage_instance and m.mentor_id = p_actor)) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'SESSION_NOT_AVAILABLE');
  end if;
  return public.t3a_cr21_commit_once(p_stage_instance, p_key, p_observation_record);
end $fn$;
revoke all on function public.t3a_cr21_commit_for(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr21_commit_for(uuid, uuid, text, uuid) to service_role;
