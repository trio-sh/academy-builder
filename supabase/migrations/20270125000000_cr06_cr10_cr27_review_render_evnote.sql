-- CR-06: the participant reads and challenges any committed observation, whether or not a report is ever issued. A correction is keyed to the observation;
--        raising one renders the commitment of paragraph 2.21 from configuration (REC-03); with the values unloaded nothing is raised and nothing renders.
-- CR-10: every issued report renders through the multi page renderer. The render gate refuses the single page form with format_mismatch for anything
--        that is not a specimen; the single page form stays for the specimen, which is never issued.
-- CR-27: controlled texts are kept by version. T-EVNOTE-001 version 1 stays as superseded (reports issued under it still resolve it); version 2 is current.

-- ===== CR-06 =====
alter table public.t3a_correction_case add column if not exists observation_record_id uuid references public.t3a_observation_record(observation_record_id);
create index if not exists t3a_correction_case_observation_idx on public.t3a_correction_case (observation_record_id) where observation_record_id is not null;

create or replace function public.t3a_cr06_observation_review(p_observation_record uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); o public.t3a_observation_record;
begin
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_record;
  if v_actor is null or o.observation_record_id is null or o.participant_id is distinct from v_actor or o.is_committed is not true then
    return jsonb_build_object('outcome', 'refused', 'reason', 'OBSERVATION_NOT_AVAILABLE');
  end if;
  return jsonb_build_object('outcome', 'open', 'observation_record_id', o.observation_record_id, 'dimension_id', o.dimension_id, 'stage_code', o.stage_code,
    'committed_at', o.committed_at, 'in_a_report', exists (select 1 from public.t3a_d1_ber_report b where b.participant_id = o.participant_id and o.dimension_id = any (coalesce(b.represented_dimension_ids, array[b.dimension_id::text]))),
    'statements', coalesce((select jsonb_agg(jsonb_build_object('composed_statement_id', cs.composed_statement_id, 'stage_code', cs.stage_code, 'clauses', cs.clauses) order by cs.composed_at)
                              from public.t3a_dimension_composed_statement cs
                             where cs.observation_ref = o.observation_record_id and cs.test_mode is not true
                               and not exists (select 1 from public.t3a_dimension_composed_statement x where x.supersedes_composed_statement_id = cs.composed_statement_id)), '[]'::jsonb),
    'challenge_available', true, 'correction_commitment', public.t3a_correction_commitment(),
    'open_corrections', (select count(*)::int from public.t3a_correction_case c where c.observation_record_id = o.observation_record_id and c.terminal_outcome is null and c.challenge_status not in ('upheld', 'amended', 'withdrawn')));
end $fn$;
revoke all on function public.t3a_cr06_observation_review(uuid) from public, anon;
grant execute on function public.t3a_cr06_observation_review(uuid) to authenticated, service_role;

create or replace function public.t3a_cr06_raise_correction(p_observation_record uuid, p_ground text, p_narrative text default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); o public.t3a_observation_record; v_commit jsonb; v_case uuid;
begin
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_record;
  if v_actor is null or o.observation_record_id is null or o.participant_id is distinct from v_actor or o.is_committed is not true then
    return jsonb_build_object('outcome', 'refused', 'reason', 'OBSERVATION_NOT_AVAILABLE');
  end if;
  if p_ground is null or btrim(p_ground) = '' then return jsonb_build_object('outcome', 'refused', 'reason', 'GROUND_REQUIRED'); end if;
  v_commit := public.t3a_correction_commitment();
  if (v_commit ->> 'rendered')::boolean is not true then
    perform public.t3a_capture_refuse('correction.raise', 'correction_response_time_unloaded', o.observation_record_id::text, 'the commitment of paragraph 2.21 cannot render, so no correction is taken until its values are loaded');
    return jsonb_build_object('outcome', 'refused', 'reason', 'correction_response_time_unloaded');
  end if;
  insert into public.t3a_correction_case (raised_by, participant_id, ground, narrative, challenge_status, observation_record_id)
    values (v_actor, v_actor, btrim(p_ground), p_narrative, 'open', o.observation_record_id) returning correction_case_id into v_case;
  return jsonb_build_object('outcome', 'raised', 'correction_case_id', v_case, 'correction_commitment', v_commit);
end $fn$;
revoke all on function public.t3a_cr06_raise_correction(uuid, text, text) from public, anon;
grant execute on function public.t3a_cr06_raise_correction(uuid, text, text) to authenticated, service_role;

-- a correction open against a committed observation of a dimension in the report blocks the report, like every other open correction
do $m$
declare v_def text; v_new text;
begin
  select pg_get_functiondef('public.t3a_report_correction_state(uuid)'::regprocedure) into v_def;
  if position('c.observation_record_id' in v_def) = 0 then
    v_new := replace(v_def, E'  -- records under reconsideration, by dimension',
      E'  open_cases := open_cases || coalesce((select jsonb_agg(jsonb_build_object(''case'', c.correction_case_id, ''kind'', ''correction_on_observation''))\n    from public.t3a_correction_case c join public.t3a_observation_record o on o.observation_record_id = c.observation_record_id\n    where o.participant_id = b.participant_id and o.dimension_id = any (dims) and c.terminal_outcome is null and c.challenge_status not in (''upheld'', ''amended'', ''withdrawn'')), ''[]''::jsonb);\n  -- records under reconsideration, by dimension');
    if v_new = v_def then raise exception 'CR-06: the correction state did not have the expected comment'; end if;
    execute v_new;
  end if;
end $m$;

