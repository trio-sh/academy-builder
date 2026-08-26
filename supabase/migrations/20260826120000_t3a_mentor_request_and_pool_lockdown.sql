-- Post-Launch 03 · Note 4
-- Request a Mentor: intake table + lock the mentor pool at the data layer.
--
-- The individual submits a request; The 3rd Academy assigns a mentor. The
-- individual never sees the mentor pool — not as a directory, not as a
-- filter, not as a fetched-but-hidden payload. Correcting the interface
-- is not enough; the data endpoint has to stop returning the pool to
-- candidates. See Post-Launch 03 Note 4 (f).

-- 1) Intake table: t3a_mentor_request ---------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_mentor_request (
  mentor_request_id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  area_of_work text,
  current_work_context text,
  availability text,
  time_zone text,
  additional_context text,
  status text not null default 'received'
    check (status in ('received','under_review','assigned','introduction_sent','closed_without_assignment','withdrawn')),
  assigned_mentor_id uuid references public.mentor_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_mentor_request_requester_idx
  ON public.t3a_mentor_request (requester_id);

CREATE INDEX IF NOT EXISTS t3a_mentor_request_status_idx
  ON public.t3a_mentor_request (status);

ALTER TABLE public.t3a_mentor_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_mentor_request_select_own" ON public.t3a_mentor_request;
CREATE POLICY "t3a_mentor_request_select_own"
  ON public.t3a_mentor_request
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_mentor_request_insert_own" ON public.t3a_mentor_request;
CREATE POLICY "t3a_mentor_request_insert_own"
  ON public.t3a_mentor_request
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "t3a_mentor_request_update_admin" ON public.t3a_mentor_request;
CREATE POLICY "t3a_mentor_request_update_admin"
  ON public.t3a_mentor_request
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.t3a_mentor_request TO authenticated;
GRANT UPDATE ON public.t3a_mentor_request TO authenticated;

-- 2) Lock the mentor pool ---------------------------------------------------
--
-- Previously mentor_profiles was fully readable by any authenticated user,
-- which meant an individual could browse the mentor pool by calling the
-- endpoint directly, even after the UI stopped showing the list.
--
-- After this migration mentor_profiles is readable by:
--   - the mentor whose row it is
--   - an administrator
--   - a mentor (i.e. any user with a mentor_profiles row)
--   - an employer (i.e. any user with an employer_profiles row) — kept
--     because the wider platform relies on it, and employers do not have
--     an individual role
--   - a candidate ONLY for the specific mentor currently assigned to them
--     via mentor_assignments with status 'active' or 'pending'
--
-- The candidate role gets NO other route to a mentor_profiles row.

DROP POLICY IF EXISTS "mentor_profiles_all" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_select" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_insert" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_update" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_delete" ON public.mentor_profiles;

CREATE POLICY "mentor_profiles_select_scoped"
  ON public.mentor_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR profile_id = auth.uid()
    OR public.my_mentor_id() IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.employer_profiles ep
      WHERE ep.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.mentor_assignments ma
      JOIN public.candidate_profiles cp ON cp.id = ma.candidate_id
      WHERE ma.mentor_id = mentor_profiles.id
        AND cp.profile_id = auth.uid()
        AND ma.status IN ('active','pending')
    )
  );

CREATE POLICY "mentor_profiles_insert_own"
  ON public.mentor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "mentor_profiles_update_own"
  ON public.mentor_profiles
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "mentor_profiles_delete_admin"
  ON public.mentor_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Keep table-level GRANT open; RLS above is the actual gate.
GRANT SELECT, INSERT, UPDATE ON public.mentor_profiles TO authenticated;
GRANT DELETE ON public.mentor_profiles TO authenticated;
