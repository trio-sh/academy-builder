#!/usr/bin/env python3
"""Write docs/day1/acceptance-status.md: one row per acceptance test DT-01..DT-67 with a status, the evidence file, and what is still open.
Statuses: PASS (tested, evidence kept), PASS-DB (database half tested; the application half is open), OPEN (not met), UNRUN (could not be run here, with the reason).
Edit STATUS when something changes; the file is rebuilt, never hand edited."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = json.load(open(ROOT / "docs/day1/package/T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json"))
E = "docs/day1/evidence/"
S = {
 1: ("PASS", "production-apply-event-log-capture-state-verification.json", "522 of 522 active and dormant fields resolve; 0 unmapped; 0 missing capture state; 0 dangling. Checked in production with t3a_field_registry_dt01()"),
 2: ("OPEN", "forbidden-identifiers-baseline.json", "1,990 legacy hits in 99 files (CR-006). tools/day1/forbidden_ratchet.py passes: nothing new, nothing worse. Plain DT-02 passes only when the baseline reaches 0"),
 3: ("PASS", "domain-a-test.json", "Sign up asserting a role other than candidate creates no profile and keeps a refusal row (CR-029). Probe in production"),
 4: ("PASS", "domain-a-test.json", "Gates on Stage entry, gateway, attempt, observation and disclosure. Production has no unverified accounts, so no live effect today"),
 5: ("PASS", "domain-b-test.json", ""), 6: ("PASS", "domain-b-test.json", "Switch enforce_gate is off (CR-035); tested with it on"),
 7: ("PASS", "domain-b-test.json", "Switch enforce_gate is off (CR-035); tested with it on"), 8: ("PASS", "domain-b-test.json", ""),
 9: ("PASS", "domain-b-test.json", ""),
 10: ("PASS", "domain-c-test.json", ""), 11: ("PASS", "domain-c-test.json", "5 minute backdating tolerance is a default (CR-041)"),
 12: ("PASS", "domain-c-test.json", "Cap rule is the live one (CR-007)"), 13: ("PASS", "domain-c-test.json", ""),
 14: ("PASS", "domain-d-test.json", ""),
 15: ("PASS-DB", "domain-e-test.json", "Logged refusal is in t3a_commit_observation; the live writers do not call it yet (CR-047)"),
 16: ("PASS-DB", "domain-e-test.json", "Refused by the table trigger on every route"), 17: ("PASS-DB", "domain-e-test.json", "Via t3a_commit_observation"),
 18: ("PASS-DB", "domain-e-test.json", "The live S1 flow does not write t3a_stage_sequence yet (CR-047)"),
 19: ("PASS-DB", "domain-e-test.json", "enforce_sequence is off (CR-047)"),
 20: ("PASS-DB", "domain-e-test.json", "Guard and table triggers built; edge functions do not call the guard yet (CR-047)"),
 21: ("PASS-DB", "domain-e-test.json", "Same as DT-20"),
 22: ("PASS", "dt22-dt26-test.json", "Observation guard hardened in 20261124: the older guard watched 12 columns and allowed DELETE"),
 23: ("PASS", "event-registry-test.json", "E2, E5"), 24: ("PASS", "event-registry-test.json", "E8, E9, E12; nightly job has no scheduler yet (CR-025)"),
 25: ("PASS", "event-registry-test.json", "E4"), 26: ("PASS", "dt22-dt26-test.json", "Applies to accounts and events, the only tables with record_property"),
 27: ("PASS", "domain-g-test.json", ""), 28: ("PASS", "domain-g-test.json", "The one existing report has no code (CR-052)"),
 29: ("PASS-DB", "domain-j-test.json", "Database read paths tested for participant, mentor, employer, administrator. The app screens that read Growth Log still exist (CR-058)"),
 30: ("OPEN", "", "13 source files still read or write the Growth Log (src/pages/dashboard/*, TrainingModuleViewer, AssessmentViewer, lib/*). To be removed; the database now discards the writes"),
 31: ("PASS", "domain-lm-test.json", "No Session Archive consumer exists; no database function reads both"),
 32: ("PASS-DB", "domain-k-test.json", "No foreign key, no column, no database function named has_rehearsed. scripts/check-firewall.mjs already scans the code and mentions the name only as a prohibition"),
 33: ("PASS", "domain-i-test.json", ""), 34: ("PASS", "domain-i-test.json", "No pool exists yet (CR-056)"), 35: ("PASS", "domain-i-test.json", ""),
 36: ("PASS", "domain-p-test.json", "The existing oversight log is the content read log (CR-063)"),
 37: ("PASS", "domain-p-test.json", ""), 38: ("PASS-DB", "domain-p-test.json", "Records an operator verification; the actual hosting and backup inspection is the operator's"),
 39: ("PASS", "domain-p-test.json", "Deployment values are unset until the founder sets them (CR-062)"),
 40: ("OPEN", "reconciliation-report.md", "R1 and R2 first pass done; R3 to R6 not yet. Backfills so far write no history"),
 41: ("PASS", "domain-no-test.json", "Package tool test_tools.py passes 53 of 53 in a clean environment (CR-001); the database records pass and fail results"),
 42: ("PASS", "acceptance-rules-test.json", ""), 43: ("PASS", "event-registry-test.json", "E13"), 44: ("PASS", "acceptance-rules-test.json", ""),
 45: ("PASS", "acceptance-rules-test.json", "Staleness is read from the report's version set (CR-065)"), 46: ("PASS", "acceptance-rules-test.json", ""),
 47: ("UNRUN", "", "Dormant: the Session Archive consent table is closed, so a consent cannot be granted to test against"),
 48: ("PASS", "acceptance-rules-test.json", ""), 49: ("PASS", "acceptance-rules-test.json", "Sidecar switch is off while the Session Archive is dormant"),
 50: ("UNRUN", "", "Needs the D1 content and the BER golden fixtures loaded; the test database has no production rows (CR-027)"),
 51: ("PASS-DB", "acceptance-rules-test.json", "Via t3a_record_served_instance; the live S1 serving path does not call it yet"),
 52: ("PASS", "acceptance-rules-test.json", ""), 53: ("PASS", "acceptance-rules-test.json", ""), 54: ("PASS", "domain-p-test.json", ""),
 55: ("PASS", "domain-qr-test.json", "No tenant model exists"), 56: ("PASS", "dt56-m7-undeclared-columns.json", "1,591 persisted columns in 255 tables are not in the dictionary; all are listed as M7. Nothing was deleted"),
 57: ("PASS", "acceptance-rules-test.json", ""), 58: ("PASS", "acceptance-rules-test.json", ""),
 59: ("PASS-DB", "domain-p-test.json", "t3a_emit_first and t3a_reconcile_journal; the nine live writers do not use them yet (CR-024)"),
 60: ("PASS", "production-apply-event-log-capture-state-verification.json", "Typed columns stay null; the companion holds the code. Applied to every domain table and the event log"),
 61: ("UNRUN", "", "Needs each live feature exercised in the app against the legacy columns; no legacy column was changed or read differently in this build"),
 62: ("PASS", "acceptance-rules-test.json", "No mapping is made by default (CR-065)"),
 63: ("PASS-DB", "domain-j-test.json", "The database writes nothing to the Growth Log and offers the regenerated view; the app does not use the view yet"),
 64: ("PASS", "event-registry-test.json", "E2"), 65: ("PASS", "acceptance-rules-test.json", "Required-fields switch is off for live writers (CR-038)"),
 66: ("PASS", "event-registry-test.json", "E14; reference rules for 8 id keys (CR-022)"),
 67: ("PASS", "", "check_dictionary.py refuses a changed field type and a changed enum value as DEFINITION_CHANGED; the generators stop when it fails"),
}

def main():
    rows, count = [], {}
    for t in D["acceptance_tests"]:
        n = int(t["id"].split("-")[1]); st, ev, note = S[n]
        count[st] = count.get(st, 0) + 1
        rows.append(f"| {t['id']} | {t['test']} | **{st}** | {('`' + ev + '`') if ev else ''} | {note} |")
    head = ("# Day 1 acceptance status (T3A-DEV-DAY1-001 v1.3)\n\nRebuilt by `tools/day1/acceptance_status.py`. Evidence files are in `docs/day1/evidence/`. "
            "Tests ran on the throwaway database (`test-environment.md`); the migrations were then applied to production with a before snapshot, a rollback and a zero-residue probe.\n\n"
            f"**{count.get('PASS', 0)} PASS, {count.get('PASS-DB', 0)} PASS-DB (database half proven, application half open), {count.get('OPEN', 0)} OPEN, {count.get('UNRUN', 0)} UNRUN** of {len(rows)}.\n\n"
            "| Test | What | Status | Evidence | Note |\n|---|---|---|---|---|\n")
    (ROOT / "docs/day1/acceptance-status.md").write_text(head + "\n".join(rows) + "\n", encoding="utf-8")
    print(count)

if __name__ == "__main__": main()
