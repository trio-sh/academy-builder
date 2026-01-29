-- The 3rd Academy Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- ENUM TYPES
-- ====================

CREATE TYPE user_role AS ENUM ('candidate', 'mentor', 'employer', 'school_admin', 'admin');
CREATE TYPE endorsement_decision AS ENUM ('proceed', 'redirect', 'pause');
CREATE TYPE readiness_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
CREATE TYPE growth_log_event_type AS ENUM ('assessment', 'training', 'project', 'observation', 'tier_change', 'endorsement');
CREATE TYPE project_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'revision_requested');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE entry_path AS ENUM ('resume_upload', 'liveworks', 'civic_access');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE subscription_tier AS ENUM ('standard', 'premium');
CREATE TYPE feedback_type AS ENUM ('30_day', '60_day', '90_day');
CREATE TYPE assignment_status AS ENUM ('active', 'completed', 'transferred');
CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');
CREATE TYPE nomination_status AS ENUM ('pending', 'approved', 'rejected');

-- ====================
-- CORE TABLES
-- ====================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL,
    avatar_url TEXT,
    headline TEXT,
    bio TEXT,
    location TEXT,
    linkedin_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL
);

-- Candidate-specific profile data
CREATE TABLE candidate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resume_url TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_years INTEGER,
    education JSONB,
    work_history JSONB,
    entry_path entry_path NOT NULL,
    current_tier readiness_tier,
    mentor_loops INTEGER DEFAULT 0 NOT NULL,
    has_skill_passport BOOLEAN DEFAULT FALSE NOT NULL,
    has_talentvisa BOOLEAN DEFAULT FALSE NOT NULL,
    is_listed_on_t3x BOOLEAN DEFAULT FALSE NOT NULL
);

-- Mentor-specific profile data
CREATE TABLE mentor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    industry TEXT NOT NULL,
    specializations TEXT[] DEFAULT '{}',
    years_experience INTEGER NOT NULL,
    company TEXT,
    job_title TEXT,
    max_mentees INTEGER DEFAULT 5 NOT NULL,
    current_mentees INTEGER DEFAULT 0 NOT NULL,
    is_accepting BOOLEAN DEFAULT TRUE NOT NULL,
    total_observations INTEGER DEFAULT 0 NOT NULL,
    total_endorsements INTEGER DEFAULT 0 NOT NULL,
    avg_rating DECIMAL(3,2)
);

-- Employer-specific profile data
CREATE TABLE employer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    company_name TEXT NOT NULL,
    company_size TEXT,
    industry TEXT NOT NULL,
    company_website TEXT,
    company_logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    subscription_tier subscription_tier DEFAULT 'standard' NOT NULL,
    total_hires INTEGER DEFAULT 0 NOT NULL,
    total_connections INTEGER DEFAULT 0 NOT NULL
);

-- ====================
-- SKILL PASSPORT
-- ====================

CREATE TABLE skill_passports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    readiness_tier readiness_tier NOT NULL,
    behavioral_scores JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ
);

-- ====================
-- GROWTH LOG
-- ====================

CREATE TABLE growth_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    event_type growth_log_event_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    source_component TEXT,
    source_id UUID
);

CREATE INDEX idx_growth_log_candidate ON growth_log_entries(candidate_id);
CREATE INDEX idx_growth_log_created ON growth_log_entries(created_at DESC);

-- ====================
-- MENTORLINK
-- ====================

CREATE TABLE mentor_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status assignment_status DEFAULT 'active' NOT NULL,
    loop_number INTEGER DEFAULT 1 NOT NULL,
    assigned_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_mentor_assignments_mentor ON mentor_assignments(mentor_id);
CREATE INDEX idx_mentor_assignments_candidate ON mentor_assignments(candidate_id);

CREATE TABLE mentor_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES mentor_assignments(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    session_date DATE NOT NULL,
    behavioral_scores JSONB NOT NULL DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    areas_for_improvement TEXT[] DEFAULT '{}',
    notes TEXT,
    is_locked BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE INDEX idx_observations_assignment ON mentor_observations(assignment_id);

CREATE TABLE endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES mentor_assignments(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    decision endorsement_decision NOT NULL,
    justification TEXT NOT NULL,
    redirect_to TEXT CHECK (redirect_to IN ('bridgefast', 'liveworks') OR redirect_to IS NULL),
    redirect_module_id UUID
);

CREATE INDEX idx_endorsements_candidate ON endorsements(candidate_id);

-- ====================
-- BRIDGEFAST
-- ====================

CREATE TABLE bridgefast_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    behavioral_dimension TEXT NOT NULL,
    duration_hours DECIMAL(4,1) NOT NULL,
    content_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bridgefast_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES bridgefast_modules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_percent INTEGER DEFAULT 0 NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
    final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
    status progress_status DEFAULT 'not_started' NOT NULL,
    deadline TIMESTAMPTZ,
    UNIQUE(candidate_id, module_id)
);

-- ====================
-- LIVEWORKS STUDIO
-- ====================

CREATE TABLE liveworks_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES mentor_profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    skill_level skill_level DEFAULT 'intermediate' NOT NULL,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    duration_days INTEGER NOT NULL,
    status project_status DEFAULT 'draft' NOT NULL,
    max_candidates INTEGER DEFAULT 1 NOT NULL,
    selected_candidate_id UUID REFERENCES candidate_profiles(id)
);

CREATE INDEX idx_liveworks_projects_employer ON liveworks_projects(employer_id);
CREATE INDEX idx_liveworks_projects_status ON liveworks_projects(status);

CREATE TABLE liveworks_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES liveworks_projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    status milestone_status DEFAULT 'pending' NOT NULL,
    due_date DATE,
    payment_amount DECIMAL(10,2),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
);

