-- Step 5pre (D9): what D9 adds to the shared machinery (D9 Execution Edition v1.1: Sections 3.2, 3.3, 5.5, 5.7, 5.7a, 11.1 tests D9-61, D9-64, D9-68, D9-69). Additive: nothing D2 to D4 use changes meaning.
--
-- 1. The governing situation class. A D9 source may carry two classes written "code with code" (Section 3.3); the first named governs. The gateway and the exposure check read the first.
-- 2. The Stage form check also runs at every Stage for a dimension that registers verbs for it (D9: every entry records a statement at every Stage, row 0.6.15, test D9-61).
-- 3. capacity_observation (Sections 3.2, 5.2, 5.5, test D9-69): a source sheet carries only its declared fields, no list item names a participant's ability, age, origin, language or education,
--    and a composed entry whose subject is not a statement of the participant refuses. A listed word refuses at composition too (cross_dimension_assertion for the acts other dimensions own).
-- 4. Fields that are never rendered (Section 5.5, row 0.6.19, test D9-68): practice_origin is source truth only. One display route strips it and one scan finds it.
-- 5. D-07 (test D9-67): the render gate reads the dimensions that render through the multi page renderer only from a register (D4, which was hard coded, and D9), so the single page route is closed for a D9 specimen as well as for an issued report.
-- The commit seal (D-06) is already shared and needs no change.
-- RECONCILIATION (CR-290 to CR-299): this file no longer re-creates t3a_stage_form_check, t3a_dimension_compose or t3a_report_render_gate (D5 and D8 change them too; the D9 branch
-- re-emitted them from the D4 text and would have dropped the D5 and D8 additions). They are created once, as the union of D4, D5, D8 and D9, in migration 20270230000000_shared_functions_d5_d8_d9.sql,
-- which reads this file's registers (t3a_stage_form_dimension_verb, t3a_entry_subject_lead). Items 2, 3 and 5 below name the D9 data and checks; the shared function bodies are in that migration.
-- D9's multi page only and record status rows go into the canonical registers D5 created (t3a_multipage_only_dimension with a directive column; t3a_recurrence_excluded_entry_type).

-- ===== 1. the governing situation class =====
create or replace function public.t3a_governing_situation_class(p_class text) returns text language sql immutable as $fn$
  select nullif(btrim(split_part(coalesce(p_class, ''), ' with ', 1)), '')
$fn$;
revoke all on function public.t3a_governing_situation_class(text) from public, anon, authenticated;
grant execute on function public.t3a_governing_situation_class(text) to service_role;

