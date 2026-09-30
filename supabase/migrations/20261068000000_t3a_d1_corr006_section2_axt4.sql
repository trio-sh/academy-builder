-- =====================================================================
-- CORR-006 Section 2 — AX-T4 on synthetic data, the half that cannot run
-- here, and a latent defect the attempt uncovered
--
-- WHAT THE FOUNDER CORRECTED. CL-35 asked for "two concurrent sessions
-- attempting to approve the same withdrawn version". On live data the
-- winning session writes a REC-07 approval and a build may never record
-- one. He records the fault as his instruction's. CX-03 moves the test to
-- synthetic data, in a design-only or synthetic-test environment or
-- inside a transaction that is rolled back.
--
-- The test itself is scripts/proofs/axt4-lock-proof.sql, which aborts.
-- This file records the structural assertion, the definitions and the
-- outcomes, because an aborted transaction cannot write its own result.
--
-- ---------------------------------------------------------------------
-- THE TWO-SESSION HALF IS NOT RUN, AND HERE IS EXACTLY WHY.
--
-- Concurrency needs two database sessions. Three routes exist from this
-- container and all three are closed:
--
--   1. db.<ref>.supabase.co resolves IPv6-ONLY (2600:1f18:...) and this
--      container has no IPv6 — "Address family not supported by
--      protocol". The same EAFNOSUPPORT that playwright.config.ts
--      already documents for the dev server.
--   2. The IPv4 pooler aws-0-us-east-1.pooler.supabase.com resolves, and
--      outbound TCP on 5432 is blocked by the environment's network
--      policy: the connection times out. Only HTTPS through the agent
--      proxy is permitted, and the Management API runs one statement per
--      request with no session to hold open.
--   3. dblink runs server-side, so no network is involved. It installed,
--      and then refused: "password or GSSAPI delegated credentials
--      required". A non-superuser's dblink connection must authenticate
--      with a password actually used, which the loopback configuration
--      does not do. The extension was DROPPED again rather than left
--      installed for an approach that does not work.
--
-- This is the concrete reason behind the earlier report that AX-T4 was
-- "partly proved". That report named the gap without naming why, which
-- made it look like a choice.
--
-- AND THE PART WORTH MORE THAN THE GAP: A SEQUENTIAL AX-T4 IS NOT A TEST
-- OF THE LOCK, AND THAT IS NOW DEMONSTRATED RATHER THAN ASSERTED. The
-- proof runs the same sequential test twice, the second time with the
-- per-version advisory lock genuinely removed from the guard:
--
--   with the lock     first=SUCCEEDED  second=REFUSED
--   without the lock  first=SUCCEEDED  second=REFUSED
--
-- Identical. So reporting AX-T4 as passed on a sequential run would be
-- false, and CX-05's "prove the test can fail" is exactly the right
-- instruction: it cannot be satisfied sequentially. SOP-002 Appendix 6
-- question 1 asks what would make a test fail; here the answer is
-- nothing, so the sequential form is not that test.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The structural property serialization rests on, asserted not read
-- ---------------------------------------------------------------------

DO $struct$
DECLARE
  r record;
  v_checked int := 0;
BEGIN
  FOR r IN
    SELECT p.proname,
           position('pg_advisory_xact_lock' in p.prosrc)          AS lock_pos,
           position('t3a_d1_version_standing_status' in p.prosrc) AS read_pos
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind = 'f'
       AND p.prosrc LIKE '%pg_advisory_xact_lock%'
  LOOP
    IF r.read_pos = 0 THEN CONTINUE; END IF;
    IF r.lock_pos = 0 OR r.lock_pos > r.read_pos THEN
      RAISE EXCEPTION 'AXT4_LOCK_ORDER_FAILED: % takes the per-version lock at character % and reads standing at character %. The lock must come BEFORE the read, or two sessions both read "not approved" and both succeed.',
        r.proname, r.lock_pos, r.read_pos;
    END IF;
    v_checked := v_checked + 1;
  END LOOP;

  IF v_checked < 2 THEN
    RAISE EXCEPTION 'AXT4_LOCK_ORDER_FAILED: expected lock-before-read in both the approval route and the table guard; checked only %.', v_checked;
  END IF;

  RAISE NOTICE 'AX-T4 structural: % functions take the per-version lock before reading standing.', v_checked;
END;
$struct$;

