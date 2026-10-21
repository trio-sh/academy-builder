"""Domain B plan: consent and permissions (store CNS). Input to generate_domain_migration.py."""
TITLE = "consent and permissions"
MIGRATION = "20261105000000_day1_consent"

PURPOSES = "('rehearsal','observation','longitudinal_comparison','report_release','contact','research','institutional_aggregate','followup')"

TABLES = [
    {
        "name": "t3a_consent_record", "mode": "insert_only",
        "comment": "Domain B consent records. One consent type per row, never inherited across dimensions. A later record supersedes an earlier one through t3a_consent_supersession; nothing is edited or deleted.",
        "own_read": "account_id = auth.uid()",
        "key_columns": ["account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [
            {"q": "B.consent_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "B.consent_type", "checks": ["check (consent_type in ('scenario_logging','mentor_observation','employer_share'))"]},
            {"q": "B.consent_status"},
            {"q": "B.consent_timestamp", "default": "now()"},
            {"q": "B.consent_copy_version"},
            {"q": "B.consent_copy_hash"},
            {"q": "B.consent_method"},
            {"q": "B.consent_language", "checks": ["check (consent_language ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$')"]},
            {"q": "B.consent_scope_dimension_id"},
            {"q": "B.consent_scope_stage_code"},
            {"q": "B.consequence_displayed", "nullable": True, "checks": ["check (consent_status <> 'withdrawn' or consequence_displayed is true)"]},
            {"q": "B.ip_address_hash"},
            {"q": "B.processing_purpose_id", "type": "text", "checks": [f"check (processing_purpose_id in {PURPOSES})"]},
            {"q": "B.authorization_basis_type"},
            {"q": "B.consent_actor_id"},
            {"q": "B.consent_effective_at"},
            {"q": "B.consent_expires_at"},
            {"q": "B.historical_reuse_scope", "default": "'future_only'"},
        ],
        "extra_columns": ["recorded_seq bigint generated always as identity"],
        "constraints": ["check (consent_type <> 'mentor_observation' or consent_scope_dimension_id is not null or consent_status = 'declined')"],
        "indexes": ["create index if not exists t3a_consent_record_lookup_idx on public.t3a_consent_record (account_id, consent_type, consent_scope_dimension_id, recorded_seq desc);"],
    },
    {
        "name": "t3a_consent_supersession", "mode": "insert_only",
        "comment": "Domain B supersession pointers: which later record replaced an earlier one.",
        "key_columns": ["consent_id uuid primary key references public.t3a_consent_record(consent_id)"],
        "fields": [{"q": "B.superseded_by", "nullable": False, "ref": "public.t3a_consent_record(consent_id)"}],
    },
    {
        "name": "t3a_consent_state_ref", "mode": "insert_only",
        "comment": "Domain B pointer to the consent records current at a capture; stamped on capture records.",
        "key_columns": ["account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [{"q": "B.consent_state_ref", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["consent_ids uuid[] not null default '{}'", "created_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_privacy_notice_acknowledgement", "mode": "insert_only",
        "comment": "Domain B privacy notice acknowledgements (participant.notice_acknowledged).",
        "own_read": "account_id = auth.uid()",
        "key_columns": ["acknowledgement_id uuid primary key default gen_random_uuid()", "account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [{"q": "B.privacy_notice_version", "nullable": False}, {"q": "B.privacy_notice_hash", "nullable": False}],
        "extra_columns": ["acknowledged_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_contact_consent", "mode": "insert_only",
        "comment": "Domain B contact permission, separate from report availability. Each change is a new row.",
        "own_read": "account_id = auth.uid()",
        "key_columns": ["contact_consent_id uuid primary key default gen_random_uuid()", "account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [{"q": "B.contact_consent_status"}, {"q": "B.contact_consent_at"}],
        "extra_columns": ["recorded_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_lsa_consent", "mode": "insert_only", "socket": True,
        "comment": "Domain B DORMANT: Session Archive consent. Structure only; every write is refused until the consent text is loaded and activation is ordered.",
        "key_columns": ["account_id uuid not null"],
        "fields": [{"q": "B.lsa_consent_state"}, {"q": "B.lsa_consent_text_version"}, {"q": "B.lsa_consent_timestamp"}, {"q": "B.lsa_withdrawal_timestamp"}],
    },
    {
        "name": "t3a_group_participation_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain B SOCKET: Stage 4 group participation permission. Structure only; every write is refused.",
        "key_columns": ["account_id uuid not null"],
        "fields": [{"q": "B.group_participation_record_id", "nullable": True}],
    },
]
