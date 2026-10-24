-- Step 5pre (D5): what D5 adds to the shared machinery (D5 Execution Edition v2.0: the counterpart boundary of Section 3.2 and 5.5, tests D5-61, D5-64, D5-67, D5-68, D5-69).
-- D2 to D4 share this machinery and none of their behavior changes: every change below is additive, or a re-creation of a shared function in which only the D5 branch is new.
--
-- 1. The Stage 1 form check can bar a question at more than one Stage (D5 bars the route questions at Stage 1 and at Stage 3). The default is Stage 1, which is what D4 relies on.
-- 2. Compose is re-created from the D4 text with one change: the stage_form_violation detail names the Stage the statement was composed at (it said Stage 1 in every case).
-- 3. The single page route is closed for a dimension named in t3a_multipage_only_dimension (D4, now D5), by data rather than by a name written into the function (Directive D-07).
--    RECONCILIATION (CR-290): this table (dimension_id, directive) is the ONE canonical register; D8 and D9 insert their own rows into it (D9 had created a different shape, reason; D8 used a rule code).
-- 4. The counterpart boundary: a source of a dimension that registers a counterpart rule is refused at load when a bound family item has the counterpart as the subject of a verb (counterpart_as_subject);
--    the counterpart role and position are moved out of the readable source body into a sequestered table that only the source registry reads (D5-68); a Recorded Conduct Entry or a rendered sentence with
--    the counterpart as its subject is refused and logged.
-- 5. The D5 mentor reference card (six sections, no counterpart field, no expected response).

-- ===== 1. the Stage 1 form check, with the Stages a question is barred at =====
alter table public.t3a_stage_form_question add column if not exists stage_codes text[] not null default array['1']::text[];

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
revoke all on function public.t3a_stage_form_check(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.t3a_stage_form_check(text, jsonb, text) to service_role;

-- ===== 2. composition (the D4 text; the refusal detail names the Stage, and a record status entry of a registered dimension never counts toward recurrence) =====
-- D5 test D5-17: an entry that describes the record carries no conduct toward recurrence. D5 5.7 also says that no D5 entry carries the library flag recurrence_blocker, so the flag is not set on any
-- entry; the clause instance of a record status entry carries recurrence_blocker true instead, which the evidence state reads as it reads any blocker (recurrence_blocker_statement).
-- RECONCILIATION (CR-290): this register is the ONE canonical register of entry types that carry no conduct toward recurrence, for D5, D8 and D9. D5 created its own table for the record status case
-- (t3a_record_status_no_recurrence); D8 wrote a rule code (record_status_never_recurs) and D9 wrote this register. D5 now creates the D9 shaped register (it is the more general: any of three entry types) and
-- D5, D8 and D9 each insert their own row. The composition reads only this register.
create table if not exists public.t3a_recurrence_excluded_entry_type (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), entry_type text not null check (entry_type in ('conduct_bearing', 'record_status', 'artifact_comparison')), reason text not null, primary key (dimension_id, entry_type));
alter table public.t3a_recurrence_excluded_entry_type enable row level security;
revoke all on public.t3a_recurrence_excluded_entry_type from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_recurrence_excluded_entry_type;
create trigger t3a_append_only before update or delete on public.t3a_recurrence_excluded_entry_type for each row execute function public.t3a_deny_mutation();
insert into public.t3a_recurrence_excluded_entry_type(dimension_id, entry_type, reason) values ('D5', 'record_status', 'D5 test D5-17: a record status entry carries no conduct toward recurrence') on conflict do nothing;

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

-- ===== 3. Directive D-07: the single page route is closed for the dimensions listed here =====
create table if not exists public.t3a_multipage_only_dimension (
  dimension_id text primary key check (dimension_id ~ '^D[0-9]{1,2}$'),
  directive text not null
);
alter table public.t3a_multipage_only_dimension enable row level security;
revoke all on public.t3a_multipage_only_dimension from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_multipage_only_dimension;
create trigger t3a_append_only before update or delete on public.t3a_multipage_only_dimension for each row execute function public.t3a_deny_mutation();
insert into public.t3a_multipage_only_dimension(dimension_id, directive) values
  ('D4', 'Directive D-07 of the D4 Execution Edition'), ('D5', 'Directive D-07 of the D5 Execution Edition')
on conflict do nothing;

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

