-- Rollback for 20261103 (verification gates) and 20261104 (accounts and roles). Applied to production 20 Oct 2026.
-- Safe only while no one depends on the Domain A tables. Dropping them loses the backfilled account and role rows,
-- which can be rebuilt from profiles and auth.users by re-applying the migration.
drop trigger if exists t3a_account_sync_auth on auth.users;
drop trigger if exists t3a_account_sync_trg on public.profiles;
do $$ declare r record; begin
  for r in select event_object_table t from information_schema.triggers where trigger_name like 't3a_0_verify_gate_%' loop
    execute format('drop trigger if exists t3a_0_verify_gate_subject_trg on public.%I', r.t);
    execute format('drop trigger if exists t3a_0_verify_gate_actor_trg on public.%I', r.t);
  end loop; end $$;
delete from public.t3a_field_physical_map where qualified_name like 'A.%';
drop table if exists public.t3a_identity_assurance_socket, public.t3a_participant_enrollment, public.t3a_participant_document,
  public.t3a_participant_profile, public.t3a_role_assignment_revocation, public.t3a_role_assignment, public.t3a_account cascade;
drop function if exists public.t3a_account_sync(uuid), public.t3a_account_sync_profiles_trg(), public.t3a_account_sync_auth_trg(),
  public.t3a_grant_role(uuid,text,text,uuid,text), public.t3a_revoke_role(uuid,uuid,text), public.t3a_domain_a_role(text);
-- restore the earlier guard: run evidence/guard-function-before-prod.sql
