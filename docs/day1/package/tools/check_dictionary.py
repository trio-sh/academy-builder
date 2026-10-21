#!/usr/bin/env python3
"""Preflight check of the T3A-DEV-DAY1-001 field dictionary JSON (paragraph 6.3).
Usage: python3 tools/check_dictionary.py <dictionary.json> [pins.json]
The pins file (default reference/field_definition_pins_v1.3.json) fixes every field and event definition
issued with this version; any changed, added or missing definition is refused.
Every failure is printed as FAIL <code>: <detail>. Exit 0 only when no failure exists.
A failing check blocks the field registry load."""
import hashlib, json, os, re, sys

CAPTURE_STATES = {"captured","not_captured","never_asked","declined","no_response","not_applicable",
                  "technical_failure","withdrawn","not_authored","not_served"}
STATUSES = {"ACTIVE","DORMANT","SOCKET","LEGACY"}
IF_ABSENT = {"REFUSE","STATE","NONE"}
TYPES = {"identifier","enum","timestamp","version_string","code","text","integer","object","sha256_hex",
         "boolean","array","email","decimal"}
CATEGORIES = {"OBSERVATION","MENTOR","PARTICIPANT","EMPLOYER","REPORT","CONSENT","GOVERNANCE","SYSTEM",
              "COMMERCIAL","REHEARSAL","PROGRAM","REGISTRY"}
REQ_FIELD_KEYS = {"domain","qualified_name","field","type_values","canonical_type","enum_values","source",
                  "trigger","owner","store","status","irreversible","if_absent","capture_state_field"}
IDENT = re.compile(r"^[a-z][a-z0-9_]*$")
EVENT = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")
TOKEN = re.compile(r"[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*")
FORBIDDEN = re.compile(r"validat|fingerprint|skill_?passport|(^|_)level_?[1-4]($|_)|observation_level|"
                       r"behaviou?ral_score|readiness_score|(^|_)scores?($|_)|(^|_)(rating|ranking|rank|percentile)($|_)|"
                       r"(^|_)tiers?($|_)|endorse|ordinal_anchor|has_rehearsed|shortlist")
PAYLOAD_PERSONAL = re.compile(r"(^|_)(name|email|phone|address|text|notes?|comment|description|free_text|transcript)($|_)")
SAFE_SUFFIX = ("_id","_ids","_ref","_refs","_at","_version","_hash","_digest","_code","_state","_status","_class")
MAX_PAYLOAD = 4096

