-- ---------------------------------------------------------------------------------------------
-- Domain L behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

-- Is this account inside a paid access window now? An order grants access and nothing else: it never touches a report, a measure or a Stage.
create or replace function public.t3a_account_has_paid_access(p_account uuid, p_at timestamptz default now()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.t3a_order o where o.account_id = p_account and o.access_starts_at <= p_at and o.access_ends_at > p_at
                   and not exists (select 1 from public.t3a_refund r where r.order_id = o.order_id))
$$;
revoke all on function public.t3a_account_has_paid_access(uuid, timestamptz) from public, anon;
grant execute on function public.t3a_account_has_paid_access(uuid, timestamptz) to authenticated, service_role;