create or replace function public.t3a_source_approval_preconditions(p_version uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; sc text; dim text; stage text;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return 'source_version_not_found'; end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text;
  if dim is null or dim = 'D1' then return null; end if;
  stage := v.body ->> 'stage_code';
  sc := public.t3a_governing_situation_class(v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class'));
  if sc is null or not exists (select 1 from public.t3a_interaction_pattern_family f where f.dimension_id = dim and f.situation_class = sc) then return 'situation_class_absent_or_unknown'; end if;
  if public.t3a_administration_form_of(stage) is null then return 'administration_form_absent'; end if;
  if (select count(*) from public.t3a_source_drafting_test t where t.source_version_id = p_version) < 2 then return 'drafting_test_incomplete'; end if;
  if stage = 'S3' and not exists (select 1 from public.t3a_source_rights_record r where r.source_version_id = p_version) then return 'rights_route_absent'; end if;
  if cardinality(public.t3a_source_unready_questions(p_version)) > 0 then return 'question_definition_incomplete'; end if;
  if not exists (select 1 from public.t3a_source_approval_request q where q.source_version_id = p_version) then return 'not_submitted_for_approval'; end if;
  if not exists (select 1 from public.t3a_d1_source_name_clearance c where c.source_version_id = p_version and c.status = 'cleared') then return 'name_clearance_pending'; end if;
  return null;
end $fn$;

create or replace function public.t3a_prior_exposure(p_participant uuid, p_source_version uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; form text; sc text; ipf text; dim text; reasons text[] := '{}';
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text; stage := v.body ->> 'stage_code'; form := public.t3a_administration_form_of(stage);
  sc := public.t3a_governing_situation_class(v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class'));
  select interaction_pattern_family_id into ipf from public.t3a_interaction_pattern_family where dimension_id = dim and situation_class = sc;
  if exists (select 1 from public.t3a_stage_entry_event s where s.participant_id = p_participant and s.source_version_id = p_source_version) then reasons := reasons || 'source_version_met'::text; end if;
  -- CR-14: the form exclusion is for a form met under ANOTHER dimension, and an approved, unexpired source design review can lift it (never the source or the pattern family)
  if exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id
              join public.t3a_content_object po2 on po2.content_object_id = pv.content_object_id
              where s.participant_id = p_participant and po2.dimension_id::text <> dim and public.t3a_administration_form_of(pv.body ->> 'stage_code') = form)
     and not public.t3a_design_review_lifts(p_participant, p_source_version, form) then reasons := reasons || 'administration_form_met'::text; end if;
  if ipf is not null and exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id join public.t3a_content_object po on po.content_object_id = pv.content_object_id
              join public.t3a_interaction_pattern_family pf on pf.dimension_id = po.dimension_id::text and pf.situation_class = public.t3a_governing_situation_class(pv.body -> 'source_sheet' ->> (lower(po.dimension_id::text) || '_situation_class'))
              where s.participant_id = p_participant and po.dimension_id::text = dim and pf.interaction_pattern_family_id = ipf) then reasons := reasons || 'pattern_family_met'::text; end if;
  return jsonb_build_object('excluded', cardinality(reasons) > 0, 'reasons', to_jsonb(reasons), 'administration_form_id', form, 'interaction_pattern_family_id', ipf);
end $fn$;

-- ===== 2. the Stage form check at every Stage for a dimension that registers verbs =====
create table if not exists public.t3a_stage_form_dimension_verb (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), verb text not null, reason text not null, primary key (dimension_id, verb));
alter table public.t3a_stage_form_dimension_verb enable row level security;
revoke all on public.t3a_stage_form_dimension_verb from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_stage_form_dimension_verb;
create trigger t3a_append_only before update or delete on public.t3a_stage_form_dimension_verb for each row execute function public.t3a_deny_mutation();

-- ===== 3. capacity_observation =====
create table if not exists public.t3a_source_sheet_field (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), field_name text not null, origin text not null, primary key (dimension_id, field_name));
create table if not exists public.t3a_capacity_term (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), term_code text not null, pattern text not null, primary key (dimension_id, term_code));
create table if not exists public.t3a_entry_subject_lead (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), lead_pattern text not null, primary key (dimension_id, lead_pattern));
create table if not exists public.t3a_never_rendered_field (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), field_name text not null, reason text not null, primary key (dimension_id, field_name));
alter table public.t3a_source_sheet_field enable row level security;
alter table public.t3a_capacity_term enable row level security;
alter table public.t3a_entry_subject_lead enable row level security;
alter table public.t3a_never_rendered_field enable row level security;
revoke all on public.t3a_source_sheet_field, public.t3a_capacity_term, public.t3a_entry_subject_lead, public.t3a_never_rendered_field from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_source_sheet_field;
create trigger t3a_append_only before update or delete on public.t3a_source_sheet_field for each row execute function public.t3a_deny_mutation();
drop trigger if exists t3a_append_only on public.t3a_capacity_term;
create trigger t3a_append_only before update or delete on public.t3a_capacity_term for each row execute function public.t3a_deny_mutation();
drop trigger if exists t3a_append_only on public.t3a_entry_subject_lead;
create trigger t3a_append_only before update or delete on public.t3a_entry_subject_lead for each row execute function public.t3a_deny_mutation();
drop trigger if exists t3a_append_only on public.t3a_never_rendered_field;
create trigger t3a_append_only before update or delete on public.t3a_never_rendered_field for each row execute function public.t3a_deny_mutation();

