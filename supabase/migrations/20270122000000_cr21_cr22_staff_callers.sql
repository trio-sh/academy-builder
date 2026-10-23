-- CR-21 / CR-22 callers: the two staff acts are made for a named actor, checked in the database.
--  interruption: the session's facilitator, or staff (coordinator, admin, oversight administrator)
--  suspension:   staff (reviewer, coordinator, admin, oversight administrator)
-- Anyone else gets the same answer as for something that does not exist. Service routes only.
create or replace function public.t3a_actor_is_staff(p_actor uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $fn$
  select p_actor is not null and (
    exists (select 1 from public.t3a_oversight_holder h where h.holder_id = p_actor and h.revoked_at is null)
    or exists (select 1 from public.profiles pr where pr.id = p_actor and pr.role = 'admin')
    or exists (select 1 from public.t3a_role_grant g where g.user_id = p_actor and g.revoked_at is null and g.spec_role::text = any (p_roles)))
$fn$;
revoke all on function public.t3a_actor_is_staff(uuid, text[]) from public, anon, authenticated;
grant execute on function public.t3a_actor_is_staff(uuid, text[]) to service_role;

create or replace function public.t3a_cr22_interrupt_for(p_actor uuid, p_group_session uuid, p_kind text, p_affected uuid default null, p_first_decision_reached boolean default false, p_content_revealed boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare gs public.t3a_d1_group_session;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_INTERRUPT_FOR_SERVICE_ONLY: the interruption is a service route' using errcode = '42501'; end if;
  select * into gs from public.t3a_d1_group_session where group_session_id = p_group_session;
  if p_actor is null or gs.group_session_id is null or not (gs.facilitator_id = p_actor or public.t3a_actor_is_staff(p_actor, array['coordinator', 'admin'])) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'NOT_AVAILABLE');
  end if;
  return public.t3a_cr22_interrupt(p_group_session, p_kind, p_affected, p_first_decision_reached, p_content_revealed);
end $fn$;
revoke all on function public.t3a_cr22_interrupt_for(uuid, uuid, text, uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.t3a_cr22_interrupt_for(uuid, uuid, text, uuid, boolean, boolean) to service_role;

create or replace function public.t3a_cr21_suspend_source_for(p_actor uuid, p_source_version uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_SUSPEND_FOR_SERVICE_ONLY: the suspension is a service route' using errcode = '42501'; end if;
  if not public.t3a_actor_is_staff(p_actor, array['reviewer', 'coordinator', 'admin']) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'NOT_AVAILABLE');
  end if;
  return public.t3a_cr21_suspend_source(p_source_version, p_reason);
end $fn$;
revoke all on function public.t3a_cr21_suspend_source_for(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_cr21_suspend_source_for(uuid, uuid, text) to service_role;
