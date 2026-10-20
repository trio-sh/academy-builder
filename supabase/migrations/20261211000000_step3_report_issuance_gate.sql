-- Step 3h: participant review, correction scope, the twenty-five item checklist run per dimension, and the issuance gate (D2 INS-006 080 to 088, INS-007 089 to 100).
--
-- t3a_report_issuance_gate answers one question: may this report be issued? It is read only and deterministic; a blocker names itself and there is no override.
-- t3a_dimension_amend_statement amends by supersession: a successful correction composes a NEW statement and nothing is edited in place.
-- t3a_report_render_gate refuses a one-page render of a report with more than one dimension (layout_overflow); it does not expand and it does not compress.
-- Issuing stays an explicit human act on the exact version set; this migration enables no issuance. The existing issuance route remains the socket that refuses.

-- ---------------------------------------------------------------------------------------------------------------------
-- The checklist, one definition per item. Items 1 to 23 apply to every dimension; items 24 and 25 are D2 specific (6.1).
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.t3a_dimension_review_item (
  item_no int not null check (item_no between 1 and 25),
  dimension_id text check (dimension_id is null or dimension_id ~ '^D[0-9]{1,2}$'),
  requirement text not null,
  primary key (item_no)
);
alter table public.t3a_dimension_review_item enable row level security;
revoke all on public.t3a_dimension_review_item from anon, authenticated;
insert into public.t3a_dimension_review_item (item_no, dimension_id, requirement) values
  (1, null, 'Every rendered sentence resolves to an approved statement identifier.'),
  (2, null, 'Every composed statement is immutable and carries a composed_statement_id.'),
  (3, null, 'Every observation binds to both the canonical source hash and the rendered-instance hash.'),
  (4, null, 'Every served question is answered or carries a permitted missing-state code.'),
  (5, null, 'No question marked NOT SERVED has an answer row or a missing-state code.'),
  (6, null, 'No child question was served without its parent branch condition being met.'),
  (7, null, 'Every bound selection came from the served source version.'),
  (8, null, 'The Stage 1 administration note renders only against a valid confirmation record for the exact source version and session instance.'),
  (9, null, 'The evidence state was derived at assembly and is not stored on any observation.'),
  (10, null, 'No multi-context claim rests on a cross-context relationship that does not exist.'),
  (11, null, 'Every recurrence claim carries an approved key and identical state_code across all qualifying contexts.'),
  (12, null, 'The full current observation set was tested for material contradiction before the threshold.'),
  (13, null, 'The evidence currency value is loaded and renders visibly in report block 4.'),
  (14, null, 'Conditions render in the Section 5.13 precedence order with the limitation first.'),
  (15, null, 'The prohibited-output check passed on rendered output.'),
  (16, null, 'No retired vocabulary appears in any rendered element.'),
  (17, null, 'Pre-issue participant review is complete with an explicit recorded outcome.'),
  (18, null, 'No correction is open against any record in the report.'),
  (19, null, 'Evidence Review and Issuing are held by two distinct actors, neither involved in any record in the report.'),
  (20, null, 'Every authority record carries its authorization state at the time of the action.'),
  (21, null, 'The report face carries no mentor identity.'),
  (22, null, 'The permitted-use and disclosure-limit texts are loaded at their recorded versions and render verbatim.'),
  (23, null, 'The availability and status block renders an employer-visibility state, and no release-to-organization construction appears anywhere in the output.'),
  (24, 'D2', 'D2 specific: no rendered D2 sentence uses a verb of purpose or disposition (checked against the Section 3.2 prohibited-verb list on rendered output).'),
  (25, 'D2', 'D2 specific: no element of the report is computed across dimensions, and no rendered D2 sentence names a third party.')
on conflict do nothing;

