-- =====================================================================
-- Two faults found by running the rebuilt database, not by reading it
--
-- 1. 86 of 188 tables had no privileges for `authenticated` at all, so
--    reading them returned 42501 regardless of RLS.
--
--    Cause: 20260810190240 grants in a loop over `pg_tables` — every
--    table that existed AT THAT MOMENT. Every table created by a later
--    migration (all of spec-002 from 20260811 onward, and the whole
--    t3a_d1_* namespace) was never granted by any migration. In the
--    original database those tables were covered by Supabase's default
--    privileges on the public schema, which is why nobody noticed.
--
--    Rebuilding the database dropped and recreated the public schema,
--    and default privileges belong to the schema. They went with it.
--    A migration set that silently depends on a platform default is a
--    migration set that cannot rebuild its own database, so the grants
--    are stated here rather than assumed.
--
--    The 86 ungranted tables and the 79 tables the migrations do grant
--    are disjoint sets — checked, not assumed — and all 11 tables
--    carrying a deliberate REVOKE are in the granted 79. So restoring
--    the 86 cannot re-open anything that was deliberately closed.
--
-- 2. conversation_participants had a SELECT policy that queried
--    conversation_participants, which is infinite recursion (42P17).
--    Messaging returned 500 for every participant lookup.
--
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Default privileges, so a future table does not repeat this
-- ---------------------------------------------------------------------

-- These are what the platform sets up on a new project and what the
-- rebuild destroyed. Stated here so the next table created by a
-- migration is reachable without anybody remembering to grant it.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. The tables that lost their privileges
-- ---------------------------------------------------------------------

-- Granted to `authenticated` and `service_role`, not to `anon`.
--
-- The platform default would also have granted anon. That is not
-- reproduced: every explicit GRANT across these migrations names
-- `authenticated`, 20260811083459 revokes function execute from anon
-- outright, and this platform serves nothing to a signed-out caller. If
-- some public surface turns out to need anon, it fails visibly and is
-- granted deliberately — which is the better direction to be wrong in.
--
-- RLS is the thing that decides which ROWS a caller sees. A grant only
-- decides whether the table answers at all, and a table that answers
-- "permission denied" to its own application is not a control, it is an
-- outage.
DO $grants$
DECLARE
  t record;
  n int := 0;
BEGIN
  FOR t IN
    SELECT c.oid, c.relname
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT has_table_privilege('authenticated', c.oid, 'SELECT')
      -- Never grant into a table whose rows nothing is filtering.
      AND c.relrowsecurity
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'restored privileges on % tables', n;
END
$grants$;

-- t3a_action_sequence_rule is the one table the loop above skips: it
-- carries no RLS, because 20260902000000 created it as reference data a
-- trigger reads and never enabled any. Under the platform default it was
-- readable by every signed-in account with nothing filtering it.
--
-- Rather than reproduce that, it gets the filter it never had. The rows
-- are stage codes and authority ordering — not sensitive, but "no RLS
-- and granted to everyone" is not a state to restore on purpose.
ALTER TABLE public.t3a_action_sequence_rule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_action_sequence_rule_read" ON public.t3a_action_sequence_rule;
CREATE POLICY "t3a_action_sequence_rule_read"
  ON public.t3a_action_sequence_rule FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.t3a_action_sequence_rule TO authenticated;
GRANT ALL ON public.t3a_action_sequence_rule TO service_role;

-- ---------------------------------------------------------------------
-- 3. The recursion
-- ---------------------------------------------------------------------

-- 20260130_platform_updates_fixed.sql §"Conversation participants":
--
--   CREATE POLICY "Users can view conversation participants"
--   ON conversation_participants FOR SELECT USING (
--     EXISTS (SELECT 1 FROM conversation_participants cp WHERE ...))
--
-- Reading the table requires reading the table. PostgreSQL detects it and
-- raises 42P17, so every participant lookup returned 500.
--
-- The intent is right and is kept: you may see the participants of a
-- conversation you are in. It just cannot be expressed by a policy that
-- reads its own table. A SECURITY DEFINER function does the lookup with
-- policies not applied to it, which terminates.
CREATE OR REPLACE FUNCTION public.t3a_is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
  );
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_is_conversation_participant(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- conversation_participants_read was FOR SELECT USING (true), from the
-- 20260810190240 loop. Dropping only the recursive policy would have
-- left messaging working and every account able to read who is in
-- conversation with whom — the recursion was, accidentally, the only
-- thing making that query fail. Both go, and one correct policy
-- replaces them.
DROP POLICY IF EXISTS "conversation_participants_read" ON public.conversation_participants;

CREATE POLICY "conversation_participants_read"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.t3a_is_conversation_participant(conversation_id)
    OR public.is_admin()
  );

-- The INSERT policy 20260813150000 installed carries the same
-- self-reference. It did not recurse the same way, because its subquery
-- is checked against the SELECT policy rather than itself, but it is now
-- reading through the policy above on every insert. Pointed at the same
-- function so the two agree by construction.
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
CREATE POLICY "Users can join conversations"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    -- Seeding yourself into a conversation is always allowed.
    user_id = auth.uid()
    -- Adding a counterparty requires already being in it.
    OR public.t3a_is_conversation_participant(conversation_id)
  );

NOTIFY pgrst, 'reload schema';
