#!/usr/bin/env python3
"""Reads the per-dimension vitest JSON runs (run_matrix.sh) and says, for each CORR-007 worked case, on which dimensions its tests passed.

  python3 tools/day1/case_review/analyze.py <runs dir> <platform_results.json> [--manual tools/day1/case_review/manual_map.json] [--json out.json]

A case maps to the tests whose full name (describe titles plus test title) names it: `CR-12 T11`, `CR-28-T4`, `T3, T5:`, `T9 + T16:`, or a title that starts `Tn:` in
that rule's own test file. A case no title names takes the tests the manual map lists for it (the by rule cases, which a reviewer confirmed by reading the file).
A case counts as run on a dimension only when every test it maps to passed in that dimension's run. Nothing here marks a case PASS in the results file."""
import glob, json, os, re, sys

def load_runs(d):
    runs = {}
    for f in glob.glob(os.path.join(d, 'D*.json')):
        dim = os.path.basename(f)[:-5]
        r = json.load(open(f)); tests = {}
        for tr in r['testResults']:
            fn = os.path.basename(tr['name'])
            # keyed by position in the file: a run on another dimension swaps dimension names inside test titles, the position does not move
            for i, t in enumerate(tr['assertionResults']):
                tests[(fn, i)] = (' > '.join(t['ancestorTitles'] + [t['title']]), t['status'])
        runs[dim] = tests
    return runs

def nums(s):
    return {int(x) for x in re.findall(r'\bT(\d+)\b', s)} | {int(x) for x in re.findall(r'\bT\d+\s*(?:,|\+|and)\s*T?(\d+)', s)}

def map_case(case, runs):
    nn, m = (int(x) for x in re.match(r'CR-(\d+)-T(\d+)', case).groups())
    any_run = runs.get('D1') or next(iter(runs.values()))
    out = []
    for (fn, ix), (full, _) in any_run.items():
        if not re.match(r'cr0*%d[-.]' % nn, fn) and not (nn in (4, 5) and fn.startswith('cr04-cr05')) and not (nn in (6, 10, 27) and fn.startswith('cr06-cr10-cr27')) and not (nn in (18, 19) and fn.startswith('cr18-cr19')) and not (nn in (21, 22) and fn.startswith('cr21-cr22')) and not (nn in (23, 24) and fn.startswith('cr23-cr24')):
            continue
        title = full.split(' > ')[-1]
        if re.search(r'CR-0*%d[- ]T%d\b' % (nn, m), full) or re.match(r'T%d\b[:,\s+]' % m, title) or re.match(r'T\d+(?:\s*,\s*T?\d+|\s*\+\s*T?\d+)+[:\s]', title) and m in nums(title.split(':')[0]):
            out.append((fn, ix, full))
    return out

def main():
    runs = load_runs(sys.argv[1]); res = json.load(open(sys.argv[2]))
    manual = json.load(open(sys.argv[sys.argv.index('--manual') + 1])) if '--manual' in sys.argv else {}
    table = {}
    for case in res['cases']:
        tests = map_case(case, runs); how = 'title'
        if case in manual:
            base = runs.get('D1') or next(iter(runs.values()))
            tests = [(fn, ix, full) for (fn, rx) in manual[case] for (f2, ix), (full, _) in base.items() if f2 == fn and re.search(rx, full)]
            how = 'manual'
        per = {}
        for dim, t in runs.items():
            st = [(t.get((fn, ix)) or (None, None))[1] for fn, ix, _ in tests]
            per[dim] = 'NO TEST' if not tests else ('pass' if all(s == 'passed' for s in st) else ('missing' if any(s is None for s in st) else 'FAIL'))
        table[case] = {'how': how, 'tests': [f'{fn} :: {full}' for fn, ix, full in tests], 'dims': per}
    if '--json' in sys.argv: json.dump(table, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
    dims = sorted(runs)
    print('case'.ljust(10) + ' ' + ' '.join(d.ljust(5) for d in dims) + ' tests')
    for c, v in table.items(): print(c.ljust(10) + ' ' + ' '.join(v['dims'][d][:5].ljust(5) for d in dims) + f" {len(v['tests'])} ({v['how']})")
main()
