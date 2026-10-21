-- ---------------------------------------------------------------------------------------------
-- Domain H behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_correction_request;
create trigger t3a_set_once_trg before update on public.t3a_correction_request for each row execute function public.t3a_set_once('correction_outcome');
drop trigger if exists t3a_set_once_trg on public.t3a_complaint;
create trigger t3a_set_once_trg before update on public.t3a_complaint for each row execute function public.t3a_set_once('complaint_acknowledged_at');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_challenge_case_outcome_chk') then
    alter table public.t3a_challenge_case add constraint t3a_challenge_case_outcome_chk check (challenge_outcome is null or challenge_outcome in ('upheld', 'amended', 'clause_withdrawn', 'not_upheld')) not valid;
    -- an outcome carries its reason code and its resolution time; a second check is a different person from the reconsiderer is enforced below
    alter table public.t3a_challenge_case add constraint t3a_challenge_case_resolution_chk check (challenge_outcome is null or (outcome_reason_code is not null and resolved_at is not null)) not valid;
    alter table public.t3a_challenge_case add constraint t3a_challenge_case_reason_code_chk check (outcome_reason_code is null or outcome_reason_code ~ '^[A-Za-z0-9_.:-]{1,64}$') not valid;
  end if;
end $$;

-- An upheld, amended or withdrawn-clause outcome needs a second check by someone other than the reconsiderer.
create or replace function public.t3a_challenge_second_check() returns trigger language plpgsql security definer set search_path = public as $$
declare v_recon uuid;
begin
  select reconsiderer_id into v_recon from public.t3a_reconsideration_assignment ra
   join public.t3a_correction_case cc on cc.correction_case_id = ra.correction_case_id where (cc.ber_report_id = new.ber_report_id or cc.ber_report_id = new.d1_ber_report_id) and ra.reconsiderer_id is not null limit 1;
  if new.second_check_actor_id is not null and (new.second_check_actor_id = v_recon or new.second_check_actor_id = new.opened_by) then
    raise exception 'SECOND_CHECK_NOT_INDEPENDENT: the second check is done by someone other than the reconsiderer and the person who opened the challenge' using errcode = '42501';
  end if;
  if new.challenge_outcome in ('upheld', 'amended', 'clause_withdrawn') and new.second_check_actor_id is null then
    raise exception 'SECOND_CHECK_REQUIRED: an outcome that changes the report needs a second check' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_second_check_trg on public.t3a_challenge_case;
create trigger t3a_1_second_check_trg before insert or update on public.t3a_challenge_case for each row execute function public.t3a_challenge_second_check();

-- The challenge table points at the older t3a_ber_report while issuance points at t3a_d1_ber_report (CR-052); this column ties a challenge to the D1 report.
alter table public.t3a_challenge_case add column if not exists d1_ber_report_id uuid references public.t3a_d1_ber_report(ber_report_id);

-- An open challenge with issuance_hold true holds the report: it cannot be issued until the challenge is resolved.
create or replace function public.t3a_issuance_hold() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.t3a_challenge_case c where (c.d1_ber_report_id = new.ber_report_id or c.ber_report_id = new.ber_report_id) and c.issuance_hold is true and c.resolved_at is null) then
    raise exception 'ISSUANCE_HELD: an open challenge holds this report until it is resolved' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_issuance_hold_trg on public.t3a_d1_report_issuance;
create trigger t3a_1_issuance_hold_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_issuance_hold();
