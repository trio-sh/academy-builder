"""Domain J plan: Growth Log (store GLG). The participant's own notebook; the platform writes nothing and nothing reads it."""
TITLE = "Growth Log"
MIGRATION = "20261113000000_day1_growth_log"

TABLES = [
    {
        "name": "t3a_growth_log_entry", "mode": "state",
        "comment": "Domain J Growth Log: the participant's own practice notes and rehearsal references. Participant only. Feeds nothing, measures nothing, is read by no one else; the platform writes nothing here.",
        "own_read": "created_by = auth.uid()",
        "fields": [
            {"q": "J.entry_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "J.created_by", "default": "auth.uid()", "checks": ["foreign key (created_by) references public.t3a_account(account_id)"]},
            {"q": "J.entry_kind"},
            {"q": "J.text", "type": "text"},
            {"q": "J.module_reference", "type": "text"},
            {"q": "J.created_at", "default": "now()"},
            {"q": "J.updated_at", "default": "now()"},
            {"q": "J.schema_version", "default": "'1.0'"},
        ],
        "immutable": ["entry_id", "created_by", "created_at", "entry_kind"],
    },
]
