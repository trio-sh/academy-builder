-- Post-Launch 04 · seed the Ekosse Mofoke → Tony Mofoke assignment so
-- Tony can test the Individual Desk in the assigned state.
--
-- This is idempotent: it does nothing when either profile is missing,
-- and it inserts at most one active assignment. If an active or pending
-- assignment already exists between the two, the migration is a no-op.

DO $$
DECLARE
  v_mentor_profile_id  uuid;
  v_mentor_user_id     uuid;
  v_candidate_profile_id uuid;
  v_existing           uuid;
BEGIN
  -- Look up the mentor profile row for Ekosse Mofoke.
  SELECT mp.id, p.id
    INTO v_mentor_profile_id, v_mentor_user_id
  FROM public.mentor_profiles mp
  JOIN public.profiles p ON p.id = mp.profile_id
  WHERE lower(p.first_name) = lower('Ekosse')
    AND lower(p.last_name)  = lower('Mofoke')
  ORDER BY mp.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_mentor_profile_id IS NULL THEN
    RAISE NOTICE 'Mentor Ekosse Mofoke not found — skipping seed';
    RETURN;
  END IF;

  -- Look up Tony Mofoke's candidate_profiles.id.
  SELECT cp.id
    INTO v_candidate_profile_id
  FROM public.candidate_profiles cp
  JOIN public.profiles p ON p.id = cp.profile_id
  WHERE lower(p.first_name) = lower('Tony')
    AND lower(p.last_name)  = lower('Mofoke')
  ORDER BY cp.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_candidate_profile_id IS NULL THEN
    RAISE NOTICE 'Individual Tony Mofoke not found — skipping seed';
    RETURN;
  END IF;

  -- Idempotency: only insert if there is no active or pending assignment
  -- between this mentor and this individual already.
  SELECT id
    INTO v_existing
  FROM public.mentor_assignments
  WHERE mentor_id = v_mentor_profile_id
    AND candidate_id = v_candidate_profile_id
    AND status IN ('active','pending')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RAISE NOTICE 'Assignment % already exists — leaving as-is', v_existing;
    RETURN;
  END IF;

  INSERT INTO public.mentor_assignments (
    mentor_id,
    candidate_id,
    status,
    loop_number,
    assigned_by
  ) VALUES (
    v_mentor_profile_id,
    v_candidate_profile_id,
    'active',
    1,
    v_mentor_user_id
  );

  RAISE NOTICE 'Seeded assignment: Ekosse Mofoke → Tony Mofoke (active)';
END
$$ LANGUAGE plpgsql;
