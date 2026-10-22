-- CORR-007 Rev 1.6 rule CR-09 (CR-189): two release routes for the Behavioral Evidence Report, each a separate participant authorization.
--   Route 1, general availability: while on, every approved employer reads the FULL current issued report; off ends it at once.
--   Route 2, direct release: a named person at a named organization, a token bound to one report version and one address, no account.
-- Two grant objects, never one (3.9.4). Neither route confers contact permission. Every read is written to an access record the participant can see.
-- Existing release records (the older pool entry and release rows, the closed named recipient functions) are inventoried, not converted (3.9.3 h).
-- Nothing here activates a Stage or turns an enforcement switch on.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. The grant objects
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_cr09_ga_event (
  event_seq        bigint generated always as identity primary key,
  participant_id   uuid not null references public.profiles(id),
  ber_report_id    uuid not null references public.t3a_d1_ber_report(ber_report_id),
  event            text not null check (event in ('on', 'off')),
  warning_version  text,
  recorded_at      timestamptz not null default now(),
  check (event = 'off' or warning_version is not null)
);
create index if not exists t3a_cr09_ga_event_report_idx on public.t3a_cr09_ga_event (ber_report_id, event_seq desc);

create table if not exists public.t3a_cr09_direct_release (
  direct_release_id uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.profiles(id),
  ber_report_id     uuid not null references public.t3a_d1_ber_report(ber_report_id),
  recipient_name    text not null check (btrim(recipient_name) <> ''),
  recipient_org     text,
  recipient_address text not null check (recipient_address = lower(btrim(recipient_address)) and recipient_address <> ''),
  token_hash        text not null unique,
  issued_at         timestamptz not null default now(),
  expires_at        timestamptz not null
);
create index if not exists t3a_cr09_direct_release_report_idx on public.t3a_cr09_direct_release (ber_report_id);

create table if not exists public.t3a_cr09_direct_release_event (
  event_seq         bigint generated always as identity primary key,
  direct_release_id uuid not null references public.t3a_cr09_direct_release(direct_release_id),
  event             text not null check (event in ('revoked')),
  recorded_at       timestamptz not null default now()
);

create table if not exists public.t3a_cr09_access_record (
  access_id         uuid primary key default gen_random_uuid(),
  participant_id    uuid not null,
  ber_report_id     uuid not null,
  served_report_id  uuid not null,
  route             text not null check (route in ('general_availability', 'direct_release')),
  reader_profile_id uuid,
  direct_release_id uuid,
  report_version    text,
  read_at           timestamptz not null default now()
);
create index if not exists t3a_cr09_access_record_participant_idx on public.t3a_cr09_access_record (participant_id, read_at desc);

