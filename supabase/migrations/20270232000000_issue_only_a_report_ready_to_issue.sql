-- Found by the end to end report flow test (src/test/db/ber-generation-flow.db.test.ts): the issue route (t3a_d1_issue_report) checked the gates but not the report's
-- own state, so calling it again on a report that was already issued wrote a second issuance row (the report's status update is guarded by `status = 'ready_to_issue'`,
-- the insert before it was not). A report that is not ready to issue is refused by name before anything is written; an issued report changes only through the amendment route.
do $$
declare v_def text; v_new text; a text := $a$  v_reason := public.t3a_d1_can_issue(p_ber_report_id);$a$;
begin
  v_def := pg_get_functiondef('public.t3a_d1_issue_report(uuid,text)'::regprocedure);
  if position(a in v_def) = 0 then raise exception 'issue route changed: anchor not found'; end if;
  if position('REPORT_NOT_READY_TO_ISSUE' in v_def) > 0 then return; end if;
  v_new := replace(v_def, a, $r$  if exists (select 1 from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id and status <> 'ready_to_issue') then
    raise exception using message = 'ISSUANCE_REFUSED: REPORT_NOT_READY_TO_ISSUE', errcode = '22023';
  end if;
$r$ || a);
  execute v_new;
end $$;
