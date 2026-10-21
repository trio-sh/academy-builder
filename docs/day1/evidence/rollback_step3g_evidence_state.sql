-- Rollback of 20261210000000_step3_evidence_state.sql (valid while no composed statement exists)
drop function if exists public.t3a_prohibited_output_check(text, text);
drop function if exists public.t3a_evidence_state_logged(uuid, text);
drop function if exists public.t3a_evidence_state(uuid, text, boolean);
drop function if exists public.t3a_es_obs(uuid, text, boolean);
drop function if exists public.t3a_current_composed(uuid, text);
drop function if exists public.t3a_contexts_related(text, uuid, uuid);
drop table if exists public.t3a_cross_context_relationship;
alter table public.t3a_dimension_statement_withdrawal disable trigger t3a_append_only;
drop table if exists public.t3a_dimension_statement_withdrawal;
drop index if exists public.t3a_dimension_composed_original_uq;
drop index if exists public.t3a_dimension_composed_supersedes_uq;
alter table public.t3a_dimension_composed_statement drop column if exists supersedes_composed_statement_id;
alter table public.t3a_dimension_composed_statement add constraint t3a_dimension_composed_statement_observation_ref_key unique (observation_ref);
delete from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D2' and version = 'PV-D2-4.2';
