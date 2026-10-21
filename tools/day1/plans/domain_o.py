"""Domain O plan: registry assets, change requests, configuration and manifests (store GOV)."""
TITLE = "registry assets, change requests, configuration and manifest verification"
MIGRATION = "20261118000000_day1_governance_registry"

VER = "check ({c} ~ '^[0-9]+\\.[0-9]+(\\.[0-9]+)?$')"

TABLES = [
    {
        "name": "t3a_registry_asset", "mode": "state",
        "comment": "Domain O registry assets: the current and previous version of each governed asset. Moves only through a change request.",
        "fields": [
            {"q": "O.asset_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "O.asset_type", "type": "text", "checks": ["check (asset_type ~ '^[a-z][a-z0-9_]{1,63}$')"]},
            {"q": "O.current_version"},
            {"q": "O.previous_version", "nullable": True, "checks": ["check (previous_version is null or previous_version ~ '^[0-9]+\\.[0-9]+(\\.[0-9]+)?$')"]},
            {"q": "O.deployment_status", "type": "text", "checks": ["check (deployment_status ~ '^[a-z][a-z_]{1,31}$')"]},
        ],
        "extra_columns": ["updated_at timestamptz not null default now()"],
        "immutable": ["asset_id", "asset_type"],
    },
    {
        "name": "t3a_change_request", "mode": "insert_only",
        "comment": "Domain O change requests: who changed which asset, when, why, to what version, and under whose approval. Insert only.",
        "key_columns": ["asset_id uuid not null references public.t3a_registry_asset(asset_id)"],
        "fields": [
            {"q": "O.change_request_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "O.changed_by"}, {"q": "O.changed_at", "default": "now()"},
            {"q": "O.compatibility_class", "type": "text", "checks": ["check (compatibility_class in ('A', 'B', 'C'))"]},
            {"q": "O.version_change_reason", "type": "text", "checks": ["check (length(btrim(version_change_reason)) > 0)"]},
            {"q": "O.approval_authority", "type": "text", "checks": ["check (length(btrim(approval_authority)) > 0)"]},
            {"q": "O.version_hash"},
        ],
    },
    {
        "name": "t3a_configuration_value", "mode": "insert_only",
        "comment": "Domain O configuration: each value is a row; the current value is the latest. A key with no row is unset and its route refuses; nothing defaults.",
        "key_columns": [],
        "fields": [
            {"q": "O.configuration_key", "type": "text", "checks": ["check (configuration_key ~ '^[a-z][a-z0-9_.]{1,95}$')"]},
            {"q": "O.configuration_value", "type": "text"},
            {"q": "O.configuration_version"}, {"q": "O.set_by"}, {"q": "O.set_at", "default": "now()"},
        ],
        "extra_columns": ["configuration_seq bigint generated always as identity primary key"],
    },
    {
        "name": "t3a_manifest_verification", "mode": "insert_only",
        "comment": "Domain O manifest verification results, including failures. Production manifests verify only against the production public key.",
        "key_columns": ["manifest_ref text not null", "verification_result text not null check (verification_result in ('pass', 'fail'))"],
        "fields": [{"q": "O.manifest_signature", "type": "text"}, {"q": "O.manifest_verified_at", "default": "now()"}],
        "extra_columns": ["verification_id uuid primary key default gen_random_uuid()"],
    },
    {"name": "t3a_provenance", "extend": True, "fields": [{"q": "O.dimension_schema_version", "exists": True}]},
]
