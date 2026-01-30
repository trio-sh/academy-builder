-- Migration to add entry_path column to candidate_profiles
-- Run this in your Supabase SQL Editor

-- ===================================================
-- ADD ENTRY_PATH COLUMN
-- ===================================================

-- Create the entry_path enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_path_type') THEN
    CREATE TYPE entry_path_type AS ENUM ('resume_upload', 'liveworks', 'civic_access');
  END IF;
END $$;

-- Add entry_path column to candidate_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'candidate_profiles'
    AND column_name = 'entry_path'
  ) THEN
    -- Add column with default value
    ALTER TABLE public.candidate_profiles
    ADD COLUMN entry_path TEXT NOT NULL DEFAULT 'resume_upload';

    -- Add check constraint for valid values
    ALTER TABLE public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_entry_path_check
    CHECK (entry_path IN ('resume_upload', 'liveworks', 'civic_access'));
  END IF;
END $$;

-- Update any existing rows that might have NULL entry_path
UPDATE public.candidate_profiles
SET entry_path = 'resume_upload'
WHERE entry_path IS NULL;

-- ===================================================
-- VERIFY
-- ===================================================

-- Check column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'candidate_profiles'
AND column_name = 'entry_path';
