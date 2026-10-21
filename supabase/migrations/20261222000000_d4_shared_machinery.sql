-- Step 5pre: what D4 adds to the shared machinery (D4 Execution Edition v2.2: Directive D-06 commit seal, Directive D-07 multi page only, the Stage 1 channel limit, tests D4-61, D4-65 to D4-67).
--
-- 1. The commit seal (D-06): every production commit of a dimension determination is signed by the server under a key that is not in the database. A key that is not loaded refuses the commit; an altered record cannot be resealed
--    without the key; an observation identifier already committed is refused. 2. The Stage 1 form check also bars named questions (D4: a written response cannot evidence a channel used).
-- 3. D-07: a report that carries D4 renders through the multi page renderer only; the single page route refuses format_mismatch.

-- ===== 1. the commit seal =====
create table if not exists public.t3a_commit_seal (
  composed_statement_id uuid primary key references public.t3a_dimension_composed_statement(composed_statement_id),
  observation_ref uuid not null, participant_id uuid not null, dimension_id text not null,
  is_superseding boolean not null default false,
  payload_hash text not null, seal text not null, key_version text not null default 'k1', sealed_at timestamptz not null default now()
);
create unique index if not exists t3a_commit_seal_one_original on public.t3a_commit_seal (observation_ref) where not is_superseding;
alter table public.t3a_commit_seal enable row level security;
revoke all on public.t3a_commit_seal from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_commit_seal;
create trigger t3a_append_only before update or delete on public.t3a_commit_seal for each row execute function public.t3a_deny_mutation();

-- The signing key is a runtime setting supplied by the server environment (t3a.commit_seal_key); it is never written to a table or a migration. Unset, the commit refuses.
create or replace function public.t3a_commit_seal_key() returns text language sql stable as $fn$
  select nullif(current_setting('t3a.commit_seal_key', true), '')
$fn$;
revoke all on function public.t3a_commit_seal_key() from public, anon, authenticated;

create or replace function public.t3a_commit_payload(p_composed uuid) returns text language sql stable security definer set search_path = public as $fn$
  select concat_ws('|', c.composed_statement_id::text, c.observation_ref::text, c.participant_id::text, c.dimension_id, c.stage_code, c.source_version_id::text, c.answers::text, c.missing::text, c.selections::text, c.clauses::text, c.clause_instances::text, c.conditions::text)
    from public.t3a_dimension_composed_statement c where c.composed_statement_id = p_composed
$fn$;
revoke all on function public.t3a_commit_payload(uuid) from public, anon, authenticated;

create or replace function public.t3a_seal_composed(p_composed uuid, p_superseding boolean default false) returns void language plpgsql security definer set search_path = public, extensions as $fn$
declare k text := public.t3a_commit_seal_key(); pl text := public.t3a_commit_payload(p_composed); c public.t3a_dimension_composed_statement;
begin
  if k is null then raise exception 'COMMIT_SEAL_KEY_UNLOADED'; end if;
  select * into c from public.t3a_dimension_composed_statement where composed_statement_id = p_composed;
  insert into public.t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal)
    values (p_composed, c.observation_ref, c.participant_id, c.dimension_id, p_superseding, encode(extensions.digest(pl, 'sha256'), 'hex'), encode(extensions.hmac(pl, k, 'sha256'), 'hex'));
end $fn$;
revoke all on function public.t3a_seal_composed(uuid, boolean) from public, anon, authenticated;

-- Verification recomputes the signature from the stored record. A recomputed content hash cannot reproduce it without the key.
create or replace function public.t3a_verify_commit_seal(p_composed uuid) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $fn$
declare s public.t3a_commit_seal; k text := public.t3a_commit_seal_key(); pl text := public.t3a_commit_payload(p_composed);
begin
  select * into s from public.t3a_commit_seal where composed_statement_id = p_composed;
  if s.composed_statement_id is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_absent'); end if;
  if k is null then return jsonb_build_object('valid', false, 'reason', 'commit_seal_key_unloaded'); end if;
  if encode(extensions.hmac(pl, k, 'sha256'), 'hex') <> s.seal then return jsonb_build_object('valid', false, 'reason', 'commit_seal_invalid'); end if;
  return jsonb_build_object('valid', true);
