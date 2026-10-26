-- Rollback of 20270232000000_issue_only_a_report_ready_to_issue.sql: takes the status check out of the issue route again.
do $$
declare v_def text; v_new text; blk text := E'  if exists (select 1 from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id and status <> ''ready_to_issue'') then\n    raise exception using message = ''ISSUANCE_REFUSED: REPORT_NOT_READY_TO_ISSUE'', errcode = ''22023'';\n  end if;\n';
begin
  v_def := pg_get_functiondef('public.t3a_d1_issue_report(uuid,text)'::regprocedure);
  if position(blk in v_def) = 0 then raise notice 'nothing to roll back'; return; end if;
  execute replace(v_def, blk, '');
end $$;