-- The problems a source version carries, as codes: a sheet key outside the declared set, or a list item (or the two descriptive fields) naming a capacity, age, origin, language or education.
-- A dimension with no declared field set is not checked (D2 to D4 are unchanged). The demonstration fixtures hold their sheet as text; the field names in that text are checked the same way.
create or replace function public.t3a_capacity_observation_check(p_body jsonb, p_dimension text) returns text[] language plpgsql stable security definer set search_path = public as $fn$
declare bad text[] := '{}'; k text; m text; fam text; it jsonb; t record; sheet jsonb := p_body -> 'source_sheet';
begin
  if not exists (select 1 from public.t3a_source_sheet_field f where f.dimension_id = p_dimension) then return bad; end if;
  if jsonb_typeof(sheet) is distinct from 'object' then return bad; end if;
  for k in select jsonb_object_keys(sheet) loop
    if k = 'source_sheet_text' then
      for m in select (regexp_matches(sheet ->> k, '`([a-z_0-9]+)`:', 'g'))[1] loop
        if not exists (select 1 from public.t3a_source_sheet_field f where f.dimension_id = p_dimension and f.field_name = m) then bad := bad || ('field:' || m); end if;
      end loop;
    elsif not exists (select 1 from public.t3a_source_sheet_field f where f.dimension_id = p_dimension and f.field_name = k) then
      bad := bad || ('field:' || k);
    end if;
  end loop;
  foreach fam in array array['indications', 'approach_changes', 'retention_grounds', 'knowledge_sources', 'open_points', 'trial_steps', 'next_work'] loop
    if jsonb_typeof(sheet -> fam) = 'array' then
      for it in select * from jsonb_array_elements(sheet -> fam) loop
        for t in select term_code, pattern from public.t3a_capacity_term c where c.dimension_id = p_dimension loop
          if coalesce(it ->> 'text', '') ~* t.pattern then bad := bad || ('item:' || fam || ':' || coalesce(it ->> 'id', '?') || ':' || t.term_code); end if;
        end loop;
      end loop;
    end if;
  end loop;
  foreach fam in array array['situation_shown', 'current_approach'] loop
    if jsonb_typeof(sheet -> fam) = 'string' then
      for t in select term_code, pattern from public.t3a_capacity_term c where c.dimension_id = p_dimension loop
        if (sheet ->> fam) ~* t.pattern then bad := bad || ('text:' || fam || ':' || t.term_code); end if;
      end loop;
    end if;
  end loop;
  return bad;
end $fn$;
revoke all on function public.t3a_capacity_observation_check(jsonb, text) from public, anon, authenticated;
grant execute on function public.t3a_capacity_observation_check(jsonb, text) to service_role;

-- The load guard: the source is refused at load and the refusal is logged. Nothing is repaired.
create or replace function public.t3a_capacity_observation_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare bad text[]; o public.t3a_content_object;
begin
  select * into o from public.t3a_content_object where content_object_id = new.content_object_id;
  if o.family::text = 'source' and o.dimension_id::text <> 'D1' then
    bad := public.t3a_capacity_observation_check(new.body, o.dimension_id::text);
    if cardinality(bad) > 0 then
      perform public.t3a_capture_refuse('source.load', 'capacity_observation', o.identifier, array_to_string(bad, ', '));
      return null;
    end if;
  end if;
  return new;
end $fn$;
revoke all on function public.t3a_capacity_observation_guard() from public, anon, authenticated;
drop trigger if exists t3a_3_capacity_observation_guard_trg on public.t3a_d1_content_version;
create trigger t3a_3_capacity_observation_guard_trg before insert or update of body on public.t3a_d1_content_version for each row execute function public.t3a_capacity_observation_guard();

