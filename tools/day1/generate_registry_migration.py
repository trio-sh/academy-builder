#!/usr/bin/env python3
"""Generate the Day 1 field registry migration from the dictionary JSON.

T3A-DEV-DAY1-001 v1.3, paragraph 6.3: tools/check_dictionary.py runs first and a failing
check blocks the load. This generator therefore refuses to write anything unless that
check prints RESULT PASS.

Usage:
  python3 tools/day1/generate_registry_migration.py            # write the migration
  python3 tools/day1/generate_registry_migration.py --check    # exit 1 if the file on disk differs
"""
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "docs/day1/package"
DICT = PKG / "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json"
OUT = ROOT / "supabase/migrations/20261101000000_day1_field_registry.sql"

def main(check_only: bool) -> int:
    r = subprocess.run([sys.executable, str(PKG / "tools/check_dictionary.py"), str(DICT)], capture_output=True, text=True)
    if "RESULT PASS" not in r.stdout:
        print(r.stdout + r.stderr); print("check_dictionary.py did not pass; nothing generated"); return 2
    raw = DICT.read_bytes(); sha = hashlib.sha256(raw).hexdigest()
    d = json.loads(raw)
    fields = json.dumps(d["fields"], separators=(",", ":"), ensure_ascii=False)
    prohibited = json.dumps(d["prohibited"], separators=(",", ":"), ensure_ascii=False)
    for blob in (fields, prohibited):
        assert "$dict$" not in blob
    types = ", ".join("'%s'" % t for t in d["canonical_types"])
    sql = f"""-- Day 1 field registry (T3A-DEV-DAY1-001 v{d['version']}, paragraph 6.3). GENERATED: do not edit by hand.
-- Regenerate with: python3 tools/day1/generate_registry_migration.py   (verify with --check)
-- Source: docs/day1/package/{DICT.name}
-- Source sha256: {sha}
--
-- Additive only. Creates four tables, one view and one function; loads {len(d['fields'])} fields and
-- {len(d['prohibited'])} prohibited items. Nothing existing is changed. Nothing here enables a DORMANT or SOCKET route.
-- Registry rows are insert only: a changed field is a new dictionary_version, never an edit.
-- Table names carry the t3a_ prefix used by the rest of the schema; the package calls the registry field_registry.

create table if not exists public.t3a_field_registry_version (
  dictionary_version text primary key,
  identifier         text not null,
  dictionary_date    date not null,
  source_sha256      char(64) not null check (source_sha256 ~ '^[0-9a-f]{{64}}$'),
  field_count        integer not null,
  event_count        integer not null,
  prohibited_count   integer not null,
  test_count         integer not null,
  loaded_at          timestamptz not null default now()
);

create table if not exists public.t3a_field_registry (
  dictionary_version  text not null references public.t3a_field_registry_version(dictionary_version),
  qualified_name      text not null,
  domain              text not null check (domain ~ '^[A-R]$'),
  field               text not null,
  canonical_type      text not null check (canonical_type in ({types})),
  enum_values         jsonb,
  type_values         text,
  source              text not null,
  "trigger"           text,
  owner               text not null,
  store               text not null,
  status              text not null check (status in ('ACTIVE','DORMANT','SOCKET','LEGACY')),
  irreversible        boolean not null,
  if_absent           text not null check (if_absent in ('REFUSE','STATE','NONE')),
  capture_state_field text,
  primary key (dictionary_version, qualified_name),
  check (qualified_name = domain || '.' || field),
  check ((if_absent = 'STATE') = (capture_state_field is not null)),
  check (enum_values is null or jsonb_typeof(enum_values) = 'array')
);
create index if not exists t3a_field_registry_store_idx  on public.t3a_field_registry (dictionary_version, store);
create index if not exists t3a_field_registry_status_idx on public.t3a_field_registry (dictionary_version, status);

create table if not exists public.t3a_field_prohibited_item (
  dictionary_version text not null references public.t3a_field_registry_version(dictionary_version),
  item_no            integer not null,
  item               text not null,
  reason             text not null,
  use_instead        text not null,
  primary key (dictionary_version, item_no)
);

-- The reconciliation output: where each dictionary field physically lives. DT-01 reads this.
create table if not exists public.t3a_field_physical_map (
  dictionary_version  text not null,
  qualified_name      text not null,
  mapping_class       text not null check (mapping_class in ('M1','M2','M3','M4','M5','M6','M7')),
  physical_table      text,
  physical_column     text,
  payload_path        text,
  capture_state_column text,
  confirmed_by        text,
  confirmed_at        timestamptz,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (dictionary_version, qualified_name),
  foreign key (dictionary_version, qualified_name) references public.t3a_field_registry (dictionary_version, qualified_name),
  check (num_nonnulls(physical_column, payload_path) <= 1),
  check (physical_column is null or physical_table is not null)
);

create or replace function public.t3a_field_registry_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'T3A_APPEND_ONLY: the field registry is insert only; add a new dictionary_version instead';
end $$;

create or replace function public.t3a_field_physical_map_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists t3a_append_only on public.t3a_field_registry_version;
create trigger t3a_append_only before update or delete on public.t3a_field_registry_version
  for each row execute function public.t3a_field_registry_append_only();
drop trigger if exists t3a_append_only on public.t3a_field_registry;
create trigger t3a_append_only before update or delete on public.t3a_field_registry
  for each row execute function public.t3a_field_registry_append_only();
drop trigger if exists t3a_append_only on public.t3a_field_prohibited_item;
create trigger t3a_append_only before update or delete on public.t3a_field_prohibited_item
  for each row execute function public.t3a_field_registry_append_only();
drop trigger if exists t3a_touch on public.t3a_field_physical_map;
create trigger t3a_touch before update on public.t3a_field_physical_map
  for each row execute function public.t3a_field_physical_map_touch();

-- Internal developer data: no access for anonymous or signed in users. service_role bypasses row security.
alter table public.t3a_field_registry_version enable row level security;
alter table public.t3a_field_registry         enable row level security;
alter table public.t3a_field_prohibited_item  enable row level security;
alter table public.t3a_field_physical_map     enable row level security;
revoke all on public.t3a_field_registry_version, public.t3a_field_registry,
              public.t3a_field_prohibited_item, public.t3a_field_physical_map from anon, authenticated;

-- DT-01: every ACTIVE and DORMANT field resolves to exactly one physical column or governed payload key,
-- plus its capture_state column where required, and every mapped column really exists. Passes only at zero gaps.
create or replace function public.t3a_field_registry_dt01(p_version text default null)
returns table (
  dictionary_version text, fields_total integer, fields_active_dormant integer, resolved integer,
  unmapped integer, missing_capture_state_column integer, dangling_physical integer, passes boolean)
language sql stable as $$
  with v as (
    select coalesce(p_version, (select x.dictionary_version from public.t3a_field_registry_version x order by x.loaded_at desc limit 1)) as ver
  ), f as (
    select r.* from public.t3a_field_registry r, v where r.dictionary_version = v.ver
  ), live as (
    select f.*, m.physical_table, m.physical_column, m.payload_path, m.capture_state_column,
           (num_nonnulls(m.physical_column, m.payload_path) = 1) as is_resolved
    from f left join public.t3a_field_physical_map m
      on m.dictionary_version = f.dictionary_version and m.qualified_name = f.qualified_name
    where f.status in ('ACTIVE','DORMANT')
  ), dangling as (
    select count(*)::integer n from live l
    where l.physical_column is not null
      and not exists (select 1 from information_schema.columns c
                      where c.table_schema = 'public' and c.table_name = l.physical_table and c.column_name = l.physical_column)
  )
  select (select ver from v),
         (select count(*)::integer from f),
         (select count(*)::integer from live),
         (select count(*)::integer from live where is_resolved),
         (select count(*)::integer from live where not coalesce(is_resolved, false)),
         (select count(*)::integer from live where capture_state_field is not null and capture_state_column is null),
         (select n from dangling),
         (select count(*) = 0 from live where not coalesce(is_resolved, false)
                 or (capture_state_field is not null and capture_state_column is null))
           and (select n from dangling) = 0
$$;

-- Load. Idempotent: existing rows are never touched.
insert into public.t3a_field_registry_version
  (dictionary_version, identifier, dictionary_date, source_sha256, field_count, event_count, prohibited_count, test_count)
values ('{d['dictionary_version']}', '{d['identifier']}', '{d['date']}', '{sha}', {len(d['fields'])}, {len(d['events'])}, {len(d['prohibited'])}, {d['acceptance_test_count']})
on conflict (dictionary_version) do nothing;

insert into public.t3a_field_registry
  (dictionary_version, qualified_name, domain, field, canonical_type, enum_values, type_values, source, "trigger",
   owner, store, status, irreversible, if_absent, capture_state_field)
select '{d['dictionary_version']}', x.qualified_name, x.domain, x.field, x.canonical_type, x.enum_values, x.type_values, x.source, x."trigger",
       x.owner, x.store, x.status, x.irreversible, x.if_absent, x.capture_state_field
from jsonb_to_recordset($dict${fields}$dict$::jsonb) as x(
  domain text, qualified_name text, field text, type_values text, canonical_type text, enum_values jsonb, source text,
  "trigger" text, owner text, store text, status text, irreversible boolean, if_absent text, capture_state_field text)
on conflict (dictionary_version, qualified_name) do nothing;

insert into public.t3a_field_prohibited_item (dictionary_version, item_no, item, reason, use_instead)
select '{d['dictionary_version']}', t.ord::integer, t.j->>'item', t.j->>'reason', t.j->>'use_instead'
from jsonb_array_elements($dict${prohibited}$dict$::jsonb) with ordinality as t(j, ord)
on conflict (dictionary_version, item_no) do nothing;

-- A load that did not land exactly as the dictionary states is refused.
do $$
declare n_fields integer; n_prohibited integer; n_active integer; n_socket integer; n_dormant integer;
begin
  select count(*) into n_fields from public.t3a_field_registry where dictionary_version = '{d['dictionary_version']}';
  select count(*) into n_prohibited from public.t3a_field_prohibited_item where dictionary_version = '{d['dictionary_version']}';
  select count(*) filter (where status = 'ACTIVE'), count(*) filter (where status = 'SOCKET'), count(*) filter (where status = 'DORMANT')
    into n_active, n_socket, n_dormant from public.t3a_field_registry where dictionary_version = '{d['dictionary_version']}';
  if n_fields <> {len(d['fields'])} or n_prohibited <> {len(d['prohibited'])} then
    raise exception 'T3A_REGISTRY_LOAD_MISMATCH: expected {len(d['fields'])} fields and {len(d['prohibited'])} prohibited items, found % and %', n_fields, n_prohibited;
  end if;
  raise notice 'field registry {d['dictionary_version']} loaded: % fields (% ACTIVE, % DORMANT, % SOCKET), % prohibited items', n_fields, n_active, n_dormant, n_socket, n_prohibited;
end $$;
"""
    if check_only:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == sql
        print("registry migration matches the dictionary" if same else "registry migration DIFFERS from the dictionary; regenerate")
        return 0 if same else 1
    OUT.write_text(sql, encoding="utf-8"); print(f"wrote {OUT.relative_to(ROOT)} ({len(sql):,} bytes), source sha256 {sha[:12]}")
    return 0

if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
