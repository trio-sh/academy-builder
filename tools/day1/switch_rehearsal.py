#!/usr/bin/env python3
"""CORR-007 CR-31: in the sandbox, turn the five enforcement switches on one at a time, in the stated order, and after each rerun the full test suites on a fresh copy.
lsa_activation is never touched. Production is never touched (this runs only against the throwaway local database).

  python3 tools/day1/switch_rehearsal.py --out docs/day1/evidence/switch-rehearsal.json

Each step rebuilds the throwaway database from the repository migrations, turns on the switches up to and including that step, runs `npm run test:db` and `npm test`,
and records the counts and the names of the failing tests. Needs the same environment as the database tests (T3A_TEST_DB_URL, PGL_SOCK, PGL_PORT).
"""
import argparse, datetime, json, os, re, subprocess

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STEPS = [
    ("canonical_writers", "update public.t3a_event_config set value = 'on', updated_at = now() where key = 'canonical_writers'"),
    ("strict_event_ingest", "update public.t3a_event_config set value = 'strict', updated_at = now() where key = 'ingest_mode'"),
    ("enforce_required", "update public.t3a_capture_config set enforce_required = true, updated_at = now()"),
    ("enforce_sequence", "update public.t3a_capture_config set enforce_sequence = true, updated_at = now()"),
    ("enforce_gate", "update public.t3a_consent_config set enforce_gate = true, updated_at = now()"),
]
STATE = ("select (select value from public.t3a_event_config where key='canonical_writers') as canonical_writers, (select value from public.t3a_event_config where key='ingest_mode') as ingest_mode, "
         "(select enforce_required from public.t3a_capture_config) as enforce_required, (select enforce_sequence from public.t3a_capture_config) as enforce_sequence, "
         "(select enforce_gate from public.t3a_consent_config) as enforce_gate, public.t3a_lsa_flag('lsa_activation') as lsa_activation")


def psql(sql):
    p = subprocess.run(["psql", "-h", os.environ.get("PGL_SOCK", "/tmp/pgl"), "-p", os.environ.get("PGL_PORT", "5433"), "-U", "neondb_owner", "-d", "t3a", "-v", "ON_ERROR_STOP=1", "-qAt", "-F", "|", "-c", sql],
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr[:500])
    return p.stdout.strip()


def sh(cmd, **kw):
    return subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, shell=isinstance(cmd, str), **kw)


def counts(out):
    m = re.search(r"Tests\s+(?:(\d+) failed \| )?(\d+) passed(?: \| (\d+) skipped)? \((\d+)\)", out)
    return {"failed": int(m.group(1) or 0), "passed": int(m.group(2)), "total": int(m.group(4))} if m else None


def run_step(name, switches):
    sh("bash tools/nonprod-replay/local_pg/build.sh")
    for _, sql in switches:
        psql(sql)
    state = psql(STATE).split("|")
    keys = ["canonical_writers", "ingest_mode", "enforce_required", "enforce_sequence", "enforce_gate", "lsa_activation"]
    st = dict(zip(keys, state))
    db = sh("npm run test:db 2>&1")
    unit = sh("npm test 2>&1")
    failing = sorted(set(re.findall(r"^\s*×\s+(.+?)(?:\s+\d+ms)?$", db.stdout, re.M)))
    return {"step": name, "switches_on": [n for n, _ in switches], "state_after_turning_on": st, "database_suite": counts(db.stdout), "unit_suite": counts(unit.stdout), "failing_database_tests": failing[:40]}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True); a = ap.parse_args()
    rec = {"date": datetime.date.today().isoformat(), "method": "fresh throwaway database from the repository migrations for each step; switches cumulative in the stated order; lsa_activation never touched", "steps": []}
    rec["steps"].append(run_step("baseline_all_off", []))
    for i in range(len(STEPS)):
        rec["steps"].append(run_step(STEPS[i][0], STEPS[: i + 1]))
        json.dump(rec, open(a.out, "w"), indent=1)
        print(STEPS[i][0], rec["steps"][-1]["database_suite"], flush=True)
    sh("bash tools/nonprod-replay/local_pg/build.sh")  # leave the throwaway database at the all-off baseline
    json.dump(rec, open(a.out, "w"), indent=1)


main()
