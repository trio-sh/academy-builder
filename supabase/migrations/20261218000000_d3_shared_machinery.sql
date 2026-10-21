-- Step 4a: what D3 needs from the shared machinery (D3 build package v2.0, decisions D-05 and the D3 only tests D3-49, D3-50, D3-58 to D3-61).
--
-- 1. Placeholder grammar as data (so composition no longer names the D2 counts), 2. composition generalized to tagged and plain bound selections, 3. the D3 seeds the D2 step wrote for D2 only
-- (pattern families, cooldown ladder, review items, closed retired list), 4. the question definition register with calibration_ready, refused at production approval and at calibration,
-- 5. the stage form check on Stage 1 statements, 6. a loader that refuses a whole resolution table when one row names an unknown question.

-- ===== 1. placeholder grammar as data =====
create table if not exists public.t3a_dimension_placeholder (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), placeholder_name text not null, kind text not null, bound_to text not null, grammar text not null,
  primary key (dimension_id, placeholder_name)
);
alter table public.t3a_dimension_placeholder enable row level security;
revoke all on public.t3a_dimension_placeholder from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_dimension_placeholder;
create trigger t3a_append_only before update or delete on public.t3a_dimension_placeholder for each row execute function public.t3a_deny_mutation();
insert into public.t3a_dimension_placeholder(dimension_id, placeholder_name, kind, bound_to, grammar) values
  ('D2','performed_listed_action_count','count','Q-D2-02b LISTED','whole number from 1 to the number of items in available_actions'),
  ('D2','contained_item_count','count','Q-D2-03b LISTED','whole number from 1 to the number of items in material_disclosure_items'),
  ('D2','omitted_causal_item_count','count','Q-D2-05b LISTED:OMITTED','whole number from 1 to the number of items in causal_record_set'),
  ('D2','contradicted_causal_item_count','count','Q-D2-05b LISTED:CONTRADICTED','whole number from 1 to the number of items in causal_record_set'),
  ('D2','affected_party_label','label','affected_party','the value of affected_party on the served source'),
  ('D3','placed_item_count','count','Q-D3-01b LISTED','whole number from 1 to the number of items in work_items'),
  ('D3','affected_component_count','count','Q-D3-02b LISTED','whole number from 1 to the number of items in deliverable_components'),
  ('D3','held_requirement_count','count','Q-D3-03b LISTED','whole number from 1 to the number of items in stated_requirements'),
  ('D3','identified_check_count','count','Q-D3-04b LISTED','whole number from 1 to the number of items in available_checks'),
  ('D3','identified_means_count','count','Q-D3-05b LISTED','whole number from 1 to the number of items in available_means'),
  ('D3','identified_component_count','count','Q-D3-07b LISTED','whole number from 1 to the number of items in deliverable_components'),
  ('D3','overstated_component_count','count','Q-D3-09 LISTED:OVERSTATED','whole number from 1 to the number of items in deliverable_components'),
  ('D3','understated_component_count','count','Q-D3-09 LISTED:UNDERSTATED','whole number from 1 to the number of items in deliverable_components')
on conflict do nothing;

-- ===== 2. composition, generalized (the D2 behavior is unchanged) =====
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

  sf := public.t3a_stage_form_check(p_stage, res -> 'statements');
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
  insert into public.t3a_dimension_composed_statement (dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, missing, selections, clauses, clause_instances, conditions, test_mode)
    values (dim, p_observation_ref, p_participant, st, p_source_version, coalesce(p_answers, '{}'::jsonb), coalesce(p_missing, '{}'::jsonb), coalesce(p_items, '{}'::jsonb), clauses, ci, conds, p_test_mode)
    returning composed_statement_id into id;
  return jsonb_build_object('outcome', 'composed', 'composed_statement_id', id, 'observation_ref', p_observation_ref, 'clauses', clauses, 'clause_instances', ci, 'conditions', conds);
end $fn$;

