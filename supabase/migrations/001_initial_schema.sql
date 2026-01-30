-- The 3rd Academy - MINIMAL SETUP
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/cigvezhgksdeieekyyrh/sql/new

-- Step 1: Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'mentor', 'employer', 'school_admin', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_path AS ENUM ('resume_upload', 'liveworks', 'civic_access');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create profiles table (NO trigger - app will handle this)
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

-- Step 3: Enable RLS but allow inserts
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create simple policies
CREATE POLICY "Enable read access for users" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Drop any existing trigger that might cause issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Done! The app will create profiles after signup.
