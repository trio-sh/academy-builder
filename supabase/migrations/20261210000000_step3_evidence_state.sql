-- Step 3g: the D2 evidence state and the prohibited-output check (D2 INS-005 066 to 079; 5.9, 5.11, 5.11a, 5.13).
--
-- The evidence state is DERIVED at assembly from the current composed statements of ONE dimension and is never stored. One state per dimension, four values:
-- not_observed, observed_once, observed_multiple_contexts, recurring_across_stages. Recurrence is a property of a clause (key plus state code), never of the dimension.
-- Everything else (Stage 1 only, mixed or divergent, single observer, conditions compromised, earlier attempt differs) is a cross-cutting condition, never a fifth state.
--
-- Defaults applied (CR-097): "Stage and observer diversity" for the multi-context state is read as the same rule the recurring state states outright: at least two
-- distinct Stages and at least two distinct authorized observers across the mentor-observed Stages (2, 3, 4); a Stage 1 confirmer never substitutes for an observer.

alter table public.t3a_dimension_composed_statement add column if not exists supersedes_composed_statement_id uuid references public.t3a_dimension_composed_statement(composed_statement_id);
-- A correction composes a NEW statement for the same observation; only the original is unique per observation.
alter table public.t3a_dimension_composed_statement drop constraint if exists t3a_dimension_composed_statement_observation_ref_key;
create unique index if not exists t3a_dimension_composed_original_uq on public.t3a_dimension_composed_statement (observation_ref) where supersedes_composed_statement_id is null;
create unique index if not exists t3a_dimension_composed_supersedes_uq on public.t3a_dimension_composed_statement (supersedes_composed_statement_id) where supersedes_composed_statement_id is not null;

-- Withdrawal by a completed reconsideration: retained, excluded from current composition.
create table if not exists public.t3a_dimension_statement_withdrawal (
  composed_statement_id uuid primary key references public.t3a_dimension_composed_statement(composed_statement_id),
  reason text not null check (btrim(reason) <> ''),
  withdrawn_at timestamptz not null default now()
);
alter table public.t3a_dimension_statement_withdrawal enable row level security;
revoke all on public.t3a_dimension_statement_withdrawal from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_dimension_statement_withdrawal;
create trigger t3a_append_only before update or delete on public.t3a_dimension_statement_withdrawal for each row execute function public.t3a_deny_mutation();

-- Approved cross-context relationships: built with its keys and left EMPTY. Without a row two observations are never in distinct approved contexts.
create table if not exists public.t3a_cross_context_relationship (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{1,2}$'),
  source_version_a uuid not null references public.t3a_d1_content_version(content_version_id),
  source_version_b uuid not null references public.t3a_d1_content_version(content_version_id),
  approved_by uuid not null, approved_at timestamptz not null default now(),
  primary key (dimension_id, source_version_a, source_version_b),
  check (source_version_a < source_version_b)
);
alter table public.t3a_cross_context_relationship enable row level security;
revoke all on public.t3a_cross_context_relationship from anon, authenticated;

create or replace function public.t3a_contexts_related(p_dimension text, p_a uuid, p_b uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select p_a is distinct from p_b and exists (select 1 from public.t3a_cross_context_relationship r where r.dimension_id = p_dimension
    and r.source_version_a = least(p_a, p_b) and r.source_version_b = greatest(p_a, p_b))
$fn$;

-- The current set: committed, not superseded, not withdrawn, of this dimension only (5.9 rule 1).
create or replace function public.t3a_current_composed(p_participant uuid, p_dimension text)
returns table (composed_statement_id uuid, observation_ref uuid, stage_code text, source_version_id uuid, observer_id uuid, clause_instances jsonb, conditions jsonb, composed_at timestamptz)
language sql stable security definer set search_path = public as $fn$
  select cs.composed_statement_id, cs.observation_ref, cs.stage_code, cs.source_version_id, o.observer_id, cs.clause_instances, cs.conditions, cs.composed_at
    from public.t3a_dimension_composed_statement cs join public.t3a_observation_record o on o.observation_record_id = cs.observation_ref
   where cs.participant_id = p_participant and cs.dimension_id = p_dimension and o.dimension_id = p_dimension and o.is_committed is true and not cs.test_mode
     and not exists (select 1 from public.t3a_dimension_composed_statement n where n.supersedes_composed_statement_id = cs.composed_statement_id)
     and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id)
