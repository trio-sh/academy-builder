"""Domain H plan: challenge, correction and complaint (store CHL). Live challenge tables are extended (all empty in production)."""
TITLE = "challenge, correction and complaint"
MIGRATION = "20261111000000_day1_challenge"

def E(q, col=None, cls=None, **kw):
    d = {"q": "H." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "H." + q, **kw}

TABLES = [
    {"name": "t3a_challenge_case", "extend": True, "fields": [
        E("challenge_case_id"), E("challenge_ground"), E("evidence_disclosed_at"), E("opened_at", "created_at"),
        N("opened_by"), N("challenge_target_ref"), N("second_check_actor_id"), N("challenge_outcome"), N("outcome_reason_code"),
        N("resolved_at"), N("response_time_committed_version"), N("issuance_hold", type="boolean"),
    ]},
    {"name": "t3a_reconsideration_assignment", "extend": True, "fields": [E("reconsiderer_id")]},
    {
        "name": "t3a_correction_request", "mode": "state",
        "comment": "Domain H correction requests. The outcome is a controlled code set once.",
        "key_columns": ["ber_report_id uuid references public.t3a_d1_ber_report(ber_report_id)", "participant_id uuid not null", "requested_at timestamptz not null default now()"],
        "fields": [{"q": "H.correction_request_id", "pk": True, "default": "gen_random_uuid()"},
                   {"q": "H.correction_outcome", "nullable": True, "checks": ["check (correction_outcome is null or correction_outcome ~ '^[a-z0-9_]{1,64}$')"]}],
        "immutable": ["correction_request_id", "ber_report_id", "participant_id", "requested_at"],
    },
    {
        "name": "t3a_complaint", "mode": "state",
        "comment": "Domain H complaints. The acknowledgement time is set once.",
        "key_columns": ["participant_id uuid not null", "raised_at timestamptz not null default now()"],
        "fields": [{"q": "H.complaint_id", "pk": True, "default": "gen_random_uuid()"}, {"q": "H.complaint_acknowledged_at", "nullable": True}],
        "immutable": ["complaint_id", "participant_id", "raised_at"],
    },
]
