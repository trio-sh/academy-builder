CREATE OR REPLACE FUNCTION public.t3a_profiles_role_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
