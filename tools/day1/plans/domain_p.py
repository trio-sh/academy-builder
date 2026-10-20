"""Domain P plan: governance, privacy, retention, incidents and configuration (store GOV)."""
TITLE = "retention, privileged access, content reads, incidents, deployment and the error journal"
MIGRATION = "20261119000000_day1_governance_controls"

def E(q, col=None, cls=None, **kw):
    d = {"q": "P." + q, "exists": True}
    if col: d["col"] = col
    if cls: d["mapping_class"] = cls
    return {**d, **kw}

def N(q, **kw):
    return {"q": "P." + q, **kw}

def T(name, comment, idq, extra=None, keys=None, fields=None, mode="insert_only", **kw):
    return {"name": name, "mode": mode, "comment": comment, "key_columns": keys or [], "fields": [{"q": "P." + idq, "pk": True, "default": "gen_random_uuid()"}] + (fields or []),
            "extra_columns": extra or [], **kw}

TABLES = [
    {"name": "t3a_retention_schedule", "extend": True, "fields": [
        E("retention_class", note="live enum names differ from the dictionary: observation_evidence / audit_logs / challenge_records vs underlying_evidence / audit_log / challenge_record (CR-062)"),
        E("counsel_ratified_at"), N("retention_period_value", note="months")]},
    {"name": "t3a_retention_run_socket", "mode": "insert_only", "socket": True,
     "comment": "Domain P SOCKET: destruction and anonymization runs. Structure only; every write is refused until counsel ratifies the schedule.",
     "key_columns": [], "fields": [{"q": "P.destruction_run_id", "nullable": True}, {"q": "P.anonymization_run_id", "nullable": True}]},
    T("t3a_privileged_access", "Domain P privileged access: each use of a privileged role, with its basis. Insert only.", "privileged_access_id",
      keys=["actor_id uuid not null", "access_basis text not null check (access_basis ~ '^[A-Za-z0-9_.:-]{1,64}$')"], extra=["accessed_at timestamptz not null default now()"]),
    {"name": "t3a_oversight_log", "extend": True, "fields": [E("content_read_id", "entry_id", "M3", note="the existing oversight log already records each read with holder, time, subject and basis (CR-063)")]},
    T("t3a_control_run", "Domain P control runs: each time a control is operated, and its result. Insert only.", "control_run_id",
      keys=["control_code text not null check (control_code ~ '^[A-Za-z0-9_.:-]{1,64}$')", "result text not null check (result in ('pass', 'fail', 'not_run'))"], extra=["run_at timestamptz not null default now()"]),
    T("t3a_suppression", "Domain P suppressions applied to an aggregate output, with the reason. Insert only.", "suppression_id",
      fields=[N("suppression_reason", type="text")], extra=["applied_at timestamptz not null default now()"]),
    T("t3a_data_access_request", "Domain P data access requests. The resolution time is set once.", "data_access_request_id", mode="state",
      keys=["account_id uuid not null", "requested_at timestamptz not null default now()", "resolved_at timestamptz"], immutable=["data_access_request_id", "account_id", "requested_at"]),
    T("t3a_data_correction_request", "Domain P data correction requests. The resolution time is set once.", "data_correction_request_id", mode="state",
      keys=["account_id uuid not null", "requested_at timestamptz not null default now()", "resolved_at timestamptz"], immutable=["data_correction_request_id", "account_id", "requested_at"]),
    T("t3a_incident", "Domain P incidents: severity, affected record count and notification time.", "incident_id", mode="state",
      fields=[N("severity", nullable=True), N("affected_record_count", nullable=True), N("notified_at", nullable=True)],
      keys=["opened_at timestamptz not null default now()"], immutable=["incident_id", "opened_at"]),
    {"name": "t3a_deployment_config", "mode": "state",
     "comment": "Domain P deployment and timing configuration, one row. A value that is null is unset; its route refuses and never defaults (DT-39).",
     "key_columns": ["singleton boolean primary key default true check (singleton)"],
     "fields": [N(n, nullable=True) for n in ["hosting_region", "backup_region", "verification_link_ttl", "verification_resend_cooldown", "mentor_invitation_ttl",
                                              "recipient_release_token_ttl", "recipient_passcode_ttl", "stage_entry_hold_ttl", "retention_policy_version", "retention_review_at"]],
     "extra_columns": ["updated_at timestamptz not null default now()"], "immutable": ["singleton"]},
    T("t3a_error_journal", "Domain P error journal: a failed event emission, written outside the event log, reconciled when the store recovers (DT-59).", "error_journal_id", mode="state",
      fields=[N("error_journal_written_at", default="now()"), N("reconciled_event_id", nullable=True)],
      keys=["event_name text not null", "error_detail text", "parent_ref text"], immutable=["error_journal_id", "event_name", "error_journal_written_at"]),
    T("t3a_legal_hold", "Domain P legal holds on a resource. A hold is placed and later released; retention and destruction skip a held resource (DT-54).", "legal_hold_ref", mode="state",
      keys=["resource_type text not null", "resource_id uuid not null", "placed_at timestamptz not null default now()", "released_at timestamptz"], immutable=["legal_hold_ref", "resource_type", "resource_id", "placed_at"]),
]
