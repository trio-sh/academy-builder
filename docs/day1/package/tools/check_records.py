#!/usr/bin/env python3
"""Validate an event or a dormant lsa sidecar row against T3A-DEV-DAY1-001 Version 1.3.
Usage:
  python3 tools/check_records.py event   <event.json>
  python3 tools/check_records.py sidecar <sidecar_row.json>
Checks format, registration, required, optional and conditional payload keys, size, chronology and chain rules.
It cannot know whether a well formed identifier or hash refers to a real record: the ingesting service must
confirm every reference against stored records (paragraph 7.3). Exit 0 when valid, 1 when refused.
Malformed input is refused with a named reason; the tool never crashes on input."""
import json, os, re, sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMAS = os.path.join(HERE, "..", "reference", "jsonschema")
VERSION = "1.3"
MAX_PAYLOAD = 4096
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
SERVICE = re.compile(r"^svc_[a-z0-9_]{2,60}$")
SHA = re.compile(r"^[a-f0-9]{64}$")
SEMVER = re.compile(r"^[0-9]+\.[0-9]+(\.[0-9]+)?$")
IDEM = re.compile(r"^[A-Za-z0-9_.:\-]{8,128}$")
EVENT_NAME = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")
PERSONAL = re.compile(r"(^|_)(name|email|phone|address|text|notes?|comment|description|free_text|transcript)($|_)")
SAFE_SUFFIX = ("_id","_ids","_ref","_refs","_at","_version","_hash","_digest","_code","_state","_status","_class")
ENVELOPE_REQUIRED = ["event_id","event_name","event_category","occurred_at","ingested_at","actor_type","actor_id",
  "actor_role_code","resource_type","resource_id","payload","schema_version","dictionary_version","integrity_status",
  "integrity_hash","event_idempotency_key","event_processing_state","record_property"]
ENVELOPE_OPTIONAL = ["subject_id","session_id","correlation_id","application_session_id","artifact_ref_id","previous_hash",
  "supersedes_event_id","source_system","event_sequence_no","policy_decision_ref","change_request_ref"]
ENUMS = {"actor_type":{"PARTICIPANT","MENTOR","EMPLOYER_USER","ADMINISTRATOR","SYSTEM_SERVICE"},
  "integrity_status":{"ok","missing_keys","invalid_bounds","suspected_duplicate","manual_review"},
  "event_processing_state":{"accepted","quarantined","rejected","corrected"},
  "record_property":{"real","synthetic_test","demonstration"},"source_system":{"web","mobile","api","internal_job"},
  "resource_type":{"account","consent","observation","determination","source_version","served_instance","report","release","challenge",
                   "employer_organization","program","configuration","registry_asset","growth_log_entry","rehearsal_session","order","mentor","event"}}

def ts(v):
    if not isinstance(v, str): return None
    try: d = datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError: return None
    return d if d.tzinfo is not None else None

def check_value(key, prop, v, E, where):
    if v is None: E.append(f"{where}{key}: null is not permitted; omit an optional key instead"); return
    if "enum" in prop:
        if v not in prop["enum"]: E.append(f"{where}{key}: value not in enum")
        return
    t = prop.get("type")
    if t == "integer":
        if not isinstance(v, int) or isinstance(v, bool) or v < prop.get("minimum", -10**18): E.append(f"{where}{key}: not a valid integer")
    elif t == "number":
        if not isinstance(v, (int, float)) or isinstance(v, bool): E.append(f"{where}{key}: not a number")
    elif t == "boolean":
        if not isinstance(v, bool): E.append(f"{where}{key}: not a boolean")
    elif t == "object":
        if not isinstance(v, dict): E.append(f"{where}{key}: not an object")
        elif len(v) > prop.get("maxProperties", 32): E.append(f"{where}{key}: too many properties")
        elif any(PERSONAL.search(str(k)) and not str(k).endswith(SAFE_SUFFIX) for k in v): E.append(f"{where}{key}: nested personal or free text key")
    elif t == "array":
        if not isinstance(v, list): E.append(f"{where}{key}: not an array")
        elif len(v) > prop.get("maxItems", 64): E.append(f"{where}{key}: too many items")
        elif any(isinstance(x, (dict, list)) for x in v): E.append(f"{where}{key}: nested structures not permitted")
    elif t == "string":
        if not isinstance(v, str): E.append(f"{where}{key}: not a string"); return
        if prop.get("format") == "date-time" and ts(v) is None: E.append(f"{where}{key}: not a timestamp with a time zone")
        if prop.get("format") == "uuid" and not UUID.match(v): E.append(f"{where}{key}: not a UUID")
        if "pattern" in prop and not re.match(prop["pattern"], v): E.append(f"{where}{key}: format not permitted")
        if "maxLength" in prop and len(v) > prop["maxLength"]: E.append(f"{where}{key}: longer than {prop['maxLength']}")

def check_conditionals(conds, p, E, n):
    for c in conds:
        if "require_any" in c:
            if not any(k in p for k in c["require_any"]): E.append(f"payload needs one of {c['require_any']} for {n}")
            continue
        v = p.get(c["when_field"])
        hit = (v in c["in"]) if "in" in c else (v is not None and v not in c["not_in"])
        if not hit: continue
        for k in c.get("require", []):
            if k not in p: E.append(f"payload missing {k}, required when {c['when_field']} is {v}")
        for k in c.get("forbid", []):
            if k in p: E.append(f"payload key {k} not permitted when {c['when_field']} is {v}")

