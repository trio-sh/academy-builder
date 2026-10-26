-- Rollback of 20270211000000_d8_shared_machinery.sql: removes what the step added (D8 tables, guards and rows). Reconciliation (CR-290): the step no longer patches or re-creates any shared function, so there is nothing to restore here; the four shared functions are restored by rollback_step5z_reconcile_d5_d8_d9.sql, which MUST run first (the union functions read this step's tables). Order: 5z, then the D9 rollbacks, then these D8 rollbacks (11e, 11d, 11c, 11b, 11a), then the D5 rollbacks. Valid while no D8 source and no D8 commit exists: the source truth table is dropped, and the withheld source fields it holds are gone with it.
-- D8 rows in the canonical registers created by the D5 step (append only tables: the guard is lifted for these two deletes only)
alter table public.t3a_multipage_only_dimension disable trigger t3a_append_only;
delete from public.t3a_multipage_only_dimension where dimension_id = 'D8';
alter table public.t3a_multipage_only_dimension enable trigger t3a_append_only;
alter table public.t3a_recurrence_excluded_entry_type disable trigger t3a_append_only;
delete from public.t3a_recurrence_excluded_entry_type where dimension_id = 'D8';
alter table public.t3a_recurrence_excluded_entry_type enable trigger t3a_append_only;
drop trigger if exists t3a_2_source_boundary_guard_trg on public.t3a_d1_content_version;
drop trigger if exists t3a_2_source_truth_keep_trg on public.t3a_d1_content_version;
drop function if exists public.t3a_source_boundary_guard();
drop function if exists public.t3a_source_truth_keep();
drop function if exists public.t3a_source_truth(uuid);
drop function if exists public.t3a_entry_language_gate(text, jsonb);
alter table public.t3a_source_truth_field disable trigger t3a_append_only;
drop table if exists public.t3a_source_truth_field;
drop table if exists public.t3a_dimension_withheld_field;
drop table if exists public.t3a_dimension_source_field;
drop table if exists public.t3a_entry_language_rule;
drop table if exists public.t3a_stage_form_verb_dimension;
alter table public.t3a_dimension_rule disable trigger t3a_append_only;
drop table if exists public.t3a_dimension_rule;
