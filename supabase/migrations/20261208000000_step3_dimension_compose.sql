-- Step 3e: the dimension determination commit guard and the immutable composed statement (D2 INS-002 rules 030 to 044, INS-003 046, 050, 052).
--
-- t3a_dimension_compose checks what the mentor selected against the SERVED source (applicability read from the source's own table, bound items drawn
-- only from that source version, controlled missing states only, no free text), resolves it through the resolution service, and stores ONE immutable
-- composed statement. It does not write the observation; the canonical commit route does, with the composed statement id.
--
-- Production mode needs a servable source (the serving gate) and resolves only approved statements, so it refuses everything until a person with
-- standing has approved them. Test mode is the service route only.

alter table public.t3a_d1_statement_library add column if not exists recurrence_blocker boolean not null default false;
update public.t3a_d1_statement_library set recurrence_blocker = true where dimension_id = 'D2' and statement_key = 'ST-D2-053';

create table if not exists public.t3a_dimension_composed_statement (
  composed_statement_id uuid primary key default gen_random_uuid(),
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  observation_ref uuid not null,
  participant_id uuid not null,
  stage_code text not null check (stage_code in ('S1', 'S2', 'S3', 'S4')),
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id),
  answers jsonb not null,
  missing jsonb not null default '{}'::jsonb,
  selections jsonb not null default '{}'::jsonb,
  clauses jsonb not null,
  clause_instances jsonb not null,
  conditions jsonb not null default '[]'::jsonb,
  test_mode boolean not null default false,
  composed_at timestamptz not null default now(),
  unique (observation_ref)
);
comment on table public.t3a_dimension_composed_statement is 'One immutable composed statement per observation (D2 INS-003 046). composed_statement_id identifies the composed entity, not an array of clause identifiers.';
alter table public.t3a_dimension_composed_statement enable row level security;
revoke all on public.t3a_dimension_composed_statement from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_dimension_composed_statement;
create trigger t3a_append_only before update or delete on public.t3a_dimension_composed_statement for each row execute function public.t3a_deny_mutation();

create or replace function public.t3a_dimension_compose(p_participant uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb default '{}'::jsonb,
  p_items jsonb default '{}'::jsonb, p_observation_ref uuid default gen_random_uuid(), p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
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
end $fn$;
revoke all on function public.t3a_dimension_compose(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, boolean) from public, anon;
grant execute on function public.t3a_dimension_compose(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, boolean) to authenticated, service_role;

-- Clause instances are compared only within a dimension, and only through an approved recurrence-equivalence key (D2 INS-003 049, 054).
create or replace function public.t3a_clause_instances_compare(p_a jsonb, p_b jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare da text := substring(p_a ->> 'recurrence_equivalence_key_id' from '^REK-(D[0-9]+)-'); db text := substring(p_b ->> 'recurrence_equivalence_key_id' from '^REK-(D[0-9]+)-');
begin
  if da is distinct from db then
    return public.t3a_capture_refuse('composition.compare', 'dimension_isolation_violation', coalesce(da, '?') || '/' || coalesce(db, '?'), 'keys are dimension scoped and there is no cross-dimension equivalence');
  end if;
  if (p_a ->> 'recurrence_equivalence_key_id') is distinct from (p_b ->> 'recurrence_equivalence_key_id') or (p_a ->> 'recurrence_blocker')::boolean or (p_b ->> 'recurrence_blocker')::boolean then
    return jsonb_build_object('outcome', 'compared', 'equivalent', false);
  end if;
  return jsonb_build_object('outcome', 'compared', 'equivalent', (p_a ->> 'state_code') = (p_b ->> 'state_code'));
end $fn$;
revoke all on function public.t3a_clause_instances_compare(jsonb, jsonb) from public, anon;
grant execute on function public.t3a_clause_instances_compare(jsonb, jsonb) to authenticated, service_role;
