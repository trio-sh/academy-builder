-- Step 5pre (D8): what D8 adds to the shared machinery (D8 Execution Edition v2.1: Section 3.2 and 5.2 to 5.7 state_observation, 5.5 the two source truth fields,
-- 5.7 the Stage form at every Stage, 5.10 no recurrence from a record status entry, Directive D-07 for D8, tests D8-04, D8-17, D8-55, D8-61, D8-64, D8-67, D8-68, D8-69).
--
-- Additive only. Nothing here changes what D1 to D4 do: every new rule is data keyed by dimension, and a dimension with no row behaves as before.
--   1. t3a_dimension_rule: the rules a dimension turns on (D8: the entry language gate, the source state boundary, source truth withheld from surfaces, a served question needs its list).
--      Record status entries never recur (D5 test D5-17 / D8 5.10) and the single page route closed (Directive D-07) are rows of the canonical registers (see below), not rules here.
--   2. The Stage form (performed act verbs) can hold verbs that apply at every Stage for a dimension (t3a_stage_form_verb_dimension). The shared verbs still apply at Stage 1.
--   3. The entry language gate: a composed entry whose subject is the participant's state, or that carries a word of another dimension, refuses before it is written
--      (`state_observation`, `cross_dimension_assertion`). The prohibited output scan reads the same patterns.
--   4. The source state boundary (load time): a source sheet that carries a field outside the declared list, and a list item that names a state, a feeling or a
--      personal need, refuse the source at load and log `state_observation` (D8-69).
--   5. Source truth withheld (D8-68): who_knows and decision_origin are retained for source truth in a service only table and are removed from the body that every
--      screen and every response reads. The package digest on the source is unchanged.
--   6. A served question whose list is absent or empty on its source refuses `BOUND_FAMILY_ABSENT_OR_EMPTY` (Section 5.5: a source with an empty list cannot carry that element).
--   7. The single page route is closed for D8: a row of t3a_multipage_only_dimension (the register D5 created); the render gate that reads it is in 20270230000000.
-- RECONCILIATION (CR-290 to CR-299): D5, D8 and D9 were built side by side and each changed the same shared functions. This file no longer patches or re-creates any function that another
-- dimension also changes (t3a_stage_form_check, t3a_dimension_compose, t3a_prohibited_output_check, t3a_report_render_gate). Those four are created once, as the union of D4, D5, D8 and D9,
-- in migration 20270230000000_shared_functions_d5_d8_d9.sql. This file keeps D8's own tables, data and non shared functions (the entry language gate, the source boundary guard, the source truth store),
-- and D8's rows in the canonical registers: t3a_multipage_only_dimension (D5) and t3a_recurrence_excluded_entry_type (D5).

-- ===== 1. the rule table =====
create table if not exists public.t3a_dimension_rule (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  rule_code text not null check (rule_code in ('entry_language_gate', 'source_state_boundary', 'withhold_source_truth', 'served_question_needs_list')),
  note text,
  created_at timestamptz not null default now(),
  primary key (dimension_id, rule_code)
);
comment on table public.t3a_dimension_rule is 'Rules a dimension turns on. A dimension with no row behaves as the shared machinery always did. Append only.';
alter table public.t3a_dimension_rule enable row level security;
revoke all on public.t3a_dimension_rule from anon, authenticated;
grant select on public.t3a_dimension_rule to service_role;
drop trigger if exists t3a_append_only on public.t3a_dimension_rule;
create trigger t3a_append_only before update or delete on public.t3a_dimension_rule for each row execute function public.t3a_deny_mutation();

insert into public.t3a_dimension_rule (dimension_id, rule_code, note) values
  ('D8', 'entry_language_gate', 'D8 Section 5.7: a composed entry whose subject is the participant''s state refuses state_observation; a word of another dimension refuses cross_dimension_assertion'),
  ('D8', 'source_state_boundary', 'D8 Sections 3.2, 5.2 and 5.5: a source sheet field or a list item naming the participant''s state refuses the source at load (D8-69)'),
  ('D8', 'withhold_source_truth', 'D8 Section 5.5 and test D8-68: who_knows and decision_origin are retained for source truth and never rendered or shown'),
  ('D8', 'served_question_needs_list', 'D8 Section 5.5 and tests D8-04, D8-54: a field a question needs that is empty on a source means the source cannot carry that element')
on conflict do nothing;

-- ===== 2. performed act verbs that apply at every Stage for a dimension =====
create table if not exists public.t3a_stage_form_verb_dimension (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  verb text not null check (btrim(verb) <> ''),
  note text,
  primary key (dimension_id, verb)
);
comment on table public.t3a_stage_form_verb_dimension is 'Verbs a composed entry of the dimension may never carry at any Stage (D8 Section 5.7: every D8 entry records what the participant stated or named). The shared t3a_stage_form_verb list still applies at Stage 1 to every dimension.';
alter table public.t3a_stage_form_verb_dimension enable row level security;
revoke all on public.t3a_stage_form_verb_dimension from anon, authenticated;
grant select on public.t3a_stage_form_verb_dimension to service_role;

