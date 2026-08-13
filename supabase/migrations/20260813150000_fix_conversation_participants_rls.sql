-- Fix: conversation_participants INSERT policy blocked adding a counterparty
-- when starting a new conversation.
--
-- Symptom (from production console 2026-08-13):
--   Error adding conversation participants — code 42501:
--   new row violates row-level security policy for table "conversation_participants"
--
-- Root cause: the old policy was WITH CHECK (user_id = auth.uid()), meaning
-- a caller could only ever insert their OWN participant row. The messaging
-- flow inserts two rows in a single batch (self + target), so the target
-- row failed the check.
--
-- Fix: allow inserting a row for another user only if the caller is
-- already a participant of the same conversation. Combined with the
-- client-side change to sequential inserts (self first, then target),
-- this makes the flow work end-to-end while keeping unrelated users
-- from being added by third parties.

BEGIN;

DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

CREATE POLICY "Users can join conversations" ON conversation_participants
FOR INSERT
WITH CHECK (
  -- Case 1: inserting yourself — always allowed (initial seed).
  user_id = auth.uid()
  OR
  -- Case 2: inserting someone else — allowed only if the caller is
  -- already a participant of the same conversation. This means the
  -- initiator seeds themselves first, then can add the counterparty.
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
