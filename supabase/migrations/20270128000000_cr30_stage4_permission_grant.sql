-- CR-30 (Rev 1.6): the Stage 4 participation permission. One question, Yes or No.
-- Yes by the observed participant is recorded as the Stage 4 observation grant (consent type mentor_observation, stage S4)
-- bound to the version and hash of the text shown, then the session permission is recorded as before.
-- Yes by a co-participant records the session permission only (they are not observed). No records nothing and offers no session.
-- Stage 4 entry stays refused with s4_not_activated until the founder's activation decision, whatever the answer (t3a_s4_enter, unchanged).
create or replace function public.t3a_cr30_answer(p_group_session uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare r text; nv text; nh text; dim text; res jsonb; part jsonb;
begin
  if p_answer is null or lower(p_answer) not in ('yes', 'no') then
    return public.t3a_capture_refuse('s4.permission', 'answer_invalid', coalesce(p_group_session::text, ''), 'the answer is Yes or No');
  end if;
  select member_role into r from public.t3a_d1_group_session_member where group_session_id = p_group_session and participant_id = auth.uid();
  if r is null then return public.t3a_capture_refuse('s4.permission', 'NOT_A_MEMBER_OF_THIS_SESSION', coalesce(p_group_session::text, ''), 'only a member answers for themselves'); end if;
  if lower(p_answer) = 'no' then
    return jsonb_build_object('outcome', 'declined', 'session_offered', false);
  end if;
  select nullif(configuration_value, '') into nv from public.t3a_configuration_value where configuration_key = 's4_group_notice_version' order by configuration_seq desc limit 1;
  select nullif(configuration_value, '') into nh from public.t3a_configuration_value where configuration_key = 's4_group_notice_hash' order by configuration_seq desc limit 1;
  if nv is null or nh is null then return public.t3a_capture_refuse('s4.permission', 'group_notice_unloaded', p_group_session::text, 'the approved group participation notice is not loaded'); end if;
  if r = 'observed' then
    select o.dimension_id into dim from public.t3a_d1_group_session gs join public.t3a_d1_content_version cv on cv.content_version_id = gs.source_version_id join public.t3a_content_object o on o.content_object_id = cv.content_object_id where gs.group_session_id = p_group_session;
    if dim is null then return public.t3a_capture_refuse('s4.permission', 'session_dimension_unknown', p_group_session::text, 'the session names no dimension'); end if;
    if not exists (select 1 from public.t3a_consent_record k where k.account_id = auth.uid() and k.consent_type = 'mentor_observation' and k.consent_status = 'granted'
                     and k.consent_scope_dimension_id = dim and k.consent_scope_stage_code = 'S4' and k.consent_copy_version = nv and k.consent_copy_hash = nh
                     and not exists (select 1 from public.t3a_consent_supersession s where s.consent_id = k.consent_id)) then
    res := public.t3a_record_consent(auth.uid(), 'mentor_observation', 'granted', dim, 'S4', nv, nh, 'checkbox', 'en-CA', 'observation', 'future_only', null, null, null);
    if res ->> 'outcome' is distinct from 'recorded' then return res; end if;
    end if;
  end if;
  part := public.t3a_s4_record_group_participation(p_group_session);
  if part ->> 'outcome' is distinct from 'recorded' then return part; end if;
  return jsonb_build_object('outcome', 'recorded', 'notice_version', nv, 'stage4_grant', r = 'observed');
end $fn$;
revoke all on function public.t3a_cr30_answer(uuid, text) from public, anon;
grant execute on function public.t3a_cr30_answer(uuid, text) to authenticated, service_role;

-- The consent stamp binds a consent row to the notice the person saw. The Stage 4 grant saw the group session text, not the consent notice,
-- so a mentor_observation row scoped to S4 is stamped with the loaded group session text version and hash.
create or replace function public.t3a_consent_stamp_notice() returns trigger language plpgsql security definer set search_path = public as $fn$
declare n jsonb; sv text; sh text;
begin
  if new.consent_type = 'mentor_observation' and new.consent_scope_stage_code = 'S4' then
    select nullif(configuration_value, '') into sv from public.t3a_configuration_value where configuration_key = 's4_group_notice_version' order by configuration_seq desc limit 1;
    select nullif(configuration_value, '') into sh from public.t3a_configuration_value where configuration_key = 's4_group_notice_hash' order by configuration_seq desc limit 1;
    if sv is not null and sh is not null then new.consent_copy_version := sv; new.consent_copy_hash := sh; end if;
    return new;
  end if;
  n := public.t3a_consent_notice();
  if (n->>'rendered')::boolean then
    new.consent_copy_version := n->>'notice_version';
    new.consent_copy_hash := n->>'notice_hash';
  end if;
  return new;
end $fn$;
