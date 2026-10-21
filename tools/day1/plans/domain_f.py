"""Domain F plan: mentor, observer and assurance (store AUT, GOV). Live authorization tables are extended; invitations, appeals,
calibration records and the confidence socket are new."""
TITLE = "mentor authorization, conflicts, calibration and assurance"
MIGRATION = "20261109000000_day1_mentor_assurance"

def E(q, col=None, cls=None, **kw):
    d = {"q": "F." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "F." + q, **kw}

TABLES = [
    {"name": "t3a_mentor_authorization", "extend": True, "fields": [
        E("authorization_id", "mentor_authorization_id"), E("authorized_dimension_id", "dimension_id"),
        E("effective_from", "authorized_from"), E("effective_to", "authorized_until"),
        E("calibration_status"), E("reference_set_version"),
        N("authorization_status"), N("reviewer_authorization"), N("issuer_authorization"), N("supervised_sessions_completed"),
        N("supervised_status_started_at"), N("supervision_finding_code"), N("suspension_started_at"), N("suspension_extension_count"),
        N("independent_approver_id"), N("observations_per_month_commitment"), N("engagement_started_at"), N("sourcing_channel"),
        N("sourcing_employer_ref"), N("observer_qualification_record_ref"), N("observer_specialty_domain_codes", type="text[]"),
        N("qualification_reviewed_at"),
    ]},
    {"name": "t3a_conflict_declaration", "extend": True, "fields": [
        E("conflict_declaration_id"), E("declared_at"), N("declared_entity_refs", type="uuid[]"), N("recusal_id")]},
    {"name": "t3a_d1_involvement", "extend": True, "fields": [
        E("involvement_id"), N("evidence_cycle_id"), N("cycle_function"), N("s1_exposure_flag")]},
    {"name": "t3a_moderation_sample", "extend": True, "fields": [E("sampling_plan_version")]},
    {
        "name": "t3a_calibration_record", "mode": "insert_only",
        "comment": "Domain F calibration and agreement records: paired determinations on a stimulus unit, with the inputs to the agreement statistic.",
        "key_columns": ["mentor_id uuid not null"],
        "fields": [
            {"q": "F.calibration_record_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "F.stimulus_unit_id"}, {"q": "F.paired_determination_set_id"}, {"q": "F.agreement_statistic_inputs"},
            {"q": "F.agreement_threshold_version"}, {"q": "F.moderation_sample_flag"},
        ],
        "extra_columns": ["recorded_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_mentor_invitation", "mode": "state",
        "comment": "Domain F mentor invitations. Redemption and agreement signing are set once.",
        "key_columns": ["invitee_email text not null check (invitee_email = lower(btrim(invitee_email)))"],
        "fields": [
            {"q": "F.mentor_invitation_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "F.invited_by"}, {"q": "F.invitation_sent_at", "default": "now()"}, {"q": "F.invitation_expires_at"},
            {"q": "F.invitation_redeemed_at", "nullable": True}, {"q": "F.mentor_agreement_version", "nullable": True},
            {"q": "F.mentor_agreement_signed_at", "nullable": True},
        ],
        "constraints": ["check (invitation_expires_at > invitation_sent_at)"],
        "immutable": ["mentor_invitation_id", "invitee_email", "invited_by", "invitation_sent_at", "invitation_expires_at"],
    },
    {
        "name": "t3a_mentor_appeal", "mode": "state",
        "comment": "Domain F mentor appeals against an authorization decision. The decision time is set once.",
        "key_columns": ["mentor_id uuid not null"],
        "fields": [{"q": "F.mentor_appeal_id", "pk": True, "default": "gen_random_uuid()"}, {"q": "F.opened_at", "nullable": False, "default": "now()"}, {"q": "F.decided_at", "nullable": True}],
        "immutable": ["mentor_appeal_id", "mentor_id", "opened_at"],
    },
    {
        "name": "t3a_mentor_confidence_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain F SOCKET: mentor confidence per determination. Structure only; every write is refused.",
        "key_columns": ["determination_id uuid"],
        "fields": [{"q": "F.mentor_confidence_per_determination", "nullable": True}],
    },
]
