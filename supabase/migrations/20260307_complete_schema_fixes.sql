-- ══════════════════════════════════════════════════════════════════
-- COMPLETE SCHEMA FIXES MIGRATION
-- March 7, 2026 — Fix missing tables, RLS policies, FK references
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. Fix user_role enum: rename 'institution' to 'school_admin'
-- ──────────────────────────────────────────────────────────────────

ALTER TYPE user_role RENAME VALUE 'institution' TO 'school_admin';

-- ──────────────────────────────────────────────────────────────────
-- 2. Create school-related tables
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.school_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL CHECK (school_type IN ('high_school', 'community_college', 'university', 'vocational')),
  district TEXT,
  address TEXT,
  total_students INTEGER NOT NULL DEFAULT 0,
  active_cohorts INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.school_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  program TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'completed', 'upcoming')),
  total_students INTEGER NOT NULL DEFAULT 0,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.school_cohorts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_id_number TEXT,
  grade_level TEXT,
  graduation_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'transferred', 'inactive')),
  total_observations INTEGER NOT NULL DEFAULT 0,
  avg_behavioral_score NUMERIC(4, 2)
);

CREATE TABLE IF NOT EXISTS public.teacher_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.school_cohorts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observation_date TIMESTAMPTZ NOT NULL,
  context TEXT NOT NULL,
  behavioral_scores JSONB NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  areas_for_growth TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT
);

-- ──────────────────────────────────────────────────────────────────
-- 3. Create admin-related tables
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.talentvisa_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  tier TEXT NOT NULL CHECK (tier IN ('gold', 'silver', 'bronze')),
  max_approvals INTEGER NOT NULL,
  current_approvals INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  to_email TEXT NOT NULL,
  to_name TEXT NOT NULL,
  template TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- ──────────────────────────────────────────────────────────────────
-- 4. Create observation_sessions table (prerequisite for mentor-gated)
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.observation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  session_type TEXT,
  status TEXT DEFAULT 'pending',
  mentor_id UUID REFERENCES public.profiles(id),
  feedback_level SMALLINT CHECK (feedback_level IN (1, 2, 3, 4)),
  mentor_approved BOOLEAN DEFAULT FALSE,
  mentor_approved_at TIMESTAMPTZ
);

-- ──────────────────────────────────────────────────────────────────
-- 5. Create mentor-gated observation tables
--    FKs reference candidate_profiles.id and mentor_profiles.id
--    to match existing mentor_assignments/observations pattern
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mentor_assigned_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  dimension_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assignment_id, dimension_id)
);

CREATE INDEX IF NOT EXISTS idx_assigned_dims_candidate ON public.mentor_assigned_dimensions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assigned_dims_assignment ON public.mentor_assigned_dimensions(assignment_id);

CREATE TABLE IF NOT EXISTS public.observation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.observation_sessions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.mentor_profiles(id),
  dimension_id TEXT NOT NULL,
  feedback_level SMALLINT NOT NULL CHECK (feedback_level IN (1, 2, 3, 4)),
  bars_score SMALLINT CHECK (bars_score BETWEEN 1 AND 4),
  ai_draft_feedback TEXT,
  mentor_feedback TEXT,
  final_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ai_delivered', 'draft', 'mentor_review', 'approved', 'rejected')),
  mentor_approved BOOLEAN DEFAULT FALSE,
  mentor_approved_at TIMESTAMPTZ,
  mentor_rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_candidate ON public.observation_feedback(candidate_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON public.observation_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignment ON public.observation_feedback(assignment_id);

CREATE TABLE IF NOT EXISTS public.observation_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id),
  dimension_id TEXT NOT NULL,
  ai_synthesis TEXT,
  mentor_edited_synthesis TEXT,
  final_synthesis TEXT,
  overall_bars_score SMALLINT CHECK (overall_bars_score BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'mentor_review', 'approved')),
  mentor_approved BOOLEAN DEFAULT FALSE,
  mentor_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assignment_id, dimension_id)
);

-- ──────────────────────────────────────────────────────────────────
-- 6. Security definer function to avoid infinite recursion in RLS
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────────────
-- 7. Fix profiles RLS - allow all authenticated users to SELECT
-- ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
CREATE POLICY "Users can update own or admin all" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );

