-- Rollback of 20270221000000_d9_shared_machinery.sql: restores the five functions it re-emitted exactly as they were in production before the step (read from the baseline built from migrations up to 20270132), and removes what the step added.
-- Run after the D9 seeds, content and Session Archive rollbacks. Valid while no D9 content has been approved or used.
drop trigger if exists t3a_3_capacity_observation_guard_trg on public.t3a_d1_content_version;
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
end $function$

;
CREATE OR REPLACE FUNCTION public.t3a_dimension_compose(p_participant uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb DEFAULT '{}'::jsonb, p_items jsonb DEFAULT '{}'::jsonb, p_observation_ref uuid DEFAULT gen_random_uuid(), p_test_mode boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v public.t3a_d1_content_version; o public.t3a_content_object; dim text; st text := 'S' || p_stage;
  app jsonb := '{}'::jsonb; a record; q record; r record; res jsonb; k text; pv text; ans jsonb; need int; fam text; list jsonb; ids text[]; sel jsonb; sel_o jsonb; sel_c jsonb;
  bound jsonb := '{}'::jsonb; ms text; limit_kinds text[] := '{}'; line text; id uuid; clauses jsonb := '[]'::jsonb; ci jsonb := '[]'::jsonb; conds jsonb := '[]'::jsonb; el text; s jsonb;
  gate jsonb; fail jsonb; tags text[]; k2 text; arr jsonb; pn text; sf jsonb;
  committable text[] := array['declined', 'no_response', 'technical_failure', 'withdrawn'];
begin
  if p_stage !~ '^[1-4]$' then return public.t3a_capture_refuse('composition.commit', 'stage_unknown', coalesce(p_stage, ''), 'stage must be 1 to 4'); end if;
  if p_test_mode and not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('composition.commit', 'TEST_MODE_IS_SERVICE_ONLY', p_participant::text, 'test composition is the service route only');
  end if;
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('composition.commit', 'source_version_not_found', p_participant::text, p_source_version::text); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text;
  if coalesce(v.body ->> 'stage_code', '') <> st then return public.t3a_capture_refuse('composition.commit', 'source_stage_mismatch', p_participant::text, 'the source belongs to Stage ' || coalesce(v.body ->> 'stage_code', '?')); end if;
  if not p_test_mode then
    gate := public.t3a_source_serving_gate(p_source_version, st);
    if gate ->> 'outcome' <> 'servable' then return gate; end if;
  end if;

  -- applicability: read from the source's own per-question table. The Stage never decides service.
  for a in select x ->> 'question' as question, x ->> 'state' as state from jsonb_array_elements(coalesce(v.body -> 'question_applicability', '[]'::jsonb)) x loop
    app := app || jsonb_build_object(a.question, a.state);
  end loop;
  if app = '{}'::jsonb then return public.t3a_capture_refuse('composition.commit', 'applicability_table_absent', p_participant::text, 'the source carries no per-question applicability table'); end if;

  ans := coalesce(p_answers, '{}'::jsonb);
  for k in select jsonb_object_keys(coalesce(p_missing, '{}'::jsonb)) loop
    ms := p_missing ->> k;
    if not (ms = any (public.t3a_missing_state_codes())) then return public.t3a_capture_refuse('composition.commit', 'missing_state_not_postable', p_participant::text, k || ' ' || ms); end if;
    if ans ? k then return public.t3a_capture_refuse('composition.commit', 'answer_and_missing_state_both', p_participant::text, k); end if;
    ans := ans || jsonb_build_object(k, 'missing:' || ms);
  end loop;

  for q in select qo.question_code, qo.display_order, qo.answer_type from public.t3a_d1_question_object qo where qo.dimension_id = dim order by qo.display_order loop
    -- NOT SERVED: no answer row, no missing state. Not a null.
    if coalesce(app ->> q.question_code, 'NOT SERVED') = 'NOT SERVED' then
      if ans ? q.question_code or (p_items ? q.question_code) then return public.t3a_capture_refuse('composition.commit', 'answer_for_question_not_served', p_participant::text, q.question_code); end if;
      continue;
    end if;
    -- a child is reached only through a serving answer of its parent (a parent missing state means the child is never reached)
    select b.parent_question, b.serving_answers into r from public.t3a_d1_branch_rule b where b.dimension_id = dim and b.child_question = q.question_code;
    if r.parent_question is not null then
      pv := ans ->> r.parent_question;
      if pv is null or not (pv = any (r.serving_answers)) then
        if ans ? q.question_code or (p_items ? q.question_code) then return public.t3a_capture_refuse('composition.commit', 'child_not_reached', p_participant::text, q.question_code || ' follows ' || r.parent_question); end if;
        continue;
      end if;
    end if;
    -- a served question needs an answer or a committable missing state
    if not (ans ? q.question_code) then return public.t3a_capture_refuse('composition.commit', 'served_question_unanswered', p_participant::text, q.question_code); end if;
    if (ans ->> q.question_code) like 'missing:%' and not (substring(ans ->> q.question_code from 9) = any (committable)) then
      return public.t3a_capture_refuse('composition.commit', 'missing_state_not_committable', p_participant::text, q.question_code || ' ' || (ans ->> q.question_code));
    end if;
    if (ans ->> q.question_code) like 'missing:technical_failure' and not conds @> '["conditions_compromised"]'::jsonb then conds := conds || '["conditions_compromised"]'::jsonb; end if;
  end loop;

  -- bound selections: items come from the served source version only
  for q in select m.question_code, m.source_bound_family as fam, qo.answer_type from public.t3a_d1_question_capture_map m join public.t3a_d1_question_object qo using (dimension_id, question_code)
            where m.dimension_id = dim and m.source_bound_family is not null order by qo.display_order loop
    continue when not (ans ? q.question_code) or (ans ->> q.question_code) like 'missing:%' or coalesce(app ->> q.question_code, 'NOT SERVED') = 'NOT SERVED';
    list := v.body -> 'source_sheet' -> q.fam;
    if list is null or jsonb_typeof(list) <> 'array' or jsonb_array_length(list) = 0 then
      return public.t3a_capture_refuse('composition.commit', 'BOUND_FAMILY_ABSENT_OR_EMPTY', p_participant::text, q.question_code || ' needs ' || q.fam);
    end if;
    select l.line_text into line from public.t3a_d1_capture_line l where l.dimension_id = dim and l.capture_set_code = (select capture_set_code from public.t3a_d1_question_capture_map where dimension_id = dim and question_code = q.question_code)
       and l.line_order = substring(ans ->> q.question_code from 2)::int;
    sel := p_items -> q.question_code;
    ids := '{}';
    tags := array(select lower(mm[1]) from regexp_matches(line, 'LISTED:([A-Z_]+)', 'g') as mm);
    if cardinality(tags) > 0 then
      -- tagged selections: an object keyed by tag; a tag in the line needs at least one item, a tag outside the line takes none
      for k2 in select jsonb_object_keys(case when jsonb_typeof(sel) = 'object' then sel else '{}'::jsonb end) loop
        if not (k2 = any (tags)) and jsonb_array_length(coalesce(sel -> k2, '[]'::jsonb)) > 0 then
          return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': ' || line);
        end if;
      end loop;
      foreach k2 in array tags loop
        arr := case when jsonb_typeof(sel) = 'object' then coalesce(sel -> k2, '[]'::jsonb) else '[]'::jsonb end;
        if jsonb_array_length(arr) = 0 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': ' || line); end if;
        if exists (select 1 from jsonb_array_elements_text(arr) x where x = any (ids)) then return public.t3a_capture_refuse('composition.commit', 'item_marked_twice', p_participant::text, q.question_code); end if;
        ids := ids || array(select jsonb_array_elements_text(arr));
        select placeholder_name into pn from public.t3a_dimension_placeholder where dimension_id = dim and bound_to = q.question_code || ' LISTED:' || upper(k2);
        if pn is not null then bound := bound || jsonb_build_object(pn, jsonb_array_length(arr)); end if;
      end loop;
    else
      if line like 'LISTED%' then
        if sel is null or jsonb_typeof(sel) <> 'array' or jsonb_array_length(sel) = 0 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': a listed answer needs at least one item'); end if;
        if q.answer_type ilike '%exactly one%' and jsonb_array_length(sel) <> 1 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': exactly one item'); end if;
        ids := array(select jsonb_array_elements_text(sel));
        select placeholder_name into pn from public.t3a_dimension_placeholder where dimension_id = dim and bound_to = q.question_code || ' LISTED';
        if pn is not null then bound := bound || jsonb_build_object(pn, cardinality(ids)); end if;
      elsif sel is not null and sel <> '[]'::jsonb and sel <> '{}'::jsonb then
        return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': this answer takes no items');
      end if;
    end if;
    -- every item must be on THIS source version's list (an item from another version or a D1 source is refused)
    if exists (select 1 from unnest(ids) i where not exists (select 1 from jsonb_array_elements(list) e where e ->> 'id' = i)) then
      return public.t3a_capture_refuse('composition.commit', 'bound_item_not_on_source', p_participant::text, q.question_code || ' item not on ' || q.fam || ' of this source version');
    end if;
    if (select count(*) from unnest(ids) i) <> (select count(distinct i) from unnest(ids) i) then return public.t3a_capture_refuse('composition.commit', 'item_selected_twice', p_participant::text, q.question_code); end if;
  end loop;
  bound := bound || jsonb_build_object('affected_party_label', coalesce(v.body -> 'source_sheet' ->> 'affected_party', ''));
  if bound ->> 'affected_party_label' = '' then bound := bound - 'affected_party_label'; end if;

  res := public.t3a_resolve_core(dim, p_stage, ans, bound, p_test_mode);
  if res ->> 'outcome' = 'refused' then
    perform public.t3a_capture_refuse('composition.commit', coalesce(res ->> 'rule', res ->> 'reason'), p_participant::text, res ->> 'detail');
    return jsonb_build_object('outcome', 'refused', 'reason', coalesce(res ->> 'rule', res ->> 'reason'), 'detail', res ->> 'detail');
  end if;

  sf := public.t3a_stage_form_check(p_stage, res -> 'statements', dim);
  if sf ->> 'outcome' = 'violation' then
    perform public.t3a_capture_refuse('composition.commit', 'stage_form_violation', p_participant::text, (sf ->> 'statement_key') || ' uses the performed act verb ' || (sf ->> 'verb') || ' at Stage 1');
    return jsonb_build_object('outcome', 'refused', 'reason', 'stage_form_violation', 'detail', sf::text);
  end if;
  if p_stage = '1' then conds := conds || '["stage_1_only"]'::jsonb; end if;
  for s in select * from jsonb_array_elements(res -> 'statements') loop
    select qo.conduct_element into el from public.t3a_d1_question_object qo where qo.dimension_id = dim and qo.question_code = s ->> 'question_code';
    clauses := clauses || jsonb_build_object('conduct_element', el, 'question_code', s ->> 'question_code', 'state_code', s ->> 'statement_key', 'entry_type', s ->> 'entry_type', 'clause_text', s ->> 'text');
    ci := ci || jsonb_build_object('observation_id', p_observation_ref, 'conduct_element_id', el,
            'recurrence_equivalence_key_id', 'REK-' || dim || '-' || lpad(regexp_replace(el, '^.*-', ''), 3, '0'), 'state_code', s ->> 'statement_key',
            'recurrence_blocker', coalesce((select l.recurrence_blocker from public.t3a_d1_statement_library l where l.dimension_id = dim and l.statement_key = s ->> 'statement_key' limit 1), false));
  end loop;
  if not p_test_mode then
    if public.t3a_commit_seal_key() is null then return public.t3a_capture_refuse('composition.commit', 'commit_seal_key_unloaded', p_participant::text, 'the commit is signed by the server and the signing key is not loaded'); end if;
    if exists (select 1 from public.t3a_commit_seal x where x.observation_ref = p_observation_ref and not x.is_superseding) then
      return public.t3a_capture_refuse('composition.commit', 'observation_id_not_unique', p_observation_ref::text, 'an observation identifier already committed cannot be committed again; the first record stands');
    end if;
  end if;
  insert into public.t3a_dimension_composed_statement (dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, missing, selections, clauses, clause_instances, conditions, test_mode)
    values (dim, p_observation_ref, p_participant, st, p_source_version, coalesce(p_answers, '{}'::jsonb), coalesce(p_missing, '{}'::jsonb), coalesce(p_items, '{}'::jsonb), clauses, ci, conds, p_test_mode)
    returning composed_statement_id into id;
  if not p_test_mode then perform public.t3a_seal_composed(id, false); end if;
  return jsonb_build_object('outcome', 'composed', 'composed_statement_id', id, 'observation_ref', p_observation_ref, 'clauses', clauses, 'clause_instances', ci, 'conditions', conds);
