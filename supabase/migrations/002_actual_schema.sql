-- ============================================
-- The 3rd Academy - Actual Database Schema
-- ============================================
-- This matches the existing database structure
-- Run in Supabase SQL Editor if tables don't exist
-- ============================================

-- ====================
-- ENUM TYPES
-- ====================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'mentor', 'employer', 'school_admin', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE readiness_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE endorsement_decision AS ENUM ('proceed', 'redirect', 'pause');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE growth_log_event_type AS ENUM ('assessment', 'training', 'project', 'observation', 'tier_change', 'endorsement', 'signup', 'resume_upload');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'revision_requested');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ====================
-- PROFILES (Base table - references auth.users)
-- ====================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    role user_role DEFAULT 'candidate',
    avatar_url TEXT,
    headline TEXT,
    bio TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    onboarding_completed BOOLEAN DEFAULT FALSE
);

-- ====================
-- CANDIDATE PROFILES
-- ====================

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resume_url TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_years INTEGER,
    education JSONB DEFAULT '[]',
    work_history JSONB DEFAULT '[]',
    current_tier readiness_tier,
    mentor_loops INTEGER DEFAULT 0,
    has_skill_passport BOOLEAN DEFAULT FALSE,
    has_talentvisa BOOLEAN DEFAULT FALSE,
    is_listed_on_t3x BOOLEAN DEFAULT FALSE
);

-- ====================
-- MENTOR PROFILES
-- ====================

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    industry TEXT DEFAULT 'Technology',
    specializations TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 5,
    company TEXT,
    job_title TEXT,
    max_mentees INTEGER DEFAULT 5,
    current_mentees INTEGER DEFAULT 0,
    is_accepting BOOLEAN DEFAULT TRUE,
    total_observations INTEGER DEFAULT 0,
    total_endorsements INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2)
);

-- ====================
-- EMPLOYER PROFILES
-- ====================

CREATE TABLE IF NOT EXISTS public.employer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_name TEXT DEFAULT 'My Company',
    company_size TEXT,
    industry TEXT DEFAULT 'Technology',
    company_website TEXT,
    company_logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    subscription_tier TEXT DEFAULT 'standard',
    total_hires INTEGER DEFAULT 0,
    total_connections INTEGER DEFAULT 0
);

-- ====================
-- SKILL PASSPORTS
-- ====================

CREATE TABLE IF NOT EXISTS public.skill_passports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL UNIQUE REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verification_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    readiness_tier readiness_tier DEFAULT 'tier_3',
    behavioral_scores JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ====================
-- GROWTH LOG ENTRIES
-- ====================

CREATE TABLE IF NOT EXISTS public.growth_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_type growth_log_event_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    source_component TEXT,
    source_id UUID
);

CREATE INDEX IF NOT EXISTS idx_growth_log_candidate ON public.growth_log_entries(candidate_id);
CREATE INDEX IF NOT EXISTS idx_growth_log_created ON public.growth_log_entries(created_at DESC);

-- ====================
-- MENTOR ASSIGNMENTS
-- ====================

CREATE TABLE IF NOT EXISTS public.mentor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
    loop_number INTEGER DEFAULT 1,
    assigned_by UUID REFERENCES public.profiles(id)
);

-- ====================
-- MENTOR OBSERVATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.mentor_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    session_date DATE DEFAULT CURRENT_DATE,
    behavioral_scores JSONB DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    areas_for_improvement TEXT[] DEFAULT '{}',
    notes TEXT,
    is_locked BOOLEAN DEFAULT FALSE
);

-- ====================
-- ENDORSEMENTS
-- ====================

CREATE TABLE IF NOT EXISTS public.endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decision endorsement_decision NOT NULL,
    justification TEXT NOT NULL,
    redirect_to TEXT CHECK (redirect_to IN ('bridgefast', 'liveworks') OR redirect_to IS NULL),
    redirect_module_id UUID
);

-- ====================
-- BRIDGEFAST MODULES
-- ====================

CREATE TABLE IF NOT EXISTS public.bridgefast_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    behavioral_dimension TEXT NOT NULL,
    duration_hours DECIMAL(4,1) DEFAULT 2,
    content_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0
);

