#!/usr/bin/env python3
"""Session Archive content migration for one dimension, from its content package (T3A-<dim>-LSA-CONTENT-001).

  python3 tools/lsa/build_content_migration.py tools/lsa/fixtures/d8-session-archive-content.json supabase/migrations/<version>_d8_session_archive_content.sql

Every record loads as draft_for_approval: no approval, no effective date, no active status. The activation flag stays off. Run on the D4 package it reproduces
supabase/migrations/20261228000000_d4_session_archive_content.sql byte for byte (the test for this generator)."""
import json, sys

src, out = sys.argv[1], sys.argv[2]
pkg = json.load(open(src))
dim, pid = pkg["dimension_id"], pkg["package_id"]
lit = lambda s: "'" + str(s).replace("'", "''") + "'"
order = ["families", "direction_rules", "sufficiency_rules", "entries", "history_rules", "dimension_rules", "dimension_entries"]
keyf = {"families": "family_id", "direction_rules": "rule_id", "sufficiency_rules": "rule_id", "entries": "entry_id", "history_rules": "rule_id", "dimension_rules": "rule_id", "dimension_entries": "entry_id"}
rows = []
for reg in order:
    for rec in pkg["registries"].get(reg, []):
        assert rec.get("status") == "draft_for_approval" and rec.get("approved_by") is None and rec.get("approved_at") is None and rec.get("effective_from") is None, (reg, rec.get(keyf[reg]))
        rows.append(f"  ({lit(reg)}, {lit(rec[keyf[reg]])}, {int(rec['version'])}, {lit(dim)}, 'draft_for_approval', {lit(pid)}, {lit(json.dumps(rec))}::jsonb)")
for key, mapping in pkg["state_mapping"].items():
    rows.append(f"  ('state_mapping', {lit(key)}, 1, {lit(dim)}, 'draft_for_approval', {lit(pid)}, {lit(json.dumps(mapping))}::jsonb)")
elems = [f["conduct_element_id"] for f in pkg["registries"].get("families", [])]
head = (f"-- {dim} Session Archive content ({pid} v{pkg['version']}): loaded as inactive draft records for {' and '.join(elems)}. Status: draft for founder approval.\n"
        f"-- Generated from tools/lsa/fixtures/{dim.lower()}-session-archive-content.json. No record carries an approval, an effective date or an active status; the activation flag stays off.\n")
sql = head + "insert into public.t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, package_id, body) values\n" + ",\n".join(rows) + "\non conflict (registry, record_key, version) do nothing;\n"
open(out, "w").write(sql)
print(f"{dim}: {len(rows)} records -> {out}")
