-- Rollback of 20261209000000_step3_stage1_and_authorization.sql
drop function if exists public.t3a_s1_evidence_note(uuid);
drop function if exists public.t3a_report_actor_gate(uuid, uuid, text);
drop function if exists public.t3a_report_involved(uuid, uuid, text[]);
drop function if exists public.t3a_observer_gate(uuid, text, uuid);
drop function if exists public.t3a_stage_2_entry_attempt(uuid, text);
drop function if exists public.t3a_stage_2_entry_gate(uuid, text);
drop function if exists public.t3a_latest_progression(uuid, text);
drop trigger if exists t3a_0_s1_confirmation_pin_trg on public.t3a_d1_s1_confirmation;
drop function if exists public.t3a_s1_confirmation_pin();
alter table public.t3a_d1_s1_confirmation drop column if exists source_version_id, drop column if exists source_version_hash;
