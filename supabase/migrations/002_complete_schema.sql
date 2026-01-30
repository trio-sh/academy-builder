-- The 3rd Academy - COMPLETE Database Schema
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
--
-- IMPORTANT: If you get errors, run each section separately
-- Copy from one comment block to the next

-- ====================
-- SECTION 1: ENUM TYPES
-- ====================

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
-- SECTION 2: CANDIDATE PROFILES
-- ====================

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resume_url TEXT,
    resume_filename TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_years INTEGER,
    education JSONB DEFAULT '[]',
    work_history JSONB DEFAULT '[]',
    entry_path TEXT DEFAULT 'resume_upload',
    current_tier readiness_tier,
    mentor_loops INTEGER DEFAULT 0,
    has_skill_passport BOOLEAN DEFAULT FALSE,
    has_talentvisa BOOLEAN DEFAULT FALSE,
    is_listed_on_t3x BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_candidate_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 3: MENTOR PROFILES
-- ====================

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    industry TEXT NOT NULL DEFAULT 'Technology',
    specializations TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 5,
    company TEXT,
    job_title TEXT,
    max_mentees INTEGER DEFAULT 5,
    current_mentees INTEGER DEFAULT 0,
    is_accepting BOOLEAN DEFAULT TRUE,
    total_observations INTEGER DEFAULT 0,
    total_endorsements INTEGER DEFAULT 0,
    CONSTRAINT fk_mentor_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 4: EMPLOYER PROFILES
-- ====================

CREATE TABLE IF NOT EXISTS public.employer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_name TEXT NOT NULL DEFAULT 'My Company',
    company_size TEXT,
    industry TEXT DEFAULT 'Technology',
    company_website TEXT,
    company_logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    total_hires INTEGER DEFAULT 0,
    total_connections INTEGER DEFAULT 0,
    CONSTRAINT fk_employer_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 5: GROWTH LOG
-- ====================

CREATE TABLE IF NOT EXISTS public.growth_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_type growth_log_event_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    source_component TEXT,
    source_id UUID,
    CONSTRAINT fk_growth_log_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_growth_log_profile ON public.growth_log_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_growth_log_created ON public.growth_log_entries(created_at DESC);

-- ====================
-- SECTION 6: SKILL PASSPORT
-- ====================

CREATE TABLE IF NOT EXISTS public.skill_passports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    readiness_tier readiness_tier NOT NULL DEFAULT 'tier_3',
    behavioral_scores JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT fk_skill_passport_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 7: MENTOR ASSIGNMENTS
-- ====================

CREATE TABLE IF NOT EXISTS public.mentor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_profile_id UUID NOT NULL,
    candidate_profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
    loop_number INTEGER DEFAULT 1,
    assigned_by UUID,
    CONSTRAINT fk_mentor_assignment_mentor FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentor_assignment_candidate FOREIGN KEY (candidate_profile_id) REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentor_assignment_assigner FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);

-- ====================
-- SECTION 8: MENTOR OBSERVATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.mentor_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    behavioral_scores JSONB DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    areas_for_improvement TEXT[] DEFAULT '{}',
    notes TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_observation_assignment FOREIGN KEY (assignment_id) REFERENCES public.mentor_assignments(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 9: ENDORSEMENTS
-- ====================

CREATE TABLE IF NOT EXISTS public.endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decision endorsement_decision NOT NULL,
    justification TEXT NOT NULL,
    redirect_to TEXT CHECK (redirect_to IN ('bridgefast', 'liveworks') OR redirect_to IS NULL),
    CONSTRAINT fk_endorsement_assignment FOREIGN KEY (assignment_id) REFERENCES public.mentor_assignments(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 10: BRIDGEFAST MODULES
-- ====================

CREATE TABLE IF NOT EXISTS public.bridgefast_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    behavioral_dimension TEXT NOT NULL,
    duration_hours DECIMAL(4,1) NOT NULL DEFAULT 2,
    content_url TEXT,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0
);

-- ====================
-- SECTION 11: BRIDGEFAST PROGRESS
-- ====================

CREATE TABLE IF NOT EXISTS public.bridgefast_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    module_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_percent INTEGER DEFAULT 0,
    final_score INTEGER,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    UNIQUE(profile_id, module_id),
    CONSTRAINT fk_bridgefast_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_bridgefast_module FOREIGN KEY (module_id) REFERENCES public.bridgefast_modules(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 12: LIVEWORKS PROJECTS
-- ====================

CREATE TABLE IF NOT EXISTS public.liveworks_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    employer_profile_id UUID NOT NULL,
    mentor_profile_id UUID,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    skills_required TEXT[] DEFAULT '{}',
    skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    duration_days INTEGER NOT NULL DEFAULT 14,
    status project_status DEFAULT 'draft',
    max_candidates INTEGER DEFAULT 1,
    selected_candidate_id UUID,
    CONSTRAINT fk_liveworks_employer FOREIGN KEY (employer_profile_id) REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_liveworks_mentor FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id),
    CONSTRAINT fk_liveworks_candidate FOREIGN KEY (selected_candidate_id) REFERENCES public.candidate_profiles(id)
);

