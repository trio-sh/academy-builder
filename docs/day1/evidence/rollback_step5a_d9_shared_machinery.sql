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
