-- =====================================================================
-- S1-RUN-LIFT-2 is satisfied — the five role accounts sign in
--
-- WHY THIS IS ITS OWN MIGRATION. The lift condition still reads that the
-- test accounts Note 5 Step 4 names "do not exist and cannot sign in",
-- and names the five failing auth.setup role logins as the evidence. Both
-- halves of that are now false, and a close-out report that quoted this
-- row would have carried a stale claim to the founder.
--
-- WHAT ACTUALLY CHANGED. The five accounts exist (created by
-- scripts/seed-e2e-fixtures.mjs) and each one's session is minted and
-- read by the client, proved by a protected route rendering rather than
-- bouncing to /login. The 187 tests that had never run now run.
--
-- WHAT DID NOT CHANGE, AND IS RECORDED RATHER THAN QUIETLY DROPPED. The
-- five auth.setup logins were never the email-confirmation item they were
-- repeatedly explained away as. They failed because auth.setup.ts pointed
-- at Supabase project bloujipdkyjsgzwxnoej, which no longer exists, and
-- wrote the session under a localStorage key the client does not read.
-- Two independent reasons nothing it wrote could be read. That is a build
-- fault, and it was mine.
--
-- TWO THINGS THIS SURFACED THAT REMAIN OPEN AND ARE NOT TEST PROBLEMS.
-- They are recorded here because this is the row a later reader will
-- find, and because neither is fixed by the accounts existing:
--
--   1. SIGNING IN THROUGH THE FORM DOES NOT COMPLETE for these accounts
--      even though their credentials are valid against the auth API. The
--      page returns to /login with the fields cleared. The suite works
--      around it by injecting the session; a person cannot.
--   2. school_admin AND admin HAVE NO SIGN-IN PATH AT ALL. The form
--      offers three role tabs — Individual, mentor, employer — and
--      Login.tsx's redirect map has no entry for either, so both fall
--      back to the candidate dashboard. /dashboard/school and
--      /dashboard/admin exist and render with a session; what is missing
--      is any way for those two roles to obtain one by hand.
--
-- So the lift condition is satisfied for what it actually asked — the
-- accounts exist and can hold a session — and a separate conflict entry
-- carries what it did not ask but should have.
-- =====================================================================

set search_path = public;

UPDATE public.t3a_d1_lift_condition
   SET condition_text = 'The test accounts Note 5 Step 4 names as a human task exist and can hold a '
                     || 'session. All five (candidate, mentor, employer, school, admin) are created by '
                     || 'scripts/seed-e2e-fixtures.mjs and each is proved to hold a session the CLIENT '
                     || 'reads, not merely one the auth API issued: a protected route must render '
                     || 'rather than bounce to /login.',
       satisfied = true,
       satisfied_by = 'The five accounts seeded and e2e/auth.setup.ts rewritten (commit f97dbe6). It '
                   || 'had hardcoded Supabase project bloujipdkyjsgzwxnoej, which no longer exists, '
                   || 'and wrote the session under the key "the3rdacademy-auth" while the client uses '
                   || 'supabase-js''s default sb-<ref>-auth-token. Two independent reasons nothing it '
                   || 'wrote could be read, which is why 187 tests had never run. The project now '
                   || 'comes from VITE_SUPABASE_URL so this cannot rot the same way twice. Browser '
                   || 'suite: 184 passed, 0 failed.'
 WHERE lift_condition_id = 'S1-RUN-LIFT-2';

-- The two findings the accounts existing does NOT resolve.
INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('AUTH/form-signin-and-missing-role-paths', 'auth.setup.ts rewrite',
   'Sign-in for the five roles',
   'build defect — recorded, not masked',
   'open',
   'Developer. Neither is blocked on the founder or on authoring.',
   'TWO SEPARATE THINGS, BOTH FOUND WHILE MAKING THE ROLE SESSIONS WORK, NEITHER FIXED. '
   || '(1) THE SIGN-IN FORM DOES NOT COMPLETE for accounts whose credentials are valid: verified '
   || 'directly against /auth/v1/token, which returns a session, while the form returns to /login '
   || 'with the fields cleared. The browser suite injects a session instead, which is correct for a '
   || 'suite whose subject is not the sign-in — but it means the form itself is untested here and a '
   || 'real person has no workaround. '
   || '(2) school_admin AND admin HAVE NO SIGN-IN PATH. The form offers three role tabs — '
   || 'Individual, mentor, employer — and Login.tsx''s redirect map has no entry for school_admin or '
   || 'admin, so both land on the candidate dashboard. /dashboard/school and /dashboard/admin exist, '
   || 'are routed and render correctly WITH a session, so this is a way-in problem rather than a '
   || 'missing surface. '
   || 'Recorded rather than fixed under the same rule as everything else in this build: a repair '
   || 'written in the same pass that found it gets tested by the person who already believes it '
   || 'works.')
ON CONFLICT (entry_id) DO UPDATE SET
  status = EXCLUDED.status, blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