-- ===== 4. the counterpart boundary (D5 Sections 3.2, 5.2, 5.5, 5.7, 5.14) =====
-- A dimension registers a counterpart rule: the two source sheet fields that are retained for source truth and never shown, and the generic role nouns that mean a counterpart
-- wherever they are the subject of a verb. The generic nouns are an executable default of this build (the Execution Edition gives no list); they are data and can be extended by a governed migration.
create table if not exists public.t3a_dimension_counterpart_rule (
  dimension_id text primary key check (dimension_id ~ '^D[0-9]{1,2}$'),
  role_field text not null, position_field text not null,
  generic_terms text[] not null default '{}'::text[]
);
alter table public.t3a_dimension_counterpart_rule enable row level security;
revoke all on public.t3a_dimension_counterpart_rule from anon, authenticated;
insert into public.t3a_dimension_counterpart_rule(dimension_id, role_field, position_field, generic_terms) values
  ('D5', 'counterpart_role', 'counterpart_position', array['colleague','manager','team','lead','director','representative','party','member','chair','agent','sponsor','counterpart','executive','nominee','officer','co-lead','co-author','co-worker','coworker','supervisor','client','stakeholder','department','function'])
on conflict do nothing;

-- The sequestered fields: the source registry is the only reader. No policy exists, and no role but the owner and the service role holds a grant.
create table if not exists public.t3a_source_sequestered_field (
  content_version_id uuid not null,
  field text not null,
  value text not null,
  sequestered_at timestamptz not null default now(),
  primary key (content_version_id, field)
);
alter table public.t3a_source_sequestered_field enable row level security;
revoke all on public.t3a_source_sequestered_field from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_source_sequestered_field;
create trigger t3a_append_only before update or delete on public.t3a_source_sequestered_field for each row execute function public.t3a_deny_mutation();
comment on table public.t3a_source_sequestered_field is 'Source sheet fields retained for source truth and never shown (D5 counterpart_role and counterpart_position). Read only by the source registry function t3a_source_counterpart.';

-- The role terms of one role label: the noun phrases of a role description, without articles, numbers or qualifiers, cut at the first preposition or relative clause. Each phrase gives its whole form and its head noun
-- (the last word; for a possessive such as "the other team's lead" the head is "lead", never the possessor). Plurals are reduced to the singular; a term is matched with an optional plural ending.
create or replace function public.t3a_counterpart_terms(p_role text) returns text[] language plpgsql immutable as $fn$
declare part text; t text; h text; res text[] := '{}';
begin
  if p_role is null then return res; end if;
  for part in select btrim(y) from unnest(regexp_split_to_array(lower(regexp_replace(p_role, '[.]+\s*$', '')), '\s*,\s*|\s+and\s+')) y loop
    t := part;
    loop
      h := regexp_replace(t, '^(the|a|an|two|three|four|five|six|seven|both|other|remaining|new|paired|upstream|returning|issuing|chief)\s+', '');
      exit when h = t;
      t := h;
    end loop;
    t := btrim(regexp_replace(t, '\s+(who|which|that|named|sharing|in|of|on|to|for|from|with|about|at|running)\s.*$', ''));
    if t like '%''s %' then t := btrim(regexp_replace(t, '^.*''s\s+', '')); end if;
    if length(t) > 2 then res := res || t; res := res || regexp_replace(t, '^.*\s', ''); end if;
  end loop;
  return (select coalesce(array_agg(distinct z), '{}'::text[]) from (
            select regexp_replace(regexp_replace(u, 'ies$', 'y'), '(?<=[a-z])s$', '') z from unnest(res) u) q where length(z) > 2);
end $fn$;

