#!/usr/bin/env python3
"""Return report (T3A-DEV-DAY1-001 14 and the D2/D3/D4 editions, 'Delivery'): the ERD, the data dictionary AS BUILT, the acceptance results and the conflict register,
read from the live schema and the committed evidence. Needs SBP (a Supabase management token) in the environment; it only reads.
  python3 tools/day1/build_return_report.py
Writes docs/day1/return/ (erd-*.mmd, data-dictionary-as-built.csv, table-index.md) and docs/day1/RETURN-REPORT.md."""
import csv, json, os, re, sys, urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/day1/return"; OUT.mkdir(parents=True, exist_ok=True)

def q(sql):
    r = urllib.request.Request("https://api.supabase.com/v1/projects/tnjyywtulpdyackmwnca/database/query", data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + os.environ["SBP"], "Content-Type": "application/json", "User-Agent": "curl/8"}, method="POST")
    return json.load(urllib.request.urlopen(r, timeout=180))

cols = q("""select c.table_name t, c.column_name col, c.data_type ty, c.udt_name u, c.is_nullable n, c.column_default d, c.ordinal_position o
            from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name
            where c.table_schema='public' and t.table_type='BASE TABLE' and c.table_name like 't3a\\_%' order by 1, 7""")
pk = q("""select t.relname t, a.attname col from pg_index i join pg_class t on t.oid=i.indrelid join pg_namespace n on n.oid=t.relnamespace
          join pg_attribute a on a.attrelid=t.oid and a.attnum = any(i.indkey) where n.nspname='public' and i.indisprimary and t.relname like 't3a\\_%'""")
fks = q("""select t.relname src, r.relname dst, a.attname col from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_class r on r.oid=c.confrelid
           join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum = c.conkey[1]
           where n.nspname='public' and c.contype='f' and t.relname like 't3a\\_%' order by 1, 2""")
rls = {r["t"]: r["rls"] for r in q("select c.relname t, c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 't3a\\_%'")}
anon = {r["t"] for r in q("select table_name t from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') and table_name like 't3a\\_%' group by 1")}
fn = q("select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 't3a\\_%'")[0]["n"]
trg = q("select count(*) n from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relname like 't3a\\_%'")[0]["n"]
mig = sorted(p.name for p in (ROOT / "supabase/migrations").glob("*.sql"))

tables = defaultdict(list)
for c in cols: tables[c["t"]].append(c)
pks = defaultdict(set)
for p in pk: pks[p["t"]].add(p["col"])