end $function$

;
CREATE OR REPLACE FUNCTION public.t3a_stage_form_check(p_stage text, p_statements jsonb, p_dimension text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare x jsonb; v text;
begin
  if regexp_replace(upper(p_stage), '^S', '') <> '1' then return jsonb_build_object('outcome', 'ok'); end if;
  for x in select * from jsonb_array_elements(coalesce(p_statements, '[]'::jsonb)) loop
    if p_dimension is not null and exists (select 1 from public.t3a_stage_form_question q where q.dimension_id = p_dimension and q.question_code = x ->> 'question_code') then
      return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', 'a channel use entry (' || (x ->> 'question_code') || ')');
    end if;
    for v in select verb from public.t3a_stage_form_verb loop
      if (x ->> 'text') ~* ('\m' || v || '\M') then
        return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
      end if;
    end loop;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $function$

;
CREATE OR REPLACE FUNCTION public.t3a_prior_exposure(p_participant uuid, p_source_version uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; form text; sc text; ipf text; dim text; reasons text[] := '{}';
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text; stage := v.body ->> 'stage_code'; form := public.t3a_administration_form_of(stage);
  sc := v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class');
  select interaction_pattern_family_id into ipf from public.t3a_interaction_pattern_family where dimension_id = dim and situation_class = sc;
  if exists (select 1 from public.t3a_stage_entry_event s where s.participant_id = p_participant and s.source_version_id = p_source_version) then reasons := reasons || 'source_version_met'::text; end if;
  -- CR-14: the form exclusion is for a form met under ANOTHER dimension, and an approved, unexpired source design review can lift it (never the source or the pattern family)
  if exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id
              join public.t3a_content_object po2 on po2.content_object_id = pv.content_object_id
              where s.participant_id = p_participant and po2.dimension_id::text <> dim and public.t3a_administration_form_of(pv.body ->> 'stage_code') = form)
     and not public.t3a_design_review_lifts(p_participant, p_source_version, form) then reasons := reasons || 'administration_form_met'::text; end if;
  if ipf is not null and exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id join public.t3a_content_object po on po.content_object_id = pv.content_object_id
              join public.t3a_interaction_pattern_family pf on pf.dimension_id = po.dimension_id::text and pf.situation_class = pv.body -> 'source_sheet' ->> (lower(po.dimension_id::text) || '_situation_class')
              where s.participant_id = p_participant and po.dimension_id::text = dim and pf.interaction_pattern_family_id = ipf) then reasons := reasons || 'pattern_family_met'::text; end if;
  return jsonb_build_object('excluded', cardinality(reasons) > 0, 'reasons', to_jsonb(reasons), 'administration_form_id', form, 'interaction_pattern_family_id', ipf);
