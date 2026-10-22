-- CORR-007 Rev 1.6 rules CR-18 (progression decision only after commit) and CR-19 (minimum observation context for the mentor) (CR-197).
-- CR-18: a progression decision is recorded only after the observation is committed. A decision before commit, or a combined commit and progression act, is refused.
-- CR-19: the mentor view of a session shows the minimum observation context and nothing from the participant's intake profile.
-- Nothing here activates a Stage. The direct-table check on the older progression table follows the existing sequence switch (t3a_capture_config.enforce_sequence), which stays off.

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-18. The mentor route
-- ---------------------------------------------------------------------------------------------------------------------

do $do$ begin
  if to_regprocedure('public.t3a_record_progression_decision_base(uuid,public.t3a_dimension_code,public.t3a_progression_decision,text,text)') is null then
    alter function public.t3a_record_progression_decision(uuid, public.t3a_dimension_code, public.t3a_progression_decision, text, text) rename to t3a_record_progression_decision_base;
  end if;
end $do$;

-- True when the participant's observation on the dimension and Stage is committed.
create or replace function public.t3a_cr18_observation_committed(p_participant uuid, p_dimension text, p_stage text) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = p_dimension and o.stage_code = p_stage and o.is_committed is true)
$fn$;
revoke all on function public.t3a_cr18_observation_committed(uuid, text, text) from public, anon, authenticated;
grant execute on function public.t3a_cr18_observation_committed(uuid, text, text) to service_role;

create or replace function public.t3a_record_progression_decision(p_stage_instance_id uuid, p_dimension_id public.t3a_dimension_code, p_decision public.t3a_progression_decision, p_rationale text default null, p_rationale_code text default null) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare si public.t3a_stage_instance;
begin
  select * into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance_id;
  -- Stage 1 is recorded after the human confirmation, which the base route checks (AC-59). From Stage 2 on the observation itself must be committed.
  if si.stage_instance_id is not null and si.stage_code::text <> 'S1' and not public.t3a_cr18_observation_committed(si.participant_id, p_dimension_id::text, si.stage_code::text) then
    -- the route raises, so the refusal is the error itself; a log row written here would be rolled back with the statement
    perform public.t3a_raise('CR-18', 'the observation is not committed; a progression decision is recorded only after the commit');
  end if;
  return public.t3a_record_progression_decision_base(p_stage_instance_id, p_dimension_id, p_decision, p_rationale, p_rationale_code);
end $fn$;
revoke all on function public.t3a_record_progression_decision(uuid, public.t3a_dimension_code, public.t3a_progression_decision, text, text) from public, anon;
grant execute on function public.t3a_record_progression_decision(uuid, public.t3a_dimension_code, public.t3a_progression_decision, text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-18. A combined commit and progression act
-- ---------------------------------------------------------------------------------------------------------------------

do $do$ begin
  if to_regprocedure('public.t3a_commit_observation_base(jsonb)') is null then
    alter function public.t3a_commit_observation(jsonb) rename to t3a_commit_observation_base;
  end if;
end $do$;

create or replace function public.t3a_commit_observation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if p ?| array['progression_decision', 'progression_dimension_id', 'progression', 'decision', 'progression_decision_id'] then
    return public.t3a_capture_refuse('observation.commit', 'COMMIT_AND_PROGRESSION_COMBINED', coalesce(p ->> 'participant_id', ''), 'a commit and a progression decision are separate acts; the decision follows the commit');
  end if;
  return public.t3a_commit_observation_base(p);
end $fn$;
-- the base function's grants were whatever it had; the wrapper keeps the same rights as the original
do $do$ declare acl text; begin
  select coalesce(p.proacl::text, '') into acl from pg_proc p where p.oid = 'public.t3a_commit_observation_base(jsonb)'::regprocedure;
  if acl not like '%anon=X%' then revoke all on function public.t3a_commit_observation(jsonb) from public, anon; end if;
  if acl not like '%authenticated=X%' then revoke all on function public.t3a_commit_observation(jsonb) from authenticated; end if;
end $do$;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-18. The older progression table, behind the sequence switch
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr18_progression_row_gate() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not coalesce((select enforce_sequence from public.t3a_capture_config), false) then return new; end if;
  if new.corrected_decision_ref is not null then return new; end if;          -- a correction of a decision already on the record (CR-05)
  if (new.observation_record_id is not null and not exists (select 1 from public.t3a_observation_record o where o.observation_record_id = new.observation_record_id and o.is_committed is true))
     or (new.observation_record_id is null and not exists (select 1 from public.t3a_observation_record o where o.participant_id = new.participant_id and o.dimension_id = new.dimension_id and o.is_committed is true)) then
    perform public.t3a_capture_refuse('progression.record', 'PROGRESSION_BEFORE_COMMIT', new.participant_id::text || ' ' || new.dimension_id, 'a progression decision follows the commit of the observation');
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_cr18_progression_row_gate_trg on public.t3a_d1_progression_decision;
create trigger t3a_0_cr18_progression_row_gate_trg before insert on public.t3a_d1_progression_decision for each row execute function public.t3a_cr18_progression_row_gate();

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-19. The mentor's view of a session
-- ---------------------------------------------------------------------------------------------------------------------

-- The minimum observation context: what the session is, which situation is being run and under what conditions. Nothing of who the participant is. The participant
-- appears only as a label that means nothing outside this session.
create or replace function public.t3a_mentor_session_context(p_stage_instance uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); si public.t3a_stage_instance; e public.t3a_stage_entry_event; src record;
begin
  select * into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance;
  if si.stage_instance_id is null then return jsonb_build_object('outcome', 'refused', 'reason', 'SESSION_NOT_AVAILABLE'); end if;
  if not public.t3a_is_service_context() and not public.t3a_has_administrative_standing()
     and not exists (select 1 from public.t3a_mentor_assignment m where m.stage_instance_id = p_stage_instance and m.mentor_id = v_actor) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'SESSION_NOT_AVAILABLE');        -- the same answer whether it exists or not
  end if;
  select * into e from public.t3a_stage_entry_event x where x.stage_instance_id = p_stage_instance order by x.created_at desc limit 1;
  select o.identifier, v.version_no into src from public.t3a_d1_content_version v join public.t3a_content_object o on o.content_object_id = v.content_object_id where v.content_version_id = e.source_version_id;
  return jsonb_build_object('outcome', 'context',
    'stage_instance_id', si.stage_instance_id, 'stage_code', si.stage_code, 'dimension_id', si.dimension_id, 'attempt_no', si.attempt_no, 'state', si.state,
    'scheduled_at', si.scheduled_at, 'activated_at', si.activated_at,
    'source', jsonb_build_object('identifier', src.identifier, 'version_no', src.version_no),
    'session', jsonb_build_object('stage_entry_event_id', e.stage_entry_event_id, 'entered_at', e.entered_at, 'observation_mode', e.observation_mode, 'administration_conditions', e.administration_conditions_snapshot),
    'participant_label', 'P-' || upper(left(md5(si.stage_instance_id::text), 8)));
end $fn$;
revoke all on function public.t3a_mentor_session_context(uuid) from public, anon;
grant execute on function public.t3a_mentor_session_context(uuid) to authenticated, service_role;
