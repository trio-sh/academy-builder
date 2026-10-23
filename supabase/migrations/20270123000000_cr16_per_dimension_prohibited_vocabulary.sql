-- CR-16: the renderer reads each dimension's prohibited vocabulary from that dimension's own package.
--  (1) The scan took one version string for every dimension (default PV-D1-1.0), so a D2, D3 or D4 entry rendered under the default
--      scanned a version that dimension never had and passed with no words checked. Now, where the version given has no list for the
--      entry's dimension, the scan uses every list loaded for that dimension. A version that is the dimension's own is used as given.
--  (2) A dimension with no list loaded refuses to render (prohibited_vocabulary_not_loaded) instead of passing unchecked.
--  (3) A dimension's list is loaded by one service route, all or nothing, and a loaded list is never overwritten. The D9 list is loaded
--      from the D9 Execution Edition Section 5.7a; it is not in this migration.
create or replace function public.t3a_rce_prohibited_vocabulary_loaded(p_dimension_id text) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension_id)
$fn$;
revoke all on function public.t3a_rce_prohibited_vocabulary_loaded(text) from public, anon;
grant execute on function public.t3a_rce_prohibited_vocabulary_loaded(text) to authenticated, service_role;

create or replace function public.t3a_rce_prohibited_vocabulary_scan(p_body text, p_dimension_id text, p_version text default 'PV-D1-1.0') returns text[]
language sql stable security definer set search_path = public as $fn$
  select coalesce(array_agg(distinct word order by word), array[]::text[])
  from public.t3a_rce_prohibited_vocabulary v
  where v.dimension_id = p_dimension_id
    and (v.version = p_version or not exists (select 1 from public.t3a_rce_prohibited_vocabulary x where x.dimension_id = p_dimension_id and x.version = p_version))
    and p_body ~* ('(^|[^[:alnum:]_])' || regexp_replace(v.word, '([.()^$|[\]\\+?*{}])', '\\\1', 'g') || '([^[:alnum:]_]|$)')
$fn$;

do $m$
declare v_def text; v_new text;
begin
  select pg_get_functiondef('public.t3a_rce_render_check(uuid, text, uuid, text, text)'::regprocedure) into v_def;
  if position('prohibited_vocabulary_not_loaded' in v_def) = 0 then
    v_new := replace(v_def,
      E'    -- §34 prohibited vocabulary scan on the composed body\n',
      E'    -- CR-16: a dimension whose list is not loaded does not render\n    IF NOT public.t3a_rce_prohibited_vocabulary_loaded(v_rec.dimension_id) THEN\n      RETURN jsonb_build_object(''ok'', false, ''refusal_code'', ''prohibited_vocabulary_not_loaded'',\n        ''detail'', format(''no prohibited vocabulary is loaded for %s'', v_rec.dimension_id), ''entry_id'', v_rec.statement_key);\n    END IF;\n    -- §34 prohibited vocabulary scan on the composed body\n');
    if v_new = v_def then raise exception 'CR-16: the render check did not have the expected scan comment'; end if;
    execute v_new;
  end if;
end $m$;
revoke all on function public.t3a_rce_render_check(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.t3a_rce_render_check(uuid, text, uuid, text, text) to authenticated, service_role;

create or replace function public.t3a_rce_prohibited_vocabulary_load(p_dimension_id text, p_version text, p_words jsonb, p_source_ref text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare w text; n int := 0;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_VOCABULARY_LOAD_SERVICE_ONLY: a list is loaded by the service route' using errcode = '42501'; end if;
  if p_dimension_id !~ '^D[0-9]{1,2}$' or p_version !~ ('^PV-' || p_dimension_id || '-[0-9]+(\.[0-9]+)*$') or coalesce(btrim(p_source_ref), '') = ''
     or p_words is null or jsonb_typeof(p_words) <> 'array' or jsonb_array_length(p_words) = 0 then
    return public.t3a_capture_refuse('vocabulary.load', 'VOCABULARY_LIST_INVALID', coalesce(p_dimension_id, '') || ':' || coalesce(p_version, ''), 'a list names its dimension, a version PV-<dimension>-<n>, its source in the package, and a non-empty array of words');
  end if;
  for w in select jsonb_array_elements_text(p_words) loop
    if btrim(w) = '' then return public.t3a_capture_refuse('vocabulary.load', 'VOCABULARY_LIST_INVALID', p_dimension_id || ':' || p_version, 'an empty word was in the list; nothing was loaded'); end if;
  end loop;
  if exists (select 1 from public.t3a_rce_prohibited_vocabulary where dimension_id = p_dimension_id and version = p_version) then
    return public.t3a_capture_refuse('vocabulary.load', 'VOCABULARY_LIST_ALREADY_LOADED', p_dimension_id || ':' || p_version, 'a loaded list is not overwritten; a change is a new version');
  end if;
  insert into public.t3a_rce_prohibited_vocabulary (dimension_id, word, version, reason)
    select p_dimension_id, lower(btrim(x)), p_version, btrim(p_source_ref) from (select distinct jsonb_array_elements_text(p_words) x) s;
  get diagnostics n = row_count;
  return jsonb_build_object('outcome', 'loaded', 'dimension_id', p_dimension_id, 'version', p_version, 'words', n);
end $fn$;
revoke all on function public.t3a_rce_prohibited_vocabulary_load(text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.t3a_rce_prohibited_vocabulary_load(text, text, jsonb, text) to service_role;

-- The D9 list, Section 5.7a of the D9 Observation Pathway Execution Edition v1.1 (88 words), loaded as PV-D9-1.0 through the CR-16 loader
-- rules (a loaded list is never overwritten). The renderer reads it from the table, never from code.
do $d9$
begin
  if not exists (select 1 from public.t3a_rce_prohibited_vocabulary where dimension_id = 'D9' and version = 'PV-D9-1.0') then
    insert into public.t3a_rce_prohibited_vocabulary (dimension_id, word, version, reason)
    select 'D9', w, 'PV-D9-1.0', 'T3A-D9 Execution Edition v1.1 Section 5.7a prohibited vocabulary' from unnest(array['learned', 'learns', 'learner', 'learning', 'realized', 'understood', 'grasped', 'picked up', 'caught on', 'mastered', 'grew', 'growth', 'improved', 'improvement', 'developed', 'progressed', 'agile', 'agility', 'adaptable', 'adapted', 'flexible', 'coachable', 'receptive', 'open minded', 'open-minded', 'curious', 'humble', 'willing', 'eager', 'resistant', 'resisted', 'rigid', 'stubborn', 'defensive', 'slow', 'slowly', 'quick', 'quickly', 'fast', 'readily', 'easily', 'struggled', 'capable', 'ability', 'intelligent', 'smart', 'bright', 'competent', 'beginner', 'novice', 'inexperienced', 'expert', 'rightly', 'correctly', 'wisely', 'appropriately', 'better', 'worse', 'best', 'tends to', 'always', 'never', 'likely', 'took', 'acted', 'sought', 'performed', 'applied', 'carried out', 'tried', 'tested', 'adopted', 'changed', 'adjusted', 'switched', 'will', 'would', 'owned', 'caused', 'blamed', 'prioritized', 'verified', 'proposed', 'agreed', 'disclosed', 'recovered', 'resumed', 'persuaded']) as w;
  end if;
end $d9$;
