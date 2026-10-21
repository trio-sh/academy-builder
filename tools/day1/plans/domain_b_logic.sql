-- ---------------------------------------------------------------------------------------------
-- Domain B behaviour (hand written; the tables above are generated)
-- ---------------------------------------------------------------------------------------------

create table if not exists public.t3a_consent_config (
  singleton boolean primary key default true check (singleton),
  enforce_gate boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.t3a_consent_config is 'Domain B switch. enforce_gate false (default): Stage entry and capture are not yet refused for want of consent, because the live screens still write the older consent tables (CR-035).';
insert into public.t3a_consent_config (singleton) values (true) on conflict do nothing;
alter table public.t3a_consent_config enable row level security;
revoke all on public.t3a_consent_config from anon, authenticated;

create table if not exists public.t3a_consent_refusal (
  refusal_id uuid primary key default gen_random_uuid(),
  account_id uuid,
  consent_type text,
  reason_code text not null,
  detail text,
  refused_at timestamptz not null default now()
);
comment on table public.t3a_consent_refusal is 'Domain B refused consent interactions (DT-05, DT-08). No consent row exists for these.';
drop trigger if exists t3a_append_only on public.t3a_consent_refusal;
create trigger t3a_append_only before update or delete on public.t3a_consent_refusal for each row execute function public.t3a_deny_mutation();
alter table public.t3a_consent_refusal enable row level security;
revoke all on public.t3a_consent_refusal from anon, authenticated;

-- Current status of one consent type for one scope. Exact dimension match: consent is never inherited.
-- A record with no stage code covers every stage of its dimension.
create or replace function public.t3a_consent_current(p_account uuid, p_type text, p_dim text, p_stage text default null)
returns text language sql stable security definer set search_path = public as $$
  select consent_status from public.t3a_consent_record
   where account_id = p_account and consent_type = p_type
     and consent_scope_dimension_id is not distinct from p_dim
     and (consent_scope_stage_code is null or consent_scope_stage_code is not distinct from p_stage)
     and (consent_expires_at is null or consent_expires_at > now())
   order by recorded_seq desc limit 1
$$;

create or replace function public.t3a_consent_refuse(p_account uuid, p_type text, p_reason text, p_detail text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into public.t3a_consent_refusal (account_id, consent_type, reason_code, detail) values (p_account, left(p_type, 80), p_reason, p_detail);
  return jsonb_build_object('outcome', 'refused', 'reason', p_reason, 'detail', p_detail);
end $$;

-- One consent interaction = one call = one consent type. Refusals are logged and return; they do not raise, so the log is kept.
create or replace function public.t3a_record_consent(
  p_account uuid, p_type text, p_status text, p_dim text, p_stage text,
  p_copy_version text, p_copy_hash text, p_method text, p_language text, p_purpose text,
  p_reuse text default 'future_only', p_consequence_displayed boolean default null, p_ip_hash text default null,
  p_expires timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_actor uuid := coalesce(auth.uid(), p_account); v_id uuid := gen_random_uuid(); v_prev uuid; v_evt text;
begin
  if not public.t3a_is_service_context() and auth.uid() is distinct from p_account then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ACTOR_MISMATCH', 'a person records consent only for their own account');
  end if;
  if p_type is null or p_type ~ '[,;\[\]{} ]' then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ONE_TYPE_PER_INTERACTION', 'one interaction carries exactly one consent_type');
  end if;
  if p_type in ('followup_contact', 'aggregate_regional', 'research_participation') then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ROUTE_DISABLED', p_type || ' capture is not enabled');
  end if;
  if p_type not in ('scenario_logging', 'mentor_observation', 'employer_share') then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_TYPE_UNKNOWN', 'not a listed consent_type');
  end if;
  if p_status = 'withdrawn' and p_consequence_displayed is not true then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSEQUENCE_NOT_DISPLAYED', 'the consequence of withdrawal must be shown before it is processed');
  end if;
  if not exists (select 1 from public.t3a_account where account_id = p_account) then
    return public.t3a_consent_refuse(p_account, p_type, 'ACCOUNT_UNKNOWN', 'no such account');
  end if;
  select consent_id into v_prev from public.t3a_consent_record
   where account_id = p_account and consent_type = p_type and consent_scope_dimension_id is not distinct from p_dim
     and consent_scope_stage_code is not distinct from p_stage
     and not exists (select 1 from public.t3a_consent_supersession s where s.consent_id = t3a_consent_record.consent_id)
   order by recorded_seq desc limit 1;
  insert into public.t3a_consent_record (consent_id, account_id, consent_type, consent_status, consent_copy_version, consent_copy_hash, consent_method,
      consent_language, consent_scope_dimension_id, consent_scope_stage_code, consequence_displayed, ip_address_hash, processing_purpose_id,
      authorization_basis_type, consent_actor_id, consent_effective_at, consent_expires_at, historical_reuse_scope)
  values (v_id, p_account, p_type, p_status, p_copy_version, p_copy_hash, p_method, p_language, p_dim, p_stage, p_consequence_displayed,
      p_ip_hash, p_purpose, 'consent', v_actor, now(), p_expires, p_reuse);
  if v_prev is not null then
    insert into public.t3a_consent_supersession (consent_id, superseded_by) values (v_prev, v_id);
  end if;
  v_evt := 'consent.' || p_status;
  perform public.t3a_emit_event(v_evt, 'PARTICIPANT', v_actor::text, 'participant', 'consent', v_id,
    case when p_status = 'withdrawn' then jsonb_build_object('consent_id', v_id, 'consequence_displayed', true) else jsonb_build_object('consent_id', v_id) end,
    'consent:' || v_id, null, p_account);
  return jsonb_build_object('outcome', 'recorded', 'consent_id', v_id, 'event', v_evt);
end $$;
revoke all on function public.t3a_record_consent(uuid,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz) from public, anon;
grant execute on function public.t3a_record_consent(uuid,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz) to authenticated, service_role;

-- Session Archive consent state: never_asked while no consent text is loaded and nothing has been recorded (DT-09).
create or replace function public.t3a_lsa_consent_state(p_account uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select lsa_consent_state from public.t3a_lsa_consent where account_id = p_account order by lsa_consent_timestamp desc nulls last limit 1), 'never_asked')
$$;

-- Gate: Stage entry and committed observation need current consent for that dimension (DT-06, DT-07).
-- Off until the enforce_gate switch is turned on, so the live screens keep working (CR-035).
create or replace function public.t3a_require_consent() returns trigger language plpgsql security definer set search_path = public as $$
declare v_dim text := to_jsonb(new)->>'dimension_id'; v_pid uuid := (to_jsonb(new)->>'participant_id')::uuid; v_stage text := to_jsonb(new)->>'stage_code';
  v_type text := tg_argv[0];
begin
  if not (select enforce_gate from public.t3a_consent_config) or v_pid is null then return new; end if;
  if public.t3a_consent_current(v_pid, v_type, v_dim, v_stage) is distinct from 'granted' then
    raise exception 'CONSENT_REQUIRED: % consent for dimension % is not granted; consent is never inherited across dimensions', v_type, coalesce(v_dim, 'unspecified') using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select * from (values ('t3a_stage_entry_event','mentor_observation'), ('t3a_observation','scenario_logging')) v(tbl, ctype) loop
    if to_regclass('public.' || r.tbl) is null then raise notice 'route % is absent', r.tbl; continue; end if;
    execute format('drop trigger if exists t3a_1_consent_gate_trg on public.%I', r.tbl);
    execute format('create trigger t3a_1_consent_gate_trg before insert on public.%I for each row execute function public.t3a_require_consent(%L)', r.tbl, r.ctype);
  end loop;
end $$;

-- The canonical consent record is now t3a_consent_record. consent.* events point their consent_id at it (CR-035).
update public.t3a_event_reference_rule set ref_table = 't3a_consent_record', ref_column = 'consent_id',
  note = 'Domain B: canonical consent record (was the legacy t3a_d1_consent)' where payload_key = 'consent_id';
