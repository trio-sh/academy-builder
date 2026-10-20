#!/usr/bin/env python3
"""Step 3b: build the content load migration for one dimension from its JSON build package.

  python3 tools/day1/build_dimension_content_migration.py D2 <Build-Package.json> <out.sql>

Loads the registers into the shared structure tables (every row carries the dimension), the statement library, the refusal rule table,
the language templates, the condition order, the retired vocabulary and the sources. Everything is loaded NOT servable: versions are
`drafting`, sources are `not_loaded`, statements are `build_only`. Nothing here approves, activates or serves a source."""
import json, re, sys
from pathlib import Path

dim, pkg_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
pkg = json.load(open(pkg_path)); R = pkg["registers"]; PKG = pkg["package"]
ident, ver = PKG["identifier"], PKG["version"]
REF = f"{ident} v{ver}"

def lit(s):
    return "'" + str(s).replace("'", "''") + "'" if s is not None else "null"

rows = []  # sql statements, in order
# --- 1. structure tables -------------------------------------------------------------------------------------------------------
children = {b["child"] for b in R["branch_rules"].values()}
order = 0
for qc, q in R["questions"].items():
    order += 1
    rows.append(f"insert into public.t3a_d1_question_object(dimension_id, question_code, conduct_element, answer_type, applicability, missing_state_eligible, display_order) values ({lit(dim)},{lit(qc)},{lit(q['element'])},{lit(q['answer_type'])},{lit(q['served_when'])},{'false' if qc in children else 'true'},{order});")
sets = {}
for i, (sc, s) in enumerate(R["capture_sets"].items(), 1):
    first = s.get("type") == "first-occurrence"
    rows.append(f"insert into public.t3a_d1_capture_set(dimension_id, capture_set_code, title, applicability_note, display_order, records_first_occurrence) values ({lit(dim)},{lit(sc)},{lit(s['title'])},null,{i},{'true' if first else 'false'});")
    for n, line in enumerate(s["lines"], 1):
        whole = s.get("whole_session") is not None and line == s["whole_session"]
        rows.append(f"insert into public.t3a_d1_capture_line(dimension_id, capture_set_code, line_text, line_order, is_whole_session_answer) values ({lit(dim)},{lit(sc)},{lit(line)},{n},{'true' if whole else 'false'});")
for qc, q in R["questions"].items():
    bound = q["source_bound_to"]; bound = None if bound in ("—", "-", "") else bound
    rows.append(f"insert into public.t3a_d1_question_capture_map(dimension_id, question_code, capture_set_code, source_bound_family, ruling_reference, ruled_by, ruled_at, conduct_element, answer_type, applicability_rule) values ({lit(dim)},{lit(qc)},{lit(q['capture_set'])},{lit(bound)},{lit(REF + ' Section 5.2')},{lit('Execution edition as loaded; awaiting founder approval')},now(),{lit(q['element'])},{lit(q['answer_type'])},{lit(q['served_when'])});")
for i, (rc, b) in enumerate(R["branch_rules"].items(), 1):
    cond = f"{b['parent']} returns {', '.join(b['serving_answers'])}"
    rows.append(f"insert into public.t3a_d1_branch_rule(dimension_id, rule_code, rule_condition, rule_effect, rule_order) values ({lit(dim)},{lit(rc)},{lit(cond)},{lit(b['child'] + ' served. ' + b['note'])},{i});")

# --- 2. content objects and versions --------------------------------------------------------------------------------------------
def obj(identifier, family, title, body, state="not_applicable", var=None):
    var = var or f"o_{re.sub('[^a-z0-9]', '_', identifier.lower())}"
    return (f"insert into public.t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ({lit(identifier)}, {lit(family)}::public.t3a_content_family, {lit(title)}, {lit(dim)}, {lit(state)}::public.t3a_operational_state);\n"
            f"insert into public.t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, {lit('v' + ver)}, 'drafting', {lit(state)}::public.t3a_operational_state, {lit(json.dumps(body, ensure_ascii=False))}::jsonb from public.t3a_content_object where identifier = {lit(identifier)} and family = {lit(family)}::public.t3a_content_family;")

construct = {"situation_classes": R["situation_classes"], "conduct_elements": R["conduct_elements"], "coverage": R["coverage"], "source_fields": R["source_fields"], "source": REF}
determination = {"questions": R["questions"], "capture_sets": R["capture_sets"], "branch_rules": R["branch_rules"], "source": REF}
statement_meta = {"comparison_operators": R["comparison_operators"], "placeholder_grammar": R["placeholder_grammar"], "recurrence_keys": R["recurrence_keys"], "resolution_rules": R["resolution_rules"], "templates": R["templates"], "prohibited_vocabulary": R["prohibited_vocabulary"], "source": REF}
rows.append(obj(f"{ident}-CONSTRUCT", "construct", f"{dim} construct", construct))
rows.append(obj(f"{ident}-DETERMINATION", "determination_question_set", f"{dim} determination set", determination))
rows.append(obj(f"{ident}-STATEMENT-LIBRARY", "statement_library", f"{dim} statement library", statement_meta))