-- ===== 3. the entry language gate =====
create table if not exists public.t3a_entry_language_rule (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  rule_code text not null check (rule_code in ('state_observation', 'list_item_state', 'sheet_field_state')),
  pattern text not null check (btrim(pattern) <> ''),
  note text,
  primary key (dimension_id, rule_code, pattern)
);
comment on table public.t3a_entry_language_rule is 'Case insensitive patterns, by dimension. state_observation: a rendered entry whose subject is the participant''s state. list_item_state: a source list item naming a state, a feeling or a personal need. sheet_field_state: a source sheet field name for the participant''s response, state or bearing.';
alter table public.t3a_entry_language_rule enable row level security;
revoke all on public.t3a_entry_language_rule from anon, authenticated;
grant select on public.t3a_entry_language_rule to service_role;

create or replace function public.t3a_entry_language_gate(p_dimension text, p_statements jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare x jsonb; w record; r record; t text;
begin
  if not exists (select 1 from public.t3a_dimension_rule where dimension_id = p_dimension and rule_code = 'entry_language_gate') then return jsonb_build_object('outcome', 'ok'); end if;
  for x in select * from jsonb_array_elements(coalesce(p_statements, '[]'::jsonb)) loop
    t := coalesce(x ->> 'text', '');
    -- a word of another dimension, and a word that describes how the participant bore the setback
    for w in select word, reason from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension and reason in ('cross_dimension_assertion', 'state_observation') order by reason, word loop
      if t ~* ('(^|[^a-z0-9_])' || regexp_replace(w.word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^a-z0-9_])') then
        return jsonb_build_object('outcome', 'violation', 'reason', w.reason, 'statement_key', x ->> 'statement_key', 'detail', (x ->> 'statement_key') || ' carries "' || w.word || '"');
      end if;
    end loop;
    -- a sentence whose subject is the participant's state, or that asserts the absence of a reaction
    for r in select pattern from public.t3a_entry_language_rule where dimension_id = p_dimension and rule_code = 'state_observation' order by pattern loop
      if t ~* r.pattern then
        return jsonb_build_object('outcome', 'violation', 'reason', 'state_observation', 'statement_key', x ->> 'statement_key', 'detail', (x ->> 'statement_key') || ' has the participant''s state as its subject');
      end if;
    end loop;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $fn$;
revoke all on function public.t3a_entry_language_gate(text, jsonb) from public, anon, authenticated;
grant execute on function public.t3a_entry_language_gate(text, jsonb) to service_role;

-- ===== 6. the source state boundary and the withheld source truth =====
create table if not exists public.t3a_dimension_source_field (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  field_name text not null check (btrim(field_name) <> ''),
  primary key (dimension_id, field_name)
);
comment on table public.t3a_dimension_source_field is 'The source sheet fields a dimension declares (D8 Section 5.5: the platform core fields and the D8 fields, each once, and no other field).';
alter table public.t3a_dimension_source_field enable row level security;
revoke all on public.t3a_dimension_source_field from anon, authenticated;
grant select on public.t3a_dimension_source_field to service_role;

create table if not exists public.t3a_dimension_withheld_field (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  field_name text not null,
  primary key (dimension_id, field_name)
);
comment on table public.t3a_dimension_withheld_field is 'Source sheet fields retained for source truth only: removed from the body any screen or response reads, kept in t3a_source_truth_field.';
alter table public.t3a_dimension_withheld_field enable row level security;
revoke all on public.t3a_dimension_withheld_field from anon, authenticated;
grant select on public.t3a_dimension_withheld_field to service_role;

create table if not exists public.t3a_source_truth_field (
  source_version_id uuid not null,
  dimension_id text not null,
  field_name text not null,
  field_value jsonb,
  withheld_at timestamptz not null default now(),
  primary key (source_version_id, field_name)
);
comment on table public.t3a_source_truth_field is 'Source truth that no surface shows (D8 who_knows and decision_origin). Service role only: no screen, report, export or response reads this table.';
alter table public.t3a_source_truth_field enable row level security;
revoke all on public.t3a_source_truth_field from anon, authenticated;
grant select, insert on public.t3a_source_truth_field to service_role;
drop trigger if exists t3a_append_only on public.t3a_source_truth_field;
create trigger t3a_append_only before update or delete on public.t3a_source_truth_field for each row execute function public.t3a_deny_mutation();

create or replace function public.t3a_source_truth(p_source_version uuid) returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_object_agg(field_name, field_value), '{}'::jsonb) from public.t3a_source_truth_field where source_version_id = p_source_version
$fn$;
revoke all on function public.t3a_source_truth(uuid) from public, anon, authenticated;
grant execute on function public.t3a_source_truth(uuid) to service_role;

