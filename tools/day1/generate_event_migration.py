#!/usr/bin/env python3
"""Generate the Day 1 event registry migration (step 11.1.3) from the dictionary JSON and a template.

Same rule as the field registry: check_dictionary.py must pass first.
  python3 tools/day1/generate_event_migration.py           # write
  python3 tools/day1/generate_event_migration.py --check   # exit 1 if the file on disk differs
"""
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "docs/day1/package"
DICT = PKG / "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json"
TMPL = ROOT / "tools/day1/templates/event_registry.sql.tmpl"
OUT = ROOT / "supabase/migrations/20261102000000_day1_event_registry.sql"

# alias, canonical event, confidence, note. 'package' = named in 7.2; 'direct' = same words; 'provisional' = best semantic match, needs founder confirmation
ALIASES = [
    ("observation_committed", "observation.committed", "package", "Named in 7.2. Written by t3a_commit_observation"),
    ("progression_recorded", "observation.progression_recorded", "package", "Named in 7.2"),
    ("observation_path_gateway_opened", "observation.path_opened", "direct", "Written by t3a_create_observation_path_gateway"),
    ("stage_entry_event_opened", "observation.stage_entered", "direct", "Written by t3a_create_stage_entry_event"),
    ("s1_observation_confirmed", "observation.s1_confirmed", "direct", "Written by t3a_confirm_s1_observation"),
    ("progression_decision_recorded", "observation.progression_recorded", "direct", "Written by t3a_record_progression_decision"),
    ("challenge_opened", "challenge.opened", "direct", "Written by t3a_open_challenge"),
    ("disclosure_created", "release.recipient_created", "provisional", "Named recipient release; the D2/D3 editions (D-04) retire this route. Written by t3a_create_disclosure"),
    ("disclosure_revoked", "release.changed", "provisional", "Named recipient release, see above. Written by t3a_revoke_disclosure"),
    ("question_set_ratified", "registry.version_approved", "provisional", "Ratifying a question set is a registry version approval. Written by t3a_ratify_question_set"),
]
# payload key, table, column. Only keys with one unambiguous target in the current schema.
REFERENCES = [
    ("observation_id", "t3a_observation", "observation_id", "committed observation record"),
    ("stage_instance_id", "t3a_stage_instance", "stage_instance_id", None),
    ("source_version_id", "t3a_source_version", "source_version_id", None),
    ("challenge_case_id", "t3a_challenge_case", "challenge_case_id", None),
    ("consent_id", "t3a_d1_consent", "consent_id", None),
    ("account_id", "profiles", "id", "an account is a profile row"),
    ("attempt_id", "t3a_attempt", "attempt_id", None),
    ("ber_report_id", "t3a_d1_ber_report", "ber_report_id", None),
]

def q(s):
    return "'" + s.replace("'", "''") + "'"

def main(check_only):
    r = subprocess.run([sys.executable, str(PKG / "tools/check_dictionary.py"), str(DICT)], capture_output=True, text=True)
    if "RESULT PASS" not in r.stdout:
        print(r.stdout + r.stderr); print("check_dictionary.py did not pass; nothing generated"); return 2
    raw = DICT.read_bytes(); sha = hashlib.sha256(raw).hexdigest(); d = json.loads(raw)
    names = {e["name"] for e in d["events"]}
    for a, c, *_ in ALIASES:
        assert c in names, f"alias {a} points at unregistered event {c}"
    events = [{k: e[k] for k in ("name", "category", "status", "trigger", "required_payload", "optional_payload", "conditional", "payload_schema", "worst_case_payload_bytes")} for e in d["events"]]
    ev = json.dumps(events, separators=(",", ":"), ensure_ascii=False)
    assert "$dict$" not in ev
    ver = d["dictionary_version"]
    alias_rows = ",\n".join(f"  ({q(a)}, {q(ver)}, {q(c)}, {q(conf)}, {q(note)})" for a, c, conf, note in ALIASES)
    ref_rows = ",\n".join(f"  ({q(k)}, {q(t)}, {q(c)}, {q(n) if n else 'null'})" for k, t, c, n in REFERENCES)
    sql = (TMPL.read_text(encoding="utf-8")
           .replace("@@DICT_VERSION@@", ver).replace("@@DICT_FILE@@", DICT.name).replace("@@DICT_SHA@@", sha)
           .replace("@@EVENTS_JSON@@", ev).replace("@@ALIAS_ROWS@@", alias_rows).replace("@@REFERENCE_ROWS@@", ref_rows)
           .replace("@@EVENT_COUNT@@", str(len(d["events"]))))
    assert "@@" not in sql
    if check_only:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == sql
        print("event migration matches the dictionary and template" if same else "event migration DIFFERS; regenerate"); return 0 if same else 1
    OUT.write_text(sql, encoding="utf-8"); print(f"wrote {OUT.relative_to(ROOT)} ({len(sql):,} bytes)"); return 0

if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
