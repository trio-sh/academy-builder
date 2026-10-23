#!/usr/bin/env python3
"""Maps the 104 CORR-007 worked cases to the automated tests that exercise them, and says how sure each mapping is.

  python3 tools/day1/case_map.py <platform_results.json> [--out docs/day1/CORR-007-CASE-MAP.md]

A case is `labelled` when a test title names it (CR-NN-Tm, or a title that starts with Tm: in that rule's own test file). Otherwise it is `by rule`: the rule has a test
file, but no title names this case, so a reviewer must read the file and confirm the case is exercised. Nothing here is a signed result: the independent reviewer runs
the suites, checks each row and signs. This script never marks a case PASS."""
import glob, json, os, re, sys

def titles(path):
    s = open(path, encoding='utf-8', errors='ignore').read()
    return re.findall(r'\b(?:it|test)\(\s*(["`\'])(.+?)\1\s*,', s)

def main():
    res = json.load(open(sys.argv[1], encoding='utf-8'))
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    files = glob.glob('src/test/**/*.ts*', recursive=True) + glob.glob('e2e/*.ts')
    tt = {f: [t for _, t in titles(f)] for f in files}
    rows, lab, rule, none = [], 0, 0, 0
    for c in res['cases']:
        nn, t = re.match(r'CR-(\d+)-T(\d+)', c).groups()
        exact = [(os.path.basename(f), ti) for f, ts in tt.items() for ti in ts if re.search(r'CR-%s-T%s\b' % (nn, t), ti) or (re.search(r'cr0*%s[-.]' % int(nn), os.path.basename(f)) and re.match(r'T%s\b[:\s]' % t, ti))]
        if exact:
            lab += 1; rows.append((c, 'labelled', exact[0][0], exact[0][1][:110]))
        else:
            by_rule = [os.path.basename(f) for f in tt if re.search(r'cr0*%s[-.]' % int(nn), os.path.basename(f))]
            if by_rule:
                rule += 1; rows.append((c, 'by rule', by_rule[0], 'no test title names this case; confirm in the file'))
            else:
                none += 1; rows.append((c, 'NONE', '', 'no test file for this rule'))
    lines = ['# CORR-007 worked cases mapped to automated tests', '',
             f'{len(rows)} cases: {lab} labelled, {rule} by rule (a reviewer confirms), {none} with no test. This is a map, not a signed result: it marks nothing PASS.', '',
             '| Case | Mapping | Test file | Test title |', '|---|---|---|---|']
    lines += [f'| {c} | {m} | {f} | {t.replace("|", "/")} |' for c, m, f, t in rows]
    text = '\n'.join(lines) + '\n'
    if out: open(out, 'w', encoding='utf-8').write(text)
    print(f'{len(rows)} cases: {lab} labelled, {rule} by rule, {none} none')

main()