-- BEFORE: refuse a source that crosses the state boundary; strip the withheld fields and hand them to the AFTER trigger through a transaction local setting
create or replace function public.t3a_source_boundary_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare o public.t3a_content_object; dim text; k text; fam text; it jsonb; sheet jsonb; wf text; withheld jsonb := '{}'::jsonb; r record; bad text[] := '{}';
begin
  select * into o from public.t3a_content_object where content_object_id = new.content_object_id;
  if o.family::text <> 'source' then return new; end if;
  dim := o.dimension_id::text;
  sheet := new.body -> 'source_sheet';
  if exists (select 1 from public.t3a_dimension_rule where dimension_id = dim and rule_code = 'source_state_boundary') and jsonb_typeof(sheet) = 'object' then
    -- a field outside the declared list: a field for the participant's response, state or bearing is a state observation, any other undeclared field is not declared
    for k in select jsonb_object_keys(sheet) loop
      if not exists (select 1 from public.t3a_dimension_source_field f where f.dimension_id = dim and f.field_name = k) then
        if exists (select 1 from public.t3a_entry_language_rule e where e.dimension_id = dim and e.rule_code = 'sheet_field_state' and k ~* e.pattern) then
          perform public.t3a_capture_refuse('source.load', 'state_observation', o.identifier, 'the source sheet carries a field for the participant''s response, state or bearing: ' || k);
        else
          perform public.t3a_capture_refuse('source.load', 'source_field_not_declared', o.identifier, 'the source sheet carries a field that is not declared: ' || k);
        end if;
        return null;
      end if;
    end loop;
    -- a list item that names a state, a feeling or a personal need
    for fam in select distinct m.source_bound_family from public.t3a_d1_question_capture_map m where m.dimension_id = dim and m.source_bound_family is not null loop
      if jsonb_typeof(sheet -> fam) = 'array' then
        for it in select * from jsonb_array_elements(sheet -> fam) loop
          for r in select pattern from public.t3a_entry_language_rule e where e.dimension_id = dim and e.rule_code = 'list_item_state' loop
            if coalesce(it ->> 'text', '') ~* r.pattern then bad := bad || (fam || ':' || coalesce(it ->> 'id', '?')); exit; end if;
          end loop;
        end loop;
      end if;
    end loop;
    if cardinality(bad) > 0 then
      perform public.t3a_capture_refuse('source.load', 'state_observation', o.identifier, 'a list item names a state, a feeling or a personal need: ' || array_to_string(bad, ', '));
      return null;
    end if;
  end if;
  if jsonb_typeof(sheet) = 'object' then
    for wf in select w.field_name from public.t3a_dimension_withheld_field w where w.dimension_id = dim and exists (select 1 from public.t3a_dimension_rule dr where dr.dimension_id = dim and dr.rule_code = 'withhold_source_truth') loop
      if sheet ? wf then withheld := withheld || jsonb_build_object(wf, sheet -> wf); end if;
    end loop;
    if withheld <> '{}'::jsonb then
      for wf in select jsonb_object_keys(withheld) loop sheet := sheet - wf; end loop;
      new.body := jsonb_set(new.body, '{source_sheet}', sheet);
      perform set_config('t3a.withheld.v' || replace(new.content_version_id::text, '-', '_'), withheld::text, true);
    end if;
  end if;
  return new;
end $fn$;
revoke all on function public.t3a_source_boundary_guard() from public, anon, authenticated;

create or replace function public.t3a_source_truth_keep() returns trigger language plpgsql security definer set search_path = public as $fn$
declare w text := nullif(current_setting('t3a.withheld.v' || replace(new.content_version_id::text, '-', '_'), true), ''); j jsonb; k text; dim text;
begin
  if w is null then return new; end if;
  j := w::jsonb;
  select o.dimension_id::text into dim from public.t3a_content_object o where o.content_object_id = new.content_object_id;
  for k in select jsonb_object_keys(j) loop
    insert into public.t3a_source_truth_field (source_version_id, dimension_id, field_name, field_value) values (new.content_version_id, dim, k, j -> k) on conflict do nothing;
  end loop;
  perform set_config('t3a.withheld.v' || replace(new.content_version_id::text, '-', '_'), '', true);
  return new;
end $fn$;
revoke all on function public.t3a_source_truth_keep() from public, anon, authenticated;

drop trigger if exists t3a_2_source_boundary_guard_trg on public.t3a_d1_content_version;
create trigger t3a_2_source_boundary_guard_trg before insert or update of body on public.t3a_d1_content_version for each row execute function public.t3a_source_boundary_guard();
drop trigger if exists t3a_2_source_truth_keep_trg on public.t3a_d1_content_version;
create trigger t3a_2_source_truth_keep_trg after insert or update of body on public.t3a_d1_content_version for each row execute function public.t3a_source_truth_keep();

