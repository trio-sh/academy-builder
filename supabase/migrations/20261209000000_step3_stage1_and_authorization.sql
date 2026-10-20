-- Step 3f: Stage 1 entry gate, per dimension authorization, involvement across a whole report, and the Stage 1 evidence note (D2 INS-011 009 to 018, INS-012 056 to 065).
--
-- t3a_stage_2_entry_gate     four conditions, distinct sub-reasons; a wrong-actor confirmation is a control failure and is reported as one
-- t3a_stage_2_entry_attempt  the logged route (the refusal persists)
-- t3a_observer_gate          a D1 authorization never authorizes D2: refuses and logs unauthorized_dimension
-- t3a_report_actor_gate      the involvement test across ALL records of a report, across dimensions; the reviewer of a report never issues it
-- t3a_s1_evidence_note       the Stage 1 administration note renders only on a valid confirmation for the exact source version and instance, by an
--                            actor authorized for the dimension at the time, and only when the controlled text is loaded

alter table public.t3a_d1_s1_confirmation add column if not exists source_version_id uuid;
alter table public.t3a_d1_s1_confirmation add column if not exists source_version_hash text;

-- A confirmation records the exact source version (and its hash) the Stage entry served, so a later alteration of the source is detectable.
create or replace function public.t3a_s1_confirmation_pin() returns trigger language plpgsql security definer set search_path = public as $fn$
declare sv uuid; h text;
begin
  if new.source_version_id is null then
    select e.source_version_id into sv from public.t3a_stage_entry_event e where e.stage_instance_id = new.stage_instance_id and e.source_version_id is not null order by e.entered_at desc limit 1;
    new.source_version_id := sv;
  end if;
  if new.source_version_hash is null and new.source_version_id is not null then
    select cv.body_hash into h from public.t3a_d1_content_version cv where cv.content_version_id = new.source_version_id;
    new.source_version_hash := h;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_s1_confirmation_pin_trg on public.t3a_d1_s1_confirmation;
create trigger t3a_0_s1_confirmation_pin_trg before insert on public.t3a_d1_s1_confirmation for each row execute function public.t3a_s1_confirmation_pin();

-- The latest progression decision for a participant in one dimension, from the live writer (mentor judgment) or the older table, whichever is later.
create or replace function public.t3a_latest_progression(p_participant uuid, p_dimension text) returns text language sql stable security definer set search_path = public as $fn$
  select decision from (
    select j.progression_decision::text as decision, j.created_at as at
      from public.t3a_mentor_judgment j join public.t3a_stage_instance si on si.stage_instance_id = j.stage_instance_id
     where si.participant_id = p_participant and j.progression_dimension_id::text = p_dimension and j.progression_decision is not null
    union all
    select d.decision::text, d.created_at from public.t3a_d1_progression_decision d where d.participant_id = p_participant and d.dimension_id = p_dimension and d.cleared_at is null
  ) x order by at desc limit 1
$fn$;

