-- ---------------------------------------------------------------------------------------------
-- Domain G behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- DT-28: the verification code is random and cannot be derived from the report id.
create or replace function public.t3a_ber_verification_code() returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.verification_code is null then
    new.verification_code := upper(encode(gen_random_bytes(10), 'hex'));
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_verification_code_trg on public.t3a_d1_ber_report;
create trigger t3a_1_verification_code_trg before insert on public.t3a_d1_ber_report for each row execute function public.t3a_ber_verification_code();

-- DT-27: the reviewer is not the issuer.
create or replace function public.t3a_reviewer_not_issuer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.t3a_evidence_review r where r.ber_report_id = new.ber_report_id and r.reviewer_id = new.issued_by) then
    raise exception 'REVIEWER_IS_ISSUER: the person who reviewed the evidence for this report cannot issue it' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_reviewer_not_issuer_trg on public.t3a_d1_report_issuance;
create trigger t3a_1_reviewer_not_issuer_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_reviewer_not_issuer();

-- A review cannot be recorded by the person who already issued the same report (the other order of the same rule).
create or replace function public.t3a_issuer_not_reviewer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.t3a_d1_report_issuance i where i.ber_report_id = new.ber_report_id and i.issued_by = new.reviewer_id) then
    raise exception 'REVIEWER_IS_ISSUER: the issuer of this report cannot also be its reviewer' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_issuer_not_reviewer_trg on public.t3a_evidence_review;
create trigger t3a_1_issuer_not_reviewer_trg before insert on public.t3a_evidence_review for each row execute function public.t3a_issuer_not_reviewer();

-- Visibility moves only to a listed state and its change time follows.
create or replace function public.t3a_release_visibility_time() returns trigger language plpgsql as $$
begin
  if new.employer_visibility_state is distinct from old.employer_visibility_state then new.availability_changed_at := now(); end if;
  if old.employer_visibility_state = 'future_availability_withdrawn' and new.employer_visibility_state <> 'future_availability_withdrawn' then
    raise exception 'T3A_VISIBILITY_WITHDRAWN: a withdrawal of future availability cannot be reversed in place' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_release_visibility_trg on public.t3a_report_release;
create trigger t3a_1_release_visibility_trg before update on public.t3a_report_release for each row execute function public.t3a_release_visibility_time();
