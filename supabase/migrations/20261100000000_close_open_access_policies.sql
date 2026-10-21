-- Close open access on legacy tables (Day 1 conflict register CR-004).
--
-- Authority: T3A-DEV-DAY1-001 v1.3 section 8.1.4 (least privilege, enforced
-- at the data layer) and T3A-DEV-REQ-GL-001 sections 3.6 and 4.1.9
-- (Growth Log is readable by the participant only).
--
-- Scope, deliberately narrow:
--   A. Policies that let anonymous callers WRITE (role PUBLIC, USING/WITH CHECK true)
--      are re-targeted to authenticated. Signed-in behavior is unchanged.
--   B. Policies that let anonymous callers READ person-linked legacy tables are
--      re-targeted to authenticated. Public reference content is left alone.
--   C. growth_log_entries and growth_logs become owner-only for every command.
--
-- Not in this migration (needs a decision, see docs/day1/conflict-register.md):
--   * the blanket "*_rw" policies for authenticated users on other legacy tables;
--   * anonymous read of the t3a_* registry tables.
--
-- Nothing is deleted. Existing rows are not touched. Each statement is guarded
-- so a policy that has already been changed or removed is skipped.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      -- A. anonymous writes
      ('bridgefast_modules',          'Allow all insert'),
      ('bridgefast_modules',          'Allow all update'),
      ('bridgefast_progress',         'Allow all delete'),
      ('bridgefast_progress',         'Allow all insert'),
      ('bridgefast_progress',         'Allow all update'),
      ('conversations',               'Users can create conversations'),
      ('employer_feedback',           'employer_feedback_all'),
      ('employer_profiles',           'Allow all delete'),
      ('employer_profiles',           'Allow all insert'),
      ('employer_profiles',           'Allow all update'),
      ('endorsements',                'endorsements_all'),
      ('liveworks_applications',      'liveworks_applications_all'),
      ('liveworks_milestones',        'liveworks_milestones_all'),
      ('liveworks_projects',          'Allow all delete'),
      ('liveworks_projects',          'Allow all insert'),
      ('liveworks_projects',          'Allow all update'),
      ('mentor_assignments',          'Allow all delete'),
      ('mentor_assignments',          'Allow all insert'),
      ('mentor_assignments',          'Allow all update'),
      ('mentor_observations',         'mentor_observations_all'),
      ('notifications',               'Allow all delete'),
      ('notifications',               'Allow all insert'),
      ('notifications',               'Allow all update'),
      ('skill_passports',             'skill_passports_all'),
      ('t3x_connections',             'Allow all delete'),
      ('t3x_connections',             'Allow all insert'),
      ('t3x_connections',             'Allow all update'),
      ('talentvisa_nominations',      'talentvisa_nominations_all'),
      -- B. anonymous reads of person-linked tables
      ('bridgefast_progress',         'Allow all select'),
      ('employer_profiles',           'Allow all select'),
      ('liveworks_projects',          'Allow all select'),
      ('mentor_assignments',          'Allow all select'),
      ('notifications',               'Allow all select'),
      ('t3x_connections',             'Allow all select')
    ) as v(tbl, pol)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = r.tbl and policyname = r.pol
        and roles = '{public}'::name[]
    ) then
      execute format('alter policy %I on public.%I to authenticated', r.pol, r.tbl);
      raise notice 'policy % on % re-targeted to authenticated', r.pol, r.tbl;
    end if;
  end loop;
end $$;

-- C. Growth Log: participant only.
alter table public.growth_log_entries enable row level security;
alter table public.growth_logs        enable row level security;

drop policy if exists growth_log_entries_rw          on public.growth_log_entries;
drop policy if exists "Users can insert own growth log" on public.growth_log_entries;
drop policy if exists "Users can view own growth log"   on public.growth_log_entries;
drop policy if exists growth_logs_rw                 on public.growth_logs;

drop policy if exists growth_log_entries_owner_select on public.growth_log_entries;
drop policy if exists growth_log_entries_owner_insert on public.growth_log_entries;
drop policy if exists growth_log_entries_owner_update on public.growth_log_entries;
drop policy if exists growth_log_entries_owner_delete on public.growth_log_entries;
drop policy if exists growth_logs_owner_select on public.growth_logs;
drop policy if exists growth_logs_owner_insert on public.growth_logs;
drop policy if exists growth_logs_owner_update on public.growth_logs;
drop policy if exists growth_logs_owner_delete on public.growth_logs;

create policy growth_log_entries_owner_select on public.growth_log_entries
  for select to authenticated using (candidate_id = auth.uid());
create policy growth_log_entries_owner_insert on public.growth_log_entries
  for insert to authenticated with check (candidate_id = auth.uid());
create policy growth_log_entries_owner_update on public.growth_log_entries
  for update to authenticated using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
create policy growth_log_entries_owner_delete on public.growth_log_entries
  for delete to authenticated using (candidate_id = auth.uid());

create policy growth_logs_owner_select on public.growth_logs
  for select to authenticated using (candidate_id = auth.uid());
create policy growth_logs_owner_insert on public.growth_logs
  for insert to authenticated with check (candidate_id = auth.uid());
create policy growth_logs_owner_update on public.growth_logs
  for update to authenticated using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
create policy growth_logs_owner_delete on public.growth_logs
  for delete to authenticated using (candidate_id = auth.uid());
