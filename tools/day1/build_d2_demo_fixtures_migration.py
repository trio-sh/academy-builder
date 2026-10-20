#!/usr/bin/env python3
"""Step 3l: seed the four D2 demonstration fixtures (Section 10.1 to 10.4 of the D2 Execution Edition) as content, exactly as written.

  python3 tools/day1/build_d2_demo_fixtures_migration.py <Execution-Edition.md> <out.sql> [D2|D3]

Each fixture is loaded as a source object that is NOT servable: drafting, not_loaded, serving_eligible false, demonstration true, and no approval record. The two drafting-test rows are seeded
with the demonstration reviewer identity (the only case the instrument allows) against a demonstration author identity. No name clearance record and no rights record is created: the sheet's
own CLEARED claim is a claim, not a clearance. No participant, mentor or other account is created by this migration."""
import hashlib, json, re, sys
from pathlib import Path

md = Path(sys.argv[1]).read_text()
out = sys.argv[2]
DIM = sys.argv[3] if len(sys.argv) > 3 else "D2"
start = md.index(f"#### 10.1 DEMO-{DIM}-S1-001")
end = md.index("### 11 Acceptance tests")
text = md[start:end]
parts = re.split(r"\n(?=#### 10\.\d DEMO-" + DIM + "-)", text)
assert len(parts) == 4, len(parts)

def lit(s):
    return "'" + str(s).replace("'", "''") + "'"

def table(lines):
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines if l.strip().startswith("|")]
    rows = [r for r in rows if not all(re.fullmatch(r":?-{2,}:?", c) for c in r)]
    return rows

def parse(part):
    head, _, rest = part.partition("\n")
    m = re.match(r"#### 10\.(\d) (DEMO-" + DIM + r"-S\d-001) . (.+)", head)
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
    if "Stage" not in hdr:
        # compact header (D4 edition): "Identifier | DEMO-D4-S1-001 · Stage 1 · SC-D4-1 · IPF-D4-01 · AF-S1-SEQUENTIAL-REVEAL" and "scenario_class | observation_ready · demonstration true · name_clearance_status CLEARED"
        ident_parts = [x.strip() for x in hdr["Identifier"].split("·")]
        hdr = {"Identifier": ident_parts[0], "Stage": ident_parts[1].replace("Stage", "").strip(), DIM.lower() + "_situation_class": ident_parts[2],
               "interaction_pattern_family_id": ident_parts[3], "administration_form_id": ident_parts[4]}
        sc_parts = [x.strip() for x in table(blocks["_header"].split("\n"))[2][1].split("·")]
        hdr["scenario_class"] = sc_parts[0]; hdr["demonstration"] = "true" if "demonstration true" in sc_parts[1] else "false"
        hdr["name_clearance_status"] = sc_parts[2].replace("name_clearance_status", "").strip()
    sheet, key = {}, None
    sheet_src = blocks.get("Source sheet") or blocks.get("Source sheet.") or ""
    for l in sheet_src.split("\n"):
        mm = re.match(r"- ([a-z_0-9]+): ?(.*)$", l)
        if mm: key = mm.group(1); sheet[key] = mm.group(2).strip()
        elif l.strip().startswith("-") and key: sheet[key] = (sheet[key] + "; " if sheet[key] else "") + l.strip().lstrip("- ").strip()
    # a row may name two questions ("Q-D3-06a and Q-D3-06b"); each question gets its own entry carrying the same state and basis
    app_src = blocks.get("Question applicability") or next(v for v in blocks.values() if "| Question | State | Basis |" in v)
    app_lines = [l for l in app_src.split("\n") if l.strip().startswith("|")]
    app = [{"question": q.strip(), "state": r[1], "basis": r[2]} for r in table(app_lines)[1:] for q in r[0].split(" and ")]
    if not sheet: sheet = {"source_sheet_text": "\n".join(l for l in sheet_src.split("\n") if not l.strip().startswith("|")).strip()}
    script = [{"beat": r[0], "type": r[1], "verbatim_text": r[2], "capture": r[3] if len(r) > 3 else None} for r in table(blocks["Script"].split("\n"))[1:]] if "Script" in blocks and any(l.strip().startswith("|") for l in blocks["Script"].split("\n")) else None
    quotes = {k: "\n".join(x.lstrip("> ").rstrip() if x.startswith(">") else x for x in v.split("\n") if x.startswith(">")).replace("\n\n", "\n").strip() for k, v in blocks.items() if ">" in v}
    reveals = re.findall(r"^- (R\d+) . (.+)$", blocks.get("Reveal sequence", ""), re.M)
    return n, ident, title, hdr, blocks, sheet, app, script, quotes, reveals