-- ====================
-- SECTION 13: LIVEWORKS APPLICATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.liveworks_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    candidate_profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    UNIQUE(project_id, candidate_profile_id),
    CONSTRAINT fk_application_project FOREIGN KEY (project_id) REFERENCES public.liveworks_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_candidate FOREIGN KEY (candidate_profile_id) REFERENCES public.candidate_profiles(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 14: T3X CONNECTIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.t3x_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_profile_id UUID NOT NULL,
    candidate_profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status connection_status DEFAULT 'pending',
    message TEXT,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    CONSTRAINT fk_connection_employer FOREIGN KEY (employer_profile_id) REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_candidate FOREIGN KEY (candidate_profile_id) REFERENCES public.candidate_profiles(id) ON DELETE CASCADE
);

-- ====================
-- SECTION 15: NOTIFICATIONS
-- ====================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_notification_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(profile_id) WHERE is_read = FALSE;

-- ====================
-- SECTION 16: RLS POLICIES
-- ====================

-- Candidate Profiles
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidate_profiles_select" ON public.candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_insert" ON public.candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_update" ON public.candidate_profiles;
CREATE POLICY "candidate_profiles_select" ON public.candidate_profiles FOR SELECT USING (true);
CREATE POLICY "candidate_profiles_insert" ON public.candidate_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "candidate_profiles_update" ON public.candidate_profiles FOR UPDATE USING (true);

-- Mentor Profiles
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_profiles_select" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_insert" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_update" ON public.mentor_profiles;
CREATE POLICY "mentor_profiles_select" ON public.mentor_profiles FOR SELECT USING (true);
CREATE POLICY "mentor_profiles_insert" ON public.mentor_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "mentor_profiles_update" ON public.mentor_profiles FOR UPDATE USING (true);

-- Employer Profiles
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employer_profiles_select" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_insert" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_update" ON public.employer_profiles;
CREATE POLICY "employer_profiles_select" ON public.employer_profiles FOR SELECT USING (true);
CREATE POLICY "employer_profiles_insert" ON public.employer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "employer_profiles_update" ON public.employer_profiles FOR UPDATE USING (true);

-- Growth Log
ALTER TABLE public.growth_log_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "growth_log_select" ON public.growth_log_entries;
DROP POLICY IF EXISTS "growth_log_insert" ON public.growth_log_entries;
CREATE POLICY "growth_log_select" ON public.growth_log_entries FOR SELECT USING (true);
CREATE POLICY "growth_log_insert" ON public.growth_log_entries FOR INSERT WITH CHECK (true);

-- Skill Passports
ALTER TABLE public.skill_passports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skill_passports_select" ON public.skill_passports;
DROP POLICY IF EXISTS "skill_passports_insert" ON public.skill_passports;
CREATE POLICY "skill_passports_select" ON public.skill_passports FOR SELECT USING (true);
CREATE POLICY "skill_passports_insert" ON public.skill_passports FOR INSERT WITH CHECK (true);

