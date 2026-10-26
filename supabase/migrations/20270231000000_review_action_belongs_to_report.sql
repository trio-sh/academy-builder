-- Found by the end to end report flow test (src/test/db/ber-generation-flow.db.test.ts): the participant's review of a report (t3a_d1_participant_review_action) could be
-- recorded by ANY signed-in person for ANY report, because the insert policy only asked that participant_id be the caller's own id. The issuance check
-- (t3a_d1_can_issue) looks for a review row by report alone, so a stranger recording "reviewed, no correction" on someone else's report satisfied the rule that a
-- participant who has not answered blocks issuance. The review row must name the report's own participant, by policy for signed-in callers and by a table guard for every route.
drop policy if exists t3a_d1_participant_review_action_insert_own on public.t3a_d1_participant_review_action;
create policy t3a_d1_participant_review_action_insert_own on public.t3a_d1_participant_review_action for insert to authenticated
  with check (participant_id = auth.uid() and exists (select 1 from public.t3a_d1_ber_report r where r.ber_report_id = t3a_d1_participant_review_action.ber_report_id and r.participant_id = auth.uid()));

create or replace function public.t3a_review_action_owns_report() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.t3a_d1_ber_report r where r.ber_report_id = new.ber_report_id and r.participant_id = new.participant_id) then
    raise exception 'REVIEW_ACTION_NOT_OWNERS: the participant review of a report is recorded by that report''s own participant' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_review_action_owns_report_trg on public.t3a_d1_participant_review_action;
create trigger t3a_1_review_action_owns_report_trg before insert on public.t3a_d1_participant_review_action for each row execute function public.t3a_review_action_owns_report();
