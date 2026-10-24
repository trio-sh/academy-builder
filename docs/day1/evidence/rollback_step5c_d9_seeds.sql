-- Rollback of 20270224000000_d9_seeds.sql. Removes only D9 rows and restores the review item bound to 29 (the bound D4 left). Run before the D9 content rollback.
-- PV-D9-1.0 stays (loaded by CR-16); the eleven words marked cross_dimension_assertion return to the reason CR-16 gave them.
delete from public.t3a_question_definition where dimension_id = 'D9';
delete from public.t3a_stage_form_question where dimension_id = 'D9';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D9';
delete from public.t3a_dimension_review_item where dimension_id = 'D9';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (((item_no >= 1) AND (item_no <= 29)));
update public.t3a_rce_prohibited_vocabulary set reason = 'T3A-D9 Execution Edition v1.1 Section 5.7a prohibited vocabulary' where dimension_id = 'D9' and version = 'PV-D9-1.0' and reason = 'cross_dimension_assertion';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D9' and version = 'PV-D9-4.2';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D9';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D9';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D9';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;
