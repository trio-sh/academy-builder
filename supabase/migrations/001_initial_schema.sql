-- The 3rd Academy Database Schema - SIMPLIFIED FOR INITIAL SETUP
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/cigvezhgksdeieekyyrh/sql

-- ====================
-- STEP 1: ENUM TYPES
-- ====================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'mentor', 'employer', 'school_admin', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_path AS ENUM ('resume_upload', 'liveworks', 'civic_access');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE readiness_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================
-- STEP 2: PROFILES TABLE
-- ====================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    role user_role NOT NULL DEFAULT 'candidate',
    avatar_url TEXT,
    headline TEXT,
    bio TEXT,
    location TEXT,
    linkedin_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL
);

-- ====================
-- STEP 3: ROLE-SPECIFIC TABLES
-- ====================

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resume_url TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_years INTEGER,
    education JSONB,
    work_history JSONB,
    entry_path entry_path NOT NULL DEFAULT 'resume_upload',
    current_tier readiness_tier,
    mentor_loops INTEGER DEFAULT 0 NOT NULL,
    has_skill_passport BOOLEAN DEFAULT FALSE NOT NULL,
    has_talentvisa BOOLEAN DEFAULT FALSE NOT NULL,
    is_listed_on_t3x BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE IF NOT EXISTS mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    industry TEXT NOT NULL DEFAULT 'Technology',
    specializations TEXT[] DEFAULT '{}',
    years_experience INTEGER NOT NULL DEFAULT 5,
    company TEXT,
    job_title TEXT,
    max_mentees INTEGER DEFAULT 5 NOT NULL,
    current_mentees INTEGER DEFAULT 0 NOT NULL,
    is_accepting BOOLEAN DEFAULT TRUE NOT NULL,
    total_observations INTEGER DEFAULT 0 NOT NULL,
    total_endorsements INTEGER DEFAULT 0 NOT NULL,
    avg_rating DECIMAL(3,2)
);

CREATE TABLE IF NOT EXISTS employer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    company_name TEXT NOT NULL DEFAULT 'My Company',
    company_size TEXT,
    industry TEXT NOT NULL DEFAULT 'Technology',
    company_website TEXT,
    company_logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    subscription_tier TEXT DEFAULT 'standard' NOT NULL,
    total_hires INTEGER DEFAULT 0 NOT NULL,
    total_connections INTEGER DEFAULT 0 NOT NULL
);

-- ====================
-- STEP 4: NOTIFICATIONS TABLE
-- ====================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    action_url TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ====================
-- STEP 5: TRIGGER FUNCTION FOR NEW USERS
-- ====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_role_val user_role;
    user_first_name TEXT;
    user_last_name TEXT;
BEGIN
    -- Safely get values with defaults
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

    -- Safely cast role with default
    BEGIN
        user_role_val := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
        user_role_val := 'candidate'::user_role;
    END;

    -- Insert profile
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        user_first_name,
        user_last_name,
        user_role_val
    );

    -- Create role-specific profile
    IF user_role_val = 'candidate' THEN
        INSERT INTO public.candidate_profiles (profile_id, entry_path)
        VALUES (NEW.id, 'resume_upload'::entry_path);
    ELSIF user_role_val = 'mentor' THEN
        INSERT INTO public.mentor_profiles (profile_id, industry, years_experience)
        VALUES (NEW.id, 'Technology', 5);
    ELSIF user_role_val = 'employer' THEN
        INSERT INTO public.employer_profiles (profile_id, company_name, industry)
        VALUES (NEW.id, 'My Company', 'Technology');
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================
-- STEP 6: ROW LEVEL SECURITY
-- ====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;

DROP POLICY IF EXISTS "Candidates can view own profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update own profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON candidate_profiles;

DROP POLICY IF EXISTS "Mentors can view own profile" ON mentor_profiles;
DROP POLICY IF EXISTS "Mentors can update own profile" ON mentor_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON mentor_profiles;

DROP POLICY IF EXISTS "Employers can view own profile" ON employer_profiles;
DROP POLICY IF EXISTS "Employers can update own profile" ON employer_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON employer_profiles;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
    FOR SELECT TO authenticated USING (is_active = TRUE);

-- Candidate profiles policies
CREATE POLICY "Candidates can view own profile" ON candidate_profiles
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Candidates can update own profile" ON candidate_profiles
    FOR UPDATE USING (profile_id = auth.uid());

-- Mentor profiles policies
CREATE POLICY "Mentors can view own profile" ON mentor_profiles
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Mentors can update own profile" ON mentor_profiles
    FOR UPDATE USING (profile_id = auth.uid());

-- Employer profiles policies
CREATE POLICY "Employers can view own profile" ON employer_profiles
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Employers can update own profile" ON employer_profiles
    FOR UPDATE USING (profile_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ====================
-- DONE!
-- ====================
-- You can now sign up users at /get-started
