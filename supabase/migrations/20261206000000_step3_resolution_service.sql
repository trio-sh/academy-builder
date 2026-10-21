-- Step 3c: the dimension resolution service (D2 INS-003, rules 045 to 054).
--
-- t3a_resolve_core        pure resolver: an answer pattern becomes statements or ONE refusal. No nearest match, no free text, no default.
-- t3a_resolve_observation the logged route. A refusal is logged and returned (not raised, so the log row persists).
-- t3a_resolution_coverage the coverage check: every reachable answer pattern resolves to statements or to a refusal, never to two statements.
--
-- Production mode resolves only statements whose use_disposition is 'production'. None is, so production resolution refuses every pattern
-- until statements are approved (fail closed). Test mode (service route only) also resolves 'build_only' statements.

alter table public.t3a_d1_branch_rule add column if not exists parent_question text;
alter table public.t3a_d1_branch_rule add column if not exists child_question text;
alter table public.t3a_d1_branch_rule add column if not exists serving_answers text[];
update public.t3a_d1_branch_rule set
  parent_question = substring(rule_condition from '^(Q-D[0-9]+-[0-9a-z]+) returns'),
  child_question = substring(rule_effect from '^(Q-D[0-9]+-[0-9a-z]+) served'),
  serving_answers = string_to_array(replace(substring(rule_condition from 'returns (.+)$'), ' ', ''), ',')
 where dimension_id <> 'D1' and parent_question is null and rule_condition ~ '^Q-D[0-9]+-[0-9a-z]+ returns A';

-- The eight controlled missing-state codes (D2 5.8). not_applicable and not_yet_observed are never posted.
create or replace function public.t3a_missing_state_codes() returns text[] language sql immutable as $fn$
  select array['not_captured', 'never_asked', 'declined', 'no_response', 'technical_failure', 'withdrawn']
$fn$;

