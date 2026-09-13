-- T3A-DEV-PLC-005-A · Note 1 · Step 2 — Close role self-assertion.
--
-- Findings this closes (see docs/plc-005/NOTE-01-STEP-01-…md):
--
--   1. public.is_admin() reads profiles.role for auth.uid().
--   2. Policy profiles_update_own is an UPDATE policy whose polwithcheck
--      IS NULL. PostgreSQL then applies the USING expression as the write
--      check. That expression is ((id = auth.uid()) OR is_admin()), which
--      every account satisfies for its own row.
--   3. No trigger, CHECK constraint or column privilege guards the column.
--
--   Composed: any authenticated account could set its own role to 'admin'
--   and from the next statement hold every is_admin()-gated authority on
--   the platform, including the D1 authority register.
--
-- Doctrine implemented (Note 1): "A role is granted, never chosen."
-- Individual (candidate) is the only role a person may take for
-- themselves. Mentor, employer, school_admin and admin are granted by
-- The 3rd Academy on a record naming who granted them and on what basis.
--
-- Nothing is renamed. profiles.role keeps its name; only its write path
-- changes.

set search_path = public;

-- ========================================================================
-- §1 · Service-context helper
-- ========================================================================
--
-- True when the statement is running under the service role, or with no
-- JWT at all (a direct trusted connection, or a migration). False for
-- anon and authenticated client sessions.
--
-- current_setting(..., true) returns NULL when unset and '' in some
-- pooled contexts; NULLIF guards the jsonb cast against both.

CREATE OR REPLACE FUNCTION public.t3a_is_service_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'service_role'
  ) = 'service_role';
$$;

-- ========================================================================
-- §2 · Append-only role-grant attempt log
-- ========================================================================
--
-- Note 1 Step 2 requires the rejection be logged "with enough detail to
-- see whether it is being attempted". Permitted grants are recorded too,
-- so the log is the provenance record the platform currently lacks.

