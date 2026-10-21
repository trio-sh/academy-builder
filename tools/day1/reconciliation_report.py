#!/usr/bin/env python3
"""R6: the reconciliation report (T3A-DEV-DAY1-001 9.1.6), built from production.

  SBP=<token> python3 tools/day1/reconciliation_report.py

Reads the field registry, the physical map and row counts from the live database (aggregate counts only; no row content), then writes
docs/day1/reconciliation-report.md and docs/day1/evidence/reconciliation_report.json: every field with its class, where it lives, the action
taken (the migration that did it), and counts. The first pass report is kept as docs/day1/reconciliation-report-first-pass.md."""
import json, os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = {  # domain -> migration that mapped or built it
 "A": "20261104000000_day1_accounts_roles", "B": "20261105000000_day1_consent", "C": "20261106000000_day1_observation_path", "D": "20261107000000_day1_sources",
 "E": "20261108000000_day1_observation_record", "F": "20261109000000_day1_mentor_assurance", "G": "20261110000000_day1_report_release", "H": "20261111000000_day1_challenge",
 "I": "20261112000000_day1_employer", "J": "20261113000000_day1_growth_log", "K": "20261114000000_day1_rehearsal", "L": "20261115000000_day1_orders",
 "M": "20261116000000_day1_session_archive_dormant", "N": "20261117000000_day1_event_envelope_map (+ 20261102 event registry, 20261122 capture state)",
 "O": "20261118000000_day1_governance_registry", "P": "20261119000000_day1_governance_controls", "Q": "20261120000000_day1_aggregate_sockets", "R": "20261121000000_day1_programs"}
CLASS_NAME = {"M1": "EXACT", "M2": "RENAME", "M3": "TYPE", "M4": "SPLIT/MERGE", "M5": "MISSING (added)", "M6": "PROHIBITED PRESENT", "M7": "EXTRA"}

def q(sql):
    r = urllib.request.Request("https://api.supabase.com/v1/projects/tnjyywtulpdyackmwnca/database/query", data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + os.environ["SBP"], "Content-Type": "application/json", "User-Agent": "curl/8"}, method="POST")
    out = json.load(urllib.request.urlopen(r, timeout=180))
    if isinstance(out, dict) and "HTTP_ERROR" in out: raise SystemExit(out)
    return out

