-- Rollback of 20270216000000_d8_session_archive_content.sql: removes the thirty D8 draft records (the registry table and its routines stay: the D4 content and the module use them). The records are drafts and nothing reads them.
alter table public.t3a_lsa_registry_record disable trigger t3a_append_only;
delete from public.t3a_lsa_registry_record where package_id = 'T3A-D8-LSA-CONTENT-001' and status = 'draft_for_approval';
alter table public.t3a_lsa_registry_record enable trigger t3a_append_only;