do $do$ declare t text; begin
  foreach t in array array['t3a_cr09_ga_event', 't3a_cr09_direct_release', 't3a_cr09_direct_release_event', 't3a_cr09_access_record'] loop
    execute format('drop trigger if exists t3a_deny_mutation_trg on public.%I', t);
    execute format('create trigger t3a_deny_mutation_trg before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

-- The participant reads their own rows; the token hash is never granted.
drop policy if exists t3a_cr09_ga_event_own on public.t3a_cr09_ga_event;
create policy t3a_cr09_ga_event_own on public.t3a_cr09_ga_event for select to authenticated using (participant_id = auth.uid());
drop policy if exists t3a_cr09_direct_release_own on public.t3a_cr09_direct_release;
create policy t3a_cr09_direct_release_own on public.t3a_cr09_direct_release for select to authenticated using (participant_id = auth.uid());
drop policy if exists t3a_cr09_access_record_own on public.t3a_cr09_access_record;
create policy t3a_cr09_access_record_own on public.t3a_cr09_access_record for select to authenticated using (participant_id = auth.uid());
grant select on public.t3a_cr09_ga_event, public.t3a_cr09_access_record to authenticated;
grant select (direct_release_id, participant_id, ber_report_id, recipient_name, recipient_org, recipient_address, issued_at, expires_at) on public.t3a_cr09_direct_release to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Versions of a report: an amendment is a later row that names the earlier one
-- ---------------------------------------------------------------------------------------------------------------------

-- The latest issued, not withdrawn version at or after r.
create or replace function public.t3a_cr09_head(p_report uuid) returns uuid language plpgsql stable security definer set search_path = public as $fn$
declare cur uuid := p_report; nxt uuid; n int := 0;
begin
  loop
    select b.ber_report_id into nxt from public.t3a_d1_ber_report b
      where b.supersedes = cur and b.issued_at is not null and b.withdrawn_at is null order by b.issued_at desc, b.ber_report_id limit 1;
    exit when nxt is null or n > 50;
    cur := nxt; n := n + 1;
  end loop;
  return cur;
end $fn$;

-- General availability is on for r when the latest event on r or any earlier version is 'on'.
create or replace function public.t3a_cr09_ga_on(p_report uuid) returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare cur uuid := p_report; n int := 0; ids uuid[] := '{}'; ev text;
begin
  while cur is not null and n < 50 loop
    ids := ids || cur;
    select b.supersedes into cur from public.t3a_d1_ber_report b where b.ber_report_id = cur;
    n := n + 1;
  end loop;
  select e.event into ev from public.t3a_cr09_ga_event e where e.ber_report_id = any (ids) order by e.event_seq desc limit 1;
  return coalesce(ev = 'on', false);
end $fn$;
revoke all on function public.t3a_cr09_head(uuid), public.t3a_cr09_ga_on(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Route 1: general availability
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr09_warning_version() returns text language sql stable security definer set search_path = public as $fn$
  select configuration_version from public.t3a_configuration_value where configuration_key = 'consent_notice_text' order by configuration_seq desc limit 1
$fn$;
revoke all on function public.t3a_cr09_warning_version() from public, anon;
grant execute on function public.t3a_cr09_warning_version() to authenticated, service_role;

-- Turn general availability on or off for an issued report. On needs the warning of T3A-LEG-001 Part A 2.11(a) to have been shown: the caller
-- names the notice version it displayed, it must be the version in force, and that version is recorded with the event.
create or replace function public.t3a_ga_set(p_ber_report_id uuid, p_on boolean, p_warning_version text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); r public.t3a_d1_ber_report; v_dim text; v_now text := public.t3a_cr09_warning_version(); v_was boolean;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.ga_set', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  select * into r from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if r.ber_report_id is null then return public.t3a_capture_refuse('release.ga_set', 'BER_REPORT_NOT_FOUND', v_actor::text, 'no such report'); end if;
  if r.participant_id <> v_actor then return public.t3a_capture_refuse('release.ga_set', 'ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT', v_actor::text, 'nobody releases a report for the participant'); end if;
  v_was := public.t3a_cr09_ga_on(p_ber_report_id);
  if p_on is null then return public.t3a_capture_refuse('release.ga_set', 'GA_STATE_REQUIRED', v_actor::text, 'on or off must be stated'); end if;
  if not p_on then
    if not v_was then return public.t3a_capture_refuse('release.ga_set', 'GA_ALREADY_OFF', v_actor::text, 'general availability is not on for this report'); end if;
    insert into public.t3a_cr09_ga_event (participant_id, ber_report_id, event) values (v_actor, p_ber_report_id, 'off');
    return jsonb_build_object('outcome', 'off', 'direct_releases_unaffected', true);
  end if;
  if r.issued_at is null then return public.t3a_capture_refuse('release.ga_set', 'REPORT_NOT_ISSUED', v_actor::text, 'only an issued report can be made available'); end if;
  if r.withdrawn_at is not null then return public.t3a_capture_refuse('release.ga_set', 'REPORT_WITHDRAWN', v_actor::text, 'a withdrawn report cannot be made available'); end if;
  if r.amended_at is not null then return public.t3a_capture_refuse('release.ga_set', 'REPORT_SUPERSEDED', v_actor::text, 'an amended report is replaced by its later version; use that one'); end if;
  if v_was then return public.t3a_capture_refuse('release.ga_set', 'GA_ALREADY_ON', v_actor::text, 'general availability is already on for this report'); end if;
  if v_now is null or p_warning_version is distinct from v_now then
    return public.t3a_capture_refuse('release.ga_set', 'GA_WARNING_NOT_SHOWN', v_actor::text, 'the current employer warning must be shown before general availability turns on; shown: ' || coalesce(p_warning_version, 'none'));
  end if;
  -- Its own employer_share consent, per dimension the report represents. Never inherited from another dimension.
  foreach v_dim in array coalesce(r.represented_dimension_ids, array[r.dimension_id::text]) loop
    if public.t3a_consent_current(v_actor, 'employer_share', v_dim) is distinct from 'granted' then
      return public.t3a_capture_refuse('release.ga_set', 'EMPLOYER_SHARE_CONSENT_REQUIRED', v_actor::text, 'employer_share consent for dimension ' || v_dim || ' is not granted');
    end if;
  end loop;
  insert into public.t3a_cr09_ga_event (participant_id, ber_report_id, event, warning_version) values (v_actor, p_ber_report_id, 'on', p_warning_version);
  return jsonb_build_object('outcome', 'on', 'warning_version', p_warning_version);
end $fn$;
revoke all on function public.t3a_ga_set(uuid, boolean, text) from public, anon;
grant execute on function public.t3a_ga_set(uuid, boolean, text) to authenticated;

-- An approved employer opens and reads the full current issued report. Approval is read each time: a suspended or withdrawn approval is refused.
create or replace function public.t3a_ga_read(p_ber_report_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); v_head uuid; r public.t3a_d1_ber_report; v_prof uuid;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.ga_read', 'NO_CALLER_IDENTIFIED', '', 'no signed-in caller'); end if;
  if not public.t3a_current_employer_is_verified() then
    return public.t3a_capture_refuse('release.ga_read', 'EMPLOYER_NOT_APPROVED', v_actor::text, 'only an approved employer reads through general availability');
  end if;
  v_head := public.t3a_cr09_head(p_ber_report_id);
  select * into r from public.t3a_d1_ber_report where ber_report_id = v_head;
  if r.ber_report_id is null or r.issued_at is null or r.withdrawn_at is not null or not public.t3a_cr09_ga_on(v_head) then
    return public.t3a_capture_refuse('release.ga_read', 'REPORT_NOT_AVAILABLE', v_actor::text, 'this report is not available to approved employers');
  end if;
  v_prof := public.t3a_current_employer_profile();
  insert into public.t3a_cr09_access_record (participant_id, ber_report_id, served_report_id, route, reader_profile_id, report_version)
    values (r.participant_id, p_ber_report_id, v_head, 'general_availability', v_prof, r.ber_version);
  return jsonb_build_object('outcome', 'read', 'route', 'general_availability', 'served_report_id', v_head, 'superseded_version_requested', v_head <> p_ber_report_id,
    'face', public.t3a_d1_report_face_assemble(v_head));
end $fn$;
revoke all on function public.t3a_ga_read(uuid) from public, anon;
grant execute on function public.t3a_ga_read(uuid) to authenticated;

-- The Available Reports surface (BOSD Book 2 2.17). It takes a page and a page size and nothing else: no dimension, Stage, evidence state or
-- conduct control, and the API refuses any other parameter. Order is fixed (when the participant turned it on) and carries no meaning.
create or replace function public.t3a_available_reports_list(p_params jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); k text; bad text[] := '{}'; v_page int; v_size int; items jsonb;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.available_reports', 'NO_CALLER_IDENTIFIED', '', 'no signed-in caller'); end if;
  if not public.t3a_current_employer_is_verified() then
    return public.t3a_capture_refuse('release.available_reports', 'EMPLOYER_NOT_APPROVED', v_actor::text, 'only an approved employer sees the Available Reports surface');
  end if;
  for k in select jsonb_object_keys(coalesce(p_params, '{}'::jsonb)) loop
    if k not in ('page', 'page_size') then bad := bad || k; end if;
  end loop;
  if cardinality(bad) > 0 then
    return public.t3a_capture_refuse('release.available_reports', 'AVAILABLE_REPORTS_PARAMETER_NOT_ALLOWED', v_actor::text, 'no search, sort or filter exists on this surface; refused: ' || array_to_string(bad, ', '));
  end if;
  v_page := greatest(coalesce((p_params ->> 'page')::int, 1), 1);
  v_size := least(greatest(coalesce((p_params ->> 'page_size')::int, 25), 1), 100);
  select coalesce(jsonb_agg(jsonb_build_object('ber_report_id', t.head, 'stated_name', t.nm) order by t.on_seq), '[]'::jsonb) into items from (
    select h.head, h.on_seq, coalesce(nullif(btrim(pp.display_name), ''), nullif(btrim(pp.legal_name), ''), nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')) nm
    from (select distinct on (public.t3a_cr09_head(e.ber_report_id)) public.t3a_cr09_head(e.ber_report_id) head, e.event_seq on_seq, e.participant_id
            from public.t3a_cr09_ga_event e where e.event = 'on' order by public.t3a_cr09_head(e.ber_report_id), e.event_seq) h
      join public.t3a_d1_ber_report b on b.ber_report_id = h.head and b.issued_at is not null and b.withdrawn_at is null
      join public.profiles p on p.id = h.participant_id left join public.t3a_participant_profile pp on pp.account_id = p.id
    where public.t3a_cr09_ga_on(h.head)
    order by h.on_seq offset (v_page - 1) * v_size limit v_size) t;
  return jsonb_build_object('outcome', 'listed', 'page', v_page, 'page_size', v_size, 'items', items);
end $fn$;
revoke all on function public.t3a_available_reports_list(jsonb) from public, anon;
grant execute on function public.t3a_available_reports_list(jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Route 2: direct release
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_direct_release_create(p_ber_report_id uuid, p_recipient_name text, p_recipient_org text, p_recipient_address text, p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); r public.t3a_d1_ber_report; v_token text; v_id uuid; v_addr text := lower(btrim(coalesce(p_recipient_address, '')));
begin
  if v_actor is null then return public.t3a_capture_refuse('release.direct_create', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  select * into r from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if r.ber_report_id is null then return public.t3a_capture_refuse('release.direct_create', 'BER_REPORT_NOT_FOUND', v_actor::text, 'no such report'); end if;
  if r.participant_id <> v_actor then return public.t3a_capture_refuse('release.direct_create', 'ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT', v_actor::text, 'nobody releases a report for the participant'); end if;
  if r.issued_at is null then return public.t3a_capture_refuse('release.direct_create', 'REPORT_NOT_ISSUED', v_actor::text, 'only an issued report can be released'); end if;
  if r.withdrawn_at is not null then return public.t3a_capture_refuse('release.direct_create', 'REPORT_WITHDRAWN', v_actor::text, 'a withdrawn report cannot be released'); end if;
  if r.amended_at is not null then return public.t3a_capture_refuse('release.direct_create', 'REPORT_SUPERSEDED', v_actor::text, 'an amended report is replaced by its later version; release that one'); end if;
  if coalesce(btrim(p_recipient_name), '') = '' or v_addr = '' or position('@' in v_addr) = 0 then
    return public.t3a_capture_refuse('release.direct_create', 'RECIPIENT_MUST_BE_NAMED_AND_ADDRESSED', v_actor::text, 'a named person and an address are required');
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    return public.t3a_capture_refuse('release.direct_create', 'RELEASE_MUST_EXPIRE_IN_THE_FUTURE', v_actor::text, 'a direct release is time limited');
  end if;
  -- The release row is itself the per release authorization (participant, one report version, one named recipient, one time limit); it is never standing.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.t3a_cr09_direct_release (participant_id, ber_report_id, recipient_name, recipient_org, recipient_address, token_hash, expires_at)
    values (v_actor, p_ber_report_id, btrim(p_recipient_name), nullif(btrim(coalesce(p_recipient_org, '')), ''), v_addr,
            encode(extensions.digest(v_token, 'sha256'), 'hex'), p_expires_at) returning direct_release_id into v_id;
  return jsonb_build_object('outcome', 'released', 'direct_release_id', v_id, 'token', v_token, 'recipient_address', v_addr, 'expires_at', p_expires_at,
    'note', 'The link is shown once. It is stored only as a hash, so it cannot be recovered afterwards.');
end $fn$;
revoke all on function public.t3a_direct_release_create(uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.t3a_direct_release_create(uuid, text, text, text, timestamptz) to authenticated;

create or replace function public.t3a_direct_release_revoke(p_direct_release_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); d public.t3a_cr09_direct_release;
begin
  if v_actor is null then return public.t3a_capture_refuse('release.direct_revoke', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  select * into d from public.t3a_cr09_direct_release where direct_release_id = p_direct_release_id;
  if d.direct_release_id is null or d.participant_id <> v_actor then
    return public.t3a_capture_refuse('release.direct_revoke', 'ONLY_THE_PARTICIPANT_REVOKES_THEIR_RELEASE', v_actor::text, 'not the participant''s release');
  end if;
  if exists (select 1 from public.t3a_cr09_direct_release_event where direct_release_id = p_direct_release_id and event = 'revoked') then
    return public.t3a_capture_refuse('release.direct_revoke', 'ALREADY_REVOKED', v_actor::text, 'this release is already revoked');
  end if;
  insert into public.t3a_cr09_direct_release_event (direct_release_id, event) values (p_direct_release_id, 'revoked');
  return jsonb_build_object('outcome', 'revoked', 'general_availability_unaffected', true, 'general_availability_on', public.t3a_cr09_ga_on(public.t3a_cr09_head(d.ber_report_id)));
end $fn$;
revoke all on function public.t3a_direct_release_revoke(uuid) from public, anon;
grant execute on function public.t3a_direct_release_revoke(uuid) to authenticated;

-- The recipient has no account. The caller names the address the recipient verified; the token is bound to one address and one report.
create or replace function public.t3a_direct_release_redeem(p_token text, p_verified_address text, p_ber_report_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare d public.t3a_cr09_direct_release; r public.t3a_d1_ber_report; v_addr text := lower(btrim(coalesce(p_verified_address, '')));
begin
  select * into d from public.t3a_cr09_direct_release where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if d.direct_release_id is null then return public.t3a_capture_refuse('release.direct_redeem', 'RELEASE_TOKEN_UNKNOWN', '', 'no such release'); end if;
  if v_addr <> d.recipient_address then
    return public.t3a_capture_refuse('release.direct_redeem', 'RELEASE_ADDRESS_NOT_THE_NAMED_ADDRESS', d.direct_release_id::text, 'the token is bound to the address the participant named');
  end if;
  if p_ber_report_id is not null and p_ber_report_id <> d.ber_report_id then
    return public.t3a_capture_refuse('release.direct_redeem', 'RELEASE_TOKEN_NOT_FOR_THIS_REPORT', d.direct_release_id::text, 'the token is bound to one report');
  end if;
  select * into r from public.t3a_d1_ber_report where ber_report_id = d.ber_report_id;
  if exists (select 1 from public.t3a_cr09_direct_release_event where direct_release_id = d.direct_release_id and event = 'revoked') then
    return jsonb_build_object('content', false, 'state', 'revoked');
  end if;
  if d.expires_at <= now() then return jsonb_build_object('content', false, 'state', 'expired'); end if;
  if r.withdrawn_at is not null then return jsonb_build_object('content', false, 'state', 'withdrawn'); end if;
  -- Bound to its version: an amendment never reaches a direct release; the recipient sees the superseded state until the participant releases again.
  if r.amended_at is not null or public.t3a_cr09_head(d.ber_report_id) <> d.ber_report_id then
    return jsonb_build_object('content', false, 'state', 'superseded');
  end if;
  insert into public.t3a_cr09_access_record (participant_id, ber_report_id, served_report_id, route, direct_release_id, report_version)
    values (d.participant_id, d.ber_report_id, d.ber_report_id, 'direct_release', d.direct_release_id, r.ber_version);
  return jsonb_build_object('content', true, 'state', 'active', 'route', 'direct_release', 'ber_report_id', d.ber_report_id, 'face', public.t3a_d1_report_face_assemble(d.ber_report_id));
end $fn$;
revoke all on function public.t3a_direct_release_redeem(text, text, uuid) from public;
grant execute on function public.t3a_direct_release_redeem(text, text, uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Both controls side by side, the access record, and status verification
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_release_state(p_ber_report_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid();
begin
  if not exists (select 1 from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id and participant_id = v_actor) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'ONLY_THE_PARTICIPANT_SEES_THEIR_RELEASE_STATE');
  end if;
  return jsonb_build_object('outcome', 'state',
    'general_availability_on', public.t3a_cr09_ga_on(p_ber_report_id),
    'direct_releases', coalesce((select jsonb_agg(jsonb_build_object('direct_release_id', d.direct_release_id, 'recipient_name', d.recipient_name, 'recipient_org', d.recipient_org,
        'expires_at', d.expires_at, 'revoked', exists (select 1 from public.t3a_cr09_direct_release_event x where x.direct_release_id = d.direct_release_id)) order by d.issued_at)
      from public.t3a_cr09_direct_release d where d.ber_report_id = p_ber_report_id), '[]'::jsonb),
    'independence_statement', 'These are two separate controls. Turning general availability off does not end a direct release, and ending a direct release does not turn general availability off: while general availability is on, approved employers can still read your report after a direct release to one of them is ended.');
end $fn$;
revoke all on function public.t3a_release_state(uuid) from public, anon;
grant execute on function public.t3a_release_state(uuid) to authenticated;

-- Who read, by which route, which version, when (3.9.3 f).
create or replace function public.t3a_release_access_record(p_ber_report_id uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('route', a.route, 'read_at', a.read_at, 'report_version', a.report_version, 'served_report_id', a.served_report_id,
    'reader', case a.route when 'general_availability' then 'an approved employer account' else (select d.recipient_name from public.t3a_cr09_direct_release d where d.direct_release_id = a.direct_release_id) end)
    order by a.read_at), '[]'::jsonb)
  from public.t3a_cr09_access_record a where a.participant_id = auth.uid() and a.ber_report_id = p_ber_report_id
$fn$;
revoke all on function public.t3a_release_access_record(uuid) from public, anon;
grant execute on function public.t3a_release_access_record(uuid) to authenticated;

-- Status only; never content.
create or replace function public.t3a_report_verify(p_verification_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare r public.t3a_d1_ber_report;
begin
  select * into r from public.t3a_d1_ber_report where verification_code = p_verification_code and issued_at is not null;
  if r.ber_report_id is null then return jsonb_build_object('status', 'not_found'); end if;
  return jsonb_build_object('status', case when r.withdrawn_at is not null then 'withdrawn' when r.amended_at is not null then 'superseded' else 'issued' end);
end $fn$;
revoke all on function public.t3a_report_verify(text) from public;
grant execute on function public.t3a_report_verify(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. An amendment while general availability is on: the participant is told at once
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr09_amend_notice() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.supersedes is not null and new.issued_at is not null and (tg_op = 'INSERT' or old.issued_at is null) and public.t3a_cr09_ga_on(new.supersedes) then
    insert into public.notifications (user_id, type, title, message, metadata)
      values (new.participant_id, 'report_amended_general_availability', 'Your report was amended',
        'Your report was amended while it is available to approved employers. Approved employers now see the new version; the earlier version is marked superseded. A report you released directly stays bound to the version you released.',
        jsonb_build_object('ber_report_id', new.ber_report_id, 'supersedes', new.supersedes));
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_9_cr09_amend_notice_trg on public.t3a_d1_ber_report;
create trigger t3a_9_cr09_amend_notice_trg after insert or update of issued_at on public.t3a_d1_ber_report for each row execute function public.t3a_cr09_amend_notice();