CREATE INDEX idx_milestones_project ON liveworks_milestones(project_id);

CREATE TABLE liveworks_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES liveworks_projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    UNIQUE(project_id, candidate_id)
);

-- ====================
-- T3X TALENT EXCHANGE
-- ====================

CREATE TABLE t3x_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status connection_status DEFAULT 'pending' NOT NULL,
    message TEXT,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')
);

CREATE INDEX idx_t3x_connections_employer ON t3x_connections(employer_id);
CREATE INDEX idx_t3x_connections_candidate ON t3x_connections(candidate_id);

CREATE TABLE employer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    hire_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    feedback_type feedback_type NOT NULL,
    performance_rating INTEGER NOT NULL CHECK (performance_rating >= 1 AND performance_rating <= 5),
    readiness_accuracy INTEGER NOT NULL CHECK (readiness_accuracy >= 1 AND readiness_accuracy <= 5),
    behavioral_alignment JSONB,
    comments TEXT,
    would_hire_again BOOLEAN NOT NULL,
    UNIQUE(employer_id, candidate_id, feedback_type)
);

-- ====================
-- TALENTVISA
-- ====================

CREATE TABLE talentvisa_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    nominating_mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status nomination_status DEFAULT 'pending' NOT NULL,
    justification TEXT NOT NULL,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '18 months')
);

-- ====================
-- NOTIFICATIONS
-- ====================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    action_url TEXT,
    metadata JSONB
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ====================
-- TRIGGERS
-- ====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentor_profiles_updated_at BEFORE UPDATE ON mentor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employer_profiles_updated_at BEFORE UPDATE ON employer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skill_passports_updated_at BEFORE UPDATE ON skill_passports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentor_assignments_updated_at BEFORE UPDATE ON mentor_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentor_observations_updated_at BEFORE UPDATE ON mentor_observations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bridgefast_modules_updated_at BEFORE UPDATE ON bridgefast_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bridgefast_progress_updated_at BEFORE UPDATE ON bridgefast_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_liveworks_projects_updated_at BEFORE UPDATE ON liveworks_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_liveworks_milestones_updated_at BEFORE UPDATE ON liveworks_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_t3x_connections_updated_at BEFORE UPDATE ON t3x_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_talentvisa_nominations_updated_at BEFORE UPDATE ON talentvisa_nominations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'candidate')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create role-specific profile
CREATE OR REPLACE FUNCTION handle_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'candidate' THEN
        INSERT INTO candidate_profiles (profile_id, entry_path)
        VALUES (NEW.id, 'resume_upload')
        ON CONFLICT (profile_id) DO NOTHING;
    ELSIF NEW.role = 'mentor' THEN
        INSERT INTO mentor_profiles (profile_id, industry, years_experience)
        VALUES (NEW.id, 'Technology', 5)
        ON CONFLICT (profile_id) DO NOTHING;
    ELSIF NEW.role = 'employer' THEN
        INSERT INTO employer_profiles (profile_id, company_name, industry)
        VALUES (NEW.id, 'Company', 'Technology')
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_profile_role();

-- ====================
-- ROW LEVEL SECURITY
-- ====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridgefast_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridgefast_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE liveworks_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE liveworks_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE liveworks_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3x_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE talentvisa_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (is_active = TRUE);

-- Candidate profiles policies
CREATE POLICY "Candidates can view own profile" ON candidate_profiles FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Candidates can update own profile" ON candidate_profiles FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Mentors can view assigned candidates" ON candidate_profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM mentor_assignments ma
        JOIN mentor_profiles mp ON ma.mentor_id = mp.id
        WHERE ma.candidate_id = candidate_profiles.id AND mp.profile_id = auth.uid()
    )
);
CREATE POLICY "Employers can view T3X listed candidates" ON candidate_profiles FOR SELECT USING (is_listed_on_t3x = TRUE);

-- Mentor profiles policies
CREATE POLICY "Mentors can view own profile" ON mentor_profiles FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Mentors can update own profile" ON mentor_profiles FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Active mentors are publicly viewable" ON mentor_profiles FOR SELECT USING (is_accepting = TRUE);

-- Employer profiles policies
CREATE POLICY "Employers can view own profile" ON employer_profiles FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Employers can update own profile" ON employer_profiles FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Verified employers are publicly viewable" ON employer_profiles FOR SELECT USING (is_verified = TRUE);

-- Skill passports policies
CREATE POLICY "Candidates can view own passport" ON skill_passports FOR SELECT USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_id AND cp.profile_id = auth.uid())
);
CREATE POLICY "Public verification allowed" ON skill_passports FOR SELECT USING (is_active = TRUE);

-- Growth log policies
CREATE POLICY "Candidates can view own growth log" ON growth_log_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_id AND cp.profile_id = auth.uid())
);
CREATE POLICY "Mentors can add to assigned candidate logs" ON growth_log_entries FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM mentor_assignments ma
        JOIN mentor_profiles mp ON ma.mentor_id = mp.id
        WHERE ma.candidate_id = growth_log_entries.candidate_id AND mp.profile_id = auth.uid()
    )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- BridgeFast modules are publicly readable
CREATE POLICY "Modules are publicly viewable" ON bridgefast_modules FOR SELECT USING (is_active = TRUE);

-- LiveWorks projects policies
CREATE POLICY "Open projects are publicly viewable" ON liveworks_projects FOR SELECT USING (status IN ('open', 'in_progress'));
CREATE POLICY "Employers can manage own projects" ON liveworks_projects FOR ALL USING (
    EXISTS (SELECT 1 FROM employer_profiles ep WHERE ep.id = employer_id AND ep.profile_id = auth.uid())
);
