-- CORR-007 Rev 1.6 rule CR-25 (CR-193): every issued report has an accessible tagged equivalent carrying identical approved content (BOSD Book 7 D.125).
--   The equivalent is derived from the same assembled face as the visual report, by one function, at issuance. It is a tagged document (language, document role,
--   headings, paragraphs, a data table with caption and header cells) and carries a digest of its text that must equal the digest of the face text. A face that cannot
--   be assembled (mandatory controlled text not loaded) builds no copy and the refusal is logged; nothing is invented. The release routes return the equivalent
--   with the face. Nothing here activates a Stage or turns an enforcement switch on.

-- The text of a face as the reader meets it: the blocks that render, in order, name then approved text then each conduct row.
create or replace function public.t3a_report_face_text(p_face jsonb) returns text language sql immutable as $fn$
  select coalesce(string_agg(t, E'\n' order by ord), '') from (
    select b.ord * 1000 as ord, 'H|' || (b.v ->> 'block_name') as t from jsonb_array_elements(coalesce(p_face -> 'blocks', '[]'::jsonb)) with ordinality b(v, ord) where (b.v ->> 'renders')::boolean
    union all
    select b.ord * 1000 + 1, 'P|' || (b.v ->> 'controlled_text') from jsonb_array_elements(coalesce(p_face -> 'blocks', '[]'::jsonb)) with ordinality b(v, ord) where (b.v ->> 'renders')::boolean and b.v ->> 'controlled_text' is not null
    union all
    select b.ord * 1000 + 10 + r.rord, 'R|' || (r.v ->> 'dimension_id') || '|' || (r.v ->> 'stage_code') || '|' || (r.v ->> 'statement')
      from jsonb_array_elements(coalesce(p_face -> 'blocks', '[]'::jsonb)) with ordinality b(v, ord), jsonb_array_elements(case when jsonb_typeof(b.v -> 'rows') = 'array' then b.v -> 'rows' else '[]'::jsonb end) with ordinality r(v, rord)
      where (b.v ->> 'renders')::boolean) x
$fn$;

-- The same text read back out of the tagged document.
create or replace function public.t3a_tagged_text(p_tagged jsonb) returns text language sql immutable as $fn$
  select coalesce(string_agg(t, E'\n' order by ord), '') from (
    select s.ord * 1000 as ord, 'H|' || (s.v -> 'heading' ->> 'text') as t from jsonb_array_elements(coalesce(p_tagged -> 'children', '[]'::jsonb)) with ordinality s(v, ord)
    union all
    select s.ord * 1000 + 1, 'P|' || (c.v ->> 'text') from jsonb_array_elements(coalesce(p_tagged -> 'children', '[]'::jsonb)) with ordinality s(v, ord), jsonb_array_elements(coalesce(s.v -> 'children', '[]'::jsonb)) with ordinality c(v, cord)
      where c.v ->> 'tag' = 'p'
    union all
    select s.ord * 1000 + 10 + r.rord, 'R|' || (r.v ->> 0) || '|' || (r.v ->> 1) || '|' || (r.v ->> 2)
      from jsonb_array_elements(coalesce(p_tagged -> 'children', '[]'::jsonb)) with ordinality s(v, ord), jsonb_array_elements(coalesce(s.v -> 'children', '[]'::jsonb)) c(v),
           jsonb_array_elements(case when jsonb_typeof(c.v -> 'rows') = 'array' then c.v -> 'rows' else '[]'::jsonb end) with ordinality r(v, rord)
      where c.v ->> 'tag' = 'table') x
$fn$;

