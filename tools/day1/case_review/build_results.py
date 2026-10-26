#!/usr/bin/env python3
"""Writes the CORR-007 platform results folder from the analysed per-dimension test runs: one record per worked case, made with the package's own record_case.py.

  python3 tools/day1/case_review/build_results.py --table table.json --template platform_results.json --out <results folder> --record-case <record_case.py>
        --build-id ID --commit SHA --platform-version V --executed-by NAME --reviewed-by NAME

Every case row gets: the dimensions on which every test it maps to passed (in every mode counted), the command, the fixture, the times of the tests, a plain description of what the
tests did, and an artifact that names the case and the build and lists each mapped test with its status on each dimension. A case is PASS when it passed on D1 (the dimension the
tests were written for); the dimensions it passed on are the ones it is recorded as run on, so a dimension it failed on is a visible gap in the matrix, not a hidden one."""
import argparse, datetime, json, os, shutil, subprocess, sys, tempfile

def iso(ms):
    return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

def main():
    ap = argparse.ArgumentParser()
    for k in ('table', 'template', 'out', 'record_case', 'build_id', 'commit', 'platform_version', 'executed_by', 'reviewed_by'): ap.add_argument('--' + k.replace('_', '-'), required=True, dest=k)
    a = ap.parse_args()
    table = json.load(open(a.table)); R = json.load(open(a.template))
    os.makedirs(a.out, exist_ok=True)
    R['build'] = {'build_id': a.build_id, 'code_commit': a.commit, 'platform_version': a.platform_version, 'executed_by': a.executed_by, 'reviewed_by': a.reviewed_by, 'synthetic': False}
    json.dump(R, open(os.path.join(a.out, 'platform_results.json'), 'w'), indent=1, ensure_ascii=False)
    tmp = tempfile.mkdtemp()
    unrecorded = []
    for case, row in table.items():
        c = R['cases'][case]
        dims = row['dims']; ok = [d for d, s in dims.items() if s == 'pass']
        if not row['tests']:
            unrecorded.append(case); continue
        base_ok = row.get('baseline', 'D1') in ok
        lines = [f'case {case}', f'build {a.build_id}', f'commit {a.commit}', f"rule {c['rule']}", f"what is run: {c['what_is_run']}", f"expected: {c['expected']}",
                 f"mapping: {row['how']}; modes counted: {', '.join(row['modes'])}", 'mapped tests:'] + [f'  - {t}' for t in row['tests']] + ['', 'results by dimension (a dimension is recorded as run only where every line reads passed):']
        starts, total_ms = [], 0
        for d, det in row['detail'].items():
            lines.append(f'{d}: {dims[d]}')
            for x in det:
                lines.append(f"    [{x['mode']}] {x['status']} {x['ms']}ms :: {x['file']} :: {x['name']}" + (f" :: {x['msg'][:200]!r}" if x['status'] != 'passed' and x['msg'] else ''))
                if x['start'] and d == row.get('baseline', 'D1'): starts.append(x['start']); total_ms += x['ms'] or 0
        art = os.path.join(tmp, f'{case}.evidence.txt'); open(art, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
        t0 = min(starts) if starts else int(datetime.datetime.now().timestamp() * 1000)
        files = sorted({t.split(' :: ')[0].replace(' (unit)', '') for t in row['tests']})
        failed = [d for d in dims if dims[d] not in ('pass', 'not applicable')]
        n = len(row['tests'])
        obs = (f"{n} mapped test(s) in {', '.join(files)} ran on a throwaway Postgres 16 built from the migrations: " + (f"passed on {', '.join(ok)}" if ok else 'passed on no dimension')
               + (f"; not shown on {', '.join(failed)} (" + '; '.join(sorted({(x['msg'] or x['status'])[:90].replace('\n', ' ') for d in failed for x in row['detail'][d] if x['status'] != 'passed'}))[:300] + ')' if failed else '')
               + f". First test: {row['tests'][0].split(' :: ')[-1][:160]}")
        cmd = ('bash tools/day1/case_review/run_matrix.sh (per dimension; SANDBOX=1 for the sandbox state) then tools/day1/case_review/analyze.py; tests: ' + ', '.join(files))
        fixture = f'synthetic participants, mentors and sources made by src/test/db/helpers.ts on a throwaway database built from supabase/migrations at commit {a.commit[:12]}; other dimensions by the textual swap in vitest.db.dim.config.ts'
        outcome = 'PASS' if base_ok else 'FAIL'
        p = subprocess.run([sys.executable, a.record_case, '--results', a.out, '--case', case, '--dimensions', ','.join(ok or list(dims)[:1]), '--command', cmd, '--fixture', fixture,
                            '--started', iso(t0), '--ended', iso(t0 + max(total_ms, 1)), '--observed', obs, '--artifact', art, '--outcome', outcome], capture_output=True, text=True)
        if p.returncode != 0: print('record_case failed for', case, p.stdout, p.stderr); sys.exit(1)
    print('recorded', len(table) - len(unrecorded), 'cases; no mapped test for:', unrecorded)

main()