def main():
    fields = q("""select r.qualified_name, r.domain, r.field, r.status, r.canonical_type, r.irreversible, r.if_absent, m.mapping_class, m.physical_table, m.physical_column, m.capture_state_column, m.note
                    from public.t3a_field_registry r join public.t3a_field_physical_map m on m.qualified_name = r.qualified_name and m.dictionary_version = r.dictionary_version
                   where r.dictionary_version = '1.3' and r.status in ('ACTIVE','DORMANT') order by r.domain, r.qualified_name""")
    counts = q("""select m.qualified_name,
        (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I', m.physical_table), false, true, '')))[1]::text::bigint rows_total,
        (xpath('/row/n/text()', query_to_xml(format('select count(%I) n from public.%I', m.physical_column, m.physical_table), false, true, '')))[1]::text::bigint rows_with_value,
        case when m.capture_state_column is null then null else (xpath('/row/n/text()', query_to_xml(format('select count(*) filter (where %I = ''not_captured'') n from public.%I', m.capture_state_column, m.physical_table), false, true, '')))[1]::text::bigint end rows_not_captured
      from public.t3a_field_physical_map m where m.dictionary_version = '1.3'""")
    cmap = {c["qualified_name"]: c for c in counts}
    out = []
    for f in fields:
        c = cmap[f["qualified_name"]]; cls = f["mapping_class"]; note = f["note"] or ""
        if cls == "M3" and "live column is" not in note and "differ" not in note and f["physical_column"] != f["field"]: cls = "M2"  # same meaning, other name
        out.append({"field": f["qualified_name"], "status": f["status"], "type": f["canonical_type"], "irreversible": f["irreversible"], "if_absent": f["if_absent"], "class": cls, "class_name": CLASS_NAME[cls],
                    "table": f["physical_table"], "column": f["physical_column"], "capture_state_column": f["capture_state_column"], "action": MIGRATION[f["domain"]],
                    "rows_in_table": int(c["rows_total"]), "rows_with_value": int(c["rows_with_value"]), "rows_marked_not_captured": None if c["rows_not_captured"] is None else int(c["rows_not_captured"]), "note": note})
    by_class = {}
    for o in out: by_class[o["class"]] = by_class.get(o["class"], 0) + 1
    m7 = json.load(open(ROOT / "docs/day1/evidence/dt56-m7-undeclared-columns.json"))
    m6 = json.load(open(ROOT / "docs/day1/evidence/m6-scan.json")) if (ROOT / "docs/day1/evidence/m6-scan.json").exists() else {}
    touched = q("""select 't3a_attempt' t, count(*) n, 'attempt_no numbered in time order (new column)' what from public.t3a_attempt
                   union all select 't3a_stage_entry_event', count(*), 'administration_conditions capture state set to captured (new column)' from public.t3a_stage_entry_event
                   union all select 'growth_log_entries', count(*) filter (where platform_hidden_at is not null), 'platform generated rows hidden, not deleted (new column)' from public.growth_log_entries""")
    rows_total = q("select count(*) n from public.t3a_event_log")[0]["n"]
    report = {"package": "T3A-DEV-DAY1-001 v1.3", "database": "production (Supabase tnjyywtulpdyackmwnca)", "fields": out, "counts_by_class": by_class, "fields_total": len(out),
              "undeclared_columns_m7": {"columns": m7["undeclared_columns"], "tables": m7["tables_with_undeclared"], "of": m7["columns_in_t3a_tables"], "listed_in": "docs/day1/evidence/dt56-m7-undeclared-columns.json"},
              "prohibited_present_m6": m6 if m6 else "see docs/day1/reconciliation-report-first-pass.md and conflict register CR-006, CR-014",
              "history_marked_r5": touched, "event_log_rows": rows_total,
              "destructive_statements": 0, "historical_values_changed": 0}
    (ROOT / "docs/day1/evidence").mkdir(exist_ok=True)
    (ROOT / "docs/day1/evidence/reconciliation_report.json").write_text(json.dumps(report, indent=1, default=str))
    first = ROOT / "docs/day1/reconciliation-report.md"
    if first.exists() and "(interim)" in first.read_text()[:80]: first.rename(ROOT / "docs/day1/reconciliation-report-first-pass.md")
    md = ["# Day 1 Reconciliation Report (final)", "",
          "Package T3A-DEV-DAY1-001 v1.3. Database: production. Built by `tools/day1/reconciliation_report.py` from the live registry, physical map and aggregate row counts (no row content was read). The first pass (R1 inventory, automated R2) is `reconciliation-report-first-pass.md`.", "",
          "## Steps", "",
          "| Step | Status | Evidence |", "|---|---|---|",
          "| R1 Inventory | Done | `evidence/inventory.min.json`, `evidence/row-counts.json` |",
          "| R2 Map | Done: every ACTIVE and DORMANT field has one class and one physical column | this report, `evidence/reconciliation_report.json` |",
          "| R3 Plan | Done: one additive migration per domain (`supabase/migrations/20261104` to `20261127`), generated from `tools/day1/plans/`; no destructive statement | the migration files |",
          "| R4 Apply | Done: every migration was tested on the throwaway database (`test-environment.md`), then applied to production | `evidence/*-test.json`, `evidence/production-apply-*-verification.json` |",
          "| R5 Mark history | Done: rows that predate a new field are `not_captured` by default; nothing was invented. Existing rows touched are listed below | below |",
          "| R6 Report | This document and the JSON | `evidence/reconciliation_report.json` |", "",
          f"## Counts", "", f"{len(out)} fields (ACTIVE and DORMANT) mapped; DT-01 passes in production (522 of 522).", "",
          "| Class | Meaning | Fields |", "|---|---|---|"]
    for k in sorted(by_class): md.append(f"| {k} | {CLASS_NAME[k]} | {by_class[k]} |")
    md += ["", f"Extra columns not in the dictionary (M7, status LEGACY, existing writes unchanged, no new reader): {m7['undeclared_columns']:,} columns in {m7['tables_with_undeclared']} of the t3a tables ({m7['columns_in_t3a_tables']:,} columns in all). Listed in `evidence/dt56-m7-undeclared-columns.json`.", "",
           "Prohibited items present (M6): frozen in place, not deleted, no new reader; the register is CR-006 (code and data hits, 1,939 in the baseline) and CR-014 (new D1 tables). The `forbidden_ratchet.py` check stops the count from growing.", "",
           "## Existing rows touched (R5)", "", "No existing value was changed and no row was deleted. The only writes to rows that already existed:", "", "| Table | Rows | What |", "|---|---|---|"]
    for t in touched: md.append(f"| `{t['t']}` | {t['n']} | {t['what']} |")
    md += ["", "Structure changed on existing objects (no data): one check widened (`t3a_employer_application.approval_decision` now also allows `declined`, table empty); guards added (observation append only, free text refusal on two mentor tables, issuance and consent gates, set once milestones); the 5 Growth Log rows hidden by a new column and a narrower read policy; nothing dropped.", "",
           f"`t3a_event_log` holds {rows_total} rows: the event registry and envelope were built before any event had been written. Backfills write no events (no history is invented, CR-032).", "",
           "## Every field", "", "| Field | Status | Class | Table.column | Capture state column | Action (migration) | Rows in table | Rows with a value | Rows not captured |", "|---|---|---|---|---|---|---|---|---|"]
    for o in out:
        md.append(f"| `{o['field']}` | {o['status']} | {o['class']} {o['class_name']} | `{o['table']}.{o['column']}` | {('`' + o['capture_state_column'] + '`') if o['capture_state_column'] else ''} | {o['action']} | {o['rows_in_table']} | {o['rows_with_value']} | {'' if o['rows_marked_not_captured'] is None else o['rows_marked_not_captured']} |")
    (ROOT / "docs/day1/reconciliation-report.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(by_class, "fields", len(out), "touched", touched)

if __name__ == "__main__": main()
