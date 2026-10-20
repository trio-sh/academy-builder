"""Domain N plan: the event envelope. The columns were built in step 11.1.3 on t3a_event_log; this step only records where every
Domain N field lives, so DT-01 can resolve them. No column is added. A null in an optional envelope column is its own capture state:
the event log is append only and hash chained, so it carries no companion columns (CR-061)."""
TITLE = "event envelope (mapping only)"
MIGRATION = "20261117000000_day1_event_envelope_map"

NEW = {"dictionary_version", "previous_hash", "record_property", "event_idempotency_key", "event_sequence_no", "event_processing_state",
       "actor_role_code", "policy_decision_ref", "change_request_ref", "application_session_id"}

def E(name, **kw):
    d = {"q": "N." + name, "exists": True, "no_companion": True}
    if name in NEW: d["mapping_class"] = "M5"; d["note"] = "added to t3a_event_log in 20261102000000"
    if name == "artifact_ref_id": d["mapping_class"] = "M3"
    return {**d, **kw}

NAMES = ["event_id", "event_name", "event_category", "occurred_at", "ingested_at", "actor_type", "actor_id", "subject_id", "session_id", "correlation_id",
         "resource_type", "resource_id", "payload", "artifact_ref_id", "schema_version", "dictionary_version", "integrity_status", "integrity_hash",
         "previous_hash", "supersedes_event_id", "source_system", "record_property", "event_idempotency_key", "event_sequence_no", "event_processing_state",
         "actor_role_code", "policy_decision_ref", "change_request_ref", "application_session_id"]

TABLES = [{"name": "t3a_event_log", "extend": True, "fields": [E(n) for n in NAMES]}]
