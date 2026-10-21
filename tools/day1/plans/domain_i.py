"""Domain I plan: employer application, verification, pool and contact (store EMP). The live application table is extended (empty in production)."""
TITLE = "employer application, verification, pool and contact"
MIGRATION = "20261112000000_day1_employer"

def E(q, col=None, cls=None, **kw):
    d = {"q": "I." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "I." + q, **kw}

ORG = "organization_id uuid not null references public.t3a_employer_organization(organization_id)"

TABLES = [
    {"name": "t3a_employer_application", "extend": True, "fields": [
        E("employer_application_id", "application_id"), E("work_email"), E("legal_entity_name", "organization_legal_name"),
        E("business_registry_id", "business_number", note="live column is text; the dictionary type is an identifier (CR-055)"),
        E("organization_domain", "email_domain"), E("approval_decision", note="live column is text; the dictionary has two values (CR-055)"),
        E("decided_at", "approved_at"), E("decision_basis", "approval_basis"),
        N("application_status"), N("free_provider_refused"), N("domain_age_flag"), N("accepting_person_name", type="text"),
        N("accepting_person_title", type="text"), N("record_use_terms_version"), N("terms_accepted_at"), N("approver_id"),
    ]},
    {
        "name": "t3a_employer_organization", "mode": "state",
        "comment": "Domain I employer organizations. Created on approval of an application; verification status and activation move, nothing else.",
        "key_columns": ["application_id uuid references public.t3a_employer_application(application_id)"],
        "fields": [
            {"q": "I.organization_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "I.verification_status", "default": "'pending'"},
            {"q": "I.liveworks_activation_state"}, {"q": "I.design_partner_flag"},
        ],
        "extra_columns": ["created_at timestamptz not null default now()", "updated_at timestamptz not null default now()"],
        "immutable": ["organization_id", "application_id", "created_at"],
    },
    {
        "name": "t3a_employer_pool_query", "mode": "insert_only",
        "comment": "Domain I pool queries. Criteria are limited to participant stated fields; the criteria are stored as asked.",
        "key_columns": [ORG, "criteria jsonb not null"],
        "fields": [{"q": "I.pool_query_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["queried_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_employer_contact_request", "mode": "state",
        "comment": "Domain I contact requests. The state moves; the request does not.",
        "key_columns": [ORG, "requested_at timestamptz not null default now()"],
        "fields": [{"q": "I.contact_request_id", "pk": True, "default": "gen_random_uuid()"},
                   {"q": "I.contact_request_state", "type": "text", "default": "'requested'", "checks": ["check (contact_request_state in ('requested', 'accepted', 'declined', 'withdrawn', 'expired'))"]}],
        "immutable": ["contact_request_id", "organization_id", "requested_at"],
    },
    {
        "name": "t3a_hire_record", "mode": "insert_only",
        "comment": "Domain I hire records. A hire row carries no participant and no report reference (DT-33).",
        "key_columns": [ORG],
        "fields": [{"q": "I.hire_recorded_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["recorded_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_employer_attestation", "mode": "insert_only",
        "comment": "Domain I employer attestations. Organization level; no participant reference.",
        "key_columns": [ORG],
        "fields": [{"q": "I.employer_attestation_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["attested_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_workspace_note", "mode": "insert_only",
        "comment": "Domain I workspace notes. Organization level; a note holds a pointer, not report content.",
        "key_columns": [ORG],
        "fields": [{"q": "I.workspace_note_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["noted_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_employment_linkage_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain I SOCKET: employment linkage and follow-up. Structure only; every write is refused.",
        "key_columns": [],
        "fields": [{"q": "I.employment_linkage_id", "nullable": True}, {"q": "I.linked_participant_id", "nullable": True},
                   {"q": "I.linked_organization_id", "nullable": True}, {"q": "I.linked_role_code", "nullable": True},
                   {"q": "I.employment_start_date", "nullable": True}, {"q": "I.employer_respondent_id", "nullable": True},
                   {"q": "I.respondent_role", "nullable": True}, {"q": "I.ats_hris_integration_ref", "nullable": True}],
    },
]