-- ===== 0. A branch rule loaded for a dimension derives its parent, child and serving answers from its own condition and effect text (the D2 step did this once, by update, for the rows that existed then) =====
create or replace function public.t3a_branch_rule_derive() returns trigger language plpgsql as $fn$
begin
  if new.dimension_id <> 'D1' and new.parent_question is null and new.rule_condition ~ '^Q-D[0-9]+-[0-9a-z]+ returns A' then
    new.parent_question := substring(new.rule_condition from '^(Q-D[0-9]+-[0-9a-z]+) returns');
    new.child_question := substring(new.rule_effect from '^(Q-D[0-9]+-[0-9a-z]+) served');
    new.serving_answers := string_to_array(replace(substring(new.rule_condition from 'returns (.+)$'), ' ', ''), ',');
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_branch_rule_derive_trg on public.t3a_d1_branch_rule;
create trigger t3a_branch_rule_derive_trg before insert on public.t3a_d1_branch_rule for each row execute function public.t3a_branch_rule_derive();
update public.t3a_d1_branch_rule set
  parent_question = substring(rule_condition from '^(Q-D[0-9]+-[0-9a-z]+) returns'),
  child_question = substring(rule_effect from '^(Q-D[0-9]+-[0-9a-z]+) served'),
  serving_answers = string_to_array(replace(substring(rule_condition from 'returns (.+)$'), ' ', ''), ',')
 where dimension_id <> 'D1' and parent_question is null and rule_condition ~ '^Q-D[0-9]+-[0-9a-z]+ returns A';

-- ===== 3. the seeds D2 wrote for D2 only, for D3 =====
insert into public.t3a_interaction_pattern_family(dimension_id, situation_class, interaction_pattern_family_id) values
  ('D3','SC-D3-1','IPF-D3-01'),
  ('D3','SC-D3-2','IPF-D3-02'),
  ('D3','SC-D3-3','IPF-D3-03'),
  ('D3','SC-D3-4','IPF-D3-04'),
  ('D3','SC-D3-5','IPF-D3-05'),
  ('D3','SC-D3-6','IPF-D3-06'),
  ('D3','SC-D3-7','IPF-D3-07')
on conflict do nothing;

-- D3 4.1 restates the platform cooldown ladder (seven days after the first completed observation, fourteen after the second, none after the third).
insert into public.t3a_d1_specification_cooldown (dimension_id, completed_observations, wait_days, issued_under, note)
  select 'D3', completed_observations, wait_days, issued_under, 'D3 4.1 restates the platform ladder (T3A-D1-EXEC-CORR-006 Section 8)' from public.t3a_d1_specification_cooldown where dimension_id = 'D1'
  on conflict do nothing;

-- The closed retired list of D3 Section 4.2 is the same closed list as D2 Section 4.2.
insert into public.t3a_rce_prohibited_vocabulary (dimension_id, word, version, reason)
  select 'D3', word, 'PV-D3-4.2', 'D3 Section 4.2 retired vocabulary, closed list' from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D2' and version = 'PV-D2-4.2'
  on conflict do nothing;

-- The checklist has twenty five items for D3 as for D2: items 1 to 23 are shared; the last two are dimension specific. Internal item numbers 26 and 27 are D3's items 24 and 25 (display_no).
alter table public.t3a_dimension_review_item add column if not exists display_no int;
update public.t3a_dimension_review_item set display_no = item_no where display_no is null;
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and 27);
insert into public.t3a_dimension_review_item (item_no, dimension_id, requirement, display_no) values
  (26, 'D3', 'D3 specific: no rendered D3 sentence uses a verb of purpose or disposition (checked against the Section 3.2 prohibited-verb list on rendered output).', 24),
  (27, 'D3', 'D3 specific: no element of the report is computed across dimensions, and no rendered D3 sentence names a third party.', 25)
on conflict do nothing;

-- ===== the coverage test needs no D2 bound names: its default bound values come from the placeholder table =====
create or replace function public.t3a_coverage_bound(p_dimension text) returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_object_agg(placeholder_name, case when kind = 'count' then to_jsonb(1) else to_jsonb('the affected party'::text) end), '{}'::jsonb) from public.t3a_dimension_placeholder where dimension_id = p_dimension
$fn$;