create or replace function public.t3a_resolve_core(p_dimension text, p_stage text, p_answers jsonb, p_bound jsonb default '{}'::jsonb, p_test_mode boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  k text; v text; r record; l record; n int; hit record; m boolean; part jsonb;
  v_stage text := upper(left(p_stage, 1)) || right(p_stage, length(p_stage) - 1);
  v_out jsonb := '[]'::jsonb; v_suppressed text[] := '{}'; v_text text; ph text; bv jsonb; served boolean; pv text;
begin
  if p_stage !~ '^[1-4]$' then return jsonb_build_object('outcome', 'refused', 'reason', 'stage_unknown', 'detail', p_stage); end if;
  v_stage := 'S' || p_stage;

  -- 1. every answered question belongs to this dimension, and every value is a controlled code (no free text)
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(p_answers, '{}'::jsonb)) loop
    if not exists (select 1 from public.t3a_d1_question_object q where q.dimension_id = p_dimension and q.question_code = k) then
      return jsonb_build_object('outcome', 'refused', 'reason', 'dimension_isolation_violation', 'detail', k || ' is not a ' || p_dimension || ' question');
    end if;
    if v is null or not (v ~ '^A[0-9]+$' or v = 'UNANSWERED' or v ~ '^missing:[a-z_]+$') then
      return jsonb_build_object('outcome', 'refused', 'reason', 'free_text_or_unknown_value', 'detail', k);
    end if;
    if v like 'missing:%' and not (substring(v from 9) = any (public.t3a_missing_state_codes())) then
      return jsonb_build_object('outcome', 'refused', 'reason', 'missing_state_not_postable', 'detail', k || ' ' || v);
    end if;
  end loop;

  -- 2. a child question is served only when its parent returned a serving answer; an answer on an unserved child is refused
  for r in select * from public.t3a_d1_branch_rule b where b.dimension_id = p_dimension and b.child_question is not null loop
    if p_answers ? r.child_question and (p_answers ->> r.child_question) <> 'UNANSWERED' then
      pv := p_answers ->> r.parent_question;
      if pv is null or not (pv = any (r.serving_answers)) then
        return jsonb_build_object('outcome', 'refused', 'reason', 'child_not_served', 'detail', r.child_question || ' follows ' || r.parent_question || ' ' || coalesce(array_to_string(r.serving_answers, '/'), ''));
      end if;
    end if;
  end loop;

  -- 3. refusal rules. A refusal outranks every other outcome.
  for r in select * from public.t3a_resolution_refusal_rule x where x.dimension_id = p_dimension and x.outcome = 'REFUSE' order by x.rule_code loop
    m := true;
    for part in select * from jsonb_array_elements(r.pattern) loop
      if part ->> 'subject' = 'STAGE' then
        if (part ->> 'value') is distinct from p_stage then m := false; end if;
      elsif (part ->> 'value') = 'UNANSWERED' then
        if (p_answers ->> (part ->> 'subject')) is not null and (p_answers ->> (part ->> 'subject')) <> 'UNANSWERED' then m := false; end if;
        -- UNANSWERED only counts where the question is served: the parent must have returned a serving answer, which the pattern already states
      else
        if (p_answers ->> (part ->> 'subject')) is distinct from (part ->> 'value') then m := false; end if;
      end if;
    end loop;
    if m then return jsonb_build_object('outcome', 'refused', 'reason', 'resolution_rule', 'rule', r.rule_code, 'detail', r.reason); end if;
  end loop;
  for r in select * from public.t3a_resolution_refusal_rule x where x.dimension_id = p_dimension and x.outcome = 'SUPPRESS' order by x.rule_code loop
    m := true;
    for part in select * from jsonb_array_elements(r.pattern) loop
      if part ->> 'subject' = 'STAGE' then if (part ->> 'value') is distinct from p_stage then m := false; end if;
      elsif (p_answers ->> (part ->> 'subject')) is distinct from (part ->> 'value') then m := false; end if;
    end loop;
    if m then v_suppressed := v_suppressed || r.suppress_statement_key; end if;
  end loop;

  -- 4. each answered question resolves to exactly one statement
  for r in select q.question_code, q.display_order from public.t3a_d1_question_object q where q.dimension_id = p_dimension order by q.display_order loop
    v := p_answers ->> r.question_code;
    continue when v is null or v = 'UNANSWERED' or v like 'missing:%';
    n := 0; hit := null;
    for l in
      select s.* from public.t3a_d1_statement_library s
       where s.dimension_id = p_dimension and s.question_code = r.question_code and s.answer_code = v and not s.retired
         and v_stage = any (coalesce(s.applicable_stages, array[s.stage_code::text]))
         and (s.use_disposition = 'production' or (p_test_mode and s.use_disposition = 'build_only'))
         and (s.given_condition is null or (p_answers ->> split_part(s.given_condition, ' ', 1)) = split_part(s.given_condition, ' ', 2))
    loop n := n + 1; hit := l; end loop;
    if n = 0 then return jsonb_build_object('outcome', 'refused', 'reason', 'no_approved_statement', 'detail', r.question_code || ' ' || v || ' stage ' || p_stage); end if;
    if n > 1 then return jsonb_build_object('outcome', 'refused', 'reason', 'ambiguous_resolution', 'detail', r.question_code || ' ' || v || ' resolves to ' || n || ' statements'); end if;
    continue when hit.statement_key = any (v_suppressed);
    v_text := hit.statement_body;
    foreach ph in array coalesce(hit.bound_variables, '{}') loop
      bv := p_bound -> ph;
      if bv is null or jsonb_typeof(bv) <> 'number' or (bv #>> '{}')::numeric < 1 or (bv #>> '{}')::numeric <> floor((bv #>> '{}')::numeric) then
        if ph = 'affected_party_label' and jsonb_typeof(bv) = 'string' then v_text := replace(v_text, '{' || ph || '}', bv #>> '{}'); continue; end if;
        return jsonb_build_object('outcome', 'refused', 'reason', 'bound_variable_invalid', 'detail', hit.statement_key || ' ' || ph);
      end if;
      v_text := replace(v_text, '{' || ph || '}', bv #>> '{}');
    end loop;
    v_out := v_out || jsonb_build_object('question_code', r.question_code, 'answer_code', v, 'statement_key', hit.statement_key, 'entry_type', hit.entry_type, 'text', v_text);
  end loop;
  return jsonb_build_object('outcome', 'resolved', 'statements', v_out);
end $fn$;
revoke all on function public.t3a_resolve_core(text, text, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.t3a_resolve_core(text, text, jsonb, jsonb, boolean) to service_role;

create or replace function public.t3a_resolve_observation(p_dimension text, p_stage text, p_answers jsonb, p_bound jsonb default '{}'::jsonb, p_test_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v jsonb;
begin
  if p_test_mode and not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('resolution.' || lower(p_dimension), 'TEST_MODE_IS_SERVICE_ONLY', coalesce(p_dimension, ''), 'unapproved statements resolve in the test environment through the service route only');
  end if;
  v := public.t3a_resolve_core(p_dimension, p_stage, p_answers, p_bound, p_test_mode);
  if v ->> 'outcome' = 'refused' then
    perform public.t3a_capture_refuse('resolution.' || lower(p_dimension), coalesce(v ->> 'rule', v ->> 'reason'), coalesce(p_dimension, '') || ' stage ' || coalesce(p_stage, ''), v ->> 'detail');
  end if;
  return v;
end $fn$;
revoke all on function public.t3a_resolve_observation(text, text, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.t3a_resolve_observation(text, text, jsonb, jsonb, boolean) to authenticated, service_role;

-- Coverage. Reachable patterns are enumerated per group of questions that can interact (parent and child, or named together in one refusal or
-- suppression rule), because questions outside a group resolve independently. For every Stage and every reachable pattern the resolver must
-- return statements or a refusal. A pattern that resolves to two statements, or fails without a designed refusal, is reported.
create or replace function public.t3a_cov_options(p_dimension text, p_question text) returns text[] language sql stable security definer set search_path = public as $fn$
  select coalesce(array_agg('A' || l.line_order::text order by l.line_order), '{}') || 'ABSENT'::text
    from public.t3a_d1_question_capture_map m join public.t3a_d1_capture_line l on l.dimension_id = m.dimension_id and l.capture_set_code = m.capture_set_code
   where m.dimension_id = p_dimension and m.question_code = p_question
$fn$;

create or replace function public.t3a_cov_groups(p_dimension text) returns table (qs text[]) language sql stable security definer set search_path = public as $fn$
  with recursive edges as (
    select parent_question a, child_question b from public.t3a_d1_branch_rule where dimension_id = p_dimension and child_question is not null
    union
    select distinct p1 ->> 'subject', p2 ->> 'subject' from public.t3a_resolution_refusal_rule r, jsonb_array_elements(r.pattern) p1, jsonb_array_elements(r.pattern) p2
     where r.dimension_id = p_dimension and p1 ->> 'subject' like 'Q-%' and p2 ->> 'subject' like 'Q-%' and p1 ->> 'subject' < p2 ->> 'subject'),
  comp(q, root) as (
    select question_code, question_code from public.t3a_d1_question_object where dimension_id = p_dimension
    union
    select case when e.a = c.q then e.b else e.a end, c.root from comp c join edges e on e.a = c.q or e.b = c.q),
  roots as (select q, min(root) root from comp group by q)
  select array_agg(q order by q) from roots group by root order by root
$fn$;

create or replace function public.t3a_resolution_coverage(p_dimension text, p_bound jsonb default '{"performed_listed_action_count":1,"contained_item_count":1,"omitted_causal_item_count":1,"contradicted_causal_item_count":1,"affected_party_label":"the affected party"}'::jsonb)
returns table (stage text, question_group text, patterns int, resolved int, designed_refusals int, gap_refusals int, ambiguous int, gaps text)
language plpgsql stable security definer set search_path = public as $fn$
declare
  g record; s int; i int; j int; total int; lens int[]; opts text[]; rem int; combo jsonb; res jsonb; qcodes text[];
  cnt_p int; cnt_r int; cnt_d int; cnt_g int; cnt_a int; gp text[];
begin
  for g in select * from public.t3a_cov_groups(p_dimension) loop
    qcodes := g.qs; lens := '{}'; total := 1;
    for j in 1..array_length(qcodes, 1) loop
      lens := lens || array_length(public.t3a_cov_options(p_dimension, qcodes[j]), 1);
      total := total * lens[j];
    end loop;
    for s in 1..4 loop
      cnt_p := 0; cnt_r := 0; cnt_d := 0; cnt_g := 0; cnt_a := 0; gp := '{}';
      for i in 0..total - 1 loop
        combo := '{}'::jsonb; rem := i;
        for j in 1..array_length(qcodes, 1) loop
          opts := public.t3a_cov_options(p_dimension, qcodes[j]);
          if opts[(rem % lens[j]) + 1] <> 'ABSENT' then combo := combo || jsonb_build_object(qcodes[j], opts[(rem % lens[j]) + 1]); end if;
          rem := rem / lens[j];
        end loop;
        -- unreachable: a child answered although its parent did not serve it
        continue when exists (select 1 from public.t3a_d1_branch_rule b where b.dimension_id = p_dimension and b.child_question is not null and combo ? b.child_question
                               and not coalesce((combo ->> b.parent_question) = any (b.serving_answers), false));
        res := public.t3a_resolve_core(p_dimension, s::text, combo, p_bound, true);
        cnt_p := cnt_p + 1;
        if res ->> 'outcome' = 'resolved' then cnt_r := cnt_r + 1;
        elsif res ->> 'reason' = 'resolution_rule' then cnt_d := cnt_d + 1;
        elsif res ->> 'reason' = 'ambiguous_resolution' then cnt_a := cnt_a + 1; gp := gp || (combo::text || ' => ' || (res ->> 'detail'));
        else
          cnt_g := cnt_g + 1;
          if coalesce(array_length(gp, 1), 0) < 5 then gp := gp || (combo::text || ' => ' || coalesce(res ->> 'reason', '') || ' ' || coalesce(res ->> 'detail', '')); end if;
        end if;
      end loop;
      stage := 'S' || s; question_group := array_to_string(qcodes, ','); patterns := cnt_p; resolved := cnt_r; designed_refusals := cnt_d; gap_refusals := cnt_g; ambiguous := cnt_a; gaps := array_to_string(gp, E'\n');
      return next;
    end loop;
  end loop;
end $fn$;
revoke all on function public.t3a_resolution_coverage(text, jsonb) from public, anon, authenticated;
grant execute on function public.t3a_resolution_coverage(text, jsonb) to service_role;
revoke all on function public.t3a_cov_options(text, text) from public, anon, authenticated;
revoke all on function public.t3a_cov_groups(text) from public, anon, authenticated;
