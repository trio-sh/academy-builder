"""Domain E plan: observation record, determinations, progression decision (store EVD). Live tables are extended in place; the
three milestone times and the determinations get new tables."""
TITLE = "observation record, determinations and progression"
MIGRATION = "20261108000000_day1_observation_record"

def E(q, col=None, cls=None, **kw):
    d = {"q": "E." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "E." + q, **kw}

OBS_EXISTS = ["observation_id", "participant_id", "dimension_id", "stage_code", "stage_instance_id", "source_version_id", "contemporaneity", "observer_id",
              "evidence_class", "administration_variance", "comparability_class", "integrity_status", "supersedes", "superseded_by"]
OBS_NEW = ["served_instance_id", "captured_at", "capture_delay_seconds", "observer_role", "observer_authorization_snapshot_ref",
           "s1_human_confirmation_actor_id", "s1_human_confirmation_at", "response_artifact_ref", "response_sequence_number", "response_submitted_at",
           "s3_submission_provenance", "beat_code", "beat_started_at", "data_source", "record_snapshot_hash", "evidence_currency_expires_at",
           "session_started_at", "session_ended_at", "session_serving_state", "session_admin_state", "question_serving_state", "branch_trigger_ref",
           "prompt_material_sequence", "observed_opportunity_ref", "observation_authorization_ref", "prior_exposure_known_state",
           "observer_calibration_version", "observer_independence_state", "reviewer_independence_state", "capture_edit_history_ref"]

TABLES = [
    {"name": "t3a_observation", "extend": True, "fields":
        [E(x) for x in OBS_EXISTS] + [E("observed_at", "occurred_at"), E("committed_at", "created_at"),
         E("submission_origin", note="live column is jsonb; the dictionary type is an enum of three values (CR-046)")]
        + [N(x) for x in OBS_NEW]
        + [N("technical_issue_codes", type="text[]"), N("observer_disagreement_refs", type="uuid[]")],
     "indexes": ["create index if not exists t3a_observation_served_idx on public.t3a_observation (served_instance_id) where served_instance_id is not null;"]},
    {"name": "t3a_d1_progression_decision", "extend": True, "fields": [
        E("progression_decision_id"), E("decision"),
        N("decided_by"), N("decided_at"), N("decision_scope"), N("decision_rationale_code"), N("corrected_decision_ref"),
        N("original_decision_date"), N("correction_effective_date"), N("welfare_stop_ref")]},
    {"name": "t3a_mentor_judgment", "extend": True, "fields": [E("confirmation_role"), E("authorization_snapshot_ref", note="live column is jsonb; the dictionary type is an identifier (CR-046)")]},
    {"name": "t3a_composed_statement", "extend": True, "fields": [E("statement_id"), N("statement_version"), N("statement_digest")]},
    {
        "name": "t3a_stage_sequence", "mode": "state",
        "comment": "Domain E sequence milestones per Stage instance (sequential unmasking). Each time is set once and never changed.",
        "key_columns": ["stage_instance_id uuid primary key references public.t3a_stage_instance(stage_instance_id)", "participant_id uuid not null", "dimension_id text not null"],
        "fields": [
            {"q": "E.s1_outcome_delivered_to_mentor_at", "nullable": True},
            {"q": "E.s2_determinations_locked_at", "nullable": True},
            {"q": "E.s1_output_unmasked_at", "nullable": True},
        ],
        "extra_columns": ["created_at timestamptz not null default now()"],
    },
    {
        "name": "t3a_determination", "mode": "insert_only",
        "comment": "Domain E determinations: a controlled answer to a controlled question. Codes and identifiers only; there is no free text column.",
        "key_columns": ["observation_id uuid not null references public.t3a_observation(observation_id)"],
        "fields": [
            {"q": "E.determination_id", "pk": True, "default": "gen_random_uuid()"},
            {"q": "E.question_id", "ref": "public.t3a_determination_question(question_id)"},
            {"q": "E.answer_option_id", "nullable": True},
            {"q": "E.list_selection_ids", "type": "uuid[]", "nullable": True},
            {"q": "E.determination_missing_state"},
            {"q": "E.determined_by"}, {"q": "E.determined_at", "default": "now()"},
            {"q": "E.clause_instance_id"}, {"q": "E.conduct_element_id"}, {"q": "E.recurrence_equivalence_key_id"},
            {"q": "E.state_code", "checks": ["check (state_code ~ '^[A-Za-z0-9_.:-]{1,64}$')"]},
        ],
    },
]