def check(J):
    E = []
    def fail(code, msg): E.append(f"{code}: {msg}")
    for k in ("identifier","version","dictionary_version","fields","events","acceptance_tests","prohibited","capture_state_codes","acceptance_test_count"):
        if k not in J: fail("TOP_KEY_MISSING", k)
    if E: return E
    if set(J["capture_state_codes"]) != CAPTURE_STATES: fail("CAPTURE_STATES", "capture_state_codes differ from the ten required codes")
    if not J["prohibited"]: fail("PROHIBITED_EMPTY", "prohibited list is empty")
    names_by_field = set(); qn = set(); per_domain = set()
    for f in J["fields"]:
        miss = REQ_FIELD_KEYS - set(f)
        if miss: fail("FIELD_KEYS", f"{f.get('qualified_name')}: missing {sorted(miss)}"); continue
        q = f["qualified_name"]
        if q in qn: fail("DUPLICATE_QUALIFIED_NAME", q)
        qn.add(q)
        if q != f"{f['domain']}.{f['field']}": fail("QUALIFIED_NAME_FORM", q)
        if (f["domain"], f["field"]) in per_domain: fail("DUPLICATE_FIELD_IN_DOMAIN", q)
        per_domain.add((f["domain"], f["field"]))
        if not IDENT.match(f["field"]): fail("FIELD_NOT_IDENTIFIER", q)
        if FORBIDDEN.search(f["field"]): fail("FORBIDDEN_IDENTIFIER", q)
        if f["status"] not in STATUSES: fail("BAD_STATUS", f"{q}: {f['status']}")
        if f["if_absent"] not in IF_ABSENT: fail("BAD_IF_ABSENT", f"{q}: {f['if_absent']}")
        if not isinstance(f["irreversible"], bool): fail("BAD_IRREVERSIBLE", q)
        if f["canonical_type"] not in TYPES: fail("BAD_TYPE", f"{q}: {f['canonical_type']}")
        if f["canonical_type"] == "enum":
            ev = f["enum_values"]
            if not ev or len(set(ev)) != len(ev): fail("BAD_ENUM", f"{q}: empty or duplicate values")
            elif any(FORBIDDEN.search(str(v).lower()) for v in ev): fail("FORBIDDEN_VALUE", q)
        elif f["enum_values"] not in (None, []): fail("ENUM_ON_NON_ENUM", q)
        if f["if_absent"] == "STATE":
            if f["capture_state_field"] != f["field"] + "_capture_state": fail("CAPTURE_STATE_FIELD", q)
        elif f["capture_state_field"] is not None: fail("CAPTURE_STATE_ON_NON_STATE", q)
        names_by_field.add(f["field"])
    # events
    evnames = set()
    for e in J["events"]:
        n = e.get("name", "")
        if n in evnames: fail("DUPLICATE_EVENT", n)
        evnames.add(n)
        if not EVENT.match(n): fail("EVENT_NAME_FORM", n)
        if e.get("category") not in CATEGORIES: fail("EVENT_CATEGORY", n)
        if e.get("status") not in {"ACTIVE","DORMANT","SOCKET"}: fail("EVENT_STATUS", n)
        req = e.get("required_payload") or []; opt = e.get("optional_payload") or []
        keys = req + opt
        sch = e.get("payload_schema", {})
        conds = e.get("conditional") or []
        if not req and not any("require_any" in c for c in conds): fail("EVENT_NO_REQUIRED_KEY", n)
        if not keys: fail("EVENT_PAYLOAD_EMPTY", n); continue
        if len(set(keys)) != len(keys): fail("EVENT_PAYLOAD_DUPLICATE_KEY", n)
        for c in conds:
            for k in c.get("require", []) + c.get("forbid", []) + c.get("require_any", []) + ([c["when_field"]] if "when_field" in c else []):
                if k not in keys: fail("EVENT_CONDITIONAL_UNKNOWN_KEY", f"{n}: {k}")
        for k in keys:
            if k not in names_by_field: fail("EVENT_PAYLOAD_UNKNOWN_FIELD", f"{n}: {k}")
            if PAYLOAD_PERSONAL.search(k) and not k.endswith(SAFE_SUFFIX): fail("EVENT_PAYLOAD_PERSONAL_KEY", f"{n}: {k}")
        if sch.get("additionalProperties") is not False or sorted(sch.get("required", [])) != sorted(req) or set(sch.get("properties", {})) != set(keys):
            fail("EVENT_SCHEMA_MISMATCH", n)
        if not isinstance(e.get("worst_case_payload_bytes"), int) or e["worst_case_payload_bytes"] > MAX_PAYLOAD:
            fail("EVENT_PAYLOAD_TOO_LARGE", f"{n}: {e.get('worst_case_payload_bytes')}")
    for f in J["fields"]:
        for t in TOKEN.findall(f["trigger"]):
            if t not in evnames: fail("TRIGGER_EVENT_NOT_IN_CATALOG", f"{f['qualified_name']}: {t}")
    # tests
    ids = [t.get("id") for t in J["acceptance_tests"]]
    if len(ids) != len(set(ids)): fail("DUPLICATE_TEST_ID", "acceptance test ids repeat")
    want = [f"DT-{i:02d}" for i in range(1, J["acceptance_test_count"] + 1)]
    if ids != want: fail("TEST_SEQUENCE", f"expected DT-01 to DT-{J['acceptance_test_count']:02d} in order")
    for t in J["acceptance_tests"]:
        if not all(t.get(k) for k in ("id","test","steps","expected")): fail("TEST_INCOMPLETE", str(t.get("id")))
    return E

def fp(obj): return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
def field_def(f): return {k: f.get(k) for k in ("canonical_type","enum_values","status","if_absent","irreversible","capture_state_field","store")}
def event_def(e): return {k: e.get(k) for k in ("category","status","required_payload","optional_payload","conditional")}

def check_pins(J, pins):
    E = []
    pf, pe = pins.get("fields", {}), pins.get("events", {})
    seen = set()
    for f in J.get("fields", []):
        q = f.get("qualified_name"); seen.add(q)
        if q not in pf: E.append(f"UNPINNED_FIELD: {q}")
        elif fp(field_def(f)) != pf[q]: E.append(f"DEFINITION_CHANGED: {q}")
    for q in pf:
        if q not in seen: E.append(f"PINNED_FIELD_MISSING: {q}")
    seen = set()
    for e in J.get("events", []):
        n = e.get("name"); seen.add(n)
        if n not in pe: E.append(f"UNPINNED_EVENT: {n}")
        elif fp(event_def(e)) != pe[n]: E.append(f"EVENT_DEFINITION_CHANGED: {n}")
    for n in pe:
        if n not in seen: E.append(f"PINNED_EVENT_MISSING: {n}")
    return E

def main():
    p = sys.argv[1] if len(sys.argv) > 1 else "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json"
    pin_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "reference", "field_definition_pins_v1.3.json")
    try: J = json.load(open(p, encoding="utf-8"))
    except Exception as x: print(f"FAIL UNREADABLE: {x}"); print("RESULT FAIL (1)"); return 1
    try: E = check(J)
    except Exception as x: E = [f"MALFORMED: {type(x).__name__}"]
    try: E += check_pins(J, json.load(open(pin_path, encoding="utf-8")))
    except FileNotFoundError: E.append(f"PINS_MISSING: {pin_path}")
    except Exception as x: E.append(f"PINS_UNREADABLE: {type(x).__name__}")
    if "fields" in J:
        print(f"dictionary {J.get('identifier')} v{J.get('version')}: {len(J['fields'])} fields, {len(J.get('events',[]))} events, {len(J.get('acceptance_tests',[]))} tests")
    for e in E: print("FAIL", e)
    print("RESULT", "PASS" if not E else f"FAIL ({len(E)})")
    return 0 if not E else 1

if __name__ == "__main__": sys.exit(main())