end $fn$;
revoke all on function public.t3a_verify_commit_seal(uuid) from public, anon, authenticated;
grant execute on function public.t3a_verify_commit_seal(uuid) to service_role;

-- The resubmission check: logs commit_seal_invalid when an altered committed record is presented again.
create or replace function public.t3a_commit_seal_check(p_composed uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v jsonb := public.t3a_verify_commit_seal(p_composed);
begin
  if (v ->> 'valid')::boolean then return jsonb_build_object('outcome', 'valid'); end if;
  return public.t3a_capture_refuse('commit.seal', v ->> 'reason', coalesce(p_composed::text, ''), 'the commit record does not carry a valid server seal');
end $fn$;
revoke all on function public.t3a_commit_seal_check(uuid) from public, anon, authenticated;
grant execute on function public.t3a_commit_seal_check(uuid) to service_role;

-- ===== 2. composition seals a production commit and refuses a duplicate observation identifier =====
create or replace function public.t3a_dimension_compose(p_participant uuid, p_source_version uuid, p_stage text, p_answers jsonb, p_missing jsonb default '{}'::jsonb,
  p_items jsonb default '{}'::jsonb, p_observation_ref uuid default gen_random_uuid(), p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v public.t3a_d1_content_version; o public.t3a_content_object; dim text; st text := 'S' || p_stage;
  app jsonb := '{}'::jsonb; a record; q record; r record; res jsonb; k text; pv text; ans jsonb; need int; fam text; list jsonb; ids text[]; sel jsonb; sel_o jsonb; sel_c jsonb;
  bound jsonb := '{}'::jsonb; ms text; limit_kinds text[] := '{}'; line text; id uuid; clauses jsonb := '[]'::jsonb; ci jsonb := '[]'::jsonb; conds jsonb := '[]'::jsonb; el text; s jsonb;
  gate jsonb; fail jsonb; tags text[]; k2 text; arr jsonb; pn text; sf jsonb;
  committable text[] := array['declined', 'no_response', 'technical_failure', 'withdrawn'];
begin
  if p_stage !~ '^[1-4]$' then return public.t3a_capture_refuse('composition.commit', 'stage_unknown', coalesce(p_stage, ''), 'stage must be 1 to 4'); end if;
  if p_test_mode and not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('composition.commit', 'TEST_MODE_IS_SERVICE_ONLY', p_participant::text, 'test composition is the service route only');
  end if;
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('composition.commit', 'source_version_not_found', p_participant::text, p_source_version::text); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text;
  if coalesce(v.body ->> 'stage_code', '') <> st then return public.t3a_capture_refuse('composition.commit', 'source_stage_mismatch', p_participant::text, 'the source belongs to Stage ' || coalesce(v.body ->> 'stage_code', '?')); end if;
  if not p_test_mode then
    gate := public.t3a_source_serving_gate(p_source_version, st);
    if gate ->> 'outcome' <> 'servable' then return gate; end if;
  end if;

  -- applicability: read from the source's own per-question table. The Stage never decides service.
  for a in select x ->> 'question' as question, x ->> 'state' as state from jsonb_array_elements(coalesce(v.body -> 'question_applicability', '[]'::jsonb)) x loop
    app := app || jsonb_build_object(a.question, a.state);
  end loop;
  if app = '{}'::jsonb then return public.t3a_capture_refuse('composition.commit', 'applicability_table_absent', p_participant::text, 'the source carries no per-question applicability table'); end if;

  ans := coalesce(p_answers, '{}'::jsonb);
  for k in select jsonb_object_keys(coalesce(p_missing, '{}'::jsonb)) loop
    ms := p_missing ->> k;
    if not (ms = any (public.t3a_missing_state_codes())) then return public.t3a_capture_refuse('composition.commit', 'missing_state_not_postable', p_participant::text, k || ' ' || ms); end if;
    if ans ? k then return public.t3a_capture_refuse('composition.commit', 'answer_and_missing_state_both', p_participant::text, k); end if;
    ans := ans || jsonb_build_object(k, 'missing:' || ms);
  end loop;

  for q in select qo.question_code, qo.display_order, qo.answer_type from public.t3a_d1_question_object qo where qo.dimension_id = dim order by qo.display_order loop
    -- NOT SERVED: no answer row, no missing state. Not a null.
    if coalesce(app ->> q.question_code, 'NOT SERVED') = 'NOT SERVED' then
      if ans ? q.question_code or (p_items ? q.question_code) then return public.t3a_capture_refuse('composition.commit', 'answer_for_question_not_served', p_participant::text, q.question_code); end if;
      continue;
    end if;
    -- a child is reached only through a serving answer of its parent (a parent missing state means the child is never reached)
    select b.parent_question, b.serving_answers into r from public.t3a_d1_branch_rule b where b.dimension_id = dim and b.child_question = q.question_code;
    if r.parent_question is not null then
      pv := ans ->> r.parent_question;
      if pv is null or not (pv = any (r.serving_answers)) then
        if ans ? q.question_code or (p_items ? q.question_code) then return public.t3a_capture_refuse('composition.commit', 'child_not_reached', p_participant::text, q.question_code || ' follows ' || r.parent_question); end if;
        continue;
      end if;
    end if;
    -- a served question needs an answer or a committable missing state
    if not (ans ? q.question_code) then return public.t3a_capture_refuse('composition.commit', 'served_question_unanswered', p_participant::text, q.question_code); end if;
    if (ans ->> q.question_code) like 'missing:%' and not (substring(ans ->> q.question_code from 9) = any (committable)) then
      return public.t3a_capture_refuse('composition.commit', 'missing_state_not_committable', p_participant::text, q.question_code || ' ' || (ans ->> q.question_code));
    end if;
    if (ans ->> q.question_code) like 'missing:technical_failure' and not conds @> '["conditions_compromised"]'::jsonb then conds := conds || '["conditions_compromised"]'::jsonb; end if;
  end loop;

  -- bound selections: items come from the served source version only
  for q in select m.question_code, m.source_bound_family as fam, qo.answer_type from public.t3a_d1_question_capture_map m join public.t3a_d1_question_object qo using (dimension_id, question_code)
            where m.dimension_id = dim and m.source_bound_family is not null order by qo.display_order loop
    continue when not (ans ? q.question_code) or (ans ->> q.question_code) like 'missing:%' or coalesce(app ->> q.question_code, 'NOT SERVED') = 'NOT SERVED';
    list := v.body -> 'source_sheet' -> q.fam;
    if list is null or jsonb_typeof(list) <> 'array' or jsonb_array_length(list) = 0 then
      return public.t3a_capture_refuse('composition.commit', 'BOUND_FAMILY_ABSENT_OR_EMPTY', p_participant::text, q.question_code || ' needs ' || q.fam);
    end if;
    select l.line_text into line from public.t3a_d1_capture_line l where l.dimension_id = dim and l.capture_set_code = (select capture_set_code from public.t3a_d1_question_capture_map where dimension_id = dim and question_code = q.question_code)
       and l.line_order = substring(ans ->> q.question_code from 2)::int;
    sel := p_items -> q.question_code;
    ids := '{}';
    tags := array(select lower(mm[1]) from regexp_matches(line, 'LISTED:([A-Z_]+)', 'g') as mm);
    if cardinality(tags) > 0 then
      -- tagged selections: an object keyed by tag; a tag in the line needs at least one item, a tag outside the line takes none
      for k2 in select jsonb_object_keys(case when jsonb_typeof(sel) = 'object' then sel else '{}'::jsonb end) loop
        if not (k2 = any (tags)) and jsonb_array_length(coalesce(sel -> k2, '[]'::jsonb)) > 0 then
          return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': ' || line);
        end if;
      end loop;
      foreach k2 in array tags loop
        arr := case when jsonb_typeof(sel) = 'object' then coalesce(sel -> k2, '[]'::jsonb) else '[]'::jsonb end;
        if jsonb_array_length(arr) = 0 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': ' || line); end if;
        if exists (select 1 from jsonb_array_elements_text(arr) x where x = any (ids)) then return public.t3a_capture_refuse('composition.commit', 'item_marked_twice', p_participant::text, q.question_code); end if;
        ids := ids || array(select jsonb_array_elements_text(arr));
        select placeholder_name into pn from public.t3a_dimension_placeholder where dimension_id = dim and bound_to = q.question_code || ' LISTED:' || upper(k2);
        if pn is not null then bound := bound || jsonb_build_object(pn, jsonb_array_length(arr)); end if;
      end loop;
    else
      if line like 'LISTED%' then
        if sel is null or jsonb_typeof(sel) <> 'array' or jsonb_array_length(sel) = 0 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': a listed answer needs at least one item'); end if;
        if q.answer_type ilike '%exactly one%' and jsonb_array_length(sel) <> 1 then return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': exactly one item'); end if;
        ids := array(select jsonb_array_elements_text(sel));
        select placeholder_name into pn from public.t3a_dimension_placeholder where dimension_id = dim and bound_to = q.question_code || ' LISTED';
        if pn is not null then bound := bound || jsonb_build_object(pn, cardinality(ids)); end if;
      elsif sel is not null and sel <> '[]'::jsonb and sel <> '{}'::jsonb then
        return public.t3a_capture_refuse('composition.commit', 'selection_does_not_match_answer', p_participant::text, q.question_code || ': this answer takes no items');
      end if;
    end if;
    -- every item must be on THIS source version's list (an item from another version or a D1 source is refused)
    if exists (select 1 from unnest(ids) i where not exists (select 1 from jsonb_array_elements(list) e where e ->> 'id' = i)) then
      return public.t3a_capture_refuse('composition.commit', 'bound_item_not_on_source', p_participant::text, q.question_code || ' item not on ' || q.fam || ' of this source version');
    end if;
    if (select count(*) from unnest(ids) i) <> (select count(distinct i) from unnest(ids) i) then return public.t3a_capture_refuse('composition.commit', 'item_selected_twice', p_participant::text, q.question_code); end if;
  end loop;
  bound := bound || jsonb_build_object('affected_party_label', coalesce(v.body -> 'source_sheet' ->> 'affected_party', ''));
  if bound ->> 'affected_party_label' = '' then bound := bound - 'affected_party_label'; end if;

  res := public.t3a_resolve_core(dim, p_stage, ans, bound, p_test_mode);
  if res ->> 'outcome' = 'refused' then
    perform public.t3a_capture_refuse('composition.commit', coalesce(res ->> 'rule', res ->> 'reason'), p_participant::text, res ->> 'detail');
    return jsonb_build_object('outcome', 'refused', 'reason', coalesce(res ->> 'rule', res ->> 'reason'), 'detail', res ->> 'detail');
  end if;

  sf := public.t3a_stage_form_check(p_stage, res -> 'statements', dim);
  if sf ->> 'outcome' = 'violation' then
    perform public.t3a_capture_refuse('composition.commit', 'stage_form_violation', p_participant::text, (sf ->> 'statement_key') || ' uses the performed act verb ' || (sf ->> 'verb') || ' at Stage 1');
    return jsonb_build_object('outcome', 'refused', 'reason', 'stage_form_violation', 'detail', sf::text);
  end if;
  if p_stage = '1' then conds := conds || '["stage_1_only"]'::jsonb; end if;
  for s in select * from jsonb_array_elements(res -> 'statements') loop
    select qo.conduct_element into el from public.t3a_d1_question_object qo where qo.dimension_id = dim and qo.question_code = s ->> 'question_code';
    clauses := clauses || jsonb_build_object('conduct_element', el, 'question_code', s ->> 'question_code', 'state_code', s ->> 'statement_key', 'entry_type', s ->> 'entry_type', 'clause_text', s ->> 'text');
    ci := ci || jsonb_build_object('observation_id', p_observation_ref, 'conduct_element_id', el,
            'recurrence_equivalence_key_id', 'REK-' || dim || '-' || lpad(regexp_replace(el, '^.*-', ''), 3, '0'), 'state_code', s ->> 'statement_key',
            'recurrence_blocker', coalesce((select l.recurrence_blocker from public.t3a_d1_statement_library l where l.dimension_id = dim and l.statement_key = s ->> 'statement_key' limit 1), false));
  end loop;
  if not p_test_mode then
    if public.t3a_commit_seal_key() is null then return public.t3a_capture_refuse('composition.commit', 'commit_seal_key_unloaded', p_participant::text, 'the commit is signed by the server and the signing key is not loaded'); end if;
    if exists (select 1 from public.t3a_commit_seal x where x.observation_ref = p_observation_ref and not x.is_superseding) then
      return public.t3a_capture_refuse('composition.commit', 'observation_id_not_unique', p_observation_ref::text, 'an observation identifier already committed cannot be committed again; the first record stands');
    end if;
  end if;
  insert into public.t3a_dimension_composed_statement (dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, missing, selections, clauses, clause_instances, conditions, test_mode)
    values (dim, p_observation_ref, p_participant, st, p_source_version, coalesce(p_answers, '{}'::jsonb), coalesce(p_missing, '{}'::jsonb), coalesce(p_items, '{}'::jsonb), clauses, ci, conds, p_test_mode)
    returning composed_statement_id into id;
  if not p_test_mode then perform public.t3a_seal_composed(id, false); end if;
  return jsonb_build_object('outcome', 'composed', 'composed_statement_id', id, 'observation_ref', p_observation_ref, 'clauses', clauses, 'clause_instances', ci, 'conditions', conds);