end $function$

;
CREATE OR REPLACE FUNCTION public.t3a_source_approval_preconditions(p_version uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; sc text; dim text; stage text;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return 'source_version_not_found'; end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text;
  if dim is null or dim = 'D1' then return null; end if;
  stage := v.body ->> 'stage_code';
  sc := v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class');
  if sc is null or not exists (select 1 from public.t3a_interaction_pattern_family f where f.dimension_id = dim and f.situation_class = sc) then return 'situation_class_absent_or_unknown'; end if;
  if public.t3a_administration_form_of(stage) is null then return 'administration_form_absent'; end if;
  if (select count(*) from public.t3a_source_drafting_test t where t.source_version_id = p_version) < 2 then return 'drafting_test_incomplete'; end if;
  if stage = 'S3' and not exists (select 1 from public.t3a_source_rights_record r where r.source_version_id = p_version) then return 'rights_route_absent'; end if;
  if cardinality(public.t3a_source_unready_questions(p_version)) > 0 then return 'question_definition_incomplete'; end if;
  if not exists (select 1 from public.t3a_source_approval_request q where q.source_version_id = p_version) then return 'not_submitted_for_approval'; end if;
  if not exists (select 1 from public.t3a_d1_source_name_clearance c where c.source_version_id = p_version and c.status = 'cleared') then return 'name_clearance_pending'; end if;
  return null;
end $function$

;
drop function if exists public.t3a_capacity_observation_guard();
drop function if exists public.t3a_capacity_observation_check(jsonb, text);
drop function if exists public.t3a_entry_subject_check(text, text);
drop function if exists public.t3a_source_display_body(uuid);
drop function if exists public.t3a_never_rendered_check(text, text);
drop function if exists public.t3a_sheet_field_value(jsonb, text);
drop function if exists public.t3a_governing_situation_class(text);
drop table if exists public.t3a_stage_form_dimension_verb;
drop table if exists public.t3a_source_sheet_field;
drop table if exists public.t3a_capacity_term;
drop table if exists public.t3a_entry_subject_lead;
drop table if exists public.t3a_never_rendered_field;
drop table if exists public.t3a_recurrence_excluded_entry_type;
drop table if exists public.t3a_multipage_only_dimension;