create or replace function public.t3a_stage_2_entry_gate(p_participant uuid, p_dimension text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare s1 record; conf record; assigned uuid; prog text;
begin
  select stage_instance_id, state, completed_at into s1 from public.t3a_stage_instance
   where participant_id = p_participant and dimension_id::text = p_dimension and stage_code::text = 'S1' order by attempt_no desc nulls last, created_at desc limit 1;
  if s1.stage_instance_id is null or s1.completed_at is null then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_instance_not_closed');
  end if;
  select * into conf from public.t3a_d1_s1_confirmation where stage_instance_id = s1.stage_instance_id order by captured_at desc limit 1;
  select assigned_mentor_id into assigned from public.t3a_d1_s1_routing where stage_instance_id = s1.stage_instance_id order by routed_at desc limit 1;
  if conf.s1_confirmation_id is null then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_confirmation_record_absent_or_wrong_actor', 'detail', 'absent');
  end if;
  if assigned is null or conf.confirmed_by is distinct from assigned then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_confirmation_record_absent_or_wrong_actor', 'detail', 'wrong_actor');
  end if;
  if not exists (select 1 from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id::text = p_dimension and o.stage_code::text = 'S1' and o.is_committed is true) then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_observation_not_committed');
  end if;
  prog := public.t3a_latest_progression(p_participant, p_dimension);
  if prog is distinct from 'proceed' then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_progression_absent_or_blocks', 'detail', coalesce(prog, 'absent'));
  end if;
  return jsonb_build_object('eligible', true);
end $fn$;

create or replace function public.t3a_stage_2_entry_attempt(p_participant uuid, p_dimension text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare g jsonb;
begin
  g := public.t3a_stage_2_entry_gate(p_participant, p_dimension);
  if (g ->> 'eligible')::boolean then return g; end if;
  perform public.t3a_capture_refuse('stage_entry.s2', g ->> 'refusal_code', p_participant::text || ' ' || p_dimension, (g ->> 'sub_reason') || coalesce(': ' || (g ->> 'detail'), ''));
  return g;
end $fn$;
revoke all on function public.t3a_stage_2_entry_attempt(uuid, text) from public, anon;
grant execute on function public.t3a_stage_2_entry_attempt(uuid, text) to authenticated, service_role;

-- Authorization is per dimension and per Stage; calibration clearance must name the construct version set (INS-011 009).
create or replace function public.t3a_observer_gate(p_mentor uuid, p_dimension text, p_participant uuid default null) returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  if not exists (select 1 from public.t3a_mentor_authorization a where a.mentor_id = p_mentor and a.dimension_id::text = p_dimension and a.authorized_from <= now()
                  and (a.authorized_until is null or a.authorized_until > now()) and coalesce(a.authorization_status, 'authorized') in ('authorized', 'supervised')) then
    return public.t3a_capture_refuse('observer.gate', 'unauthorized_dimension', p_mentor::text || ' ' || p_dimension,
      case when exists (select 1 from public.t3a_mentor_authorization a where a.mentor_id = p_mentor) then 'the mentor is authorized for another dimension only; authorization never carries across' else 'the mentor holds no authorization' end);
  end if;
  if not exists (select 1 from public.t3a_mentor_authorization a where a.mentor_id = p_mentor and a.dimension_id::text = p_dimension and a.reference_set_version is not null
                  and a.authorized_from <= now() and (a.authorized_until is null or a.authorized_until > now())) then
    return public.t3a_capture_refuse('observer.gate', 'calibration_clearance_unnamed', p_mentor::text || ' ' || p_dimension, 'authorization must rest on a calibration clearance that names the version set');
  end if;
  if p_participant is not null and exists (select 1 from public.t3a_conflict_declaration c where c.mentor_id = p_mentor and c.participant_id = p_participant and c.cleared_at is null) then
    return public.t3a_capture_refuse('observer.gate', 'declared_conflict', p_mentor::text, 'an open conflict declaration against this participant');
  end if;
  return jsonb_build_object('outcome', 'authorized');
end $fn$;
revoke all on function public.t3a_observer_gate(uuid, text, uuid) from public, anon;
grant execute on function public.t3a_observer_gate(uuid, text, uuid) to authenticated, service_role;

-- Involvement across the whole report (INS-011 010, 011): the observation record is the unit, and the test runs over ALL records of the report.
create or replace function public.t3a_report_involved(p_actor uuid, p_participant uuid, p_dimensions text[]) returns text language sql stable security definer set search_path = public as $fn$
  select coalesce(
    (select 'observed' from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and o.observer_id = p_actor limit 1),
    (select 'confirmed' from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and o.confirmer_id = p_actor limit 1),
    (select 'progressed' from public.t3a_d1_progression_decision d where d.participant_id = p_participant and d.dimension_id = any (p_dimensions) and d.recorded_by = p_actor limit 1),
    (select 'reconsidered' from public.t3a_reconsideration_assignment ra join public.t3a_observation_record o on o.observation_record_id = ra.observation_record_id
       where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and ra.reconsiderer_id = p_actor limit 1),
    (select 'evidence_reviewed' from public.t3a_evidence_review er join public.t3a_d1_ber_report b on b.ber_report_id = er.ber_report_id
       where b.participant_id = p_participant and b.represented_dimension_ids && p_dimensions and er.reviewer_id = p_actor limit 1))
$fn$;

create or replace function public.t3a_report_actor_gate(p_actor uuid, p_ber_report_id uuid, p_role text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; why text; dims text[];
begin
  if p_role not in ('evidence_review', 'issue') then return public.t3a_capture_refuse('report.actor', 'role_unknown', p_actor::text, p_role); end if;
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.actor', 'BER_REPORT_NOT_FOUND', p_actor::text, p_ber_report_id::text); end if;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);
  if b.participant_id = p_actor then return public.t3a_capture_refuse('report.actor', 'participant_cannot_review_or_issue_own_report', p_actor::text, p_role); end if;
  why := public.t3a_report_involved(p_actor, b.participant_id, dims);
  -- the reviewer of a report never issues it; evidence review is itself an involving act, so only check it for the issue role
  if p_role = 'issue' and exists (select 1 from public.t3a_evidence_review er where er.ber_report_id = p_ber_report_id and er.reviewer_id = p_actor) then
    return public.t3a_capture_refuse('report.actor', 'reviewer_cannot_issue', p_actor::text, 'the reviewer of this report may not issue it');
  end if;
  if why is not null and not (p_role = 'issue' and why = 'evidence_reviewed') then
    return public.t3a_capture_refuse('report.actor', 'involved_in_report', p_actor::text, p_role || ': actor ' || why || ' a record in this report (all dimensions in it are counted)');
  end if;
  return jsonb_build_object('outcome', 'eligible');
end $fn$;
revoke all on function public.t3a_report_actor_gate(uuid, uuid, text) from public, anon;
grant execute on function public.t3a_report_actor_gate(uuid, uuid, text) to authenticated, service_role;

-- The Stage 1 administration note (INS-012 059, 061, 062). No generic note is rendered when anything is absent.
create or replace function public.t3a_s1_evidence_note(p_stage_instance uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare conf record; si record; cur text; txt text;
begin
  select * into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance;
  if si.stage_instance_id is null or si.stage_code::text <> 'S1' then return public.t3a_capture_refuse('s1.note', 'not_a_stage_1_instance', p_stage_instance::text, 'no such Stage 1 instance'); end if;
  select * into conf from public.t3a_d1_s1_confirmation where stage_instance_id = p_stage_instance order by captured_at desc limit 1;
  if conf.s1_confirmation_id is null then return public.t3a_capture_refuse('s1.note', 's1_confirmation_absent', p_stage_instance::text, 'no confirmation record: neither the statement nor a note renders'); end if;
  if conf.source_version_id is null then return public.t3a_capture_refuse('s1.note', 's1_confirmation_source_unpinned', p_stage_instance::text, 'the confirmation does not name the exact source version'); end if;
  select body_hash into cur from public.t3a_d1_content_version where content_version_id = conf.source_version_id;
  if cur is distinct from conf.source_version_hash then return public.t3a_capture_refuse('s1.note', 'source_altered_after_confirmation', p_stage_instance::text, 'the source version no longer matches the one confirmed'); end if;
  if not exists (select 1 from public.t3a_mentor_authorization a where a.mentor_id = conf.confirmed_by and a.dimension_id::text = conf.dimension_id and a.authorized_from <= conf.captured_at
                  and (a.authorized_until is null or a.authorized_until > conf.captured_at)) then
    return public.t3a_capture_refuse('s1.note', 'confirmer_not_authorized_at_the_time', conf.confirmed_by::text, 'the confirming actor was not authorized for ' || conf.dimension_id || ' when confirming');
  end if;
  select body into txt from public.t3a_d1_report_controlled_text where text_ref = 'T-EVNOTE-001';
  if txt is null then return public.t3a_capture_refuse('s1.note', 'controlled_text_not_loaded', 'T-EVNOTE-001', 'a mandatory controlled text is not loaded; the render refuses rather than omitting the block'); end if;
  return jsonb_build_object('outcome', 'rendered', 'text_ref', 'T-EVNOTE-001', 'text', txt, 'source_version_id', conf.source_version_id);
end $fn$;
revoke all on function public.t3a_s1_evidence_note(uuid) from public, anon;
grant execute on function public.t3a_s1_evidence_note(uuid) to authenticated, service_role;
