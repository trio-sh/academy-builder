-- CORR-007 Rev 1.6 rule CR-07 (CR-195): disputed clauses that cannot be established.
--   Where disputed conduct cannot be established from the governed record it is not settled by deference to the original observer: the disputed clause is restricted or
--   withdrawn under the governed route and the rest of the observation stands. No recording is introduced. The reconsiderer (not involved) reviews the served source
--   instance, the delivery events and timestamps, the capture history with every correction event, the participant's correction material and any independent evidence
--   including a second observer's record. Where the dispute goes to whether the session was validly administered at all, the observation is withdrawn, the attempt is
--   reclassified as an administration failure that counts nothing, and the participant is offered administration again on a new source.
-- The route is bound to the two-act reconsideration of CR-13: nothing is restricted or withdrawn unless that reconsideration is final.
-- Nothing here activates a Stage or turns an enforcement switch on.

-- ---------------------------------------------------------------------------------------------------------------------
-- Clause restrictions (append-only); the standing composition reads through them
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_clause_restriction (
  restriction_seq               bigint generated always as identity primary key,
  composed_statement_id         uuid not null references public.t3a_dimension_composed_statement(composed_statement_id),
  conduct_element_id            text not null,
  kind                          text not null check (kind in ('restricted', 'withdrawn')),
  reconsideration_assignment_id uuid not null,
  recorded_at                   timestamptz not null default now(),
  unique (composed_statement_id, conduct_element_id)
);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_clause_restriction;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_clause_restriction for each row execute function public.t3a_deny_mutation();
alter table public.t3a_clause_restriction enable row level security;
revoke all on public.t3a_clause_restriction from anon, authenticated;

-- The composition as it stands: the clause instances without the restricted or withdrawn clauses. The rest of the observation stands, and no new row is added to it.
create or replace function public.t3a_current_composed(p_participant uuid, p_dimension text)
returns table(composed_statement_id uuid, observation_ref uuid, stage_code text, source_version_id uuid, observer_id uuid, clause_instances jsonb, conditions jsonb, composed_at timestamptz)
language sql stable security definer set search_path = public as $fn$
  select cs.composed_statement_id, cs.observation_ref, cs.stage_code, cs.source_version_id, o.observer_id,
         coalesce((select jsonb_agg(ci order by ord) from jsonb_array_elements(cs.clause_instances) with ordinality t(ci, ord)
                    where not exists (select 1 from public.t3a_clause_restriction r where r.composed_statement_id = cs.composed_statement_id and r.conduct_element_id = ci ->> 'conduct_element_id')), '[]'::jsonb),
         cs.conditions, cs.composed_at
    from public.t3a_dimension_composed_statement cs join public.t3a_observation_record o on o.observation_record_id = cs.observation_ref
   where cs.participant_id = p_participant and cs.dimension_id = p_dimension and o.dimension_id = p_dimension and o.is_committed is true and not cs.test_mode
     and not exists (select 1 from public.t3a_dimension_composed_statement n where n.supersedes_composed_statement_id = cs.composed_statement_id)
     and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id)
$fn$;

-- The observation withdrawn for an administration dispute (append-only).
create table if not exists public.t3a_observation_withdrawal (
  observation_record_id         uuid primary key references public.t3a_observation_record(observation_record_id),
  reason_code                   text not null check (reason_code in ('administration_dispute_upheld')),
  reconsideration_assignment_id uuid not null,
  withdrawn_at                  timestamptz not null default now()
);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_observation_withdrawal;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_observation_withdrawal for each row execute function public.t3a_deny_mutation();
alter table public.t3a_observation_withdrawal enable row level security;
revoke all on public.t3a_observation_withdrawal from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- What the reconsiderer reviews
-- ---------------------------------------------------------------------------------------------------------------------

