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
