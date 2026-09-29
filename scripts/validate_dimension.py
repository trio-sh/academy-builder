#!/usr/bin/env python3
"""
T3A dimension script validator  --  reference implementation for T3A-SOP-002.

Usage:   python3 validate_dimension.py <execution_edition.md>
Exit 0:  zero errors. The script may be issued.
Exit 1:  one or more errors. The script must NOT be issued.

It reads the dimension's own capture register and question register from the
document, so it is not tied to any one dimension. Every check maps to a rule
in T3A-SOP-002, cited in square brackets in each message.
"""
import re, sys
from collections import OrderedDict

ERR = []
def err(rule, where, msg): ERR.append(f"[{rule}] {where}: {msg}")

SRC_HEAD = re.compile(r'^#### (SRC-D(\d+)-S([1-4])-(\d{3})) — (\S.*)$')
FIELD    = re.compile(r'^- `([a-z0-9_]+)` — (.*)$')
BEAT     = re.compile(r'^- \*\*B([1-7])\*\* (SAY|PAUSE|ASK|ROUND) \| Spoken: (.*?) \| Direction: (.*?) \| Capture: (.*)$')
REVEAL   = re.compile(r'^- \*\*R(\d+)\*\* (.*?) \| Role: (.*)$')
LEADING_CODE = re.compile(r'^(?:- \*\*[BR]\d+\*\*|\| *[BR]\d+ *\|)')
SET_HEAD = re.compile(r'^\*\*(C\d+[a-z]?\d*) — (\S.*)\*\*$')

STAGE_VOCAB = {'2': {'SAY','PAUSE','ASK'}, '4': {'SAY','PAUSE','ASK','ROUND'}}
QUALIFIERS  = {'update','final'}
# British spellings the build's vocabulary lock rejects; unambiguous forms only [AS-52]
BRITISH = ['behaviour','behaviours','colour','organisation','organisations','organise','organised',
  'recognise','recognised','realise','realised','analyse','analysed','centre','centres','favour',
  'honour','labour','programme','programmes','catalogue','judgement','licence','defence','offence',
  'travelled','cancelled','modelling','labelled','fulfil','enrol','whilst','amongst','apologise',
  'prioritise','prioritised','summarise','minimise','maximise','emphasise','customise','authorise',
  'authorised','criticise','finalise','finalised','utilise','standardise','optimise','specialise',
  'cheque','grey','tyre','sceptical','practise','practised','acknowledgement']
# Retired terms with no legitimate scenario use [AS-53]. Context-dependent terms are a manual gate item.
RETIRED = [r'\bunder pressure\b', r'\bskill passport\b', r'\bthird layer\b', r'\breadiness indicator\b',
  r'\btrait label\b', r'\bcoverage meter\b', r'\bprogress percentage\b']
APPLIC      = {'DIRECT','CONDITIONAL','NOT SERVED'}

REQUIRED_BLOCKS = {
 '1': ['The situation, as the participant meets it','Reveal sequence','Question applicability','Source sheet'],
 '2': ['MENTOR BRIEF','PARTICIPANT PRE-BRIEF','The script','Question applicability','Source sheet'],
 '3': ['The brief, in summary','Question applicability','Source sheet'],
 '4': ['MENTOR BRIEF','PARTICIPANT PRE-BRIEF','CO-PARTICIPANT POSITIONS','The script','Question applicability','Source sheet'],
}
# Fields every source carries. {N} is the dimension number.
FIELDS_ALL = ['d{N}_situation_class','workplace_demand','relevant_conduct','irrelevant_conduct',
  'information_made_available','material_items','assertion_reference_set','information_withheld',
  'attribution_support_set','available_routes','other_route_classification','route_observation_basis',
  'enquiry_point','account_test_point','post_test_account_opportunity','accountable_actor_available',
  'time_reference_called_for','bearing_interest','stated_standard','stated_standard_source_quote_or_location',
  'cross_context_map','serving_eligible','recurrence_eligible','replacement_required',
  'name_clearance_status','sensitivity_flag']
FIELDS_LIVE = ['min_seconds','max_seconds']          # Stages 1, 2 and 4
FIELDS_S3   = ['ai_use','submission_window_days']     # Stage 3 only
LIST_FIELDS = {'material_items':'M','assertion_reference_set':'A','attribution_support_set':'AS','available_routes':'R-'}

