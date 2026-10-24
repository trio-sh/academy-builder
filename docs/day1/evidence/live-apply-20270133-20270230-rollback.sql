-- Rollback of the live apply of migrations 20270133 to 20270230 (stage entry derive first; D5, D8, D9 and their shared functions).
-- The agents' own per-step rollbacks, in reverse order, then the restore of the 20270133 trigger. Rehearsed on the throwaway database: see live-apply-20270133-20270230-verification.json.
set search_path to public, extensions;

-- ===== rollback_step5z_reconcile_d5_d8_d9.sql
-- Rollback of 20270230000000_shared_functions_d5_d8_d9.sql: restores the four shared functions as they stand after D5 alone (20270201), which read the canonical registers
-- (t3a_recurrence_excluded_entry_type, t3a_multipage_only_dimension). After this rollback D8 and D9 lose their behaviour on these functions (state observation, the entry language gate,
-- a served question needs its list, verbs at every Stage, capacity observation). The single page route stays closed for D8 and D9 because D5's gate reads the same register.
-- It does not touch any table or any other function. Run it on the throwaway database first.
begin;
create or replace function public.t3a_stage_form_check(p_stage text, p_statements jsonb, p_dimension text default null) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare x jsonb; v text; st text := regexp_replace(upper(p_stage), '^S', '');
begin
  for x in select * from jsonb_array_elements(coalesce(p_statements, '[]'::jsonb)) loop
    -- a question barred at this Stage (D4: Stage 1 only; D5: Stage 1 and Stage 3)
    if p_dimension is not null and exists (select 1 from public.t3a_stage_form_question q where q.dimension_id = p_dimension and q.question_code = x ->> 'question_code' and st = any (q.stage_codes)) then
      return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', 'an entry for a question barred at Stage ' || st || ' (' || (x ->> 'question_code') || ')');
    end if;
    if st = '1' then
      for v in select verb from public.t3a_stage_form_verb loop
        if (x ->> 'text') ~* ('\m' || v || '\M') then
          return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
        end if;
      end loop;
    end if;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $fn$;

