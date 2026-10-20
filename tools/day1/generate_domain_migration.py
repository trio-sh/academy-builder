#!/usr/bin/env python3
"""Generate a Day 1 domain migration from the dictionary and a plan file.

A plan (tools/day1/plans/domain_<x>.py) says which dictionary field lives in which table and adds the
few things the dictionary cannot know (keys, references, extra constraints). This tool derives the rest:
column types, NOT NULL, enum checks, capture_state companions, insert only or immutable guards, row
security, and the t3a_field_physical_map rows that DT-01 reads. It refuses to write anything unless
  * check_dictionary.py passes, and
  * every field of the domain is assigned to exactly one table.

  python3 tools/day1/generate_domain_migration.py A            # write
  python3 tools/day1/generate_domain_migration.py A --check    # exit 1 if the file differs
"""
import hashlib, importlib.util, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "docs/day1/package"
DICT = PKG / "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json"
PLANS = ROOT / "tools/day1/plans"

PGTYPE = {"identifier": "uuid", "timestamp": "timestamptz", "boolean": "boolean", "integer": "integer", "decimal": "numeric",
          "text": "text", "email": "text", "code": "text", "enum": "text", "version_string": "text", "sha256_hex": "char(64)",
          "object": "jsonb", "array": "jsonb"}
SEMVER = r"^[0-9]+\.[0-9]+(\.[0-9]+)?$"

def q(s):
    return "'" + str(s).replace("'", "''") + "'"

