#!/usr/bin/env python3
"""Step 3d: patch the live source approval route with the per dimension preconditions (D2 INS-004, D-01, D-02) and emit migration 20261207.

  python3 tools/day1/build_source_gateway_migration.py <defs.json> <head.sql>

<defs.json> holds pg_get_functiondef of t3a_d1_record_source_approval as read from production; <head.sql> is the hand written part of the
migration (tables, preconditions, gate). The patched route logs a precondition refusal to the existing approval refusal log and returns it."""
import json, sys
from pathlib import Path

d_all = json.load(open(sys.argv[1])); d = d_all["t3a_d1_record_source_approval"]
head = Path(sys.argv[2]).read_text()
needle = "  -- AX-04. Lock before reading standing"
assert d.count(needle) == 1, "live definition drifted"
patch = """  -- D2 INS-004: a source of a later dimension needs its drafting tests, its rights route (Stage 3), its derived fields and its name clearance
  -- before an approval can be recorded. D1 approvals already recorded are not re-judged.
  IF p_status = 'approved' THEN
    v_pre := public.t3a_source_approval_preconditions(p_source_version_id);
    IF v_pre IS NOT NULL THEN
      INSERT INTO public.t3a_d1_approval_refusal_log
        (source_id, source_version_id, attempted_status, refusal_code, standing_at_refusal, attempted_by)
      VALUES (p_source_id, p_source_version_id, p_status, v_pre, public.t3a_d1_version_standing_status(p_source_version_id), v_actor);
      RETURN jsonb_build_object('recorded', false, 'refusal_code', v_pre,
        'remedy', 'This is a precondition of the dimension, not a decision. The refusal is the control.');
    END IF;
  END IF;

"""
d = d.replace(needle, patch + needle)
d = d.replace("  v_approval uuid;\nBEGIN", "  v_approval uuid;\n  v_pre      text;\nBEGIN", 1)
assert "v_pre      text;" in d
na = d_all["t3a_d1_next_attempt_permitted"]
old = "     WHERE c.completed_observations = v_completed;"
assert na.count(old) == 1, "live next_attempt definition drifted"
na = na.replace(old, "     WHERE c.completed_observations = v_completed AND c.dimension_id = p_dimension_id;")
out = head.rstrip() + "\n\n-- The live approval route with the precondition block added (generated from the production definition).\n" + d.rstrip() + ";\n\n-- The attempt rule reads the cooldown ladder of its own dimension (the ladder table is now keyed by dimension).\n" + na.rstrip() + ";\n"
Path(sys.argv[3]).write_text(out)
print("wrote", sys.argv[3], len(out))
