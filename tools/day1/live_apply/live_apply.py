#!/usr/bin/env python3
"""Apply the pending migrations to a database with a generated, tested rollback and a verification record.

  live_apply.py snapshot  --target local|live --out FILE [--data-tables T1,T2,...]
  live_apply.py rollback  --pre FILE --post FILE --out ROLLBACK.sql
  live_apply.py compare   --a FILE --b FILE            (exit 1 if the catalogs differ)
  live_apply.py pending   --target local|live          (files after the baseline that are not yet applied)
  live_apply.py apply     --target local|live --from 20270102000000 [--to ...] --record FILE

Targets: local = the throwaway Postgres (PGL_SOCK/PGL_PORT, database t3a); live = the Supabase project through the Management API
(env SUPABASE_PROJECT_REF and SBP, the access token, which is read from the environment and never written anywhere).
Each migration file is sent as ONE request, which Postgres runs as one implicit transaction: a file that fails changes nothing.
"""
import argparse, glob, hashlib, json, os, re, subprocess, sys, time, urllib.request

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MIG = os.path.join(REPO, "supabase", "migrations")


def run_sql(target, sql):
    """Run SQL; return rows as a list of dicts (live) or the stdout text (local file runs)."""
    if target == "live":
        ref, tok = os.environ["SUPABASE_PROJECT_REF"], os.environ["SBP"]
        req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query", data=json.dumps({"query": sql}).encode(),
                                     headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json", "User-Agent": "t3a-live-apply/1"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            raise RuntimeError(e.read().decode()[:2000])
    sock, port = os.environ.get("PGL_SOCK", "/tmp/pgl"), os.environ.get("PGL_PORT", "5433")
    p = subprocess.run(["psql", "-h", sock, "-p", port, "-U", "neondb_owner", "-d", "t3a", "-v", "ON_ERROR_STOP=1", "-qAt", "-f", "-"], input=sql, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout)[:2000])
    return p.stdout


def q(target, sql):
    """One query returning a JSON array of rows."""
    wrapped = f"select coalesce(jsonb_agg(to_jsonb(_r)), '[]'::jsonb)::text as j from ({sql}) _r"
    out = run_sql(target, wrapped)
    if target == "live":
        j = out[0]["j"]
        return json.loads(j) if isinstance(j, str) else j
    return json.loads(out.strip().splitlines()[-1])


CATALOG = {
    "functions": "select p.oid::regprocedure::text as k, pg_get_functiondef(p.oid) as def, coalesce(p.proacl::text,'') as acl from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p') order by 1",
    "tables": "select c.relname as k, c.relkind::text as kind, c.relrowsecurity as rls, coalesce(c.relacl::text,'') as acl from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','v','m','S') order by 1",
    "columns": "select table_name||'.'||column_name as k, table_name as t, column_name as c, udt_name||coalesce('('||character_maximum_length||')','') as type, coalesce(column_default,'') as dflt, is_nullable as nn from information_schema.columns where table_schema='public' order by 1",
    "indexes": "select indexname as k, tablename as t, indexdef as def from pg_indexes where schemaname='public' order by 1",
    "triggers": "select tgrelid::regclass::text||'.'||tgname as k, tgrelid::regclass::text as t, tgname as n, pg_get_triggerdef(oid) as def from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace) order by 1",
    "policies": "select tablename||'.'||policyname as k, tablename as t, policyname as n, permissive, roles::text as roles, cmd, coalesce(qual,'') as qual, coalesce(with_check,'') as wc from pg_policies where schemaname='public' order by 1",
    "constraints": "select conrelid::regclass::text||'.'||conname as k, conrelid::regclass::text as t, conname as n, pg_get_constraintdef(oid) as def from pg_constraint where connamespace='public'::regnamespace order by 1",
    "views": "select viewname as k, definition as def from pg_views where schemaname='public' order by 1",
    "enums": "select t.typname as k, array_to_string(array_agg(e.enumlabel order by e.enumsortorder), ',') as labels from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typnamespace='public'::regnamespace group by 1 order by 1",
}


def norm_acl(a):
    return "{" + ",".join(sorted(i for i in (a or "").strip("{}").split(",") if i)) + "}" if a else ""