end $fn$;

-- The superseding statement of an amendment is sealed too.
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
  if not p_test_mode then perform public.t3a_seal_composed(new_id, true); end if;
  return jsonb_build_object('outcome', 'amended', 'composed_statement_id', new_id, 'supersedes', p_old);
end $fn$;

-- ===== 3. the Stage 1 form check also bars named questions =====
create table if not exists public.t3a_stage_form_question (dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'), question_code text not null, reason text not null, primary key (dimension_id, question_code));
alter table public.t3a_stage_form_question enable row level security;
revoke all on public.t3a_stage_form_question from anon, authenticated;
drop function if exists public.t3a_stage_form_check(text, jsonb);
create or replace function public.t3a_stage_form_check(p_stage text, p_statements jsonb, p_dimension text default null) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare x jsonb; v text;
begin
  if regexp_replace(upper(p_stage), '^S', '') <> '1' then return jsonb_build_object('outcome', 'ok'); end if;
  for x in select * from jsonb_array_elements(coalesce(p_statements, '[]'::jsonb)) loop
    if p_dimension is not null and exists (select 1 from public.t3a_stage_form_question q where q.dimension_id = p_dimension and q.question_code = x ->> 'question_code') then
      return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', 'a channel use entry (' || (x ->> 'question_code') || ')');
    end if;
    for v in select verb from public.t3a_stage_form_verb loop
      if (x ->> 'text') ~* ('\m' || v || '\M') then
        return jsonb_build_object('outcome', 'violation', 'statement_key', x ->> 'statement_key', 'verb', v);
      end if;
    end loop;
  end loop;
  return jsonb_build_object('outcome', 'ok');
end $fn$;
revoke all on function public.t3a_stage_form_check(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.t3a_stage_form_check(text, jsonb, text) to service_role;

-- The issuance gate, with the commit seal check.
create or replace function public.t3a_report_issuance_gate(p_ber_report_id uuid, p_reviewer uuid default null, p_issuer uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; dims text[]; d text; items int[]; blockers jsonb := '[]'::jsonb; passed int; latest_hash text; cs jsonb; act jsonb; rv uuid; est jsonb; sid uuid; sv jsonb;
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
  -- 018, 019: the issuance floor. A D2 row may be issued only at observed in more than one context or above, with at least two distinct authorized observers across the mentor observed Stages.
  -- Stage 1 may contribute but never carries a D2 row alone.
  foreach d in array dims loop
    if d <> 'D1' then
      est := public.t3a_evidence_state(b.participant_id, d, false);
      if est ->> 'state' not in ('observed_multiple_contexts', 'recurring_across_stages') then
        blockers := blockers || jsonb_build_object('code', 'below_issuance_floor', 'dimension_id', d, 'state', est ->> 'state');
      end if;
      if (select count(distinct o.observer) from public.t3a_es_obs(b.participant_id, d, false) o where o.stage in ('S2', 'S3', 'S4') and o.observer is not null) < 2 then
        blockers := blockers || jsonb_build_object('code', 'fewer_than_two_authorized_observers', 'dimension_id', d);
      end if;
    end if;
  end loop;
  -- D-06: every current production statement of a non D1 dimension in the report carries a valid server seal
  foreach d in array dims loop
    if d <> 'D1' then
      for sid in select composed_statement_id from public.t3a_current_composed(b.participant_id, d) loop
        sv := public.t3a_verify_commit_seal(sid);
        if not (sv ->> 'valid')::boolean then blockers := blockers || jsonb_build_object('code', sv ->> 'reason', 'dimension_id', d, 'composed_statement_id', sid); end if;
      end loop;
    end if;
  end loop;
  -- 032: consent is never inherited; every non D1 dimension in the report needs its own grants
  foreach d in array dims loop
    if d <> 'D1' and public.t3a_dimension_consent_state(b.participant_id, d) <> 'granted' then
      blockers := blockers || jsonb_build_object('code', public.t3a_dimension_consent_state(b.participant_id, d), 'dimension_id', d);
    end if;
  end loop;
  return jsonb_build_object('permitted', jsonb_array_length(blockers) = 0, 'blockers', blockers, 'override_available', false);
end $fn$;

-- The render gate, with the D4 single page refusal.
create or replace function public.t3a_report_render_gate(p_ber_report_id uuid, p_form text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare b public.t3a_d1_ber_report; n int;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return public.t3a_capture_refuse('report.render', 'BER_REPORT_NOT_FOUND', p_ber_report_id::text, 'no such report'); end if;
  if p_form not in ('one_page', 'multi_page') then return public.t3a_capture_refuse('report.render', 'render_input_invalid', p_ber_report_id::text, 'form must be one_page or multi_page'); end if;
  n := coalesce(cardinality(b.represented_dimension_ids), 1);
  -- D-07: a report that carries D4 renders through the multi page renderer only
  if p_form = 'one_page' and 'D4' = any (coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) then
    return public.t3a_capture_refuse('report.render', 'format_mismatch', p_ber_report_id::text, 'a D4 report renders through the multi page renderer; the single page route is closed');
  end if;
  if p_form = 'one_page' and n > 1 then
    return public.t3a_capture_refuse('report.render', 'layout_overflow', p_ber_report_id::text, 'mandatory content for ' || n || ' dimensions cannot render legibly on one page without omission or compression; the render does not expand');
  end if;
  return jsonb_build_object('outcome', 'renderable', 'form', p_form, 'dimension_blocks', n);
end $fn$;