-- The same person who holds the decision or the independent check (resolved to the person) reads it; so does the service. The observer, and anyone involved, does not.
create or replace function public.t3a_cr07_review_bundle(p_assignment uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); ra public.t3a_reconsideration_assignment; o public.t3a_observation_record; c public.t3a_correction_case; e public.t3a_stage_entry_event; v_src uuid;
begin
  if not public.t3a_is_service_context() and not (v_actor is not null
       and (public.t3a_cr13_same_person(public.t3a_cr13_reserved('reconsideration', p_assignment, 'decision'), v_actor)
         or public.t3a_cr13_same_person(public.t3a_cr13_reserved('reconsideration', p_assignment, 'independent_check'), v_actor))) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'NOT_A_RESERVED_RECONSIDERER');
  end if;
  select * into ra from public.t3a_reconsideration_assignment where reconsideration_assignment_id = p_assignment;
  if ra.reconsideration_assignment_id is null then return jsonb_build_object('outcome', 'refused', 'reason', 'ASSIGNMENT_NOT_FOUND'); end if;
  select * into o from public.t3a_observation_record where observation_record_id = ra.observation_record_id;
  select * into c from public.t3a_correction_case where correction_case_id = ra.correction_case_id;
  select cs.source_version_id into v_src from public.t3a_dimension_composed_statement cs where cs.observation_ref = o.observation_record_id order by cs.composed_at limit 1;
  select * into e from public.t3a_stage_entry_event x where x.participant_id = o.participant_id and x.dimension_id = o.dimension_id and x.stage_code::text = o.stage_code
     and (v_src is null or x.source_version_id = v_src) order by x.created_at desc limit 1;
  return jsonb_build_object('outcome', 'bundle',
    'served_source', jsonb_build_object('source_version_id', coalesce(v_src, e.source_version_id), 'stage_entry_event_id', e.stage_entry_event_id, 'stage_instance_id', e.stage_instance_id, 'entered_at', e.entered_at),
    'delivery_events', coalesce((select jsonb_agg(jsonb_build_object('event_seq', s.event_seq, 'event_kind', s.event_kind, 'beat_code', s.beat_code, 'recorded_at', s.recorded_at) order by s.event_seq)
                                   from public.t3a_d1_s2_session_event s where s.stage_instance_id = e.stage_instance_id), '[]'::jsonb),
    'capture_history', coalesce((select jsonb_agg(jsonb_build_object('composed_statement_id', cs.composed_statement_id, 'supersedes', cs.supersedes_composed_statement_id, 'composed_at', cs.composed_at, 'answers', cs.answers, 'clauses', cs.clauses,
                                   'withdrawn', exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id),
                                   'restricted_clauses', coalesce((select jsonb_agg(r.conduct_element_id) from public.t3a_clause_restriction r where r.composed_statement_id = cs.composed_statement_id), '[]'::jsonb)) order by cs.composed_at)
                                   from public.t3a_dimension_composed_statement cs where cs.observation_ref = o.observation_record_id), '[]'::jsonb),
    'correction_events', coalesce((select jsonb_agg(jsonb_build_object('raised_at', x.raised_at, 'status', x.status) order by x.raised_at) from public.t3a_correction_case x where x.participant_id = o.participant_id and x.correction_case_id = c.correction_case_id), '[]'::jsonb),
    'participant_correction_material', jsonb_build_object('ground', c.ground, 'narrative', c.narrative),
    'independent_evidence', jsonb_build_object('second_observer_captures',
        coalesce((select jsonb_agg(jsonb_build_object('observer_id', oc.observer_id, 'payload', oc.payload, 'locked_at', oc.locked_at) order by oc.locked_at)
                    from public.t3a_observer_capture oc where oc.stage_instance_id = e.stage_instance_id and oc.locked_at is not null and public.t3a_cr15_both_locked(e.stage_instance_id)), '[]'::jsonb)));
