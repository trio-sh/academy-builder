-- CORR-007 Rev 1.6 rule CR-13 (CR-191): involvement, review, issue and reconsideration.
--   One canonical personnel identity across all accounts; every recorded act is resolved to that identity at the time of the check, so an account linked
--   after it acted is still found. A person who observed, captured or confirmed at Stage 1, recorded the progression decision or guided the participant may
--   not review, issue or reconsider. Review and issue stay with two different people; the combined route stays disabled (D.114).
--   Reconsideration is two named acts by two different eligible people, both reserved at scheduling: the decision and the independent check.
--   Reviewer, issuer, decider and checker are reserved by a deterministic policy; an ineligible reservation is released and replaced, with the replacement logged.
-- Nothing here activates a Stage or turns an enforcement switch on.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Canonical personnel identity
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_personnel_identity_link (
  link_seq           bigint generated always as identity primary key,
  canonical_person_id uuid not null,
  account_id         uuid not null,
  linked_at          timestamptz not null default now(),
  linked_by          uuid
);
create index if not exists t3a_personnel_identity_link_account_idx on public.t3a_personnel_identity_link (account_id, link_seq desc);
create index if not exists t3a_personnel_identity_link_person_idx on public.t3a_personnel_identity_link (canonical_person_id);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_personnel_identity_link;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_personnel_identity_link for each row execute function public.t3a_deny_mutation();
alter table public.t3a_personnel_identity_link enable row level security;
revoke all on public.t3a_personnel_identity_link from anon, authenticated;

-- Every account of the same person, read now: the account itself, the canonical identity, and each account whose latest link names that identity.
create or replace function public.t3a_cr13_accounts_of(p_account uuid) returns uuid[] language sql stable security definer set search_path = public as $fn$
  with latest as (select distinct on (l.account_id) l.account_id, l.canonical_person_id from public.t3a_personnel_identity_link l order by l.account_id, l.link_seq desc),
       me as (select coalesce((select canonical_person_id from latest where account_id = p_account), p_account) as person)
  select coalesce(array_agg(distinct x), array[p_account]) from (
    select p_account as x union all select person from me
    union all select account_id from latest where canonical_person_id = (select person from me)) s where x is not null
