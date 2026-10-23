-- CR-28: one claim package per dimension on a multi page report, by a fixed rule held as versioned configuration.
--  (a) the rule: the clause whose recurrence is available; otherwise the earliest conduct bearing clause of the latest composed statement; ties by conduct element order
--  (b) it never looks at whether the conduct appears favourable; its version is configuration and is recorded on every issued report (it refuses to issue when unloaded)
--  (c) before issue the participant sees the entry selected for each dimension; every other entry stays visible in the record
--  (d) no demonstration face of a real participant (the claim package route serves only an issued, non specimen report; already so, tested here)
insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by)
select 'claim_package_rule_version', '1.0', '1.0', '00000000-0000-0000-0000-000000000000'::uuid
where coalesce((select nullif(btrim(c.configuration_value), '') from public.t3a_configuration_value c where c.configuration_key = 'claim_package_rule_version' order by c.configuration_seq desc limit 1), '') = '';

alter table public.t3a_d1_ber_report add column if not exists claim_package_rule_version text;

create or replace function public.t3a_cr28_rule_version() returns text language sql stable security definer set search_path = public as $fn$
  select nullif(btrim(configuration_value), '') from public.t3a_configuration_value where configuration_key = 'claim_package_rule_version' order by configuration_seq desc limit 1
$fn$;
revoke all on function public.t3a_cr28_rule_version() from public, anon;
grant execute on function public.t3a_cr28_rule_version() to authenticated, service_role;

-- the version in force is stamped on the report when it is issued; with the rule unloaded a report is not issued
create or replace function public.t3a_cr28_stamp_rule_version() returns trigger language plpgsql security definer set search_path = public as $fn$
declare v text;
begin
  if new.issued_at is not null and (tg_op = 'INSERT' or old.issued_at is null) and new.claim_package_rule_version is null then
    v := public.t3a_cr28_rule_version();
    if v is null then raise exception 'T3A_CLAIM_PACKAGE_RULE_UNLOADED: the claim package selection rule has no version loaded, so the report is not issued' using errcode = '23514'; end if;
    new.claim_package_rule_version := v;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_cr28_stamp_rule_version_trg on public.t3a_d1_ber_report;
create trigger t3a_cr28_stamp_rule_version_trg before insert or update on public.t3a_d1_ber_report for each row execute function public.t3a_cr28_stamp_rule_version();

-- the selection for one dimension of one participant: the chosen entry and every other entry of the record
create or replace function public.t3a_cr28_select_entry(p_participant uuid, p_dimension text, p_include_test boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare v_ver text := public.t3a_cr28_rule_version(); es jsonb; pick jsonb; others jsonb;
begin
  if v_ver is null then return jsonb_build_object('outcome', 'refused', 'reason', 'claim_package_rule_unloaded'); end if;
  es := public.t3a_evidence_state(p_participant, p_dimension, p_include_test);
  with cand as (
    select cix ->> 'recurrence_equivalence_key_id' as k, cix ->> 'state_code' as state_code, z.cl ->> 'clause_text' as clause_text, o.cid as composed_statement_id, cs.composed_at, cix ->> 'conduct_element_id' as ce,
           exists (select 1 from jsonb_array_elements(es -> 'recurrence') x where x ->> 'recurrence_equivalence_key_id' = cix ->> 'recurrence_equivalence_key_id' and (x ->> 'available')::boolean) as rec
      from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o
      join public.t3a_dimension_composed_statement cs on cs.composed_statement_id = o.cid
      cross join lateral jsonb_array_elements(o.ci) cix
      cross join lateral (select c2 as cl from jsonb_array_elements(cs.clauses) c2 where c2 ->> 'state_code' = cix ->> 'state_code' limit 1) z
     where coalesce(z.cl ->> 'entry_type', 'conduct_bearing') = 'conduct_bearing'),
  ranked as (select cand.*, row_number() over (order by rec desc, composed_at desc, ce) as rn from cand)
  select (select to_jsonb(r) - 'rn' from ranked r where rn = 1), coalesce((select jsonb_agg(to_jsonb(r) - 'rn' order by rn) from ranked r where rn > 1), '[]'::jsonb) into pick, others;
  if pick is null then return jsonb_build_object('outcome', 'refused', 'reason', 'claim_package_absent', 'detail', p_dimension); end if;
  return jsonb_build_object('outcome', 'selected', 'dimension_id', p_dimension, 'rule_version', v_ver, 'selected', pick, 'other_entries', others);
end $fn$;
revoke all on function public.t3a_cr28_select_entry(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.t3a_cr28_select_entry(uuid, text, boolean) to service_role;

-- the participant's review before issue: the entry selected for each dimension of the report, and every other entry, in the participant's own record
create or replace function public.t3a_cr28_review(p_ber_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare r public.t3a_d1_ber_report; d text; sel jsonb; out jsonb := '[]'::jsonb;
begin
  select * into r from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if r.ber_report_id is null or (r.participant_id is distinct from auth.uid() and not public.t3a_is_service_context()) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'REPORT_NOT_AVAILABLE');
  end if;
  foreach d in array (select array_agg(x order by substring(x from 2)::int) from unnest(coalesce(r.represented_dimension_ids, array[r.dimension_id::text])) x) loop
    sel := public.t3a_cr28_select_entry(r.participant_id, d, false);
    if sel ->> 'outcome' <> 'selected' then return sel; end if;
    out := out || sel;
  end loop;
  return jsonb_build_object('outcome', 'review', 'ber_report_id', r.ber_report_id, 'rule_version', public.t3a_cr28_rule_version(), 'issued_rule_version', r.claim_package_rule_version, 'dimensions', out);
end $fn$;
revoke all on function public.t3a_cr28_review(uuid) from public, anon;
grant execute on function public.t3a_cr28_review(uuid) to authenticated, service_role;
