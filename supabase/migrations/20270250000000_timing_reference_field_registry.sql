-- CORR-007 rule CR-20 on every dimension (CR-330). Which question is timing dependent, and which source sheet field names its reference beat, was a hard coded CASE on
-- three D1 question codes inside t3a_d1_reference_field. The rule (timing refusals, CS-I-32 to CS-I-35) is stated for all dimensions, so the answer is now data:
-- a registry of question_code -> governing source sheet field, one row per timing dependent question, per dimension. The three D1 rows are seeded exactly as the CASE had them,
-- so D1 behaves as before. A dimension that has a timing dependent determination registers it here; a question that is not registered is not timing dependent (as before).
-- Nothing authored changes: no content version, capture set, line or question is touched. The capture line, whole session line and final beat checks already read the
-- dimension's own capture sets (dimension_id on t3a_d1_capture_set, t3a_d1_capture_line, t3a_d1_beat_capture_binding, t3a_d1_capture_selection) and are not changed.
-- Every refusal code keeps its name.
create table if not exists public.t3a_timing_reference_field (
  question_code      text primary key,
  dimension_id       text not null,
  source_sheet_field text not null,
  note               text,
  registered_at      timestamptz not null default now(),
  constraint t3a_timing_reference_field_dimension_shape check (dimension_id ~ '^D[0-9]{1,2}$'),
  constraint t3a_timing_reference_field_question_of_dimension check (question_code like 'Q-' || dimension_id || '-%'),
  constraint t3a_timing_reference_field_field_named check (length(btrim(source_sheet_field)) > 0)
);
comment on table public.t3a_timing_reference_field is
  'CS-I-32. The timing dependent determinations of a dimension: each question names the one source sheet field its reference beat is read from. A question not listed here is not timing dependent. Read by t3a_d1_reference_field.';

alter table public.t3a_timing_reference_field enable row level security;
drop policy if exists t3a_timing_reference_field_read on public.t3a_timing_reference_field;
create policy t3a_timing_reference_field_read on public.t3a_timing_reference_field for select using (true);
drop policy if exists t3a_timing_reference_field_write on public.t3a_timing_reference_field;
create policy t3a_timing_reference_field_write on public.t3a_timing_reference_field using (public.t3a_is_service_context()) with check (public.t3a_is_service_context());
grant select on public.t3a_timing_reference_field to authenticated;

insert into public.t3a_timing_reference_field(question_code, dimension_id, source_sheet_field, note) values
  ('Q-D1-02',  'D1', 'enquiry_point',      'CS-I-32: seeded from the rule as built before the registry'),
  ('Q-D1-07',  'D1', 'account_test_point', 'CS-I-32: seeded from the rule as built before the registry'),
  ('Q-D1-08a', 'D1', 'bearing_interest',   'CS-I-32: seeded from the rule as built before the registry')
on conflict (question_code) do nothing;

-- The same function name and signature, now reading the registry. It reads a table, so it is STABLE (the resolver that calls it is made STABLE too).
create or replace function public.t3a_d1_reference_field(p_question_code text)
returns text language sql stable as $fn$
  select r.source_sheet_field from public.t3a_timing_reference_field r where r.question_code = p_question_code;
$fn$;
alter function public.t3a_d1_reference_beat(jsonb, text) stable;
grant execute on function public.t3a_d1_reference_field(text) to authenticated;
