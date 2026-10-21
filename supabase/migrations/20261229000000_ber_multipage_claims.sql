drop function if exists public.t3a_ber_multipage_claims(uuid);
-- Multi page BER (STD v9.19 Section 62): the claim packages of a REAL issued report, read from the evidence record.
-- Developer defaults, each logged (CR-168), none an approval:
--   * only an issued report is served; a specimen, a withdrawn report or one never issued refuses (no demonstration face of a real person),
--   * one claim package per represented dimension: the clause whose recurrence is available, otherwise the earliest conduct bearing clause of the latest committed statement,
--   * the evidence state of the package follows the clause (recurrence available: bounded_recurrence; the dimension state observed in more than one context: multiple_contexts; otherwise single_context; a material contradiction: divergent),
--   * the entry carries the statement library's use disposition, so an entry that is not `production` refuses at issue,
--   * evidence currency: the loaded value must be a whole number of months from the issue date; unloaded or anything else refuses.
-- Read only. Executable by the report's participant and the service route; the test flag (synthetic statements) is the service route only.
create or replace function public.t3a_ber_multipage_claims(p_ber_report_id uuid, p_include_test boolean default false) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  r public.t3a_d1_ber_report; gate jsonb; d text; es jsonb; pick record; cps jsonb := '[]'::jsonb; lib jsonb := '{}'::jsonb; ctxs jsonb; st text; disp text; cur text; months int;
  nm text; rv text; cor text; ncomp int; dimsorted text[];