-- ──────────────────────────────────────────────────────────────────
-- 8. Fix candidate_profiles RLS - admin/mentor/employer can read
-- ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own candidate profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Users can view candidate profiles" ON public.candidate_profiles;
CREATE POLICY "Users can view candidate profiles" ON public.candidate_profiles
  FOR SELECT USING (
    auth.uid() = profile_id
    OR public.get_my_role() IN ('admin', 'mentor', 'employer')
  );

-- ──────────────────────────────────────────────────────────────────
-- 9. Add admin read access to tables that need it
-- ──────────────────────────────────────────────────────────────────

CREATE POLICY "admin_read_skill_passports" ON public.skill_passports
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "employer_read_skill_passports" ON public.skill_passports
  FOR SELECT USING (public.get_my_role() = 'employer');

CREATE POLICY "admin_read_talentvisa_nominations" ON public.talentvisa_nominations
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "admin_update_talentvisa_nominations" ON public.talentvisa_nominations
  FOR UPDATE USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_read_growth_log_entries" ON public.growth_log_entries
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_read_mentor_observations" ON public.mentor_observations
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_read_endorsements" ON public.endorsements
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (public.get_my_role() = 'admin');

-- ──────────────────────────────────────────────────────────────────
-- 10. RLS for new tables
-- ──────────────────────────────────────────────────────────────────

-- mentor_assigned_dimensions
ALTER TABLE public.mentor_assigned_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned_dims_mentor_all" ON public.mentor_assigned_dimensions
  FOR ALL USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE profile_id = auth.uid())
    OR public.get_my_role() = 'admin'
  );
CREATE POLICY "assigned_dims_candidate_read" ON public.mentor_assigned_dimensions
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM public.candidate_profiles WHERE profile_id = auth.uid())
  );

-- observation_feedback
ALTER TABLE public.observation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_mentor_all" ON public.observation_feedback
  FOR ALL USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE profile_id = auth.uid())
    OR public.get_my_role() = 'admin'
  );
CREATE POLICY "feedback_candidate_read_approved" ON public.observation_feedback
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM public.candidate_profiles WHERE profile_id = auth.uid())
    AND (status = 'ai_delivered' OR status = 'approved')
  );
CREATE POLICY "feedback_l1_auto_insert" ON public.observation_feedback
  FOR INSERT WITH CHECK (
    candidate_id IN (SELECT id FROM public.candidate_profiles WHERE profile_id = auth.uid())
    AND feedback_level = 1
  );

-- observation_synthesis
ALTER TABLE public.observation_synthesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "synthesis_mentor_all" ON public.observation_synthesis
  FOR ALL USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE profile_id = auth.uid())
    OR public.get_my_role() = 'admin'
  );
CREATE POLICY "synthesis_candidate_read_approved" ON public.observation_synthesis
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM public.candidate_profiles WHERE profile_id = auth.uid())
    AND status = 'approved'
  );

-- observation_sessions
ALTER TABLE public.observation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obs_sessions_own" ON public.observation_sessions
  FOR ALL USING (
    candidate_id = auth.uid()
    OR public.get_my_role() IN ('mentor', 'admin')
  );

-- school tables
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_profiles_own" ON public.school_profiles
  FOR ALL USING (
    profile_id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

ALTER TABLE public.school_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_cohorts_school_admin" ON public.school_cohorts
  FOR ALL USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE profile_id = auth.uid())
    OR public.get_my_role() = 'admin'
  );

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_school_admin" ON public.students
  FOR ALL USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE profile_id = auth.uid())
    OR public.get_my_role() = 'admin'
  );

ALTER TABLE public.teacher_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_obs_school_admin" ON public.teacher_observations
  FOR ALL USING (
    teacher_id = auth.uid()
    OR public.get_my_role() IN ('school_admin', 'admin')
  );

-- admin tables
ALTER TABLE public.talentvisa_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "talentvisa_quotas_admin" ON public.talentvisa_quotas
  FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "talentvisa_quotas_read" ON public.talentvisa_quotas
  FOR SELECT USING (true);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_queue_admin" ON public.email_queue
  FOR ALL USING (public.get_my_role() = 'admin');
