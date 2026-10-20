"""Domain R plan: partner organizations, programs, cohorts and jurisdiction (store PRG)."""
TITLE = "partner organizations, programs, cohorts and jurisdiction"
MIGRATION = "20261121000000_day1_programs"

def N(q, **kw):
    return {"q": "R." + q, **kw}

TABLES = [
    {
        "name": "t3a_partner_organization", "mode": "state",
        "comment": "Domain R partner organizations: type, industry, relationship dates and the data use agreement. Organization level; no participant data.",
        "key_columns": ["partner_organization_id uuid primary key default gen_random_uuid()", "created_at timestamptz not null default now()"],
        "fields": [N("organization_type"), N("organization_industry_code", type="text"), N("partner_relationship_effective_at", nullable=True),
                   N("partner_relationship_ended_at", nullable=True), N("data_use_agreement_ref", nullable=True)],
        "constraints": ["check (partner_relationship_ended_at is null or partner_relationship_effective_at is null or partner_relationship_ended_at >= partner_relationship_effective_at)"],
        "immutable": ["partner_organization_id", "organization_type", "created_at"],
    },
    {
        "name": "t3a_program", "mode": "insert_only",
        "comment": "Domain R programs: each program version is a row. A change is a new version, never an edit.",
        "key_columns": ["partner_organization_id uuid not null references public.t3a_partner_organization(partner_organization_id)", "created_at timestamptz not null default now()"],
        "fields": [N("organization_program_id", pk=True, default="gen_random_uuid()"), N("program_version")],
    },
    {
        "name": "t3a_program_membership", "mode": "state",
        "comment": "Domain R program membership. Enrolment is set at creation; the exit time is set once; the basis is a pointer.",
        "key_columns": ["account_id uuid not null references public.t3a_account(account_id)", "organization_program_id uuid not null references public.t3a_program(organization_program_id)"],
        "fields": [N("program_membership_id", pk=True, default="gen_random_uuid()"), N("program_enrolled_at", nullable=True, default="now()"), N("program_exit_at", nullable=True), N("membership_basis_ref", nullable=True)],
        "constraints": ["check (program_exit_at is null or program_enrolled_at is null or program_exit_at >= program_enrolled_at)"],
        "immutable": ["program_membership_id", "account_id", "organization_program_id", "program_enrolled_at"],
    },
    {
        "name": "t3a_cohort", "mode": "insert_only",
        "comment": "Domain R cohorts: type, definition version and operating jurisdiction with its rule version. Insert only.",
        "key_columns": ["created_at timestamptz not null default now()"],
        "fields": [N("cohort_id", pk=True, default="gen_random_uuid()"), N("cohort_type"), N("cohort_definition_version"),
                   N("operating_jurisdiction_code", type="text", checks=["check (operating_jurisdiction_code ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$')"]), N("jurisdiction_rule_version")],
    },
    {
        "name": "t3a_institutional_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain R SOCKET: institutional tenant and export purpose. Structure only; every write is refused. Cross organization isolation holds because no tenant exists (DT-55).",
        "key_columns": [],
        "fields": [N("institutional_tenant_id", nullable=True), N("institutional_export_purpose_id", nullable=True)],
    },
]