-- ===== CR-10 =====
create or replace function public.t3a_report_render_gate(p_ber_report_id uuid, p_form text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; n int;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.render', 'BER_REPORT_NOT_FOUND', p_ber_report_id::text, 'no such report'); end if;
  if p_form not in ('one_page', 'multi_page') then return public.t3a_capture_refuse('report.render', 'render_input_invalid', p_ber_report_id::text, 'form must be one_page or multi_page'); end if;
  n := coalesce(cardinality(b.represented_dimension_ids), 1);
  -- CR-10 and D-07: the single page form is for the specimen only; every other report renders through the multi page renderer
  if p_form = 'one_page' and coalesce(b.specimen_render_flag, false) is not true then
    return public.t3a_capture_refuse('report.render', 'format_mismatch', p_ber_report_id::text, 'every issued report renders through the multi page renderer; the single page form is kept for the specimen only');
  end if;
  if p_form = 'one_page' and 'D4' = any (coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) then
    return public.t3a_capture_refuse('report.render', 'format_mismatch', p_ber_report_id::text, 'a D4 report renders through the multi page renderer; the single page route is closed');
  end if;
  if p_form = 'one_page' and n > 1 then
    return public.t3a_capture_refuse('report.render', 'layout_overflow', p_ber_report_id::text, 'mandatory content for ' || n || ' dimensions cannot render legibly on one page without omission or compression; the render does not expand');
  end if;
  return jsonb_build_object('outcome', 'renderable', 'form', p_form, 'dimension_blocks', n);
end $fn$;

-- ===== CR-27 =====
create table if not exists public.t3a_controlled_text_version (
  text_ref text not null,
  version int not null check (version >= 1),
  body text not null check (btrim(body) <> ''),
  status text not null check (status in ('current', 'superseded')),
  loaded_at timestamptz not null default now(),
  superseded_at timestamptz,
  primary key (text_ref, version)
);
create unique index if not exists t3a_controlled_text_one_current on public.t3a_controlled_text_version (text_ref) where status = 'current';
comment on table public.t3a_controlled_text_version is 'CR-27: controlled texts by version. A superseded version stays so that a report issued under it still resolves its text.';
alter table public.t3a_controlled_text_version enable row level security;
revoke all on public.t3a_controlled_text_version from anon, authenticated;
grant select on public.t3a_controlled_text_version to authenticated;
drop policy if exists t3a_controlled_text_version_read on public.t3a_controlled_text_version;
create policy t3a_controlled_text_version_read on public.t3a_controlled_text_version for select to authenticated using (true);
drop trigger if exists t3a_no_delete on public.t3a_controlled_text_version;
create trigger t3a_no_delete before delete on public.t3a_controlled_text_version for each row execute function public.t3a_deny_mutation();

insert into public.t3a_controlled_text_version (text_ref, version, body, status, superseded_at) values
 ('T-EVNOTE-001', 1, 'Stage 1 written situations are administered through an AI system. A Stage 1 observation enters the evidence record only after authorized human confirmation. Source linked statements remain subject to participant review, correction, amendment and evidence currency controls.', 'superseded', now()),
 ('T-EVNOTE-001', 2, 'Stage 1 written situations are presented through a fixed automated process that shows each situation exactly as written and generates nothing. A Stage 1 observation enters the evidence record only after authorized human confirmation. Source linked statements remain subject to participant review, correction, amendment and evidence currency controls.', 'current', null)
on conflict (text_ref, version) do nothing;

create or replace function public.t3a_controlled_text_current(p_text_ref text) returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce((select jsonb_build_object('text_ref', text_ref, 'version', version, 'text', body) from public.t3a_controlled_text_version where text_ref = p_text_ref and status = 'current'),
                  jsonb_build_object('text_ref', p_text_ref, 'refusal', 'controlled_text_not_loaded'))
$fn$;
revoke all on function public.t3a_controlled_text_current(text) from public, anon;
grant execute on function public.t3a_controlled_text_current(text) to authenticated, service_role;

-- the report's controlled text row follows the current version (it holds version 2 where it was loaded by the founder-text migration; set it here where it is absent or still version 1)
update public.t3a_d1_report_controlled_text r set body = v.body
  from public.t3a_controlled_text_version v where r.text_ref = 'T-EVNOTE-001' and v.text_ref = 'T-EVNOTE-001' and v.status = 'current' and r.body is distinct from v.body;
insert into public.t3a_d1_report_controlled_text (text_ref, block_no, body)
select text_ref, null, body from public.t3a_controlled_text_version where text_ref = 'T-EVNOTE-001' and status = 'current'
on conflict (text_ref) do nothing;

do $m$
declare v_def text; v_new text;
begin
  select pg_get_functiondef('public.t3a_s1_evidence_note(uuid)'::regprocedure) into v_def;
  if position('t3a_controlled_text_current' in v_def) = 0 then
    -- the note needs both the current version in the register and the report's controlled text row; either missing and it refuses, as before
    v_new := replace(v_def, E'select body into txt from public.t3a_d1_report_controlled_text where text_ref = ''T-EVNOTE-001'';', E'select case when exists (select 1 from public.t3a_d1_report_controlled_text where text_ref = ''T-EVNOTE-001'') then public.t3a_controlled_text_current(''T-EVNOTE-001'') ->> ''text'' end into txt;');
    if v_new = v_def then raise exception 'CR-27: the evidence note did not have the expected text lookup'; end if;
    v_new := replace(v_new, E'return jsonb_build_object(''outcome'', ''rendered'', ''text_ref'', ''T-EVNOTE-001'', ''text'', txt,', E'return jsonb_build_object(''outcome'', ''rendered'', ''text_ref'', ''T-EVNOTE-001'', ''text_version'', (public.t3a_controlled_text_current(''T-EVNOTE-001'') ->> ''version'')::int, ''text'', txt,');
    execute v_new;
  end if;
end $m$;
