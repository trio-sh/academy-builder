-- ============================================
-- Fix RLS Policies for 406 Errors
-- ============================================
-- Run this in Supabase SQL Editor to fix permission issues
-- ============================================

-- Fix candidate_profiles
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidate_profiles_select" ON public.candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_insert" ON public.candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_update" ON public.candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_all" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Enable update for users based on profile_id" ON public.candidate_profiles;

-- Create permissive policies
CREATE POLICY "Allow all select" ON public.candidate_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.candidate_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.candidate_profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.candidate_profiles FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.candidate_profiles TO authenticated;
GRANT ALL ON public.candidate_profiles TO anon;

-- Fix mentor_profiles
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_profiles_select" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_insert" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_update" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_all" ON public.mentor_profiles;

CREATE POLICY "Allow all select" ON public.mentor_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.mentor_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.mentor_profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.mentor_profiles FOR DELETE USING (true);

GRANT ALL ON public.mentor_profiles TO authenticated;
GRANT ALL ON public.mentor_profiles TO anon;

-- Fix employer_profiles
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employer_profiles_select" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_insert" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_update" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_all" ON public.employer_profiles;

CREATE POLICY "Allow all select" ON public.employer_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.employer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.employer_profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.employer_profiles FOR DELETE USING (true);

GRANT ALL ON public.employer_profiles TO authenticated;
GRANT ALL ON public.employer_profiles TO anon;

-- Fix growth_log_entries
ALTER TABLE public.growth_log_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "growth_log_select" ON public.growth_log_entries;
DROP POLICY IF EXISTS "growth_log_insert" ON public.growth_log_entries;
DROP POLICY IF EXISTS "growth_log_all" ON public.growth_log_entries;

CREATE POLICY "Allow all select" ON public.growth_log_entries FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.growth_log_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.growth_log_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.growth_log_entries FOR DELETE USING (true);

GRANT ALL ON public.growth_log_entries TO authenticated;
GRANT ALL ON public.growth_log_entries TO anon;

-- Fix bridgefast_progress
ALTER TABLE public.bridgefast_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bridgefast_progress_select" ON public.bridgefast_progress;
DROP POLICY IF EXISTS "bridgefast_progress_insert" ON public.bridgefast_progress;
DROP POLICY IF EXISTS "bridgefast_progress_update" ON public.bridgefast_progress;
DROP POLICY IF EXISTS "bridgefast_progress_all" ON public.bridgefast_progress;

CREATE POLICY "Allow all select" ON public.bridgefast_progress FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.bridgefast_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.bridgefast_progress FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.bridgefast_progress FOR DELETE USING (true);

GRANT ALL ON public.bridgefast_progress TO authenticated;
GRANT ALL ON public.bridgefast_progress TO anon;

-- Fix bridgefast_modules
ALTER TABLE public.bridgefast_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bridgefast_modules_select" ON public.bridgefast_modules;
DROP POLICY IF EXISTS "bridgefast_modules_all" ON public.bridgefast_modules;

CREATE POLICY "Allow all select" ON public.bridgefast_modules FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.bridgefast_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.bridgefast_modules FOR UPDATE USING (true) WITH CHECK (true);

GRANT ALL ON public.bridgefast_modules TO authenticated;
GRANT ALL ON public.bridgefast_modules TO anon;

-- Fix notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;

CREATE POLICY "Allow all select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.notifications FOR DELETE USING (true);

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO anon;

-- Fix liveworks_projects
ALTER TABLE public.liveworks_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liveworks_projects_select" ON public.liveworks_projects;
DROP POLICY IF EXISTS "liveworks_projects_insert" ON public.liveworks_projects;
DROP POLICY IF EXISTS "liveworks_projects_all" ON public.liveworks_projects;

CREATE POLICY "Allow all select" ON public.liveworks_projects FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.liveworks_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.liveworks_projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.liveworks_projects FOR DELETE USING (true);

GRANT ALL ON public.liveworks_projects TO authenticated;
GRANT ALL ON public.liveworks_projects TO anon;

-- Fix t3x_connections
ALTER TABLE public.t3x_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3x_connections_select" ON public.t3x_connections;
DROP POLICY IF EXISTS "t3x_connections_insert" ON public.t3x_connections;
DROP POLICY IF EXISTS "t3x_connections_all" ON public.t3x_connections;

CREATE POLICY "Allow all select" ON public.t3x_connections FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.t3x_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.t3x_connections FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.t3x_connections FOR DELETE USING (true);

GRANT ALL ON public.t3x_connections TO authenticated;
GRANT ALL ON public.t3x_connections TO anon;

-- Fix mentor_assignments
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_assignments_select" ON public.mentor_assignments;
DROP POLICY IF EXISTS "mentor_assignments_insert" ON public.mentor_assignments;
DROP POLICY IF EXISTS "mentor_assignments_all" ON public.mentor_assignments;

CREATE POLICY "Allow all select" ON public.mentor_assignments FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.mentor_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.mentor_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.mentor_assignments FOR DELETE USING (true);

GRANT ALL ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_assignments TO anon;

-- ============================================
-- DONE! RLS policies are now permissive
-- ============================================
