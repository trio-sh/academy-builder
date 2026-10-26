-- Rollback of 20270224000000_d9_seeds.sql. Removes only D9 rows and sets the review item bound back to the larger of 29 and the highest item left (D5 and D8 items may still be there; CR-291). Run before the D9 content rollback.
-- PV-D9-1.0 stays (loaded by CR-16); the eleven words marked cross_dimension_assertion return to the reason CR-16 gave them.
delete from public.t3a_question_definition where dimension_id = 'D9';
delete from public.t3a_stage_form_question where dimension_id = 'D9';
update public.t3a_d1_statement_library set recurrence_blocker = false where dimension_id = 'D9';
delete from public.t3a_dimension_review_item where dimension_id = 'D9';
alter table public.t3a_dimension_review_item drop constraint if exists t3a_dimension_review_item_item_no_check;
do $c$ declare m int; begin
  select greatest(coalesce(max(item_no), 0), 29) into m from public.t3a_dimension_review_item;
  execute format('alter table public.t3a_dimension_review_item add constraint t3a_dimension_review_item_item_no_check check (item_no between 1 and %s)', m);
end $c$;
update public.t3a_rce_prohibited_vocabulary set reason = 'T3A-D9 Execution Edition v1.1 Section 5.7a prohibited vocabulary' where dimension_id = 'D9' and version = 'PV-D9-1.0' and reason = 'cross_dimension_assertion';
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D9' and version = 'PV-D9-4.2';
delete from public.t3a_d1_specification_cooldown where dimension_id = 'D9';
delete from public.t3a_interaction_pattern_family where dimension_id = 'D9';
alter table public.t3a_dimension_placeholder disable trigger t3a_append_only;
delete from public.t3a_dimension_placeholder where dimension_id = 'D9';
alter table public.t3a_dimension_placeholder enable trigger t3a_append_only;
