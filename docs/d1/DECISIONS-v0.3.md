# D1 Decisions v0.3 · INS-005 → INS-010

Auto-close register for open questions carried through the second half
of the D1 build. Every entry names the ticket, the question, the
auto-closed answer, and the fail-closed hook that enforces the answer
until a founder call lands.

Standing directive (Tony, from the WR-FREE window):
> "auto close the questions make reasonable assumptions and complete the changes"

---

## INS-005 · Sufficiency and Report Language Gating

**Migration:** `20260907000000_t3a_d1_sufficiency.sql`

| # | Open question | Auto-close | Enforcement hook |
|---|---------------|------------|------------------|
| 1 | Which output shapes are prohibited under the "no visual signal" rule? | TRAFFIC_LIGHT, PROGRESS_OR_COVERAGE, GLYPH_METER, EMOJI_SIGNAL, BLANK_ROW_MARKER. | `t3a_d1_prohibited_output_scan(text)` refuses any renderer that emits one of these. |
| 2 | Where does the issuance floor live if FD-D1-03 is UNSET? | Singleton row `t3a_d1_issuance_floor_config` seeded at `not_approved`; render refuses with `ISSUANCE_FLOOR_UNSET`. | `t3a_d1_render_report_language(...)` reads the singleton. |
| 3 | What is the language-template register at S1? | 14-template seed in `t3a_d1_language_template`; every S1 template's evidence_state clause reads `insufficient` until FD-D1-04 lands. | Render refusals: 8 reasons, all fail-closed. |

---

## INS-006 · Participant review, correction, reconsideration, amendment

**Migration:** `20260909000000_t3a_d1_participant_review.sql`

| # | Open question | Auto-close | Enforcement hook |
|---|---------------|------------|------------------|
| 4 | What states does a BER report cycle through before issuance? | `participant_review → challenge_open → ready_to_issue → issued → amended | withdrawn`. | `t3a_d1_ber_status` enum + transition trigger on `t3a_d1_ber_report`. |
| 5 | Who may read a confidential concern raised by a participant? | Never the observing mentor. Reviewer role only. | RLS on `t3a_d1_confidential_concern`. |
| 6 | How is a correction case linked back to an issued report? | `t3a_correction_case.ber_report_id` FK; correction case terminates with `challenge_status` and `terminal_outcome`. | `t3a_d1_raise_correction()` writes both. |
| 7 | What blocks issuance when a reconsideration is open? | `t3a_d1_can_issue()` returns non-NULL while any `t3a_reconsideration_assignment.ins006_state = 'awaiting_information'`. | INS-007's `t3a_d1_issue_report` calls it. |

---

## INS-007 · Evidence review, rendering, issuance, disclosure, verification

**Migration:** `20260910000000_t3a_d1_issuance_and_disclosure.sql`

| # | Open question | Auto-close | Enforcement hook |
|---|---------------|------------|------------------|
| 8 | Who calls `t3a_d1_issue_report` while FD-D1-04 is UNSET? | Nobody. Function refuses with `EVIDENCE_REVIEW_AUTHORITY_UNSET` under any environment other than `synthetic_test_only`. | The refusal is unconditional; there is no override. |
| 9 | How is disclosure revoked in a way holders of an existing token notice? | `t3a_d1_verify_by_token` re-checks `t3a_d1_report_disclosure.state` on every call. Revoked disclosures return `verified: false, reason: DISCLOSURE_REVOKED`. | Anon-callable RPC. |
| 10 | Are tokens stored plaintext? | No. SHA-256 hash stored via `extensions.digest`; 8-char plain prefix stored for lookup only. | `t3a_d1_report_verification_token.token_hash` + `token_prefix`. |
| 11 | How does amendment interact with the prior issuance? | Prior issuance stays `superseded` and remains verifiable via its own token. New issuance is a new row with `supersedes = prior.id`. | `t3a_d1_amend_issued_report()`. |

---

## INS-008 · Calibration and assurance

**Migration:** `20260911000000_t3a_d1_calibration_and_assurance.sql`

| # | Open question | Auto-close | Enforcement hook |
|---|---------------|------------|------------------|
| 12 | Does calibration feed report language? | No. Calibration is reviewer-facing telemetry. INS-005's renderer does not read from these tables. | Documented in the migration §. No FK. |
| 13 | Who reads the computed agreement figure while FD-D1-04 is UNSET? | Nobody. `t3a_d1_get_calibration_agreement` refuses with `EVIDENCE_REVIEW_AUTHORITY_UNSET` under any non-synthetic environment. | Guarded in the function body. |
| 14 | What does an "assurance check" actually check? | A deterministic re-derivation of a fact the system has already committed to. `issued_body_hash` re-hashes rendered_body and compares to stored `rendered_body_hash`; `disclosure_state_matches_token` checks tokens against disclosure state; `version_set_still_readable` walks the frozen jsonb. | `t3a_d1_run_assurance_sweep(kind)` writes append-only check rows. |
| 15 | May calibration read or expose report bodies? | Never. Only the hash is re-derived; bodies are not read by any INS-008 function. | Enforced by construction. |

---

## INS-009 · G1 controlled pilot

**Migration:** `20260913000000_t3a_d1_pilot_cohort.sql`

| # | Open question | Auto-close | Enforcement hook |
|---|---------------|------------|------------------|
| 16 | Does the pilot gate reopen issuance? | No. The gate governs upstream paths only; INS-007 issuance still refuses regardless of pilot membership. | `t3a_d1_pilot_gate()` never touches INS-007. |
| 17 | Can a cohort's terms be edited after opening? | No. Terms freeze at `state=open` via `t3a_d1_pilot_cohort_transition()`. | Trigger raises `PILOT_COHORT_TERMS_IMMUTABLE_AFTER_OPEN`. |
| 18 | How is the event log made tamper-evident? | Per-cohort SHA-256 chain seeded from `digest('t3a-d1-pilot-cohort-' || cohort_id, 'sha256')`. Each row's `chain_hash = extensions.digest(prev_chain_hash || row_fields, 'sha256')`. | Chain break signals tampering; UPDATE and DELETE also blocked at trigger level. |
| 19 | Are there per-participant exception paths in the gate? | No. REC-10 UNSET → gate has no exception branch. Every refusal is on-record via `gate_refused` events. | Documented in the migration §. |

---

## INS-010 · G2 production release

**Migration:** `20260914000000_t3a_d1_production_release.sql`

| # | Open question | Auto-close | Enforcement hook |
|---|---------------|------------|------------------|
| 20 | Can the release gate ever be softened for a specific promotion? | No. There is no override, no "waive with note" path. Every listed blocker must clear. | `t3a_d1_production_release_gate()` has no override branch. |
| 21 | How is an author-locked decision landed once the founder decides? | An admin updates the row in `t3a_d1_authority_register` with `state = 'SET'` and the payload. SET rows are frozen; supersession is DEPRECATED + new row. | `t3a_d1_authority_register_transition()` enforces immutability. |
| 22 | What is a valid rollback target? | `pilot_active` or `observation_capable_inactive`. Nothing else. | `t3a_d1_rollback_from_production` refuses other targets with `INVALID_ROLLBACK_TARGET`. |
| 23 | Who moves `env_state` to `production_active`? | Only `t3a_d1_promote_to_production(release_id)`, and only if the gate returns NULL. Direct UPDATE bypasses the gate but is admin-only per INS-001 RLS. | The gate-checked path is the one blessed writer. |

---

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
