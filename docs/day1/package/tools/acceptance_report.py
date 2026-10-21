#!/usr/bin/env python3
"""Check an acceptance results file against tests/acceptance_manifest.json and print the summary.
Usage: python3 tools/acceptance_report.py <results.json> [tests/acceptance_manifest.json]
Rules: every test in the manifest appears exactly once; result is PASS, FAIL or UNRUN;
the results file names a build_id and run_at; PASS and FAIL need their own evidence file, at least
200 bytes, whose SHA 256 matches, that no other test reuses, and that contains both the test id and
the build_id; UNRUN and FAIL need a reason; UNRUN is never counted as PASS.
These rules make evidence specific and traceable. Whether the evidence actually proves the expected
result is still judged by a human reviewer. Exit 0 only when every test is PASS."""
import hashlib, json, os, sys

def main(a):
    if len(a) < 2: print(__doc__); return 2
    res_path = a[1]
    man_path = a[2] if len(a) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tests", "acceptance_manifest.json")
    try: M = json.load(open(man_path)); R = json.load(open(res_path))
    except Exception as x: print(f"PROBLEM unreadable input: {type(x).__name__}"); print("RESULT NOT COMPLETE"); return 1
    if not isinstance(R, dict) or not isinstance(R.get("tests"), list): print("PROBLEM results file has no tests list"); print("RESULT NOT COMPLETE"); return 1
    base = os.path.dirname(os.path.abspath(res_path)); E = []; counts = {"PASS":0,"FAIL":0,"UNRUN":0}
    build = R.get("build_id"); 
    if not build or not isinstance(build, str) or len(build) < 6: E.append("results file: build_id missing or too short")
    if not R.get("run_at"): E.append("results file: run_at missing")
    seen_hash = {}
    want = [t["id"] for t in M["tests"]]
    got = [t.get("id") for t in R.get("tests", [])]
    for i in sorted(set(got)):
        if got.count(i) > 1: E.append(f"{i}: appears more than once")
    for i in want:
        if i not in got: E.append(f"{i}: missing from results"); counts["UNRUN"] += 1
    for i in got:
        if i not in want: E.append(f"{i}: not a test in the manifest")
    for t in R.get("tests", []):
        i, r = t.get("id"), t.get("result")
        if r not in counts: E.append(f"{i}: result must be PASS, FAIL or UNRUN"); continue
        counts[r] += 1
        if r in ("PASS","FAIL"):
            ep = t.get("evidence_path")
            if not ep or not os.path.exists(os.path.join(base, ep)): E.append(f"{i}: evidence file missing")
            else:
                data = open(os.path.join(base, ep), "rb").read(); h = hashlib.sha256(data).hexdigest()
                if h != t.get("evidence_sha256"): E.append(f"{i}: evidence hash mismatch")
                if len(data) < 200: E.append(f"{i}: evidence shorter than 200 bytes")
                if h in seen_hash: E.append(f"{i}: evidence reused from {seen_hash[h]}")
                seen_hash.setdefault(h, i)
                txt = data.decode("utf-8", "ignore")
                if str(i) not in txt: E.append(f"{i}: evidence does not name the test id")
                if build and build not in txt: E.append(f"{i}: evidence does not name the build_id")
        if r in ("UNRUN","FAIL") and not t.get("reason"): E.append(f"{i}: reason required")
    for e in E: print("PROBLEM", e)
    print(f"PASS {counts['PASS']}  FAIL {counts['FAIL']}  UNRUN {counts['UNRUN']}  of {len(want)}")
    ok = not E and counts["PASS"] == len(want)
    print("RESULT", "ALL PASS" if ok else "NOT COMPLETE")
    return 0 if ok else 1

if __name__ == "__main__": sys.exit(main(sys.argv))
