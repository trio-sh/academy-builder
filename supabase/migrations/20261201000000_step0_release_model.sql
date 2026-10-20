-- Step 0: release model (D2/D3 D-04, CR-008, CR-053, CR-056).
--
-- 1. The named recipient release route is closed. Issuing, creating and redeeming refuse and log; nothing is deleted and no
--    existing record is converted. A redemption of an older token returns PLATFORM_RELEASE_MIGRATION_REQUIRES_GOVERNED_RECORD.
--    Revocation stays open on every route: a participant can always take a release back.
-- 2. Pool visibility is the release route. The participant makes one issued report available to approved employers, and
--    withdraws it. One pool entry per report, so it holds for every dimension. The entry carries no dimension, Stage or
--    conduct field (the table never had one).
-- 3. The pool entry follows its report: an amended report is flagged for correction, a withdrawn report leaves the pool.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Close the named recipient route
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_d1_issue_release_token(p_ber_report_id uuid, p_recipient_name text, p_recipient_org text, p_recipient_address text, p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  perform public.t3a_capture_refuse('release.named_recipient', 'NAMED_RECIPIENT_RELEASE_RETIRED', coalesce(p_ber_report_id::text, ''), 'the named recipient release route is closed; reports are released to the approved employer pool');
  return jsonb_build_object('issued', false, 'refusal_code', 'NAMED_RECIPIENT_RELEASE_RETIRED');
end $fn$;

create or replace function public.t3a_d1_redeem_release_token(p_token text, p_verified_address text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  perform public.t3a_capture_refuse('release.named_recipient_redeem', 'PLATFORM_RELEASE_MIGRATION_REQUIRES_GOVERNED_RECORD', '', 'a named recipient token is not honoured; an older release must be re-made through the pool under a governed record');
  return jsonb_build_object('content', false, 'state', 'PLATFORM_RELEASE_MIGRATION_REQUIRES_GOVERNED_RECORD');
end $fn$;

create or replace function public.t3a_create_disclosure(p_ber_report_id uuid, p_recipient_org_id uuid, p_recipient_email text, p_access_scope text, p_access_period_starts timestamptz, p_access_period_ends timestamptz,
  p_release_identity_now boolean default false, p_release_report_now boolean default false, p_recipient_binding_token text default null)
returns uuid language plpgsql security definer set search_path = public as $fn$
begin
  perform public.t3a_capture_refuse('release.named_recipient', 'NAMED_RECIPIENT_RELEASE_RETIRED', coalesce(p_ber_report_id::text, ''), 'the named recipient release route is closed; no disclosure was created');
  return null;
end $fn$;

-- The backstop for any direct insert: a refused row is logged and skipped.
create or replace function public.t3a_named_route_closed() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_table_name = 't3a_report_release' and new.release_mode is distinct from 'named_pilot_recipient' then return new; end if;
  perform public.t3a_capture_refuse('release.named_recipient', 'NAMED_RECIPIENT_RELEASE_RETIRED', tg_table_name, 'a direct insert on a closed release route was refused');
  return null;
end $fn$;

drop trigger if exists t3a_3_named_route_closed_trg on public.t3a_d1_release_token;
create trigger t3a_3_named_route_closed_trg before insert on public.t3a_d1_release_token for each row execute function public.t3a_named_route_closed();
drop trigger if exists t3a_3_named_route_closed_trg on public.t3a_disclosure;
create trigger t3a_3_named_route_closed_trg before insert on public.t3a_disclosure for each row execute function public.t3a_named_route_closed();
drop trigger if exists t3a_3_named_route_closed_trg on public.t3a_report_release;
create trigger t3a_3_named_route_closed_trg before insert on public.t3a_report_release for each row execute function public.t3a_named_route_closed();

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Pool visibility
-- ---------------------------------------------------------------------------------------------------------------------

-- One entry per report (the live table allowed one per participant, which would hide a second dimension).
alter table public.t3a_employer_pool_entry drop constraint if exists t3a_employer_pool_entry_participant_id_key;
create unique index if not exists t3a_employer_pool_entry_report_uq on public.t3a_employer_pool_entry (ber_report_id) where ber_report_id is not null;
create index if not exists t3a_employer_pool_entry_participant_idx on public.t3a_employer_pool_entry (participant_id);

-- The participant edits only what they state. Report fields are written by the functions below and nothing else.
revoke insert, update, delete on public.t3a_employer_pool_entry from authenticated;
grant select on public.t3a_employer_pool_entry to authenticated;
grant update (stated_full_name, stated_role_or_field, work_location_preference, availability_to_start, work_authorization_jurisdiction, open_to_liveworks) on public.t3a_employer_pool_entry to authenticated;

create unique index if not exists t3a_report_release_one_pool_uq on public.t3a_report_release (ber_report_id) where release_mode = 'approved_employer_pool' and token_state = 'active';

create or replace function public.t3a_pool_make_available(p_ber_report_id uuid, p_stated_role_or_field text default null, p_work_location_preference text default null,
  p_availability_to_start text default null, p_work_authorization_jurisdiction text default null, p_open_to_liveworks boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); r public.t3a_d1_ber_report; v_name text; v_rel uuid;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.pool_make_available', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  select * into r from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if r.ber_report_id is null then return public.t3a_capture_refuse('release.pool_make_available', 'BER_REPORT_NOT_FOUND', v_actor::text, 'no such report'); end if;
  if r.participant_id <> v_actor then return public.t3a_capture_refuse('release.pool_make_available', 'ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT', v_actor::text, 'nobody releases a report for the participant'); end if;
  if r.issued_at is null then return public.t3a_capture_refuse('release.pool_make_available', 'REPORT_NOT_ISSUED', v_actor::text, 'only an issued report can be made available'); end if;
  if r.withdrawn_at is not null then return public.t3a_capture_refuse('release.pool_make_available', 'REPORT_WITHDRAWN', v_actor::text, 'a withdrawn report cannot be made available'); end if;
  if r.amended_at is not null then return public.t3a_capture_refuse('release.pool_make_available', 'REPORT_SUPERSEDED', v_actor::text, 'an amended report is replaced by its later version; make that one available'); end if;
  if exists (select 1 from public.t3a_report_release where ber_report_id = p_ber_report_id and release_mode = 'approved_employer_pool' and token_state = 'active') then
    return public.t3a_capture_refuse('release.pool_make_available', 'ALREADY_AVAILABLE', v_actor::text, 'this report is already available to approved employers');
  end if;

  select coalesce(nullif(btrim(pp.display_name), ''), nullif(btrim(pp.legal_name), ''), nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')) into v_name
    from public.profiles p left join public.t3a_participant_profile pp on pp.account_id = p.id where p.id = v_actor;
  if v_name is null then return public.t3a_capture_refuse('release.pool_make_available', 'NAME_NOT_STATED', v_actor::text, 'the participant has not stated a name to show'); end if;

  -- Its own consent, per dimension (employer_share, recorded through t3a_record_consent). Never inherited from another dimension.
  if public.t3a_consent_current(v_actor, 'employer_share', r.dimension_id) is distinct from 'granted' then
    return public.t3a_capture_refuse('release.pool_make_available', 'EMPLOYER_SHARE_CONSENT_REQUIRED', v_actor::text, 'employer_share consent for dimension ' || r.dimension_id || ' is not granted');
  end if;

  insert into public.t3a_report_release (ber_report_id, release_mode, token_state, employer_visibility_state)
    values (p_ber_report_id, 'approved_employer_pool', 'active', 'available_to_approved_employers') returning recipient_release_id into v_rel;

  insert into public.t3a_employer_pool_entry (participant_id, stated_full_name, stated_role_or_field, work_location_preference, availability_to_start, work_authorization_jurisdiction,
      open_to_liveworks, ber_report_id, report_status, current_through)
    values (v_actor, v_name, p_stated_role_or_field, p_work_location_preference, p_availability_to_start, p_work_authorization_jurisdiction, p_open_to_liveworks,
      p_ber_report_id, 'issued', r.issued_at::date);

  if public.t3a_canonical_writers_on() then
    perform public.t3a_emit_event('release.changed', 'PARTICIPANT', v_actor::text, 'participant', 'release', v_rel,
      jsonb_build_object('release_mode', 'approved_employer_pool', 'employer_visibility_state', 'available_to_approved_employers', 'availability_changed_at', to_jsonb(now())),
      'pool_available:' || v_rel::text, null, v_actor);
  end if;
  return jsonb_build_object('outcome', 'available', 'recipient_release_id', v_rel);
end $fn$;
revoke all on function public.t3a_pool_make_available(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.t3a_pool_make_available(uuid, text, text, text, text, boolean) to authenticated;

create or replace function public.t3a_pool_withdraw(p_ber_report_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); v_rel uuid;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.pool_withdraw', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  if not exists (select 1 from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id and participant_id = v_actor) then
    return public.t3a_capture_refuse('release.pool_withdraw', 'ONLY_THE_PARTICIPANT_WITHDRAWS_THEIR_REPORT', v_actor::text, 'not the participant''s report');
  end if;
  update public.t3a_report_release set token_state = 'revoked', employer_visibility_state = 'future_availability_withdrawn', availability_changed_at = now()
    where ber_report_id = p_ber_report_id and release_mode = 'approved_employer_pool' and token_state = 'active' returning recipient_release_id into v_rel;
  if v_rel is null then return public.t3a_capture_refuse('release.pool_withdraw', 'NOT_AVAILABLE', v_actor::text, 'this report is not currently available to approved employers'); end if;
  update public.t3a_employer_pool_entry set visibility_withdrawn_at = now() where ber_report_id = p_ber_report_id and visibility_withdrawn_at is null;
  if public.t3a_canonical_writers_on() then
    perform public.t3a_emit_event('release.changed', 'PARTICIPANT', v_actor::text, 'participant', 'release', v_rel,
      jsonb_build_object('release_mode', 'approved_employer_pool', 'employer_visibility_state', 'future_availability_withdrawn', 'availability_changed_at', to_jsonb(now())),
      'pool_withdrawn:' || v_rel::text, null, v_actor);
  end if;
  return jsonb_build_object('outcome', 'withdrawn', 'recipient_release_id', v_rel);
end $fn$;
revoke all on function public.t3a_pool_withdraw(uuid) from public, anon;
grant execute on function public.t3a_pool_withdraw(uuid) to authenticated;

-- The participant's own pool state for a report (the page reads this rather than the tables).
create or replace function public.t3a_pool_state(p_ber_report_id uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce((select jsonb_build_object('available', e.visibility_withdrawn_at is null, 'report_status', e.report_status, 'correction_open', e.correction_open, 'made_available_at', e.made_available_at, 'withdrawn_at', e.visibility_withdrawn_at)
    from public.t3a_employer_pool_entry e where e.ber_report_id = p_ber_report_id and e.participant_id = auth.uid()), jsonb_build_object('available', false))
$fn$;
revoke all on function public.t3a_pool_state(uuid) from public, anon;
grant execute on function public.t3a_pool_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. The pool entry follows its report
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_pool_follow_report() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.withdrawn_at is not null and old.withdrawn_at is null then
    update public.t3a_employer_pool_entry set report_status = 'withdrawn', visibility_withdrawn_at = coalesce(visibility_withdrawn_at, now()) where ber_report_id = new.ber_report_id;
    update public.t3a_report_release set token_state = 'revoked', employer_visibility_state = 'not_available', availability_changed_at = now()
      where ber_report_id = new.ber_report_id and release_mode = 'approved_employer_pool' and token_state = 'active';
  elsif new.amended_at is not null and old.amended_at is null then
    update public.t3a_employer_pool_entry set report_status = 'amended', correction_open = true where ber_report_id = new.ber_report_id;
    update public.t3a_report_release set token_state = 'superseded', availability_changed_at = now()
      where ber_report_id = new.ber_report_id and release_mode = 'approved_employer_pool' and token_state = 'active';
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_9_pool_follow_report_trg on public.t3a_d1_ber_report;
create trigger t3a_9_pool_follow_report_trg after update on public.t3a_d1_ber_report for each row execute function public.t3a_pool_follow_report();

-- Withdrawing employer_share consent takes the participant's entries for that dimension out of the pool.
create or replace function public.t3a_pool_follow_consent() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.consent_type = 'employer_share' and new.consent_status = 'withdrawn' then
    update public.t3a_employer_pool_entry e set visibility_withdrawn_at = coalesce(e.visibility_withdrawn_at, now())
      where e.participant_id = new.account_id and e.visibility_withdrawn_at is null
        and exists (select 1 from public.t3a_d1_ber_report b where b.ber_report_id = e.ber_report_id and b.dimension_id is not distinct from new.consent_scope_dimension_id);
    update public.t3a_report_release r set token_state = 'revoked', employer_visibility_state = 'future_availability_withdrawn', availability_changed_at = now()
      where r.release_mode = 'approved_employer_pool' and r.token_state = 'active'
        and exists (select 1 from public.t3a_d1_ber_report b where b.ber_report_id = r.ber_report_id and b.participant_id = new.account_id and b.dimension_id is not distinct from new.consent_scope_dimension_id);
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_9_pool_follow_consent_trg on public.t3a_consent_record;
create trigger t3a_9_pool_follow_consent_trg after insert on public.t3a_consent_record for each row execute function public.t3a_pool_follow_consent();
