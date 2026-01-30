-- The 3rd Academy - MINIMAL SETUP (FIXED RLS)
-- Run this in Supabase SQL Editor

-- Step 1: Drop problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'mentor', 'employer', 'school_admin', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_path AS ENUM ('resume_upload', 'liveworks', 'civic_access');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create profiles table
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

-- Step 4: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL existing policies
DROP POLICY IF EXISTS "Enable read access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all inserts" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

-- Step 6: Create FIXED policies
-- SELECT: Anyone authenticated can read profiles
CREATE POLICY "Enable read access for users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- INSERT: Allow if the id matches the authenticated user (using JWT sub for immediate post-signup)
CREATE POLICY "Enable insert for authenticated users" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- UPDATE: Users can only update their own profile
CREATE POLICY "Enable update for users based on id" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Done!
