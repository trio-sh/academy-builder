-- =============================================
-- THE 3RD ACADEMY - DATABASE UPDATES (FIXED)
-- Run this SQL in your Supabase SQL Editor
-- This version creates missing tables first
-- =============================================

-- =============================================
-- 0. CREATE MISSING BASE TABLES FIRST
-- =============================================

-- Create liveworks_milestones if it doesn't exist
CREATE TABLE IF NOT EXISTS liveworks_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'revision_requested')),
  due_date TIMESTAMPTZ,
  payment_amount DECIMAL(10, 2),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  escrow_status TEXT CHECK (escrow_status IN ('pending', 'funded', 'released', 'refunded', 'disputed')),
  escrow_funded_at TIMESTAMPTZ,
  escrow_released_at TIMESTAMPTZ
);

-- Create escrow_transactions if it doesn't exist
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID NOT NULL,
  milestone_id UUID,
  employer_id UUID NOT NULL,
  candidate_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'released', 'refunded', 'disputed')),
  funded_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  notes TEXT
);

-- Create notifications if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB
);

-- Create skill_passports if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verification_code TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  readiness_tier TEXT DEFAULT 'tier_1',
  behavioral_scores JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create bridgefast_modules if it doesn't exist
CREATE TABLE IF NOT EXISTS bridgefast_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  behavioral_dimension TEXT NOT NULL,
  duration_hours INTEGER DEFAULT 1,
  content_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0
);

-- Create mentor_profiles if it doesn't exist
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  industry TEXT,
  specializations TEXT[] DEFAULT '{}',
  years_experience INTEGER DEFAULT 0,
  company TEXT,
  job_title TEXT,
  max_mentees INTEGER DEFAULT 5,
  current_mentees INTEGER DEFAULT 0,
  is_accepting BOOLEAN DEFAULT TRUE,
  total_observations INTEGER DEFAULT 0,
  total_endorsements INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2)
);

-- Create mentor_assignments if it doesn't exist
CREATE TABLE IF NOT EXISTS mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
  loop_number INTEGER DEFAULT 1,
  assigned_by UUID
);

-- =============================================
-- 1. PAYMENT FIELDS FOR LIVEWORKS MILESTONES
-- =============================================

-- Add manual payment fields to liveworks_milestones
ALTER TABLE liveworks_milestones
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_credentials TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add manual payment fields to escrow_transactions
ALTER TABLE escrow_transactions
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_credentials TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- =============================================
-- 2. SELF-ASSESSMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS candidate_self_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  behavioral_scores JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  goals TEXT,
  strengths TEXT[] DEFAULT '{}',
  areas_for_improvement TEXT[] DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_self_assessments_candidate
ON candidate_self_assessments(candidate_id);

-- =============================================
-- 3. MESSAGING SYSTEM TABLES
-- =============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  file_url TEXT,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES messages(id),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for messaging
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
ON conversation_participants(user_id);

-- =============================================
-- 4. MENTOR SCHEDULING/CALENDAR TABLES
-- =============================================

-- Mentor availability slots
CREATE TABLE IF NOT EXISTS mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mentor_id, day_of_week, start_time)
);

-- Scheduled sessions
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  assignment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  session_type TEXT DEFAULT 'observation' CHECK (session_type IN ('observation', 'feedback', 'check_in', 'other')),
  notes TEXT,
  meeting_url TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT
);

-- Session reminders
CREATE TABLE IF NOT EXISTS session_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mentor_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT DEFAULT 'email' CHECK (reminder_type IN ('email', 'in_app', 'both')),
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ
);

-- Indexes for scheduling
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor
ON mentor_sessions(mentor_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_mentor_sessions_candidate
ON mentor_sessions(candidate_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_session_reminders_pending
ON session_reminders(remind_at) WHERE sent = FALSE;

-- =============================================
-- 5. NOTIFICATION ENHANCEMENTS
-- =============================================

-- Add priority to notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Add action_type for quick actions
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS action_type TEXT;

-- =============================================
-- 6. TRAINING CONTENT TABLES (Video/Quiz)
-- =============================================

-- Training module content (videos, resources)
CREATE TABLE IF NOT EXISTS bridgefast_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'document', 'link', 'quiz')),
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE
);

-- Quiz questions table
CREATE TABLE IF NOT EXISTS bridgefast_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS bridgefast_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  module_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  max_score INTEGER,
  answers JSONB,
  passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1
);

-- Training certificates
CREATE TABLE IF NOT EXISTS training_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  module_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_number TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  score INTEGER,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  pdf_url TEXT
);

-- Indexes for training
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_candidate
ON bridgefast_quiz_attempts(candidate_id, module_id);

CREATE INDEX IF NOT EXISTS idx_certificates_candidate
ON training_certificates(candidate_id);

-- =============================================
-- 7. SKILL PASSPORT ENHANCEMENTS
-- =============================================