create table if not exists public.t3a_dimension_review_result (
  ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id),
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  item_no int not null references public.t3a_dimension_review_item(item_no),
  outcome text not null check (outcome in ('pass', 'fail', 'not_established')),
  reviewer_id uuid not null,
  version_set_hash char(64) not null,
  recorded_at timestamptz not null default now(),
  primary key (ber_report_id, dimension_id, item_no, recorded_at)
);
alter table public.t3a_dimension_review_result enable row level security;
revoke all on public.t3a_dimension_review_result from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_dimension_review_result;
create trigger t3a_append_only before update or delete on public.t3a_dimension_review_result for each row execute function public.t3a_deny_mutation();

-- Items a dimension must pass: 1 to 23 for all, plus the items tied to that dimension.
create or replace function public.t3a_review_items_for(p_dimension text) returns int[] language sql stable as $fn$
  select coalesce(array_agg(item_no order by item_no), '{}') from public.t3a_dimension_review_item where dimension_id is null or dimension_id = p_dimension
$fn$;

-- the statement traceability sheet carries the dimension (097)
alter table public.t3a_d1_statement_trace add column if not exists dimension_id text;

-- ---------------------------------------------------------------------------------------------------------------------
-- Correction scope (081, 082)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.t3a_report_correction_state(p_ber_report_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; dims text[]; open_cases jsonb; recs jsonb;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);
  select coalesce(jsonb_agg(jsonb_build_object('case', c.correction_case_id, 'kind', 'correction')), '[]'::jsonb) into open_cases
    from public.t3a_correction_case c where c.ber_report_id = p_ber_report_id and c.terminal_outcome is null and c.challenge_status not in ('upheld', 'amended', 'withdrawn');
  open_cases := open_cases || coalesce((select jsonb_agg(jsonb_build_object('case', k.challenge_case_id, 'kind', 'challenge')) from public.t3a_challenge_case k
    where (k.ber_report_id = p_ber_report_id or k.d1_ber_report_id = p_ber_report_id) and k.resolved_at is null), '[]'::jsonb);
  -- records under reconsideration, by dimension: the assignment is per observation record, so a D2 correction leaves the D1 record untouched
  select coalesce(jsonb_agg(jsonb_build_object('observation_record_id', o.observation_record_id, 'dimension_id', o.dimension_id, 'assignment', ra.reconsideration_assignment_id)), '[]'::jsonb) into recs
    from public.t3a_reconsideration_assignment ra join public.t3a_observation_record o on o.observation_record_id = ra.observation_record_id
   where o.participant_id = b.participant_id and o.dimension_id = any (dims) and ra.outcome is null;
  return jsonb_build_object('open', jsonb_array_length(open_cases) > 0 or jsonb_array_length(recs) > 0, 'cases', open_cases, 'records_under_reconsideration', recs);
end $fn$;