def snapshot(target, data_tables, shape=None):
    snap = {name: q(target, sql) for name, sql in CATALOG.items()}
    for name in ("functions", "tables"):
        for r in snap[name]:
            r["acl"] = norm_acl(r["acl"])
    tables = [t["k"] for t in snap["tables"] if t["kind"] == "r"]
    # one aggregate hash and count per table (rows are compared as text; a changed hash means rows were added or changed)
    parts = [f"select '{t}' as k, count(*)::int as n, md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) as h from public.\"{t}\" x" for t in tables]
    snap["data"] = {}
    for i in range(0, len(parts), 60):
        for r in q(target, " union all ".join(parts[i:i + 60])):
            snap["data"][r["k"]] = {"n": r["n"], "h": r["h"]}
    snap["rows"] = {}
    old_cols = {}
    if shape:
        for c in shape["columns"]:
            old_cols.setdefault(c["t"], set()).add(c["c"])
    for t in data_tables:
        # rows are compared on the columns that existed before: a column added by a migration is not a data change (dropping it undoes it)
        extras = sorted({c["c"] for c in snap["columns"] if c["t"] == t} - old_cols.get(t, {c["c"] for c in snap["columns"] if c["t"] == t})) if shape else []
        arr = "ARRAY[" + ",".join("'" + e + "'" for e in extras) + "]::text[]"
        snap["rows"][t] = q(target, f"select md5((to_jsonb(x) - {arr})::text) as h, (to_jsonb(x) - {arr}) as r from public.\"{t}\" x")
    return snap


def acl_sql(kind, obj, acl):
    """Statements that make an object's grants equal acl (a pg ACL array text such as {postgres=X/postgres,=X/postgres})."""
    out = []
    revoke_from = "public, anon, authenticated, service_role"
    out.append(f"revoke all on {kind} {obj} from {revoke_from};")
    for item in [i for i in acl.strip("{}").split(",") if i]:
        m = re.match(r'^"?([^=]*)=([^/]*)/', item)
        if not m:
            continue
        grantee, privs = m.group(1), m.group(2)
        if grantee not in ("", "anon", "authenticated", "service_role"):
            continue
        who = "public" if grantee == "" else grantee
        full = {"function": "execute"}.get(kind)
        if kind == "function":
            out.append(f"grant execute on function {obj} to {who};")
        else:
            names = {"r": "select", "a": "insert", "w": "update", "d": "delete", "D": "truncate", "x": "references", "t": "trigger"}
            ps = ", ".join(names[c] for c in privs if c in names)
            if ps:
                out.append(f"grant {ps} on table {obj} to {who};")
    return out


