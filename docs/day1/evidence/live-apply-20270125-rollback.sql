-- Generated rollback. Run in one transaction.
begin;
set local search_path to public, extensions;
alter table public."t3a_correction_case" drop constraint if exists "t3a_correction_case_observation_record_id_fkey";
drop index if exists public."t3a_correction_case_observation_idx";
alter table public."t3a_correction_case" drop column if exists "observation_record_id" cascade;
CREATE OR REPLACE FUNCTION public.t3a_report_correction_state(p_ber_report_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; dims text[]; open_cases jsonb; recs jsonb;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);
  select coalesce(jsonb_agg(jsonb_build_object('case', c.correction_case_id, 'kind', 'correction')), '[]'::jsonb) into open_cases
    from public.t3a_correction_case c where c.ber_report_id = p_ber_report_id and c.terminal_outcome is null and c.challenge_status not in ('upheld', 'amended', 'withdrawn');
  open_cases := open_cases || coalesce((select jsonb_agg(jsonb_build_object('case', k.challenge_case_id, 'kind', 'challenge')) from public.t3a_challenge_case k
    where (k.ber_report_id = p_ber_report_id or k.d1_ber_report_id = p_ber_report_id) and k.resolved_at is null), '[]'::jsonb);
  -- records under reconsideration, by dimension: the assignment is per observation record, so a D2 correction leaves the D1 record untouched
  select coalesce(jsonb_agg(jsonb_build_object('observation_record_id', o.observation_record_id, 'dimension_id', o.dimension_id, 'assignment', ra.reconsideration_assignment_id)), '[]'::jsonb) into recs
    from public.t3a_reconsideration_assignment ra join public.t3a_observation_record o on o.observation_record_id = ra.observation_record_id
   where o.participant_id = b.participant_id and o.dimension_id = any (dims) and ra.outcome is null;
  return jsonb_build_object('open', jsonb_array_length(open_cases) > 0 or jsonb_array_length(recs) > 0, 'cases', open_cases, 'records_under_reconsideration', recs);
end $function$;
revoke all on function t3a_report_correction_state(uuid) from public, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.t3a_report_render_gate(p_ber_report_id uuid, p_form text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; n int;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.render', 'BER_REPORT_NOT_FOUND', p_ber_report_id::text, 'no such report'); end if;
  if p_form not in ('one_page', 'multi_page') then return public.t3a_capture_refuse('report.render', 'render_input_invalid', p_ber_report_id::text, 'form must be one_page or multi_page'); end if;
  n := coalesce(cardinality(b.represented_dimension_ids), 1);
  -- D-07: a report that carries D4 renders through the multi page renderer only
  if p_form = 'one_page' and 'D4' = any (coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) then
    return public.t3a_capture_refuse('report.render', 'format_mismatch', p_ber_report_id::text, 'a D4 report renders through the multi page renderer; the single page route is closed');
  end if;
  if p_form = 'one_page' and n > 1 then
    return public.t3a_capture_refuse('report.render', 'layout_overflow', p_ber_report_id::text, 'mandatory content for ' || n || ' dimensions cannot render legibly on one page without omission or compression; the render does not expand');
  end if;
  return jsonb_build_object('outcome', 'renderable', 'form', p_form, 'dimension_blocks', n);
end $function$;
revoke all on function t3a_report_render_gate(uuid,text) from public, anon, authenticated, service_role;
grant execute on function t3a_report_render_gate(uuid,text) to authenticated;
grant execute on function t3a_report_render_gate(uuid,text) to service_role;
CREATE OR REPLACE FUNCTION public.t3a_s1_evidence_note(p_stage_instance uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;
revoke all on function t3a_s1_evidence_note(uuid) from public, anon, authenticated, service_role;
grant execute on function t3a_s1_evidence_note(uuid) to authenticated;
grant execute on function t3a_s1_evidence_note(uuid) to service_role;
drop table if exists public."t3a_controlled_text_version" cascade;
drop function if exists t3a_controlled_text_current(text) cascade;
drop function if exists t3a_cr06_observation_review(uuid) cascade;
drop function if exists t3a_cr06_raise_correction(uuid,text,text) cascade;
commit;