def main(path):
    L = open(path, encoding='utf-8').read().split('\n')

    # ---------- headings hygiene [AS-51] ----------
    for i,l in enumerate(L,1):
        if re.match(r'^#{1,6} ', l) and ('**' in l or l.rstrip().endswith('.')):
            err('AS-51', f'line {i}', 'heading contains emphasis or ends with a full stop; a sentence is not a heading')

    # ---------- capture register, read from the document [AS-18] ----------
    register = OrderedDict()
    for i,l in enumerate(L,1):
        m = SET_HEAD.match(l.strip())
        if m: register[m.group(1)] = i
    if not register:
        err('AS-18','document','no capture sets found; expected lines of the form **C1 — Title**')

    # set classification table [AS-22, AS-23]
    classified = {}
    for l in L:
        m = re.match(r'^\| *(C\d+[a-z]?\d*) *\| *(content|first-occurrence) *\| *(.*?) *\|$', l)
        if m: classified[m.group(1)] = (m.group(2), m.group(3))
    for c in register:
        if c not in classified:
            err('AS-22','capture register', f'{c} is not classified content or first-occurrence')

    # ---------- question register [AS-26] ----------
    questions = OrderedDict()
    for l in L:
        m = re.match(r'^\| *(Q-D\d+-\d+[a-z]?\d?) *\| *(CE-\d+) *\| *(C\d+[a-z]?\d*) *\|', l)
        if m: questions[m.group(1)] = m.group(3)
    for q,c in questions.items():
        if c not in register:
            err('AS-18','question register', f'{q} uses {c}, which is not in the capture register')

    # ---------- sources ----------
    heads = [(i, SRC_HEAD.match(l)) for i,l in enumerate(L) if SRC_HEAD.match(l)]
    if not heads: err('AS-06','document','no source headings found'); return report()
    dims = {m.group(2) for _,m in heads}
    if len(dims) != 1: err('AS-06','document', f'sources span more than one dimension: {sorted(dims)}')
    N = heads[0][1].group(2)
    seen = set(); lastnum = {}
    for k,(i,m) in enumerate(heads):
        sid, st, num = m.group(1), m.group(3), int(m.group(4))
        if sid in seen: err('AS-06', sid, 'duplicate source heading')
        seen.add(sid)
        if st in lastnum and num != lastnum[st] + 1:
            err('AS-06', sid, f'Stage {st} numbering jumps from {lastnum[st]:03d} to {num:03d}')
        lastnum[st] = num
        end = heads[k+1][0] if k+1 < len(heads) else len(L)
        check_source(sid, N, st, L[i+1:end], register, questions)

    # ---------- field syntax only inside source sheets [AS-07] ----------
    inside = set()
    for k,(i,m) in enumerate(heads):
        end = heads[k+1][0] if k+1 < len(heads) else len(L)
        for j in range(i, end): inside.add(j)
    for j,l in enumerate(L):
        if FIELD.match(l) and j not in inside:
            err('AS-07', f'line {j+1}', 'field-list syntax outside a source block; definitions must be prose')
    return report()

def blocks_of(body):
    """Return ordered {label: [lines]} for bold-label blocks inside one source."""
    out = OrderedDict(); cur = None
    for l in body:
        m = re.match(r'^\*\*([^*]+)\*\*$', l.strip())
        if m:
            cur = m.group(1).split(' — ')[0].strip()
            out.setdefault(cur, []); continue
        if cur: out[cur].append(l)
    return out

