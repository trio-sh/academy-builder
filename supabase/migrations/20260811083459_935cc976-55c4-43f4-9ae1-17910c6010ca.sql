-- =========================================================
-- RPC LAYER: browser-callable functions
-- =========================================================

-- ---------- POLLING ----------
CREATE OR REPLACE FUNCTION public.poll_updates(since timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cutoff timestamptz := COALESCE(since, now() - interval '1 day');
  notifs jsonb;
  msgs jsonb;
  unread_n int;
  unread_m int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','not authenticated'); END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC), '[]'::jsonb)
    INTO notifs
  FROM (SELECT * FROM public.notifications WHERE user_id = uid AND created_at > cutoff
        ORDER BY created_at DESC LIMIT 50) n;

  SELECT COUNT(*) INTO unread_n FROM public.notifications WHERE user_id = uid AND is_read = false;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC), '[]'::jsonb)
    INTO msgs
  FROM (SELECT msg.* FROM public.messages msg
        JOIN public.conversation_participants cp ON cp.conversation_id = msg.conversation_id
        WHERE cp.user_id = uid AND msg.sender_id <> uid
          AND msg.created_at > cutoff AND msg.is_deleted = false
        ORDER BY msg.created_at DESC LIMIT 50) m;

  SELECT COUNT(*) INTO unread_m
  FROM public.messages msg
  JOIN public.conversation_participants cp ON cp.conversation_id = msg.conversation_id
  WHERE cp.user_id = uid AND msg.sender_id <> uid AND msg.is_deleted = false
    AND msg.created_at > COALESCE(cp.last_read_at, '-infinity'::timestamptz);

  RETURN jsonb_build_object(
    'server_time', now(),
    'notifications', notifs,
    'messages', msgs,
    'unread_notifications', unread_n,
    'unread_messages', unread_m
  );
END; $$;

-- ---------- NOTIFICATIONS ----------
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_message text,
  p_action_url text DEFAULT NULL, p_priority text DEFAULT 'normal',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.notifications(user_id, type, title, message, action_url, priority, metadata, is_read)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, COALESCE(p_priority,'normal'), COALESCE(p_metadata,'{}'::jsonb), false)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications SET is_read = true WHERE id = p_id AND user_id = auth.uid();
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE c integer;
BEGIN
  UPDATE public.notifications SET is_read = true WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS c = ROW_COUNT; RETURN c;
END; $$;

