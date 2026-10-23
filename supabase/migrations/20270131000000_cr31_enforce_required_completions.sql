-- CR-31 enforce_required: the routes that open a Stage entry (CR-12 wire, CR-26 request, canonical writers) and the three that write involvement
-- (S1 capture, reconsideration, CR-15 second observer) insert before they fill the required fields, so turning enforce_required on would stop them.
-- These completion triggers run before the required-fields check (t3a_1_ sorts before t3a_2_), only while enforce_required is on, and only fill a
-- field that is still null. With the switch off nothing changes. A field that cannot be derived is left null and the required-fields check refuses.
create or replace function public.t3a_entry_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_hold int;
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  if new.session_id is null then new.session_id := gen_random_uuid(); end if;
  if new.observation_mode is null then
    new.observation_mode := case new.stage_code::text when 'S1' then 's1_deterministic_engine' when 'S2' then 's2_live_video' when 'S3' then 's3_asynchronous_submission' else 's4_live_group' end;
  end if;
  if new.stage_entry_hold_expires_at is null then
    begin v_hold := public.t3a_required_setting('stage_entry_hold_ttl')::int; exception when others then v_hold := null; end;
    if v_hold is not null then new.stage_entry_hold_expires_at := now() + make_interval(secs => v_hold); end if;
  end if;
  if new.entry_authority_actor_id is null and new.stage_code::text <> 'S1' and auth.uid() is not null and public.t3a_is_mentor() then
    new.entry_authority_actor_id := auth.uid();
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_entry_complete_trg on public.t3a_stage_entry_event;
create trigger t3a_1_entry_complete_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_entry_complete();

create or replace function public.t3a_involvement_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  if new.evidence_cycle_id is null then new.evidence_cycle_id := new.contributing_record_id; end if;
  if new.cycle_function is null then
    new.cycle_function := case new.involving_action::text when 'reconsidered' then 'evidence_reviewer' else 'observer' end;
  end if;
  if new.s1_exposure_flag is null then new.s1_exposure_flag := (new.involving_action::text = 's1_determination_capture'); end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_involvement_complete_trg on public.t3a_d1_involvement;
create trigger t3a_1_involvement_complete_trg before insert on public.t3a_d1_involvement for each row execute function public.t3a_involvement_complete();
revoke all on function public.t3a_entry_complete() from public, anon, authenticated;
revoke all on function public.t3a_involvement_complete() from public, anon, authenticated;

-- An attempt is opened at Stage entry, before anything can say how it will end, and the ending class is written later: by the end route from the ending map,
-- by the welfare trigger after the insert, or not at all for an ending that matches no defined event (CR-12 fails that closed and holds it until it is
-- reclassified). So the ending class cannot be a required field at insert, and the entry route could never open an attempt under enforce_required if it were.
drop trigger if exists t3a_2_required_fields_trg on public.t3a_attempt;
create trigger t3a_2_required_fields_trg before insert on public.t3a_attempt for each row execute function public.t3a_require_fields('attempt_no', 'attempt_rules_version');

-- The attempt is opened by the CR-12 begin route and the stage entry route without a rules version. It is the version in force: the configured one, or the
-- version of the attempt rule table when none is configured.
create or replace function public.t3a_attempt_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  if new.attempt_rules_version is null then
    begin new.attempt_rules_version := public.t3a_required_setting('attempt_rules_version');
    exception when others then new.attempt_rules_version := (select rules_version from public.t3a_attempt_rule order by rules_version desc limit 1); end;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_attempt_complete_trg on public.t3a_attempt;
create trigger t3a_1_attempt_complete_trg before insert on public.t3a_attempt for each row execute function public.t3a_attempt_complete();
revoke all on function public.t3a_attempt_complete() from public, anon, authenticated;

-- The gateway is opened by the entry routes at the moment the participant is told observation will happen; that moment is the notification time.
create or replace function public.t3a_gateway_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if (select enforce_required from public.t3a_capture_config) and new.observation_notification_timestamp is null then new.observation_notification_timestamp := now(); end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_gateway_complete_trg on public.t3a_observation_path_gateway;
create trigger t3a_1_gateway_complete_trg before insert on public.t3a_observation_path_gateway for each row execute function public.t3a_gateway_complete();
revoke all on function public.t3a_gateway_complete() from public, anon, authenticated;

-- A progression decision applies to one dimension; the challenge route writes the corrected decision without saying so.
create or replace function public.t3a_progression_decision_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if (select enforce_required from public.t3a_capture_config) and new.decision_scope is null then new.decision_scope := jsonb_build_object('dimension', new.dimension_id); end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_progression_decision_complete_trg on public.t3a_d1_progression_decision;
create trigger t3a_1_progression_decision_complete_trg before insert on public.t3a_d1_progression_decision for each row execute function public.t3a_progression_decision_complete();
revoke all on function public.t3a_progression_decision_complete() from public, anon, authenticated;

