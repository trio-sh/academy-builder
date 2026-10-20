"""Domain C plan: observation path, Stage entry and attempts (store EVD). The tables already exist and hold rows, so
each is extended in place: existing columns are mapped, missing ones are added as nullable (see extend_table)."""
TITLE = "observation path, Stage entry and attempts"
MIGRATION = "20261106000000_day1_observation_path"

def E(q, col=None, cls=None, **kw):
    d = {"q": "C." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "C." + q, **kw}

TABLES = [
    {"name": "t3a_observation_path_gateway", "extend": True, "fields": [
        E("observation_path_gateway_id"), E("gateway_opened_at", "created_at"), E("coaching_terminated_at"),
        E("session_identity_method"), E("assistance_rules_version"),
        N("observation_notification_timestamp"), N("observation_path_completed_at"),
    ]},
    {"name": "t3a_stage_entry_event", "extend": True, "fields": [
        E("stage_entry_event_id"), E("stage_instance_id"), E("stage_code"), E("dimensions_in_play"),
        E("administration_conditions"),
        N("session_id"), N("entry_authority_actor_id"), N("observation_mode"), N("live_media_provider"), N("stage_entry_hold_expires_at"),
    ]},
    {"name": "t3a_attempt", "extend": True, "fields": [
        E("attempt_counted", "counted"),
        N("attempt_no"), N("attempt_event_class"), N("attempt_rules_version"), N("cooldown_class"), N("cooldown_ends_at"),
        N("attempt_reason"), N("prior_progression_decision_ref"), N("cooldown_completed_at"), N("s1_not_required_ruleset_id"),
    ], "indexes": ["create index if not exists t3a_attempt_sequence_idx on public.t3a_attempt (participant_id, dimension_id, stage_code, attempt_no);"]},
    {"name": "t3a_mentor_assignment", "extend": True, "fields": [
        E("mentor_assignment_id"), E("assignment_method", note="live enum is system_allocated or coordinator_allocated; the dictionary values are automatic or coordinator (CR-039)"), E("prior_allocation_count"),
        N("guidance_between_stages_received"), N("guide_account_id"),
    ]},
    {"name": "t3a_observation", "extend": True, "fields": [
        E("accommodation_class"), E("assistance_declaration", note="column is jsonb; the dictionary type is an enum of three values (CR-038)"),
        E("abandonment_state"), N("accommodation_applied"),
    ]},
]