-- The coverage test, with default bound values read from the placeholder table.
create or replace function public.t3a_resolution_coverage(p_dimension text, p_bound jsonb default null)
returns table (stage text, question_group text, patterns int, resolved int, designed_refusals int, gap_refusals int, ambiguous int, gaps text)
language plpgsql stable security definer set search_path = public as $fn$
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
        res := public.t3a_resolve_core(p_dimension, s::text, combo, coalesce(p_bound, public.t3a_coverage_bound(p_dimension)), true);
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
end $fn$;

-- ===== 4. The question definition register (D3 D-05): one row per question and answer; the five semantic fields load EMPTY and are never written by this build =====
create table if not exists public.t3a_question_definition (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  question_id text not null, answer_id text not null, version text not null default '1.0',
  exact_stem text, stage_applicability text, required_or_conditional text,
  operational_definition text, minimum_observable_evidence text, inclusion_example text, exclusion_example text, ambiguity_rule text,
  missing_state_route text, child_branch_rule text, statement_mapping text, effective_date date, retirement_state text not null default 'active',
  primary key (dimension_id, question_id, answer_id, version)
);
alter table public.t3a_question_definition enable row level security;
revoke all on public.t3a_question_definition from anon, authenticated;

-- The structural rows of the register are loaded after the D3 content (migration 20261221).

-- A question is calibration ready only when every answer row of its latest active version holds all five semantic fields. A question with no rows is not ready. Nothing defaults to true.
create or replace function public.t3a_question_calibration_ready(p_dimension text, p_question text) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_question_definition d where d.dimension_id = p_dimension and d.question_id = p_question and d.retirement_state = 'active')
     and not exists (select 1 from public.t3a_question_definition d where d.dimension_id = p_dimension and d.question_id = p_question and d.retirement_state = 'active'
       and (coalesce(btrim(d.operational_definition), '') = '' or coalesce(btrim(d.minimum_observable_evidence), '') = '' or coalesce(btrim(d.inclusion_example), '') = ''
            or coalesce(btrim(d.exclusion_example), '') = '' or coalesce(btrim(d.ambiguity_rule), '') = ''))
$fn$;
revoke all on function public.t3a_question_calibration_ready(text, text) from public, anon;
grant execute on function public.t3a_question_calibration_ready(text, text) to authenticated, service_role;

-- The served questions of a source version that are not ready. A dimension with no register is not subject to the rule (D2 has none).
create or replace function public.t3a_source_unready_questions(p_version uuid) returns text[] language plpgsql stable security definer set search_path = public as $fn$
declare dim text; qs text[];
begin
  select o.dimension_id::text into dim from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where v.content_version_id = p_version;
  if dim is null or not exists (select 1 from public.t3a_question_definition d where d.dimension_id = dim) then return '{}'; end if;
  select coalesce(array_agg(x ->> 'question' order by x ->> 'question'), '{}') into qs
    from public.t3a_d1_content_version v, jsonb_array_elements(coalesce(v.body -> 'question_applicability', '[]'::jsonb)) x
   where v.content_version_id = p_version and coalesce(x ->> 'state', 'NOT SERVED') <> 'NOT SERVED' and not public.t3a_question_calibration_ready(dim, x ->> 'question');
  return qs;
end $fn$;
revoke all on function public.t3a_source_unready_questions(uuid) from public, anon;
grant execute on function public.t3a_source_unready_questions(uuid) to authenticated, service_role;

-- The approval preconditions and the submission route, with the question definition check (D3-58). The check applies only to a dimension that carries a register.
create or replace function public.t3a_source_approval_preconditions(p_version uuid) returns text language plpgsql stable security definer set search_path = public as $fn$
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
end $fn$;

