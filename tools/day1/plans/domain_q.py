"""Domain Q plan: aggregate outputs, licensing, research and follow-up (all SOCKET). Built and closed: every write is refused."""
TITLE = "aggregate, licensing, research and follow-up structures (closed)"
MIGRATION = "20261120000000_day1_aggregate_sockets"

def S(name, comment, fields):
    return {"name": name, "mode": "insert_only", "socket": True, "comment": comment, "key_columns": [], "fields": fields}

def F(q, **kw):
    return {"q": "Q." + q, "nullable": True, **kw}

TABLES = [
    S("t3a_aggregate_dataset_socket", "Domain Q SOCKET: aggregate dataset definitions, metrics, outputs and their disclosure controls. Structure only; every write is refused.",
      [F(n) for n in ["aggregate_dataset_definition_id", "suppression_floor_k", "output_id", "framing_disclaimer_version", "delivered_at", "metric_definition_id",
                      "metric_definition_version", "metric_allowed_use_ref", "analysis_population_rule_ref", "analysis_time_window_ref", "aggregate_source_snapshot_digest",
                      "aggregate_denominator_count", "aggregate_unknown_count", "source_version_mix_ref", "stage_mix_ref", "reidentification_review_ref", "publication_authorization_ref"]]
      + [F("public_trend_count_series"), F("concentration_risk_result")]),
    S("t3a_licensee_socket", "Domain Q SOCKET: licensees and licence terms. Structure only; every write is refused.",
      [F("licensee_id"), F("license_terms_version"), F("misuse_termination_at")]),
    S("t3a_research_socket", "Domain Q SOCKET: research protocol, ethics approval and consented attributes. Structure only; every write is refused.",
      [F("research_protocol_id"), F("ethics_approval_ref"), F("consented_attribute_record")]),
    S("t3a_followup_socket", "Domain Q SOCKET: follow-up windows and responses. Structure only; every write is refused.",
      [F("followup_window"), F("followup_sent_at"), F("followup_response_status"), F("question_set_version"), F("verification_level"), F("delivery_channel")]),
]
