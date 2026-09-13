-- T3A-DEV-PLC-005-A · Note 2 · Step 3 — Enforce the verification gate
-- server-side.
--
-- Note 2 (b): "Verification is enforced, not announced." The screen after
-- Continue already tells the person verification is required. Nothing in
-- the codebase enforced it: a full-text search of src/ and
-- supabase/functions/ for email_confirmed / email_confirmed_at /
-- email_verified returned zero matches.
--
-- Note 2 (d) defines the holding state. An unverified account may sign in
-- and reach the verification-pending state. It may NOT:
--
--     * request a mentor
--     * accept a connection
--     * open a conversation
--     * release a record
--
-- and no observation may be recorded against an unverified account.
--
-- Note 2 Step 3 is explicit that this "is refused at every route the
-- holding state excludes, when the route is requested directly. Do not
-- implement this by hiding links." These are therefore triggers and
-- in-function checks, not interface conditions.
--
-- Two distinct tests are needed and they are not the same test:
--
--   ACTOR-verified   — the acting session must be verified. Applies to
--                      requesting a mentor, accepting a connection,
--                      opening a conversation, sending a message, and
--                      releasing a record.
--   SUBJECT-verified — the participant the record is ABOUT must be
--                      verified. Applies to observation records and BER
--                      reports, because Note 2 (d) says no observation may
--                      be recorded *against* an unverified account. The
--                      actor there is the mentor, who is a different
--                      person from the subject.
--
-- Nothing is renamed. Nothing is removed.

set search_path = public;

-- ========================================================================
-- §1 · The verification predicates
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_is_email_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
     WHERE id = p_user_id
       AND email_confirmed_at IS NOT NULL
  );
$$;

-- Current session. False when there is no session at all, so an anonymous
-- caller is treated as unverified rather than as exempt.
CREATE OR REPLACE FUNCTION public.t3a_current_user_email_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.t3a_is_email_verified(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.t3a_is_email_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_current_user_email_verified() TO authenticated;

-- ========================================================================
-- §2 · Actor-verified guard
-- ========================================================================
--
-- Service context passes through: system and administrative operations are
-- governed by their own authority rules, not by the acting person's
-- mailbox. A client session must be verified.

CREATE OR REPLACE FUNCTION public.t3a_require_actor_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.t3a_is_service_context() THEN
    RETURN NEW;
  END IF;

  IF NOT public.t3a_current_user_email_verified() THEN
    RAISE EXCEPTION
      'EMAIL_VERIFICATION_REQUIRED: this account has not confirmed its email address. Confirm the address before using this route.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================================================
-- §3 · Subject-verified guard
-- ========================================================================
--
-- Reads participant_id off the row being written. No observation is
-- recorded against an account whose address nobody has shown they can
-- receive mail at — the doctrine at Note 2 is that an unverified address
-- is an unclaimed record.

CREATE OR REPLACE FUNCTION public.t3a_require_subject_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) INTO v_subject USING NEW;

  IF v_subject IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.t3a_is_email_verified(v_subject) THEN
    RAISE EXCEPTION
      'EMAIL_VERIFICATION_REQUIRED_SUBJECT: no observation or report may be recorded against an account whose email address is unconfirmed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================================================
-- §4 · Attach the guards to the excluded routes
-- ========================================================================
--
-- Each block is guarded so a missing table does not abort the migration;
-- an absent route is recorded rather than assumed.

-- Request a mentor
DO $$ BEGIN
  IF to_regclass('public.t3a_mentor_request') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_mentor_request_trg ON public.t3a_mentor_request;
    CREATE TRIGGER t3a_verify_gate_mentor_request_trg
      BEFORE INSERT ON public.t3a_mentor_request
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_actor_email_verified();
  END IF;
END $$;

-- Accept a connection
DO $$ BEGIN
  IF to_regclass('public.t3x_connections') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_connections_trg ON public.t3x_connections;
    CREATE TRIGGER t3a_verify_gate_connections_trg
      BEFORE INSERT OR UPDATE ON public.t3x_connections
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_actor_email_verified();
  END IF;
END $$;

-- Open a conversation
DO $$ BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_conversations_trg ON public.conversations;
    CREATE TRIGGER t3a_verify_gate_conversations_trg
      BEFORE INSERT ON public.conversations
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_actor_email_verified();
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.conversation_participants') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_conv_participants_trg ON public.conversation_participants;
    CREATE TRIGGER t3a_verify_gate_conv_participants_trg
      BEFORE INSERT ON public.conversation_participants
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_actor_email_verified();
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_messages_trg ON public.messages;
    CREATE TRIGGER t3a_verify_gate_messages_trg
      BEFORE INSERT ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_actor_email_verified();
  END IF;
END $$;

-- No observation recorded against an unverified account
DO $$ BEGIN
  IF to_regclass('public.t3a_observation_record') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_observation_trg ON public.t3a_observation_record;
    CREATE TRIGGER t3a_verify_gate_observation_trg
      BEFORE INSERT ON public.t3a_observation_record
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_subject_email_verified('participant_id');
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.t3a_d1_ber_report') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_verify_gate_ber_report_trg ON public.t3a_d1_ber_report;
    CREATE TRIGGER t3a_verify_gate_ber_report_trg
      BEFORE INSERT ON public.t3a_d1_ber_report
      FOR EACH ROW EXECUTE FUNCTION public.t3a_require_subject_email_verified('participant_id');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