create or replace function public.t3a_source_submit_for_approval(p_version uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
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
  if cardinality(public.t3a_source_unready_questions(p_version)) > 0 then
    return public.t3a_capture_refuse('source.submit', 'question_definition_incomplete', p_version::text, 'a served question has empty semantic definition fields: ' || array_to_string(public.t3a_source_unready_questions(p_version), ', '));
  end if;
  insert into public.t3a_source_approval_request (source_version_id, requested_by) values (p_version, auth.uid());
  return jsonb_build_object('outcome', 'queued', 'source_version_id', p_version);
end $fn$;

-- Calibration may not open on a question that is not calibration ready (D3-59). The exercise names the questions it calibrates.
alter table public.t3a_d1_calibration_exercise add column if not exists question_codes text[] not null default '{}';
create or replace function public.t3a_calibration_question_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare unready text[];
begin
  if new.state::text = 'open' and old.state::text = 'draft' and exists (select 1 from public.t3a_question_definition d where d.dimension_id = new.dimension_id) then
    unready := array(select q from unnest(new.question_codes) q where not public.t3a_question_calibration_ready(new.dimension_id, q));
    if cardinality(new.question_codes) = 0 or cardinality(unready) > 0 then
      perform public.t3a_capture_refuse('calibration.open', 'question_definition_incomplete', new.id::text, 'a calibration run needs questions whose definitions are complete: ' || coalesce(nullif(array_to_string(unready, ', '), ''), 'none named'));
      return null;
    end if;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_calibration_question_guard_trg on public.t3a_d1_calibration_exercise;
create trigger t3a_0_calibration_question_guard_trg before update of state on public.t3a_d1_calibration_exercise for each row execute function public.t3a_calibration_question_guard();

-- ===== 5. The stage form check (D3-61): a Stage 1 statement is the stated plan form; a performed act verb in it refuses and logs stage_form_violation =====
create table if not exists public.t3a_stage_form_verb (verb text primary key);
alter table public.t3a_stage_form_verb enable row level security;
revoke all on public.t3a_stage_form_verb from anon, authenticated;
insert into public.t3a_stage_form_verb(verb) values ('took'), ('began'), ('completed'), ('assigned'), ('escalated'), ('carried out'), ('performed'), ('applied') on conflict do nothing;

create or replace function public.t3a_stage_form_check(p_stage text, p_statements jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare x jsonb; v text;
begin
  if regexp_replace(upper(p_stage), '^S', '') <> '1' then return jsonb_build_object('outcome', 'ok'); end if;
  for x in select * from jsonb_array_elements(coalesce(p_statements, '[]'::jsonb)) loop
    for v in select verb from public.t3a_stage_form_verb loop
      if (x ->> 'text') ~* ('\m' || v || '\M') then
        return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
      end if;
    end loop;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $fn$;
revoke all on function public.t3a_stage_form_check(text, jsonb) from public, anon, authenticated;
grant execute on function public.t3a_stage_form_check(text, jsonb) to service_role;

-- ===== 6. The resolution table loader (D3-50): one row naming a question that is not in the question objects refuses the whole table =====
create or replace function public.t3a_load_resolution_rules(p_dimension text, p_rows jsonb) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r jsonb; pe jsonb; bad text[] := '{}'; n int := 0;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('resolution.load', 'service_route_only', p_dimension, 'the table is loaded through the service route'); end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    for pe in select * from jsonb_array_elements(coalesce(r -> 'pattern', '[]'::jsonb)) loop
      if (pe ->> 'subject') <> 'STAGE' and not exists (select 1 from public.t3a_d1_question_object q where q.dimension_id = p_dimension and q.question_code = pe ->> 'subject') then
        bad := bad || ((r ->> 'rule_code') || ' names ' || (pe ->> 'subject'))::text;
      end if;
    end loop;
    if (r ->> 'outcome') = 'SUPPRESS' and not exists (select 1 from public.t3a_d1_statement_library l where l.dimension_id = p_dimension and l.statement_key = r ->> 'suppress_statement_key') then
      bad := bad || ((r ->> 'rule_code') || ' suppresses unknown ' || coalesce(r ->> 'suppress_statement_key', 'null'))::text;
    end if;
  end loop;
  if cardinality(bad) > 0 then
    return public.t3a_capture_refuse('resolution.load', 'resolution_table_refused', p_dimension, 'the whole table is refused: ' || array_to_string(bad, '; '));
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into public.t3a_resolution_refusal_rule(dimension_id, rule_code, pattern_text, pattern, outcome, reason, suppress_statement_key)
      values (p_dimension, r ->> 'rule_code', r ->> 'pattern_text', r -> 'pattern', r ->> 'outcome', r ->> 'reason', r ->> 'suppress_statement_key');
    n := n + 1;
  end loop;
  return jsonb_build_object('outcome', 'loaded', 'rows', n);
end $fn$;
revoke all on function public.t3a_load_resolution_rules(text, jsonb) from public, anon, authenticated;
grant execute on function public.t3a_load_resolution_rules(text, jsonb) to service_role;

-- The prohibited output check reports a word that belongs to another dimension (D3 5.7a: told, informed, disclosed, notified, admitted, acknowledged, blamed, attributed) as cross_dimension_assertion.
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

-- ===== bound item integrity reads the bound families of the dimension it is checking (D2-55, D3-55) =====
drop function if exists public.t3a_bound_item_integrity(jsonb);
create or replace function public.t3a_bound_item_integrity(p_body jsonb, p_dimension text default null) returns text[] language plpgsql stable security definer set search_path = public as $fn$
declare fam text; fams text[]; it jsonb; m jsonb; bad text[] := '{}';
begin
  if jsonb_typeof(p_body -> 'material_map') is distinct from 'array' then return bad; end if;
  fams := case when p_dimension is null then array['available_actions', 'material_disclosure_items', 'causal_record_set', 'attribution_support_set', 'accountable_actor_set']
               else array(select distinct m2.source_bound_family from public.t3a_d1_question_capture_map m2 where m2.dimension_id = p_dimension and m2.source_bound_family is not null) end;
  foreach fam in array fams loop
    if jsonb_typeof(p_body -> 'source_sheet' -> fam) is distinct from 'array' then continue; end if;
    for it in select * from jsonb_array_elements(p_body -> 'source_sheet' -> fam) loop
      if coalesce(btrim(it ->> 'text'), '') = '' then bad := bad || (fam || ':' || coalesce(it ->> 'id', '?') || ':empty')::text; continue; end if;
      m := null;
      select x into m from jsonb_array_elements(p_body -> 'material_map') x where x ->> 'Item' = it ->> 'id' limit 1;
      if m is not null and m ->> 'Item text' is distinct from it ->> 'text' then bad := bad || (fam || ':' || (it ->> 'id'))::text; end if;
    end loop;
  end loop;
  return bad;
end $fn$;

create or replace function public.t3a_bound_item_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare bad text[]; o public.t3a_content_object;
begin
  select * into o from public.t3a_content_object where content_object_id = new.content_object_id;
  if o.family::text = 'source' and o.dimension_id::text <> 'D1' and new.body ? 'material_map' then
    bad := public.t3a_bound_item_integrity(new.body, o.dimension_id::text);
    if cardinality(bad) > 0 then
      perform public.t3a_capture_refuse('source.load', 'bound_item_integrity_failed', o.identifier, array_to_string(bad, ', '));
      return null;
    end if;
  end if;
  return new;
end $fn$;

-- No function in this step is for a caller who is not signed in.
revoke all on function public.t3a_coverage_bound(text) from public, anon, authenticated;
grant execute on function public.t3a_coverage_bound(text) to service_role;
revoke all on function public.t3a_branch_rule_derive() from public, anon, authenticated;
revoke all on function public.t3a_calibration_question_guard() from public, anon, authenticated;
revoke all on function public.t3a_bound_item_integrity(jsonb, text) from public, anon;
revoke all on function public.t3a_bound_item_guard() from public, anon, authenticated;
revoke all on function public.t3a_source_approval_preconditions(uuid) from public, anon;
revoke all on function public.t3a_source_submit_for_approval(uuid) from public, anon;
revoke all on function public.t3a_dimension_compose(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, boolean) from public, anon;
grant execute on function public.t3a_dimension_compose(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, boolean) to authenticated, service_role;