-- ---------- GROWTH LOG ----------
CREATE OR REPLACE FUNCTION public.add_growth_log_entry(
  p_candidate_id uuid, p_event_type text, p_title text,
  p_description text DEFAULT NULL, p_source_component text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.growth_log_entries(candidate_id, event_type, title, description, source_component, source_id, metadata)
  VALUES (p_candidate_id, p_event_type, p_title, p_description, p_source_component, p_source_id, COALESCE(p_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- ---------- OBSERVATIONS ----------
CREATE OR REPLACE FUNCTION public.record_observation(
  p_assignment_id uuid, p_candidate_id uuid, p_session_date date,
  p_behavioral_scores jsonb, p_strengths text[] DEFAULT '{}',
  p_areas_for_improvement text[] DEFAULT '{}', p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE mid uuid := public.my_mentor_id(); new_id uuid;
BEGIN
  IF mid IS NULL AND NOT public.is_admin() THEN RAISE EXCEPTION 'only mentors can record observations'; END IF;
  INSERT INTO public.mentor_observations(assignment_id, mentor_id, candidate_id, session_date, behavioral_scores, strengths, areas_for_improvement, notes)
  VALUES (p_assignment_id, mid, p_candidate_id, p_session_date, p_behavioral_scores, p_strengths, p_areas_for_improvement, p_notes)
  RETURNING id INTO new_id;

  INSERT INTO public.growth_log_entries(candidate_id, event_type, title, description, source_component, source_id)
  VALUES (p_candidate_id, 'observation', 'Observation recorded', 'A mentor recorded an observation session.', 'Observation', new_id);

  PERFORM public.create_notification(
    (SELECT profile_id FROM public.candidate_profiles WHERE id = p_candidate_id),
    'observation_completed', 'Observation recorded',
    'Your mentor recorded a new observation session.', '/dashboard/candidate');
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_endorsement(
  p_assignment_id uuid, p_candidate_id uuid, p_decision text,
  p_justification text DEFAULT NULL, p_redirect_to text DEFAULT NULL,
  p_redirect_module_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE mid uuid := public.my_mentor_id(); new_id uuid;
BEGIN
  IF mid IS NULL AND NOT public.is_admin() THEN RAISE EXCEPTION 'only mentors can endorse'; END IF;
  INSERT INTO public.endorsements(assignment_id, mentor_id, candidate_id, decision, justification, redirect_to, redirect_module_id)
  VALUES (p_assignment_id, mid, p_candidate_id, p_decision, p_justification, p_redirect_to, p_redirect_module_id)
  RETURNING id INTO new_id;

  INSERT INTO public.growth_log_entries(candidate_id, event_type, title, description, source_component, source_id)
  VALUES (p_candidate_id, 'endorsement', 'Mentor decision: ' || p_decision, p_justification, 'Endorsement', new_id);

  PERFORM public.create_notification(
    (SELECT profile_id FROM public.candidate_profiles WHERE id = p_candidate_id),
    'endorsement_received', 'Mentor decision recorded',
    'Your mentor recorded a decision: ' || p_decision, '/dashboard/candidate');
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.start_observation_loop(
  p_candidate_id uuid, p_dimension_id text, p_observation_level integer,
  p_assignment_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cooldown_days integer;
  last_loop public.observation_loops%ROWTYPE;
  next_loop integer := 1;
  variant integer;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT COALESCE((SELECT value::integer FROM public.admin_settings WHERE key = 'reassessment_cooldown_days'), 14)
    INTO cooldown_days;

  SELECT * INTO last_loop FROM public.observation_loops
  WHERE candidate_id = p_candidate_id AND dimension_id = p_dimension_id
  ORDER BY loop_number DESC LIMIT 1;

  IF FOUND THEN
    IF last_loop.status = 'in_progress' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'in_progress', 'loop_id', last_loop.id);
    END IF;
    IF last_loop.cooldown_ends_at IS NOT NULL AND last_loop.cooldown_ends_at > now() AND NOT last_loop.mentor_override THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'cooldown', 'cooldown_ends_at', last_loop.cooldown_ends_at);
    END IF;
    next_loop := last_loop.loop_number + 1;
  END IF;

  -- deterministic-but-unpredictable scenario variant, never repeating the previous one
  variant := 1 + floor(random() * 5)::int;
  IF FOUND AND variant = last_loop.scenario_variant THEN
    variant := 1 + (variant % 5);
  END IF;

  INSERT INTO public.observation_loops(
    candidate_id, assignment_id, dimension_id, observation_level, loop_number,
    status, scenario_variant, mentor_id, started_at, cooldown_days)
  VALUES (p_candidate_id, p_assignment_id, p_dimension_id, p_observation_level, next_loop,
    'in_progress', variant, public.my_mentor_id(), now(), cooldown_days)
  RETURNING id INTO new_id;

  INSERT INTO public.scenario_selection_audit(candidate_id, dimension_id, random_seed, scenario_sequence)
  VALUES (p_candidate_id, p_dimension_id, floor(random()*1000000000)::bigint, ARRAY[variant]);

  RETURN jsonb_build_object('allowed', true, 'loop_id', new_id, 'loop_number', next_loop, 'scenario_variant', variant);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_observation_loop(
  p_loop_id uuid, p_bars_score integer DEFAULT NULL, p_endorsement_decision text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE cd integer;
BEGIN
  SELECT COALESCE(cooldown_days, 14) INTO cd FROM public.observation_loops WHERE id = p_loop_id;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.observation_loops
  SET status = 'completed', bars_score = p_bars_score,
      endorsement_decision = p_endorsement_decision,
      completed_at = now(), cooldown_ends_at = now() + (cd || ' days')::interval,
      is_locked = true, updated_at = now()
  WHERE id = p_loop_id;
  RETURN true;
END; $$;

-- ---------- BEHAVIORAL EVIDENCE REPORT ----------
CREATE OR REPLACE FUNCTION public.issue_behavioral_evidence_report(
  p_candidate_id uuid, p_readiness_tier text DEFAULT NULL,
  p_behavioral_scores jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE code text; new_id uuid;
BEGIN
  IF public.my_mentor_id() IS NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'only mentors or admins can issue a Behavioral Evidence Report';
  END IF;
  LOOP
    code := 'BER-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.skill_passports WHERE verification_code = code);
  END LOOP;

  UPDATE public.skill_passports SET is_active = false WHERE candidate_id = p_candidate_id AND is_active = true;

  INSERT INTO public.skill_passports(candidate_id, verification_code, readiness_tier, behavioral_scores, is_active, issued_at, expires_at)
  VALUES (p_candidate_id, code, p_readiness_tier, COALESCE(p_behavioral_scores,'{}'::jsonb), true, now(), now() + interval '1 year')
  RETURNING id INTO new_id;

  UPDATE public.candidate_profiles SET has_skill_passport = true, updated_at = now() WHERE id = p_candidate_id;

  INSERT INTO public.growth_log_entries(candidate_id, event_type, title, description, source_component, source_id)
  VALUES (p_candidate_id, 'ber_issued', 'Behavioral Evidence Report issued',
          'Your Behavioral Evidence Report is now active.', 'BER', new_id);

  PERFORM public.create_notification(
    (SELECT profile_id FROM public.candidate_profiles WHERE id = p_candidate_id),
    'passport_issued', 'Behavioral Evidence Report issued',
    'Your Behavioral Evidence Report is now available.', '/dashboard/candidate');

  RETURN jsonb_build_object('id', new_id, 'verification_code', code);
END; $$;

CREATE OR REPLACE FUNCTION public.verify_behavioral_evidence(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'valid', true,
    'verification_code', sp.verification_code,
    'candidate_name', p.first_name || ' ' || left(COALESCE(p.last_name,''), 1) || '.',
    'issued_at', sp.issued_at,
    'expires_at', sp.expires_at,
    'is_active', sp.is_active AND (sp.expires_at IS NULL OR sp.expires_at > now()),
    'dimensions_observed', (SELECT COUNT(DISTINCT dimension_id) FROM public.observation_loops
                            WHERE candidate_id = sp.candidate_id AND status = 'completed')
  ) INTO result
  FROM public.skill_passports sp
  JOIN public.candidate_profiles cp ON cp.id = sp.candidate_id
  JOIN public.profiles p ON p.id = cp.profile_id
  WHERE upper(sp.verification_code) = upper(p_code);

  RETURN COALESCE(result, jsonb_build_object('valid', false));
END; $$;

-- ---------- MESSAGING ----------
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); conv_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT c.id INTO conv_id FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = c.id AND user_id = uid)
    AND EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = c.id AND user_id = p_other_user_id)
    AND (SELECT COUNT(*) FROM public.conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO public.conversations(type) VALUES ('direct') RETURNING id INTO conv_id;
  INSERT INTO public.conversation_participants(conversation_id, user_id) VALUES (conv_id, uid), (conv_id, p_other_user_id);
  RETURN conv_id;
END; $$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid, p_content text,
  p_message_type text DEFAULT 'text', p_file_url text DEFAULT NULL, p_reply_to_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); new_id uuid; r record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = p_conversation_id AND user_id = uid) THEN
    RAISE EXCEPTION 'not a participant of this conversation';
  END IF;

  INSERT INTO public.messages(conversation_id, sender_id, content, message_type, file_url, reply_to_id)
  VALUES (p_conversation_id, uid, p_content, COALESCE(p_message_type,'text'), p_file_url, p_reply_to_id)
  RETURNING id INTO new_id;

  UPDATE public.conversations
  SET last_message_at = now(), last_message_preview = left(p_content, 140), updated_at = now()
  WHERE id = p_conversation_id;

  FOR r IN SELECT user_id FROM public.conversation_participants
           WHERE conversation_id = p_conversation_id AND user_id <> uid AND is_muted = false LOOP
    PERFORM public.create_notification(r.user_id, 'message_received', 'New message', left(p_content, 140), '/dashboard/messages');
  END LOOP;

  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.list_conversations()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); result jsonb;
BEGIN
  IF uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'last_message_at' DESC NULLS LAST), '[]'::jsonb) INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'type', c.type, 'title', c.title,
      'last_message_at', c.last_message_at, 'last_message_preview', c.last_message_preview,
      'unread', (SELECT COUNT(*) FROM public.messages m
                 WHERE m.conversation_id = c.id AND m.sender_id <> uid AND m.is_deleted = false
                   AND m.created_at > COALESCE(cp.last_read_at, '-infinity'::timestamptz)),
      'participants', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                          'user_id', p.id, 'first_name', p.first_name,
                          'last_name', p.last_name, 'avatar_url', p.avatar_url, 'role', p.role)), '[]'::jsonb)
                       FROM public.conversation_participants cp2
                       JOIN public.profiles p ON p.id = cp2.user_id
                       WHERE cp2.conversation_id = c.id AND cp2.user_id <> uid)
    ) AS x
    FROM public.conversations c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = uid
  ) s;
  RETURN result;
