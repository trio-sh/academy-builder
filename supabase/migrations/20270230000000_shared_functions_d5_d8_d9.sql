-- Step 5z (D5, D8, D9 reconciled): the four shared functions that more than one dimension changed, created ONCE as the union of D4, D5, D8 and D9.
--
-- D5 (20270201), D8 (20270211) and D9 (20270221) were built side by side on the D4 baseline and each changed the same shared functions. Applied in order, D8's patches could not find their anchors
-- and D9 re-emitted the D4 text and would have dropped the D5 and D8 additions. The D8 and D9 shared machinery files now hold only their own tables, data and non shared functions; this file is the
-- single place where the shared functions are written after all three. It must stay after 20270225 (the last D9 file) and before anything else changes these functions.
--
--   t3a_stage_form_check        D4 question bar and Stage 1 verbs; D5 the Stages a question is barred at (stage_codes); D8 verbs at every Stage (t3a_stage_form_verb_dimension); D9 verbs at every Stage (t3a_stage_form_dimension_verb).
--   t3a_dimension_compose       D4 text; D5 the Stage in the stage_form refusal; D8 a served question needs its list and the entry language gate; D9 the entry subject check and the listed word check;
--                               recurrence_blocker from the library flag and from t3a_recurrence_excluded_entry_type (the canonical register: D5, D8 and D9 record_status rows).
--   t3a_report_render_gate      D4 CR-10 and D-07; the single page route is closed for every dimension in t3a_multipage_only_dimension (the canonical register: D4, D5, D8, D9).
--   t3a_prohibited_output_check D3 text; D5 the counterpart as the subject of a rendered sentence; D8 state_observation (the vocabulary reason and the patterns of t3a_entry_language_rule).
-- Nothing else is created or dropped here. Rollback: docs/day1/evidence/rollback_step5z_reconcile_d5_d8_d9.sql.

-- ===== 1. the Stage form check =====
create or replace function public.t3a_stage_form_check(p_stage text, p_statements jsonb, p_dimension text default null) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare x jsonb; v text; st text := regexp_replace(upper(p_stage), '^S', '');
begin
  for x in select * from jsonb_array_elements(coalesce(p_statements, '[]'::jsonb)) loop
    -- D4 and D5: a question barred at this Stage (D4: Stage 1 only; D5: Stage 1 and Stage 3), by data (t3a_stage_form_question.stage_codes)
    if p_dimension is not null and exists (select 1 from public.t3a_stage_form_question q where q.dimension_id = p_dimension and q.question_code = x ->> 'question_code' and st = any (q.stage_codes)) then
      return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', 'an entry for a question barred at Stage ' || st || ' (' || (x ->> 'question_code') || ')');
    end if;
    -- D1 to D4: the performed act verbs shared by every dimension apply at Stage 1
    if st = '1' then
      for v in select verb from public.t3a_stage_form_verb loop
        if (x ->> 'text') ~* ('\m' || v || '\M') then
          return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
        end if;
      end loop;
    end if;
    if p_dimension is not null then
      -- D8: verbs a dimension may never carry at any Stage (t3a_stage_form_verb_dimension)
      for v in select d.verb from public.t3a_stage_form_verb_dimension d where d.dimension_id = p_dimension loop
        if (x ->> 'text') ~* ('\m' || v || '\M') then
          return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
        end if;
      end loop;
      -- D9: verbs a dimension may never carry at any Stage (t3a_stage_form_dimension_verb)
      for v in select d.verb from public.t3a_stage_form_dimension_verb d where d.dimension_id = p_dimension loop
        if (x ->> 'text') ~* ('\m' || v || '\M') then
          return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
        end if;
      end loop;
    end if;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $fn$;