$fn$;

create or replace function public.t3a_es_obs(p_participant uuid, p_dimension text, p_include_test boolean)
returns table (cid uuid, oref uuid, stage text, src uuid, observer uuid, ci jsonb, conds jsonb) language sql stable security definer set search_path = public as $fn$
  select cs.composed_statement_id, cs.observation_ref, cs.stage_code, cs.source_version_id, o.observer_id, cs.clause_instances, cs.conditions
    from public.t3a_dimension_composed_statement cs join public.t3a_observation_record o on o.observation_record_id = cs.observation_ref
   where cs.participant_id = p_participant and cs.dimension_id = p_dimension and o.dimension_id = p_dimension and o.is_committed is true and (p_include_test or not cs.test_mode)
     and not exists (select 1 from public.t3a_dimension_composed_statement x where x.supersedes_composed_statement_id = cs.composed_statement_id)
     and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id)
$fn$;

create or replace function public.t3a_evidence_state(p_participant uuid, p_dimension text, p_include_test boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  n int; state text := 'not_observed'; frame text := 'FR-' || p_dimension || '-0';
  stages text[]; mentors uuid[]; related boolean; all_s1 boolean;
  conds text[] := '{}'; blocked jsonb := '[]'::jsonb; rec jsonb := '[]'::jsonb; ordered jsonb;
  locked boolean; keyed record; codes text[]; has_blocker boolean; n_stage int; n_ctx int; n_ci int; reasons text[]; contexts uuid[]; x uuid; y uuid; pair_ok boolean;
begin
  select count(*) into n from public.t3a_es_obs(p_participant, p_dimension, p_include_test);
  if n = 0 then
    return jsonb_build_object('dimension_id', p_dimension, 'state', state, 'frame', frame, 'observations', 0, 'conditions', '[]'::jsonb, 'recurrence', '[]'::jsonb, 'blocked', '[]'::jsonb);
  end if;
  state := 'observed_once'; frame := 'FR-' || p_dimension || '-1';
  select array_agg(distinct stage), array_agg(distinct observer) filter (where stage in ('S2', 'S3', 'S4') and observer is not null), bool_and(stage = 'S1')
    into stages, mentors, all_s1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test);

  -- breadth: two or more observations in approved distinct contexts, with Stage and observer diversity
  select exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) a join public.t3a_es_obs(p_participant, p_dimension, p_include_test) b
                  on a.cid < b.cid where public.t3a_contexts_related(p_dimension, a.src, b.src)) into related;
  if n > 1 and not related then blocked := blocked || jsonb_build_object('frame', 'multiple_contexts', 'reason', 'no_approved_cross_context_relationship'); end if;
  if related then
    if coalesce(array_length(stages, 1), 0) >= 2 and coalesce(array_length(mentors, 1), 0) >= 2 then
      state := 'observed_multiple_contexts'; frame := 'FR-' || p_dimension || '-2';
    else
      blocked := blocked || jsonb_build_object('frame', 'multiple_contexts', 'reason', 'stage_or_observer_diversity_absent');
    end if;
  end if;

  -- recurrence, clause by clause: gather the FULL current set for the key, test for material contradiction FIRST, then the threshold
  select configuration_value = 'locked' into locked from public.t3a_configuration_value where configuration_key = 'recurrence_config_locked' order by configuration_seq desc limit 1;
  for keyed in select distinct c ->> 'recurrence_equivalence_key_id' as k from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c loop
    select array_agg(distinct c ->> 'state_code'), bool_or((c ->> 'recurrence_blocker')::boolean), count(distinct o.stage), count(distinct o.src), count(*)
      into codes, has_blocker, n_stage, n_ctx, n_ci
      from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where c ->> 'recurrence_equivalence_key_id' = keyed.k;
    reasons := '{}';
    if cardinality(codes) > 1 then
      reasons := reasons || 'material_contradiction_in_current_set'::text;   -- same key, differing state codes: a key groups the states of one variable and does not assert one conduct
    else
      if n_ci < 3 then reasons := reasons || 'fewer_than_three_qualifying_observations'::text; end if;
      if n_stage < 3 then reasons := reasons || 'fewer_than_three_distinct_stages'::text; end if;
      if n_ctx < 3 then reasons := reasons || 'fewer_than_three_contexts'::text; end if;
      if coalesce(has_blocker, false) then reasons := reasons || 'recurrence_blocker_statement'::text; end if;
      if coalesce(array_length(mentors, 1), 0) < 2 then reasons := reasons || 'fewer_than_two_authorized_observers'::text; end if;
      if not coalesce(locked, false) then reasons := reasons || 'recurrence_configuration_not_locked'::text; end if;
      if cardinality(reasons) = 0 then
        select array_agg(distinct o.src) into contexts from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o, jsonb_array_elements(o.ci) c where c ->> 'recurrence_equivalence_key_id' = keyed.k;
        pair_ok := true;
        foreach x in array contexts loop foreach y in array contexts loop
          if x < y and not public.t3a_contexts_related(p_dimension, x, y) then pair_ok := false; end if;
        end loop; end loop;
        if not pair_ok then reasons := reasons || 'contexts_not_approved_distinct'::text; end if;
      end if;
    end if;
    if cardinality(reasons) = 0 then
      rec := rec || jsonb_build_object('recurrence_equivalence_key_id', keyed.k, 'state_code', codes[1], 'available', true);
      state := 'recurring_across_stages'; frame := 'FR-' || p_dimension || '-3';
    else
      rec := rec || jsonb_build_object('recurrence_equivalence_key_id', keyed.k, 'available', false, 'reasons', to_jsonb(reasons));
      if 'material_contradiction_in_current_set' = any (reasons) then conds := conds || 'mixed_or_divergent'::text; end if;
    end if;
  end loop;

  -- cross-cutting conditions, in the fixed precedence of 5.13 (limitation first)
  if exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) o where o.conds ? 'conditions_compromised') then conds := conds || 'conditions_compromised'::text; end if;
  if all_s1 then conds := conds || 'stage_1_only'::text; end if;
  conds := conds || (case when coalesce(array_length(mentors, 1), 0) >= 2 then 'multiple_observers' else 'single_observer' end);
  if exists (select 1 from public.t3a_es_obs(p_participant, p_dimension, p_include_test) a join public.t3a_es_obs(p_participant, p_dimension, p_include_test) b
              on a.cid < b.cid and a.stage = b.stage and a.src = b.src and a.ci::text <> b.ci::text) then conds := conds || 'earlier_attempt_differs'::text; end if;
  select coalesce(jsonb_agg(c order by p), '[]'::jsonb) into ordered from (
    select distinct c, case c when 'conditions_compromised' then 1 when 'evidence_expired' then 2 when 'correction_open' then 3 when 'amendment_or_withdrawal' then 4 when 'stage_1_only' then 5
      when 'single_observer' then 6 when 'multiple_observers' then 6 when 'mixed_or_divergent' then 7 when 'earlier_attempt_differs' then 8 else 9 end p from unnest(conds) c) z;
  return jsonb_build_object('dimension_id', p_dimension, 'state', state, 'frame', frame, 'observations', n, 'conditions', ordered, 'recurrence', rec, 'blocked', blocked);
