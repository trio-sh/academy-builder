-- Rollback of 20261225000000_d4_seeds.sql. Removes only D4 rows and restores the review item bound to 27. Run before the D4 content rollback.
delete from public.t3a_question_definition where dimension_id = 'D4';
delete from public.t3a_stage_form_question where dimension_id = 'D4';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D4';
delete from public.t3a_dimension_review_item where dimension_id = 'D4';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (((item_no >= 1) AND (item_no <= 27)));
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D4';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D4';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D4';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D4';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;
