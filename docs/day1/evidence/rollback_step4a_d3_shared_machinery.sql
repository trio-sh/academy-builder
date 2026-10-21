-- Rollback of 20261218000000_d3_shared_machinery.sql: restores every re-emitted function as it was and removes what the step added. Run after the D3 content rollback.
drop trigger if exists t3a_branch_rule_derive_trg on public.t3a_d1_branch_rule;
drop function if exists public.t3a_branch_rule_derive();
drop trigger if exists t3a_0_calibration_question_guard_trg on public.t3a_d1_calibration_exercise;
drop function if exists public.t3a_calibration_question_guard();
alter table public.t3a_d1_calibration_exercise drop column if exists question_codes;
drop function if exists public.t3a_load_resolution_rules(text, jsonb);
drop function if exists public.t3a_stage_form_check(text, jsonb);
drop table if exists public.t3a_stage_form_verb;
drop function if exists public.t3a_source_unready_questions(uuid);
drop function if exists public.t3a_question_calibration_ready(text, text);
drop table if exists public.t3a_question_definition;
drop function if exists public.t3a_coverage_bound(text);
delete from public.t3a_dimension_review_item where dimension_id = 'D3';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D3';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D3';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D3';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and 25);
alter table public.t3a_dimension_review_item drop column if exists display_no;
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
drop table if exists public.t3a_dimension_placeholder;
drop function if exists public.t3a_bound_item_integrity(jsonb, text);
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
  gate jsonb; fail jsonb;
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
    if line like '%LISTED:OMITTED%' or line like '%LISTED:CONTRADICTED%' then
      sel_o := coalesce(sel -> 'omitted', '[]'::jsonb); sel_c := coalesce(sel -> 'contradicted', '[]'::jsonb);
      if (line like '%LISTED:OMITTED%' and jsonb_array_length(sel_o) = 0) or (line not like '%LISTED:OMITTED%' and jsonb_array_length(sel_o) > 0)
         or (line like '%LISTED:CONTRADICTED%' and jsonb_array_length(sel_c) = 0) or (line not like '%LISTED:CONTRADICTED%' and jsonb_array_length(sel_c) > 0) then
        return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': ' || line);
      end if;
      ids := array(select jsonb_array_elements_text(sel_o) union select jsonb_array_elements_text(sel_c));
      if exists (select 1 from jsonb_array_elements_text(sel_o) x where x in (select jsonb_array_elements_text(sel_c))) then return public.t3a_capture_refuse('composition.commit', 'item_marked_twice', p_participant::text, q.question_code); end if;
      bound := bound || jsonb_build_object('omitted_causal_item_count', jsonb_array_length(sel_o), 'contradicted_causal_item_count', jsonb_array_length(sel_c));
    else
      if line like 'LISTED%' then
        if sel is null or jsonb_typeof(sel) <> 'array' or jsonb_array_length(sel) = 0 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': a listed answer needs at least one item'); end if;
        if q.answer_type ilike '%exactly one%' and jsonb_array_length(sel) <> 1 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': exactly one item'); end if;
        ids := array(select jsonb_array_elements_text(sel));
        if q.question_code like '%-02b' then bound := bound || jsonb_build_object('performed_listed_action_count', cardinality(ids)); end if;
        if q.question_code like '%-03b' then bound := bound || jsonb_build_object('contained_item_count', cardinality(ids)); end if;
      elsif sel is not null and sel <> '[]'::jsonb then
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

  if p_stage = '1' then conds := conds || '["stage_1_only"]'::jsonb; end if;
  for s in select * from jsonb_array_elements(res -> 'statements') loop
    select qo.conduct_element into el from public.t3a_d1_question_object qo where qo.dimension_id = dim and qo.question_code = s ->> 'question_code';
    clauses := clauses || jsonb_build_object('conduct_element', el, 'question_code', s ->> 'question_code', 'state_code', s ->> 'statement_key', 'entry_type', s ->> 'entry_type', 'clause_text', s ->> 'text');
    ci := ci || jsonb_build_object('observation_id', p_observation_ref, 'conduct_element_id', el,
            'recurrence_equivalence_key_id', 'REK-' || dim || '-' || lpad(regexp_replace(el, '^.*-', ''), 3, '0'), 'state_code', s ->> 'statement_key',
            'recurrence_blocker', coalesce((select l.recurrence_blocker from public.t3a_d1_statement_library l where l.dimension_id = dim and l.statement_key = s ->> 'statement_key' limit 1), false));
  end loop;
  insert into public.t3a_dimension_composed_statement (dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, missing, selections, clauses, clause_instances, conditions, test_mode)
    values (dim, p_observation_ref, p_participant, st, p_source_version, coalesce(p_answers, '{}'::jsonb), coalesce(p_missing, '{}'::jsonb), coalesce(p_items, '{}'::jsonb), clauses, ci, conds, p_test_mode)
    returning composed_statement_id into id;
  return jsonb_build_object('outcome', 'composed', 'composed_statement_id', id, 'observation_ref', p_observation_ref, 'clauses', clauses, 'clause_instances', ci, 'conditions', conds);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_resolution_coverage(p_dimension text, p_bound jsonb DEFAULT '{"affected_party_label": "the affected party", "contained_item_count": 1, "omitted_causal_item_count": 1, "performed_listed_action_count": 1, "contradicted_causal_item_count": 1}'::jsonb)
 RETURNS TABLE(stage text, question_group text, patterns integer, resolved integer, designed_refusals integer, gap_refusals integer, ambiguous integer, gaps text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g record; s int; i int; j int; total int; lens int[]; opts text[]; rem int; combo jsonb; res jsonb; qcodes text[];
  cnt_p int; cnt_r int; cnt_d int; cnt_g int; cnt_a int; gp text[];
begin
  for g in select * from public.t3a_cov_groups(p_dimension) loop
    qcodes := g.qs; lens := '{}'; total := 1;
    for j in 1..array_length(qcodes, 1) loop
      lens := lens || array_length(public.t3a_cov_options(p_dimension, qcodes[j]), 1);
      total := total * lens[j];
    end loop;
    for s in 1..4 loop
      cnt_p := 0; cnt_r := 0; cnt_d := 0; cnt_g := 0; cnt_a := 0; gp := '{}';
      for i in 0..total - 1 loop
        combo := '{}'::jsonb; rem := i;
        for j in 1..array_length(qcodes, 1) loop
          opts := public.t3a_cov_options(p_dimension, qcodes[j]);
          if opts[(rem % lens[j]) + 1] <> 'ABSENT' then combo := combo || jsonb_build_object(qcodes[j], opts[(rem % lens[j]) + 1]); end if;
          rem := rem / lens[j];
        end loop;
        -- unreachable: a child answered although its parent did not serve it
        continue when exists (select 1 from public.t3a_d1_branch_rule b where b.dimension_id = p_dimension and b.child_question is not null and combo ? b.child_question
                               and not coalesce((combo ->> b.parent_question) = any (b.serving_answers), false));
        res := public.t3a_resolve_core(p_dimension, s::text, combo, p_bound, true);
        cnt_p := cnt_p + 1;
        if res ->> 'outcome' = 'resolved' then cnt_r := cnt_r + 1;
        elsif res ->> 'reason' = 'resolution_rule' then cnt_d := cnt_d + 1;
        elsif res ->> 'reason' = 'ambiguous_resolution' then cnt_a := cnt_a + 1; gp := gp || (combo::text || ' => ' || (res ->> 'detail'));
        else
          cnt_g := cnt_g + 1;
          if coalesce(array_length(gp, 1), 0) < 5 then gp := gp || (combo::text || ' => ' || coalesce(res ->> 'reason', '') || ' ' || coalesce(res ->> 'detail', '')); end if;
        end if;
      end loop;
      stage := 'S' || s; question_group := array_to_string(qcodes, ','); patterns := cnt_p; resolved := cnt_r; designed_refusals := cnt_d; gap_refusals := cnt_g; ambiguous := cnt_a; gaps := array_to_string(gp, E'\n');
      return next;
    end loop;
  end loop;
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
  if not exists (select 1 from public.t3a_source_approval_request q where q.source_version_id = p_version) then return 'not_submitted_for_approval'; end if;
  if not exists (select 1 from public.t3a_d1_source_name_clearance c where c.source_version_id = p_version and c.status = 'cleared') then return 'name_clearance_pending'; end if;
  return null;
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_source_submit_for_approval(p_version uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; sc text;
begin
  if not public.t3a_has_administrative_standing() and not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('source.submit', 'APPROVER_LACKS_STANDING', p_version::text, 'submission for approval needs administrative standing');
  end if;
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('source.submit', 'source_version_not_found', p_version::text, 'no such version'); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  stage := v.body ->> 'stage_code';
  if o.dimension_id::text <> 'D1' then
    sc := v.body -> 'source_sheet' ->> (lower(o.dimension_id::text) || '_situation_class');
    if sc is null then return public.t3a_capture_refuse('source.submit', 'situation_class_absent_or_unknown', p_version::text, 'a null situation class blocks the approval record'); end if;
    if stage = 'S3' and not exists (select 1 from public.t3a_source_rights_record r where r.source_version_id = p_version) then
      return public.t3a_capture_refuse('source.submit', 'rights_route_absent', p_version::text, 'a Stage 3 source with no rights record cannot enter the approval queue');
    end if;
  end if;
  insert into public.t3a_source_approval_request (source_version_id, requested_by) values (p_version, auth.uid());
  return jsonb_build_object('outcome', 'queued', 'source_version_id', p_version);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_prohibited_output_check(p_dimension text, p_rendered text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f jsonb := '[]'::jsonb; w record; t text := coalesce(p_rendered, '');
begin
  -- visual elements that read as a score: dots, bars, stars, traffic lights, rings, meters, filled or unfilled markers, colour signalling quality
  if t ~* '<(svg|canvas|meter|progress)\y' then f := f || jsonb_build_object('rule', 'visual_element_in_layout', 'detail', 'svg, canvas, meter or progress element'); end if;
  if t ~* '<img\y(?![^>]*data-role="participant-photo")' then f := f || jsonb_build_object('rule', 'visual_element_in_layout', 'detail', 'image that is not the participant photo'); end if;
  if t ~ '[●○◯◐◑◒◓★☆▮▯▰▱■□▪▫🟢🟡🟠🔴🔵✔✘✓✗]' then f := f || jsonb_build_object('rule', 'score_like_glyph', 'detail', 'dot, bar, star, marker or traffic-light glyph'); end if;
  if t ~* '(traffic[-_ ]?light|progress[-_ ]?(bar|ring)|coverage[-_ ]?meter|rating[-_ ]?stars?|score[-_ ]?bar|meter-fill|bar-fill|status-(red|amber|green))' then f := f || jsonb_build_object('rule', 'score_like_element', 'detail', 'class or text names a rating visual'); end if;
  if t ~* '(background(-color)?|color)\s*:\s*(red|green|amber|orange|#(f00|0f0|ff0|c00|0c0))' then f := f || jsonb_build_object('rule', 'colour_signals_quality', 'detail', 'red, green or amber colour value'); end if;
  -- cross-dimension aggregate
  if t ~* '\y(overall|composite|average|summary judgment|dimensions met|combined (state|result)|profile)\y' then f := f || jsonb_build_object('rule', 'cross_dimension_aggregate', 'detail', 'overall, composite, average, count or profile wording'); end if;
  -- retired and prohibited vocabulary, whole words / phrases, case-insensitive
  for w in select word from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension loop
    if t ~* ('(^|[^a-z0-9_])' || regexp_replace(w.word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^a-z0-9_])') then f := f || jsonb_build_object('rule', 'retired_or_prohibited_vocabulary', 'detail', w.word); end if;
  end loop;
  -- blank rows must not read as an unmet count
  if t ~* '(0\s*(of|/)\s*[0-9]+\s*(dimensions|observations|elements))' then f := f || jsonb_build_object('rule', 'unmet_count', 'detail', 'a count of what is not met'); end if;
  return jsonb_build_object('passed', jsonb_array_length(f) = 0, 'findings', f);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_bound_item_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare bad text[]; o public.t3a_content_object;
begin
  select * into o from public.t3a_content_object where content_object_id = new.content_object_id;
  if o.family::text = 'source' and o.dimension_id::text <> 'D1' and new.body ? 'material_map' then
    bad := public.t3a_bound_item_integrity(new.body);
    if cardinality(bad) > 0 then
      perform public.t3a_capture_refuse('source.load', 'bound_item_integrity_failed', o.identifier, array_to_string(bad, ', '));
      return null;
    end if;
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_bound_item_integrity(p_body jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare fam text; it jsonb; m jsonb; bad text[] := '{}';
begin
  if jsonb_typeof(p_body -> 'material_map') is distinct from 'array' then return bad; end if;
  foreach fam in array array['available_actions', 'material_disclosure_items', 'causal_record_set', 'attribution_support_set', 'accountable_actor_set'] loop
    if jsonb_typeof(p_body -> 'source_sheet' -> fam) is distinct from 'array' then continue; end if;
    for it in select * from jsonb_array_elements(p_body -> 'source_sheet' -> fam) loop
      if coalesce(btrim(it ->> 'text'), '') = '' then bad := bad || (fam || ':' || coalesce(it ->> 'id', '?') || ':empty')::text; continue; end if;
      select x into m from jsonb_array_elements(p_body -> 'material_map') x where x ->> 'Item' = it ->> 'id' limit 1;
      if m is not null and m ->> 'Item text' is distinct from it ->> 'text' then bad := bad || (fam || ':' || (it ->> 'id'))::text; end if;
    end loop;
  end loop;
  return bad;
end $function$
;
