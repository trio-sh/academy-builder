-- ---------------------------------------------------------------------------------------------
-- Domain I behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- Free email providers are refused on application (the dictionary field free_provider_refused records it).
create table if not exists public.t3a_employer_free_provider (domain text primary key check (domain = lower(domain)));
insert into public.t3a_employer_free_provider (domain) values ('gmail.com'), ('yahoo.com'), ('hotmail.com'), ('outlook.com'), ('live.com'), ('aol.com'), ('icloud.com'), ('proton.me'), ('protonmail.com'), ('gmx.com'), ('mail.com'), ('yandex.com'), ('zoho.com')
  on conflict do nothing;
alter table public.t3a_employer_free_provider enable row level security;
revoke all on public.t3a_employer_free_provider from anon, authenticated;

-- the live column is email_domain (organization_domain is the dictionary name); keep both aligned
create or replace function public.t3a_employer_application_fill_live() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email_domain := coalesce(new.email_domain, split_part(lower(new.work_email), '@', 2));
  if new.work_email is not null and exists (select 1 from public.t3a_employer_free_provider f where f.domain = split_part(lower(new.work_email), '@', 2)) then
    new.free_provider_refused := true;
    new.application_status := 'declined';
    new.approval_decision := coalesce(new.approval_decision, 'declined');
  elsif new.free_provider_refused is null then
    new.free_provider_refused := false;
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_employer_application_fill_trg on public.t3a_employer_application;
create trigger t3a_1_employer_application_fill_trg before insert on public.t3a_employer_application for each row execute function public.t3a_employer_application_fill_live();

-- The live check allowed approved and withdrawn only; the dictionary adds declined (CR-055). The table is empty in production.
alter table public.t3a_employer_application drop constraint if exists t3a_employer_application_approval_decision_check;
alter table public.t3a_employer_application add constraint t3a_employer_application_approval_decision_check check (approval_decision is null or approval_decision in ('approved', 'declined', 'withdrawn'));

-- An approved application creates the organization (pending verification); only a verified organization is served.
create or replace function public.t3a_employer_is_verified(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select verification_status = 'verified' from public.t3a_employer_organization where organization_id = p_org), false)
$$;

-- Pool queries: only participant stated fields may be criteria (DT-34); only a verified organization may ask (DT-35).
-- A refusal is logged and returned; it carries no count or metadata.
create or replace function public.t3a_pool_query(p_org uuid, p_criteria jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; bad text[] := '{}'; allowed text[] := array['occupation_interest', 'country_of_residence', 'subdivision_of_residence', 'city_of_residence',
  'preferred_language', 'target_industry_code', 'role_seniority_context_code', 'recruitment_channel_code', 'timezone']; v_id uuid;
begin
  if not public.t3a_employer_is_verified(p_org) then
    return public.t3a_capture_refuse('employer.pool_query', 'EMPLOYER_NOT_VERIFIED', p_org::text, 'a pending or unverified organization receives nothing');
  end if;
  for k in select jsonb_object_keys(coalesce(p_criteria, '{}'::jsonb)) loop
    if not k = any (allowed) then bad := bad || k; end if;
  end loop;
  if cardinality(bad) > 0 then
    return public.t3a_capture_refuse('employer.pool_query', 'POOL_CRITERION_NOT_ALLOWED', p_org::text, 'criteria are limited to participant stated fields; refused: ' || array_to_string(bad, ', '));
  end if;
  insert into public.t3a_employer_pool_query (organization_id, criteria) values (p_org, coalesce(p_criteria, '{}'::jsonb)) returning pool_query_id into v_id;
  return jsonb_build_object('outcome', 'accepted', 'pool_query_id', v_id);
end $$;
revoke all on function public.t3a_pool_query(uuid, jsonb) from public, anon;
grant execute on function public.t3a_pool_query(uuid, jsonb) to authenticated, service_role;

-- The same gate for a report or count request.
create or replace function public.t3a_employer_gate(p_org uuid, p_route text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.t3a_employer_is_verified(p_org) then
    return public.t3a_capture_refuse('employer.' || p_route, 'EMPLOYER_NOT_VERIFIED', p_org::text, 'a pending or unverified organization receives nothing');
  end if;
  return jsonb_build_object('outcome', 'allowed');
end $$;
revoke all on function public.t3a_employer_gate(uuid, text) from public, anon;
grant execute on function public.t3a_employer_gate(uuid, text) to authenticated, service_role;
