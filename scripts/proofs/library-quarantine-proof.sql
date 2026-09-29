-- CORR-006 CX-20 / CX-21. SELF-ABORTING: read the result from the error
-- message.
--
-- The write refusal is REQUESTED, not inferred from a screen. It is requested
-- twice: once as an authenticated caller, where the policy would stop it, and
-- once as postgres, where only the trigger can — because CX-20 says
-- server-side, and a policy alone would leave any definer route written later
-- free to write.
set search_path = public;

DO $p$
DECLARE
  v_out text := ''; v_r text; v_n int; v_holder uuid;
BEGIN
  -- (1) The rows are still there and still readable. CX-21 deletes nothing.
  SELECT count(*) INTO v_n FROM public.candidate_profiles;
  v_out := v_out || 'candidateProfilesRows=' || v_n || ' ';
  SELECT count(*) INTO v_n FROM public.observation_loops;
  v_out := v_out || 'observationLoopsRows=' || v_n || ' ';

  -- (2) As an authenticated caller: the write policy is gone.
  SELECT holder_id INTO v_holder FROM public.t3a_oversight_holder WHERE revoked_at IS NULL LIMIT 1;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_holder::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    INSERT INTO public.observation_loops (bars_score) VALUES (4);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'LEGACY_LIBRARY_RETIRED%' THEN 'REFUSED_BY_NAME'
                WHEN SQLERRM ~ 'row-level security' THEN 'REFUSED_BY_POLICY'
                ELSE 'REFUSED_OTHER(' || left(SQLERRM, 45) || ')' END;
  END;
  v_out := v_out || 'insertAsAuthenticated=' || v_r || ' ';

  -- The read is kept, per CX-22.
  BEGIN
    SELECT count(*) INTO v_n FROM public.observation_loops;
    v_r := 'READABLE(' || v_n || ')';
  EXCEPTION WHEN others THEN v_r := 'NOT_READABLE'; END;
  v_out := v_out || 'readAsAuthenticated=' || v_r || ' ';

  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- (3) As postgres, where no policy applies: only the trigger can refuse.
  --     This is the line that makes it server-side rather than role-scoped.
  BEGIN
    INSERT INTO public.observation_loops (bars_score) VALUES (4);
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'LEGACY_LIBRARY_RETIRED%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 45) || ')' END;
  END;
  v_out := v_out || 'insertAsSuperuser=' || v_r || ' ';

  -- (4) No write policy remains on it, and a read policy does.
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE schemaname='public' AND tablename='observation_loops' AND cmd <> 'SELECT';
  v_out := v_out || 'writePolicies=' || v_n || ' ';
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE schemaname='public' AND tablename='observation_loops' AND cmd = 'SELECT';
  v_out := v_out || 'readPolicies=' || v_n || ' ';

  -- (5) NEGATIVE CONTROL. The three tables kept under CX-22 still take
  --     writes, because CX-22 says do not break a live feature. If these
  --     refused, the quarantine would have broken onboarding and the mentor
  --     dashboard and the line above would look identical.
  --     A foreign-key violation is a PASS here, and saying why matters: it
  --     means the write reached referential integrity, so nothing refused it
  --     on quarantine grounds. Using random uuids rather than inventing real
  --     mentor and candidate rows is deliberate — a proof that has to create
  --     a mentor assignment to show mentor assignments still work is a proof
  --     that leaves real rows behind if it ever stops aborting.
  BEGIN
    INSERT INTO public.mentor_assignments (mentor_id, candidate_id, status)
    -- 'active', not 'pending'. The status check allows only active,
    --  completed and transferred — and GetStarted.tsx:344 inserts 'pending',
    --  so that live onboarding write has been failing every time it ran. See
    --  the register entry; it is not this section's to fix.
    VALUES (gen_random_uuid(), gen_random_uuid(), 'active');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'LEGACY_LIBRARY_RETIRED%' THEN 'BLOCKED_BY_QUARANTINE'
                WHEN SQLERRM ~ 'row-level security' THEN 'BLOCKED_BY_POLICY'
                WHEN SQLERRM ~ 'violates foreign key|violates not-null|violates check constraint'
                THEN 'REACHED_INTEGRITY_NOT_BLOCKED'
                ELSE 'REFUSED_OTHER(' || left(SQLERRM, 45) || ')' END;
  END;
  v_out := v_out || 'mentorAssignmentsStillWritable=' || v_r || ' ';

  --     And the same read as a policy fact, for the two other CX-22 tables.
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE schemaname='public'
     AND tablename IN ('mentor_assignments','mentor_assigned_dimensions','candidate_profiles')
     AND cmd <> 'SELECT';
  v_out := v_out || 'cx22WritePoliciesKept=' || v_n || ' ';

  -- (6) CX-19's inventory is a queryable record, not prose.
  SELECT count(*) INTO v_n FROM public.t3a_retired_library_reach;
  v_out := v_out || 'inventoryRows=' || v_n;

  RAISE EXCEPTION 'CX1920_RESULT %', v_out;
END;
$p$;
