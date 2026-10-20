-- Step 2: dimension parameterization of the shared tables (D2, D3, D4 editions; Part B).
--
-- 1. The D1 content structure tables get an explicit dimension_id. Existing rows are D1 (every row in production is D1).
--    There is no default: a row written without a dimension is refused, so content can never land on D1 by accident.
-- 2. Capture set codes (C1, C2 ...) repeat across dimensions (the D2 package reuses them), so the capture set key becomes
--    (dimension_id, capture_set_code) and its five child tables carry the dimension in their key reference.
-- 3. Dimension isolation: a record that points at a record of another dimension is refused and logged as
--    dimension_isolation_violation (not raised, so the log row persists).
-- 4. The August 2026 draft content for D2 to D14 is retired with a mapping; nothing is deleted or served.
-- 5. Mentor authorization is per dimension: one authorization never confers another, and there is one row per mentor,
--    dimension and start.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1 and 2. Dimension columns
-- ---------------------------------------------------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['t3a_d1_question_object', 't3a_d1_capture_set', 't3a_d1_capture_line', 't3a_d1_beat_capture_binding', 't3a_d1_capture_resolution',
      't3a_d1_question_capture_map', 't3a_d1_capture_selection', 't3a_d1_branch_rule', 't3a_d1_condition_precedence', 't3a_d1_specification_cooldown', 't3a_d1_calibration_exercise'] loop
    execute format('alter table public.%I add column if not exists dimension_id text', t);
    execute format('update public.%I set dimension_id = %L where dimension_id is null', t, 'D1');
    execute format('alter table public.%I alter column dimension_id set not null', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_dimension_id_shape');
    execute format('alter table public.%I add constraint %I check (dimension_id ~ %L)', t, t || '_dimension_id_shape', '^D[0-9]{1,2}$');
  end loop;
end $$;

-- Question codes carry their dimension (Q-D1-01, Q-D2-02b ...): the column and the code must agree.
alter table public.t3a_d1_question_object drop constraint if exists t3a_d1_question_object_code_dimension;
alter table public.t3a_d1_question_object add constraint t3a_d1_question_object_code_dimension check (question_code like 'Q-' || dimension_id || '-%');

-- Capture set key: (dimension_id, capture_set_code). Children get the dimension from the same parent and are re-pointed.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_capture_set_pkey' and conrelid = 'public.t3a_d1_capture_set'::regclass and pg_get_constraintdef(oid) like '%dimension_id%') then
    alter table public.t3a_d1_capture_line drop constraint if exists t3a_d1_capture_line_capture_set_code_fkey;
    alter table public.t3a_d1_beat_capture_binding drop constraint if exists t3a_d1_beat_capture_binding_capture_set_code_fkey;
    alter table public.t3a_d1_capture_resolution drop constraint if exists t3a_d1_capture_resolution_capture_set_code_fkey;
    alter table public.t3a_d1_question_capture_map drop constraint if exists t3a_d1_question_capture_map_capture_set_code_fkey;
    alter table public.t3a_d1_capture_selection drop constraint if exists t3a_d1_capture_selection_capture_set_code_fkey;
    alter table public.t3a_d1_capture_set drop constraint t3a_d1_capture_set_pkey;
    alter table public.t3a_d1_capture_set add constraint t3a_d1_capture_set_pkey primary key (dimension_id, capture_set_code);
    alter table public.t3a_d1_capture_line add constraint t3a_d1_capture_line_capture_set_fkey foreign key (dimension_id, capture_set_code) references public.t3a_d1_capture_set (dimension_id, capture_set_code) on delete restrict;
    alter table public.t3a_d1_beat_capture_binding add constraint t3a_d1_beat_capture_binding_capture_set_fkey foreign key (dimension_id, capture_set_code) references public.t3a_d1_capture_set (dimension_id, capture_set_code) on delete restrict;
    alter table public.t3a_d1_capture_resolution add constraint t3a_d1_capture_resolution_capture_set_fkey foreign key (dimension_id, capture_set_code) references public.t3a_d1_capture_set (dimension_id, capture_set_code);
    alter table public.t3a_d1_question_capture_map add constraint t3a_d1_question_capture_map_capture_set_fkey foreign key (dimension_id, capture_set_code) references public.t3a_d1_capture_set (dimension_id, capture_set_code) on delete restrict;
    alter table public.t3a_d1_capture_selection add constraint t3a_d1_capture_selection_capture_set_fkey foreign key (dimension_id, capture_set_code) references public.t3a_d1_capture_set (dimension_id, capture_set_code) on delete restrict;
  end if;
end $$;

-- Precedence order is unique within a dimension, not across them.
alter table public.t3a_d1_condition_precedence drop constraint if exists t3a_d1_condition_precedence_precedence_order_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_condition_precedence_dim_order_key') then
    alter table public.t3a_d1_condition_precedence add constraint t3a_d1_condition_precedence_dim_order_key unique (dimension_id, precedence_order);
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Dimension isolation
-- ---------------------------------------------------------------------------------------------------------------------

-- Generic parent match: t3a_dimension_match(own_fk_column, parent_table, parent_key_column, parent_dimension_column).
create or replace function public.t3a_dimension_match() returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_fk uuid; v_pd text; v_own text := to_jsonb(new)->>'dimension_id';
begin
  v_fk := nullif(to_jsonb(new)->>tg_argv[0], '')::uuid;
  if v_fk is null or v_own is null then return new; end if;
  execute format('select %I::text from public.%I where %I = $1', tg_argv[3], tg_argv[1], tg_argv[2]) into v_pd using v_fk;
  if v_pd is not null and v_pd is distinct from v_own then
    perform public.t3a_capture_refuse(tg_table_name || '.write', 'dimension_isolation_violation', v_fk::text,
      tg_table_name || ' is ' || v_own || ' but ' || tg_argv[1] || ' is ' || v_pd || '; no record takes input from another dimension');
    return null;
  end if;
  return new;
end $fn$;

drop trigger if exists t3a_4_dimension_match_trg on public.t3a_attempt;
create trigger t3a_4_dimension_match_trg before insert or update on public.t3a_attempt for each row execute function public.t3a_dimension_match('stage_entry_event_id', 't3a_stage_entry_event', 'stage_entry_event_id', 'dimension_id');
drop trigger if exists t3a_4_dimension_match_trg on public.t3a_d1_progression_decision;
create trigger t3a_4_dimension_match_trg before insert or update on public.t3a_d1_progression_decision for each row execute function public.t3a_dimension_match('observation_record_id', 't3a_observation_record', 'observation_record_id', 'dimension_id');

-- A composed statement joins an observation record to a statement of the same dimension.
create or replace function public.t3a_composed_statement_dimension() returns trigger language plpgsql security definer set search_path = public as $fn$
declare a text; b text;
begin
  select dimension_id::text into a from public.t3a_observation_record where observation_record_id = new.observation_record_id;
  select dimension_id::text into b from public.t3a_d1_statement_library where statement_library_id = new.statement_library_id;
  if a is not null and b is not null and a <> b then
    perform public.t3a_capture_refuse('t3a_d1_composed_statement.write', 'dimension_isolation_violation', new.observation_record_id::text, 'the observation record is ' || a || ' but the statement is ' || b);
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_4_dimension_match_trg on public.t3a_d1_composed_statement;
create trigger t3a_4_dimension_match_trg before insert on public.t3a_d1_composed_statement for each row execute function public.t3a_composed_statement_dimension();

-- A Stage entry is served from a source of its own dimension, and a capture selection from a capture set of its own dimension.
create or replace function public.t3a_stage_entry_dimension() returns trigger language plpgsql security definer set search_path = public as $fn$
declare b text;
begin
  select o.dimension_id::text into b from public.t3a_d1_content_version v join public.t3a_content_object o on o.content_object_id = v.content_object_id where v.content_version_id = new.source_version_id;
  if b is not null and new.dimension_id is not null and b <> new.dimension_id::text then
    perform public.t3a_capture_refuse('t3a_stage_entry_event.write', 'dimension_isolation_violation', new.source_version_id::text, 'the Stage entry is ' || new.dimension_id::text || ' but the source is ' || b);
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_4_dimension_match_trg on public.t3a_stage_entry_event;
create trigger t3a_4_dimension_match_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_stage_entry_dimension();
drop trigger if exists t3a_4_dimension_match_trg on public.t3a_d1_capture_selection;
create trigger t3a_4_dimension_match_trg before insert on public.t3a_d1_capture_selection for each row execute function public.t3a_dimension_match('stage_entry_event_id', 't3a_stage_entry_event', 'stage_entry_event_id', 'dimension_id');

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Retire the August 2026 draft content for D2 to D14
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_legacy_draft_retirement (
  retirement_id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_key text not null,
  dimension_id text not null,
  superseded_by text not null,
  reason text not null,
  retired_at timestamptz not null default now(),
  unique (source_table, source_key)
);
comment on table public.t3a_legacy_draft_retirement is 'Step 2 mapping: August 2026 atomic factual determination drafts (D2 to D14) superseded by the execution editions. Rows are listed, never deleted, and never served.';
alter table public.t3a_legacy_draft_retirement enable row level security;
revoke all on public.t3a_legacy_draft_retirement from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_legacy_draft_retirement;
create trigger t3a_append_only before update or delete on public.t3a_legacy_draft_retirement for each row execute function public.t3a_deny_mutation();

insert into public.t3a_legacy_draft_retirement (source_table, source_key, dimension_id, superseded_by, reason)
select 't3a_determination_question', question_id::text, dimension_id::text,
       case dimension_id::text when 'D2' then 'T3A D2 Execution Edition v2.1' when 'D3' then 'T3A D3 Execution Edition v2.0' when 'D4' then 'T3A D4 edition (reconciliation pending)' else 'no edition yet' end,
       'August 2026 draft question set, never approved; replaced by the execution edition question objects and capture sets'
from public.t3a_determination_question where dimension_id::text <> 'D1' and approved_at is null
on conflict do nothing;
insert into public.t3a_legacy_draft_retirement (source_table, source_key, dimension_id, superseded_by, reason)
select 't3a_statement_library', statement_id::text, dimension_id::text,
       case dimension_id::text when 'D2' then 'T3A D2 Execution Edition v2.1' when 'D3' then 'T3A D3 Execution Edition v2.0' when 'D4' then 'T3A D4 edition (reconciliation pending)' else 'no edition yet' end,
       'August 2026 draft statement, superseded by the execution edition statement library'
from public.t3a_statement_library where dimension_id::text <> 'D1'
on conflict do nothing;

-- A retired draft question cannot be approved.
create or replace function public.t3a_retired_draft_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.approved_at is not null and old.approved_at is null and exists (select 1 from public.t3a_legacy_draft_retirement where source_table = 't3a_determination_question' and source_key = old.question_id::text) then
    perform public.t3a_capture_refuse('t3a_determination_question.approve', 'RETIRED_DRAFT_CONTENT', old.question_id::text, 'this August 2026 draft was retired; load the execution edition content instead');
    return old;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_4_retired_draft_guard_trg on public.t3a_determination_question;
create trigger t3a_4_retired_draft_guard_trg before update on public.t3a_determination_question for each row execute function public.t3a_retired_draft_guard();

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Mentor authorization is per dimension
-- ---------------------------------------------------------------------------------------------------------------------

create unique index if not exists t3a_mentor_authorization_dim_uq on public.t3a_mentor_authorization (mentor_id, dimension_id, authorized_from);

-- True only when this mentor holds a current authorization for exactly this dimension. D1 clearance never confers D2.
create or replace function public.t3a_mentor_authorized_for(p_mentor uuid, p_dimension text, p_at timestamptz default now()) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_mentor_authorization a
    where a.mentor_id = p_mentor and a.dimension_id::text = p_dimension and a.authorized_from <= p_at and (a.authorized_until is null or a.authorized_until > p_at)
      and coalesce(a.authorization_status, 'authorized') in ('authorized', 'supervised'))
$fn$;
revoke all on function public.t3a_mentor_authorized_for(uuid, text, timestamptz) from public, anon;
grant execute on function public.t3a_mentor_authorized_for(uuid, text, timestamptz) to authenticated, service_role;