-- ---------------------------------------------------------------------
-- 2. A latent defect the attempt uncovered: standing breaks ties on a
--    random uuid
--
-- t3a_d1_source_approval_standing is
--   DISTINCT ON (source_version_id) ... ORDER BY approved_at DESC,
--                                            source_approval_id DESC
--
-- Inside a single transaction now() is CONSTANT. So a transaction writing
-- a withdrawal and a re-approval for the same version gives both rows the
-- same approved_at, and "latest" is then decided by which gen_random_uuid
-- sorts higher. Standing becomes arbitrary — and standing is what every
-- reader in the schema was consolidated onto under Section 4A.
--
-- This is how the first draft of the proof failed: all three rows shared
-- a timestamp, standing resolved to the withdrawal, and a second approval
-- was allowed. I read that as a defect in the guard before finding it was
-- my fixture plus this ordering.
--
-- MEASURED: zero version currently holds two approval rows at the same
-- instant, so nothing is wrong today and no existing standing value is
-- ambiguous. The defect is latent.
--
-- WHAT IS DONE ABOUT IT, AND WHAT IS NOT. Redefining standing would
-- change what an approval means, which is not the build's to settle, so
-- the view is untouched. Instead the collision is made impossible to
-- create: a guard refuses a second approval row for the same version at
-- the same instant, and names the remedy. That is the most restrictive
-- behavior available, which is what the DEVELOPER JUDGMENT BOUNDARY
-- directs, and the open question goes to the founder.
-- ---------------------------------------------------------------------

DO $measure$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM (
    SELECT source_version_id, approved_at FROM public.t3a_d1_source_approval
     GROUP BY source_version_id, approved_at HAVING count(*) > 1) t;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'STANDING_TIE_ALREADY_PRESENT: % version/instant groups already hold more than one approval row, so standing is already decided by uuid order for them. This must be reported to the founder before any guard is added, because adding one does not resolve the rows that already exist.', v_n;
  END IF;
  RAISE NOTICE 'standing tie-break: zero existing collisions, so the guard below creates no conflict with stored rows.';
END;
$measure$;

CREATE OR REPLACE FUNCTION public.t3a_d1_source_approval_instant_unique()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.t3a_d1_source_approval a
     WHERE a.source_version_id = NEW.source_version_id
       AND a.approved_at = NEW.approved_at)
  THEN
    RAISE EXCEPTION 'APPROVAL_INSTANT_NOT_UNIQUE: version % already holds an approval row at %. Standing is the LATEST row, and the standing view breaks a tie on source_approval_id — a random uuid — so two rows at one instant would make standing arbitrary. Give the rows distinct approved_at values; inside one transaction now() is constant, so state the times explicitly.',
      NEW.source_version_id, NEW.approved_at
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_source_approval_instant_unique() IS
  'Refuses two approval rows for one version at the same instant, because t3a_d1_source_approval_standing resolves a tie on source_approval_id — a random uuid — and standing would be arbitrary. It refuses the ambiguity rather than resolving it: redefining standing would change what an approval means and is not the build''s to settle. Found while writing the AX-T4 proof, whose first draft used now() for every row inside one transaction, where now() is constant.';

DROP TRIGGER IF EXISTS t3a_d1_source_approval_instant_unique_trg ON public.t3a_d1_source_approval;
CREATE TRIGGER t3a_d1_source_approval_instant_unique_trg
  BEFORE INSERT ON public.t3a_d1_source_approval
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_source_approval_instant_unique();