-- D8 declarations: the sheet fields (Section 5.5 and the platform core fields the sources carry), the two withheld fields, the patterns
insert into public.t3a_dimension_source_field (dimension_id, field_name) select 'D8', f from unnest(array[
  'd8_situation_class', 'workplace_demand', 'relevant_conduct', 'irrelevant_conduct', 'stated_standard', 'stated_standard_source_quote_or_location', 'cross_context_map', 'serving_eligible',
  'recurrence_eligible', 'replacement_required', 'name_clearance_status', 'name_clearance_basis', 'sensitivity_flag', 'min_seconds', 'max_seconds', 'ai_use', 'submission_window_days',
  'permitted_administration_variance', 'unsupported_inferences', 'compatibility_class', 'setback_established', 'containment_actions', 'corrective_actions', 'designated_facts',
  'available_supports', 'standing_commitments', 'work_in_progress', 'recurrence_measures', 'recurring_condition', 'formal_record_state', 'record_place', 'who_knows', 'decision_origin',
  'account_test_point', 'account_test_record', 'list_note', 'source_note', 'situation_class_label', 'observation_mode_label',
  'source_sheet_text']) f on conflict do nothing;
insert into public.t3a_dimension_withheld_field (dimension_id, field_name) values ('D8', 'who_knows'), ('D8', 'decision_origin') on conflict do nothing;

insert into public.t3a_entry_language_rule (dimension_id, rule_code, pattern, note) values
  ('D8', 'sheet_field_state', '(response|reaction|bearing|feeling|emotion|mood|wellbeing|well_being|morale|demeanou?r|manner|composure|distress|stress|affect|coping|resilien)', 'a field for the participant''s response, reaction, state or bearing (Section 5.5)'),
  ('D8', 'sheet_field_state', '^(participant_)?(state|condition)(_.*)?$', 'a field named for the participant''s state or condition (formal_record_state and recurring_condition are declared fields and never reach this pattern)'),
  ('D8', 'list_item_state', '\m(feel|feels|feeling|feelings|felt|emotion|emotions|emotional|anxious|anxiety|stress|stressed|stressful|worry|worried|upset|angry|anger|frustrated|frustration|sad|sadness|tired|tiredness|exhausted|exhaustion|overwhelmed|burnout|morale|motivation|motivated|wellbeing|well-being|mood|nerves|nervous|calm|calming|composure|confidence|reassurance|reassure|reassured|encouragement|encourage|encouraged|comfort|comforted|sleep|counselling|counseling|therapy|therapist)\M', 'a list item naming a state or a feeling (Section 5.2: no item describes a state)'),
  ('D8', 'list_item_state', '\m(a|some|get|take|have|need|needs|time to|an hour of) (rest|break|breather)\M', 'a list item naming a personal need'),
  ('D8', 'list_item_state', '\m(time off|day off|days off|leave of absence|sick leave|medical leave|someone to talk to|how (the participant|you|i) (is|are|am) (doing|feeling))\M', 'a list item naming a personal need or attention to how the participant is doing'),
  ('D8', 'state_observation', '\m(the )?participant\s+(was|were|is|seemed|appeared|looked|felt|remained|sounded|showed|stayed|became|got|grew|kept|continued without|did not (seem|appear|look|sound|show))\M', 'a sentence whose subject is the participant and whose predicate is a state'),
  ('D8', 'state_observation', '\m(no (visible |apparent |obvious )?(sign|signs|reaction|distress|difficulty|change)|without (apparent |visible |any )?(difficulty|distress|reaction)|visibly|apparently|seemingly|appeared to|seemed to|in stride)\M', 'a sentence asserting the absence or presence of a reaction'),
  ('D8', 'state_observation', '\m(untroubled|unbothered|unflustered|at ease|on edge|shaken|visibly affected)\M', 'a state described directly')
on conflict do nothing;

-- D8 rows in the canonical registers created by 20270201 (D5): Directive D-07 for D8 (D8-25, D8-67) and 'no D8 entry toward recurrence from a record status entry' (Section 5.10, D8-17).
insert into public.t3a_multipage_only_dimension(dimension_id, directive) values
  ('D8', 'D8 Directive D-07: every D8 report renders through the multi page renderer; a route to the single page renderer refuses format_mismatch (D8-25, D8-67)')
on conflict do nothing;
insert into public.t3a_recurrence_excluded_entry_type(dimension_id, entry_type, reason) values
  ('D8', 'record_status', 'D8 Section 5.10 and test D8-17: an entry that describes the record carries no conduct toward recurrence; no D8 entry carries recurrence_blocker')
on conflict do nothing;
