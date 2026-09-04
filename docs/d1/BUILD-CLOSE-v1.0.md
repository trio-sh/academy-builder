# D1 Observation Pathway — Build Close v1.0

**Status:** INS-001 through INS-010 shipped and live-verified.
**Date closed:** 4 September 2026.
**Branch:** `claude/send-email-zoho-smtp-port-j32gkk`.

This document summarizes what landed for the D1 Observation Pathway
build (Package v1.1), verifies the invariants that hold across the
whole surface, and enumerates every author-locked decision that must
be set before D1 can be promoted to `production_active`.

---

## 1 · Build order — status per position

| # | Package | Migration | Status |
|---|---------|-----------|--------|
| 1 | INS-001 · Content Registry, Versioning, Source Lineage | `20260901000000_t3a_d1_content_registry.sql` | live |
| 2 | INS-011 · Role & Progression | `20260902000000_t3a_d1_role_and_progression.sql` | live |
| 3 | INS-004 · Gateway & Source | `20260903000000_t3a_d1_gateway_and_source.sql` | live |
| 4 | INS-002 + Cockpit · Foundation | `20260903000000_t3a_d1_gateway_and_source.sql` + `src/pages/dashboard/mentor/Cockpit.tsx` | live |
| 5 | INS-003 · Statement Library | `20260904000000_t3a_d1_statement_library.sql` | live |
| 6 | (repair) Silent-failure fix | `20260905000000_t3a_d1_repair_and_namespace.sql` | live |
| 7 | INS-012 · Stage 1 administration | `20260906000000_t3a_d1_stage1_admin.sql` | live |
| 8 | INS-005 · Sufficiency & Report Language Gating | `20260907000000_t3a_d1_sufficiency.sql` | live |
| 9 | INS-006 · Participant review, correction, reconsideration, amendment | `20260909000000_t3a_d1_participant_review.sql` | live |
| 10 | INS-007 · Evidence review, rendering, issuance, disclosure, verification | `20260910000000_t3a_d1_issuance_and_disclosure.sql` | live |
| 11 | INS-008 · Calibration & Assurance | `20260911000000_t3a_d1_calibration_and_assurance.sql` | live |
| 12 | INS-009 · G1 Controlled Pilot | `20260913000000_t3a_d1_pilot_cohort.sql` | live |
| 13 | INS-010 · G2 Production Release | `20260914000000_t3a_d1_production_release.sql` | live |

Adjacent work shipped in the same window:
- WR-FREE-001 release lifecycle · `20260908000000_t3a_wr_free_release.sql`
- Messaging FK fix (unrelated to D1 but shipped from the same branch) ·
  `20260912000000_messages_missing_foreign_keys.sql`

---

## 2 · Invariants that hold across the whole surface

- **Environment gate.** Every real-path call reads
  `t3a_current_env_state()` and refuses under `design_only` and
  `observation_capable_inactive`. See INS-001 §1.