-- A challenge case is opened before anyone has decided it, so its outcome, reason, resolving time and second check person cannot be required when it is opened
-- (a case could never be opened under enforce_required). The rows are append-only; a case that arrives resolved carries all four.
drop trigger if exists t3a_2_required_fields_trg on public.t3a_challenge_case;
create trigger t3a_2_required_fields_trg before insert on public.t3a_challenge_case for each row execute function public.t3a_require_fields('opened_by', 'challenge_target_ref', 'response_time_committed_version', 'issuance_hold');
create or replace function public.t3a_challenge_resolved_requires() returns trigger language plpgsql set search_path = public as $fn$
declare c text;
begin
  if new.status::text in ('upheld', 'amended', 'withdrawn') and (select enforce_required from public.t3a_capture_config) then
    foreach c in array array['second_check_actor_id', 'challenge_outcome', 'outcome_reason_code', 'resolved_at'] loop
      if to_jsonb(new) -> c is null or to_jsonb(new) -> c = 'null'::jsonb then
        raise exception 'T3A_REQUIRED_FIELD_MISSING: % is required on t3a_challenge_case once it is resolved', c using errcode = '23502';
      end if;
    end loop;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_2_challenge_resolved_requires_trg on public.t3a_challenge_case;
create trigger t3a_2_challenge_resolved_requires_trg before insert on public.t3a_challenge_case for each row execute function public.t3a_challenge_resolved_requires();
revoke all on function public.t3a_challenge_resolved_requires() from public, anon, authenticated;

-- An employer application is made before anyone approves it, so the approver cannot be required when it is made. It is required for an approval: a person approves, while a free email provider is declined by the system with no one named.
drop trigger if exists t3a_2_required_fields_trg on public.t3a_employer_application;
create trigger t3a_2_required_fields_trg before insert on public.t3a_employer_application for each row execute function public.t3a_require_fields('application_status', 'accepting_person_name', 'accepting_person_title', 'record_use_terms_version', 'terms_accepted_at');
create or replace function public.t3a_application_decided_requires() returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.approval_decision::text = 'approved' and new.approver_id is null and (select enforce_required from public.t3a_capture_config) then
    raise exception 'T3A_REQUIRED_FIELD_MISSING: approver_id is required on t3a_employer_application once it is approved' using errcode = '23502';
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_2_application_decided_requires_trg on public.t3a_employer_application;
create trigger t3a_2_application_decided_requires_trg before insert or update on public.t3a_employer_application for each row execute function public.t3a_application_decided_requires();
revoke all on function public.t3a_application_decided_requires() from public, anon, authenticated;

-- An application that nothing has decided is pending. The free email provider rule declines in its own trigger, which runs first.
create or replace function public.t3a_application_pending() returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.application_status is null and (select enforce_required from public.t3a_capture_config) then new.application_status := 'pending'; end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_employer_application_pending_trg on public.t3a_employer_application;
create trigger t3a_1_employer_application_pending_trg before insert on public.t3a_employer_application for each row execute function public.t3a_application_pending();
revoke all on function public.t3a_application_pending() from public, anon, authenticated;

-- A challenge is opened by t3a_open_challenge, which inserts the row and sets who opened it, what it challenges, the hold and the response time version straight
-- after. Under enforce_required the insert is checked first, so the same values are given at insert.
create or replace function public.t3a_challenge_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  if new.opened_by is null then new.opened_by := new.participant_id; end if;
  if new.challenge_target_ref is null then new.challenge_target_ref := coalesce(new.d1_ber_report_id, new.ber_report_id); end if;
  if new.issuance_hold is null then new.issuance_hold := true; end if;
  if new.response_time_committed_version is null then
    begin new.response_time_committed_version := public.t3a_required_setting('response_time_committed_version'); exception when others then null; end;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_challenge_complete_trg on public.t3a_challenge_case;
create trigger t3a_1_challenge_complete_trg before insert on public.t3a_challenge_case for each row execute function public.t3a_challenge_complete();
revoke all on function public.t3a_challenge_complete() from public, anon, authenticated;

-- A composed statement is written by the commit route with the statement it renders and its text. Its version is the number in the question set version of that
-- statement (1.0 when it has none) and its digest is the SHA-256 of the text.
create or replace function public.t3a_composed_statement_complete() returns trigger language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  if new.statement_version is null then new.statement_version := coalesce((select substring(question_set_version from '[0-9]+[.][0-9]+([.][0-9]+)?') from public.t3a_statement_library where statement_id = new.statement_id), '1.0'); end if;
  if new.statement_digest is null and new.rendered_body is not null then new.statement_digest := encode(digest(convert_to(new.rendered_body, 'UTF8'), 'sha256'), 'hex'); end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_composed_statement_complete_trg on public.t3a_composed_statement;
create trigger t3a_1_composed_statement_complete_trg before insert on public.t3a_composed_statement for each row execute function public.t3a_composed_statement_complete();
revoke all on function public.t3a_composed_statement_complete() from public, anon, authenticated;

-- The practice route records a session against a module named only by its slug, so the module has no separate version and the session no separate workplace moment.
create or replace function public.t3a_rehearsal_session_complete() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  if new.module_version is null then new.module_version := '1.0'; end if;
  if new.workplace_moment_id is null then new.workplace_moment_id := new.module_id; end if;
  return new;
end $fn$;
drop trigger if exists t3a_1_rehearsal_session_complete_trg on public.t3a_rehearsal_session;
create trigger t3a_1_rehearsal_session_complete_trg before insert on public.t3a_rehearsal_session for each row execute function public.t3a_rehearsal_session_complete();
revoke all on function public.t3a_rehearsal_session_complete() from public, anon, authenticated;
