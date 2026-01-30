-- =============================================
-- THE 3RD ACADEMY - DATABASE UPDATES
-- Run this SQL in your Supabase SQL Editor
-- =============================================

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
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Drop old Stripe field if exists (we're using manual payments now)
ALTER TABLE escrow_transactions
DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- =============================================
-- 2. SELF-ASSESSMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS candidate_self_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mentor_id, day_of_week, start_time)
);

-- Scheduled sessions
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES mentor_assignments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  session_type TEXT DEFAULT 'observation' CHECK (session_type IN ('observation', 'feedback', 'check_in', 'other')),
  notes TEXT,
  meeting_url TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT
);

-- Session reminders
CREATE TABLE IF NOT EXISTS session_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mentor_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));

-- Add action_type for quick actions
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS action_type TEXT;

-- =============================================
-- 6. TRAINING CONTENT TABLES (Video/Quiz)
-- =============================================

-- Training module content (videos, resources)
CREATE TABLE IF NOT EXISTS bridgefast_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES bridgefast_modules(id) ON DELETE CASCADE,
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
  module_id UUID NOT NULL REFERENCES bridgefast_modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB, -- Array of options for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS bridgefast_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES bridgefast_modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  max_score INTEGER,
  answers JSONB, -- { question_id: answer }
  passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1
);

-- Training certificates
CREATE TABLE IF NOT EXISTS training_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES bridgefast_modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_number TEXT UNIQUE NOT NULL,
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

-- Enable RLS on new tables
ALTER TABLE candidate_self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridgefast_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridgefast_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridgefast_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;

-- Self-assessments: candidates can manage their own
CREATE POLICY "Users can manage own self-assessments" ON candidate_self_assessments
FOR ALL USING (auth.uid() = candidate_id);

-- Conversations: participants only
CREATE POLICY "Users can view conversations they're in" ON conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Messages: participants only
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Mentor availability: mentors manage their own, candidates can view
CREATE POLICY "Mentors manage own availability" ON mentor_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM mentor_profiles
    WHERE id = mentor_availability.mentor_id
    AND profile_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view mentor availability" ON mentor_availability
FOR SELECT USING (is_active = TRUE);

-- Sessions: mentors and candidates can view their own
CREATE POLICY "Users can view own sessions" ON mentor_sessions
FOR SELECT USING (
  candidate_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM mentor_profiles
    WHERE id = mentor_sessions.mentor_id
    AND profile_id = auth.uid()
  )
);

-- Quiz attempts: users manage their own
CREATE POLICY "Users can manage own quiz attempts" ON bridgefast_quiz_attempts
FOR ALL USING (candidate_id = auth.uid());

-- Certificates: users can view their own
CREATE POLICY "Users can view own certificates" ON training_certificates
FOR SELECT USING (candidate_id = auth.uid());

-- Training content: everyone can view
CREATE POLICY "Anyone can view training content" ON bridgefast_content
FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can view quiz questions" ON bridgefast_quiz_questions
FOR SELECT USING (TRUE);

-- =============================================
-- 9. HELPER FUNCTIONS
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
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. INSERT SAMPLE QUIZ QUESTIONS
-- =============================================

-- You can run this after creating BridgeFast modules
-- This inserts sample questions for each behavioral dimension

-- Note: Replace module IDs with actual IDs from your bridgefast_modules table
-- Example: INSERT INTO bridgefast_quiz_questions (module_id, question, options, correct_answer, explanation)
-- VALUES ('your-module-id', 'Question text', '["Option A", "Option B", "Option C", "Option D"]', 'Option C', 'Explanation...');

-- =============================================
-- DONE!
-- =============================================

-- Summary of changes:
-- 1. Added manual payment fields to milestones and escrow
-- 2. Created self-assessments table
-- 3. Created messaging system tables (conversations, messages)
-- 4. Created mentor scheduling tables (availability, sessions)
-- 5. Enhanced notifications with priority
-- 6. Created training content and quiz tables
-- 7. Added PDF/QR fields to skill passports
-- 8. Set up RLS policies for security
-- 9. Created helper functions

COMMENT ON TABLE candidate_self_assessments IS 'Stores candidate behavioral self-assessments';
COMMENT ON TABLE conversations IS 'Stores conversation threads';
COMMENT ON TABLE messages IS 'Stores individual messages in conversations';
COMMENT ON TABLE mentor_availability IS 'Stores mentor weekly availability slots';
COMMENT ON TABLE mentor_sessions IS 'Stores scheduled mentor-candidate sessions';
COMMENT ON TABLE bridgefast_quiz_questions IS 'Stores quiz questions for BridgeFast modules';
COMMENT ON TABLE bridgefast_quiz_attempts IS 'Stores candidate quiz attempts and scores';
COMMENT ON TABLE training_certificates IS 'Stores issued training certificates';