-- Add PDF URL to skill passports
ALTER TABLE skill_passports
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- =============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables (safe - will not error if already enabled)
DO $$
BEGIN
  ALTER TABLE candidate_self_assessments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE session_reminders ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bridgefast_content ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bridgefast_quiz_questions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bridgefast_quiz_attempts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================
-- 9. RLS POLICIES (Drop if exists, then create)
-- =============================================

-- Self-assessments: candidates can manage their own
DROP POLICY IF EXISTS "Users can manage own self-assessments" ON candidate_self_assessments;
CREATE POLICY "Users can manage own self-assessments" ON candidate_self_assessments
FOR ALL USING (auth.uid() = candidate_id);

-- Conversations: participants only
DROP POLICY IF EXISTS "Users can view conversations they're in" ON conversations;
CREATE POLICY "Users can view conversations they're in" ON conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
FOR INSERT WITH CHECK (TRUE);

-- Conversation participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
CREATE POLICY "Users can view conversation participants" ON conversation_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
CREATE POLICY "Users can join conversations" ON conversation_participants
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own participation" ON conversation_participants;
CREATE POLICY "Users can update own participation" ON conversation_participants
FOR UPDATE USING (user_id = auth.uid());

-- Messages: participants only
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Mentor availability
DROP POLICY IF EXISTS "Anyone can view active mentor availability" ON mentor_availability;
CREATE POLICY "Anyone can view active mentor availability" ON mentor_availability
FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Mentors can manage own availability" ON mentor_availability;
CREATE POLICY "Mentors can manage own availability" ON mentor_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM mentor_profiles
    WHERE id = mentor_availability.mentor_id
    AND profile_id = auth.uid()
  )
);

-- Sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON mentor_sessions;
CREATE POLICY "Users can view own sessions" ON mentor_sessions
FOR SELECT USING (
  candidate_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM mentor_profiles
    WHERE id = mentor_sessions.mentor_id
    AND profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Candidates can create sessions" ON mentor_sessions;
CREATE POLICY "Candidates can create sessions" ON mentor_sessions
FOR INSERT WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sessions" ON mentor_sessions;
CREATE POLICY "Users can update own sessions" ON mentor_sessions
FOR UPDATE USING (
  candidate_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM mentor_profiles
    WHERE id = mentor_sessions.mentor_id
    AND profile_id = auth.uid()
  )
);

-- Quiz attempts
DROP POLICY IF EXISTS "Users can manage own quiz attempts" ON bridgefast_quiz_attempts;
CREATE POLICY "Users can manage own quiz attempts" ON bridgefast_quiz_attempts
FOR ALL USING (candidate_id = auth.uid());

-- Certificates
DROP POLICY IF EXISTS "Users can view own certificates" ON training_certificates;
CREATE POLICY "Users can view own certificates" ON training_certificates
FOR SELECT USING (candidate_id = auth.uid());

-- Training content: public read
DROP POLICY IF EXISTS "Anyone can view training content" ON bridgefast_content;
CREATE POLICY "Anyone can view training content" ON bridgefast_content
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can view quiz questions" ON bridgefast_quiz_questions;
CREATE POLICY "Anyone can view quiz questions" ON bridgefast_quiz_questions
FOR SELECT USING (TRUE);

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
$$ LANGUAGE SQL STABLE;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at);
$$ LANGUAGE SQL STABLE;

-- Function to create a direct conversation between two users
CREATE OR REPLACE FUNCTION create_direct_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
  WHERE c.type = 'direct'
  LIMIT 1;

  -- If exists, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO v_conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, p_user1_id), (v_conversation_id, p_user2_id);

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 11. INSERT SAMPLE BRIDGEFAST MODULES
-- =============================================

-- Insert sample modules if none exist
INSERT INTO bridgefast_modules (title, description, behavioral_dimension, duration_hours, order_index)
SELECT * FROM (VALUES
  ('Effective Communication', 'Learn to communicate clearly and professionally in the workplace', 'Communication', 2, 1),
  ('Problem Solving Skills', 'Develop analytical thinking and creative problem-solving abilities', 'Problem Solving', 2, 2),
  ('Workplace Adaptability', 'Build resilience and flexibility to handle change', 'Adaptability', 2, 3),
  ('Team Collaboration', 'Master the art of working effectively with others', 'Collaboration', 2, 4),
  ('Taking Initiative', 'Learn to be proactive and self-directed in your work', 'Initiative', 2, 5),
  ('Time Management', 'Develop skills to prioritize and manage your time effectively', 'Time Management', 2, 6),
  ('Workplace Professionalism', 'Understand workplace conduct and professional behavior', 'Professionalism', 2, 7),
  ('Learning Agility', 'Enhance your ability to learn and apply new concepts quickly', 'Learning Agility', 2, 8)
) AS v(title, description, behavioral_dimension, duration_hours, order_index)
WHERE NOT EXISTS (SELECT 1 FROM bridgefast_modules LIMIT 1);

-- =============================================
-- DONE!
-- =============================================

SELECT 'Migration completed successfully!' as status;
