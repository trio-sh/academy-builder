#!/usr/bin/env python3
"""Load the five D5 sources that the counterpart rule (D5-69, conflict register CR-232) refused at load, with one bound family item of each reworded (CR-310 to CR-315).

  python3 tools/day1/build_d5_five_sources_migration.py <T3A-D5-Observation-Pathway-Build-Package-v2_0.json> <out.sql>

The migrations 20270201 to 20270205 and 20270230 are applied to the live project and are not edited. This file generates ONE new migration (20270240000000) that loads exactly the five
sources through the same load path as the other 28 (a `t3a_d1_content_version` insert under the unchanged counterpart load guard, then a `t3a_d1_content_load_event`), so the guard runs
and now passes. Nothing here approves, activates or serves a source: versions are drafting, sources are not_loaded, serving_eligible is false.

How a body is built is the way tools/day1/build_dimension_content_migration.py builds it (section 6, sources): the package source, plus source_identifier, stage_code, source_version_hash
(= source_digest), serving_eligible false and verbatim. Before the rewording is applied the generator rebuilds that body and requires it to equal, key for key, the body that the applied
20270202 migration carries for the same source (the refused insert), so the five differ from the package by the stated words and nothing else.

Hash. source_digest in the package is sha256 over the source's own section text of the Execution Edition (build_json.py: the lines of the section, each right-stripped, joined, stripped).
The generator re-derives the package digest from `sections` and requires it to equal source_digest (it does for all five), applies the one reworded phrase to the section text (the phrase occurs
exactly once in each section) and takes sha256 of the result the same way. That is the new source_digest and source_version_hash. The package digest is kept beside it as
rewording.package_source_digest. The five hashes therefore differ from the package, by the reworded words only, and nobody has to take that on trust: the arithmetic is the package's own."""
import hashlib, json, re, sys
from pathlib import Path

pkg_path, out_path = sys.argv[1], sys.argv[2]
REPO = Path(__file__).resolve().parents[2]
APPLIED = REPO / "supabase/migrations/20270202000000_d5_content_registry.sql"
pkg = json.load(open(pkg_path))
DIM = "D5"
REF = f"{pkg['package']['identifier']} v{pkg['package']['version']}"
STG = {"1": "S1", "2": "S2", "3": "S3", "4": "S4"}

# source id: (family, item id, before, after, register row). Minimum words changed: the counterpart role label stops being the subject of a verb; the meaning and the place in the family stay.
REWORD = {
    "SRC-D5-S2-009": ("designated_positions", "DP2", "the two managers are asked to settle it before the board", "the matter is put to the two managers to settle before the board", "CR-310"),
    "SRC-D5-S3-001": ("available_options", "AO4", "both leads take the decision to the vice-president jointly", "the decision goes jointly from both leads to the vice-president", "CR-311"),
    "SRC-D5-S3-007": ("available_options", "AO4", "the people function asked to advise on the arrangement", "advice on the arrangement asked of the people function", "CR-312"),
    "SRC-D5-S4-004": ("available_options", "AO4", "the chair takes the decision", "the decision is taken by the chair", "CR-313"),
    "SRC-D5-S4-010": ("available_options", "AO4", "the lead decides", "the decision is taken by the lead", "CR-314"),
}

def lit(s):
    return "'" + str(s).replace("'", "''") + "'" if s is not None else "null"

def sha(t):
    return hashlib.sha256(t.encode()).hexdigest()

def digest_of(section_text):
    return sha("\n".join(y.rstrip() for y in section_text.split("\n")).strip())

sections = {}
for s in pkg["sections"]:
    m = re.match(r"^(SRC-D5-S([1-4])-\d{3}) — (.+)$", s["title"])
    if m: sections[m.group(1)] = s["text"]

def package_body(sid):
    s = pkg["sources"][sid]
    body = dict(s); body["source_identifier"] = sid; body["stage_code"] = STG[str(s["stage"])]; body["source_version_hash"] = s["source_digest"]; body["serving_eligible"] = False
    body["verbatim"] = s.get("situation", "")
    return body

def applied_body(sid):
    """The body the applied 20270202 migration offers for this source (the insert the counterpart load guard refused)."""
    for line in APPLIED.read_text(encoding="utf-8").split("\n"):
        if f"identifier = '{sid}' and family" in line and "t3a_d1_content_version" in line:
            m = re.search(r"'v2\.0', 'drafting', 'not_loaded'::public\.t3a_operational_state, '(.*)'::jsonb from public\.t3a_content_object", line)
            return json.loads(m.group(1).replace("''", "'"))
    raise SystemExit(f"{sid}: version insert not found in {APPLIED.name}")

