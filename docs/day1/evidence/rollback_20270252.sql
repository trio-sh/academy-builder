-- Rollback of migration 20270252: the read rule goes back to its 20260923 definition and the helper function is removed.
drop policy if exists candidate_profiles_read on public.candidate_profiles;
create policy candidate_profiles_read on public.candidate_profiles
  for select using (
    profile_id = auth.uid()
    or public.t3a_is_oversight_admin()
    or public.t3a_is_service_context()
    or exists (
         select 1 from public.t3a_mentor_assignment m
          where m.mentor_id = auth.uid() and m.participant_id = candidate_profiles.profile_id));
drop function if exists public.t3a_is_desk_assigned_mentor(uuid);
-- The three permissive policies of 002_complete_schema.sql that the migration dropped (absent on the live project) are not recreated: restoring USING (true) on candidate_profiles would reopen the participant listing.