def check_event(ev):
    E = []
    reg = {e["name"]: e for e in json.load(open(os.path.join(SCHEMAS, "event_payload_registry_v1.3.json")))["events"]}
    if not isinstance(ev, dict): return ["event is not an object"]
    for k in ENVELOPE_REQUIRED:
        if k not in ev: E.append(f"envelope missing {k}")
    for k in ev:
        if k not in ENVELOPE_REQUIRED and k not in ENVELOPE_OPTIONAL: E.append(f"envelope key not permitted: {k}")
    if E: return E
    n = ev["event_name"]
    if not isinstance(n, str) or not EVENT_NAME.match(n) or n not in reg: return [f"event_name not registered: {n!r}"]
    r = reg[n]
    if not isinstance(ev["event_id"], str) or not UUID.match(ev["event_id"]): E.append("event_id not a UUID")
    if ev["event_category"] != r["category"]: E.append("event_category does not match the registry")
    for k, allowed in ENUMS.items():
        if k in ev and ev[k] not in allowed: E.append(f"{k} value not permitted")
    aid = ev["actor_id"]
    if not isinstance(aid, str) or not (UUID.match(aid) or (ev["actor_type"] == "SYSTEM_SERVICE" and SERVICE.match(aid))):
        E.append("actor_id must be a UUID, or svc_<name> for SYSTEM_SERVICE")
    for k in ("resource_id", "subject_id", "session_id", "correlation_id", "application_session_id", "artifact_ref_id", "supersedes_event_id"):
        if ev.get(k) is not None and not (isinstance(ev[k], str) and UUID.match(ev[k])): E.append(f"{k} not a UUID")
    for k in ("schema_version",):
        if not isinstance(ev[k], str) or not SEMVER.match(ev[k]): E.append(f"{k} not a semantic version")
    if ev["dictionary_version"] != VERSION: E.append(f"dictionary_version must be {VERSION}")
    if not isinstance(ev["event_idempotency_key"], str) or not IDEM.match(ev["event_idempotency_key"]): E.append("event_idempotency_key format not permitted")
    o, g = ts(ev["occurred_at"]), ts(ev["ingested_at"])
    if not o or not g: E.append("occurred_at or ingested_at not a timestamp with a time zone")
    elif o > g: E.append("occurred_at is later than ingested_at")
    if not isinstance(ev["integrity_hash"], str) or not SHA.match(ev["integrity_hash"]): E.append("integrity_hash not SHA 256 hex")
    seq = ev.get("event_sequence_no")
    if seq is not None and (not isinstance(seq, int) or isinstance(seq, bool) or seq < 0): E.append("event_sequence_no not a non negative integer")
    elif isinstance(seq, int) and seq > 0 and not ev.get("previous_hash"): E.append("previous_hash required after the first event of a stream")
    if ev.get("previous_hash") is not None and not (isinstance(ev["previous_hash"], str) and SHA.match(ev["previous_hash"])): E.append("previous_hash not SHA 256 hex")
    p = ev["payload"]
    if not isinstance(p, dict): E.append("payload is not an object"); return E
    size = len(json.dumps(p, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    if size > MAX_PAYLOAD: E.append(f"payload is {size} bytes, above {MAX_PAYLOAD}")
    sch = r["payload_schema"]
    for k in p:
        if k not in sch["properties"]: E.append(f"payload key not registered for {n}: {k}")
        elif PERSONAL.search(k) and not k.endswith(SAFE_SUFFIX): E.append(f"payload key carries personal or free text: {k}")
        else: check_value(k, sch["properties"][k], p[k], E, "payload.")
    for k in sch["required"]:
        if k not in p: E.append(f"payload missing required {k}")
    check_conditionals(r.get("conditional", []), p, E, n)
    return E

def check_sidecar(row):
    E = []
    s = json.load(open(os.path.join(SCHEMAS, "lsa_observation_sidecar_v1.3.schema.json")))
    if not isinstance(row, dict): return ["row is not an object"]
    props = s["properties"]
    for k in s["required"]:
        if k not in row: E.append(f"missing {k}")
    for k, v in row.items():
        if k not in props: E.append(f"key not permitted: {k}"); continue
        if k == "dormant_fields": continue
        if v is None and k in ("clause_instance_id", "supersedes_sidecar_id"): continue
        check_value(k, props[k], v, E, "")
    if row.get("dictionary_version") not in (None, VERSION): E.append(f"dictionary_version must be {VERSION}")
    df = row.get("dormant_fields"); allow = props["dormant_fields"]["properties"]
    if not isinstance(df, dict): E.append("dormant_fields is not an object")
    else:
        for k, v in df.items():
            if k not in allow: E.append(f"dormant_fields key not on the allowlist: {k}")
            else: check_value(k, allow[k], v, E, "dormant_fields.")
    if len(json.dumps(row, separators=(",", ":"), default=str).encode("utf-8")) > 16384: E.append("row above 16384 bytes")
    return E

def main(argv):
    if len(argv) != 3 or argv[1] not in ("event", "sidecar"): print(__doc__); return 2
    try:
        obj = json.load(open(argv[2], encoding="utf-8"))
    except Exception as x:
        print(f"REFUSED unreadable input: {type(x).__name__}"); print("RESULT REFUSED (1)"); return 1
    try:
        E = check_event(obj) if argv[1] == "event" else check_sidecar(obj)
    except Exception as x:
        E = [f"malformed input ({type(x).__name__})"]
    for e in E: print("REFUSED", e)
    print("RESULT", "VALID" if not E else f"REFUSED ({len(E)})")
    return 0 if not E else 1

if __name__ == "__main__": sys.exit(main(sys.argv))