-- ====================
-- BRIDGEFAST PROGRESS
-- ====================

CREATE TABLE IF NOT EXISTS public.bridgefast_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.bridgefast_modules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_percent INTEGER DEFAULT 0,
    final_score INTEGER,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    deadline TIMESTAMPTZ,
    UNIQUE(candidate_id, module_id)
);

-- ====================
-- LIVEWORKS PROJECTS
-- ====================

CREATE TABLE IF NOT EXISTS public.liveworks_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    employer_id UUID NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES public.mentor_profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    duration_days INTEGER DEFAULT 14,
    status project_status DEFAULT 'draft',
    max_candidates INTEGER DEFAULT 1,
    selected_candidate_id UUID REFERENCES public.candidate_profiles(id)
);

-- ====================
-- LIVEWORKS MILESTONES
-- ====================

CREATE TABLE IF NOT EXISTS public.liveworks_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.liveworks_projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    status milestone_status DEFAULT 'pending',
    due_date DATE,
    payment_amount DECIMAL(10,2),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
);

-- ====================
-- LIVEWORKS APPLICATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.liveworks_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.liveworks_projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    UNIQUE(project_id, candidate_id)
);

-- ====================
-- T3X CONNECTIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.t3x_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status connection_status DEFAULT 'pending',
    message TEXT,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
);

-- ====================
-- TALENTVISA NOMINATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.talentvisa_nominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    nominating_mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    justification TEXT NOT NULL,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- ====================
-- EMPLOYER FEEDBACK
-- ====================

CREATE TABLE IF NOT EXISTS public.employer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    hire_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('30_day', '60_day', '90_day')),
    performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
    readiness_accuracy INTEGER CHECK (readiness_accuracy BETWEEN 1 AND 5),
    behavioral_alignment JSONB,
    comments TEXT,
    would_hire_again BOOLEAN
);

-- ====================
-- NOTIFICATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = FALSE;

-- ====================
-- RLS POLICIES (Permissive for development)
-- ====================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true);

-- Candidate Profiles
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidate_profiles_all" ON public.candidate_profiles;
CREATE POLICY "candidate_profiles_all" ON public.candidate_profiles FOR ALL USING (true) WITH CHECK (true);

-- Mentor Profiles
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_profiles_all" ON public.mentor_profiles;
CREATE POLICY "mentor_profiles_all" ON public.mentor_profiles FOR ALL USING (true) WITH CHECK (true);

-- Employer Profiles
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employer_profiles_all" ON public.employer_profiles;
CREATE POLICY "employer_profiles_all" ON public.employer_profiles FOR ALL USING (true) WITH CHECK (true);

-- Skill Passports
ALTER TABLE public.skill_passports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skill_passports_all" ON public.skill_passports;
CREATE POLICY "skill_passports_all" ON public.skill_passports FOR ALL USING (true) WITH CHECK (true);

-- Growth Log
ALTER TABLE public.growth_log_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "growth_log_all" ON public.growth_log_entries;
CREATE POLICY "growth_log_all" ON public.growth_log_entries FOR ALL USING (true) WITH CHECK (true);

-- Mentor Assignments
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_assignments_all" ON public.mentor_assignments;
CREATE POLICY "mentor_assignments_all" ON public.mentor_assignments FOR ALL USING (true) WITH CHECK (true);

-- Mentor Observations
ALTER TABLE public.mentor_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_observations_all" ON public.mentor_observations;
CREATE POLICY "mentor_observations_all" ON public.mentor_observations FOR ALL USING (true) WITH CHECK (true);

-- Endorsements
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "endorsements_all" ON public.endorsements;
CREATE POLICY "endorsements_all" ON public.endorsements FOR ALL USING (true) WITH CHECK (true);

-- BridgeFast Modules
ALTER TABLE public.bridgefast_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bridgefast_modules_all" ON public.bridgefast_modules;
CREATE POLICY "bridgefast_modules_all" ON public.bridgefast_modules FOR ALL USING (true) WITH CHECK (true);

