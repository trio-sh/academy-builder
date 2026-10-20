#!/usr/bin/env python3
"""Step 3l: seed the four D2 demonstration fixtures (Section 10.1 to 10.4 of the D2 Execution Edition) as content, exactly as written.

  python3 tools/day1/build_d2_demo_fixtures_migration.py <Execution-Edition.md> <out.sql>

Each fixture is loaded as a source object that is NOT servable: drafting, not_loaded, serving_eligible false, demonstration true, and no approval record. The two drafting-test rows are seeded
with the demonstration reviewer identity (the only case the instrument allows) against a demonstration author identity. No name clearance record and no rights record is created: the sheet's
own CLEARED claim is a claim, not a clearance. No participant, mentor or other account is created by this migration."""
import hashlib, json, re, sys
from pathlib import Path

md = Path(sys.argv[1]).read_text()
out = sys.argv[2]
start = md.index("#### 10.1 DEMO-D2-S1-001")
end = md.index("### 11 Acceptance tests")
text = md[start:end]
parts = re.split(r"\n(?=#### 10\.\d DEMO-D2-)", text)
assert len(parts) == 4, len(parts)

def lit(s):
    return "'" + str(s).replace("'", "''") + "'"

def table(lines):
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines if l.strip().startswith("|")]
    rows = [r for r in rows if not all(re.fullmatch(r":?-{2,}:?", c) for c in r)]
    return rows

def parse(part):
    head, _, rest = part.partition("\n")
    m = re.match(r"#### 10\.(\d) (DEMO-D2-S\d-001) . (.+)", head)
    n, ident, title = m.group(1), m.group(2), m.group(3).strip()
    lines = rest.split("\n")
    # blocks keyed by bold label lines; the header table comes first
    blocks, cur, label = {}, [], "_header"
    for l in lines:
        mm = re.match(r"\*\*(.+?)\*\*(.*)$", l)
        if mm and not l.startswith("- "):
            blocks[label] = "\n".join(cur).strip("\n"); label = mm.group(1).rstrip("."); cur = [mm.group(2).strip()] if mm.group(2).strip() else []
        else:
            cur.append(l)
    blocks[label] = "\n".join(cur).strip("\n")
    hdr = {r[0]: r[1] for r in table(blocks["_header"].split("\n"))[1:]}
    sheet, key = {}, None
    for l in blocks["Source sheet"].split("\n"):
        mm = re.match(r"- ([a-z_0-9]+): ?(.*)$", l)
        if mm: key = mm.group(1); sheet[key] = mm.group(2).strip()
        elif l.strip().startswith("-") and key: sheet[key] = (sheet[key] + "; " if sheet[key] else "") + l.strip().lstrip("- ").strip()
    app = [{"question": r[0], "state": r[1], "basis": r[2]} for r in table(blocks["Question applicability"].split("\n"))[1:]]
    script = [{"beat": r[0], "type": r[1], "verbatim_text": r[2], "capture": r[3]} for r in table(blocks["Script"].split("\n"))[1:]] if "Script" in blocks else None
    quotes = {k: "\n".join(x.lstrip("> ").rstrip() if x.startswith(">") else x for x in v.split("\n") if x.startswith(">")).replace("\n\n", "\n").strip() for k, v in blocks.items() if ">" in v}
    reveals = re.findall(r"^- (R\d+) . (.+)$", blocks.get("Reveal sequence", ""), re.M)
    return n, ident, title, hdr, blocks, sheet, app, script, quotes, reveals

stmts = []
for p in parts:
    n, ident, title, hdr, blocks, sheet, app, script, quotes, reveals = parse(p)
    assert len(app) == 15, (ident, len(app))
    assert hdr["Identifier"] == ident and hdr["demonstration"] == "true"
    stage_code = "S" + hdr["Stage"]
    body = {"source_identifier": ident, "title": title, "stage": int(hdr["Stage"]), "stage_code": stage_code, "demonstration": True, "serving_eligible": False,
            "scenario_class": hdr["scenario_class"], "d2_situation_class": hdr["d2_situation_class"], "interaction_pattern_family_id": hdr["interaction_pattern_family_id"],
            "administration_form_id": hdr["administration_form_id"], "name_clearance_claim": hdr["name_clearance_status"], "compatibility_class": sheet.get("compatibility_class"),
            "source_sheet": {**sheet, "d2_situation_class": hdr["d2_situation_class"]}, "question_applicability": app, "script": script, "reveals": [{"id": a, "text": b} for a, b in reveals],
            "text_blocks": quotes, "narrative": {k: v for k, v in blocks.items() if k not in ("_header", "Source sheet", "Question applicability", "Script")}}
    canon = json.dumps(body, sort_keys=True, ensure_ascii=False)
    body["source_version_hash"] = hashlib.sha256(canon.encode()).hexdigest()
    stmts.append(f"insert into public.t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ({lit(ident)}, 'source'::public.t3a_content_family, {lit(title)}, 'D2', 'not_loaded'::public.t3a_operational_state) on conflict do nothing;")
    stmts.append(f"insert into public.t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v2.1', 'drafting', 'not_loaded'::public.t3a_operational_state, {lit(json.dumps(body, ensure_ascii=False))}::jsonb from public.t3a_content_object where identifier = {lit(ident)} and not exists (select 1 from public.t3a_d1_content_version v where v.content_object_id = t3a_content_object.content_object_id);")
    stmts.append(f"insert into public.t3a_source_authorship(source_version_id, source_author_identity) select v.content_version_id, array['DEMONSTRATION_AUTHOR'] from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier = {lit(ident)} on conflict do nothing;")
    for t in (1, 2):
        stmts.append(f"insert into public.t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) select v.content_version_id, {t}, 'demonstration_only', 'DEMONSTRATION_REVIEWER', current_date, v.version_no from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier = {lit(ident)} on conflict do nothing;")

header = """-- Step 3l: the four D2 demonstration fixtures (D2 Execution Edition Section 10.1 to 10.4), seeded as written. Generated by tools/day1/build_d2_demo_fixtures_migration.py. Do not edit by hand.
-- Each is a source object that is not servable: drafting, not_loaded, serving_eligible false, demonstration true, no approval record, no name clearance record, no rights record.
-- The drafting test rows hold the demonstration reviewer identity against a demonstration author identity. No account of any kind is created here.

"""
Path(out).write_text(header + "\n".join(stmts) + "\n")
print(f"{len(parts)} fixtures, {len(stmts)} statements")