create or replace function public.t3a_dimension_compose(p_participant uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb default '{}'::jsonb,
  p_items jsonb default '{}'::jsonb, p_observation_ref uuid default gen_random_uuid(), p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
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
    perform public.t3a_capture_refuse('composition.commit', 'stage_form_violation', p_participant::text, (sf ->> 'statement_key') || ' uses the performed act verb ' || (sf ->> 'verb') || ' at Stage ' || p_stage);
    return jsonb_build_object('outcome', 'refused', 'reason', 'stage_form_violation', 'detail', sf::text);
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
    if t ~* ('(^|[^a-z0-9_])' || regexp_replace(w.word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^a-z0-9_])') then f := f || jsonb_build_object('rule', case when w.reason = 'cross_dimension_assertion' then 'cross_dimension_assertion' else 'retired_or_prohibited_vocabulary' end, 'detail', w.word); end if;
  end loop;
  -- the counterpart as the subject of a verb (D5 3.2): only for a dimension that registers a counterpart rule
  if exists (select 1 from public.t3a_dimension_counterpart_rule r where r.dimension_id = p_dimension) then
    h := public.t3a_counterpart_subject_hit(public.t3a_counterpart_dimension_terms(p_dimension), t);
    if h is not null then f := f || jsonb_build_object('rule', 'counterpart_as_subject', 'detail', h); end if;
  end if;
  -- blank rows must not read as an unmet count
  if t ~* '(0\s*(of|/)\s*[0-9]+\s*(dimensions|observations|elements))' then f := f || jsonb_build_object('rule', 'unmet_count', 'detail', 'a count of what is not met'); end if;
  return jsonb_build_object('passed', jsonb_array_length(f) = 0, 'findings', f);
end $fn$;
revoke all on function public.t3a_stage_form_check(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.t3a_stage_form_check(text, jsonb, text) to service_role;
commit;


-- ===== rollback_step7b_d9_session_archive_content.sql
-- Rollback of 20270225000000_d9_session_archive_content.sql: removes the 30 inactive draft records of the D9 package. The registry table is append only, so the guard is lifted for this delete only.
-- Valid while the activation flag is off and no D9 record has been approved (a draft carries no approval, so nothing else reads it).
alter table public.t3a_lsa_registry_record disable trigger t3a_append_only;
delete from public.t3a_lsa_registry_record where package_id = 'T3A-D9-LSA-CONTENT-001' and status = 'draft_for_approval';
alter table public.t3a_lsa_registry_record enable trigger t3a_append_only;


-- ===== rollback_step5c_d9_seeds.sql
-- Rollback of 20270224000000_d9_seeds.sql. Removes only D9 rows and sets the review item bound back to the larger of 29 and the highest item left (D5 and D8 items may still be there; CR-291). Run before the D9 content rollback.
-- PV-D9-1.0 stays (loaded by CR-16); the eleven words marked cross_dimension_assertion return to the reason CR-16 gave them.
delete from public.t3a_question_definition where dimension_id = 'D9';
delete from public.t3a_stage_form_question where dimension_id = 'D9';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D9';
delete from public.t3a_dimension_review_item where dimension_id = 'D9';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
do $c$ declare m int; begin
  select greatest(coalesce(max(item_no), 0), 29) into m from public.t3a_dimension_review_item;
  execute format('alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and %s)', m);
end $c$;
update public.t3a_rce_prohibited_vocabulary set reason = 'T3A-D9 Execution Edition v1.1 Section 5.7a prohibited vocabulary' where dimension_id = 'D9' and version = 'PV-D9-1.0' and reason = 'cross_dimension_assertion';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D9' and version = 'PV-D9-4.2';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D9';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D9';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D9';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;


-- ===== rollback_step5b_d9_content.sql
-- Rollback of 20270222000000_d9_content_registry.sql and 20270223000000_d9_demonstration_fixtures.sql. Removes only D9 rows (the registry table and the added statement columns stay: D2, D3 and D4 use them).
-- The D9 vocabulary PV-D9-1.0 is not removed: it was loaded by migration 20270123 (CR-16), before the D9 content, and the content load only adds nothing to it. Valid while no D9 content has been approved or used.
alter table public.t3a_source_drafting_test disable trigger t3a_append_only;
alter table public.t3a_source_drafting_test disable trigger t3a_0_drafting_test_guard_trg;
alter table public.t3a_source_authorship disable trigger t3a_append_only;
delete from public.t3a_source_drafting_test where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D9');
alter table public.t3a_source_drafting_test enable trigger t3a_append_only;
alter table public.t3a_source_drafting_test enable trigger t3a_0_drafting_test_guard_trg;
delete from public.t3a_source_authorship where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D9');
alter table public.t3a_source_authorship enable trigger t3a_append_only;
delete from public.t3a_d1_content_load_event where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D9');
delete from public.t3a_d1_statement_library where dimension_id = 'D9';
delete from public.t3a_d1_content_version where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D9');
delete from public.t3a_content_object where dimension_id = 'D9';
delete from public.t3a_d1_condition_precedence where dimension_id = 'D9';
delete from public.t3a_d1_language_template where dimension_id = 'D9';
delete from public.t3a_d1_branch_rule where dimension_id = 'D9';
delete from public.t3a_d1_question_capture_map where dimension_id = 'D9';
delete from public.t3a_d1_capture_line where dimension_id = 'D9';
delete from public.t3a_d1_capture_set where dimension_id = 'D9';
delete from public.t3a_question_definition where dimension_id = 'D9';
delete from public.t3a_d1_question_object where dimension_id = 'D9';
alter table public.t3a_resolution_refusal_rule disable trigger t3a_append_only;
delete from public.t3a_resolution_refusal_rule where dimension_id = 'D9';
alter table public.t3a_resolution_refusal_rule enable trigger t3a_append_only;


-- ===== rollback_step5a_d9_shared_machinery.sql
-- Rollback of 20270221000000_d9_shared_machinery.sql: restores the two functions it re-emitted (t3a_prior_exposure and t3a_source_approval_preconditions) exactly as they were in production before the step (read from the baseline built from migrations up to 20270132), and removes what the step added. Reconciliation (CR-290): the step no longer re-creates the render gate, the composition or the Stage form check; rollback_step5z_reconcile_d5_d8_d9.sql restores those and MUST run first (the union functions read this step's tables).
-- Run after 5z and the D9 seeds, content and Session Archive rollbacks. Valid while no D9 content has been approved or used.
-- D9 rows in the canonical registers created by the D5 step (append only tables: the guard is lifted for these two deletes only; the tables themselves belong to D5)
alter table public.t3a_multipage_only_dimension disable trigger t3a_append_only;
delete from public.t3a_multipage_only_dimension where dimension_id = 'D9';
alter table public.t3a_multipage_only_dimension enable trigger t3a_append_only;
alter table public.t3a_recurrence_excluded_entry_type disable trigger t3a_append_only;
delete from public.t3a_recurrence_excluded_entry_type where dimension_id = 'D9';
alter table public.t3a_recurrence_excluded_entry_type enable trigger t3a_append_only;
drop trigger if exists t3a_3_capacity_observation_guard_trg on public.t3a_d1_content_version;
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


-- ===== rollback_step11e_d8_session_archive_content.sql
-- Rollback of 20270216000000_d8_session_archive_content.sql: removes the thirty D8 draft records (the registry table and its routines stay: the D4 content and the module use them). The records are drafts and nothing reads them.
alter table public.t3a_lsa_registry_record disable trigger t3a_append_only;
delete from public.t3a_lsa_registry_record where package_id = 'T3A-D8-LSA-CONTENT-001' and status = 'draft_for_approval';
alter table public.t3a_lsa_registry_record enable trigger t3a_append_only;


-- ===== rollback_step11d_d8_content_flags.sql
-- Rollback of 20270215000000_d8_content_flags.sql. Removes the D8 all-stage verbs; the vocabulary reasons it set are on D8 rows, which the seeds and content rollbacks delete. Run first.
delete from public.t3a_stage_form_verb_dimension where dimension_id = 'D8';
update public.t3a_rce_prohibited_vocabulary set reason = null where dimension_id = 'D8' and version = 'PV-D8-1.0' and reason = 'state_observation';
update public.t3a_rce_prohibited_vocabulary set reason = null where dimension_id = 'D8' and version = 'PV-D8-1.0' and reason = 'cross_dimension_assertion';


-- ===== rollback_step11c_d8_seeds.sql
-- Rollback of 20270214000000_d8_seeds.sql. Removes only D8 rows and sets the review item bound back to the larger of 29 and the highest item left. Run before the D8 content rollback.
delete from public.t3a_question_definition where dimension_id = 'D8';
delete from public.t3a_stage_form_question where dimension_id = 'D8';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D8';
delete from public.t3a_dimension_review_item where dimension_id = 'D8';
do $c$ declare m int; begin
  select greatest(coalesce(max(item_no), 0), 29) into m from public.t3a_dimension_review_item;
  alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
  execute format('alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and %s)', m);
end $c$;
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D8';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D8';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D8';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D8';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;


-- ===== rollback_step11b_d8_content.sql
-- Rollback of 20270212000000_d8_content_registry.sql and 20270213000000_d8_demonstration_fixtures.sql. Removes only D8 rows (the registry table and the added statement columns stay: D2 to D4 use them). Valid while no D8 content has been approved or used. Run after the D8 seeds, flags and Session Archive rollbacks and before the machinery rollback.
alter table public.t3a_source_truth_field disable trigger t3a_append_only;
delete from public.t3a_source_truth_field where dimension_id = 'D8';
alter table public.t3a_source_truth_field enable trigger t3a_append_only;
alter table public.t3a_source_drafting_test disable trigger t3a_append_only;
alter table public.t3a_source_drafting_test disable trigger t3a_0_drafting_test_guard_trg;
alter table public.t3a_source_authorship disable trigger t3a_append_only;
delete from public.t3a_source_drafting_test where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D8');
alter table public.t3a_source_drafting_test enable trigger t3a_append_only;
alter table public.t3a_source_drafting_test enable trigger t3a_0_drafting_test_guard_trg;
delete from public.t3a_source_authorship where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D8');
alter table public.t3a_source_authorship enable trigger t3a_append_only;
delete from public.t3a_d1_content_load_event where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D8');
delete from public.t3a_d1_statement_library where dimension_id = 'D8';
delete from public.t3a_d1_content_version where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D8');
delete from public.t3a_content_object where dimension_id = 'D8';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D8';
delete from public.t3a_d1_condition_precedence where dimension_id = 'D8';
delete from public.t3a_d1_language_template where dimension_id = 'D8';
delete from public.t3a_d1_branch_rule where dimension_id = 'D8';
delete from public.t3a_d1_question_capture_map where dimension_id = 'D8';
delete from public.t3a_d1_capture_line where dimension_id = 'D8';
delete from public.t3a_d1_capture_set where dimension_id = 'D8';
delete from public.t3a_question_definition where dimension_id = 'D8';
delete from public.t3a_d1_question_object where dimension_id = 'D8';
alter table public.t3a_resolution_refusal_rule disable trigger t3a_append_only;
delete from public.t3a_resolution_refusal_rule where dimension_id = 'D8';
alter table public.t3a_resolution_refusal_rule enable trigger t3a_append_only;
-- the guard function re-emitted by the content step is restored
CREATE OR REPLACE FUNCTION public.t3a_d1_question_capture_map_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if not exists (select 1 from public.t3a_d1_question_object q where q.question_code = new.question_code and q.dimension_id = new.dimension_id) then
    raise exception 'QUESTION_CODE_NOT_REGISTERED: % is not a question object', new.question_code using errcode = '23514';
  end if;
  if new.dimension_id = 'D1' and new.source_bound_family is not null and not exists (
    select 1 from public.t3a_d1_served_questions('{}'::jsonb) q
    where q.bound_family = new.source_bound_family and (q.question_code = new.question_code or q.question_code = new.question_code || '-child')) then
    raise exception 'BOUND_FAMILY_MISMATCH: the serving logic does not bind % to %', new.question_code, new.source_bound_family using errcode = '23514';
  end if;
  return new;
end $function$;


-- ===== rollback_step11a_d8_shared_machinery.sql
-- Rollback of 20270211000000_d8_shared_machinery.sql: removes what the step added (D8 tables, guards and rows). Reconciliation (CR-290): the step no longer patches or re-creates any shared function, so there is nothing to restore here; the four shared functions are restored by rollback_step5z_reconcile_d5_d8_d9.sql, which MUST run first (the union functions read this step's tables). Order: 5z, then the D9 rollbacks, then these D8 rollbacks (11e, 11d, 11c, 11b, 11a), then the D5 rollbacks. Valid while no D8 source and no D8 commit exists: the source truth table is dropped, and the withheld source fields it holds are gone with it.
-- D8 rows in the canonical registers created by the D5 step (append only tables: the guard is lifted for these two deletes only)
alter table public.t3a_multipage_only_dimension disable trigger t3a_append_only;
delete from public.t3a_multipage_only_dimension where dimension_id = 'D8';
alter table public.t3a_multipage_only_dimension enable trigger t3a_append_only;
alter table public.t3a_recurrence_excluded_entry_type disable trigger t3a_append_only;
delete from public.t3a_recurrence_excluded_entry_type where dimension_id = 'D8';
alter table public.t3a_recurrence_excluded_entry_type enable trigger t3a_append_only;
drop trigger if exists t3a_2_source_boundary_guard_trg on public.t3a_d1_content_version;
drop trigger if exists t3a_2_source_truth_keep_trg on public.t3a_d1_content_version;
drop function if exists public.t3a_source_boundary_guard();
drop function if exists public.t3a_source_truth_keep();
drop function if exists public.t3a_source_truth(uuid);
drop function if exists public.t3a_entry_language_gate(text, jsonb);
alter table public.t3a_source_truth_field disable trigger t3a_append_only;
drop table if exists public.t3a_source_truth_field;
drop table if exists public.t3a_dimension_withheld_field;
drop table if exists public.t3a_dimension_source_field;
drop table if exists public.t3a_entry_language_rule;
drop table if exists public.t3a_stage_form_verb_dimension;
alter table public.t3a_dimension_rule disable trigger t3a_append_only;
drop table if exists public.t3a_dimension_rule;


-- ===== rollback_step5d_d5_session_archive_content.sql
-- Rollback of 20270205000000_d5_session_archive_content.sql: removes the 30 inactive draft records of T3A-D5-LSA-CONTENT-001 (the registry table and the D4 records stay). Nothing reads a draft. Valid while none of them has been approved or activated.
alter table public.t3a_lsa_registry_record disable trigger t3a_append_only;
delete from public.t3a_lsa_registry_record where package_id = 'T3A-D5-LSA-CONTENT-001' and status = 'draft_for_approval';
alter table public.t3a_lsa_registry_record enable trigger t3a_append_only;


-- ===== rollback_step5c_d5_seeds.sql
-- Rollback of 20270204000000_d5_seeds.sql. Removes only D5 rows and restores the review item bound to 29. Run before the D5 content rollback.
delete from public.t3a_question_definition where dimension_id = 'D5';
delete from public.t3a_stage_form_question where dimension_id = 'D5';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D5';
delete from public.t3a_dimension_review_item where dimension_id = 'D5';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
do $c$ declare m int; begin
  select greatest(coalesce(max(item_no), 0), 29) into m from public.t3a_dimension_review_item;
  execute format('alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and %s)', m);
end $c$;
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D5';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D5';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D5';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D5';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;


-- ===== rollback_step5b_d5_content.sql
-- Rollback of 20270202000000_d5_content_registry.sql and 20270203000000_d5_demonstration_fixtures.sql. Removes only D5 rows (the registry table and the added statement columns stay: D2 to D4 use them). Valid while no D5 content has been approved or used. Run after the D5 seeds rollback.
alter table public.t3a_source_drafting_test disable trigger t3a_append_only;
alter table public.t3a_source_drafting_test disable trigger t3a_0_drafting_test_guard_trg;
alter table public.t3a_source_authorship disable trigger t3a_append_only;
delete from public.t3a_source_drafting_test where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D5');
alter table public.t3a_source_drafting_test enable trigger t3a_append_only;
alter table public.t3a_source_drafting_test enable trigger t3a_0_drafting_test_guard_trg;
delete from public.t3a_source_authorship where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D5');
alter table public.t3a_source_authorship enable trigger t3a_append_only;
-- the counterpart role, position and the notes that carry their names (kept out of the readable source bodies)
alter table public.t3a_source_sequestered_field disable trigger t3a_append_only;
delete from public.t3a_source_sequestered_field where content_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D5');
alter table public.t3a_source_sequestered_field enable trigger t3a_append_only;
delete from public.t3a_d1_content_load_event where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D5');
delete from public.t3a_d1_statement_library where dimension_id = 'D5';
delete from public.t3a_d1_content_version where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D5');
delete from public.t3a_content_object where dimension_id = 'D5';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D5';
delete from public.t3a_d1_condition_precedence where dimension_id = 'D5';
delete from public.t3a_d1_language_template where dimension_id = 'D5';
delete from public.t3a_d1_branch_rule where dimension_id = 'D5';
delete from public.t3a_d1_question_capture_map where dimension_id = 'D5';
delete from public.t3a_d1_capture_line where dimension_id = 'D5';
delete from public.t3a_d1_capture_set where dimension_id = 'D5';
delete from public.t3a_question_definition where dimension_id = 'D5';
delete from public.t3a_d1_question_object where dimension_id = 'D5';
alter table public.t3a_resolution_refusal_rule disable trigger t3a_append_only;
delete from public.t3a_resolution_refusal_rule where dimension_id = 'D5';
alter table public.t3a_resolution_refusal_rule enable trigger t3a_append_only;


-- ===== rollback_step5a_d5_shared_machinery.sql
-- Rollback of 20270201000000_d5_shared_machinery.sql: restores the four re-created functions as they were in production before the step (the D4 text of the Stage form check and of composition, the CR-10 text of the render gate, the D3 text of the prohibited output check)
-- and removes what the step added, including the two canonical registers D8 and D9 also write to (t3a_multipage_only_dimension, t3a_recurrence_excluded_entry_type): run it last, after the D8 and D9 rollbacks and
-- rollback_step5z_reconcile_d5_d8_d9.sql. Run after the D5 Session Archive content, seeds and content rollbacks. Valid while no D5 source has been approved or used.
drop trigger if exists t3a_1_counterpart_load_guard_trg on public.t3a_d1_content_version;
drop trigger if exists t3a_1_counterpart_entry_guard_trg on public.t3a_d1_statement_library;
drop function if exists public.t3a_counterpart_load_guard();
drop function if exists public.t3a_counterpart_entry_guard();
drop function if exists public.t3a_d5_reference_card(text);
drop function if exists public.t3a_source_counterpart(uuid);
drop function if exists public.t3a_rendered_output_scan(text, text, text);
drop function if exists public.t3a_counterpart_dimension_terms(text);
drop function if exists public.t3a_counterpart_subject_hit(text[], text);
drop function if exists public.t3a_counterpart_terms(text);
drop table if exists public.t3a_source_sequestered_field;
drop table if exists public.t3a_dimension_counterpart_rule;
drop table if exists public.t3a_recurrence_excluded_entry_type;
create or replace function public.t3a_stage_form_check(p_stage text, p_statements jsonb, p_dimension text default null) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
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
end $fn$;
create or replace function public.t3a_dimension_compose(p_participant uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb default '{}'::jsonb,
  p_items jsonb default '{}'::jsonb, p_observation_ref uuid default gen_random_uuid(), p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
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
end $fn$;
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
create or replace function public.t3a_prohibited_output_check(p_dimension text, p_rendered text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
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
  for w in select word, reason from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension loop
    if t ~* ('(^|[^a-z0-9_])' || regexp_replace(w.word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^a-z0-9_])') then f := f || jsonb_build_object('rule', case when w.reason = 'cross_dimension_assertion' then 'cross_dimension_assertion' else 'retired_or_prohibited_vocabulary' end, 'detail', w.word); end if;
  end loop;
  -- blank rows must not read as an unmet count
  if t ~* '(0\s*(of|/)\s*[0-9]+\s*(dimensions|observations|elements))' then f := f || jsonb_build_object('rule', 'unmet_count', 'detail', 'a count of what is not met'); end if;
  return jsonb_build_object('passed', jsonb_array_length(f) = 0, 'findings', f);
end $fn$;
drop table if exists public.t3a_multipage_only_dimension;
alter table public.t3a_stage_form_question drop column if exists stage_codes;


-- ===== 20270133 stage entry derive first: the derive trigger goes back to its earlier name (it ran last of the before-insert triggers)
drop trigger if exists t3a_00_stage_entry_event_derive_trg on public.t3a_stage_entry_event;
drop trigger if exists t3a_stage_entry_event_derive_trg on public.t3a_stage_entry_event;
create trigger t3a_stage_entry_event_derive_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_stage_entry_event_derive();
