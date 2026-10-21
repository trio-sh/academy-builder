-- ---------------------------------------------------------------------------------------------
-- Domain R behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_program_membership;
create trigger t3a_set_once_trg before update on public.t3a_program_membership for each row execute function public.t3a_set_once('program_exit_at');
drop trigger if exists t3a_set_once_trg on public.t3a_partner_organization;
create trigger t3a_set_once_trg before update on public.t3a_partner_organization for each row execute function public.t3a_set_once('partner_relationship_effective_at', 'partner_relationship_ended_at', 'data_use_agreement_ref');

-- No role reads another organization's rows: these tables have no client grant at all. Reads go through service functions that name one organization.
create or replace function public.t3a_partner_visible(p_partner uuid) returns boolean language sql stable security definer set search_path = public as $$
  select false
$$;
comment on function public.t3a_partner_visible(uuid) is 'Domain R: no organization may see another organization''s records. Always false until a tenant model is ordered (the socket stays empty, DT-55).';
revoke all on function public.t3a_partner_visible(uuid) from public, anon;
grant execute on function public.t3a_partner_visible(uuid) to authenticated, service_role;
