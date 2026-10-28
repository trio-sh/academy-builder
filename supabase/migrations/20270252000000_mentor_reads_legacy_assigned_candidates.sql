-- The mentor desk's "My Assignments" list (mentor_assignments, candidate_id = candidate_profiles.id) reads each person's candidate_profiles row to show a name and email.
-- candidate_profiles_read (20260923, Item 8 / 9A) lets a mentor read a participant only through a t3a_mentor_assignment, so a person assigned on the desk list but not
-- yet in t3a_mentor_assignment shows as a blank card (CR-336). This lets the mentor read the candidate_profiles row of a person on their own active desk assignment.
-- It is not a listing route: it is scoped to the caller's own active assignments, and the caller must also hold the administrator-granted mentor role
-- (t3a_role_assignment, which an ordinary signed-in user cannot write). That second condition matters: mentor_assignments and mentor_profiles can be written by any
-- signed-in user, so an assignment row alone is not proof of a mentor's right to read a participant. Nothing else about candidate_profiles access changes.
create or replace function public.t3a_is_desk_assigned_mentor(p_candidate_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
           select 1 from public.t3a_role_assignment ra
            where ra.account_id = auth.uid() and ra.role_code::text = 'mentor'
              and (ra.role_effective_until is null or ra.role_effective_until > now()))
     and exists (
           select 1 from public.mentor_assignments ma
             join public.mentor_profiles mp on mp.id = ma.mentor_id
            where mp.profile_id = auth.uid() and ma.candidate_id = p_candidate_profile_id and ma.status = 'active');
$fn$;
revoke all on function public.t3a_is_desk_assigned_mentor(uuid) from public;
grant execute on function public.t3a_is_desk_assigned_mentor(uuid) to authenticated;

-- The USING (true) policies of 002_complete_schema.sql are dropped by 003_fix_rls_policies.sql, but that file does not apply cleanly when the migrations are replayed, so a database built
-- from the files keeps them and every signed-in user can read every candidate_profiles row (the listing Item 8 / 9A closed). The live project does not have them, so this is a no-op there.
drop policy if exists candidate_profiles_select on public.candidate_profiles;
drop policy if exists candidate_profiles_insert on public.candidate_profiles;
drop policy if exists candidate_profiles_update on public.candidate_profiles;

drop policy if exists candidate_profiles_read on public.candidate_profiles;
create policy candidate_profiles_read on public.candidate_profiles
  for select using (
    profile_id = auth.uid()
    or public.t3a_is_oversight_admin()
    or public.t3a_is_service_context()
    or exists (
         select 1 from public.t3a_mentor_assignment m
          where m.mentor_id = auth.uid() and m.participant_id = candidate_profiles.profile_id)
    or public.t3a_is_desk_assigned_mentor(id));