def make_rollback(pre, post):
    L = ["-- Generated rollback. Run in one transaction.", "begin;", "set local search_path to public, extensions;"]
    warn = []
    bykey = lambda lst: {r["k"]: r for r in lst}
    # 1. data: remove rows that were added (tables listed in pre['rows']); rows that were removed or changed are put back in step 5
    restore = []
    for t, prerows in pre.get("rows", {}).items():
        pre_h = {r["h"]: r["r"] for r in prerows}
        post_h = {r["h"]: r["r"] for r in post.get("rows", {}).get(t, [])}
        added = [h for h in post_h if h not in pre_h]
        gone = [pre_h[h] for h in pre_h if h not in post_h]
        if added:
            extras = "ARRAY[" + ",".join("'" + e + "'" for e in sorted({c["c"] for c in post["columns"] if c["t"] == t} - {c["c"] for c in pre["columns"] if c["t"] == t})) + "]::text[]"
            L.append(f'alter table public."{t}" disable trigger user;')
            L.append(f'delete from public."{t}" x where md5((to_jsonb(x) - {extras})::text) in ({", ".join(repr(h) for h in added)});')
            L.append(f'alter table public."{t}" enable trigger user;')
        if gone:
            restore.append((t, gone))
    # 2. schema objects added to tables that existed before
    pre_tables = {t["k"] for t in pre["tables"]}
    new_tables = [t["k"] for t in post["tables"] if t["k"] not in pre_tables and t["kind"] == "r"]
    for name in ("triggers", "policies"):
        pk = bykey(pre[name])
        for r in post[name]:
            if r["k"] not in pk and r["t"] in pre_tables:
                L.append(f'drop {"trigger" if name == "triggers" else "policy"} if exists "{r["n"]}" on public."{r["t"]}";')
    for name in ("constraints",):
        pk = bykey(pre[name])
        for r in post[name]:
            if r["k"] not in pk and r["t"].strip('"') in pre_tables:
                L.append(f'alter table public."{r["t"].strip(chr(34))}" drop constraint if exists "{r["n"]}";')
    pk = bykey(pre["indexes"])
    for r in post["indexes"]:
        if r["k"] not in pk and r["t"] in pre_tables:
            L.append(f'drop index if exists public."{r["k"]}";')
    ppol = bykey(pre["policies"])
    for r in post["policies"]:
        o = ppol.get(r["k"])
        if o and o != r:
            roles = ", ".join(x if x else "public" for x in o["roles"].strip("{}").split(",")) or "public"
            L.append(f'drop policy if exists "{o["n"]}" on public."{o["t"]}";')
            L.append(f'create policy "{o["n"]}" on public."{o["t"]}" as {o["permissive"].lower()} for {o["cmd"].lower()} to {roles}'
                     + (f' using ({o["qual"]})' if o["qual"] else "") + (f' with check ({o["wc"]})' if o["wc"] else "") + ";")
    ptr = bykey(pre["triggers"])
    for r in post["triggers"]:
        o = ptr.get(r["k"])
        if o and o["def"] != r["def"]:
            L.append(f'drop trigger if exists "{o["n"]}" on {o["t"] if "." in o["t"] else "public." + o["t"]};')
            L.append(o["def"] + ";")
    pix = bykey(pre["indexes"])
    for r in post["indexes"]:
        o = pix.get(r["k"])
        if o and o["def"] != r["def"]:
            L.append(f'drop index if exists public."{o["k"]}";')
            L.append(o["def"] + ";")
    pcn = bykey(pre["constraints"])
    for r in post["constraints"]:
        o = pcn.get(r["k"])
        if o and o["def"] != r["def"]:
            tbl = o["t"].strip('"')
            L.append(f'alter table public."{tbl}" drop constraint if exists "{o["n"]}";')
            L.append(f'alter table public."{tbl}" add constraint "{o["n"]}" {o["def"]};')
    pc = bykey(pre["columns"])
    for r in post["columns"]:
        if r["k"] not in pc and r["t"] in pre_tables:
            L.append(f'alter table public."{r["t"]}" drop column if exists "{r["c"]}" cascade;')
        elif r["k"] in pc and (pc[r["k"]]["type"], pc[r["k"]]["dflt"], pc[r["k"]]["nn"]) != (r["type"], r["dflt"], r["nn"]):
            warn.append(f'column changed, restore by hand: {r["k"]}: {pc[r["k"]]} -> {r}')
    ptab = bykey(pre["tables"])
    for r in post["tables"]:
        o = ptab.get(r["k"])
        if o and r["kind"] == "r":
            if o["rls"] != r["rls"]:
                L.append(f'alter table public."{r["k"]}" {"enable" if o["rls"] else "disable"} row level security;')
            if o["acl"] != r["acl"]:
                L.extend(acl_sql("table", f'public."{r["k"]}"', o["acl"]))
    for r in post["enums"]:
        o = bykey(pre["enums"]).get(r["k"])
        if o and o["labels"] != r["labels"]:
            warn.append(f'enum labels changed (cannot be dropped): {r["k"]}')
    for r in post["views"]:
        o = bykey(pre["views"]).get(r["k"])
        if o and o["def"] != r["def"]:
            warn.append(f'view changed, restore by hand: {r["k"]}')
    # 2b. rows that were removed or changed come back now that the table has its old columns again
    for t, gone in restore:
        L.append(f'alter table public."{t}" disable trigger user;')
        L.append(f'insert into public."{t}" select * from jsonb_populate_recordset(null::public."{t}", $rb${json.dumps(gone)}$rb$::jsonb) on conflict do nothing;')
        L.append(f'alter table public."{t}" enable trigger user;')
    # 3. functions that changed: restore the old body and grants
    pf = bykey(pre["functions"])
    for r in post["functions"]:
        o = pf.get(r["k"])
        if o and (o["def"] != r["def"]):
            L.append(o["def"].rstrip().rstrip(";") + ";")
            L.extend(acl_sql("function", r["k"], o["acl"]))
        elif o and o["acl"] != r["acl"]:
            L.extend(acl_sql("function", r["k"], o["acl"]))
    # 4. objects that are new: tables first (their triggers and policies go with them), then functions
    for t in new_tables:
        L.append(f'drop table if exists public."{t}" cascade;')
    for r in post["tables"]:
        if r["k"] not in pre_tables and r["kind"] in ("v", "m"):
            L.append(f'drop {"view" if r["kind"] == "v" else "materialized view"} if exists public."{r["k"]}" cascade;')
    for r in post["tables"]:
        if r["k"] not in pre_tables and r["kind"] == "S":
            L.append(f'drop sequence if exists public."{r["k"]}" cascade;')
    for r in post["functions"]:
        if r["k"] not in pf:
            L.append(f'drop function if exists {r["k"]} cascade;')
    L.append("commit;")
    return "\n".join(L) + "\n", warn


