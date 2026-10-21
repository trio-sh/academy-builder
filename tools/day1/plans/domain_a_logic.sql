-- ---------------------------------------------------------------------------------------------
-- Domain A behaviour (hand written; the tables above are generated)
-- ---------------------------------------------------------------------------------------------

-- 1. DT-03 refusal log. The earlier guard (20260918000000) wrote the refusal row and then raised, and the raise
--    rolled the row back, so a refused attempt left no trace. Refusals now keep the transaction: the row is
--    written and the attempt has no effect (insert: no profile row; update: role unchanged).
create or replace function public.t3a_profiles_role_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_service boolean := public.t3a_is_service_context();
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_service or new.role is not distinct from 'candidate' then
      insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
      values (new.id, v_actor, null, new.role, 'INSERT', 'permitted', null, v_service);
      return new;
    end if;
    insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
    values (new.id, v_actor, null, new.role, 'INSERT', 'refused', 'ROLE_SELF_ASSERTION_REFUSED', false);
    raise notice 'ROLE_SELF_ASSERTION_REFUSED: a role other than candidate cannot be self-assigned. Mentor is by invitation; employer is by application.';
    return null;
  end if;
  if new.role is distinct from old.role then
    if v_service then
      insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
      values (new.id, v_actor, old.role, new.role, 'UPDATE', 'permitted', null, true);
      return new;
    end if;
    insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
    values (new.id, v_actor, old.role, new.role, 'UPDATE', 'refused', 'ROLE_SELF_ASSERTION_REFUSED', false);
    raise notice 'ROLE_SELF_ASSERTION_REFUSED: role is granted by The 3rd Academy and cannot be changed from a client session.';
    new.role := old.role;
  end if;
  return new;
end $$;

-- 2. Legacy role to Domain A role (provisional, CR-029).
create or replace function public.t3a_domain_a_role(p_legacy text)
returns table (role_code text, role_grant_basis text) language sql immutable as $$
  select case p_legacy when 'candidate' then 'participant' when 'mentor' then 'mentor' when 'employer' then 'employer_user'
                       when 'school_admin' then 'coordinator' when 'admin' then 'oversight_administrator' end,
         case p_legacy when 'candidate' then 'self_serve_individual' else 'administrator_grant' end
$$;

-- 3. Grant and revoke: server side only.
create or replace function public.t3a_grant_role(p_account uuid, p_role text, p_basis text, p_granted_by uuid, p_rules_version text default '1.0')
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_pseud uuid;
begin
  if not public.t3a_is_service_context() then
    raise exception 'ROLE_SELF_ASSERTION_REFUSED: roles are granted server side only' using errcode = '42501';
  end if;
  v_pseud := case when p_role = 'participant' then
    coalesce((select participant_pseudonym_ref from public.t3a_role_assignment where account_id = p_account and participant_pseudonym_ref is not null limit 1), gen_random_uuid()) end;
  insert into public.t3a_role_assignment (account_id, role_code, role_grant_basis, role_granted_by, role_rules_version, participant_pseudonym_ref)
  values (p_account, p_role, p_basis, p_granted_by, p_rules_version, v_pseud) returning role_assignment_id into v_id;
  return v_id;
end $$;

create or replace function public.t3a_revoke_role(p_assignment uuid, p_revoked_by uuid, p_basis text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.t3a_is_service_context() then
    raise exception 'ROLE_SELF_ASSERTION_REFUSED: roles are revoked server side only' using errcode = '42501';
  end if;
  insert into public.t3a_role_assignment_revocation (role_assignment_id, role_revoked_by, role_revoked_at, role_revocation_basis)
  values (p_assignment, p_revoked_by, now(), p_basis);
end $$;

-- 4. Keep the account root in step with auth.users and profiles (insert and verification).
create or replace function public.t3a_account_sync(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare u record; l text; m record;
begin
  select id, email, created_at, email_confirmed_at into u from auth.users where id = p_id;
  if not found then return; end if;
  select role::text into l from public.profiles where id = p_id;
  insert into public.t3a_account (account_id, account_created_at, account_creation_route, email_address, email_verification_state, email_verified_at, capture_gaps)
  values (u.id, u.created_at, case when l in ('mentor','employer') then 'legacy_unknown' else 'public_signup' end, lower(btrim(u.email)),
          case when u.email_confirmed_at is not null then 'verified' else 'unverified' end, u.email_confirmed_at, array['age_eligibility_attestation'])
  on conflict (account_id) do update set
    email_verification_state = excluded.email_verification_state, email_verified_at = excluded.email_verified_at, updated_at = now()
  where t3a_account.email_verification_state is distinct from excluded.email_verification_state;
  if l is not null and not exists (select 1 from public.t3a_role_assignment where account_id = p_id) then
    select * into m from public.t3a_domain_a_role(l);
    if m.role_code is not null then
      insert into public.t3a_role_assignment (account_id, role_code, role_grant_basis, role_granted_by, role_rules_version, participant_pseudonym_ref)
      values (p_id, m.role_code, m.role_grant_basis, p_id, '1.0', case when m.role_code = 'participant' then gen_random_uuid() end);
    end if;
  end if;
end $$;

create or replace function public.t3a_account_sync_profiles_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.t3a_account_sync(new.id); return new; end $$;
drop trigger if exists t3a_account_sync_trg on public.profiles;
create trigger t3a_account_sync_trg after insert on public.profiles for each row execute function public.t3a_account_sync_profiles_trg();

create or replace function public.t3a_account_sync_auth_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then perform public.t3a_account_sync(new.id); end if;
  return new;
end $$;
drop trigger if exists t3a_account_sync_auth on auth.users;
create trigger t3a_account_sync_auth after update on auth.users for each row execute function public.t3a_account_sync_auth_trg();

-- 5. Backfill existing accounts (no events: no history is invented).
select public.t3a_account_sync(id) from public.profiles;
