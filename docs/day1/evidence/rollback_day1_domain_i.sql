-- Rollback for 20261112 (Domain I). Applied to production 20 Oct 2026 with the employer application table empty.
drop trigger if exists t3a_capture_state_fill on public.t3a_employer_application;
drop trigger if exists t3a_2_required_fields_trg on public.t3a_employer_application;
drop trigger if exists t3a_1_employer_application_fill_trg on public.t3a_employer_application;
alter table public.t3a_employer_application drop column if exists application_status, drop column if exists free_provider_refused, drop column if exists free_provider_refused_capture_state, drop column if exists domain_age_flag, drop column if exists domain_age_flag_capture_state, drop column if exists accepting_person_name, drop column if exists accepting_person_title, drop column if exists record_use_terms_version, drop column if exists terms_accepted_at, drop column if exists approver_id;
alter table public.t3a_employer_application drop constraint if exists t3a_employer_application_approval_decision_check;
alter table public.t3a_employer_application add constraint t3a_employer_application_approval_decision_check check (approval_decision = any (array['approved'::text, 'withdrawn'::text]));
drop table if exists public.t3a_employment_linkage_socket, public.t3a_workspace_note, public.t3a_employer_attestation, public.t3a_hire_record,
  public.t3a_employer_contact_request, public.t3a_employer_pool_query, public.t3a_employer_organization, public.t3a_employer_free_provider cascade;
delete from public.t3a_field_physical_map where qualified_name like 'I.%';
drop function if exists public.t3a_employer_application_fill_live(), public.t3a_employer_is_verified(uuid), public.t3a_pool_query(uuid, jsonb), public.t3a_employer_gate(uuid, text);
