-- CR-340. Two changes found while testing accounts that hold two roles.
--
-- 1. observation_feedback, observation_synthesis and mentor_observations each carried an open policy (USING (true) WITH CHECK (true)) that let any signed-in account read,
--    change and delete every observation, feedback and synthesis record. observation_feedback and observation_synthesis already have their scoped policies (the mentor whose
--    profile id is mentor_id or an admin for all actions; the candidate for approved rows), so the open ones are dropped. mentor_observations had only open policies: it now has
--    the mentor of the observation (mentor_id is mentor_profiles.id, the mentor whose profile is the signed-in account) and admins. A candidate does not read a mentor's raw
--    observation notes; what a candidate may see is the approved feedback and synthesis, which keep their own policies. All three tables are empty on the live project.
-- 2. Nothing stopped one account being both the mentor and the participant of the same assignment (an account can hold both roles). A person may not mentor themselves:
--    t3a_mentor_assignment (profile ids) gets a check, and the older mentor_assignments (desk ids) gets a trigger that compares the two profiles.
drop policy if exists observation_feedback_rw on public.observation_feedback;
drop policy if exists observation_synthesis_rw on public.observation_synthesis;
drop policy if exists mentor_observations_all on public.mentor_observations;
drop policy if exists mentor_observations_rw on public.mentor_observations;
drop policy if exists mentor_observations_select on public.mentor_observations;
drop policy if exists mentor_observations_insert on public.mentor_observations;

drop policy if exists mentor_observations_mentor_all on public.mentor_observations;
create policy mentor_observations_mentor_all on public.mentor_observations for all
  using (exists (select 1 from public.mentor_profiles mp where mp.id = mentor_observations.mentor_id and mp.profile_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles mp where mp.id = mentor_observations.mentor_id and mp.profile_id = auth.uid()));
drop policy if exists mentor_observations_admin_all on public.mentor_observations;
create policy mentor_observations_admin_all on public.mentor_observations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::user_role))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::user_role));

alter table public.t3a_mentor_assignment drop constraint if exists t3a_mentor_assignment_not_self;
alter table public.t3a_mentor_assignment add constraint t3a_mentor_assignment_not_self check (mentor_id <> participant_id);

create or replace function public.t3a_desk_assignment_not_self() returns trigger language plpgsql as $fn$
begin
  if exists (select 1 from public.mentor_profiles mp join public.candidate_profiles cp on cp.profile_id = mp.profile_id
              where mp.id = new.mentor_id and cp.id = new.candidate_id) then
    raise exception 'MENTOR_IS_THE_PARTICIPANT: a person cannot be their own mentor' using errcode = 'check_violation';
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_desk_assignment_not_self_trg on public.mentor_assignments;
create trigger t3a_desk_assignment_not_self_trg before insert or update of mentor_id, candidate_id on public.mentor_assignments
  for each row execute function public.t3a_desk_assignment_not_self();

-- assigned_dims_mentor_all let a mentor write a dimension row for ANY assignment as long as the row named them as mentor_id, so a mentor could attach a dimension to another mentor's
-- mentee. The mentor's rows must sit on an assignment that is theirs (mentor_assignments.mentor_id is their mentor_profiles row). Admins keep full access.
create or replace function public.t3a_owns_desk_assignment(p_assignment uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.mentor_assignments ma join public.mentor_profiles mp on mp.id = ma.mentor_id
                 where ma.id = p_assignment and mp.profile_id = auth.uid());
$fn$;
drop policy if exists assigned_dims_mentor_all on public.mentor_assigned_dimensions;
create policy assigned_dims_mentor_all on public.mentor_assigned_dimensions for all
  using ((mentor_id = auth.uid() and public.t3a_owns_desk_assignment(assignment_id)) or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check ((mentor_id = auth.uid() and public.t3a_owns_desk_assignment(assignment_id)) or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