def check_source(sid, N, st, body, register, questions):
    # soft wrap: a structured line continued on an indented line [AS-04]
    for j,l in enumerate(body):
        if re.match(r'^ {2,}\S', l) and j > 0 and (body[j-1].startswith('- ') or body[j-1].startswith('  ')):
            err('AS-04', sid, f'wrapped continuation line: "{l.strip()[:50]}"'); break

    text = '\n'.join(body)
    for w in BRITISH:
        for mm in re.finditer(r'\b' + w + r'\b', text, re.I):
            err('AS-52', sid, f'British spelling "{mm.group(0)}"; the build\'s vocabulary lock rejects it'); break
    for rx in RETIRED:
        mm = re.search(rx, text, re.I)
        if mm: err('AS-53', sid, f'retired term "{mm.group(0)}"')

    b = blocks_of(body)
    names = list(b.keys())
    for req in REQUIRED_BLOCKS[st]:
        if req not in names: err('AS-06', sid, f'missing block "{req}"')
    if 'The script' in names and 'Question applicability' in names:
        if names.index('The script') > names.index('Question applicability'):
            err('AS-06', sid, '"The script" must come before "Question applicability"')

    # field syntax is allowed ONLY inside the Source sheet block [AS-07]
    for lab, lines in b.items():
        if lab == 'Source sheet': continue
        for l in lines:
            if FIELD.match(l):
                err('AS-07', sid, f'field-list syntax in "{lab}", outside the Source sheet: "{l.strip()[:45]}"'); break

    # beat codes leading a line outside the script / reveal block [AS-08]
    for lab, lines in b.items():
        if lab in ('The script','Reveal sequence'): continue
        for l in lines:
            if LEADING_CODE.match(l.strip()):
                err('AS-08', sid, f'beat code leads a line in "{lab}": "{l.strip()[:40]}"')

    # ---------- source sheet ----------
    sheet = OrderedDict()
    for l in b.get('Source sheet', []):
        if not l.strip(): continue
        m = FIELD.match(l)
        if not m: err('AS-04', sid, f'non-field line in Source sheet: "{l.strip()[:50]}"'); continue
        f, v = m.group(1), m.group(2).strip()
        if f in sheet: err('AS-09', sid, f'field {f} appears twice')
        sheet[f] = v
    allf = [x.replace('{N}', N) for x in FIELDS_ALL]
    need = allf + (FIELDS_LIVE if st in '124' else FIELDS_S3)
    for f in need:
        if f not in sheet: err('AS-09', sid, f'missing field {f}')
    known = set(need) | set(sheet)
    for f, v in sheet.items():
        for other in known:
            if other != f and re.search(r'[a-z.)]' + re.escape(other) + r'\b', v):
                err('AS-04', sid, f'field name {other} runs into the value of {f}')
    sc = sheet.get(f'd{N}_situation_class', '')
    if sc and not re.match(r'^S-\d+(?: with S-\d+)?$', sc):
        err('AS-09', sid, f'd{N}_situation_class must read S-n or "S-n with S-m", found "{sc[:30]}"')
    for f, pfx in LIST_FIELDS.items():
        v = sheet.get(f)
        if v is None or v in ('None', 'null') or v.startswith('Empty.'): continue
        ids = re.findall(r'(?<![A-Za-z-])' + re.escape(pfx) + r'([a-z0-9]+)\b', v)
        if not ids: err('AS-05', sid, f'{f} has items but no {pfx} identifiers'); continue
        seq = [x for x in ids]
        expected = ([chr(ord('a')+i) for i in range(len(seq))] if pfx == 'R-' else [str(i+1) for i in range(len(seq))])
        if seq != expected: err('AS-05', sid, f'{f} identifiers not sequential: {seq}')
        if not v.rstrip().endswith('.'): err('AS-05', sid, f'{f} does not end with a full stop; possible truncation')

    # ---------- script, Stages 2 and 4 ----------
    if st in '24':
        beats = [BEAT.match(l.strip()) for l in b.get('The script', []) if l.strip()]
        rows = [x for x in beats if x]
        bad  = [l for l in b.get('The script', []) if l.strip() and not BEAT.match(l.strip())]
        for l in bad: err('AS-14', sid, f'script line not in canonical form: "{l.strip()[:50]}"')
        codes = [int(x.group(1)) for x in rows]
        if codes != [1,2,3,4,5,6,7]: err('AS-16', sid, f'script beats {codes}; expected B1 to B7 in order')
        for x in rows:
            beat, act, spoken, direction, cap = x.group(1), x.group(2), x.group(3), x.group(4), x.group(5)
            if act not in STAGE_VOCAB[st]: err('AS-15', sid, f'B{beat} action {act} not in the Stage {st} vocabulary')
            if st == '4' and beat == '2' and act != 'ROUND': err('AS-15', sid, 'Stage 4 B2 must be ROUND')
            # a capture label from the register must never be spoken; ordinary words such as
            # "update" or "final" are legitimate speech and are allowed [AS-17]
            for lab in register:
                if re.search(r'\b' + re.escape(lab) + r'\b', spoken):
                    err('AS-17', sid, f'B{beat} spoken text contains capture label {lab}'); break
            if cap.strip() != '—':
                for part in [p.strip() for p in cap.split(',')]:
                    pm = re.match(r'^(C\d+[a-z]?\d*)(?: (\w+))?$', part)
                    if not pm: err('AS-18', sid, f'B{beat} capture "{part}" not in canonical form'); continue
                    lab, q = pm.group(1), pm.group(2)
                    if lab not in register: err('AS-18', sid, f'B{beat} binds {lab}, not in the capture register')
                    if q and q not in QUALIFIERS: err('AS-19', sid, f'B{beat} qualifier "{q}" is not none, update or final')

    # ---------- reveal sequence, Stage 1 ----------
    if st == '1':
        rows = [REVEAL.match(l.strip()) for l in b.get('Reveal sequence', []) if l.strip()]
        if not rows or not all(rows): err('AS-14', sid, 'reveal lines must read: - **Rn** <text> | Role: <role>')
        else:
            n = [int(x.group(1)) for x in rows]
            if n != list(range(1, len(n)+1)): err('AS-16', sid, f'reveals {n} not sequential from R1')
            declared = sheet.get('reveal_count')
            if declared and declared.isdigit() and int(declared) != len(n):
                err('AS-16', sid, f'reveal_count {declared} but {len(n)} reveals found')

    # ---------- applicability ----------
    rows = {}
    for l in b.get('Question applicability', []):
        m = re.match(r'^\| *(Q-D\d+-\d+[a-z]?\d?) *\| *(DIRECT|CONDITIONAL|NOT SERVED) *\| *(.+?) *\|$', l.strip())
        if m: rows[m.group(1)] = m.group(2)
        elif re.match(r'^\| *Q-', l.strip()):
            err('AS-28', sid, f'applicability row not canonical: "{l.strip()[:50]}"')
    for q in questions:
        if q not in rows: err('AS-28', sid, f'no applicability status for {q}')

def report():
    if ERR:
        print(f"FAIL — {len(ERR)} error(s). Do not issue.\n")
        for e in ERR: print(' ', e)
        return 1
    print("PASS — zero errors. The script may be issued.")
    return 0

if __name__ == '__main__':
    if len(sys.argv) != 2: print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1]))
