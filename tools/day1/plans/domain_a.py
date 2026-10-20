"""Domain A plan: identity, account and role (store IDN). Input to generate_domain_migration.py."""
TITLE = "identity, account and role"
MIGRATION = "20261104000000_day1_accounts_roles"

ROLE_BASIS = ("check ((role_code = 'participant' and role_grant_basis in ('self_serve_individual','administrator_grant'))"
              " or (role_code = 'mentor' and role_grant_basis in ('invitation_redeemed','administrator_grant'))"
              " or (role_code = 'employer_user' and role_grant_basis in ('employer_application_approved','administrator_grant'))"
              " or (role_code in ('coordinator','oversight_administrator','commercial','system_service') and role_grant_basis = 'administrator_grant'))")

TABLES = [
    {
        "name": "t3a_account", "mode": "state",
        "comment": "Domain A account root. One row per account. Mirrors auth.users; the role lives in t3a_role_assignment.",
        "own_read": "account_id = auth.uid()",
        "fields": [
            {"q": "A.account_id", "pk": True},
            {"q": "A.account_created_at", "default": "now()"},
            {"q": "A.account_creation_route"},
            {"q": "A.email_address", "checks": ["check (email_address = lower(btrim(email_address)))"]},
            {"q": "A.email_verification_state", "default": "'unverified'"},
            {"q": "A.email_verification_sent_at"},
            {"q": "A.email_verified_at"},
            {"q": "A.identity_assurance_method", "default": "'account_authentication'",
             "checks": ["check (identity_assurance_method = 'account_authentication')"]},
            {"q": "A.age_eligibility_attestation", "nullable": True},
            {"q": "A.record_property", "default": "'real'"},
            {"q": "A.pilot_cohort_id"},
            {"q": "A.account_state", "default": "'active'"},
            {"q": "A.identity_link_status", "default": "'unverified'"},
            {"q": "A.participant_lifecycle_state"},
        ],
        "extra_columns": [
            "capture_gaps text[] not null default '{}'",
            "dictionary_version text not null default '1.3'",
            "updated_at timestamptz not null default now()",
        ],
        "constraints": [
            "check (age_eligibility_attestation is not null or 'age_eligibility_attestation' = any (capture_gaps))",
            "check ((email_verification_state = 'verified') = (email_verified_at is not null))",
        ],
        "immutable": ["account_id", "account_created_at", "account_creation_route", "identity_assurance_method", "age_eligibility_attestation", "record_property"],
    },
    {
        "name": "t3a_role_assignment", "mode": "insert_only",
        "comment": "Domain A role grants. Insert only; a revocation is a row in t3a_role_assignment_revocation. Roles are set server side only.",
        "own_read": "account_id = auth.uid()",
        "hidden_columns": ["participant_pseudonym_ref"],
        "key_columns": ["account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [
            {"q": "A.role_assignment_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "A.role_code"},
            {"q": "A.role_grant_basis"},
            {"q": "A.role_granted_by"},
            {"q": "A.role_granted_at", "default": "now()"},
            {"q": "A.role_effective_from", "default": "now()"},
            {"q": "A.role_rules_version"},
            {"q": "A.role_effective_until"},
            {"q": "A.participant_pseudonym_ref", "nullable": True},
        ],
        "constraints": [
            ROLE_BASIS,
            "check ((role_code = 'participant') = (participant_pseudonym_ref is not null))",
            "check (role_effective_until is null or role_effective_until > role_effective_from)",
        ],
        "indexes": [
            "create index if not exists t3a_role_assignment_account_idx on public.t3a_role_assignment (account_id, role_code);",
            "create index if not exists t3a_role_assignment_pseudonym_idx on public.t3a_role_assignment (participant_pseudonym_ref) where participant_pseudonym_ref is not null;",
        ],
    },
    {
        "name": "t3a_role_assignment_revocation", "mode": "insert_only",
        "comment": "Domain A role revocations. One row per revoked assignment.",
        "fields": [
            {"q": "A.role_revoked_by", "nullable": False},
            {"q": "A.role_revoked_at", "nullable": False, "default": "now()"},
            {"q": "A.role_revocation_basis", "nullable": False, "checks": ["check (role_revocation_basis ~ '^[a-z0-9_]+$')"]},
        ],
        "key_columns": ["role_assignment_id uuid primary key references public.t3a_role_assignment(role_assignment_id)"],
    },
    {
        "name": "t3a_participant_profile", "mode": "state",
        "comment": "Domain A participant profile fields. Context, never evidence; no mentor read path.",
        "own_read": "account_id = auth.uid()",
        "key_columns": ["account_id uuid primary key references public.t3a_account(account_id)"],
        "fields": [
            {"q": "A.legal_name"}, {"q": "A.display_name"},
            {"q": "A.country_of_residence", "checks": ["check (country_of_residence is null or country_of_residence ~ '^[A-Z]{2}$')"]},
            {"q": "A.subdivision_of_residence"}, {"q": "A.city_of_residence"}, {"q": "A.privacy_jurisdiction_code"},
            {"q": "A.preferred_language"}, {"q": "A.timezone"},
            {"q": "A.occupation_interest", "type": "text[]"},
            {"q": "A.occupational_classification_version", "type": "text", "semver": False, "default": "'NOC 2021 Version 1.0'"},
            {"q": "A.profile_field_source", "type": "jsonb", "checks": ["check (profile_field_source is null or jsonb_typeof(profile_field_source) = 'object')"]},
            {"q": "A.notification_channel_preference"}, {"q": "A.target_industry_code"},
            {"q": "A.role_seniority_context_code"}, {"q": "A.recruitment_channel_code"},
        ],
        "extra_columns": ["updated_at timestamptz not null default now()"],
        "immutable": ["account_id"],
    },
    {
        "name": "t3a_participant_document", "mode": "insert_only",
        "comment": "Domain A uploaded profile documents (pointers only). Never evidence; no mentor read path.",
        "own_read": "account_id = auth.uid()",
        "key_columns": ["document_id uuid primary key default gen_random_uuid()", "account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [{"q": "A.profile_document_ref", "type": "text", "nullable": False}],
        "extra_columns": ["uploaded_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_participant_enrollment", "mode": "insert_only",
        "comment": "Domain A enrollments (participant.enrolled).",
        "own_read": "account_id = auth.uid()",
        "key_columns": ["account_id uuid not null references public.t3a_account(account_id)"],
        "fields": [
            {"q": "A.enrollment_event_id", "pk": True, "default": "gen_random_uuid()", "nullable": False},
            {"q": "A.enrollment_scope", "nullable": False},
            {"q": "A.enrolled_at", "nullable": False, "default": "now()"},
        ],
    },
    {
        "name": "t3a_identity_assurance_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain A SOCKET: identity assurance by an external provider. Structure only; every write is refused.",
        "key_columns": ["account_id uuid not null"],
        "fields": [
            {"q": "A.identity_assurance_provider_ref", "nullable": True},
            {"q": "A.identity_assurance_evidence_ref", "type": "text", "nullable": True},
        ],
    },
]
