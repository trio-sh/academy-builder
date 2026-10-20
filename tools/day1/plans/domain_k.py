"""Domain K plan: private rehearsal (store RHS). The rehearsal store never joins to the evidence store. Live rehearsal tables are extended
(all empty in production); attempts are new."""
TITLE = "private rehearsal"
MIGRATION = "20261114000000_day1_rehearsal"

def E(q, col=None, cls=None, **kw):
    d = {"q": "K." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "K." + q, **kw}

TABLES = [
    {"name": "t3a_rehearsal_session", "extend": True, "fields": [
        E("rehearsal_session_id"), E("rehearsal_started_at", "started_at"), E("rehearsal_completed_at", "ended_at"),
        N("module_id"), N("module_version"), N("workplace_moment_id"), N("rehearsal_completion_state"), N("rehearsal_choice_record_id"),
        N("module_dimension_id"), N("module_segment_id"), N("private_scenario_id"), N("private_scenario_version"), N("variant_tuple"),
        N("response_modality"), N("voice_transcript_ref"),
    ]},
    {"name": "t3a_coaching_feedback", "extend": True, "fields": [
        E("feedback_acknowledged_at", "acknowledged_at"), N("feedback_source_type"), N("feedback_viewed_at")]},
    {"name": "t3a_rehearsal_telemetry_aggregate", "extend": True, "fields": [
        E("cohort_period"), E("sessions_started"), E("sessions_completed"), E("feedback_generated_count"), E("feedback_acknowledged_count"),
        E("retake_within_window_count"), E("duration_distribution")]},
    {
        "name": "t3a_rehearsal_attempt", "mode": "insert_only",
        "comment": "Domain K rehearsal attempts: private, participant only, never evidence. Pointers to the participant's own artifacts, not copies.",
        "own_read": "participant_id = auth.uid()",
        "key_columns": ["participant_id uuid not null references public.t3a_account(account_id)", "rehearsal_session_id uuid not null references public.t3a_rehearsal_session(rehearsal_session_id)"],
        "fields": [
            {"q": "K.rehearsal_attempt_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "K.rehearsal_attempt_no", "nullable": False},
            {"q": "K.module_completion_state"}, {"q": "K.module_completion_at"},
            {"q": "K.rehearsal_decision_path_ref"}, {"q": "K.participant_artifact_ref"}, {"q": "K.participant_artifact_version"},
            {"q": "K.participant_reflection_ref"}, {"q": "K.reflection_prompt_id"}, {"q": "K.reflection_prompt_version"},
            {"q": "K.final_personal_sentence_ref"},
            {"q": "K.reference_examples_viewed_refs", "type": "uuid[]"}, {"q": "K.consequence_horizons_displayed", "type": "jsonb"},
            {"q": "K.retention_check_instance_id"}, {"q": "K.retention_check_status"},
        ],
        "extra_columns": ["recorded_at timestamptz not null default now()"],
        "constraints": ["check (module_completion_state is distinct from 'complete' or module_completion_at is not null)"],
    },
]
