#!/usr/bin/env python3
"""Reads the per-dimension vitest JSON runs (run_matrix.sh) and says, for each CORR-007 worked case, on which dimensions its tests passed.

  python3 tools/day1/case_review/analyze.py --runs default=<dir> [--runs sandbox=<dir>] [--unit <vitest json of npm test>] --results <platform_results.json>
        [--manual manual_map.json] [--json out.json]

A case maps to the tests whose full name (describe titles plus test title) names it: `CR-12 T11`, `CR-28-T4`, `T3, T5:`, `T9 + T16:`, or a title that starts `Tn:` in that
rule's own test file. A case no title names, or one the title match gets wrong, takes the tests the manual map lists for it (a reviewer confirmed those by reading the file).
A manual entry is a list of [file, regex], or {"tests": [[file, regex]], "unit": [[file, regex]], "modes": ["sandbox"]}: `unit` names tests of the unit suite, `modes` limits which runs count.
A case counts as run on a dimension only when every test it maps to passed in that dimension's run in every mode counted. Nothing here marks a case PASS in the results file."""
import argparse, glob, json, os, re

def load_dir(d):
    runs = {}
    for f in glob.glob(os.path.join(d, 'D*.json')):
        dim = os.path.basename(f)[:-5]
        r = json.load(open(f)); tests = {}
        for tr in r['testResults']:
            fn = os.path.basename(tr['name'])
            # keyed by position in the file: a run on another dimension swaps dimension names inside test titles, the position does not move
            for i, t in enumerate(tr['assertionResults']):
                tests[(fn, i)] = {'name': ' > '.join(t['ancestorTitles'] + [t['title']]), 'status': t['status'], 'ms': round(t.get('duration') or 0), 'msg': ((t.get('failureMessages') or [''])[0] or '')[:300], 'start': r.get('startTime')}
        runs[dim] = tests
    return runs

def load_unit(f):
    r = json.load(open(f)); tests = {}
    for tr in r['testResults']:
        fn = os.path.basename(tr['name'])
        for i, t in enumerate(tr['assertionResults']):
            tests[(fn, i)] = {'name': ' > '.join(t['ancestorTitles'] + [t['title']]), 'status': t['status'], 'ms': round(t.get('duration') or 0), 'msg': '', 'start': r.get('startTime')}
    return tests

def nums(s):
    return {int(x) for x in re.findall(r'\bT(\d+)\b', s)} | {int(x) for x in re.findall(r'\bT\d+\s*(?:,|\+|and)\s*T?(\d+)', s)}

MULTI = {(4, 5): 'cr04-cr05', (6, 10, 27): 'cr06-cr10-cr27', (18, 19): 'cr18-cr19', (21, 22): 'cr21-cr22', (23, 24): 'cr23-cr24'}

def map_case(case, base):
    nn, m = (int(x) for x in re.match(r'CR-(\d+)-T(\d+)', case).groups())
    out = []
    for (fn, ix), t in base.items():
        full = t['name']
        own = re.match(r'cr0*%d[-.]' % nn, fn) or any(nn in k and fn.startswith(v) for k, v in MULTI.items())
        if not own: continue
        title = full.split(' > ')[-1]
        if re.search(r'CR-0*%d[- ]T%d\b' % (nn, m), full) or re.match(r'T%d\b[:,\s+]' % m, title) or (re.match(r'T\d+(?:\s*,\s*T?\d+|\s*\+\s*T?\d+)+[:\s]', title) and m in nums(title.split(':')[0])):
            out.append((fn, ix, full))
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--runs', action='append', required=True); ap.add_argument('--unit'); ap.add_argument('--results', required=True)
    ap.add_argument('--manual'); ap.add_argument('--json'); a = ap.parse_args()
    modes = {}
    for spec in a.runs:
        k, d = spec.split('=', 1); modes[k] = load_dir(d)
    unit = load_unit(a.unit) if a.unit else {}
    res = json.load(open(a.results)); manual = json.load(open(a.manual)) if a.manual else {}
    dims = sorted(next(iter(modes.values())))
    first = next(iter(modes.values()))
    base = first.get('D1') or next(iter(first.values()))
    table = {}
    for case in res['cases']:
        use_modes = list(modes); how = 'title'; utests = []
        if case in manual:
            spec = manual[case]
            if isinstance(spec, list): spec = {'tests': spec}
            tests = [(fn, ix, base[(fn, ix)]['name']) for fn, rx in spec.get('tests', []) for (f2, ix) in base if f2 == fn and re.search(rx, base[(f2, ix)]['name'])]
            utests = [(fn, ix, unit[(fn, ix)]['name']) for fn, rx in spec.get('unit', []) for (f2, ix) in unit if f2 == fn and re.search(rx, unit[(f2, ix)]['name'])]
            use_modes = [m for m in spec.get('modes', use_modes) if m in modes]; how = 'manual'
        else:
            tests = map_case(case, base)
        per, detail = {}, {}
        for dim in dims:
            st = []; det = []
            for mode in use_modes:
                for fn, ix, _ in tests:
                    t = modes[mode].get(dim, {}).get((fn, ix))
                    st.append(t['status'] if t else None); det.append({'mode': mode, 'file': fn, 'name': t['name'] if t else None, 'status': t['status'] if t else None, 'ms': t['ms'] if t else None, 'msg': t['msg'] if t else 'not in this run', 'start': t['start'] if t else None})
            for fn, ix, _ in utests:
                t = unit.get((fn, ix)); st.append(t['status'] if t else None); det.append({'mode': 'unit', 'file': fn, 'name': t['name'] if t else None, 'status': t['status'] if t else None, 'ms': t['ms'] if t else None, 'msg': '', 'start': t['start'] if t else None})
            per[dim] = 'NO TEST' if not (tests or utests) else ('pass' if st and all(s == 'passed' for s in st) else ('missing' if any(s is None for s in st) else 'FAIL'))
            detail[dim] = det
        table[case] = {'how': how, 'modes': use_modes, 'tests': [f'{fn} :: {full}' for fn, ix, full in tests] + [f'{fn} (unit) :: {full}' for fn, ix, full in utests], 'dims': per, 'detail': detail}
    if a.json: json.dump(table, open(a.json, 'w'), indent=1)
    print('case'.ljust(10) + ' ' + ' '.join(d.ljust(5) for d in dims) + ' tests')
    for c, v in table.items(): print(c.ljust(10) + ' ' + ' '.join(v['dims'][d][:5].ljust(5) for d in dims) + f" {len(v['tests'])} ({v['how']})")

main()
