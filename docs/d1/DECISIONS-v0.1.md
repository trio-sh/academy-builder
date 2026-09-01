# T3A D1 Observation Pathway — Auto-Close Register v0.1

**Status:** Recorded on 1 September 2026, following the Founder's direction to auto-close the ten open questions from Design Return v0.1 with the fail-closed positions the return proposed. This document is the audit trail of the closes and the interim rules now live in code.

Any change to any row below is a new migration, not an in-place edit.

| # | Question | Auto-close disposition |
| --- | --- | --- |
| 001 | INS-001 instruction 008 — which content families are in scope for the first build? | All eight families are provisioned in `t3a_content_family`. Only `construct`, `determination_question_set`, `statement_library`, `source` and `configuration` are read by the observation paths. The other three (`ai_administration_ruleset`, `role_authority`, `rights_ruleset`) exist as schema stubs; nothing reads them until a founder decision widens scope. `calibration_clearance` exists as a lineage-only family per the CA-14 acceptance row. |
| 002 | REC-04 retention rule for superseded versions | UNSET. No purge runs against `t3a_content_version`. A scheduled purge job is **not created**. Superseded rows remain readable indefinitely, which is the safe default until counsel-approved retention lands. |
| 003 | Section D8 pilot exception — active for first build? | INACTIVE. Not implemented. The involvement test carries no pilot-exception path; every consequential action is fully separated. When the exception is approved, it lands as an explicit column on `t3a_role_authorization` plus a scoped bypass in `t3a_involvement_test`. |
| 004 | REC-11 identity provider and refusal behaviour | UNSET. `public.t3a_registration_identity_policy()` returns `IDENTITY_ASSURANCE_UNAVAILABLE`. On `pilot_active` and `production_active` environments, `public.t3a_open_stage_entry` refuses with `IDENTITY_ASSURANCE_REQUIRED`. On `design_only` and `synthetic_test_only`, a stub receipt string `stub-receipt` is written to `session_identity_receipt_id` so the cockpit has something to render for design review. |
| 005 | REC-10 attempt-exception dispositions | ALL SIX FAIL CLOSED. The six events listed at Section N4 are not attached to any handler in this build. They will surface as unknown outcomes on `t3a_attempt` and neither consume nor forgive an attempt — the caller must retry or route to admin. |
| 006 | FD-D1-05 fourth progression value | EXCLUDED. `public.t3a_progression_value` is a closed enum of three values: `proceed`, `redirect`, `pause`. A fourth value is not implemented as a disabled enum on developer inference. Widening the enum requires a new migration and a Founder decision. |
| 007 | FD-D1-03 interim issuance floor | DEFERRED. The issuance floor gates INS-005 (Sufficiency and Report Language). INS-005 is not in this batch. The current batch surfaces no report and refuses to issue one. |
| 008 | Meeting-room infrastructure feeding `session_link_ref` before Batch 4 Note 10 | STUB. The Cockpit's Participant Live View pane renders a placeholder card naming Note 10. No meeting link is created, held or displayed. |
| 009 | Stage 4 (REC-12) | REFUSED. `public.t3a_open_stage_entry` raises `STAGE_4_DISABLED_REC12` unconditionally when called with `stage_code = 'S4'`. |
| 010 | Design Return receipt | ACKNOWLEDGED as "approved as returned" on 1 September 2026. Implementation proceeds. |

## Non-negotiables carried forward

- **Two-step rule** — subsequent instruction packages (INS-003 statement library, INS-005 sufficiency, INS-006 review, INS-007 issuance, INS-008 calibration, INS-009 pilot, INS-010 production, INS-012 Stage 1 administration) receive their own design return before any code lands.
- **Environment default** — every deployment starts at `env_state = design_only` and only moves to `pilot_active` or `production_active` by an operations record referenced in the deploy manifest.
- **Prohibited-term guard** — `public.t3a_reject_prohibited_terms` runs on every content-version insert. The static build-time scanner `scripts/check-vocabulary.mjs` remains authoritative for source and doc text; the runtime guard catches the escaped case.

## Follow-up asks that stay on the standing list

- FD-D1-03 issuance floor decision — blocks INS-005.
- REC-04 superseded retention rule — blocks any purge/archive job.
- REC-07 per-source approvals + name clearance — until each source version has both, `t3a_content_is_servable` returns false and the source is unreachable from observation-capable routes.
- REC-10 attempt-exception dispositions — until settled, the six events fail closed and can only be reconciled by an admin.
- REC-11 identity assurance provider + policy — blocks all real Stage entry.
- REC-12 Stage 4 shared-session rights and data-handling approval — blocks Stage 4.
- Batch 4 Note 10 (Schedule / Sessions / Meet space) — blocks the Cockpit's live pane.

*End of v0.1. On any future close of a row above, a new revision (v0.2) is appended rather than the existing rows being edited.*
