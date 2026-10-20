-- Step 2, part 2: the remaining keys on the structure tables that would collide across dimensions.
-- Found by the production probe after 20261202: a D3 capture line at (C1, 1) collided with D1's. Each key below gains dimension_id.

do $$
declare r record;
begin
  -- capture lines and resolutions are unique per capture set within a dimension
  alter table public.t3a_d1_capture_line drop constraint if exists t3a_d1_capture_line_capture_set_code_line_order_key;
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_capture_line_dim_set_order_key') then
    alter table public.t3a_d1_capture_line add constraint t3a_d1_capture_line_dim_set_order_key unique (dimension_id, capture_set_code, line_order);
  end if;
  alter table public.t3a_d1_capture_resolution drop constraint if exists t3a_d1_capture_resolution_capture_set_code_capture_line_ord_key;
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_capture_resolution_dim_set_order_key') then
    alter table public.t3a_d1_capture_resolution add constraint t3a_d1_capture_resolution_dim_set_order_key unique (dimension_id, capture_set_code, capture_line_order);
  end if;
  alter table public.t3a_d1_capture_resolution drop constraint if exists t3a_d1_capture_resolution_statement_key_key;
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_capture_resolution_dim_statement_key') then
    alter table public.t3a_d1_capture_resolution add constraint t3a_d1_capture_resolution_dim_statement_key unique (dimension_id, statement_key);
  end if;
  -- condition precedence and the specification cooldown ladder are per dimension
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_condition_precedence_pkey' and conrelid = 'public.t3a_d1_condition_precedence'::regclass and pg_get_constraintdef(oid) like '%dimension_id%') then
    alter table public.t3a_d1_condition_precedence drop constraint t3a_d1_condition_precedence_pkey;
    alter table public.t3a_d1_condition_precedence add constraint t3a_d1_condition_precedence_pkey primary key (dimension_id, condition_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 't3a_d1_specification_cooldown_pkey' and conrelid = 'public.t3a_d1_specification_cooldown'::regclass and pg_get_constraintdef(oid) like '%dimension_id%') then
    alter table public.t3a_d1_specification_cooldown drop constraint t3a_d1_specification_cooldown_pkey;
    alter table public.t3a_d1_specification_cooldown add constraint t3a_d1_specification_cooldown_pkey primary key (dimension_id, completed_observations);
  end if;
end $$;