-- A sentence or list item in which one of the terms is the subject of a verb: the term follows a clause start (the beginning, a full stop, a comma, or a joining word) and is itself followed by a word that is not an article,
-- a preposition, a joining word or a possessive pronoun. Returns the term that matched, or null.
create or replace function public.t3a_counterpart_subject_hit(p_terms text[], p_text text) returns text language plpgsql immutable as $fn$
declare alt text; m text[];
begin
  if p_terms is null or cardinality(p_terms) = 0 or p_text is null then return null; end if;
  select string_agg(regexp_replace(x, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g'), '|' order by length(x) desc) into alt from unnest(p_terms) x;
  m := regexp_match(lower(regexp_replace(p_text, '<[^>]+>', ' ', 'g')),
    '(^|[.;:!?]\s+|,\s+|\m(?:that|and|but|when|while|if|because|so|then|once|until|after|before|whether)\s+)(?:the\s+|their\s+|its\s+)?(?:(?:other|new|remaining|paired|upstream|two|three|both|returning|issuing)\s+)*(' || alt
    || ')(?:s|es)?\s+(?!(?:a|an|the|of|in|on|at|to|for|from|with|by|and|or|but|as|than|via|about|into|over|under|between|across|per|through|their|his|her|its|not)\M)[a-z]');
  return m[2];
end $fn$;

create or replace function public.t3a_counterpart_dimension_terms(p_dimension text) returns text[] language sql stable security definer set search_path = public as $fn$
  select coalesce(array_agg(distinct t), '{}'::text[]) from (
    select unnest(r.generic_terms) t from public.t3a_dimension_counterpart_rule r where r.dimension_id = p_dimension
    union
    select unnest(public.t3a_counterpart_terms(s.value)) from public.t3a_source_sequestered_field s
      join public.t3a_d1_content_version v on v.content_version_id = s.content_version_id
      join public.t3a_content_object o on o.content_object_id = v.content_object_id
      join public.t3a_dimension_counterpart_rule r on r.dimension_id = o.dimension_id::text and r.role_field = s.field
     where o.dimension_id::text = p_dimension) z
$fn$;
revoke all on function public.t3a_counterpart_terms(text) from public, anon, authenticated;
revoke all on function public.t3a_counterpart_subject_hit(text[], text) from public, anon, authenticated;
revoke all on function public.t3a_counterpart_dimension_terms(text) from public, anon, authenticated;
grant execute on function public.t3a_counterpart_terms(text) to service_role;
grant execute on function public.t3a_counterpart_subject_hit(text[], text) to service_role;
grant execute on function public.t3a_counterpart_dimension_terms(text) to service_role;

-- The source load guard (D5-69, D5-68). Runs before the bound item guard (trigger names sort that way).
--   a. a bound family item with the counterpart as its subject refuses the source and logs counterpart_as_subject;
--   b. the counterpart role and position are moved out of the readable body into the sequestered table.
-- The demonstration fixtures hold their source sheet as one prose block (backticked field names); the two fields are lifted out of that block in the same way.
create or replace function public.t3a_counterpart_load_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare o public.t3a_content_object; r public.t3a_dimension_counterpart_rule; sheet jsonb; prose text; role_v text; pos_v text; fam text; it jsonb; terms text[]; hit text; bad text[] := '{}'; nk text; seg text;
begin
  select * into o from public.t3a_content_object where content_object_id = new.content_object_id;
  if o.content_object_id is null or o.family::text <> 'source' then return new; end if;
  select * into r from public.t3a_dimension_counterpart_rule where dimension_id = o.dimension_id::text;
  if r.dimension_id is null then return new; end if;
  sheet := coalesce(new.body -> 'source_sheet', '{}'::jsonb);
  prose := sheet ->> 'source_sheet_text';
  role_v := coalesce(sheet ->> r.role_field, substring(prose from '`' || r.role_field || '`: (.*?) — RETAINED'));
  pos_v := coalesce(sheet ->> r.position_field, substring(prose from '`' || r.position_field || '`: (.*?) — RETAINED'));
  -- the terms of this source's own counterpart role; the generic role nouns apply to rendered sentences and entries, not to what a source designates (a third party may be named in an option)
  terms := public.t3a_counterpart_terms(role_v);
  for fam in select distinct m.source_bound_family from public.t3a_d1_question_capture_map m where m.dimension_id = r.dimension_id and m.source_bound_family is not null loop
    if jsonb_typeof(sheet -> fam) = 'array' then
      for it in select * from jsonb_array_elements(sheet -> fam) loop
        hit := public.t3a_counterpart_subject_hit(terms, it ->> 'text');
        if hit is not null then bad := bad || (fam || ':' || coalesce(it ->> 'id', '?') || ':' || hit); end if;
      end loop;
    end if;
  end loop;
  if cardinality(bad) > 0 then
    perform public.t3a_capture_refuse('source.load', 'counterpart_as_subject', o.identifier, array_to_string(bad, ', '));
    return null;
  end if;
  if role_v is not null then insert into public.t3a_source_sequestered_field(content_version_id, field, value) values (new.content_version_id, r.role_field, role_v) on conflict do nothing; end if;
  if pos_v is not null then insert into public.t3a_source_sequestered_field(content_version_id, field, value) values (new.content_version_id, r.position_field, pos_v) on conflict do nothing; end if;
  sheet := sheet - r.role_field - r.position_field;
  -- a note of the sheet that carries one of the two field names as its label ("<field>: no intent is established ...") is the field's own note: it is lifted out the same way
  for nk in select jsonb_object_keys(sheet) loop
    if nk <> 'source_sheet_text' and jsonb_typeof(sheet -> nk) = 'string' and (sheet ->> nk) ~ ('(' || r.role_field || '|' || r.position_field || '):') then
      seg := (select string_agg(mm[1], ' ') from regexp_matches(sheet ->> nk, '((?:' || r.role_field || '|' || r.position_field || '):[^.]*\.)', 'g') mm);
      insert into public.t3a_source_sequestered_field(content_version_id, field, value) values (new.content_version_id, nk || '#note', seg) on conflict do nothing;
      sheet := jsonb_set(sheet, array[nk], coalesce(to_jsonb(nullif(btrim(regexp_replace(sheet ->> nk, '\s*(' || r.role_field || '|' || r.position_field || '):[^.]*\.', '', 'g')), '')), 'null'::jsonb));
    end if;
  end loop;
  if prose is not null then
    prose := regexp_replace(regexp_replace(prose, '`' || r.role_field || '`:.*?NEVER RENDERED\.\s*', '', 'g'), '`' || r.position_field || '`:.*?NEVER RENDERED\.\s*', '', 'g');
    sheet := jsonb_set(sheet, '{source_sheet_text}', to_jsonb(prose));
  end if;
  if new.body ? 'source_sheet' then new.body := jsonb_set(new.body, '{source_sheet}', sheet); end if;
  return new;
end $fn$;
revoke all on function public.t3a_counterpart_load_guard() from public, anon, authenticated;
drop trigger if exists t3a_1_counterpart_load_guard_trg on public.t3a_d1_content_version;
create trigger t3a_1_counterpart_load_guard_trg before insert or update of body on public.t3a_d1_content_version for each row execute function public.t3a_counterpart_load_guard();

-- A Recorded Conduct Entry with the counterpart as its subject cannot be loaded (D5 5.14: any composed entry with counterpart_role as its subject refuses and logs counterpart_as_subject).
create or replace function public.t3a_counterpart_entry_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare hit text;
begin
  if not exists (select 1 from public.t3a_dimension_counterpart_rule r where r.dimension_id = new.dimension_id::text) then return new; end if;
  hit := public.t3a_counterpart_subject_hit(public.t3a_counterpart_dimension_terms(new.dimension_id::text), new.statement_body);
  if hit is not null then
    perform public.t3a_capture_refuse('statement.load', 'counterpart_as_subject', new.statement_key, hit);
    return null;
  end if;
  return new;
end $fn$;
revoke all on function public.t3a_counterpart_entry_guard() from public, anon, authenticated;
drop trigger if exists t3a_1_counterpart_entry_guard_trg on public.t3a_d1_statement_library;
create trigger t3a_1_counterpart_entry_guard_trg before insert on public.t3a_d1_statement_library for each row execute function public.t3a_counterpart_entry_guard();

-- The prohibited output check, with the counterpart as the subject of a rendered sentence (D5 3.2). Otherwise the D3 text.
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

-- The scan that logs: every finding of the check is written to the refusal log under its rule name (counterpart_as_subject among them).
create or replace function public.t3a_rendered_output_scan(p_dimension text, p_rendered text, p_subject text default '') returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r jsonb := public.t3a_prohibited_output_check(p_dimension, p_rendered); x jsonb;
begin
  for x in select * from jsonb_array_elements(r -> 'findings') loop
    perform public.t3a_capture_refuse('render.scan', x ->> 'rule', coalesce(p_subject, ''), x ->> 'detail');
  end loop;
  return r;
end $fn$;
revoke all on function public.t3a_rendered_output_scan(text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_rendered_output_scan(text, text, text) to service_role;

-- The source registry reads the sequestered fields; no other routine does.
create or replace function public.t3a_source_counterpart(p_source_version uuid) returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_object_agg(s.field, s.value), '{}'::jsonb) from public.t3a_source_sequestered_field s where s.content_version_id = p_source_version
$fn$;
revoke all on function public.t3a_source_counterpart(uuid) from public, anon, authenticated;
grant execute on function public.t3a_source_counterpart(uuid) to service_role;

-- ===== 5. the D5 mentor reference card (Section 2.4 instruction 039): six sections, no counterpart field, no expected response =====
-- 1 the scripted questions; 2 designated_positions; 3 designated_enquiries; 4 shared_items; 5 available_options, available_routes and agreement_contents with their eligibility flags;
-- 6 the flags table (difference_established, authority_relation, recording_route, persistence_point, exchange_test_point). The card selects these fields by name; it never copies the sheet.
create or replace function public.t3a_d5_reference_card(p_source_identifier text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare o public.t3a_content_object; b jsonb; sh jsonb; stg text; qs jsonb; lst jsonb;
begin
  select * into o from public.t3a_content_object where family::text = 'source' and identifier = p_source_identifier and dimension_id::text = 'D5';
  if o.content_object_id is null then return jsonb_build_object('rendered', false, 'refusal_code', 'SOURCE_NOT_FOUND'); end if;
  select v.body into b from public.t3a_d1_content_version v where v.content_object_id = o.content_object_id order by v.created_at desc limit 1;
  if b is null then return jsonb_build_object('rendered', false, 'refusal_code', 'SOURCE_CARRIES_NO_LOADED_VERSION'); end if;
  sh := coalesce(b -> 'source_sheet', '{}'::jsonb);
  stg := b ->> 'stage_code';
  if stg = 'S1' then
    qs := case when jsonb_typeof(b -> 'reveals') = 'array' then coalesce((select jsonb_agg(jsonb_build_object('code', x ->> 'code', 'question_text', x ->> 'text') order by ord) from jsonb_array_elements(b -> 'reveals') with ordinality t(x, ord) where x ->> 'role' is distinct from 'Opening'), '[]'::jsonb) else '[]'::jsonb end;
  elsif stg in ('S2', 'S4') then
    qs := case when jsonb_typeof(b -> 'script') = 'array' then coalesce((select jsonb_agg(jsonb_build_object('beat', x ->> 'beat', 'question_text', x ->> 'spoken') order by ord) from jsonb_array_elements(b -> 'script') with ordinality t(x, ord) where x ->> 'type' = 'ASK'), '[]'::jsonb) else '[]'::jsonb end;
  else
    qs := '[]'::jsonb;
  end if;
  return jsonb_build_object(
    'rendered', true, 'source_identifier', p_source_identifier, 'title', o.title, 'stage_code', stg, 'operational_state', o.current_operational_state,
    'scripted_questions', qs,
    'scripted_questions_note', case when jsonb_array_length(qs) = 0 then 'STAGE_CARRIES_NO_LIVE_SCRIPT' else null end,
    'sheet_note', case when sh ? 'source_sheet_text' then 'THE_SHEET_OF_A_DEMONSTRATION_FIXTURE_IS_HELD_AS_TEXT' else null end,
    'designated_positions', case when jsonb_typeof(sh -> 'designated_positions') = 'array' then sh -> 'designated_positions' else '[]'::jsonb end,
    'designated_enquiries', case when jsonb_typeof(sh -> 'designated_enquiries') = 'array' then sh -> 'designated_enquiries' else '[]'::jsonb end,
    'shared_items', case when jsonb_typeof(sh -> 'shared_items') = 'array' then sh -> 'shared_items' else '[]'::jsonb end,
    'options_routes_contents', jsonb_build_object(
      'available_options', case when jsonb_typeof(sh -> 'available_options') = 'array' then sh -> 'available_options' else '[]'::jsonb end,
      'available_routes', case when jsonb_typeof(sh -> 'available_routes') = 'array' then sh -> 'available_routes' else '[]'::jsonb end,
      'agreement_contents', case when jsonb_typeof(sh -> 'agreement_contents') = 'array' then sh -> 'agreement_contents' else '[]'::jsonb end),
    'flags', jsonb_build_object(
      'difference_established', sh -> 'difference_established', 'authority_relation', sh -> 'authority_relation', 'recording_route', sh -> 'recording_route',
      'persistence_point', sh -> 'persistence_point', 'exchange_test_point', sh -> 'exchange_test_point'));
end $fn$;
revoke all on function public.t3a_d5_reference_card(text) from public, anon;
grant execute on function public.t3a_d5_reference_card(text) to authenticated, service_role;
