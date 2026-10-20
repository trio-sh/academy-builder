-- Rollback of 20261211000000_step3_report_issuance_gate.sql
drop trigger if exists t3a_0_issuance_gate_backstop_trg on public.t3a_d1_report_issuance;
drop function if exists public.t3a_issuance_gate_backstop();
drop function if exists public.t3a_dimension_amend_statement(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, boolean);
drop function if exists public.t3a_report_render_gate(uuid, text);
drop function if exists public.t3a_report_issuance_gate(uuid, uuid, uuid);
drop function if exists public.t3a_report_correction_state(uuid);
drop function if exists public.t3a_review_items_for(text);
alter table public.t3a_dimension_review_result disable trigger t3a_append_only;
drop table if exists public.t3a_dimension_review_result;
drop table if exists public.t3a_dimension_review_item;
alter table public.t3a_d1_statement_trace drop column if exists dimension_id;
