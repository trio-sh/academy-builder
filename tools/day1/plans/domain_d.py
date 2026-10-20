"""Domain D plan: sources, determinations and served instances (store REG, EVD). Existing source tables are extended in place."""
TITLE = "sources, versions and served instances"
MIGRATION = "20261107000000_day1_sources"

def E(q, col=None, cls=None, **kw):
    d = {"q": "D." + q, "exists": True}
    if col: d["col"] = col; d["mapping_class"] = cls or "M3"
    return {**d, **kw}

def N(q, **kw):
    return {"q": "D." + q, **kw}

COMPARISON = ["comparison_family_id", "comparison_demand_id", "observation_opportunity_id", "demand_conditions_version", "form_relationship_id", "variation_intent"]

TABLES = [
    {"name": "t3a_source", "extend": True, "fields": [
        E("source_id"), E("source_created_at", "created_at"),
        N("source_bank_id"), N("source_display_title"), N("source_created_by"), N("source_effective_from"), N("source_effective_until"),
        N("source_material_manifest_ref"), N("situation_class"), N("secondary_situation_class"), N("interaction_pattern_family_id"),
        N("administration_form_id"), N("name_clearance_status"), N("serving_eligible"), N("content_sensitivity"),
        N("atlas_moment_id"), N("atlas_terrain_id"), N("beat_sequence"), N("situation_context"),
        N("comparison_family_id"), N("comparison_demand_id"), N("observation_opportunity_id"), N("demand_conditions_version"),
        N("form_relationship_id"), N("variation_intent", type="text"), N("longitudinal_use_status"),
        N("capture_catalog_version"), N("resolution_rule_version"), N("delivery_script_version"),
    ]},
    {"name": "t3a_source_version", "extend": True, "fields": [
        E("source_version_id"), E("source_version_hash"), E("scenario_class"), E("relevant_conduct"), E("irrelevant_conduct"),
        E("stated_standard", "stated_standard", "M3", note="live column is text; the dictionary type is an object (CR-043)"),
        E("permitted_administration_variance", "permitted_administration_variance", "M3", note="live column is text; the dictionary type is an object (CR-043)"),
        E("unsupported_inferences"), E("cross_context_map"), E("min_seconds"), E("max_seconds"), E("compatibility_class"), E("approved_at"),
        N("source_status"), N("approval_record_id"), N("approval_authority"), N("version_change_reason"),
    ]},
    {"name": "t3a_rendered_instance", "extend": True, "fields": [E("presentation_variant_values"), E("rendered_instance_hash")]},
    {"name": "t3a_stage_entry_event", "extend": True, "fields": [E("randomization_seed", note="live column is bigint; the dictionary type is text (CR-043)")]},
    {
        "name": "t3a_served_instance", "mode": "insert_only",
        "comment": "Domain D served instance: what was shown, in which language, under which rule and engine versions. Insert only.",
        "key_columns": ["participant_id uuid not null", "source_version_id uuid not null references public.t3a_source_version(source_version_id)",
                        "stage_entry_event_id uuid references public.t3a_stage_entry_event(stage_entry_event_id)", "rendered_instance_id uuid references public.t3a_rendered_instance(rendered_instance_id)"],
        "fields": [
            {"q": "D.served_instance_id", "pk": True, "default": "gen_random_uuid()"}, {"q": "D.served_at", "default": "now()"},
            {"q": "D.question_set_version"}, {"q": "D.statement_library_version"}, {"q": "D.answer_key_version"}, {"q": "D.recurrence_key_version"},
            {"q": "D.template_register_version"}, {"q": "D.stage1_engine_version"}, {"q": "D.stage1_script_version"}, {"q": "D.served_language"},
        ],
    },
    {
        "name": "t3a_ai_provenance_socket", "mode": "insert_only", "socket": True,
        "comment": "Domain D SOCKET: AI model and prompt provenance. Structure only; every write is refused.",
        "key_columns": ["served_instance_id uuid"],
        "fields": [{"q": "D.ai_model_deployment_id", "nullable": True}, {"q": "D.ai_prompt_hash", "nullable": True},
                   {"q": "D.ai_system_message_version", "nullable": True}, {"q": "D.ai_output_schema_version", "nullable": True}],
    },
]