end $fn$;
revoke all on function public.t3a_cr07_review_bundle(uuid) from public, anon;
grant execute on function public.t3a_cr07_review_bundle(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- The outcomes. Both need a final reconsideration (CR-13) whose decision amends or withdraws.
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr07_final_decision(p_assignment uuid) returns text language sql stable security definer set search_path = public as $fn$
  select case when (public.t3a_cr13_reconsideration_state(p_assignment) ->> 'final')::boolean then public.t3a_cr13_reconsideration_state(p_assignment) ->> 'decision' end
$fn$;
revoke all on function public.t3a_cr07_final_decision(uuid) from public, anon, authenticated;

create or replace function public.t3a_cr07_restrict_clause(p_assignment uuid, p_composed_statement uuid, p_conduct_element text, p_kind text default 'restricted') returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare ra public.t3a_reconsideration_assignment; cs public.t3a_dimension_composed_statement; v_dec text;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('dispute.clause', 'SERVICE_ONLY', coalesce(p_assignment::text, ''), 'a clause is restricted by the governed route'); end if;
  if p_kind not in ('restricted', 'withdrawn') then return public.t3a_capture_refuse('dispute.clause', 'KIND_NOT_IN_CONTROLLED_SET', coalesce(p_assignment::text, ''), coalesce(p_kind, 'none')); end if;
  v_dec := public.t3a_cr07_final_decision(p_assignment);
  if v_dec is null then return public.t3a_capture_refuse('dispute.clause', 'RECONSIDERATION_NOT_FINAL', coalesce(p_assignment::text, ''), 'a clause changes only after the decision and the independent check'); end if;
  if v_dec = 'uphold' then return public.t3a_capture_refuse('dispute.clause', 'RECONSIDERATION_UPHELD_THE_RECORD', p_assignment::text, 'the reconsideration upheld the clause as recorded'); end if;
  select * into ra from public.t3a_reconsideration_assignment where reconsideration_assignment_id = p_assignment;
  select * into cs from public.t3a_dimension_composed_statement where composed_statement_id = p_composed_statement;
  if cs.composed_statement_id is null or cs.observation_ref is distinct from ra.observation_record_id then
    return public.t3a_capture_refuse('dispute.clause', 'CLAUSE_NOT_PART_OF_THIS_OBSERVATION', coalesce(p_assignment::text, ''), 'the clause belongs to another observation');
  end if;
  if not exists (select 1 from jsonb_array_elements(cs.clause_instances) ci where ci ->> 'conduct_element_id' = p_conduct_element) then
    return public.t3a_capture_refuse('dispute.clause', 'CLAUSE_NOT_IN_STATEMENT', p_assignment::text, coalesce(p_conduct_element, 'none'));
  end if;
  begin
    insert into public.t3a_clause_restriction (composed_statement_id, conduct_element_id, kind, reconsideration_assignment_id) values (p_composed_statement, p_conduct_element, p_kind, p_assignment);
  exception when unique_violation then
    return public.t3a_capture_refuse('dispute.clause', 'CLAUSE_ALREADY_RESTRICTED', p_assignment::text, p_conduct_element);
  end;
  return jsonb_build_object('outcome', p_kind, 'rest_of_observation_stands', true, 'recording_introduced', false);
end $fn$;
revoke all on function public.t3a_cr07_restrict_clause(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.t3a_cr07_restrict_clause(uuid, uuid, text, text) to service_role;

-- The dispute goes to whether the session was validly administered at all, and it is upheld: the observation is withdrawn (its composed statements withdrawn with it),
-- the attempt is reclassified as an administration failure, and the participant is offered administration again on a source not met before.
create or replace function public.t3a_cr07_withdraw_observation(p_assignment uuid, p_seed bigint default 1) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare ra public.t3a_reconsideration_assignment; o public.t3a_observation_record; v_dec text; v_att uuid; v_re jsonb; v_offer jsonb; s record;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('dispute.administration', 'SERVICE_ONLY', coalesce(p_assignment::text, ''), 'an observation is withdrawn by the governed route'); end if;
  v_dec := public.t3a_cr07_final_decision(p_assignment);
  if v_dec is null then return public.t3a_capture_refuse('dispute.administration', 'RECONSIDERATION_NOT_FINAL', coalesce(p_assignment::text, ''), 'withdrawal follows the decision and the independent check'); end if;
  if v_dec <> 'withdraw' then return public.t3a_capture_refuse('dispute.administration', 'RECONSIDERATION_DID_NOT_WITHDRAW', p_assignment::text, 'the final decision was ' || v_dec); end if;
  select * into ra from public.t3a_reconsideration_assignment where reconsideration_assignment_id = p_assignment;
  select * into o from public.t3a_observation_record where observation_record_id = ra.observation_record_id;
  if exists (select 1 from public.t3a_observation_withdrawal where observation_record_id = o.observation_record_id) then
    return public.t3a_capture_refuse('dispute.administration', 'OBSERVATION_ALREADY_WITHDRAWN', p_assignment::text, o.observation_record_id::text);
  end if;
  insert into public.t3a_observation_withdrawal (observation_record_id, reason_code, reconsideration_assignment_id) values (o.observation_record_id, 'administration_dispute_upheld', p_assignment);
  for s in select composed_statement_id from public.t3a_dimension_composed_statement cs where cs.observation_ref = o.observation_record_id
            and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id) loop
    insert into public.t3a_dimension_statement_withdrawal (composed_statement_id, reason) values (s.composed_statement_id, 'administration dispute upheld on reconsideration ' || p_assignment::text);
  end loop;
  -- the completed attempt that this observation ended: reclassified, counting nothing
  select a.attempt_id into v_att from public.t3a_attempt_live a
   where a.participant_id = o.participant_id and a.dimension_id = o.dimension_id and a.stage_code::text = o.stage_code and a.outcome = 'completed' and a.counted
   order by a.commit_at desc nulls last, a.created_at desc limit 1;
  if v_att is not null then v_re := public.t3a_attempt_reclassify(v_att, 'administration_failure'); end if;
  v_offer := public.t3a_source_select(o.participant_id, o.dimension_id, o.stage_code, p_seed);
  return jsonb_build_object('outcome', 'withdrawn', 'attempt_reclassified', v_re, 'new_source_offer', v_offer);
end $fn$;
revoke all on function public.t3a_cr07_withdraw_observation(uuid, bigint) from public, anon, authenticated;
grant execute on function public.t3a_cr07_withdraw_observation(uuid, bigint) to service_role;