stmts, report = [], {}
for sid, (fam, iid, before, after, cr) in REWORD.items():
    body = package_body(sid)
    assert body == applied_body(sid), f"{sid}: the rebuilt body differs from the applied migration's body"
    items = [i for i in body["source_sheet"][fam] if i["id"] == iid]
    assert len(items) == 1 and items[0]["text"] == before, f"{sid}: {fam} {iid} is not '{before}'"
    sec = sections[sid]
    assert digest_of(sec) == body["source_digest"], f"{sid}: the package digest does not reproduce from the section text"
    assert sec.count(before) == 1, f"{sid}: the phrase must occur exactly once in the section text"
    new_digest = digest_of(sec.replace(before, after))
    assert new_digest != body["source_digest"]
    items[0]["text"] = after
    body["rewording"] = {"register": cr, "authority": "Tony Mofoke written delegation of 23 October 2026 (CR-219)", "rule": "D5-69 (CR-232): the counterpart role label is not the subject of a verb in a bound family item",
                         "family": fam, "item": iid, "before": before, "after": after, "package_source_digest": body["source_digest"]}
    body["source_digest"] = new_digest; body["source_version_hash"] = new_digest
    report[sid] = (body["rewording"]["package_source_digest"], new_digest)
    title = pkg["sources"][sid]["title"]
    body_json = lit(json.dumps(body, ensure_ascii=False))
    stmts.append(f"""  -- {sid} {fam} {iid}: "{before}" -> "{after}" ({cr})
  insert into public.t3a_content_object(identifier, family, title, dimension_id, current_operational_state) select {lit(sid)}, 'source'::public.t3a_content_family, {lit(title)}, {lit(DIM)}, 'not_loaded'::public.t3a_operational_state
    where not exists (select 1 from public.t3a_content_object where identifier = {lit(sid)} and family = 'source'::public.t3a_content_family);
  insert into public.t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v2.0', 'drafting', 'not_loaded'::public.t3a_operational_state, {body_json}::jsonb from public.t3a_content_object o
    where o.identifier = {lit(sid)} and o.family = 'source'::public.t3a_content_family and not exists (select 1 from public.t3a_d1_content_version v where v.content_object_id = o.content_object_id);
  -- the counterpart load guard returns null for a refused source, and the insert then writes nothing: fail loudly rather than load four of five
  if not exists (select 1 from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier = {lit(sid)} and o.family = 'source'::public.t3a_content_family) then
    raise exception 'D5 five-source load: % was refused by the load guard', {lit(sid)};
  end if;""")

ids = ", ".join(lit(s) for s in REWORD)
sql = f"""-- Step 6 (D5): the five sources that the counterpart rule refused at load (D5-69, conflict register CR-232), loaded with one bound family item of each reworded (CR-310 to CR-315).
-- Generated by tools/day1/build_d5_five_sources_migration.py. Do not edit by hand. The applied migrations 20270201 to 20270205 and 20270230 are not edited.
-- Decision made under Tony Mofoke's written delegation of 23 October 2026 (CR-219); the authoring team did not state it. The counterpart rule, its detection patterns and every D5 guard are untouched:
-- the sources are loaded by the same insert as the other 28, so t3a_counterpart_load_guard runs on each and now passes.
-- Everything is loaded NOT servable (versions drafting, sources not_loaded, serving_eligible false). Nothing here approves, activates or serves a source.
-- The five bodies differ from {REF} by the stated words, so source_digest and source_version_hash are new (derivation in the generator; the package digest is kept as rewording.package_source_digest).
-- Rollback: docs/day1/evidence/rollback_20270240_d5_five_sources.sql

do $five$ begin
  if (select count(*) from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.dimension_id = 'D5' and o.identifier in ({ids})) = {len(REWORD)} then raise notice 'D5 five sources already loaded'; return; end if;
{chr(10).join(stmts)}
  insert into public.t3a_d1_content_load_event(env_state, content_object_id, content_version_id, governed_status, notes)
    select 'design_only', o.content_object_id, v.content_version_id, 'DISABLED_PENDING_DECISION', {lit(REF + ' loaded not servable; one bound family item reworded under CR-310 to CR-315 (CR-232 closed)')}
    from public.t3a_content_object o join public.t3a_d1_content_version v on v.content_object_id = o.content_object_id
    where o.dimension_id = 'D5' and o.identifier in ({ids})
      and not exists (select 1 from public.t3a_d1_content_load_event e where e.content_version_id = v.content_version_id);
end $five$;
"""
Path(out_path).write_text(sql, encoding="utf-8")
print("wrote", out_path)
for sid, (a, b) in report.items(): print(sid, "package", a[:12], "->", b[:12])
