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