-- Mentor Assignments
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_assignments_select" ON public.mentor_assignments;
DROP POLICY IF EXISTS "mentor_assignments_insert" ON public.mentor_assignments;
CREATE POLICY "mentor_assignments_select" ON public.mentor_assignments FOR SELECT USING (true);
CREATE POLICY "mentor_assignments_insert" ON public.mentor_assignments FOR INSERT WITH CHECK (true);

-- Mentor Observations
ALTER TABLE public.mentor_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_observations_select" ON public.mentor_observations;
DROP POLICY IF EXISTS "mentor_observations_insert" ON public.mentor_observations;
CREATE POLICY "mentor_observations_select" ON public.mentor_observations FOR SELECT USING (true);
CREATE POLICY "mentor_observations_insert" ON public.mentor_observations FOR INSERT WITH CHECK (true);

-- Endorsements
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "endorsements_select" ON public.endorsements;
DROP POLICY IF EXISTS "endorsements_insert" ON public.endorsements;
CREATE POLICY "endorsements_select" ON public.endorsements FOR SELECT USING (true);
CREATE POLICY "endorsements_insert" ON public.endorsements FOR INSERT WITH CHECK (true);

-- BridgeFast Modules
ALTER TABLE public.bridgefast_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bridgefast_modules_select" ON public.bridgefast_modules;
CREATE POLICY "bridgefast_modules_select" ON public.bridgefast_modules FOR SELECT USING (true);

-- BridgeFast Progress
ALTER TABLE public.bridgefast_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bridgefast_progress_select" ON public.bridgefast_progress;
DROP POLICY IF EXISTS "bridgefast_progress_insert" ON public.bridgefast_progress;
DROP POLICY IF EXISTS "bridgefast_progress_update" ON public.bridgefast_progress;
CREATE POLICY "bridgefast_progress_select" ON public.bridgefast_progress FOR SELECT USING (true);
CREATE POLICY "bridgefast_progress_insert" ON public.bridgefast_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "bridgefast_progress_update" ON public.bridgefast_progress FOR UPDATE USING (true);

-- LiveWorks Projects
ALTER TABLE public.liveworks_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liveworks_projects_select" ON public.liveworks_projects;
DROP POLICY IF EXISTS "liveworks_projects_insert" ON public.liveworks_projects;
CREATE POLICY "liveworks_projects_select" ON public.liveworks_projects FOR SELECT USING (true);
CREATE POLICY "liveworks_projects_insert" ON public.liveworks_projects FOR INSERT WITH CHECK (true);

-- LiveWorks Applications
ALTER TABLE public.liveworks_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liveworks_applications_select" ON public.liveworks_applications;
DROP POLICY IF EXISTS "liveworks_applications_insert" ON public.liveworks_applications;
CREATE POLICY "liveworks_applications_select" ON public.liveworks_applications FOR SELECT USING (true);
CREATE POLICY "liveworks_applications_insert" ON public.liveworks_applications FOR INSERT WITH CHECK (true);

-- T3X Connections
ALTER TABLE public.t3x_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3x_connections_select" ON public.t3x_connections;
DROP POLICY IF EXISTS "t3x_connections_insert" ON public.t3x_connections;
CREATE POLICY "t3x_connections_select" ON public.t3x_connections FOR SELECT USING (true);
CREATE POLICY "t3x_connections_insert" ON public.t3x_connections FOR INSERT WITH CHECK (true);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (true);

-- ====================
-- SECTION 17: GRANT PERMISSIONS
-- ====================

GRANT ALL ON public.candidate_profiles TO authenticated;
GRANT ALL ON public.mentor_profiles TO authenticated;
GRANT ALL ON public.employer_profiles TO authenticated;
GRANT ALL ON public.growth_log_entries TO authenticated;
GRANT ALL ON public.skill_passports TO authenticated;
GRANT ALL ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_observations TO authenticated;
GRANT ALL ON public.endorsements TO authenticated;
GRANT ALL ON public.bridgefast_modules TO authenticated;
GRANT ALL ON public.bridgefast_progress TO authenticated;
GRANT ALL ON public.liveworks_projects TO authenticated;
GRANT ALL ON public.liveworks_applications TO authenticated;
GRANT ALL ON public.t3x_connections TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

-- ====================
-- SECTION 18: SEED DATA
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

-- DONE! All tables created.
