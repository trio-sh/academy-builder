-- Migration to fix skills saving and RLS issues
-- Run this in your Supabase SQL Editor

-- ===================================================
-- CANDIDATE_PROFILES TABLE FIXES
-- ===================================================

-- First, ensure profile_id has a UNIQUE constraint for upserts
-- This may already exist, so we use IF NOT EXISTS pattern
DO $$
BEGIN
  -- Check if unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'candidate_profiles_profile_id_key'
  ) THEN
    ALTER TABLE public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- Disable RLS on candidate_profiles to allow all operations
ALTER TABLE public.candidate_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on candidate_profiles (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'candidate_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.candidate_profiles', pol.policyname);
  END LOOP;
END $$;

-- Re-enable RLS with permissive policies
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own candidate profile
CREATE POLICY "Users can view own candidate profile"
ON public.candidate_profiles
FOR SELECT
USING (auth.uid() = profile_id);

-- Allow users to insert their own candidate profile
CREATE POLICY "Users can insert own candidate profile"
ON public.candidate_profiles
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Allow users to update their own candidate profile
CREATE POLICY "Users can update own candidate profile"
ON public.candidate_profiles
FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- ===================================================
-- GROWTH_LOG_ENTRIES TABLE FIXES
-- ===================================================

-- Disable RLS on growth_log_entries
ALTER TABLE public.growth_log_entries DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on growth_log_entries
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'growth_log_entries' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.growth_log_entries', pol.policyname);
  END LOOP;
END $$;

-- Re-enable RLS with permissive policies
ALTER TABLE public.growth_log_entries ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own growth log entries
CREATE POLICY "Users can view own growth log"
ON public.growth_log_entries
FOR SELECT
USING (auth.uid() = candidate_id);

-- Allow users to insert their own growth log entries
CREATE POLICY "Users can insert own growth log"
ON public.growth_log_entries
FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

-- ===================================================
-- PROFILES TABLE FIXES
-- ===================================================

-- Ensure profiles RLS allows users to update their own profile
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ===================================================
-- QUICK ALTERNATIVE: DISABLE ALL RLS
-- ===================================================
-- If the above doesn't work, uncomment these lines to completely disable RLS:

-- ALTER TABLE public.candidate_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.growth_log_entries DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'candidate_profiles', 'growth_log_entries');

-- List all policies
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'candidate_profiles', 'growth_log_entries')
ORDER BY tablename, policyname;