create or replace function public.t3a_report_accessible_build(p_face jsonb) returns jsonb language plpgsql immutable as $fn$
declare secs jsonb := '[]'::jsonb; b record; kids jsonb; rows_ jsonb;
begin
  for b in select v, ord from jsonb_array_elements(coalesce(p_face -> 'blocks', '[]'::jsonb)) with ordinality t(v, ord) where (t.v ->> 'renders')::boolean order by ord loop
    kids := '[]'::jsonb;
    if b.v ->> 'controlled_text' is not null then kids := kids || jsonb_build_array(jsonb_build_object('tag', 'p', 'text', b.v ->> 'controlled_text')); end if;
    if b.v -> 'rows' is not null and jsonb_typeof(b.v -> 'rows') = 'array' and jsonb_array_length(b.v -> 'rows') > 0 then
      select jsonb_agg(jsonb_build_array(r ->> 'dimension_id', r ->> 'stage_code', r ->> 'statement')) into rows_ from jsonb_array_elements(b.v -> 'rows') r;
      kids := kids || jsonb_build_array(jsonb_build_object('tag', 'table', 'caption', b.v ->> 'block_name', 'header', jsonb_build_array('Dimension', 'Stage', 'Statement'), 'rows', rows_));
    end if;
    secs := secs || jsonb_build_array(jsonb_build_object('tag', 'section', 'block_no', (b.v ->> 'block_no')::int, 'heading', jsonb_build_object('tag', 'h2', 'text', b.v ->> 'block_name'), 'children', kids));
  end loop;
  return jsonb_build_object('role', 'document', 'lang', 'en', 'title', 'Behavioral Evidence Report', 'children', secs);
end $fn$;

create table if not exists public.t3a_report_accessible_copy (
  ber_report_id    uuid primary key references public.t3a_d1_ber_report(ber_report_id),
  tagged           jsonb not null,
  face_text_digest text not null check (face_text_digest ~ '^[0-9a-f]{64}$'),
  copy_text_digest text not null check (copy_text_digest = face_text_digest),
  built_at         timestamptz not null default now()
);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_report_accessible_copy;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_report_accessible_copy for each row execute function public.t3a_deny_mutation();
alter table public.t3a_report_accessible_copy enable row level security;
revoke all on public.t3a_report_accessible_copy from anon, authenticated;

