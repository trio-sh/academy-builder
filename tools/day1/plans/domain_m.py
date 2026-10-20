"""Domain M plan: Session Archive structures (code lsa), all DORMANT or SOCKET. Built and left closed: every write is refused until activation is ordered."""
TITLE = "Session Archive structures (dormant)"
MIGRATION = "20261116000000_day1_session_archive_dormant"

def S(name, comment, fields, keys=None):
    return {"name": name, "mode": "insert_only", "socket": True, "comment": comment, "key_columns": keys or ["account_id uuid"], "fields": fields}

def F(q, **kw):
    return {"q": "M." + q, "nullable": True, **kw}

TABLES = [
    S("t3a_lsa_snapshot", "Domain M DORMANT: Session Archive snapshot. Structure only; every write is refused.",
      [F("lsa_snapshot_id"), F("snapshot_at"), F("pinned_version_set"), F("lsa_comparison_result")]),
    S("t3a_lsa_report", "Domain M DORMANT: Session Archive report. Structure only; every write is refused.",
      [F("lsa_report_id"), F("lsa_verification_code")]),
    S("t3a_longitudinal_case", "Domain M DORMANT: longitudinal case with its scope, inclusions, exclusions and finding. Structure only; every write is refused.",
      [F("longitudinal_case_id"), F("comparison_scope_id"),
       F("included_observation_refs", type="uuid[]"), F("excluded_observation_refs", type="uuid[]"), F("exclusion_reason_codes", type="text[]"), F("counterevidence_refs", type="uuid[]"),
       F("transition_rule_version"), F("lsa_sufficiency_rule_version"), F("resolution_trace_ref"), F("finding_code")]),
    S("t3a_lsa_sidecar", "Domain M DORMANT: Session Archive sidecar. Structure only; every write is refused.", [{"q": "M.lsa_sidecar_id", "nullable": True}]),
    {
        "name": "t3a_session_archive_tab", "mode": "state",
        "comment": "Domain M: the Session Archive tab. One row; its only permitted state is frozen.",
        "key_columns": ["singleton boolean primary key default true check (singleton)"],
        "fields": [{"q": "M.session_archive_tab_state", "default": "'frozen'"}],
        "extra_columns": ["updated_at timestamptz not null default now()"],
        "immutable": ["singleton"],
    },
]
