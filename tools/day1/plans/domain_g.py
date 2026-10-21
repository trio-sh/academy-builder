"""Domain G plan: dimension evidence, report assembly, review, issuance and release (store RPT). The D1 report tables are extended;
review, release, access and verification records are new."""
TITLE = "evidence state, report, review, issuance and release"
MIGRATION = "20261110000000_day1_report_release"

def E(q, col=None, cls=None, **kw):
    d = {"q": "G." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "G." + q, **kw}

TABLES = [
    {"name": "t3a_dimension_evidence", "extend": True, "fields": [
        E("insufficiency_reason"), E("sufficiency_rules_version"), N("dimension_evidence_state"), N("cross_cutting_condition_flags", type="text[]")]},
    {"name": "t3a_d1_ber_report", "extend": True, "fields": [
        E("ber_report_id"),
        N("ber_version"), N("ber_standard_version"), N("permitted_use_version"), N("represented_dimension_ids", type="text[]"),
        N("observer_multiplicity_statement_code"), N("source_link"), N("ber_status"), N("participant_review_opened_at"),
        N("participant_review_completed_at"), N("specimen_render_flag"), N("report_type"), N("report_preview_digest"),
        N("preview_state"), N("report_content_digest"), N("verification_code"),
    ], "indexes": ["create unique index if not exists t3a_d1_ber_report_verification_code_uq on public.t3a_d1_ber_report (verification_code) where verification_code is not null;"]},
    {"name": "t3a_d1_report_issuance", "extend": True, "fields": [E("issued_by"), E("issued_at")]},
    {
        "name": "t3a_evidence_review", "mode": "insert_only",
        "comment": "Domain G evidence review: who reviewed which report, when, against which version set. The reviewer cannot issue the report.",
        "key_columns": ["ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id)"],
        "fields": [
            {"q": "G.evidence_review_id", "pk": True, "default": "gen_random_uuid()"}, {"q": "G.reviewer_id"},
            {"q": "G.review_completed_at", "default": "now()"}, {"q": "G.version_set_hash"}, {"q": "G.review_checklist_results"},
        ],
    },
    {
        "name": "t3a_report_release", "mode": "state",
        "comment": "Domain G release records: pool visibility and any named recipient release. Only the token state and the visibility state move.",
        "key_columns": ["ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id)"],
        "fields": [
            {"q": "G.recipient_release_id", "pk": True, "default": "gen_random_uuid()"}, {"q": "G.release_mode"},
            {"q": "G.recipient_address_hash", "nullable": True, "checks": ["check ((release_mode = 'named_pilot_recipient') = (recipient_address_hash is not null))"]},
            {"q": "G.token_state", "default": "'active'"}, {"q": "G.employer_visibility_state", "default": "'not_available'"},
            {"q": "G.availability_changed_at", "default": "now()"}, {"q": "G.talentvisa_active"},
        ],
        "extra_columns": ["created_at timestamptz not null default now()"],
        "immutable": ["recipient_release_id", "ber_report_id", "release_mode", "recipient_address_hash", "created_at"],
    },
    {
        "name": "t3a_report_access", "mode": "insert_only",
        "comment": "Domain G report access records: one row each time a report is opened.",
        "key_columns": ["ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id)", "accessor_id uuid"],
        "fields": [{"q": "G.report_access_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["accessed_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_verification_check", "mode": "insert_only",
        "comment": "Domain G verification checks: one row each time a verification code is looked up.",
        "key_columns": ["ber_report_id uuid references public.t3a_d1_ber_report(ber_report_id)", "outcome text not null"],
        "fields": [{"q": "G.verification_check_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["checked_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_job_family_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain G SOCKET: job family. Structure only; every write is refused.",
        "key_columns": ["ber_report_id uuid"],
        "fields": [{"q": "G.job_family", "nullable": True}],
    },
]
