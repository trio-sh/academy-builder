-- Rollback of 20270204000000_d5_seeds.sql. Removes only D5 rows and restores the review item bound to 29. Run before the D5 content rollback.
delete from public.t3a_question_definition where dimension_id = 'D5';
delete from public.t3a_stage_form_question where dimension_id = 'D5';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D5';
delete from public.t3a_dimension_review_item where dimension_id = 'D5';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
do $c$ declare m int; begin
  select greatest(coalesce(max(item_no), 0), 29) into m from public.t3a_dimension_review_item;
  execute format('alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and %s)', m);
end $c$;
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D5';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D5';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D5';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D5';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;
