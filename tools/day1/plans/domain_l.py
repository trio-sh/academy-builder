"""Domain L plan: commercial records (store COM). New tables; subscription fields are a closed socket."""
TITLE = "orders, entitlements and refunds"
MIGRATION = "20261115000000_day1_orders"

ENT = "('observation_engagements', 'mentor_hour_allocation', 'access_duration')"

TABLES = [
    {
        "name": "t3a_order", "mode": "insert_only",
        "comment": "Domain L orders. Insert only; a refund is a row in t3a_refund. An order never creates, changes or scores evidence.",
        "own_read": "account_id = auth.uid()",
        "fields": [
            {"q": "L.order_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "L.account_id", "ref": "public.t3a_account(account_id)"},
            {"q": "L.product_code", "checks": ["check (product_code ~ '^[A-Za-z0-9_.:-]{1,64}$')"]},
            {"q": "L.package_code", "checks": ["check (package_code ~ '^[A-Za-z0-9_.:-]{1,64}$')"]},
            {"q": "L.package_entitlements", "type": "text[]", "checks": ["check (package_entitlements <@ array['observation_engagements', 'mentor_hour_allocation', 'access_duration'])"]},
            {"q": "L.purchased_at", "default": "now()"},
            {"q": "L.access_starts_at"}, {"q": "L.access_ends_at"},
            {"q": "L.price_amount", "type": "numeric(12,2)", "checks": ["check (price_amount >= 0)"]},
            {"q": "L.currency", "checks": ["check (currency ~ '^[A-Z]{3}$')"]},
            {"q": "L.tax_jurisdiction", "checks": ["check (tax_jurisdiction ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$')"]},
            {"q": "L.founding_member_flag"},
            {"q": "L.payment_provider_ref", "type": "text", "checks": ["check (payment_provider_ref ~ '^[A-Za-z0-9_.:-]{1,128}$')"]},
        ],
        "constraints": ["check (access_ends_at > access_starts_at)"],
    },
    {
        "name": "t3a_refund", "mode": "insert_only",
        "comment": "Domain L refunds: one row per refund, pointing at its order.",
        "key_columns": ["order_id uuid not null references public.t3a_order(order_id)"],
        "fields": [{"q": "L.refund_id", "pk": True, "default": "gen_random_uuid()"}],
        "extra_columns": ["refunded_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_subscription_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain L SOCKET: subscription plan, renewal and cancellation. Structure only; every write is refused.",
        "key_columns": ["order_id uuid"],
        "fields": [{"q": "L.subscription_plan", "nullable": True}, {"q": "L.renewal_at", "nullable": True}, {"q": "L.cancellation_reason_code", "nullable": True}],
    },
]
