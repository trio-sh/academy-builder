-- Fix: message send fails with
--   "Could not find a relationship between 'messages' and 'profiles'
--    in the schema cache"
--
-- Cause: public.messages was created without any foreign keys (only
-- its PK). The client sends messages with
--   .insert({...}).select("*, sender:profiles!messages_sender_id_fkey(...)")
-- which asks PostgREST to embed the sender profile through the named FK
-- `messages_sender_id_fkey`. That FK does not exist, PostgREST refuses
-- the embed, and the insert-with-select fails as one operation. Same
-- pattern is used on every dashboard's message thread view, so this
-- also blocks fetching the current thread.
--
-- Fix: add the three FKs the messaging code assumes, under the exact
-- names PostgREST looks up.
--
-- Live pre-check confirmed zero orphans on sender_id, conversation_id
-- and reply_to_id before adding NOT VALID would even be needed — the
-- constraints validate cleanly.

set search_path = public;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_reply_to_id_fkey
  FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;

-- Nudge PostgREST to reload the schema cache so the new relationships
-- become embeddable immediately, without waiting for the periodic reload.
NOTIFY pgrst, 'reload schema';