# --- 3. statements ---------------------------------------------------------------------------------------------------------------
STG = {"1": "S1", "2": "S2", "3": "S3", "4": "S4"}
def stages(given):
    m = re.search(r"Stages? ([0-9, ]+)", given or "")
    return [STG[x.strip()] for x in m.group(1).split(",")] if m else ["S1", "S2", "S3", "S4"]
def cond(given):
    g = (given or "").split(";")[0].strip()
    return None if g in ("—", "-", "") or g.startswith("Stage") else g
for key, e in R["library"].items():
    st = stages(e["given"]); vars_ = sorted(set(re.findall(r"\{([a-z_]+)\}", e["text"])))
    arr = "array[" + ",".join(lit(x) for x in vars_) + "]::text[]" if vars_ else "'{}'::text[]"
    stg = "array[" + ",".join(lit(x) for x in st) + "]::text[]"
    rows.append(f"insert into public.t3a_d1_statement_library(content_version_id, dimension_id, question_set_version, stage_code, statement_key, statement_body, bound_variables, bound_condition_renderings, use_disposition, question_code, answer_code, applicable_stages, given_condition, entry_type) "
                f"select v.content_version_id, {lit(dim)}, {lit(ver)}, {lit(st[0])}::public.t3a_stage_code, {lit(key)}, {lit(e['text'])}, {arr}, '{{}}'::jsonb, 'build_only', {lit(e['question'])}, {lit(e['answer'])}, {stg}, {lit(cond(e['given']))}, {lit(e['entry_type'])} "
                f"from public.t3a_d1_content_version v join public.t3a_content_object o on o.content_object_id = v.content_object_id where o.identifier = {lit(ident + '-STATEMENT-LIBRARY')};")

# --- 4. refusal rules ------------------------------------------------------------------------------------------------------------
for rc, r in R["resolution_rules"].items():
    parts = []
    for tok in r["pattern"].split("+"):
        k, _, v = tok.strip().partition("=")
        parts.append({"subject": k.strip(), "value": v.strip()})
    outcome = r["outcome"]; sup = None
    m = re.match(r"SUPPRESS (ST-[A-Z0-9-]+)", outcome)
    if m: outcome, sup = "SUPPRESS", m.group(1)
    rows.append(f"insert into public.t3a_resolution_refusal_rule(dimension_id, rule_code, pattern_text, pattern, outcome, reason, suppress_statement_key) values ({lit(dim)},{lit(rc)},{lit(r['pattern'])},{lit(json.dumps(parts))}::jsonb,{lit(outcome)},{lit(r['reason'])},{lit(sup)});")

# --- 5. templates, condition order, vocabulary -----------------------------------------------------------------------------------
T = R["templates"]
for i, (tid, body) in enumerate(T.items(), 1):
    el = "{single_event}" if "-ONE-" in tid else "{multi_context}" if ("-MC-" in tid or "-REC-" in tid) else "{insufficient}" if ("-SCOPE-" in tid or "-UNREP-" in tid) else "{}"
    vars_ = sorted(set(re.findall(r"\{([a-z_]+)\}", body)))
    arr = "array[" + ",".join(lit(x) for x in vars_) + "]::text[]" if vars_ else "'{}'::text[]"
    rows.append(f"insert into public.t3a_d1_language_template(language_template_id, dimension_id, template_body, bound_variables, eligible_states, precedence) values ({lit(tid)},{lit(dim)},{lit(body)},{arr},{lit(el)},{i});")
p = f"L-{dim}-"
conds = [("conditions_compromised", p + "COMP-001"), ("evidence_expired", p + "EXP-001"), ("correction_open", None), ("amendment_or_withdrawal", p + "AMEND-001"),
         ("stage_1_only", None), ("single_or_multiple_observer", p + "SINGLE-001"), ("mixed_or_divergent", p + "DIV-001"), ("earlier_attempt_differs", p + "ATT-001")]
for i, (c, t) in enumerate(conds, 1):
    rows.append(f"insert into public.t3a_d1_condition_precedence(dimension_id, condition_code, precedence_order, language_template_id, renders_before_conduct, effect) values ({lit(dim)},{lit(c)},{i},{lit(t)},true,{lit('Fixed order of ' + REF + ' Section 5.13; the limitation is stated before the conduct description')});")
# the retired list is a comma list ending at its first full stop; a conversion fault can run the next paragraph into the last entry, so the list stops there
words = []
for w in R["prohibited_vocabulary"]:
    if ". " in w:
        words.append(w.split(". ")[0]); break
    words.append(w)
