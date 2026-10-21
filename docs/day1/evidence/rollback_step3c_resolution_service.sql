-- Rollback of 20261206000000_step3_resolution_service.sql
drop function if exists public.t3a_resolution_coverage(text, jsonb);
drop function if exists public.t3a_cov_groups(text);
drop function if exists public.t3a_cov_options(text, text);
drop function if exists public.t3a_resolve_observation(text, text, jsonb, jsonb, boolean);
drop function if exists public.t3a_resolve_core(text, text, jsonb, jsonb, boolean);
drop function if exists public.t3a_missing_state_codes();
alter table public.t3a_d1_branch_rule drop column if exists parent_question, drop column if exists child_question, drop column if exists serving_answers;