def load_plan(domain):
    spec = importlib.util.spec_from_file_location("plan", PLANS / f"domain_{domain.lower()}.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def main(domain, check_only):
    r = subprocess.run([sys.executable, str(PKG / "tools/check_dictionary.py"), str(DICT)], capture_output=True, text=True)
    if "RESULT PASS" not in r.stdout:
        print(r.stdout + r.stderr); print("check_dictionary.py did not pass; nothing generated"); return 2
    raw = DICT.read_bytes(); sha = hashlib.sha256(raw).hexdigest(); d = json.loads(raw)
    ver = d["dictionary_version"]; cs_codes = d["capture_state_codes"]
    fields = {f["qualified_name"]: f for f in d["fields"] if f["domain"] == domain}
    plan = load_plan(domain)
    assigned = {}
    for t in plan.TABLES:
        for fs in t["fields"]:
            if fs["q"] in assigned:
                print(f"{fs['q']} is assigned to both {assigned[fs['q']]} and {t['name']}"); return 3
            if fs["q"] not in fields:
                print(f"{fs['q']} is not a Domain {domain} field"); return 3
            assigned[fs["q"]] = t["name"]
    missing = sorted(set(fields) - set(assigned))
    if missing:
        print(f"{len(missing)} Domain {domain} fields are not assigned to any table: {missing[:8]}"); return 3

    ddl, maprows, cs_trigger_calls = [], [], []
    for t in plan.TABLES:
        cols, checks, cs_pairs, notes = [], [], [], []
        for c in t.get("key_columns", []):
            cols.append("  " + c)
        for fs in t["fields"]:
            f = fields[fs["q"]]; col = fs.get("col", f["field"])
            ty = fs.get("type") or PGTYPE[f["canonical_type"]]
            nullable = fs["nullable"] if "nullable" in fs else (f["if_absent"] != "REFUSE")
            parts = [col, ty]
            if fs.get("pk"): parts.append("primary key")
            elif not nullable: parts.append("not null")
            if fs.get("default") is not None: parts.append("default " + fs["default"])
            cols.append("  " + " ".join(parts))
            if fs.get("ref"): checks.append(f"foreign key ({col}) references {fs['ref']}")
            if f["canonical_type"] == "enum" and f["enum_values"] and "enum_check" not in fs and fs.get("type") in (None, "text"):
                vals = ", ".join(q(v) for v in f["enum_values"]); checks.append(f"check ({col} is null or {col} in ({vals}))")
            if f["canonical_type"] == "version_string" and fs.get("semver", True):
                checks.append(f"check ({col} is null or {col} ~ {q(SEMVER)})")
            if f["canonical_type"] == "sha256_hex":
                checks.append(f"check ({col} is null or {col} ~ '^[0-9a-f]{{64}}$')")
            for extra in fs.get("checks", []): checks.append(extra)
            cs_col = None
            if f["if_absent"] == "STATE" and f["capture_state_field"]:
                cs_col = f["capture_state_field"]; vals = ", ".join(q(v) for v in cs_codes)
                cols.append(f"  {cs_col} text not null default 'not_captured' check ({cs_col} in ({vals}))")
                checks.append(f"check (({col} is not null) = ({cs_col} = 'captured'))")
                cs_pairs.append(f"{col}:{cs_col}")
            maprows.append((fs["q"], fs.get("mapping_class", "M5"), t["name"], col, cs_col, fs.get("note")))
        for c in t.get("extra_columns", []): cols.append("  " + c)
        for c in t.get("constraints", []): checks.append(c)
        body = ",\n".join(cols + ["  " + c for c in checks])
        tn = t["name"]
        ddl.append(f"create table if not exists public.{tn} (\n{body}\n);")
        if t.get("comment"): ddl.append(f"comment on table public.{tn} is {q(t['comment'])};")
        for ix in t.get("indexes", []): ddl.append(ix)
        if cs_pairs:
            args = ", ".join(q(p) for p in cs_pairs)
            ddl.append(f"drop trigger if exists t3a_capture_state_fill on public.{tn};\ncreate trigger t3a_capture_state_fill before insert or update on public.{tn} for each row execute function public.t3a_capture_state_fill({args});")
        if t["mode"] == "insert_only":
            ddl.append(f"drop trigger if exists t3a_append_only on public.{tn};\ncreate trigger t3a_append_only before update or delete on public.{tn} for each row execute function public.t3a_deny_mutation();")
        elif t.get("immutable"):
            args = ", ".join(q(c) for c in t["immutable"])
            ddl.append(f"drop trigger if exists t3a_immutable_columns on public.{tn};\ncreate trigger t3a_immutable_columns before update on public.{tn} for each row execute function public.t3a_refuse_column_change({args});")
        if t.get("socket"):
            ddl.append(f"drop trigger if exists t3a_socket_closed on public.{tn};\ncreate trigger t3a_socket_closed before insert or update on public.{tn} for each row execute function public.t3a_socket_closed();")
        ddl.append(f"alter table public.{tn} enable row level security;\nrevoke all on public.{tn} from anon, authenticated;")
        if t.get("own_read"):
            hidden = t.get("hidden_columns", [])
            allcols = [fs.get("col", fields[fs["q"]]["field"]) for fs in t["fields"]]
            cs = [c.split(":")[1] for c in cs_pairs]
            keycols = [k.split()[0] for k in t.get("key_columns", [])]
            extra = [e.split()[0] for e in t.get("extra_columns", [])]
            visible = [c for c in keycols + allcols + cs + extra if c not in hidden]
            ddl.append(f"grant select ({', '.join(visible)}) on public.{tn} to authenticated;")
            ddl.append(f"drop policy if exists {tn}_own_read on public.{tn};\ncreate policy {tn}_own_read on public.{tn} for select to authenticated using ({t['own_read']});")

    pre = """-- shared helpers for Day 1 domain tables (idempotent)
create or replace function public.t3a_deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'T3A_APPEND_ONLY: updates and deletes are refused; write a superseding record'; end $$;

create or replace function public.t3a_refuse_column_change() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new)->c is distinct from to_jsonb(old)->c then
      raise exception 'T3A_IMMUTABLE_COLUMN: % cannot change after it is written', c;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_capture_state_fill() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array tg_argv loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->>col is not null then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'captured'));
    elsif to_jsonb(new)->>cs = 'captured' then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'not_captured'));
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_socket_closed() returns trigger language plpgsql as $$
begin raise exception 'T3A_SOCKET_ROUTE_CLOSED: % is a SOCKET structure; capture is not enabled', tg_table_name; end $$;
"""
    mapsql = "insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)\nvalues\n" + ",\n".join(
        f"  ({q(ver)}, {q(qn)}, {q(mc)}, {q(tb)}, {q(cl)}, {q(cs) if cs else 'null'}, 'day1-domain-{domain}-generator', now(), {q(n) if n else 'null'})" for qn, mc, tb, cl, cs, n in maprows
    ) + "\non conflict (dictionary_version, qualified_name) do nothing;"
    logic = (PLANS / f"domain_{domain.lower()}_logic.sql").read_text(encoding="utf-8") if (PLANS / f"domain_{domain.lower()}_logic.sql").exists() else ""
    head = f"""-- Day 1 Domain {domain}: {plan.TITLE} (T3A-DEV-DAY1-001 v{d['version']}). GENERATED from tools/day1/plans/domain_{domain.lower()}.py
-- and tools/day1/plans/domain_{domain.lower()}_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py {domain}      (verify with --check)
-- Dictionary sha256: {sha}
-- Maps {len(maprows)} fields into t3a_field_physical_map.
"""
    sql = head + "\n" + pre + "\n" + "\n\n".join(ddl) + "\n\n" + mapsql + "\n\n" + logic
    out = ROOT / f"supabase/migrations/{plan.MIGRATION}.sql"
    if check_only:
        same = out.exists() and out.read_text(encoding="utf-8") == sql
        print(f"{out.name} matches" if same else f"{out.name} DIFFERS; regenerate"); return 0 if same else 1
    out.write_text(sql, encoding="utf-8"); print(f"wrote {out.relative_to(ROOT)} ({len(sql):,} bytes; {len(maprows)} fields mapped)"); return 0

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sys.exit(main(args[0].upper(), "--check" in sys.argv))