-- ---------------------------------------------------------------------
-- 3. The definitions
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('AX-T4-SEQ', 'T3A-D1-EXEC-CORR-006 CX-03 and CX-04',
   'One standing approval per version — the refusal logic, sequentially',
   'A synthetic content object outside family=''source'', its version, and a withdrawn approval, '
   || 'created and destroyed inside one aborted transaction, with DISTINCT explicit approved_at values.',
   'The first approval on the withdrawn synthetic version SUCCEEDS; a second is REFUSED with '
   || 'SOURCE_VERSION_ALREADY_APPROVED. Nothing persists.',
   'CX-03', 'CL-35 as issued, which required live data and would have made the build record a REC-07 approval.',
   'A build may never record a REC-07 approval, so the test moves to synthetic data inside a '
   || 'transaction that is rolled back.'),

  ('AX-T4-CONC', 'T3A-D1-EXEC-CORR-006 CX-04 and CX-05',
   'Two concurrent sessions approving the same withdrawn version — exactly one succeeds',
   'Two genuinely concurrent database sessions against a synthetic withdrawn version.',
   'Exactly one session succeeds; the other is refused by the per-version lock or with '
   || 'SOURCE_VERSION_ALREADY_APPROVED. With the lock disabled, BOTH succeed.',
   'CX-04', NULL,
   'Recorded as a test DISTINCT from AX-T4-SEQ because the sequential form cannot stand in for it: '
   || 'the proof shows the sequential test passes identically with the lock removed, so it does not '
   || 'test serialization at all.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, why_restated = EXCLUDED.why_restated;

-- ---------------------------------------------------------------------
-- 4. The outcomes, from the run rather than from the forecast
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('AX-T4-SEQ', 'pass',
   'scripts/proofs/axt4-lock-proof.sql, one aborted transaction. With the lock in force: '
   || 'locked/first=SUCCEEDED, locked/second=REFUSED. With the per-version advisory lock genuinely '
   || 'removed from the guard (PERFORM pg_advisory_xact_lock( replaced by PERFORM (, which is valid '
   || 'PL/pgSQL and lock-free): unlocked/afterWithdraw=SUCCEEDED, unlocked/second=REFUSED. The '
   || 'refusal logic is proved. Nothing persisted: the fixture and the swapped function were undone '
   || 'by the abort rather than by cleanup code.',
   '20261068000000', 'Claude Code, automated, non-production environment',
   'The identical result with and without the lock is the point, not a nuisance: it establishes that '
   || 'this sequential test does not test serialization. See AX-T4-CONC.'),

  ('AX-T4-CONC', 'not_run',
   'NOT RUN. Two genuinely concurrent database sessions are not reachable from this container, and '
   || 'all three routes were tried rather than assumed. (1) db.<ref>.supabase.co resolves IPv6-only '
   || 'and the container has no IPv6 — Address family not supported by protocol. (2) The IPv4 pooler '
   || 'aws-0-us-east-1.pooler.supabase.com resolves but outbound TCP 5432 is blocked by the network '
   || 'policy; the connection times out. Only HTTPS through the agent proxy is permitted and the '
   || 'Management API holds no session open. (3) dblink installed and then refused with "password or '
   || 'GSSAPI delegated credentials required", because a non-superuser''s dblink connection must '
   || 'authenticate with a password actually used; the extension was dropped again. '
   || 'What IS established: both the approval route and the table guard take the per-version advisory '
   || 'lock BEFORE reading standing, asserted structurally in this migration rather than read. That '
   || 'is the property serialization depends on, and it is not the same as observing serialization.',
   '20261068000000', 'Claude Code, automated, non-production environment',
   'Needs an environment with two concurrent sessions: a local Postgres in CI, or a connection that '
   || 'can hold a transaction open. Reporting this as passed on the sequential run would be false.');

-- ---------------------------------------------------------------------
-- 5. The two findings for the founder
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-04/no-concurrent-sessions', 'CORR-006 Section 2',
   'The two-session half of AX-T4',
   'not executable in this environment — recorded, not worked around',
   'open',
   'An environment with two concurrent database sessions: a local Postgres in CI, or a connection '
   || 'that can hold a transaction open across statements.',
   'CX-04 asks for two genuinely concurrent sessions. THREE ROUTES WERE TRIED AND ALL THREE ARE '
   || 'CLOSED. (1) The direct host resolves IPv6-only and this container has no IPv6. (2) The IPv4 '
   || 'pooler resolves but outbound TCP 5432 is blocked; only HTTPS through the agent proxy is '
   || 'allowed, and the Management API runs one statement per request with no session to hold open. '
   || '(3) dblink runs server-side and so avoids the network entirely, but a non-superuser''s dblink '
   || 'connection must authenticate with a password actually used, which the loopback configuration '
   || 'does not do; it refused, and the extension was dropped rather than left installed. '
   || 'THE SEQUENTIAL FORM IS NOT A SUBSTITUTE, AND THAT IS DEMONSTRATED: the proof runs the same '
   || 'sequential test with the per-version lock genuinely removed and gets an IDENTICAL result. So '
   || 'CX-05''s "prove the test can fail" is the right instruction and the honest answer is that it '
   || 'cannot be satisfied sequentially. What is established instead is structural: both the approval '
   || 'route and the table guard take the lock before reading standing, asserted in SQL rather than '
   || 'read off the source. That is the property serialization rests on; it is not serialization '
   || 'observed.'),

  ('CORR-006/standing-tie-break-is-a-random-uuid', 'CORR-006 Section 2, found while writing the proof',
   'How t3a_d1_source_approval_standing resolves two rows at the same instant',
   'latent defect — ambiguity now refused rather than resolved; the view is the founder''s question',
   'open',
   'Founder: whether the standing view should carry a deterministic tiebreaker, which would change '
   || 'how standing is computed and therefore what an approval means.',
   'The standing view is DISTINCT ON (source_version_id) ORDER BY approved_at DESC, '
   || 'source_approval_id DESC. INSIDE ONE TRANSACTION now() IS CONSTANT, so a transaction writing a '
   || 'withdrawal and a re-approval for the same version gives both rows the same approved_at, and '
   || '"latest" is then decided by which gen_random_uuid sorts higher. Standing becomes arbitrary — '
   || 'and Section 4A consolidated every reader in the schema onto standing. '
   || 'MEASURED: zero versions currently hold two approval rows at the same instant, so no stored '
   || 'standing value is ambiguous and nothing is wrong today. The defect is latent. '
   || 'THIS IS HOW IT WAS FOUND: the first draft of the AX-T4 proof used now() for every row, all '
   || 'three shared a timestamp, standing resolved to the withdrawal, and a second approval was '
   || 'allowed. I read that as a defect in the guard before finding it was my fixture plus this '
   || 'ordering. A test that fails for the wrong reason is still worth reading carefully. '
   || 'WHAT WAS DONE: the collision is made impossible to create — '
   || 't3a_d1_source_approval_instant_unique refuses a second approval row for one version at the '
   || 'same instant and names the remedy. The VIEW IS UNTOUCHED, because giving standing a new '
   || 'tiebreaker changes how an approval is counted and that is not the build''s to settle.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;