for w in words:
    rows.append(f"insert into public.t3a_rce_prohibited_vocabulary(dimension_id, word, version, reason) values ({lit(dim)},{lit(w)},{lit('PV-' + dim + '-1.0')},{lit(REF + ' Section 5.7a retired vocabulary')}) on conflict do nothing;")

# --- 6. sources (loaded, not servable) -------------------------------------------------------------------------------------------
reg = R["source_register"]
for sid, s in pkg["sources"].items():
    body = dict(s); body["source_identifier"] = sid; body["stage_code"] = STG[str(s["stage"])]; body["source_version_hash"] = s["source_digest"]; body["serving_eligible"] = False
    body["verbatim"] = s.get("situation", "")
    rows.append(obj(sid, "source", s["title"], body, state="not_loaded"))
rows.append(f"insert into public.t3a_d1_content_load_event(env_state, content_object_id, content_version_id, governed_status, notes) select 'design_only', o.content_object_id, v.content_version_id, 'DISABLED_PENDING_DECISION', {lit(REF + ' loaded not servable')} from public.t3a_content_object o join public.t3a_d1_content_version v on v.content_object_id = o.content_object_id where o.dimension_id = {lit(dim)} and o.identifier like {lit(ident + '%')} or (o.dimension_id = {lit(dim)} and o.identifier like {lit('SRC-' + dim + '-%')});")

header = f"""-- Step 3b: {dim} content load from {REF}. Generated by tools/day1/build_dimension_content_migration.py. Do not edit by hand.
-- Everything is loaded NOT servable: versions are drafting, sources are not_loaded with serving_eligible false, statements are build_only.
-- Nothing here approves, activates or serves a source. An empty approved source set is the designed first state.

alter table public.t3a_d1_statement_library add column if not exists question_code text;
alter table public.t3a_d1_statement_library add column if not exists answer_code text;
alter table public.t3a_d1_statement_library add column if not exists applicable_stages text[];
alter table public.t3a_d1_statement_library add column if not exists given_condition text;
alter table public.t3a_d1_statement_library add column if not exists entry_type text;
alter table public.t3a_d1_statement_library drop constraint if exists t3a_d1_statement_library_entry_type_check;
alter table public.t3a_d1_statement_library add constraint t3a_d1_statement_library_entry_type_check check (entry_type is null or entry_type in ('conduct_bearing', 'record_status', 'artifact_comparison'));

create table if not exists public.t3a_resolution_refusal_rule (
  dimension_id text not null check (dimension_id ~ '^D[0-9]{{1,2}}$'),
  rule_code text not null,
  pattern_text text not null,
  pattern jsonb not null,
  outcome text not null check (outcome in ('REFUSE', 'SUPPRESS')),
  reason text not null,
  suppress_statement_key text,
  primary key (dimension_id, rule_code),
  check ((outcome = 'SUPPRESS') = (suppress_statement_key is not null))
);
comment on table public.t3a_resolution_refusal_rule is 'Resolution rules that refuse a pattern or suppress a duplicated statement (D2 Section 5.14). A refusal outranks every other outcome.';
alter table public.t3a_resolution_refusal_rule enable row level security;
revoke all on public.t3a_resolution_refusal_rule from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_resolution_refusal_rule;
create trigger t3a_append_only before update or delete on public.t3a_resolution_refusal_rule for each row execute function public.t3a_deny_mutation();

-- The ruled mapping guard checked bound families against the D1 serving logic; that logic is D1 only.
create or replace function public.t3a_d1_question_capture_map_guard() returns trigger language plpgsql as $fn$
begin
  if not exists (select 1 from public.t3a_d1_question_object q where q.question_code = new.question_code and q.dimension_id = new.dimension_id) then
    raise exception 'QUESTION_CODE_NOT_REGISTERED: % is not a question object', new.question_code using errcode = '23514';
  end if;
  if new.dimension_id = 'D1' and new.source_bound_family is not null and not exists (
    select 1 from public.t3a_d1_served_questions('{{}}'::jsonb) q
    where q.bound_family = new.source_bound_family and (q.question_code = new.question_code or q.question_code = new.question_code || '-child')) then
    raise exception 'BOUND_FAMILY_MISMATCH: the serving logic does not bind % to %', new.question_code, new.source_bound_family using errcode = '23514';
  end if;
  return new;
end $fn$;

"""
guard = f"do $load$ begin\n  if exists (select 1 from public.t3a_content_object where identifier = {lit(ident + '-CONSTRUCT')}) then raise notice '{dim} content already loaded'; return; end if;\n"
body = "\n".join("  " + r.replace("\n", "\n  ") for r in rows)
Path(out_path).write_text(header + guard + body + "\nend $load$;\n", encoding="utf-8")
print("wrote", out_path, len(rows), "statements", len(R["library"]), "sources", len(pkg["sources"]))
