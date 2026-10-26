-- Rollback of 20270231000000_review_action_belongs_to_report.sql: the earlier policy (own participant_id only) and no table guard.
begin;
drop trigger if exists t3a_1_review_action_owns_report_trg on public.t3a_d1_participant_review_action;
drop function if exists public.t3a_review_action_owns_report();
drop policy if exists t3a_d1_participant_review_action_insert_own on public.t3a_d1_participant_review_action;
create policy t3a_d1_participant_review_action_insert_own on public.t3a_d1_participant_review_action for insert to authenticated with check (participant_id = auth.uid());
commit;
