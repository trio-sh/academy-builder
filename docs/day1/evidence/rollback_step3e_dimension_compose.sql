-- Rollback of 20261208000000_step3_dimension_compose.sql (valid while no composed statement exists)
drop function if exists public.t3a_clause_instances_compare(jsonb, jsonb);
drop function if exists public.t3a_dimension_compose(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, boolean);
alter table public.t3a_dimension_composed_statement disable trigger t3a_append_only;
drop table if exists public.t3a_dimension_composed_statement;
alter table public.t3a_d1_statement_library drop column if exists recurrence_blocker;
