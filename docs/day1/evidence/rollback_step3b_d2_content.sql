-- Rollback of 20261205000000_d2_content_registry.sql. Removes only D2 rows and the objects the migration added. Valid while no D2 content has been approved or used.
delete from public.t3a_d1_content_load_event where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D2');
delete from public.t3a_d1_statement_library where dimension_id = 'D2';
delete from public.t3a_d1_content_version where content_object_id in (select content_object_id from public.t3a_content_object where dimension_id = 'D2');
delete from public.t3a_content_object where dimension_id = 'D2';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D2';
delete from public.t3a_d1_condition_precedence where dimension_id = 'D2';
delete from public.t3a_d1_language_template where dimension_id = 'D2';
delete from public.t3a_d1_branch_rule where dimension_id = 'D2';
delete from public.t3a_d1_question_capture_map where dimension_id = 'D2';
delete from public.t3a_d1_capture_line where dimension_id = 'D2';
delete from public.t3a_d1_capture_set where dimension_id = 'D2';
delete from public.t3a_d1_question_object where dimension_id = 'D2';
-- (t3a_resolution_refusal_rule is append only: disable the trigger to clear it)
alter table public.t3a_resolution_refusal_rule disable trigger t3a_append_only;
drop table if exists public.t3a_resolution_refusal_rule;
alter table public.t3a_d1_statement_library drop constraint if exists t3a_d1_statement_library_entry_type_check;
alter table public.t3a_d1_statement_library drop column if exists question_code, drop column if exists answer_code, drop column if exists applicable_stages, drop column if exists given_condition, drop column if exists entry_type;
-- the question capture map guard returns to the D1 definition in rollback_step3_dimension_readers.sql / the original migration 20261030000000