def diff_snaps(a, b):
    """Differences between two snapshots (data hashes, catalogs). Empty list means identical."""
    out = []
    for name in CATALOG:
        am = {r["k"]: r for r in a[name]}; bm = {r["k"]: r for r in b[name]}
        for k in sorted(set(am) | set(bm)):
            if am.get(k) != bm.get(k):
                out.append(f"{name}: {k}: {'added' if k not in am else 'removed' if k not in bm else 'changed'}")
    for k in sorted(set(a["data"]) | set(b["data"])):
        if a["data"].get(k) != b["data"].get(k):
            out.append(f"data: {k}: {a['data'].get(k)} -> {b['data'].get(k)}")
    return out


def pending(target, lo=None, hi=None):
    files = sorted(glob.glob(os.path.join(MIG, "*.sql")))
    return [f for f in files if (lo is None or os.path.basename(f)[:14] >= lo) and (hi is None or os.path.basename(f)[:14] <= hi)]


def apply(target, lo, hi, record):
    recs = []
    for f in pending(target, lo, hi):
        sql = "set search_path to public, extensions;\n" + open(f).read()
        t0 = time.time()
        try:
            run_sql(target, sql)
            ok, err = True, None
        except Exception as e:
            ok, err = False, str(e)
        recs.append({"file": os.path.basename(f), "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest(), "ok": ok, "error": err, "seconds": round(time.time() - t0, 2)})
        print(("ok   " if ok else "FAIL ") + os.path.basename(f) + ("" if ok else "  " + (err or "")[:300]), flush=True)
        json.dump(recs, open(record, "w"), indent=1)
        if not ok:
            return False
    return True


def main():
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("snapshot"); s.add_argument("--target", required=True); s.add_argument("--out", required=True); s.add_argument("--data-tables", default=""); s.add_argument("--shape", help="a pre-change snapshot: row hashes then ignore columns added since")
    r = sp.add_parser("rollback"); r.add_argument("--pre", required=True); r.add_argument("--post", required=True); r.add_argument("--out", required=True)
    c = sp.add_parser("compare"); c.add_argument("--a", required=True); c.add_argument("--b", required=True)
    a = sp.add_parser("apply"); a.add_argument("--target", required=True); a.add_argument("--from", dest="lo", required=True); a.add_argument("--to", dest="hi"); a.add_argument("--record", required=True)
    d = sp.add_parser("datatables"); d.add_argument("--pre", required=True); d.add_argument("--post", required=True)
    x = ap.parse_args()
    if x.cmd == "snapshot":
        json.dump(snapshot(x.target, [t for t in x.data_tables.split(",") if t], json.load(open(x.shape)) if x.shape else None), open(x.out, "w"))
    elif x.cmd == "rollback":
        sql, warn = make_rollback(json.load(open(x.pre)), json.load(open(x.post)))
        open(x.out, "w").write(sql); print("rollback lines:", sql.count("\n")); [print("WARN", w) for w in warn]
        sys.exit(2 if warn else 0)
    elif x.cmd == "compare":
        d_ = diff_snaps(json.load(open(x.a)), json.load(open(x.b)))
        print("identical" if not d_ else "\n".join(d_)); sys.exit(1 if d_ else 0)
    elif x.cmd == "datatables":
        pre, post = json.load(open(x.pre)), json.load(open(x.post))
        print(",".join(k for k in sorted(post["data"]) if pre["data"].get(k) != post["data"].get(k) and k in pre["data"]))
    elif x.cmd == "apply":
        sys.exit(0 if apply(x.target, x.lo, x.hi, x.record) else 1)


main()