stmts = []
for p in parts:
    n, ident, title, hdr, blocks, sheet, app, script, quotes, reveals = parse(p)
    assert len(app) == {"D2": 15, "D3": 16, "D4": 15}[DIM], (ident, len(app))
    assert hdr["Identifier"] == ident and hdr["demonstration"] == "true"
    stage_code = "S" + hdr["Stage"]
    body = {"source_identifier": ident, "title": title, "stage": int(hdr["Stage"]), "stage_code": stage_code, "demonstration": True, "serving_eligible": False,
            "scenario_class": hdr["scenario_class"], DIM.lower() + "_situation_class": hdr[DIM.lower() + "_situation_class"], "interaction_pattern_family_id": hdr["interaction_pattern_family_id"],
            "administration_form_id": hdr["administration_form_id"], "name_clearance_claim": hdr["name_clearance_status"], "compatibility_class": sheet.get("compatibility_class"),
            "source_sheet": {**sheet, DIM.lower() + "_situation_class": hdr[DIM.lower() + "_situation_class"]}, "question_applicability": app, "script": script, "reveals": [{"id": a, "text": b} for a, b in reveals],
            "text_blocks": quotes, "narrative": {k: v for k, v in blocks.items() if k not in ("_header", "Source sheet", "Question applicability", "Script")}}
    canon = json.dumps(body, sort_keys=True, ensure_ascii=False)
    body["source_version_hash"] = hashlib.sha256(canon.encode()).hexdigest()
    stmts.append(f"insert into public.t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ({lit(ident)}, 'source'::public.t3a_content_family, {lit(title)}, '{DIM}', 'not_loaded'::public.t3a_operational_state) on conflict do nothing;")
    stmts.append(f"insert into public.t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v2.1', 'drafting', 'not_loaded'::public.t3a_operational_state, {lit(json.dumps(body, ensure_ascii=False))}::jsonb from public.t3a_content_object where identifier = {lit(ident)} and not exists (select 1 from public.t3a_d1_content_version v where v.content_object_id = t3a_content_object.content_object_id);")
    stmts.append(f"insert into public.t3a_source_authorship(source_version_id, source_author_identity) select v.content_version_id, array['DEMONSTRATION_AUTHOR'] from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier = {lit(ident)} on conflict do nothing;")
    for t in (1, 2):
        stmts.append(f"insert into public.t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) select v.content_version_id, {t}, 'demonstration_only', 'DEMONSTRATION_REVIEWER', current_date, v.version_no from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier = {lit(ident)} on conflict do nothing;")

header = f"""-- Step 3l: the four {DIM} demonstration fixtures ({DIM} Execution Edition Section 10.1 to 10.4), seeded as written. Generated by tools/day1/build_d2_demo_fixtures_migration.py. Do not edit by hand.
-- Each is a source object that is not servable: drafting, not_loaded, serving_eligible false, demonstration true, no approval record, no name clearance record, no rights record.
-- The drafting test rows hold the demonstration reviewer identity against a demonstration author identity. No account of any kind is created here.

"""
Path(out).write_text(header + "\n".join(stmts) + "\n")
print(f"{len(parts)} fixtures, {len(stmts)} statements")
