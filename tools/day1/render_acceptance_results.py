#!/usr/bin/env python3
"""Render an acceptance run JSON (tools/nonprod-replay/*acceptance_test.mjs output) as a results page.

  python3 tools/day1/render_acceptance_results.py D3 docs/day1/evidence/d3-acceptance-run.json docs/day1/d3-acceptance-results.md"""
import json, sys
dim, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(src))
ref = {"D2": "d2", "D3": "d3", "D4": "d4"}[dim]
L = [f"# {dim} acceptance results (Section 11)", "",
     f"Run against the throwaway database on 20 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/{ref}-acceptance-run.json`. The run re-reads the labelled results of the {dim} step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.", "",
     f"**{d['pass']} of {d['identifiers_required']} identifiers PASS, {d['fail']} FAIL, {d['not_run']} NOT RUN.** The identifiers not run need the report renderer or a screen, which are the next steps; each states why.", "",
     "| Test | Result | How | Check |", "|---|---|---|---|"]
for r in d["results"]:
    for i, e in enumerate(r["entries"]):
        L.append(f"| {r['id'] if i == 0 else ''} | {e['status'].replace('_', ' ')} | {e['how']} | {e['label']}{(' — ' + str(e['detail'])) if e['status'] == 'NOT_RUN' else ''} |")
L += ["", "## Reading this honestly", "",
      "- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved source, no authorized mentor, no clearance and no consent for this dimension, so no observation can occur there. That is the designed first state.",
      "- Entries marked `evidence` are results of the earlier step files, re-read here; entries marked `run` were run by the acceptance file itself.",
      "- Test identifiers inside the earlier step evidence files are build instruction numbers, not these identifiers (CR-119)."]
open(out, "w").write("\n".join(L) + "\n")
print(out, d["pass"], d["identifiers_required"])