end $fn$;
revoke all on function public.t3a_es_obs(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.t3a_evidence_state(uuid, text, boolean) from public, anon;
grant execute on function public.t3a_evidence_state(uuid, text, boolean) to service_role;

-- The logged form: every frame refused is recorded.
create or replace function public.t3a_evidence_state_logged(p_participant uuid, p_dimension text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare s jsonb; x jsonb;
begin
  s := public.t3a_evidence_state(p_participant, p_dimension);
  for x in select * from jsonb_array_elements(s -> 'blocked') loop
    perform public.t3a_capture_refuse('evidence_state.' || lower(p_dimension), 'frame_unavailable', p_participant::text, (x ->> 'frame') || ': ' || (x ->> 'reason'));
  end loop;
  for x in select * from jsonb_array_elements(s -> 'recurrence') where (value ->> 'available')::boolean = false loop
    perform public.t3a_capture_refuse('evidence_state.' || lower(p_dimension), 'recurrence_frame_unavailable', p_participant::text, (x ->> 'recurrence_equivalence_key_id') || ': ' || (x -> 'reasons')::text);
  end loop;
  return s;
end $fn$;
revoke all on function public.t3a_evidence_state_logged(uuid, text) from public, anon;
grant execute on function public.t3a_evidence_state_logged(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- The prohibited-output check, on RENDERED output (INS-005 070; D2 4.2, 5.7a, 13.1). It scans the serialized render, not the source text.
-- ---------------------------------------------------------------------------------------------------------------------

-- The closed retired list of D2 Section 4.2 joins the 21 words of 5.7a (the list is closed; nothing is added by the sandbox).
insert into public.t3a_rce_prohibited_vocabulary (dimension_id, word, version, reason)
select 'D2', w, 'PV-D2-4.2', 'D2 Section 4.2 retired vocabulary, closed list'
  from unnest(array['does not support selection, retention, termination or adverse employment action', 'released to your organization', 'named recipient', 'release token', 'redemption passcode',
    'Behavioral Evidence Record', 'not yet available for observation', 'score', 'scoring', 'rating', 'rated', 'rank', 'tier', 'grade', 'pass', 'fail', 'competent', 'proficient',
    'L1', 'L2', 'L3', 'L4', 'candidate', 'assessment', 'assessed', 'assess', 'certify', 'certified', 'validate', 'validated', 'rubric', 'BARS', 'red flag', 'strong response',
    'expected response', 'skill passport', 'behavioral fingerprint', 'observation_level', 'disqualification']) w
on conflict do nothing;

create or replace function public.t3a_prohibited_output_check(p_dimension text, p_rendered text) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare f jsonb := '[]'::jsonb; w record; t text := coalesce(p_rendered, '');
begin
  -- visual elements that read as a score: dots, bars, stars, traffic lights, rings, meters, filled or unfilled markers, colour signalling quality
  if t ~* '<(svg|canvas|meter|progress)\y' then f := f || jsonb_build_object('rule', 'visual_element_in_layout', 'detail', 'svg, canvas, meter or progress element'); end if;
  if t ~* '<img\y(?![^>]*data-role="participant-photo")' then f := f || jsonb_build_object('rule', 'visual_element_in_layout', 'detail', 'image that is not the participant photo'); end if;
  if t ~ '[●○◯◐◑◒◓★☆▮▯▰▱■□▪▫🟢🟡🟠🔴🔵✔✘✓✗]' then f := f || jsonb_build_object('rule', 'score_like_glyph', 'detail', 'dot, bar, star, marker or traffic-light glyph'); end if;
  if t ~* '(traffic[-_ ]?light|progress[-_ ]?(bar|ring)|coverage[-_ ]?meter|rating[-_ ]?stars?|score[-_ ]?bar|meter-fill|bar-fill|status-(red|amber|green))' then f := f || jsonb_build_object('rule', 'score_like_element', 'detail', 'class or text names a rating visual'); end if;
  if t ~* '(background(-color)?|color)\s*:\s*(red|green|amber|orange|#(f00|0f0|ff0|c00|0c0))' then f := f || jsonb_build_object('rule', 'colour_signals_quality', 'detail', 'red, green or amber colour value'); end if;
  -- cross-dimension aggregate
  if t ~* '\y(overall|composite|average|summary judgment|dimensions met|combined (state|result)|profile)\y' then f := f || jsonb_build_object('rule', 'cross_dimension_aggregate', 'detail', 'overall, composite, average, count or profile wording'); end if;
  -- retired and prohibited vocabulary, whole words / phrases, case-insensitive
  for w in select word from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension loop
    if t ~* ('(^|[^a-z0-9_])' || regexp_replace(w.word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^a-z0-9_])') then f := f || jsonb_build_object('rule', 'retired_or_prohibited_vocabulary', 'detail', w.word); end if;
  end loop;
  -- blank rows must not read as an unmet count
  if t ~* '(0\s*(of|/)\s*[0-9]+\s*(dimensions|observations|elements))' then f := f || jsonb_build_object('rule', 'unmet_count', 'detail', 'a count of what is not met'); end if;
  return jsonb_build_object('passed', jsonb_array_length(f) = 0, 'findings', f);
end $fn$;
revoke all on function public.t3a_prohibited_output_check(text, text) from public, anon;
grant execute on function public.t3a_prohibited_output_check(text, text) to authenticated, service_role;