END; $$;

-- ---------- CONNECTIONS & PROJECTS ----------
CREATE OR REPLACE FUNCTION public.request_connection(p_candidate_id uuid, p_message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE eid uuid := public.my_employer_id(); new_id uuid;
BEGIN
  IF eid IS NULL THEN RAISE EXCEPTION 'only employers can request connections'; END IF;
  INSERT INTO public.t3x_connections(employer_id, candidate_id, status, message, expires_at)
  VALUES (eid, p_candidate_id, 'pending', p_message, now() + interval '14 days')
  RETURNING id INTO new_id;

  PERFORM public.create_notification(
    (SELECT profile_id FROM public.candidate_profiles WHERE id = p_candidate_id),
    'connection_request', 'New employer interest',
    'An employer has requested to connect with you.', '/dashboard/candidate');
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.respond_to_connection(p_connection_id uuid, p_accept boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE cid uuid := public.my_candidate_id(); emp_profile uuid;
BEGIN
  UPDATE public.t3x_connections
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
      responded_at = now(), updated_at = now()
  WHERE id = p_connection_id AND candidate_id = cid
  RETURNING (SELECT profile_id FROM public.employer_profiles WHERE id = t3x_connections.employer_id) INTO emp_profile;

  IF NOT FOUND THEN RETURN false; END IF;
  IF p_accept AND emp_profile IS NOT NULL THEN
    PERFORM public.create_notification(emp_profile, 'connection_accepted', 'Connection accepted',
      'A candidate accepted your connection request.', '/dashboard/employer');
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_to_project(p_project_id uuid, p_cover_letter text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE cid uuid := public.my_candidate_id(); new_id uuid; emp_profile uuid;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'only candidates can apply'; END IF;
  INSERT INTO public.liveworks_applications(project_id, candidate_id, cover_letter, status)
  VALUES (p_project_id, cid, p_cover_letter, 'pending')
  RETURNING id INTO new_id;

  SELECT ep.profile_id INTO emp_profile
  FROM public.liveworks_projects lp JOIN public.employer_profiles ep ON ep.id = lp.employer_id
  WHERE lp.id = p_project_id;

  IF emp_profile IS NOT NULL THEN
    PERFORM public.create_notification(emp_profile, 'project_application', 'New project application',
      'A candidate applied to your project.', '/dashboard/employer');
  END IF;
  RETURN new_id;
END; $$;

-- ---------- DASHBOARD STATS ----------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); r text; cid uuid; mid uuid; eid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','not authenticated'); END IF;
  SELECT role INTO r FROM public.profiles WHERE id = uid;

  IF r = 'candidate' THEN
    cid := public.my_candidate_id();
    RETURN jsonb_build_object('role','candidate',
      'observations', (SELECT COUNT(*) FROM public.mentor_observations WHERE candidate_id = cid),
      'endorsements', (SELECT COUNT(*) FROM public.endorsements WHERE candidate_id = cid),
      'loops_completed', (SELECT COUNT(*) FROM public.observation_loops WHERE candidate_id = cid AND status='completed'),
      'growth_entries', (SELECT COUNT(*) FROM public.growth_log_entries WHERE candidate_id = cid),
      'connections', (SELECT COUNT(*) FROM public.t3x_connections WHERE candidate_id = cid),
      'has_ber', (SELECT EXISTS(SELECT 1 FROM public.skill_passports WHERE candidate_id = cid AND is_active)),
      'modules_completed', (SELECT COUNT(*) FROM public.bridgefast_progress WHERE candidate_id = cid AND status='completed'));
  ELSIF r = 'mentor' THEN
    mid := public.my_mentor_id();
    RETURN jsonb_build_object('role','mentor',
      'active_mentees', (SELECT COUNT(*) FROM public.mentor_assignments WHERE mentor_id = mid AND status='active'),
      'observations', (SELECT COUNT(*) FROM public.mentor_observations WHERE mentor_id = mid),
      'endorsements', (SELECT COUNT(*) FROM public.endorsements WHERE mentor_id = mid),
      'upcoming_sessions', (SELECT COUNT(*) FROM public.mentor_sessions WHERE mentor_id = mid AND scheduled_at > now() AND status='scheduled'));
  ELSIF r = 'employer' THEN
    eid := public.my_employer_id();
    RETURN jsonb_build_object('role','employer',
      'connections', (SELECT COUNT(*) FROM public.t3x_connections WHERE employer_id = eid),
      'accepted', (SELECT COUNT(*) FROM public.t3x_connections WHERE employer_id = eid AND status='accepted'),
      'projects', (SELECT COUNT(*) FROM public.liveworks_projects WHERE employer_id = eid),
      'applications', (SELECT COUNT(*) FROM public.liveworks_applications la
                       JOIN public.liveworks_projects lp ON lp.id = la.project_id WHERE lp.employer_id = eid));
  ELSIF r = 'admin' THEN
    RETURN jsonb_build_object('role','admin',
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'candidates', (SELECT COUNT(*) FROM public.candidate_profiles),
      'mentors', (SELECT COUNT(*) FROM public.mentor_profiles),
      'employers', (SELECT COUNT(*) FROM public.employer_profiles),
      'reports_issued', (SELECT COUNT(*) FROM public.skill_passports WHERE is_active),
      'pending_nominations', (SELECT COUNT(*) FROM public.talentvisa_nominations WHERE status='pending'));
  END IF;
  RETURN jsonb_build_object('role', COALESCE(r,'unknown'));
END; $$;

-- ---------- EMAIL ----------
CREATE OR REPLACE FUNCTION public.queue_email(
  p_to_email text, p_to_name text, p_template text, p_template_data jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.email_queue(to_email, to_name, template, template_data, status)
  VALUES (p_to_email, p_to_name, p_template, COALESCE(p_template_data,'{}'::jsonb), 'pending')
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- ---------- EXECUTE GRANTS ----------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_behavioral_evidence(text) TO anon;