-- Built at issuance from the same face. The digest of the copy's text must equal the digest of the face text; a copy that differs is never stored.
create or replace function public.t3a_report_accessible_make(p_report uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare f jsonb; t jsonb; fd text; cd text;
begin
  if exists (select 1 from public.t3a_report_accessible_copy where ber_report_id = p_report) then return jsonb_build_object('outcome', 'exists'); end if;
  f := public.t3a_d1_report_face_assemble(p_report);
  if (f ->> 'rendered')::boolean is not true then
    return public.t3a_capture_refuse('report.accessible_copy', 'ACCESSIBLE_COPY_NOT_BUILT', p_report::text, 'the face did not assemble (' || coalesce(f ->> 'refusal_code', 'unknown') || '); no equivalent is invented');
  end if;
  t := public.t3a_report_accessible_build(f);
  fd := encode(extensions.digest(public.t3a_report_face_text(f), 'sha256'), 'hex');
  cd := encode(extensions.digest(public.t3a_tagged_text(t), 'sha256'), 'hex');
  if fd <> cd then
    return public.t3a_capture_refuse('report.accessible_copy', 'ACCESSIBLE_COPY_NOT_IDENTICAL', p_report::text, 'the tagged text differs from the face text; not stored');
  end if;
  insert into public.t3a_report_accessible_copy (ber_report_id, tagged, face_text_digest, copy_text_digest) values (p_report, t, fd, cd);
  return jsonb_build_object('outcome', 'built', 'text_digest', fd);
end $fn$;
revoke all on function public.t3a_report_accessible_make(uuid) from public, anon, authenticated;
grant execute on function public.t3a_report_accessible_make(uuid) to service_role;

create or replace function public.t3a_report_accessible_on_issue() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.issued_at is not null and (tg_op = 'INSERT' or old.issued_at is null) then perform public.t3a_report_accessible_make(new.ber_report_id); end if;
  return new;
end $fn$;
drop trigger if exists t3a_9_accessible_on_issue_trg on public.t3a_d1_ber_report;
create trigger t3a_9_accessible_on_issue_trg after insert or update of issued_at on public.t3a_d1_ber_report for each row execute function public.t3a_report_accessible_on_issue();

-- Whether an issued report has its equivalent, and whether it still matches the live face.
create or replace function public.t3a_report_accessible_state(p_report uuid) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare c public.t3a_report_accessible_copy; f jsonb; issued boolean;
begin
  select issued_at is not null into issued from public.t3a_d1_ber_report where ber_report_id = p_report;
  if issued is null then return jsonb_build_object('state', 'report_not_found'); end if;
  if not issued then return jsonb_build_object('state', 'not_issued'); end if;
  select * into c from public.t3a_report_accessible_copy where ber_report_id = p_report;
  if c.ber_report_id is null then return jsonb_build_object('state', 'missing'); end if;
  f := public.t3a_d1_report_face_assemble(p_report);
  return jsonb_build_object('state', 'present', 'tagged', true, 'identical_to_face', (f ->> 'rendered')::boolean is true
    and encode(extensions.digest(public.t3a_report_face_text(f), 'sha256'), 'hex') = c.copy_text_digest, 'text_digest', c.copy_text_digest);
end $fn$;
revoke all on function public.t3a_report_accessible_state(uuid) from public, anon;
grant execute on function public.t3a_report_accessible_state(uuid) to authenticated, service_role;

-- The participant, or someone with administrative standing, reads the equivalent (the same entitlement as the face).
create or replace function public.t3a_report_accessible_read(p_report uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); v_part uuid;
begin
  select participant_id into v_part from public.t3a_d1_ber_report where ber_report_id = p_report;
  if v_actor is null or v_part is null then return jsonb_build_object('rendered', false, 'refusal_code', 'NO_CALLER_OR_REPORT'); end if;
  if v_actor <> v_part and not public.t3a_has_administrative_standing() then return jsonb_build_object('rendered', false, 'refusal_code', 'CALLER_NOT_ENTITLED_TO_THIS_REPORT'); end if;
  return coalesce((select jsonb_build_object('rendered', true, 'tagged', c.tagged) from public.t3a_report_accessible_copy c where c.ber_report_id = p_report),
                  jsonb_build_object('rendered', false, 'refusal_code', 'ACCESSIBLE_COPY_MISSING'));
end $fn$;
revoke all on function public.t3a_report_accessible_read(uuid) from public, anon;
grant execute on function public.t3a_report_accessible_read(uuid) to authenticated;

-- Both release routes return the equivalent with the face.
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
  if r.ber_report_id is null or r.issued_at is null or r.withdrawn_at is not null or not public.t3a_cr09_ga_on(v_head) or not public.t3a_cr09_consent_ok(v_head) then
    return public.t3a_capture_refuse('release.ga_read', 'REPORT_NOT_AVAILABLE', v_actor::text, 'this report is not available to approved employers');
  end if;
  v_prof := public.t3a_current_employer_profile();
  insert into public.t3a_cr09_access_record (participant_id, ber_report_id, served_report_id, route, reader_profile_id, report_version)
    values (r.participant_id, p_ber_report_id, v_head, 'general_availability', v_prof, r.ber_version);
  return jsonb_build_object('outcome', 'read', 'route', 'general_availability', 'served_report_id', v_head, 'superseded_version_requested', v_head <> p_ber_report_id,
    'face', public.t3a_d1_report_face_assemble(v_head),
    'accessible', (select c.tagged from public.t3a_report_accessible_copy c where c.ber_report_id = v_head));
end $fn$;

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
  return jsonb_build_object('content', true, 'state', 'active', 'route', 'direct_release', 'ber_report_id', d.ber_report_id, 'face', public.t3a_d1_report_face_assemble(d.ber_report_id),
    'accessible', (select c.tagged from public.t3a_report_accessible_copy c where c.ber_report_id = d.ber_report_id));
end $fn$;