revoke all on function public.t3a_stage_form_check(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.t3a_stage_form_check(text, jsonb, text) to service_role;

-- ===== 2. composition =====
create or replace function public.t3a_dimension_compose(p_participant uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb default '{}'::jsonb,
  p_items jsonb default '{}'::jsonb, p_observation_ref uuid default gen_random_uuid(), p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v public.t3a_d1_content_version; o public.t3a_content_object; dim text; st text := 'S' || p_stage;
  app jsonb := '{}'::jsonb; a record; q record; r record; res jsonb; k text; pv text; ans jsonb; need int; fam text; list jsonb; ids text[]; sel jsonb; sel_o jsonb; sel_c jsonb;
  bound jsonb := '{}'::jsonb; ms text; limit_kinds text[] := '{}'; line text; id uuid; clauses jsonb := '[]'::jsonb; ci jsonb := '[]'::jsonb; conds jsonb := '[]'::jsonb; el text; s jsonb;
  gate jsonb; fail jsonb; tags text[]; k2 text; arr jsonb; pn text; sf jsonb; ec jsonb; po jsonb; ecode text;
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

  -- D8 Section 5.5: a served question whose list is absent or empty on this source cannot be served (nothing is composed, nothing is written)
  if exists (select 1 from public.t3a_dimension_rule dr where dr.dimension_id = dim and dr.rule_code = 'served_question_needs_list') then
    for q in select m.question_code as cq, m.source_bound_family as bf from public.t3a_d1_question_capture_map m where m.dimension_id = dim and m.source_bound_family is not null loop
      select b.parent_question into pn from public.t3a_d1_branch_rule b where b.dimension_id = dim and b.child_question = q.cq;
      if pn is not null and coalesce(app ->> pn, 'NOT SERVED') <> 'NOT SERVED' and (jsonb_typeof(v.body -> 'source_sheet' -> q.bf) is distinct from 'array' or jsonb_array_length(v.body -> 'source_sheet' -> q.bf) = 0) then
        return public.t3a_capture_refuse('composition.commit', 'BOUND_FAMILY_ABSENT_OR_EMPTY', p_participant::text, pn || ' is served but ' || q.bf || ' is absent or empty on this source');
      end if;
    end loop;
  end if;

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
    perform public.t3a_capture_refuse('composition.commit', 'stage_form_violation', p_participant::text, (sf ->> 'statement_key') || ' uses the performed act verb ' || (sf ->> 'verb') || ' at Stage ' || p_stage);
    return jsonb_build_object('outcome', 'refused', 'reason', 'stage_form_violation', 'detail', sf::text);
  end if;
  -- D8 (Section 5.7): the entry language gate. A composed entry whose subject is the participant's state refuses state_observation; a word of another dimension refuses cross_dimension_assertion.
  sf := public.t3a_entry_language_gate(dim, res -> 'statements');
  if sf ->> 'outcome' = 'violation' then
    perform public.t3a_capture_refuse('composition.commit', sf ->> 'reason', p_participant::text, sf ->> 'detail');
    return jsonb_build_object('outcome', 'refused', 'reason', sf ->> 'reason', 'detail', sf ->> 'detail');
  end if;
  -- D9 (Section 3.2 and 5.7): a composed entry whose subject is not a statement refuses capacity_observation; a listed word refuses (cross_dimension_assertion for the acts other dimensions own).
  -- Only a dimension that registers entry subject leads is checked here.
  if exists (select 1 from public.t3a_entry_subject_lead l where l.dimension_id = dim) then
    for s in select * from jsonb_array_elements(res -> 'statements') loop
      ec := public.t3a_entry_subject_check(dim, s ->> 'text');
      if ec ->> 'outcome' = 'violation' then
        perform public.t3a_capture_refuse('composition.commit', 'capacity_observation', p_participant::text, (s ->> 'statement_key') || ': the subject of the entry is not a statement of the participant');
        return jsonb_build_object('outcome', 'refused', 'reason', 'capacity_observation', 'detail', ec::text);
      end if;
      po := public.t3a_prohibited_output_check(dim, s ->> 'text');
      if not (po ->> 'passed')::boolean then
        ecode := case when exists (select 1 from jsonb_array_elements(po -> 'findings') f where f ->> 'rule' = 'cross_dimension_assertion') then 'cross_dimension_assertion' else 'prohibited_vocabulary' end;
        perform public.t3a_capture_refuse('composition.commit', ecode, p_participant::text, (s ->> 'statement_key') || ': ' || (po -> 'findings')::text);
        return jsonb_build_object('outcome', 'refused', 'reason', ecode, 'detail', (po -> 'findings')::text);
      end if;
    end loop;
  end if;
  if p_stage = '1' then conds := conds || '["stage_1_only"]'::jsonb; end if;
  for s in select * from jsonb_array_elements(res -> 'statements') loop
    select qo.conduct_element into el from public.t3a_d1_question_object qo where qo.dimension_id = dim and qo.question_code = s ->> 'question_code';
    clauses := clauses || jsonb_build_object('conduct_element', el, 'question_code', s ->> 'question_code', 'state_code', s ->> 'statement_key', 'entry_type', s ->> 'entry_type', 'clause_text', s ->> 'text');
    ci := ci || jsonb_build_object('observation_id', p_observation_ref, 'conduct_element_id', el,
            'recurrence_equivalence_key_id', 'REK-' || dim || '-' || lpad(regexp_replace(el, '^.*-', ''), 3, '0'), 'state_code', s ->> 'statement_key',
            'recurrence_blocker', coalesce((select l.recurrence_blocker from public.t3a_d1_statement_library l where l.dimension_id = dim and l.statement_key = s ->> 'statement_key' limit 1), false)
              or exists (select 1 from public.t3a_recurrence_excluded_entry_type x where x.dimension_id = dim and x.entry_type = s ->> 'entry_type'));
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
end $fn$;

-- ===== 3. the report render gate =====
create or replace function public.t3a_report_render_gate(p_ber_report_id uuid, p_form text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; n int; mo text;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.render', 'BER_REPORT_NOT_FOUND', p_ber_report_id::text, 'no such report'); end if;
  if p_form not in ('one_page', 'multi_page') then return public.t3a_capture_refuse('report.render', 'render_input_invalid', p_ber_report_id::text, 'form must be one_page or multi_page'); end if;
  n := coalesce(cardinality(b.represented_dimension_ids), 1);
  -- CR-10 and D-07: the single page form is for the specimen only; every other report renders through the multi page renderer
  if p_form = 'one_page' and coalesce(b.specimen_render_flag, false) is not true then
    return public.t3a_capture_refuse('report.render', 'format_mismatch', p_ber_report_id::text, 'every issued report renders through the multi page renderer; the single page form is kept for the specimen only');
  end if;
  -- D-07: a report that carries a multi page only dimension has no route to the single page renderer, specimen or not
  select m.dimension_id into mo from public.t3a_multipage_only_dimension m
   where m.dimension_id = any (coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) order by m.dimension_id limit 1;
  if p_form = 'one_page' and mo is not null then
    return public.t3a_capture_refuse('report.render', 'format_mismatch', p_ber_report_id::text, 'a ' || mo || ' report renders through the multi page renderer; the single page route is closed');
  end if;
  if p_form = 'one_page' and n > 1 then
    return public.t3a_capture_refuse('report.render', 'layout_overflow', p_ber_report_id::text, 'mandatory content for ' || n || ' dimensions cannot render legibly on one page without omission or compression; the render does not expand');
  end if;
  return jsonb_build_object('outcome', 'renderable', 'form', p_form, 'dimension_blocks', n);
end $fn$;

-- ===== 4. the prohibited output check =====
create or replace function public.t3a_prohibited_output_check(p_dimension text, p_rendered text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare f jsonb := '[]'::jsonb; w record; t text := coalesce(p_rendered, ''); h text;
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
  for w in select word, reason from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension loop
    if t ~* ('(^|[^a-z0-9_])' || regexp_replace(w.word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^a-z0-9_])') then f := f || jsonb_build_object('rule', case when w.reason in ('cross_dimension_assertion', 'state_observation') then w.reason else 'retired_or_prohibited_vocabulary' end, 'detail', w.word); end if;
  end loop;
  -- the counterpart as the subject of a verb (D5 3.2): only for a dimension that registers a counterpart rule
  if exists (select 1 from public.t3a_dimension_counterpart_rule r where r.dimension_id = p_dimension) then
    h := public.t3a_counterpart_subject_hit(public.t3a_counterpart_dimension_terms(p_dimension), t);
    if h is not null then f := f || jsonb_build_object('rule', 'counterpart_as_subject', 'detail', h); end if;
  end if;
  -- a sentence whose subject is the participant's state (D8 Section 5.7)
  for w in select pattern as word, null::text as reason from public.t3a_entry_language_rule where dimension_id = p_dimension and rule_code = 'state_observation' loop
    if t ~* w.word then f := f || jsonb_build_object('rule', 'state_observation', 'detail', 'the participant''s state is the subject'); end if;
  end loop;
  -- blank rows must not read as an unmet count
  if t ~* '(0\s*(of|/)\s*[0-9]+\s*(dimensions|observations|elements))' then f := f || jsonb_build_object('rule', 'unmet_count', 'detail', 'a count of what is not met'); end if;
  return jsonb_build_object('passed', jsonb_array_length(f) = 0, 'findings', f);
end $fn$;
