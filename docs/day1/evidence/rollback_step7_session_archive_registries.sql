-- Rollback of 20261227000000_session_archive_registries_dormant.sql and 20261228000000_d4_session_archive_content.sql (drops the registry table and its routines; the records are drafts and nothing reads them).
drop function if exists public.t3a_lsa_load_package(jsonb);
drop trigger if exists t3a_0_lsa_registry_guard_trg on public.t3a_lsa_registry_record;
drop function if exists public.t3a_lsa_registry_guard();
drop function if exists public.t3a_lsa_flag(text);
drop table if exists public.t3a_lsa_registry_record;