# dictionary as built
with open(OUT / "data-dictionary-as-built.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["table", "column", "type", "nullable", "primary_key", "default"])
    for t, cs in sorted(tables.items()):
        for c in cs:
            w.writerow([t, c["col"], c["u"] if c["ty"] == "USER-DEFINED" else c["ty"], c["n"], "yes" if c["col"] in pks[t] else "", (c["d"] or "")[:80]])

# ERD: tables are grouped by the connected component of their foreign keys; each component of 2 or more tables is a diagram
adj = defaultdict(set)
# a table outside t3a_ (profiles, auth) is a hub that would join everything into one picture: connectivity ignores it
for e in fks:
    if e["src"] in tables and e["dst"] in tables:
        adj[e["src"]].add(e["dst"]); adj[e["dst"]].add(e["src"])
seen, comps = set(), []
for t in sorted(adj):
    if t in seen: continue
    st, comp = [t], set()
    while st:
        x = st.pop()
        if x in comp: continue
        comp.add(x); st.extend(adj[x] - comp)
    seen |= comp; comps.append(sorted(comp))
comps.sort(key=lambda c: (-len(c), c[0]))
def erd(ts):
    L = ["erDiagram"]
    for t in ts:
        L.append(f"  {t} {{")
        for c in tables[t][:12]:
            ty = (c["u"] if c["ty"] == "USER-DEFINED" else c["ty"]).replace(" ", "_")
            L.append(f"    {ty} {c['col']}{' PK' if c['col'] in pks[t] else ''}")
        if len(tables[t]) > 12: L.append(f"    text _{len(tables[t]) - 12}_more_columns")
        L.append("  }")
    for e in fks:
        if e["src"] in ts and e["dst"] in ts: L.append(f"  {e['dst']} ||--o{{ {e['src']} : \"{e['col']}\"")
    return "\n".join(L) + "\n"
files = []
for i, comp in enumerate(comps, 1):
    name = f"erd-{i:02d}-{comp[0]}.mmd"; (OUT / name).write_text(erd(comp)); files.append((name, len(comp)))
isolated = sorted(t for t in tables if t not in seen)
idx = ["# Table index (as built)", "", f"{len(tables)} `t3a_` tables in production; {len(fks)} foreign keys; {len(comps)} connected groups drawn as diagrams; {len(isolated)} tables with no foreign key to another `t3a_` table are listed below.", "",
       "| Diagram | Tables |", "|---|---|"] + [f"| `{n}` | {k} |" for n, k in files] + ["", "## Tables with no foreign key", "", "| Table | Columns | Row level security | Open to anon or authenticated |", "|---|---|---|---|"]
for t in isolated: idx.append(f"| `{t}` | {len(tables[t])} | {'on' if rls.get(t) else 'OFF'} | {'yes' if t in anon else 'no'} |")
(OUT / "table-index.md").write_text("\n".join(idx) + "\n")

# acceptance
ev = ROOT / "docs/day1/evidence"
def load(n):
    p = ev / n
    return json.load(open(p)) if p.exists() else None
acc = {}
for d in ("d2", "d3", "d4"):
    j = load(f"{d}-acceptance-run.json")
    if j: acc[d.upper()] = (j["pass"], j["identifiers_required"], j["fail"], j["not_run"])
day1 = re.search(r"\*\*(\d+) PASS.*?of (\d+)\.", (ROOT / "docs/day1/acceptance-status.md").read_text())
crs = [l for l in (ROOT / "docs/day1/conflict-register.md").read_text().splitlines() if l.startswith("| CR-")]
rr = {}
for n in ("ber-multipage-render-check.json", "lsa-resolver-conformance.json", "lsa-registry-test.json"):
    j = load(n); rr[n] = (j["passed"], j["total"]) if j else None

R = f"""# Return report: Day 1 data capture, D2, D3, D4, multi page report, Session Archive (dormant)

Generated by `tools/day1/build_return_report.py` from the live production schema and the committed evidence. Everything below is **built and not enabled**: no source is approved, no mentor is authorized, no clearance or consent exists, Stage 4 is closed, the Session Archive is dormant and every enforcement switch the founder holds is still off.

## 1. What is delivered

| Part | State |
|---|---|
| Day 1 data capture (domains A to R, registries, live writers, release model, access policies) | Applied to production. {day1.group(1)} of {day1.group(2)} acceptance items PASS; the open ones are listed in `acceptance-status.md` |
| D2, D3, D4 observation pathways on one shared machinery | Applied to production, content loaded, **not servable** |
| Commit seal (D-06), D4 only multi page rule (D-07), correction commitment route | Applied; seal key not loaded |
| Multi page Behavioral Evidence Report (STD v9.19 Section 62) | Built for the frozen specimen; real reports refuse until the claim package rule is given (CR-162) |
| Session Archive (dormant) | Resolver port, registries, flags (both off), D4 content as 30 drafts |
| This report | ERD, data dictionary as built, acceptance results, conflict register |

## 2. Entity relationship diagrams

{len(tables)} `t3a_` tables, {len(fks)} foreign keys, {len(comps)} connected groups. One Mermaid file per group in `return/`, the index in `return/table-index.md`. Tables with no foreign key are listed there with their row level security state.

| Diagram | Tables |
|---|---|
""" + "\n".join(f"| `return/{n}` | {k} |" for n, k in files[:12]) + (f"\n| … | {len(files) - 12} more groups in `return/` |" if len(files) > 12 else "") + f"""

## 3. Data dictionary as built

`return/data-dictionary-as-built.csv`: {sum(len(v) for v in tables.values())} columns across {len(tables)} tables (table, column, type, nullable, primary key, default), read from production, not from the package. {fn} `t3a_` routines and {trg} triggers are in production; {len(mig)} migrations are in the repository. The package field dictionary (522 fields) is checked against the schema by DT-01.

## 4. Acceptance results

| Suite | Result | File |
|---|---|---|
| Day 1 | {day1.group(1)} PASS of {day1.group(2)} | `acceptance-status.md` |
""" + "\n".join(f"| {d} Section 11 | {p} of {n} identifiers PASS, {f} FAIL, {nr} NOT RUN | `{d.lower()}-acceptance-results.md` |" for d, (p, n, f, nr) in acc.items()) + f"""
| Multi page report, browser checks | {rr['ber-multipage-render-check.json'][0]} of {rr['ber-multipage-render-check.json'][1]} | `evidence/ber-multipage-render-check.json` |
| Session Archive resolver conformance | {rr['lsa-resolver-conformance.json'][0]} of {rr['lsa-resolver-conformance.json'][1]} | `evidence/lsa-resolver-conformance.json` |
| Session Archive registries | {rr['lsa-registry-test.json'][0]} of {rr['lsa-registry-test.json'][1]} | `evidence/lsa-registry-test.json` |

Every run is on the throwaway database with synthetic data; production holds no approved source, so none of it is a statement about a person. Each production apply has a verification file (`evidence/production-apply-*-verification.json`) and a rollback script (`evidence/rollback_*.sql`).

## 5. Conflict register

{len(crs)} entries in `conflict-register.md` (CR-001 to CR-{crs[-1].split('|')[1].strip().split('-')[1]}). Each says what was found, the default applied and what closes it. The ones that need a person with standing are the ones whose last column names Tony Mofoke or the founder.

## 6. Switches and keys that are off

`t3a_consent_config.enforce_gate`, `t3a_capture_config.enforce_required`, `enforce_sequence`, event `ingest_mode` strict, `canonical_writers`, the Session Archive flags `lsa_activation` and `lsa_retention_sweep`, `s4_activation_state`, and the commit seal key. None was turned on by this build.

## 7. Open items for people

See the last column of the conflict register. In short: seal key custody; the claim package selection rule for real reports; the correction commitment sentence; consent wording; the T-EVNOTE-001 text; source authorship and approvals by persons with standing; counsel items; the Session Archive release tension; the production access token (rotate) and the tracked settings file; the Vercel build log for the stack of pull requests.
"""
(ROOT / "docs/day1/RETURN-REPORT.md").write_text(R)
print("tables", len(tables), "fks", len(fks), "groups", len(comps), "isolated", len(isolated), "columns", sum(len(v) for v in tables.values()), "CRs", len(crs))
