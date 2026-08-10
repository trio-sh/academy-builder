CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  first_name text,
  last_name text,
  role text,
  avatar_url text,
  headline text,
  bio text,
  location text,
  is_active boolean not null default true,
  onboarding_completed boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resume_url text,
  skills text[] not null default '{}'::text[],
  experience_years integer,
  education jsonb,
  work_history jsonb,
  entry_path text,
  current_tier text,
  mentor_loops integer not null default 0,
  has_skill_passport boolean not null default false,
  has_talentvisa boolean not null default false,
  is_listed_on_t3x boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  industry text,
  specializations text[] not null default '{}'::text[],
  years_experience integer not null default 0,
  company text,
  job_title text,
  max_mentees integer not null default 0,
  current_mentees integer not null default 0,
  is_accepting boolean not null default true,
  total_observations integer not null default 0,
  total_endorsements integer not null default 0,
  avg_rating numeric
);

CREATE TABLE IF NOT EXISTS public.employer_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_name text,
  company_size text,
  industry text,
  company_website text,
  company_logo_url text,
  is_verified boolean not null default false,
  subscription_tier text,
  total_hires integer not null default 0,
  total_connections integer not null default 0
);

CREATE TABLE IF NOT EXISTS public.skill_passports (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verification_code text,
  readiness_tier text,
  behavioral_scores jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  issued_at timestamptz,
  expires_at timestamptz,
  pdf_url text,
  qr_code_url text
);

CREATE TABLE IF NOT EXISTS public.growth_log_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  created_at timestamptz not null default now(),
  event_type text,
  title text,
  description text,
  metadata jsonb,
  source_component text,
  source_id uuid
);

CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text,
  loop_number integer not null default 0,
  assigned_by uuid
);

CREATE TABLE IF NOT EXISTS public.mentor_observations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid,
  mentor_id uuid,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  session_date date not null default current_date,
  behavioral_scores jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}'::text[],
  areas_for_improvement text[] not null default '{}'::text[],
  notes text,
  is_locked boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.endorsements (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid,
  mentor_id uuid,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  decision text,
  justification text,
  redirect_to text,
  redirect_module_id uuid
);

CREATE TABLE IF NOT EXISTS public.bridgefast_modules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text,
  description text,
  behavioral_dimension text,
  duration_hours numeric not null default 0,
  content_url text,
  is_active boolean not null default true,
  order_index integer not null default 0
);

CREATE TABLE IF NOT EXISTS public.bridgefast_progress (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  module_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  progress_percent integer not null default 0,
  final_score integer,
  status text,
  deadline text
);

CREATE TABLE IF NOT EXISTS public.liveworks_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  employer_id uuid,
  mentor_id uuid,
  title text,
  description text,
  category text,
  skill_level text,
  budget_min numeric,
  budget_max numeric,
  duration_days numeric not null default 0,
  status text,
  max_candidates integer not null default 0,
  selected_candidate_id uuid
);

CREATE TABLE IF NOT EXISTS public.liveworks_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text,
  description text,
  order_index integer not null default 0,
  status text,
  due_date date,
  payment_amount numeric,
  submitted_at timestamptz,
  approved_at timestamptz,
  escrow_status text,
  escrow_funded_at timestamptz,
  escrow_released_at timestamptz,
  payment_method text,
  payment_credentials text,
  payment_proof_url text,
  payment_verified_at timestamptz,
  payment_notes text
);

CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid,
  milestone_id uuid,
  employer_id uuid,
  candidate_id uuid,
  amount numeric not null default 0,
  status text,
  funded_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  payment_method text,
  payment_credentials text,
  payment_proof_url text,
  verified_by uuid,
  verified_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS public.liveworks_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  cover_letter text,
  status text
);

CREATE TABLE IF NOT EXISTS public.t3x_connections (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text,
  message text,
  responded_at timestamptz,
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.employer_feedback (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid,
  candidate_id uuid,
  hire_date date not null default current_date,
  created_at timestamptz not null default now(),
  feedback_type text,
  performance_rating numeric not null default 0,
  readiness_accuracy integer not null default 0,
  behavioral_alignment jsonb,
  comments text,
  would_hire_again boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.talentvisa_nominations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  nominating_mentor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text,
  justification text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  expires_at timestamptz,
  tier text,
  behavioral_score integer
);

CREATE TABLE IF NOT EXISTS public.talentvisa_quotas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  period text,
  tier text,
  max_approvals integer not null default 0,
  current_approvals integer not null default 0,
  period_start text,
  period_end text
);

CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  to_email text,
  to_name text,
  template text,
  template_data jsonb not null default '{}'::jsonb,
  status text,
  sent_at timestamptz,
  error_message text
);

CREATE TABLE IF NOT EXISTS public.candidate_self_assessments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  behavioral_scores jsonb not null default '{}'::jsonb,
  notes text,
  goals text,
  strengths text[] not null default '{}'::text[],
  areas_for_improvement text[] not null default '{}'::text[],
  completed boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  created_at timestamptz not null default now(),
  type text,
  title text,
  message text,
  is_read boolean not null default false,
  action_url text,
  metadata jsonb,
  priority text,
  action_type text
);

CREATE TABLE IF NOT EXISTS public.school_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  school_name text,
  school_type text,
  district text,
  address text,
  total_students integer not null default 0,
  active_cohorts integer not null default 0,
  is_verified boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.school_cohorts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  program text,
  start_date date not null default current_date,
  end_date date,
  status text,
  total_students integer not null default 0,
  teacher_id uuid
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  school_id uuid,
  cohort_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  student_id_number text,
  grade_level text,
  graduation_year integer,
  status text,
  total_observations integer not null default 0,
  avg_behavioral_score integer
);

CREATE TABLE IF NOT EXISTS public.teacher_observations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid,
  student_id uuid,
  cohort_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  observation_date date not null default current_date,
  context text,
  behavioral_scores jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}'::text[],
  areas_for_growth text[] not null default '{}'::text[],
  notes text
);

CREATE TABLE IF NOT EXISTS public.growth_logs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  created_at timestamptz not null default now(),
  log_type text,
  title text,
  description text,
  metadata jsonb
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text,
  title text,
  last_message_at timestamptz,
  last_message_preview text
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  user_id uuid,
  joined_at timestamptz,
  last_read_at timestamptz,
  is_muted boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  sender_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  content text,
  message_type text,
  file_url text,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  reply_to_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid,
  day_of_week integer not null default 0,
  start_time time,
  end_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid,
  candidate_id uuid,
  assignment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scheduled_at timestamptz,
  duration_minutes numeric not null default 0,
  status text,
  session_type text,
  notes text,
  meeting_url text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text
);

CREATE TABLE IF NOT EXISTS public.session_reminders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  user_id uuid,
  remind_at timestamptz,
  reminder_type text,
  sent boolean not null default false,
  sent_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.bridgefast_content (
  id uuid primary key default gen_random_uuid(),
  module_id uuid,
  created_at timestamptz not null default now(),
  content_type text,
  title text,
  description text,
  content_url text,
  duration_minutes numeric,
  order_index integer not null default 0,
  is_required boolean not null default false
);

CREATE TABLE IF NOT EXISTS public.bridgefast_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid,
  created_at timestamptz not null default now(),
  question text,
  question_type text,
  options jsonb not null default '{}'::jsonb,
  correct_answer text,
  explanation text,
  points integer not null default 0,
  order_index integer not null default 0
);

CREATE TABLE IF NOT EXISTS public.bridgefast_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  module_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer,
  max_score integer,
  answers jsonb not null default '{}'::jsonb,
  passed boolean,
  attempt_number integer not null default 0
);

