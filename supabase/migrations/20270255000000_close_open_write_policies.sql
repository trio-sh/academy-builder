-- CR-343. Thirty-one legacy tables carried a write policy that let every signed-in account insert, change and delete every row (USING true / WITH CHECK true), several of them next to
-- the scoped policies they were meant to have. A signed-in account could rewrite anyone's mentor assignment, notifications, escrow record, employer profile or cohort, and read the escrow
-- payment details. Every such policy is dropped here and replaced by the access each table's pages actually use: the owner, the counterpart named by the row, or an administrator.
-- Reads that other desks depend on are kept as they were (listings, endorsements, passports, content); reads of private rows are scoped.
-- No table below holds more than nine rows on the live project, and the pages that write them are unchanged: each writer keeps its path.

-- ---------------------------------------------------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so a policy can look at the desk tables without the caller needing rights to them.
create or replace function public.t3a_owns_candidate(p_id uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_id is not null and (p_id = auth.uid() or exists (select 1 from public.candidate_profiles where id = p_id and profile_id = auth.uid()));
$fn$;
create or replace function public.t3a_owns_mentor(p_id uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_id is not null and (p_id = auth.uid() or exists (select 1 from public.mentor_profiles where id = p_id and profile_id = auth.uid()));
$fn$;
create or replace function public.t3a_owns_employer(p_id uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_id is not null and (p_id = auth.uid() or exists (select 1 from public.employer_profiles where id = p_id and profile_id = auth.uid()));
$fn$;
create or replace function public.t3a_owns_school(p_id uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_id is not null and (p_id = auth.uid() or exists (select 1 from public.school_profiles where id = p_id and profile_id = auth.uid()));
$fn$;
-- the signed-in account is the mentor on an assignment of this candidate (the candidate named as a profile id or as a desk row id)
create or replace function public.t3a_mentors_candidate(p_candidate uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.mentor_assignments ma join public.mentor_profiles mp on mp.id = ma.mentor_id
                  where mp.profile_id = auth.uid()
                    and (ma.candidate_id = p_candidate or ma.candidate_id in (select id from public.candidate_profiles where profile_id = p_candidate)));
$fn$;
create or replace function public.t3a_in_conversation(p_conversation uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.conversation_participants where conversation_id = p_conversation and user_id = auth.uid());
$fn$;
-- who may leave a notification for whom: themselves, an administrator, the two sides of a mentor assignment, people in one conversation, an employer and a candidate on one project
create or replace function public.t3a_may_notify(p_target uuid) returns boolean language plpgsql stable security definer set search_path = public as $fn$
begin
  if auth.uid() is null or p_target is null then return false; end if;
  if p_target = auth.uid() or public.is_admin() then return true; end if;
  return exists (select 1 from public.mentor_assignments ma join public.mentor_profiles mp on mp.id = ma.mentor_id join public.candidate_profiles cp on cp.id = ma.candidate_id
                  where (mp.profile_id = auth.uid() and cp.profile_id = p_target) or (cp.profile_id = auth.uid() and mp.profile_id = p_target))
      or exists (select 1 from public.conversation_participants a join public.conversation_participants b on b.conversation_id = a.conversation_id
                  where a.user_id = auth.uid() and b.user_id = p_target)
      or exists (select 1 from public.liveworks_projects lp join public.employer_profiles ep on ep.id = lp.employer_id
                  left join public.liveworks_applications la on la.project_id = lp.id left join public.candidate_profiles cp on cp.id = la.candidate_id or cp.id = lp.selected_candidate_id
                  where (ep.profile_id = auth.uid() and cp.profile_id = p_target) or (cp.profile_id = auth.uid() and ep.profile_id = p_target));
end;
$fn$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Drop every write policy that is literally true, on exactly the tables that held one. (Dropped by catalog, not by name, because the throwaway build restores some of them on its second pass.)
do $drop$
declare r record;
begin
  for r in
    select c.relname t, p.polname n from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace s on s.oid = c.relnamespace
     where s.nspname = 'public' and p.polcmd <> 'r'
       and (pg_get_expr(p.polqual, p.polrelid) = 'true' or pg_get_expr(p.polwithcheck, p.polrelid) = 'true')
  loop
    execute format('drop policy %I on public.%I', r.n, r.t);
  end loop;
end
$drop$;

-- The same four tables also carried an open READ policy: any signed-in account could read every person's notifications, mentor assignments, training progress and employer connections.
-- Their scoped read policies (own rows, the mentor of the candidate, an administrator) are the ones that remain.
drop policy if exists "Allow all select" on public.notifications;
drop policy if exists notifications_select on public.notifications;
drop policy if exists "Allow all select" on public.mentor_assignments;
drop policy if exists mentor_assignments_select on public.mentor_assignments;
drop policy if exists "Allow all select" on public.bridgefast_progress;
drop policy if exists bridgefast_progress_select on public.bridgefast_progress;
drop policy if exists "Allow all select" on public.t3x_connections;
drop policy if exists t3x_connections_select on public.t3x_connections;

-- helper for the repeated "administrator" branch
-- (public.is_admin() already exists: the signed-in account's profile role is admin)

-- ---------------------------------------------------------------------------------------------------------------------
-- Administration, content and queues
-- admin_settings: admin_settings_read / admin_settings_write stay.
-- bridgefast content, modules and quiz questions: everyone signed in reads; only an administrator writes.
do $c$
declare t text;
begin
  foreach t in array array['bridgefast_content', 'bridgefast_modules', 'bridgefast_quiz_questions', 'talentvisa_quotas'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_write', t);
  end loop;
end
$c$;

-- email_queue: any signed-in account may queue an email (the pages do, for the person they notify); only an administrator reads, processes or removes the queue.
drop policy if exists email_queue_insert on public.email_queue;
drop policy if exists email_queue_insert on public.email_queue;
create policy email_queue_insert on public.email_queue for insert to authenticated with check (auth.uid() is not null);
drop policy if exists email_queue_admin on public.email_queue;
drop policy if exists email_queue_admin on public.email_queue;
create policy email_queue_admin on public.email_queue for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- Candidate-owned
-- behavioral_consistency_index: the scoped mentor, employer and candidate-deny policies stay; the candidate may add a row for themselves, an administrator everything.
drop policy if exists consistency_candidate_insert on public.behavioral_consistency_index;
drop policy if exists consistency_candidate_insert on public.behavioral_consistency_index;
create policy consistency_candidate_insert on public.behavioral_consistency_index for insert to authenticated with check (candidate_id = auth.uid());
drop policy if exists consistency_admin on public.behavioral_consistency_index;
drop policy if exists consistency_admin on public.behavioral_consistency_index;
create policy consistency_admin on public.behavioral_consistency_index for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bridgefast_progress: the candidate's own; the candidate's mentor reads; an administrator everything.
drop policy if exists bridgefast_progress_own on public.bridgefast_progress;
create policy bridgefast_progress_own on public.bridgefast_progress for all to authenticated using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
drop policy if exists bridgefast_progress_mentor_read on public.bridgefast_progress;
create policy bridgefast_progress_mentor_read on public.bridgefast_progress for select to authenticated using (public.t3a_mentors_candidate(candidate_id));
drop policy if exists bridgefast_progress_admin on public.bridgefast_progress;
create policy bridgefast_progress_admin on public.bridgefast_progress for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bridgefast_quiz_attempts, candidate_self_assessments, training_certificates: their scoped policies stay; an administrator may also manage them.
do $c$
declare t text;
begin
  foreach t in array array['bridgefast_quiz_attempts', 'candidate_self_assessments', 'training_certificates'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end
$c$;

-- self_assessments: the candidate (profile or desk id), their mentor, an administrator.
drop policy if exists self_assessments_own on public.self_assessments;
create policy self_assessments_own on public.self_assessments for all to authenticated using (public.t3a_owns_candidate(candidate_id)) with check (public.t3a_owns_candidate(candidate_id));
drop policy if exists self_assessments_mentor_read on public.self_assessments;
create policy self_assessments_mentor_read on public.self_assessments for select to authenticated using (public.t3a_mentors_candidate(candidate_id));
drop policy if exists self_assessments_admin on public.self_assessments;
create policy self_assessments_admin on public.self_assessments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- skill_passports: read as before (the public verification page and the desks read it); a mentor writes for their own mentee, an administrator for anyone.
drop policy if exists skill_passports_read on public.skill_passports;
create policy skill_passports_read on public.skill_passports for select to authenticated using (true);
drop policy if exists skill_passports_mentor_write on public.skill_passports;
create policy skill_passports_mentor_write on public.skill_passports for insert to authenticated with check (public.t3a_mentors_candidate(candidate_id));
drop policy if exists skill_passports_mentor_update on public.skill_passports;
create policy skill_passports_mentor_update on public.skill_passports for update to authenticated using (public.t3a_mentors_candidate(candidate_id)) with check (public.t3a_mentors_candidate(candidate_id));
drop policy if exists skill_passports_admin on public.skill_passports;
create policy skill_passports_admin on public.skill_passports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- endorsements: read as before; a mentor writes their own; an administrator everything.
drop policy if exists endorsements_read on public.endorsements;
create policy endorsements_read on public.endorsements for select to authenticated using (true);
drop policy if exists endorsements_mentor_write on public.endorsements;
create policy endorsements_mentor_write on public.endorsements for all to authenticated using (public.t3a_owns_mentor(mentor_id)) with check (public.t3a_owns_mentor(mentor_id));
drop policy if exists endorsements_admin on public.endorsements;
create policy endorsements_admin on public.endorsements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- talentvisa_nominations: the nominating mentor writes, the candidate reads their own, an administrator reviews.
drop policy if exists talentvisa_nominations_mentor on public.talentvisa_nominations;
create policy talentvisa_nominations_mentor on public.talentvisa_nominations for all to authenticated using (public.t3a_owns_mentor(nominating_mentor_id)) with check (public.t3a_owns_mentor(nominating_mentor_id));
drop policy if exists talentvisa_nominations_candidate_read on public.talentvisa_nominations;
create policy talentvisa_nominations_candidate_read on public.talentvisa_nominations for select to authenticated using (public.t3a_owns_candidate(candidate_id));
drop policy if exists talentvisa_nominations_admin on public.talentvisa_nominations;
create policy talentvisa_nominations_admin on public.talentvisa_nominations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- Mentoring
-- mentor_assignments: a candidate may ask for a mentor (a pending row naming themselves), a mentor reads and answers their own, an administrator allocates. Deleting is the administrator's.
drop policy if exists mentor_assignments_read on public.mentor_assignments;
create policy mentor_assignments_read on public.mentor_assignments for select to authenticated using (public.t3a_owns_mentor(mentor_id) or public.t3a_owns_candidate(candidate_id) or public.is_admin());
drop policy if exists mentor_assignments_candidate_request on public.mentor_assignments;
create policy mentor_assignments_candidate_request on public.mentor_assignments for insert to authenticated with check (public.t3a_owns_candidate(candidate_id) and status = 'pending');
drop policy if exists mentor_assignments_mentor_update on public.mentor_assignments;
create policy mentor_assignments_mentor_update on public.mentor_assignments for update to authenticated using (public.t3a_owns_mentor(mentor_id)) with check (public.t3a_owns_mentor(mentor_id));
drop policy if exists mentor_assignments_admin on public.mentor_assignments;
create policy mentor_assignments_admin on public.mentor_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- mentor_availability, mentor_sessions, observation_sessions, scenario_selection_audit, t3x_connections: their scoped policies stay.
-- observation_sessions: the mentor named on the session may also open and update it; an administrator everything.
drop policy if exists observation_sessions_mentor_write on public.observation_sessions;
create policy observation_sessions_mentor_write on public.observation_sessions for insert to authenticated with check (mentor_id = auth.uid());
drop policy if exists observation_sessions_mentor_update on public.observation_sessions;
create policy observation_sessions_mentor_update on public.observation_sessions for update to authenticated using (mentor_id = auth.uid()) with check (mentor_id = auth.uid());
drop policy if exists observation_sessions_admin on public.observation_sessions;
create policy observation_sessions_admin on public.observation_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists scenario_selection_audit_admin on public.scenario_selection_audit;
create policy scenario_selection_audit_admin on public.scenario_selection_audit for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists mentor_sessions_admin on public.mentor_sessions;
create policy mentor_sessions_admin on public.mentor_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists mentor_availability_admin on public.mentor_availability;
create policy mentor_availability_admin on public.mentor_availability for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- Messaging and notifications
-- conversations: anyone signed in may start one (a conversation row holds no content; people join it afterwards); only its participants change it; an administrator manages them.
drop policy if exists conversations_start on public.conversations;
create policy conversations_start on public.conversations for insert to authenticated with check (auth.uid() is not null);
drop policy if exists conversations_participant_update on public.conversations;
create policy conversations_participant_update on public.conversations for update to authenticated using (public.t3a_in_conversation(id)) with check (public.t3a_in_conversation(id));
drop policy if exists conversations_admin on public.conversations;
create policy conversations_admin on public.conversations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- messages: the send and view policies stay; a participant may mark messages read; an administrator everything.
drop policy if exists messages_participant_update on public.messages;
create policy messages_participant_update on public.messages for update to authenticated using (public.t3a_in_conversation(conversation_id)) with check (public.t3a_in_conversation(conversation_id));
drop policy if exists messages_admin on public.messages;
create policy messages_admin on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- notifications: the own read, update and delete policies stay; a notification may be left for the person it concerns (see t3a_may_notify); an administrator everything.
drop policy if exists notifications_insert_related on public.notifications;
create policy notifications_insert_related on public.notifications for insert to authenticated with check (public.t3a_may_notify(user_id));
drop policy if exists notifications_admin on public.notifications;
create policy notifications_admin on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- Employers and Live Works
-- employer_profiles: the own insert, update and delete policies stay (they include administrators).
-- liveworks_projects: listed to everyone signed in; the owning employer writes; an administrator everything.
drop policy if exists liveworks_projects_read on public.liveworks_projects;
create policy liveworks_projects_read on public.liveworks_projects for select to authenticated using (true);
drop policy if exists liveworks_projects_employer on public.liveworks_projects;
create policy liveworks_projects_employer on public.liveworks_projects for all to authenticated using (public.t3a_owns_employer(employer_id)) with check (public.t3a_owns_employer(employer_id));
drop policy if exists liveworks_projects_admin on public.liveworks_projects;
create policy liveworks_projects_admin on public.liveworks_projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- liveworks_applications: the applicant applies and reads their own; the project's employer reads and decides; an administrator everything.
drop policy if exists liveworks_applications_candidate on public.liveworks_applications;
create policy liveworks_applications_candidate on public.liveworks_applications for all to authenticated using (public.t3a_owns_candidate(candidate_id)) with check (public.t3a_owns_candidate(candidate_id));
drop policy if exists liveworks_applications_employer on public.liveworks_applications;
create policy liveworks_applications_employer on public.liveworks_applications for all to authenticated
  using (exists (select 1 from public.liveworks_projects lp where lp.id = project_id and public.t3a_owns_employer(lp.employer_id)))
  with check (exists (select 1 from public.liveworks_projects lp where lp.id = project_id and public.t3a_owns_employer(lp.employer_id)));
drop policy if exists liveworks_applications_admin on public.liveworks_applications;
create policy liveworks_applications_admin on public.liveworks_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- liveworks_milestones: the project's employer writes; the selected candidate reads; an administrator everything.
drop policy if exists liveworks_milestones_employer on public.liveworks_milestones;
create policy liveworks_milestones_employer on public.liveworks_milestones for all to authenticated
  using (exists (select 1 from public.liveworks_projects lp where lp.id = project_id and public.t3a_owns_employer(lp.employer_id)))
  with check (exists (select 1 from public.liveworks_projects lp where lp.id = project_id and public.t3a_owns_employer(lp.employer_id)));
drop policy if exists liveworks_milestones_candidate_read on public.liveworks_milestones;
create policy liveworks_milestones_candidate_read on public.liveworks_milestones for select to authenticated
  using (exists (select 1 from public.liveworks_projects lp where lp.id = project_id and public.t3a_owns_candidate(lp.selected_candidate_id)));
drop policy if exists liveworks_milestones_admin on public.liveworks_milestones;
create policy liveworks_milestones_admin on public.liveworks_milestones for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- escrow_transactions (holds payment details): the paying employer, the receiving candidate reads, an administrator everything.
drop policy if exists escrow_transactions_employer on public.escrow_transactions;
create policy escrow_transactions_employer on public.escrow_transactions for all to authenticated using (public.t3a_owns_employer(employer_id)) with check (public.t3a_owns_employer(employer_id));
drop policy if exists escrow_transactions_candidate_read on public.escrow_transactions;
create policy escrow_transactions_candidate_read on public.escrow_transactions for select to authenticated using (public.t3a_owns_candidate(candidate_id));
drop policy if exists escrow_transactions_admin on public.escrow_transactions;
create policy escrow_transactions_admin on public.escrow_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- t3x_connections: its scoped read and write policies stay; an administrator everything.
drop policy if exists t3x_connections_admin on public.t3x_connections;
create policy t3x_connections_admin on public.t3x_connections for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- admin_settings: read and write policies stay.

-- ---------------------------------------------------------------------------------------------------------------------
-- Schools
-- school_cohorts: the school that owns the cohort, or an administrator.
drop policy if exists school_cohorts_school on public.school_cohorts;
create policy school_cohorts_school on public.school_cohorts for all to authenticated using (public.t3a_owns_school(school_id) or teacher_id = auth.uid()) with check (public.t3a_owns_school(school_id) or teacher_id = auth.uid());
drop policy if exists school_cohorts_admin on public.school_cohorts;
create policy school_cohorts_admin on public.school_cohorts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- teacher_observations: the teacher who wrote it, the school the student belongs to, or an administrator.
drop policy if exists teacher_observations_school on public.teacher_observations;
create policy teacher_observations_school on public.teacher_observations for all to authenticated
  using (teacher_id = auth.uid() or exists (select 1 from public.students s where s.id = student_id and public.t3a_owns_school(s.school_id)))
  with check (teacher_id = auth.uid() or exists (select 1 from public.students s where s.id = student_id and public.t3a_owns_school(s.school_id)));
drop policy if exists teacher_observations_admin on public.teacher_observations;
create policy teacher_observations_admin on public.teacher_observations for all to authenticated using (public.is_admin()) with check (public.is_admin());