- **Fail-closed floors.** Nothing that requires an author-locked
  decision runs on assumed values. Where a decision is UNSET, the
  path refuses with a named reason (e.g. `EVIDENCE_REVIEW_AUTHORITY_UNSET`
  from INS-007's `t3a_d1_issue_report`).
- **Historical rendering.** The version set that a participant saw at
  review is captured on the issuance row
  (`t3a_d1_report_issuance.version_set_at_issuance`) and frozen. Later
  content changes never mutate a prior issuance.
- **Amendment by supersession.** `t3a_d1_amend_issued_report` creates
  a new issuance row referencing the prior; the prior remains
  verifiable via its own token and is marked `superseded`.
- **Extensions-qualified hashing.** Every SHA-256 and every
  random-token mint uses `extensions.digest` and
  `extensions.gen_random_bytes`; nothing relies on `search_path`. See
  POST-MORTEM v0.1.
- **Append-only audit surfaces.** `t3a_d1_pilot_event` blocks UPDATE
  and DELETE at the trigger level; its chain hash breaks on any prior
  row tampering (INS-009).
- **Vocabulary lock.** No forbidden identifiers survive
  `scripts/check-vocabulary.mjs` on any migration or on any UI file.

---

## 3 · Author-locked decisions still UNSET

The G2 production-release gate reads
`t3a_d1_authority_register`. Every row below is seeded UNSET; the
gate refuses on first call while any row is UNSET. Founder input
required for each.

| Key | Category | What it decides |
|-----|----------|-----------------|
| FD-D1-03 | Founder decision | Issuance floor — the minimum condition under which any BER report may issue. |
| FD-D1-04 | Founder decision | Evidence-review authority — the role that clears an issuance for publication. |
| FD-D1-05 | Founder decision | Progression values (three-value set). |
| FD-D1-08 | Founder decision | Fourth-state frame — whether one exists and, if so, how it is worded. |
| FD-D1-09 | Founder decision | Route-language rule — the exact wording constraint on Stage 1 statements. |
| FD-D1-11 | Founder decision | Non-response timeout — the interval after which a review lapse blocks issuance. |
| REC-04 | Unresolved rule | Retention — purge policy across every D1 table. |
| REC-07 | Unresolved rule | Source approval — who may publish new content versions. |
| REC-10 | Unresolved rule | Attempt exceptions — whether any per-participant exception path exists. |
| REC-11 | Unresolved rule | Identity provider — how a participant's identity is bound to their evidence. |
| REC-12 | Unresolved rule | Stage 4 — whether it exists at all and, if so, its capture surface. |

Each row is flipped to `SET` by an authorized administrator with a
`payload` jsonb whose shape is defined per key. Once set, rows are
frozen (`AUTHORITY_PAYLOAD_IMMUTABLE_ONCE_SET`); supersession requires
an explicit `DEPRECATED` transition and a new row.

---

## 4 · Gate composition (INS-010 §5)

`t3a_d1_production_release_gate()` returns `NULL` (go) only when:

1. Every row in `t3a_d1_authority_register` has `state = 'SET'`.
2. At least one `t3a_d1_pilot_cohort` is in `state = 'closed'` and has
   a `readiness_snapshot` event on `t3a_d1_pilot_event`.
3. The latest `t3a_d1_assurance_check` sweep for both
   `issued_body_hash` and `version_set_still_readable` shows zero
   `mismatch` results across all targets.

Any failure returns a jsonb blocker list naming every unmet condition.
There is no override.

---

## 5 · What is not part of the D1 build (deferred)

These items sit outside the INS build sequence and wait on either
founder input or an out-of-band decision.

- Public verifier UI wiring for `/verify/ber/:token` — RPC exists (INS-007),
  next UI pass wires the existing `VerifyBER` page to
  `t3a_d1_verify_by_token`.
- Coordinator issuance UI — issuance is `service_role` only today
  (per FD-D1-04 UNSET). Once the authority lands, a coordinator surface
  wrapping `t3a_d1_issue_report` under `activation_governance` role
  authority becomes possible.
- Amendment orchestration wiring — INS-006 → INS-007 supersession
  call chain (the primitives are landed; the orchestration UI is not).
- WR-FREE full-module reproduction — waits on founder-supplied paid
  module JSON.

---

## 6 · Guardrails carried forward from POST-MORTEM v0.1

Two guardrails hold across every migration going forward:

1. **Schema-qualify every extension function.** Never write bare
   `digest(...)` or `gen_random_bytes(...)` — always
   `extensions.digest(...)` / `extensions.gen_random_bytes(...)`.
   pgcrypto lives in the `extensions` schema, not `public`, and
   relying on `search_path` fails silently under the
   `exec_claudecode_query` RPC gateway.
2. **Verify each new object separately.** After every migration,
   issue `SELECT 1 FROM <table> LIMIT 0` (or a refusal-path RPC call)
   for each new table and function. `scratchpad/apply-migration.mjs`
   parses per-statement `{"error": …}` bodies as failures; do not
   trust HTTP-200 as success.

---

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