CREATE TABLE IF NOT EXISTS public.mentor_assigned_dimensions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid,
  mentor_id uuid,
  candidate_id uuid,
  dimension_id uuid,
  assigned_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.observation_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  assignment_id uuid,
  candidate_id uuid,
  mentor_id uuid,
  dimension_id uuid,
  feedback_level integer not null default 0,
  bars_score integer,
  ai_draft_feedback text,
  mentor_feedback text,
  final_feedback text,
  status text,
  mentor_approved boolean not null default false,
  mentor_approved_at timestamptz,
  mentor_rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.observation_synthesis (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid,
  candidate_id uuid,
  mentor_id uuid,
  dimension_id uuid,
  ai_synthesis text,
  mentor_edited_synthesis text,
  final_synthesis text,
  overall_bars_score integer,
  status text,
  mentor_approved boolean not null default false,
  mentor_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.observation_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  session_type text,
  status text,
  assignment_id_ref text,
  mentor_id uuid,
  feedback_level integer,
  mentor_approved boolean not null default false,
  mentor_approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.training_certificates (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid,
  module_id uuid,
  created_at timestamptz not null default now(),
  certificate_number text,
  score integer,
  issued_at timestamptz,
  expires_at timestamptz,
  pdf_url text
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.behavioral_consistency_index (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  dimension_id text not null,
  observation_cycle integer not null default 1,
  scenarios_demonstrated integer not null default 0,
  scenarios_total integer not null default 0,
  consistency_ratio numeric(5,4),
  previous_consistency_ratio numeric(5,4),
  consistency_trend text,
  mentor_notes text,
  flagged_for_review boolean not null default false,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (candidate_id, dimension_id, observation_cycle)
);

CREATE TABLE IF NOT EXISTS public.scenario_selection_audit (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  candidate_id uuid not null,
  dimension_id text not null,
  random_seed bigint,
  scenario_sequence text[] not null default '{}'::text[],
  generated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.observation_loops (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  assignment_id uuid,
  dimension_id text not null,
  observation_level integer not null default 1,
  loop_number integer not null default 1,
  status text not null default 'in_progress',
  bars_score integer,
  endorsement_decision text,
  scenario_variant integer not null default 1,
  mentor_id uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cooldown_ends_at timestamptz,
  cooldown_days integer,
  is_locked boolean not null default false,
  mentor_override boolean not null default false,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.self_assessments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  behavioral_scores jsonb not null default '{}'::jsonb,
  notes text,
  attempt_number integer not null default 1,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_loops_candidate ON public.observation_loops(candidate_id, dimension_id, observation_level);
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_profiles_profile ON public.candidate_profiles(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mentor_profiles_profile ON public.mentor_profiles(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_employer_profiles_profile ON public.employer_profiles(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_profiles_profile ON public.school_profiles(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_passports_candidate ON public.skill_passports(candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_passports_code ON public.skill_passports(verification_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bridgefast_progress ON public.bridgefast_progress(candidate_id, module_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_participant ON public.conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_growth_log_candidate ON public.growth_log_entries(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

ALTER TABLE public.skill_passports ALTER COLUMN verification_code SET DEFAULT encode(gen_random_bytes(8), 'hex');

INSERT INTO public.admin_settings (key, value, description)
VALUES ('reassessment_cooldown_days', '14', 'Minimum days between re-assessments on any single dimension.')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$fn$;

CREATE OR REPLACE FUNCTION public.my_candidate_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT id FROM public.candidate_profiles WHERE profile_id = auth.uid();
$fn$;

CREATE OR REPLACE FUNCTION public.my_mentor_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT id FROM public.mentor_profiles WHERE profile_id = auth.uid();
$fn$;

CREATE OR REPLACE FUNCTION public.my_employer_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT id FROM public.employer_profiles WHERE profile_id = auth.uid();
$fn$;

GRANT EXECUTE ON FUNCTION public.is_admin(), public.my_candidate_id(), public.my_mentor_id(), public.my_employer_id() TO authenticated;

DO $do$
DECLARE t text; owner_col text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

    IF t = 'profiles' THEN
      EXECUTE 'CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true)';
      EXECUTE 'CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid())';
      EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin())';
      EXECUTE 'CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid() OR public.is_admin())';
      CONTINUE;
    END IF;

    SELECT column_name INTO owner_col
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = t AND column_name IN ('user_id', 'profile_id')
     ORDER BY (column_name = 'user_id') DESC
     LIMIT 1;

    IF owner_col IS NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t || '_rw', t);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_read', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid() OR public.is_admin())', t || '_insert_own', t, owner_col);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid() OR public.is_admin())', t || '_update_own', t, owner_col);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%I = auth.uid() OR public.is_admin())', t || '_delete_own', t, owner_col);
    END IF;
    owner_col := NULL;
  END LOOP;
END
$do$;

DROP POLICY IF EXISTS "notifications_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications_insert_any" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);