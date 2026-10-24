-- Rollback of 20270214000000_d8_seeds.sql. Removes only D8 rows and sets the review item bound back to the larger of 29 and the highest item left. Run before the D8 content rollback.
delete from public.t3a_question_definition where dimension_id = 'D8';
delete from public.t3a_stage_form_question where dimension_id = 'D8';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D8';
delete from public.t3a_dimension_review_item where dimension_id = 'D8';
do $c$ declare m int; begin
  select greatest(coalesce(max(item_no), 0), 29) into m from public.t3a_dimension_review_item;
  alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
  execute format('alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and %s)', m);
end $c$;
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D8';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D8';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D8';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D8';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;