$fn$;
revoke all on function public.t3a_cr13_accounts_of(uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr13_accounts_of(uuid) to service_role;

create or replace function public.t3a_cr13_same_person(p_a uuid, p_b uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_a is not null and p_b is not null and (p_a = p_b or p_b = any (public.t3a_cr13_accounts_of(p_a)))
$fn$;
revoke all on function public.t3a_cr13_same_person(uuid, uuid) from public, anon, authenticated;

-- Linking is a governed act by a named person; it is service only here.
create or replace function public.t3a_cr13_link_identity(p_canonical uuid, p_account uuid, p_linked_by uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('identity.link', 'SERVICE_ONLY', coalesce(p_account::text, ''), 'identity links are made by a governed act'); end if;
  if p_canonical is null or p_account is null then return public.t3a_capture_refuse('identity.link', 'IDENTITY_LINK_INCOMPLETE', '', 'a canonical identity and an account are required'); end if;
  insert into public.t3a_personnel_identity_link (canonical_person_id, account_id, linked_by) values (p_canonical, p_account, p_linked_by);
  return jsonb_build_object('outcome', 'linked');
end $fn$;
revoke all on function public.t3a_cr13_link_identity(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr13_link_identity(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. The involvement test: every recorded act, resolved to the person at the time of the check
-- ---------------------------------------------------------------------------------------------------------------------

-- Returns the first involving act found, or null. All versions of a participant's records on the dimensions are in scope, because the scan is by participant and
-- dimension, not by the latest identifier. p_ignore_review_acts leaves out evidence review and earlier reconsiderations (used when reserving a reconsideration).
create or replace function public.t3a_cr13_involvement(p_actor uuid, p_participant uuid, p_dimensions text[], p_ignore_review_acts boolean default false) returns text
language plpgsql stable security definer set search_path = public as $fn$
declare a uuid[] := public.t3a_cr13_accounts_of(p_actor); r text;
begin
  select 'observed' into r from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and o.observer_id = any (a) limit 1;
  if r is not null then return r; end if;
  select 'confirmed' into r from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and o.confirmer_id = any (a) limit 1;
  if r is not null then return r; end if;
  select 'progressed' into r from public.t3a_d1_progression_decision d where d.participant_id = p_participant and d.dimension_id = any (p_dimensions) and d.recorded_by = any (a) limit 1;
  if r is not null then return r; end if;
  select 'involved_' || i.involving_action::text into r from public.t3a_d1_involvement i
    where i.participant_id = p_participant and i.dimension_id = any (p_dimensions) and i.actor_id = any (a)
      and not (p_ignore_review_acts and i.involving_action::text in ('reconsidered', 'evidence_review')) limit 1;
  if r is not null then return r; end if;
  if not p_ignore_review_acts then
    select 'reconsidered' into r from public.t3a_reconsideration_assignment ra join public.t3a_observation_record o on o.observation_record_id = ra.observation_record_id
      where o.participant_id = p_participant and o.dimension_id = any (p_dimensions) and ra.reconsiderer_id = any (a) limit 1;
    if r is not null then return r; end if;
    select 'evidence_reviewed' into r from public.t3a_evidence_review er join public.t3a_d1_ber_report b on b.ber_report_id = er.ber_report_id
      where b.participant_id = p_participant and b.represented_dimension_ids && p_dimensions and er.reviewer_id = any (a) limit 1;
    if r is not null then return r; end if;
  end if;
  return null;
end $fn$;
revoke all on function public.t3a_cr13_involvement(uuid, uuid, text[], boolean) from public, anon, authenticated;
grant execute on function public.t3a_cr13_involvement(uuid, uuid, text[], boolean) to service_role;

-- The report level test now reads through the canonical person.
create or replace function public.t3a_report_involved(p_actor uuid, p_participant uuid, p_dimensions text[]) returns text
language sql stable security definer set search_path = public as $fn$
  select public.t3a_cr13_involvement(p_actor, p_participant, p_dimensions, false)
$fn$;

create or replace function public.t3a_report_actor_gate(p_actor uuid, p_ber_report_id uuid, p_role text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; why text; dims text[]; a uuid[] := public.t3a_cr13_accounts_of(p_actor);
begin
  if p_role not in ('evidence_review', 'issue') then return public.t3a_capture_refuse('report.actor', 'role_unknown', p_actor::text, p_role); end if;
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.actor', 'BER_REPORT_NOT_FOUND', p_actor::text, p_ber_report_id::text); end if;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);
  if b.participant_id = any (a) then return public.t3a_capture_refuse('report.actor', 'participant_cannot_review_or_issue_own_report', p_actor::text, p_role); end if;
  why := public.t3a_report_involved(p_actor, b.participant_id, dims);
  -- the reviewer of a report never issues it (D.114: the combined route stays disabled); evidence review is itself an involving act, so only check it for the issue role
  if p_role = 'issue' and (exists (select 1 from public.t3a_evidence_review er where er.ber_report_id = p_ber_report_id and er.reviewer_id = any (a))
                           or exists (select 1 from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.reviewer_id = any (a))) then
    return public.t3a_capture_refuse('report.actor', 'reviewer_cannot_issue', p_actor::text, 'the reviewer of this report may not issue it');
  end if;
  if why is not null and not (p_role = 'issue' and why = 'evidence_reviewed') then
    return public.t3a_capture_refuse('report.actor', 'involved_in_report', p_actor::text, p_role || ': actor ' || why || ' a record in this report (all dimensions in it are counted)');
  end if;
  return jsonb_build_object('outcome', 'eligible');
end $fn$;

create or replace function public.t3a_reviewer_not_issuer() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if exists (select 1 from public.t3a_evidence_review r where r.ber_report_id = new.ber_report_id and r.reviewer_id = any (public.t3a_cr13_accounts_of(new.issued_by))) then
    raise exception 'REVIEWER_IS_ISSUER: the person who reviewed the evidence for this report cannot issue it' using errcode = '42501';
  end if;
  return new;
end $fn$;

create or replace function public.t3a_issuer_not_reviewer() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if exists (select 1 from public.t3a_d1_report_issuance i where i.ber_report_id = new.ber_report_id and i.issued_by = any (public.t3a_cr13_accounts_of(new.reviewer_id))) then
    raise exception 'REVIEWER_IS_ISSUER: the issuer of this report cannot also be its reviewer' using errcode = '42501';
  end if;
  return new;
end $fn$;

-- The record level test (reconsideration routing) reads through the canonical person first, then falls back to the older test.
do $do$ begin
  if to_regprocedure('public.t3a_involvement_test_base(uuid,uuid,public.t3a_authority)') is null then
    alter function public.t3a_involvement_test(uuid, uuid, public.t3a_authority) rename to t3a_involvement_test_base;
  end if;
end $do$;
create or replace function public.t3a_involvement_test(p_actor_id uuid, p_observation_record_id uuid, p_requested_authority public.t3a_authority) returns public.t3a_involvement_reason
language plpgsql stable security definer set search_path = public as $fn$
declare o public.t3a_observation_record%rowtype; why text;
begin
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_record_id;
  if o.observation_record_id is not null then
    why := public.t3a_cr13_involvement(p_actor_id, o.participant_id, array[o.dimension_id::text], true);
    if why is not null then
      return case why when 'confirmed' then 'PRIOR_CONFIRMER_OF_RECORD' when 'progressed' then 'PRIOR_PROGRESSION_RECORDER_FOR_PARTICIPANT_DIMENSION' else 'PRIOR_OBSERVER_OF_RECORD' end::public.t3a_involvement_reason;
    end if;
  end if;
  return public.t3a_involvement_test_base(p_actor_id, p_observation_record_id, p_requested_authority);
end $fn$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Reservations: a published deterministic policy, replacement logged
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_cr13_reservation (
  reservation_seq bigint generated always as identity primary key,
  subject_kind    text not null check (subject_kind in ('report', 'reconsideration')),
  subject_id      uuid not null,
  role            text not null check (role in ('evidence_review', 'issue', 'decision', 'independent_check')),
  actor_id        uuid not null,
  event           text not null check (event in ('reserved', 'released', 'replaced')),
  reason          text,
  recorded_at     timestamptz not null default now()
);
create index if not exists t3a_cr13_reservation_subject_idx on public.t3a_cr13_reservation (subject_kind, subject_id, role, reservation_seq desc);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_cr13_reservation;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_cr13_reservation for each row execute function public.t3a_deny_mutation();
alter table public.t3a_cr13_reservation enable row level security;
revoke all on public.t3a_cr13_reservation from anon, authenticated;

-- The person now holding a role on a subject: the latest event, if it reserved (or replaced in) someone.
create or replace function public.t3a_cr13_reserved(p_kind text, p_subject uuid, p_role text) returns uuid language sql stable security definer set search_path = public as $fn$
  select case when x.event in ('reserved', 'replaced') then x.actor_id end from (
    select actor_id, event from public.t3a_cr13_reservation where subject_kind = p_kind and subject_id = p_subject and role = p_role order by reservation_seq desc limit 1) x
$fn$;
revoke all on function public.t3a_cr13_reserved(text, uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_cr13_reserved(text, uuid, text) to service_role;

-- The participant and dimensions a subject concerns.
create or replace function public.t3a_cr13_subject(p_kind text, p_subject uuid, out participant uuid, out dims text[], out raised_by uuid) language plpgsql stable security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; ra public.t3a_reconsideration_assignment; c public.t3a_correction_case; o public.t3a_observation_record;
begin
  if p_kind = 'report' then
    select * into b from public.t3a_d1_ber_report where ber_report_id = p_subject;
    participant := b.participant_id; dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);
  else
    select * into ra from public.t3a_reconsideration_assignment where reconsideration_assignment_id = p_subject;
    select * into c from public.t3a_correction_case where correction_case_id = ra.correction_case_id;
    select * into o from public.t3a_observation_record where observation_record_id = ra.observation_record_id;
    participant := c.participant_id; raised_by := c.raised_by;
    dims := array[o.dimension_id::text];
  end if;
end $fn$;
revoke all on function public.t3a_cr13_subject(text, uuid) from public, anon, authenticated;

-- Why an actor may not hold a role on a subject now, or null when eligible.
create or replace function public.t3a_cr13_ineligible(p_kind text, p_subject uuid, p_role text, p_actor uuid) returns text
language plpgsql stable security definer set search_path = public as $fn$
declare s record; why text; g jsonb;
begin
  select * into s from public.t3a_cr13_subject(p_kind, p_subject);
  if s.participant is null then return 'SUBJECT_NOT_FOUND'; end if;
  if p_kind = 'report' then
    g := public.t3a_report_actor_gate(p_actor, p_subject, p_role);
    return case when g ->> 'outcome' = 'eligible' then null else coalesce(g ->> 'reason', 'not_eligible') end;
  end if;
  if public.t3a_cr13_same_person(p_actor, s.participant) or public.t3a_cr13_same_person(p_actor, s.raised_by) then return 'RECONSIDERER_IS_A_PARTY_TO_THE_CASE'; end if;
  why := public.t3a_cr13_involvement(p_actor, s.participant, s.dims, true);
  if why is not null then return 'RECONSIDERER_IS_INVOLVED:' || why; end if;
  return null;
end $fn$;
revoke all on function public.t3a_cr13_ineligible(text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr13_ineligible(text, uuid, text, uuid) to service_role;

-- The policy: among actors holding the authority now for the subject's dimensions and eligible, take the one holding the fewest current reservations, then the
-- lowest identifier; never a person already holding the paired role on the same subject.
create or replace function public.t3a_cr13_pick(p_kind text, p_subject uuid, p_role text, p_exclude uuid[]) returns uuid
language plpgsql stable security definer set search_path = public as $fn$
declare s record; auth text := case p_role when 'evidence_review' then 'evidence_review' when 'issue' then 'issue' else 'reconsider' end; m record; v_ex uuid[] := coalesce(p_exclude, '{}');
begin
  select * into s from public.t3a_cr13_subject(p_kind, p_subject);
  for m in select ra.actor_id from public.t3a_role_authorization ra
            where ra.authority::text = auth and ra.status::text = 'granted' and ra.effective_from <= now() and (ra.effective_to is null or ra.effective_to > now())
              and ra.suspended_at is null and ra.withdrawn_at is null and (ra.dimension_id is null or ra.dimension_id = any (s.dims))
            group by ra.actor_id
            order by (select count(*) from public.t3a_cr13_reservation r where r.actor_id = ra.actor_id and r.event in ('reserved', 'replaced')), ra.actor_id loop
    if exists (select 1 from unnest(v_ex) e where public.t3a_cr13_same_person(m.actor_id, e)) then continue; end if;
    if public.t3a_cr13_ineligible(p_kind, p_subject, p_role, m.actor_id) is null then return m.actor_id; end if;
  end loop;
  return null;
end $fn$;
revoke all on function public.t3a_cr13_pick(text, uuid, text, uuid[]) from public, anon, authenticated;

create or replace function public.t3a_cr13_reserve(p_kind text, p_subject uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare r1 text; r2 text; a1 uuid; a2 uuid;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('reservation.reserve', 'SERVICE_ONLY', coalesce(p_subject::text, ''), 'reservations are made by the scheduler'); end if;
  if p_kind not in ('report', 'reconsideration') then return public.t3a_capture_refuse('reservation.reserve', 'SUBJECT_KIND_UNKNOWN', coalesce(p_kind, ''), 'report or reconsideration'); end if;
  if (select participant from public.t3a_cr13_subject(p_kind, p_subject)) is null then return public.t3a_capture_refuse('reservation.reserve', 'SUBJECT_NOT_FOUND', p_subject::text, p_kind); end if;
  if public.t3a_cr13_reserved(p_kind, p_subject, case p_kind when 'report' then 'evidence_review' else 'decision' end) is not null then
    return public.t3a_capture_refuse('reservation.reserve', 'ALREADY_RESERVED', p_subject::text, 'this subject already has its reservations');
  end if;
  r1 := case p_kind when 'report' then 'evidence_review' else 'decision' end; r2 := case p_kind when 'report' then 'issue' else 'independent_check' end;
  a1 := public.t3a_cr13_pick(p_kind, p_subject, r1, '{}');
  a2 := case when a1 is null then null else public.t3a_cr13_pick(p_kind, p_subject, r2, array[a1]) end;
  -- Both or neither. Where either is unavailable the subject is held; it never falls back to an involved person.
  if a1 is null or a2 is null then
    return public.t3a_capture_refuse('reservation.reserve', 'NO_ELIGIBLE_ACTOR', p_kind || ' ' || p_subject::text,
      'held: no eligible person for ' || case when a1 is null then r1 else r2 end || '; the subject is never given to an involved person');
  end if;
  insert into public.t3a_cr13_reservation (subject_kind, subject_id, role, actor_id, event) values (p_kind, p_subject, r1, a1, 'reserved'), (p_kind, p_subject, r2, a2, 'reserved');
  return jsonb_build_object('outcome', 'reserved', r1, a1, r2, a2);
end $fn$;
revoke all on function public.t3a_cr13_reserve(text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr13_reserve(text, uuid) to service_role;

-- A reservation that became ineligible is released and replaced by the same policy; the replacement is logged. With no replacement the role is released and the subject is held.
create or replace function public.t3a_cr13_recheck(p_kind text, p_subject uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare roles text[] := case p_kind when 'report' then array['evidence_review', 'issue'] else array['decision', 'independent_check'] end; rl text; cur uuid; oth uuid; why text; nxt uuid; out jsonb := '[]'::jsonb;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('reservation.recheck', 'SERVICE_ONLY', coalesce(p_subject::text, ''), 'reservations are checked by the scheduler'); end if;
  foreach rl in array roles loop
    cur := public.t3a_cr13_reserved(p_kind, p_subject, rl);
    if cur is null then continue; end if;
    oth := public.t3a_cr13_reserved(p_kind, p_subject, case rl when roles[1] then roles[2] else roles[1] end);
    why := public.t3a_cr13_ineligible(p_kind, p_subject, rl, cur);
    if why is null then continue; end if;
    insert into public.t3a_cr13_reservation (subject_kind, subject_id, role, actor_id, event, reason) values (p_kind, p_subject, rl, cur, 'released', why);
    nxt := public.t3a_cr13_pick(p_kind, p_subject, rl, case when oth is null then '{}'::uuid[] else array[oth] end);
    if nxt is null then
      perform public.t3a_capture_refuse('reservation.recheck', 'NO_ELIGIBLE_ACTOR', p_kind || ' ' || p_subject::text, 'held: ' || rl || ' released (' || why || ') and no eligible replacement');
      out := out || jsonb_build_object('role', rl, 'released', cur, 'replacement', null, 'reason', why);
    else
      insert into public.t3a_cr13_reservation (subject_kind, subject_id, role, actor_id, event, reason) values (p_kind, p_subject, rl, nxt, 'replaced', 'replaces ' || cur::text || ': ' || why);
      out := out || jsonb_build_object('role', rl, 'released', cur, 'replacement', nxt, 'reason', why);
    end if;
  end loop;
  return jsonb_build_object('outcome', case when jsonb_array_length(out) = 0 then 'unchanged' else 'changed' end, 'changes', out);
end $fn$;
revoke all on function public.t3a_cr13_recheck(text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr13_recheck(text, uuid) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Reconsideration: two named acts by two different eligible people
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_cr13_reconsideration_act (
  act_seq       bigint generated always as identity primary key,
  reconsideration_assignment_id uuid not null,
  act           text not null check (act in ('decision', 'independent_check')),
  actor_id      uuid not null,
  verdict       text not null check (verdict in ('uphold', 'amend', 'withdraw', 'concur', 'return')),
  reasons       text not null check (length(btrim(reasons)) >= 8),
  recorded_at   timestamptz not null default now(),
  check ((act = 'decision' and verdict in ('uphold', 'amend', 'withdraw')) or (act = 'independent_check' and verdict in ('concur', 'return')))
);
create index if not exists t3a_cr13_reconsideration_act_idx on public.t3a_cr13_reconsideration_act (reconsideration_assignment_id, act_seq desc);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_cr13_reconsideration_act;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_cr13_reconsideration_act for each row execute function public.t3a_deny_mutation();
alter table public.t3a_cr13_reconsideration_act enable row level security;
revoke all on public.t3a_cr13_reconsideration_act from anon, authenticated;

-- final only when the latest decision is followed by a concurring independent check; a return reopens the decision; with a reservation missing the case is held.
create or replace function public.t3a_cr13_reconsideration_state(p_assignment uuid) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare d public.t3a_cr13_reconsideration_act; k public.t3a_cr13_reconsideration_act;
begin
  if public.t3a_cr13_reserved('reconsideration', p_assignment, 'decision') is null or public.t3a_cr13_reserved('reconsideration', p_assignment, 'independent_check') is null then
    return jsonb_build_object('state', 'held', 'final', false);
  end if;
  select * into d from public.t3a_cr13_reconsideration_act where reconsideration_assignment_id = p_assignment and act = 'decision' order by act_seq desc limit 1;
  if d.act_seq is null then return jsonb_build_object('state', 'awaiting_decision', 'final', false); end if;
  select * into k from public.t3a_cr13_reconsideration_act where reconsideration_assignment_id = p_assignment and act = 'independent_check' and act_seq > d.act_seq order by act_seq desc limit 1;
  if k.act_seq is null then return jsonb_build_object('state', 'awaiting_check', 'final', false, 'decision', d.verdict); end if;
  if k.verdict = 'return' then return jsonb_build_object('state', 'returned', 'final', false); end if;
  return jsonb_build_object('state', 'final', 'final', true, 'decision', d.verdict);
end $fn$;
revoke all on function public.t3a_cr13_reconsideration_state(uuid) from public, anon;
grant execute on function public.t3a_cr13_reconsideration_state(uuid) to authenticated, service_role;

create or replace function public.t3a_cr13_record_decision(p_assignment uuid, p_decision text, p_reasons text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); why text;
begin
  if v_actor is null then return public.t3a_capture_refuse('reconsideration.decision', 'NO_ACTOR_IDENTIFIED', '', 'no signed-in actor'); end if;
  if p_decision not in ('uphold', 'amend', 'withdraw') then return public.t3a_capture_refuse('reconsideration.decision', 'OUTCOME_NOT_IN_CONTROLLED_SET', v_actor::text, coalesce(p_decision, 'none')); end if;
  if length(btrim(coalesce(p_reasons, ''))) < 8 then return public.t3a_capture_refuse('reconsideration.decision', 'REASONING_REQUIRED', v_actor::text, 'written reasons are required'); end if;
  if not public.t3a_cr13_same_person(public.t3a_cr13_reserved('reconsideration', p_assignment, 'decision'), v_actor) then
    return public.t3a_capture_refuse('reconsideration.decision', 'NOT_THE_RESERVED_DECIDER', v_actor::text, 'the decision belongs to the person reserved at scheduling');
  end if;
  why := public.t3a_cr13_ineligible('reconsideration', p_assignment, 'decision', v_actor);
  if why is not null then return public.t3a_capture_refuse('reconsideration.decision', 'DECIDER_NOT_ELIGIBLE', v_actor::text, why); end if;
  if (public.t3a_cr13_reconsideration_state(p_assignment) ->> 'state') in ('awaiting_check', 'final') then
    return public.t3a_capture_refuse('reconsideration.decision', 'DECISION_ALREADY_RECORDED', v_actor::text, 'a decision is recorded; the independent check is next');
  end if;
  insert into public.t3a_cr13_reconsideration_act (reconsideration_assignment_id, act, actor_id, verdict, reasons) values (p_assignment, 'decision', v_actor, p_decision, btrim(p_reasons));
  return jsonb_build_object('outcome', 'decided', 'final', false, 'next', 'independent_check');
end $fn$;
revoke all on function public.t3a_cr13_record_decision(uuid, text, text) from public, anon;
grant execute on function public.t3a_cr13_record_decision(uuid, text, text) to authenticated;

create or replace function public.t3a_cr13_record_check(p_assignment uuid, p_verdict text, p_reasons text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); why text; d public.t3a_cr13_reconsideration_act; st jsonb;
begin
  if v_actor is null then return public.t3a_capture_refuse('reconsideration.check', 'NO_ACTOR_IDENTIFIED', '', 'no signed-in actor'); end if;
  if p_verdict not in ('concur', 'return') then return public.t3a_capture_refuse('reconsideration.check', 'OUTCOME_NOT_IN_CONTROLLED_SET', v_actor::text, coalesce(p_verdict, 'none')); end if;
  if length(btrim(coalesce(p_reasons, ''))) < 8 then return public.t3a_capture_refuse('reconsideration.check', 'REASONING_REQUIRED', v_actor::text, 'written reasons are required'); end if;
  if not public.t3a_cr13_same_person(public.t3a_cr13_reserved('reconsideration', p_assignment, 'independent_check'), v_actor) then
    return public.t3a_capture_refuse('reconsideration.check', 'NOT_THE_RESERVED_CHECKER', v_actor::text, 'the check belongs to the person reserved at scheduling');
  end if;
  select * into d from public.t3a_cr13_reconsideration_act where reconsideration_assignment_id = p_assignment and act = 'decision' order by act_seq desc limit 1;
  if d.act_seq is null then return public.t3a_capture_refuse('reconsideration.check', 'NO_DECISION_TO_CHECK', v_actor::text, 'the check follows a decision'); end if;
  if public.t3a_cr13_same_person(d.actor_id, v_actor) then return public.t3a_capture_refuse('reconsideration.check', 'CHECKER_IS_THE_DECIDER', v_actor::text, 'the independent check is by a different person'); end if;
  why := public.t3a_cr13_ineligible('reconsideration', p_assignment, 'independent_check', v_actor);
  if why is not null then return public.t3a_capture_refuse('reconsideration.check', 'CHECKER_NOT_ELIGIBLE', v_actor::text, why); end if;
  st := public.t3a_cr13_reconsideration_state(p_assignment);
  if (st ->> 'state') <> 'awaiting_check' then return public.t3a_capture_refuse('reconsideration.check', 'NOTHING_AWAITING_CHECK', v_actor::text, 'state is ' || (st ->> 'state')); end if;
  insert into public.t3a_cr13_reconsideration_act (reconsideration_assignment_id, act, actor_id, verdict, reasons) values (p_assignment, 'independent_check', v_actor, p_verdict, btrim(p_reasons));
  return jsonb_build_object('outcome', case when p_verdict = 'concur' then 'final' else 'returned' end, 'final', p_verdict = 'concur');
end $fn$;
revoke all on function public.t3a_cr13_record_check(uuid, text, text) from public, anon;
grant execute on function public.t3a_cr13_record_check(uuid, text, text) to authenticated;
