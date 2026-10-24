-- Rollback of 20270205000000_d5_session_archive_content.sql: removes the 30 inactive draft records of T3A-D5-LSA-CONTENT-001 (the registry table and the D4 records stay). Nothing reads a draft. Valid while none of them has been approved or activated.
alter table public.t3a_lsa_registry_record disable trigger t3a_append_only;
delete from public.t3a_lsa_registry_record where package_id = 'T3A-D5-LSA-CONTENT-001' and status = 'draft_for_approval';
alter table public.t3a_lsa_registry_record enable trigger t3a_append_only;