DO $$ BEGIN
  CREATE TYPE public.t3a_role_grant_outcome AS ENUM (
    'permitted',
    'refused'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.t3a_role_grant_attempt (
  attempt_id uuid primary key default gen_random_uuid(),
  target_profile_id uuid,
  attempted_by uuid,
  from_role text,
  to_role text,
  operation text not null,
  outcome public.t3a_role_grant_outcome not null,
  reason_code text,
  basis text,
  service_context boolean not null default false,
  attempted_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_role_grant_attempt_target_idx
  ON public.t3a_role_grant_attempt (target_profile_id, attempted_at desc);

CREATE INDEX IF NOT EXISTS t3a_role_grant_attempt_outcome_idx
  ON public.t3a_role_grant_attempt (outcome, attempted_at desc);

ALTER TABLE public.t3a_role_grant_attempt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_role_grant_attempt_admin_read" ON public.t3a_role_grant_attempt;
CREATE POLICY "t3a_role_grant_attempt_admin_read"
  ON public.t3a_role_grant_attempt FOR SELECT TO authenticated
  USING (public.is_admin());

-- Append-only: no client write policy, and UPDATE/DELETE blocked outright
-- so the log cannot be edited by the role whose attempts it records.

CREATE OR REPLACE FUNCTION public.t3a_role_grant_attempt_no_mutate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ROLE_GRANT_LOG_IS_APPEND_ONLY';
END;
$$;

DROP TRIGGER IF EXISTS t3a_role_grant_attempt_no_update_trg ON public.t3a_role_grant_attempt;
CREATE TRIGGER t3a_role_grant_attempt_no_update_trg
  BEFORE UPDATE ON public.t3a_role_grant_attempt
  FOR EACH ROW EXECUTE FUNCTION public.t3a_role_grant_attempt_no_mutate();

DROP TRIGGER IF EXISTS t3a_role_grant_attempt_no_delete_trg ON public.t3a_role_grant_attempt;
CREATE TRIGGER t3a_role_grant_attempt_no_delete_trg
  BEFORE DELETE ON public.t3a_role_grant_attempt
  FOR EACH ROW EXECUTE FUNCTION public.t3a_role_grant_attempt_no_mutate();

-- ========================================================================
-- §3 · The role guard trigger
-- ========================================================================
--
-- Runs regardless of RLS, so the guarantee survives a policy being
-- loosened later. This is the primary control; §4 is defence in depth.
--
--   INSERT  — a client session may create its own profile as 'candidate'
--             only. Any other role refuses.
--   UPDATE  — a client session may not change role at all, in either
--             direction. Only the service context may.
--
-- Every decision is written to t3a_role_grant_attempt before it takes
-- effect or raises.

CREATE OR REPLACE FUNCTION public.t3a_profiles_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service boolean := public.t3a_is_service_context();
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_service THEN
      INSERT INTO public.t3a_role_grant_attempt
        (target_profile_id, attempted_by, from_role, to_role, operation,
         outcome, reason_code, service_context)
      VALUES
        (NEW.id, v_actor, NULL, NEW.role, 'INSERT',
         'permitted', NULL, true);
      RETURN NEW;
    END IF;

    -- Client session. Only the individual role may be self-taken.
    IF NEW.role IS DISTINCT FROM 'candidate' THEN
      INSERT INTO public.t3a_role_grant_attempt
        (target_profile_id, attempted_by, from_role, to_role, operation,
         outcome, reason_code, service_context)
      VALUES
        (NEW.id, v_actor, NULL, NEW.role, 'INSERT',
         'refused', 'ROLE_SELF_ASSERTION_REFUSED', false);

      RAISE EXCEPTION
        'ROLE_SELF_ASSERTION_REFUSED: a role other than candidate cannot be self-assigned. Mentor is by invitation; employer is by application.'
        USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.t3a_role_grant_attempt
      (target_profile_id, attempted_by, from_role, to_role, operation,
       outcome, reason_code, service_context)
    VALUES
      (NEW.id, v_actor, NULL, NEW.role, 'INSERT',
       'permitted', NULL, false);
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF v_service THEN
      INSERT INTO public.t3a_role_grant_attempt
        (target_profile_id, attempted_by, from_role, to_role, operation,
         outcome, reason_code, service_context)
      VALUES
        (NEW.id, v_actor, OLD.role, NEW.role, 'UPDATE',
         'permitted', NULL, true);
      RETURN NEW;
    END IF;

    INSERT INTO public.t3a_role_grant_attempt
      (target_profile_id, attempted_by, from_role, to_role, operation,
       outcome, reason_code, service_context)
    VALUES
      (NEW.id, v_actor, OLD.role, NEW.role, 'UPDATE',
       'refused', 'ROLE_SELF_ASSERTION_REFUSED', false);

    RAISE EXCEPTION
      'ROLE_SELF_ASSERTION_REFUSED: role is granted by The 3rd Academy and cannot be changed from a client session.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t3a_profiles_role_guard_trg ON public.profiles;
CREATE TRIGGER t3a_profiles_role_guard_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.t3a_profiles_role_guard();

-- ========================================================================
-- §4 · Reissue profiles_update_own WITH an explicit WITH CHECK
-- ========================================================================
--
-- Closes the NULL-with_check fallback directly. The trigger in §3 already
-- refuses a role change from a client session; this stops the policy layer
-- from ever being the thing that allowed it.
--
-- The USING clause is unchanged, so who may update which row is exactly as
-- before. Only the write check is added.

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((id = auth.uid()) OR public.is_admin())
  WITH CHECK ((id = auth.uid()) OR public.is_admin());

-- ========================================================================
-- §5 · The governed grant path
-- ========================================================================
--
-- The only supported way a non-candidate role is set. Service-role only
-- for now; PLC-005 Note 4 attaches it to the oversight administrator role
-- with its own enumerated authority and append-only log.
--
-- Records the granter, the time and the basis, which is what Note 1 (c)
-- and Note 4 (d) both require of an approval.

CREATE OR REPLACE FUNCTION public.t3a_grant_role(
  p_target_profile_id uuid,
  p_role text,
  p_basis text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text;
BEGIN
  IF NOT public.t3a_is_service_context() THEN
    INSERT INTO public.t3a_role_grant_attempt
      (target_profile_id, attempted_by, to_role, operation, outcome,
       reason_code, basis, service_context)
    VALUES
      (p_target_profile_id, auth.uid(), p_role, 'GRANT', 'refused',
       'ROLE_GRANT_REQUIRES_SERVICE_CONTEXT', p_basis, false);
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'ROLE_GRANT_REQUIRES_SERVICE_CONTEXT');
  END IF;

  IF p_basis IS NULL OR btrim(p_basis) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'BASIS_REQUIRED');
  END IF;

  -- profiles.role is plain text with no enum and no CHECK constraint, so
  -- the allowed set is enforced here rather than by the column type.
  IF p_role NOT IN ('candidate', 'mentor', 'employer', 'school_admin', 'admin') THEN
    INSERT INTO public.t3a_role_grant_attempt
      (target_profile_id, attempted_by, to_role, operation, outcome,
       reason_code, basis, service_context)
    VALUES
      (p_target_profile_id, auth.uid(), p_role, 'GRANT', 'refused',
       'ROLE_NOT_RECOGNISED', p_basis, true);
    RETURN jsonb_build_object('ok', false, 'reason', 'ROLE_NOT_RECOGNISED');
  END IF;

  SELECT role INTO v_from FROM public.profiles WHERE id = p_target_profile_id;
  IF v_from IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
  END IF;

  UPDATE public.profiles
     SET role = p_role, updated_at = now()
   WHERE id = p_target_profile_id;

  INSERT INTO public.t3a_role_grant_attempt
    (target_profile_id, attempted_by, from_role, to_role, operation,
     outcome, basis, service_context)
  VALUES
    (p_target_profile_id, auth.uid(), v_from, p_role, 'GRANT',
     'permitted', p_basis, true);

  RETURN jsonb_build_object(
    'ok', true,
    'target', p_target_profile_id,
    'from_role', v_from,
    'to_role', p_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.t3a_grant_role(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.t3a_grant_role(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.t3a_grant_role(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_grant_role(uuid, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