-- ---------------------------------------------------------------------------------------------------------------------
-- The issuance gate (083, 089 to 094). Every blocker names itself; no override exists.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.t3a_report_issuance_gate(p_ber_report_id uuid, p_reviewer uuid default null, p_issuer uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; dims text[]; d text; items int[]; blockers jsonb := '[]'::jsonb; passed int; latest_hash text; cs jsonb; act jsonb; rv uuid;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return jsonb_build_object('permitted', false, 'blockers', jsonb_build_array(jsonb_build_object('code', 'BER_REPORT_NOT_FOUND'))); end if;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);

  -- 083: pre-issue participant review is a precondition; non-response is not completion; no timeout, no deemed acceptance
  if not exists (select 1 from public.t3a_d1_participant_review_action a where a.ber_report_id = p_ber_report_id and a.action in ('reviewed_no_correction', 'correction_raised')) then
    blockers := blockers || jsonb_build_object('code', 'participant_review_incomplete', 'detail', 'no explicit recorded outcome; silence is never consent and no timeout applies');
  end if;
  -- 082: a correction open against any record in the report blocks the whole report
  cs := public.t3a_report_correction_state(p_ber_report_id);
  if (cs ->> 'open')::boolean then blockers := blockers || jsonb_build_object('code', 'correction_open', 'detail', cs); end if;
  -- 090: the checklist runs once per dimension present; a pass on one dimension never carries another
  foreach d in array dims loop
    items := public.t3a_review_items_for(d);
    select count(distinct r.item_no) into passed from public.t3a_dimension_review_result r
      where r.ber_report_id = p_ber_report_id and r.dimension_id = d and r.item_no = any (items)
        and r.outcome = 'pass' and r.recorded_at = (select max(x.recorded_at) from public.t3a_dimension_review_result x where x.ber_report_id = r.ber_report_id and x.dimension_id = r.dimension_id and x.item_no = r.item_no);
    if passed < cardinality(items) then
      blockers := blockers || jsonb_build_object('code', 'checklist_incomplete_or_failed', 'dimension_id', d, 'items_required', cardinality(items), 'items_passed', passed);
    end if;
    -- 091: the review is for the exact version set
    select r.version_set_hash into latest_hash from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.dimension_id = d order by r.recorded_at desc limit 1;
    if latest_hash is not null and b.version_set is not null and b.version_set <> '{}'::jsonb
       and latest_hash <> encode(extensions.digest(b.version_set::text, 'sha256'), 'hex') then
      blockers := blockers || jsonb_build_object('code', 'review_not_for_this_version_set', 'dimension_id', d);
    end if;
  end loop;
  -- 019 / 011: two distinct actors, neither involved in any record in the report
  if p_reviewer is not null then act := public.t3a_report_actor_gate(p_reviewer, p_ber_report_id, 'evidence_review'); if act ->> 'outcome' <> 'eligible' then blockers := blockers || jsonb_build_object('code', 'reviewer_not_eligible', 'detail', act ->> 'reason'); end if; end if;
  if p_issuer is not null then
    act := public.t3a_report_actor_gate(p_issuer, p_ber_report_id, 'issue');
    if act ->> 'outcome' <> 'eligible' then blockers := blockers || jsonb_build_object('code', 'issuer_not_eligible', 'detail', act ->> 'reason');
    elsif exists (select 1 from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.reviewer_id = p_issuer) then
      blockers := blockers || jsonb_build_object('code', 'issuer_not_eligible', 'detail', 'reviewer_cannot_issue');
    end if;
  end if;
  -- 013 / item 13: the evidence currency value must be loaded
  if coalesce((select btrim(configuration_value) from public.t3a_configuration_value where configuration_key = 'evidence_currency' order by configuration_seq desc limit 1), '') = '' then blockers := blockers || jsonb_build_object('code', 'evidence_currency_unloaded'); end if;
  return jsonb_build_object('permitted', jsonb_array_length(blockers) = 0, 'blockers', blockers, 'override_available', false);
end $fn$;
revoke all on function public.t3a_report_issuance_gate(uuid, uuid, uuid) from public, anon;
grant execute on function public.t3a_report_issuance_gate(uuid, uuid, uuid) to authenticated, service_role;

-- Backstop: whatever route writes an issuance for a report that is not D1 only passes the gate. D1 only reports keep their existing triggers.
create or replace function public.t3a_issuance_gate_backstop() returns trigger language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; g jsonb;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = new.ber_report_id;
  if b.ber_report_id is not null and exists (select 1 from unnest(coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) x where x <> 'D1') then
    g := public.t3a_report_issuance_gate(new.ber_report_id, null, new.issued_by);
    if not (g ->> 'permitted')::boolean then
      raise exception 'ISSUANCE_GATE: %', (g -> 'blockers')::text using errcode = '42501';
    end if;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_issuance_gate_backstop_trg on public.t3a_d1_report_issuance;
create trigger t3a_0_issuance_gate_backstop_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_issuance_gate_backstop();

