#!/usr/bin/env python3
"""DT-02 as a ratchet. The repository still holds legacy hits (docs/day1/evidence/forbidden-identifiers-baseline.json, CR-006), so a plain
zero-hit run cannot pass yet. This runs the package checker with exact exclusions and fails if

  * any file has more hits than its baseline count, or
  * any file that is not in the baseline has any hit.

Fixing a legacy file lowers its count and the next baseline can be regenerated with --write-baseline. Exit 0 when nothing got worse.
  python3 tools/day1/forbidden_ratchet.py [--write-baseline]"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECK = ROOT / "docs/day1/package/tools/check_forbidden_identifiers.py"
BASE = ROOT / "docs/day1/evidence/forbidden-identifiers-baseline.json"
# exact exclusions (package 4.2): build output, docs, the package tools and tests, and two migrations that carry the prohibited list as data (CR-019)
EXCLUDES = ["dist/", "docs/", "e2e/", "public/", "scripts/", "api/", "tools/",
            "supabase/migrations/20261101000000_day1_field_registry.sql", "supabase/migrations/20261100000000_close_open_access_policies.sql",
            # carries the live t3a_commit_observation unchanged apart from the canonical branch, so it still names ordinal_anchor (CR-003); the scan of it shows those three hits only
            "supabase/migrations/20261127000000_day1_live_writers_canonical.sql",
            # dimension content loads carry authored source text as data ("tiers", "validated" inside scenario prose), not identifiers (CR-082)
            "supabase/migrations/20261205000000_d2_content_registry.sql",
            # carries the closed retired vocabulary of D2 Section 4.2 as data for the prohibited-output check (CR-019 pattern)
            "supabase/migrations/20261210000000_step3_evidence_state.sql",
            # the D3 content load and the D3 demonstration fixtures carry authored source text as data, as the D2 load does (CR-082 pattern)
            # re-emits the prohibited-output scan, whose rule names are the detection vocabulary (the same text the evidence state migration carries)
            "supabase/migrations/20261218000000_d3_shared_machinery.sql",
            "supabase/migrations/20261219000000_d3_content_registry.sql", "supabase/migrations/20261220000000_d3_demonstration_fixtures.sql"]

def scan():
    r = subprocess.run([sys.executable, "-I", str(CHECK), str(ROOT), "--exclude", *EXCLUDES], capture_output=True, text=True)
    by_file, by_rule = {}, {}
    for line in r.stdout.splitlines():
        m = re.match(r"HIT (\S+):\d+ \[(.+?)\] ", line)
        if m:
            by_file.setdefault(m.group(1), {}).setdefault(m.group(2), 0); by_file[m.group(1)][m.group(2)] += 1
            by_rule[m.group(2)] = by_rule.get(m.group(2), 0) + 1
    return by_file, by_rule

def main():
    by_file, by_rule = scan(); total = sum(by_rule.values())
    if "--write-baseline" in sys.argv:
        BASE.write_text(json.dumps({"tool": "check_forbidden_identifiers.py (T3A-DEV-DAY1-001 v1.3) via tools/day1/forbidden_ratchet.py", "excluded": EXCLUDES, "total_hits": total, "by_rule": by_rule, "by_file": by_file}, indent=1))
        print(f"baseline written: {total} hits in {len(by_file)} files"); return 0
    base = json.loads(BASE.read_text())["by_file"]
    worse = []
    for f, rules in by_file.items():
        now, was = sum(rules.values()), sum(base.get(f, {}).values())
        if f not in base: worse.append(f"NEW  {f}: {now} hit(s)")
        elif now > was: worse.append(f"MORE {f}: {was} -> {now}")
    print(f"{total} hits in {len(by_file)} files (baseline {sum(sum(v.values()) for v in base.values())} in {len(base)})")
    for w in worse: print(w)
    print("RESULT FAIL (ratchet)" if worse else "RESULT PASS (no new or increased hits; DT-02 itself still open until the baseline reaches 0)")
    return 1 if worse else 0

if __name__ == "__main__": sys.exit(main())
