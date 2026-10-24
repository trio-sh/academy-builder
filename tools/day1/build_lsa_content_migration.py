#!/usr/bin/env python3
"""Build the Session Archive content migration for one dimension from its Session Archive content package (loaded as inactive draft records, the activation flag stays off).

  python3 tools/day1/build_lsa_content_migration.py <Session-Archive-Content.json> <out.sql> [source label for the header]

One row per record in public.t3a_lsa_registry_record: families, direction_rules, sufficiency_rules, entries, history_rules, dimension_rules, dimension_entries, then the state mapping per proposition.
No record carries an approval, an effective date or an active status. Run on tools/lsa/fixtures/d4-session-archive-content.json it reproduces the D4 migration 20261228000000 byte for byte."""
import json, sys
src, out = sys.argv[1], sys.argv[2]
label = sys.argv[3] if len(sys.argv) > 3 else src
d = json.load(open(src)); dim = d["dimension_id"]; pid = d["package_id"]
KEY = {"families": "family_id", "direction_rules": "rule_id", "sufficiency_rules": "rule_id", "entries": "entry_id", "history_rules": "rule_id", "dimension_rules": "rule_id", "dimension_entries": "entry_id"}
lit = lambda s: "'" + str(s).replace("'", "''") + "'"
rows = []
for reg, key in KEY.items():
    for r in d["registries"][reg]:
        assert r["status"] == "draft_for_approval" and r["approved_by"] is None and r["approved_at"] is None and r["effective_from"] is None and r["effective_to"] is None, (reg, r.get(key))
        rows.append(f"  ({lit(reg)}, {lit(r[key])}, {r['version']}, {lit(dim)}, 'draft_for_approval', {lit(pid)}, {lit(json.dumps(r, ensure_ascii=False))}::jsonb)")
for prop, m in d["state_mapping"].items():
    rows.append(f"  ('state_mapping', {lit(prop)}, 1, {lit(dim)}, 'draft_for_approval', {lit(pid)}, {lit(json.dumps(m, ensure_ascii=False))}::jsonb)")
elems = " and ".join(sorted({r["conduct_element_id"] for r in d["registries"]["families"]}))
head = (f"-- {dim} Session Archive content ({pid} v{d['version']}): loaded as inactive draft records for {elems}. Status: draft for founder approval.\n"
        f"-- Generated from {label}. No record carries an approval, an effective date or an active status; the activation flag stays off.\n")
text = head + "insert into public.t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, package_id, body) values\n" + ",\n".join(rows) + "\non conflict (registry, record_key, version) do nothing;\n"
open(out, "w").write(text)
print(out, len(rows), "records")
