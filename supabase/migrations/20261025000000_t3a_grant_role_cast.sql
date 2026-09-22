-- =====================================================================
-- t3a_grant_role has never granted a role
--
-- "A role is granted, never chosen" is the doctrine, and t3a_grant_role
-- is the route that grants one: service context only, a basis required,
-- every decision logged to t3a_role_grant_attempt. It is the only
-- governed way to move an account from candidate to mentor.
--
-- It fails on its own UPDATE:
--
--   ERROR 42804: column "role" is of type user_role but expression is of
--   type text
--
-- Its comment says why it was written that way:
--
--   "profiles.role is plain text with no enum and no CHECK constraint,
--    so the allowed set is enforced here rather than by the column type."
--
-- That premise is false. profiles.role is the user_role enum — candidate,
-- mentor, employer, school_admin, admin — and has been since
-- 002_actual_schema.sql created it. So the function has raised 42804 on
-- every call since it was written, and t3a_role_grant_attempt confirms
-- it: zero rows with operation GRANT and outcome permitted. Not one role
-- has ever been granted through the governed route.
--
-- Nothing noticed because nothing had used it. The two mentor roles on
-- this system were written by direct profile inserts in service context,
-- which the role guard permits and logs — but logs WITHOUT a basis,
-- because only this route asks for one. The route that records why a
-- person was made a mentor is the one that did not work.
--
-- The fix is the cast. The in-function allowed set is kept rather than
-- removed: it is now redundant with the enum, but a check that agrees
-- with the column costs nothing, and it is the thing that returns
-- ROLE_NOT_RECOGNISED as a value instead of raising 22P02 at the caller.
-- =====================================================================

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_grant_role(
  p_target_profile_id uuid,
  p_role text,
  p_basis text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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

  -- Checked here so an unrecognised role comes back as a value rather
  -- than raising 22P02 out of the cast below. The set is the same as
  -- public.user_role carries; agreeing with the column is the point.
  IF p_role NOT IN ('candidate', 'mentor', 'employer', 'school_admin', 'admin') THEN
    INSERT INTO public.t3a_role_grant_attempt
      (target_profile_id, attempted_by, to_role, operation, outcome,
       reason_code, basis, service_context)
    VALUES
      (p_target_profile_id, auth.uid(), p_role, 'GRANT', 'refused',
       'ROLE_NOT_RECOGNISED', p_basis, true);
    RETURN jsonb_build_object('ok', false, 'reason', 'ROLE_NOT_RECOGNISED');
  END IF;

  SELECT role::text INTO v_from FROM public.profiles WHERE id = p_target_profile_id;
  IF v_from IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
  END IF;

  -- The cast. profiles.role is user_role, not text.
  UPDATE public.profiles
     SET role = p_role::public.user_role, updated_at = now()
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
    'to_role', p_role);
END;
$fn$;