-- A composed entry must begin as a statement of the participant, or as a record of the absence of a statement. Anything else has a different subject.
create or replace function public.t3a_entry_subject_check(p_dimension text, p_text text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
begin
  if not exists (select 1 from public.t3a_entry_subject_lead l where l.dimension_id = p_dimension) then return jsonb_build_object('outcome', 'ok'); end if;
  if exists (select 1 from public.t3a_entry_subject_lead l where l.dimension_id = p_dimension and btrim(coalesce(p_text, '')) ~* l.lead_pattern) then return jsonb_build_object('outcome', 'ok'); end if;
  return jsonb_build_object('outcome', 'violation', 'rule', 'capacity_observation');
end $fn$;
revoke all on function public.t3a_entry_subject_check(text, text) from public, anon, authenticated;
grant execute on function public.t3a_entry_subject_check(text, text) to service_role;

-- ===== 4. fields that are never rendered =====
-- The value of a never-rendered field on a source version: from its sheet, or from the sheet text of a demonstration fixture.
create or replace function public.t3a_sheet_field_value(p_body jsonb, p_field text) returns text language plpgsql immutable as $fn$
declare v text := p_body -> 'source_sheet' ->> p_field; m text[];
begin
  if v is not null then return v; end if;
  m := regexp_match(coalesce(p_body -> 'source_sheet' ->> 'source_sheet_text', ''), '`' || p_field || '`: ??(.*?)(?= `[a-z_0-9]+`:|$)');
  return m[1];
end $fn$;
revoke all on function public.t3a_sheet_field_value(jsonb, text) from public, anon, authenticated;

-- The one route that gives a source to a mentor or participant surface: the same body with every never-rendered field removed.
create or replace function public.t3a_source_display_body(p_version uuid) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; b jsonb; f record; txt text; k text;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return null; end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  b := v.body;
  for f in select field_name from public.t3a_never_rendered_field where dimension_id = o.dimension_id::text loop
    if b -> 'source_sheet' ? f.field_name then b := jsonb_set(b, '{source_sheet}', (b -> 'source_sheet') - f.field_name); end if;
    txt := b -> 'source_sheet' ->> 'source_sheet_text';
    if txt is not null then
      b := jsonb_set(b, '{source_sheet,source_sheet_text}', to_jsonb(btrim(regexp_replace(txt, '`' || f.field_name || '`: ??.*?(?= `[a-z_0-9]+`:|$)', '', 'g'))));
    end if;
    -- builder notes on a demonstration fixture that talk about the field are not part of what a surface shows
    if jsonb_typeof(b -> 'narrative') = 'object' then
      for k in select jsonb_object_keys(b -> 'narrative') loop
        if (b -> 'narrative' ->> k) ~* ('(^|[^a-z0-9_])' || f.field_name || '($|[^a-z0-9_])') then b := jsonb_set(b, '{narrative}', (b -> 'narrative') - k); end if;
      end loop;
    end if;
  end loop;
  return b;
end $fn$;
revoke all on function public.t3a_source_display_body(uuid) from public, anon, authenticated;
grant execute on function public.t3a_source_display_body(uuid) to service_role;

-- The scan every rendered output and export runs: the field name, or the value any source of the dimension holds for it, found in the text.
create or replace function public.t3a_never_rendered_check(p_dimension text, p_rendered text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare f jsonb := '[]'::jsonb; w record; s record; val text; t text := coalesce(p_rendered, '');
begin
  for w in select field_name from public.t3a_never_rendered_field where dimension_id = p_dimension loop
    if t ~* ('(^|[^a-z0-9_])' || w.field_name || '($|[^a-z0-9_])') then f := f || jsonb_build_object('rule', 'never_rendered_field', 'detail', w.field_name); end if;
    for s in select o.identifier, v.body from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id::text = p_dimension and o.family::text = 'source' loop
      val := public.t3a_sheet_field_value(s.body, w.field_name);
      if val is not null and length(btrim(val)) >= 15 and lower(btrim(val)) <> 'none' and position(lower(btrim(val)) in lower(t)) > 0 then
        f := f || jsonb_build_object('rule', 'never_rendered_value', 'detail', w.field_name || ' of ' || s.identifier);
      end if;
    end loop;
  end loop;
  return jsonb_build_object('passed', jsonb_array_length(f) = 0, 'findings', f);
end $fn$;
revoke all on function public.t3a_never_rendered_check(text, text) from public, anon, authenticated;
grant execute on function public.t3a_never_rendered_check(text, text) to service_role;

-- ===== 5. entries that carry no conduct toward recurrence (test D9-17): D9's row is at the end of this file, in the canonical register created by 20270201 =====
-- A clause instance of a registered entry type is a recurrence blocker: it keeps its key and its state but never counts toward the recurring frame and is never equivalent to another.
-- The library flag recurrence_blocker stays false for every D9 entry (Section 5.7); this register is the other route and D2 to D4 do not use it.
-- ===== D9 rows for the registers above (Execution Edition Sections 3.2, 5.5 and 5.7) =====
-- Section 5.7: a composed entry containing one of these refuses stage_form_violation, at every Stage.
-- D9 rows in the canonical multi page only register (created by 20270201; D4's row is there):
insert into public.t3a_multipage_only_dimension(dimension_id, directive) values
  ('D9','D9 Execution Edition Directive D-07 and test D9-67: a report that carries D9 renders through the multi page renderer only; a D9 only report renders as three pages')
on conflict do nothing;

insert into public.t3a_stage_form_dimension_verb(dimension_id, verb, reason) values
  ('D9','took','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','acted','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','sought','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','performed','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','applied','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','carried out','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','tried','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','tested','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','adopted','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','changed','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','adjusted','D9 5.7: every entry records a statement, so no performed act verb at any Stage'),
  ('D9','switched','D9 5.7: every entry records a statement, so no performed act verb at any Stage')
on conflict do nothing;

-- Section 5.5: a source sheet carries the platform core fields and the twenty D9 fields, each once, and no other field.
insert into public.t3a_source_sheet_field(dimension_id, field_name, origin) values
  ('D9','permitted_administration_variance','D9 5.5'),('D9','unsupported_inferences','D9 5.5'),('D9','compatibility_class','D9 5.5'),('D9','situation_shown','D9 5.5'),('D9','current_approach','D9 5.5'),
  ('D9','indications','D9 5.5'),('D9','approach_changes','D9 5.5'),('D9','retention_grounds','D9 5.5'),('D9','knowledge_sources','D9 5.5'),('D9','open_points','D9 5.5'),
  ('D9','trial_steps','D9 5.5'),('D9','next_work','D9 5.5'),('D9','record_place','D9 5.5'),('D9','practice_origin','D9 5.5'),('D9','account_test_point','D9 5.5'),
  ('D9','account_test_record','D9 5.5'),('D9','list_note','D9 5.5'),('D9','source_note','D9 5.5'),('D9','situation_class_label','D9 5.5'),('D9','observation_mode_label','D9 5.5'),
  ('D9','d9_situation_class','platform core'),('D9','workplace_demand','platform core'),('D9','relevant_conduct','platform core'),('D9','irrelevant_conduct','platform core'),
  ('D9','stated_standard','platform core'),('D9','stated_standard_source_quote_or_location','platform core'),('D9','cross_context_map','platform core'),('D9','serving_eligible','platform core'),
  ('D9','recurrence_eligible','platform core'),('D9','replacement_required','platform core'),('D9','name_clearance_status','platform core'),('D9','name_clearance_basis','platform core'),
  ('D9','sensitivity_flag','platform core'),('D9','min_seconds','platform core'),('D9','max_seconds','platform core'),('D9','ai_use','platform core, Stage 3'),('D9','submission_window_days','platform core, Stage 3')
on conflict do nothing;

-- Sections 3.2 and 5.2: no list item names the participant's ability, age, origin, language, education, disability or health, or a speed of learning.
insert into public.t3a_capacity_term(dimension_id, term_code, pattern) values
  ('D9','ability','\m(abilit(y|ies)|capable|capability|aptitude|intelligent|cognitive|gifted)\M'),
  ('D9','age','(\m[0-9]{1,2}[- ]years?[- ]old\M|\m(years|yrs) of age\M|\mage group\M|\m(older|younger|elderly) (worker|employee|person|participant|colleague)\M)'),
  ('D9','origin','\m(country of origin|place of origin|nationality|ethnic(ity)?|immigrant|foreign[- ]born|accent)\M'),
  ('D9','language','\m(first language|native language|mother tongue|native speaker|language skills?|language proficiency|english proficiency|limited english)\M'),
  ('D9','education','\m(education(al)? (level|background)|level of education|formal education|educated|schooling|literacy|literate|diploma)\M'),
  ('D9','health','\m(disabilit(y|ies)|neurodivergen(t|ce)|dyslexi(a|c)|autis(m|tic)|adhd|health condition|medical condition|impairment)\M'),
  ('D9','speed','\m(learning (speed|style|ability)|fast learner|slow learner|learns? (quickly|slowly)|how (quickly|readily) (the )?participant)\M')
on conflict do nothing;

-- Sections 3.2, 5.7: an entry is a statement ("the participant stated or named ..."), a record that no statement was observed, or a statement at the account test.
insert into public.t3a_entry_subject_lead(dimension_id, lead_pattern) values
  ('D9','^the participant (stated|named) '),
  ('D9','^no statement '),
  ('D9','^when an earlier statement was put back (to them|to the participant), ')
on conflict do nothing;

-- Section 5.5 and row 0.6.19: practice_origin is source truth only.
insert into public.t3a_never_rendered_field(dimension_id, field_name, reason) values
  ('D9','practice_origin','D9 5.5 and decision register row 0.6.19: retained for source truth only; never rendered, never on the mentor reference card, never the subject of an entry')
on conflict do nothing;

-- D9-17: an entry describing the record carries no conduct toward recurrence.
insert into public.t3a_recurrence_excluded_entry_type(dimension_id, entry_type, reason) values
  ('D9','record_status','D9 test D9-17: an entry describing the record (ST-D9-003, 008, 014, 019, 024, 029, 035, 040, 044) carries no conduct toward recurrence')
on conflict do nothing;