-- BridgeFast Progress
ALTER TABLE public.bridgefast_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bridgefast_progress_all" ON public.bridgefast_progress;
CREATE POLICY "bridgefast_progress_all" ON public.bridgefast_progress FOR ALL USING (true) WITH CHECK (true);

-- LiveWorks Projects
ALTER TABLE public.liveworks_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liveworks_projects_all" ON public.liveworks_projects;
CREATE POLICY "liveworks_projects_all" ON public.liveworks_projects FOR ALL USING (true) WITH CHECK (true);

-- LiveWorks Milestones
ALTER TABLE public.liveworks_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liveworks_milestones_all" ON public.liveworks_milestones;
CREATE POLICY "liveworks_milestones_all" ON public.liveworks_milestones FOR ALL USING (true) WITH CHECK (true);

-- LiveWorks Applications
ALTER TABLE public.liveworks_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liveworks_applications_all" ON public.liveworks_applications;
CREATE POLICY "liveworks_applications_all" ON public.liveworks_applications FOR ALL USING (true) WITH CHECK (true);

-- T3X Connections
ALTER TABLE public.t3x_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3x_connections_all" ON public.t3x_connections;
CREATE POLICY "t3x_connections_all" ON public.t3x_connections FOR ALL USING (true) WITH CHECK (true);

-- TalentVisa Nominations
ALTER TABLE public.talentvisa_nominations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "talentvisa_nominations_all" ON public.talentvisa_nominations;
CREATE POLICY "talentvisa_nominations_all" ON public.talentvisa_nominations FOR ALL USING (true) WITH CHECK (true);

-- Employer Feedback
ALTER TABLE public.employer_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employer_feedback_all" ON public.employer_feedback;
CREATE POLICY "employer_feedback_all" ON public.employer_feedback FOR ALL USING (true) WITH CHECK (true);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
CREATE POLICY "notifications_all" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ====================
-- GRANT PERMISSIONS
-- ====================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.candidate_profiles TO authenticated;
GRANT ALL ON public.mentor_profiles TO authenticated;
GRANT ALL ON public.employer_profiles TO authenticated;
GRANT ALL ON public.skill_passports TO authenticated;
GRANT ALL ON public.growth_log_entries TO authenticated;
GRANT ALL ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_observations TO authenticated;
GRANT ALL ON public.endorsements TO authenticated;
GRANT ALL ON public.bridgefast_modules TO authenticated;
GRANT ALL ON public.bridgefast_progress TO authenticated;
GRANT ALL ON public.liveworks_projects TO authenticated;
GRANT ALL ON public.liveworks_milestones TO authenticated;
GRANT ALL ON public.liveworks_applications TO authenticated;
GRANT ALL ON public.t3x_connections TO authenticated;
GRANT ALL ON public.talentvisa_nominations TO authenticated;
GRANT ALL ON public.employer_feedback TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

-- ====================
-- SEED DATA: BridgeFast Modules
-- ====================

INSERT INTO public.bridgefast_modules (title, description, behavioral_dimension, duration_hours, order_index) VALUES
('Professional Communication', 'Master workplace communication skills including email etiquette, meeting participation, and presentation delivery.', 'Communication', 3, 1),
('Time Management & Prioritization', 'Learn to manage competing priorities, meet deadlines, and maintain work-life balance.', 'Organization', 2.5, 2),
('Collaborative Problem Solving', 'Develop skills for working effectively in teams and contributing to group problem-solving.', 'Teamwork', 3, 3),
('Workplace Adaptability', 'Build resilience and flexibility to handle change, feedback, and evolving requirements.', 'Adaptability', 2, 4),
('Professional Ethics & Integrity', 'Understand workplace ethics, confidentiality, and professional responsibility.', 'Ethics', 2, 5),
('Critical Thinking & Analysis', 'Strengthen analytical skills for evaluating information and making sound decisions.', 'Critical Thinking', 3.5, 6),
('Initiative & Self-Direction', 'Learn to take ownership, show initiative, and work independently when needed.', 'Initiative', 2.5, 7),
('Conflict Resolution', 'Develop skills for addressing disagreements constructively and maintaining professional relationships.', 'Interpersonal', 2, 8)
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE! Schema matches the existing database
-- ============================================