-- ---------------------------------------------------------------------------------------------------------------------
-- Layout (095): one page cannot hold two dimensions. Refuse and log; never expand, never compress.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.t3a_report_render_gate(p_ber_report_id uuid, p_form text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; n int;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.render', 'BER_REPORT_NOT_FOUND', p_ber_report_id::text, 'no such report'); end if;
  if p_form not in ('one_page', 'multi_page') then return public.t3a_capture_refuse('report.render', 'render_input_invalid', p_ber_report_id::text, 'form must be one_page or multi_page'); end if;
  n := coalesce(cardinality(b.represented_dimension_ids), 1);
  if p_form = 'one_page' and n > 1 then
    return public.t3a_capture_refuse('report.render', 'layout_overflow', p_ber_report_id::text, 'mandatory content for ' || n || ' dimensions cannot render legibly on one page without omission or compression; the render does not expand');
  end if;
  return jsonb_build_object('outcome', 'renderable', 'form', p_form, 'dimension_blocks', n);
end $fn$;
revoke all on function public.t3a_report_render_gate(uuid, text) from public, anon;
grant execute on function public.t3a_report_render_gate(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- Amendment by supersession (084): the compose function gains the statement it replaces.
-- ---------------------------------------------------------------------------------------------------------------------

-- A successful correction (challenge case amended) composes a NEW statement for the same observation; the old one stays in the record.
create or replace function public.t3a_dimension_amend_statement(p_old uuid, p_case uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb default '{}'::jsonb, p_items jsonb default '{}'::jsonb, p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare o public.t3a_dimension_composed_statement; c public.t3a_correction_case; r jsonb; new_id uuid;
begin
  select * into o from public.t3a_dimension_composed_statement where composed_statement_id = p_old;
  if o.composed_statement_id is null then return public.t3a_capture_refuse('composition.amend', 'composed_statement_not_found', p_old::text, 'no such statement'); end if;
  if exists (select 1 from public.t3a_dimension_composed_statement n where n.supersedes_composed_statement_id = p_old) then
    return public.t3a_capture_refuse('composition.amend', 'already_superseded', p_old::text, 'a later statement already replaces this one'); end if;
  select * into c from public.t3a_correction_case where correction_case_id = p_case;
  if c.correction_case_id is null or c.participant_id <> o.participant_id or c.terminal_outcome is distinct from 'amended' then
    return public.t3a_capture_refuse('composition.amend', 'no_amended_case', p_old::text, 'amendment needs a correction case for this participant whose outcome is amended'); end if;
  -- compose into a scratch observation reference, then bind the result to the amended observation as a superseding statement
  r := public.t3a_dimension_compose(o.participant_id, p_source_version, p_stage, p_answers, p_missing, p_items, gen_random_uuid(), p_test_mode);
  if r ->> 'outcome' <> 'composed' then return r; end if;
  new_id := (r ->> 'composed_statement_id')::uuid;
  -- the composed row is append only, so the superseding row is written as a fresh row that points at the old one; the scratch row is a test or draft copy and is kept as a record of the attempt
  insert into public.t3a_dimension_composed_statement (dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, missing, selections, clauses, clause_instances, conditions, test_mode, supersedes_composed_statement_id)
    select dimension_id, o.observation_ref, participant_id, stage_code, source_version_id, answers, missing, selections, clauses,
           (select jsonb_agg(jsonb_set(ci, '{observation_id}', to_jsonb(o.observation_ref::text))) from jsonb_array_elements(n.clause_instances) ci), conditions, test_mode, p_old
      from public.t3a_dimension_composed_statement n where n.composed_statement_id = new_id
    returning composed_statement_id into new_id;
  return jsonb_build_object('outcome', 'amended', 'composed_statement_id', new_id, 'supersedes', p_old);
end $fn$;
revoke all on function public.t3a_dimension_amend_statement(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.t3a_dimension_amend_statement(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, boolean) to authenticated, service_role;