begin
  select * into r from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if r.ber_report_id is null then return jsonb_build_object('outcome', 'refused', 'reason', 'BER_REPORT_NOT_FOUND'); end if;
  if p_include_test and not public.t3a_is_service_context() then return jsonb_build_object('outcome', 'refused', 'reason', 'TEST_MODE_IS_SERVICE_ONLY'); end if;
  if r.participant_id is distinct from auth.uid() and not public.t3a_is_service_context() then
    return jsonb_build_object('outcome', 'refused', 'reason', 'not_the_participant');
  end if;
  if r.issued_at is null or r.withdrawn_at is not null or coalesce(r.specimen_render_flag, false) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'report_not_issued', 'detail', 'only an issued report is served; no specimen face is produced for a real participant');
  end if;
  gate := public.t3a_report_render_gate(p_ber_report_id, 'multi_page');
  if gate ->> 'outcome' is distinct from 'renderable' then return jsonb_build_object('outcome', 'refused', 'reason', coalesce(gate ->> 'reason', 'render_gate_refused')); end if;
  cur := (select btrim(configuration_value) from public.t3a_configuration_value where configuration_key = 'evidence_currency' order by configuration_seq desc limit 1);
  if coalesce(cur, '') = '' then return jsonb_build_object('outcome', 'refused', 'reason', 'evidence_currency_unloaded'); end if;
  if cur !~ '^[0-9]{1,3}$' then return jsonb_build_object('outcome', 'refused', 'reason', 'evidence_currency_unparseable', 'detail', 'the loaded value must be a whole number of months'); end if;
  months := cur::int;

  select array_agg(x order by substring(x from 2)::int) into dimsorted from unnest(coalesce(r.represented_dimension_ids, array[r.dimension_id::text])) x;
  foreach d in array dimsorted loop
    es := public.t3a_evidence_state(r.participant_id, d, p_include_test);
    -- the clause whose recurrence is available, else the earliest conduct bearing clause of the latest committed statement
    select c.k, c.state_code, c.clause_text, c.cid, c.rec into pick from (
      select cix ->> 'recurrence_equivalence_key_id' as k, cix ->> 'state_code' as state_code, z.cl ->> 'clause_text' as clause_text, o.cid,
             exists (select 1 from jsonb_array_elements(es -> 'recurrence') x where x ->> 'recurrence_equivalence_key_id' = cix ->> 'recurrence_equivalence_key_id' and (x ->> 'available')::boolean) as rec,
             cs.composed_at, cix ->> 'conduct_element_id' as ce
        from public.t3a_es_obs(r.participant_id, d, p_include_test) o
        join public.t3a_dimension_composed_statement cs on cs.composed_statement_id = o.cid
        cross join lateral jsonb_array_elements(o.ci) cix
        cross join lateral (select c2 as cl from jsonb_array_elements(cs.clauses) c2 where c2 ->> 'state_code' = cix ->> 'state_code' limit 1) z
       where coalesce(z.cl ->> 'entry_type', 'conduct_bearing') = 'conduct_bearing'
    ) c order by c.rec desc, c.composed_at desc, c.ce limit 1;
    if pick.k is null then return jsonb_build_object('outcome', 'refused', 'reason', 'claim_package_absent', 'detail', d); end if;
    st := case
      when pick.rec then 'bounded_recurrence'
      when (es -> 'conditions') ? 'mixed_or_divergent' then 'divergent'
      when es ->> 'state' = 'observed_multiple_contexts' then 'multiple_contexts'
      else 'single_context' end;
    select coalesce(jsonb_agg(jsonb_build_object('context_instance_id', 'CTX-' || substr(o.cid::text, 1, 8), 'stage_code', o.stage) order by o.stage), '[]'::jsonb) into ctxs
      from public.t3a_es_obs(r.participant_id, d, p_include_test) o cross join lateral jsonb_array_elements(o.ci) cix where cix ->> 'recurrence_equivalence_key_id' = pick.k;
    if jsonb_array_length(ctxs) = 0 then return jsonb_build_object('outcome', 'refused', 'reason', 'claim_package_absent', 'detail', d); end if;
    select coalesce((select l.use_disposition from public.t3a_d1_statement_library l where l.dimension_id = d and l.statement_key = pick.state_code limit 1), 'build_only') into disp;
    cps := cps || jsonb_build_object('dimension_id', d, 'entry_id', pick.state_code, 'entry_version', 'LIB-' || d, 'evidence_state', st,
             'supporting_contexts', ctxs, 'bound_values', '{}'::jsonb, 'differences', '[]'::jsonb, 'context_dependencies', '[]'::jsonb);
    lib := lib || jsonb_build_object(pick.state_code, jsonb_build_object('entry_id', pick.state_code, 'entry_version', 'LIB-' || d, 'dimension_id', d, 'entry_type', 'conduct_bearing',
             'composed_text', pick.clause_text, 'placeholder_grammar', '{}'::jsonb, 'context_dependencies', '[]'::jsonb, 'use_disposition', disp));
  end loop;

  select trim(concat_ws(' ', p.first_name, p.last_name)) into nm from public.profiles p where p.id = r.participant_id;
  rv := case when exists (select 1 from public.t3a_d1_participant_review_action a where a.ber_report_id = p_ber_report_id and a.action in ('reviewed_no_correction', 'correction_raised')) then 'reviewed' else 'not_reviewed' end;
  cor := case when exists (select 1 from public.t3a_correction_case c where c.ber_report_id = p_ber_report_id and c.resolved_at is null) then 'open' else 'none_open' end;
  return jsonb_build_object('outcome', 'ok',
    'render_manifest', jsonb_build_object(
      'report_id', 'BER-' || to_char(r.issued_at, 'YYYY') || '-' || lpad(((('x' || substr(r.ber_report_id::text, 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0'),
      'report_version', coalesce(r.ber_version::text, '1.0'), 'participant_display_name', coalesce(nullif(nm, ''), 'Participant'), 'participant_status', 'current',
      'issue_date', to_char(r.issued_at, 'YYYY-MM-DD'), 'evidence_currency_date', to_char(r.issued_at + make_interval(months => months), 'YYYY-MM-DD'),
      'release_state', 'released', 'review_state', rv, 'correction_state', cor, 'entry_library_version', 'LIB', 'controlled_text_versions', jsonb_build_object('*', 'CTR-1.0'),
      'presentation_version', 'VTM-1.0', 'output_mode', 'issued', 'verification_display_address', 'verify.the3rdacademy.com/' || r.ber_report_id::text,
      'verification_reference', r.ber_report_id::text, 'participant_photo', null, 'claim_packages', cps),
    'entries', lib);
end $fn$;
revoke all on function public.t3a_ber_multipage_claims(uuid, boolean) from public, anon;
grant execute on function public.t3a_ber_multipage_claims(uuid, boolean) to authenticated, service_role;
