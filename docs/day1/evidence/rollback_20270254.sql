-- Rollback of migration 20270254: removes the new scoped policies, the self-mentoring check and trigger, and puts the open policies back (what the live project had before).
drop trigger if exists t3a_desk_assignment_not_self_trg on public.mentor_assignments;
drop function if exists public.t3a_desk_assignment_not_self();
alter table public.t3a_mentor_assignment drop constraint if exists t3a_mentor_assignment_not_self;
drop policy if exists mentor_observations_mentor_all on public.mentor_observations;
drop policy if exists mentor_observations_admin_all on public.mentor_observations;
create policy mentor_observations_all on public.mentor_observations for all using (true) with check (true);
create policy mentor_observations_rw on public.mentor_observations for all using (true) with check (true);
create policy observation_feedback_rw on public.observation_feedback for all using (true) with check (true);
create policy observation_synthesis_rw on public.observation_synthesis for all using (true) with check (true);

-- assigned dimensions policy back to the 20270253 form
drop policy if exists assigned_dims_mentor_all on public.mentor_assigned_dimensions;
create policy assigned_dims_mentor_all on public.mentor_assigned_dimensions for all
  using ((mentor_id = auth.uid()) or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
drop function if exists public.t3a_owns_desk_assignment(uuid);
