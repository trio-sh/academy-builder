# T3A D1 Observation Pathway — Developer Design Return · v0.1

**Status:** Draft — RETURNED FOR APPROVAL. This document is the design-return artifact required by Part One Section 1.3 step 003 and Part Two Part B Section B5 of the D1 Complete Build Package v1.1 (issued 29 August 2026). It covers the four foundation packages and the Mentor Cockpit addendum, in the order Part One Section 2 requires them to be built.

**Author:** Lead Platform Developer, The 3rd Academy Inc.
**Return date:** 1 September 2026.
**Scope of this return:** T3A-D1-DEV-INS-001, T3A-D1-DEV-INS-011, T3A-D1-DEV-INS-004, T3A-D1-DEV-INS-002 and the Mentor Cockpit design addendum. Later returns will cover INS-003, 005, 006, 007, 008, 012, 009, 010 in that order.

> **What this document is.** The schema, interfaces, states, refusals and audit fields I infer from the four packages above, so that any difference between my reading and the controlled answer is found before code exists. Per the two-step rule, no implementation begins on any component below until this return is approved. Where an item is at Section 4B or depends on an open FD-D1-*/REC-* value, it is stated as fail-closed rather than assumed. Every open question is listed at Section 6 with the exact instruction number it belongs to.

> **What this document is not.** A build authorization. A change to the specification. A resolution of any open founder decision or configuration record.

---

## 1. Environment capability state (INS-004 instruction 037)

A single service-layer enum enforces what the environment may do, independent of what content has loaded. The value is set per deployment and read at every consequential action.

| State | Gateway creation | Stage entry | Real consent capture | Real observation capture | Issuance | Disclosure | Employer access |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `design_only` | refuse | refuse | refuse | refuse | refuse | refuse | refuse |
| `synthetic_test_only` | allow, synthetic participant only | allow, synthetic only | refuse | allow, synthetic only | refuse | refuse | refuse |
| `observation_capable_inactive` | refuse | refuse | refuse | refuse | refuse | refuse | refuse |
| `pilot_active` | allow, pilot cohort only | allow, pilot cohort only | allow, pilot consent record | allow | allow with `pilot_use = true` | refuse | refuse |
| `production_active` | allow | allow | allow | allow | allow | allow subject to R3 rules | allow subject to R3 rules |

- At issue the current environment is `design_only`. Every real path refuses, regardless of what else has loaded. Every refusal writes to the audit log with `env_state`, `attempted_action`, `actor_id`, `reason_code = ENV_CAPABILITY`.
- The Vercel preview deployments and any developer-machine build inherit `design_only` unconditionally. `pilot_active` and `production_active` are set only by an operations record referenced in the deploy manifest.

---

## 2. INS-001 — Content Registry, Versioning and Source Lineage

Build order position 1. Every other package writes into this registry. Section reads: A3–A6, A7, C5, CA-14 (Wave 7).

### 2.1 Entities

| Entity | Purpose | Notes |
| --- | --- | --- |
| `t3a_content_object` | One row per controlled content object of any family. Carries identifier, family, current approved version, current operational state. | Family enum below. |
| `t3a_content_version` | Immutable version history of a content object. Every approved change writes a new row; nothing is edited in place. | `(content_object_id, version_no)` unique. |
| `t3a_version_lineage` | Parent-child relationships across families (a determination question version is bound to a construct version; a source version is bound to a determination question set version). | Enforces the rule that later content never silently rewrites earlier meaning. |
| `t3a_change_classification` | For each version change: kind (`editorial`, `semantic`, `source`, `administration`, `retirement`), calibration-clearance-affecting flag, prior-clearance-carry-over evaluation, actor, effective date. | Prior clearance is never migrated silently (INS-001 instruction 014). |
| `t3a_rendered_instance` | For a served source: `canonical_source_hash`, `presentation_variant_values`, `rendered_instance_hash`. | INS-001 instruction 011. Proves what the participant actually saw. |
| `t3a_content_load_event` | For every load to an observation-capable environment: which environment, which content object + version, who loaded, when, and the four governed statuses. | Serves the CA-15 load manifest. |

### 2.2 Version-family table (INS-001 instruction 013)

Eight families, one lineage row per family per version transition.

`construct`, `determination_question_set`, `statement_library`, `source`, `ai_administration_ruleset`, `role_authority`, `rights_ruleset`, `configuration`.

An additional lineage row of family `calibration_clearance` is written whenever a change-classification event evaluates prior clearance. This is the row CA-14 requires so that at any historical moment we can reconstruct which calibration clearance applied to which exact `(content_object, version)` set.

### 2.3 Two-axis status model (Part A Sections A4.1 / A4.2)

Two orthogonal fields per version row:

- `approval_status`: `not_started` | `drafting` | `in_review` | `approved` | `superseded` | `retired`. `approved` requires all three of a version, a named approval authority and an effective date. Two-of-three is refused.
- `operational_state`: `not_applicable` | `not_loaded` | `active` | `suspended` | `blocked`. Applies only to loadable families. `retired` is never repeated here (A4.2 rule).

The service layer refuses to render or serve from any row where `approval_status != 'approved'` OR `operational_state NOT IN ('active')`. `superseded` content remains readable but never selected for a new observation.

### 2.4 Historical rendering rule (INS-001 instruction 010)

Two resolution modes:

- **Observation-time rendering**: renders from the versions in force when the observation was made. Every observation row carries a snapshot `version_set_id` that resolves to a set of family/version pairs.
- **Issuance-time rendering**: renders from the versions recorded at issuance on the issued report. The report row carries its own `version_set_id`.

No later content change alters either. The renderer refuses to substitute a current version when either snapshot is present.

### 2.5 Refusals wired now

| Refusal | Trigger | Log fields |
| --- | --- | --- |
| `CONTENT_UNAPPROVED` | Any read from an observation-capable route against an object whose `approval_status != approved`. | actor, object_id, requested_action |
| `CONTENT_INACTIVE` | Any serve against a row whose `operational_state != active`. | actor, object_id, current_state |
| `CONTENT_HISTORY_OVERWRITE` | Any write that would replace a historical foreign key. | actor, target_row, target_version |
| `CONTENT_PROHIBITED_TERM` | Any migration, field, API, template or export introducing a term on the AC-61 forbidden list. | actor, term, location |

### 2.6 Audit fields on every row

`created_at`, `created_by`, `updated_at`, `updated_by`, `approved_by`, `approved_at`, `deprecated_at`, `retired_at`. The append-only nature is enforced by RLS: no `UPDATE` policy exists on `t3a_content_version`; corrections write a new version.

### 2.7 Refused to invent (Section 4B holds)

- **REC-04 (superseded-version retention rule)** is not approved. No retention or destruction runs against `t3a_content_version` until REC-04 loads. All rows are retained indefinitely as the safe default; a scheduled purge job is written but disabled.
- **Which content families are in scope for the first build?** Question 001 at Section 6. Until answered every family is provisioned as a schema stub; only construct + determination + statement + source + configuration are wired into the observation paths.

---

## 3. INS-011 — Progression, Role Authorization and Independence Routing

Build order position 2. Sections read: Part D in full, D4.3, E2.1, E5, E6, N1–N3.1, M3, M4.

### 3.1 Entities

| Entity | Purpose |
| --- | --- |
| `t3a_role_authorization` | A dimension-scoped, Stage-scoped, authority-scoped authorization row for one actor. Carries `status`, `granted_by`, `granted_at`, `expires_at`, `suspended_at`, `withdrawn_at`, `calibration_clearance_ref`. |
| `t3a_authority_snapshot` | An immutable JSON snapshot of the actor's authorization row as it stood at the exact moment a consequential action ran. Written by the service layer, referenced by the action record. Never edited. |
| `t3a_observation_record` | The unit against which the involvement test runs (Section D4). One row per observation; carries dimension, Stage, participant, observer, timestamps, source_version_id, question_set_version_id, statement_library_version_id, `authority_snapshot_id`. |
| `t3a_correction_case` | Parent case for a raised correction. **One reconsideration assignment per affected observation record** (Section D4.3, INS-011 instruction 026). |
| `t3a_reconsideration_assignment` | Child rows of a correction case, one per affected observation. Each has its own eligibility evaluation and its own assigned reconsiderer. |
| `t3a_progression_decision` | Per (participant, dimension) decision row. Three values only under FD-D1-05 interim: `proceed`, `redirect`, `pause`. `pause_cleared_at` and `pause_cleared_by` capture N3.1 clearing. |
| `t3a_conflict_declaration` | An actor's declared conflict for a given (participant | source_family | organization). Feeds the involvement test. |

### 3.2 The eight authorities (Part D Section D2)

Enum `t3a_authority`:

- `observe`
- `confirm`
- `record_progression`
- `evidence_review`
- `issue`
- `reconsider`
- `operational_coordination_quality`
- `activation_governance`

Each authorization row scopes to one authority + one dimension + one or more Stages. The first six require current calibration clearance for the dimension (Section 2 of the Mentor Authorization pack); the last two do not.

### 3.3 The involvement test (Section D4)

Runs at routing time, again at every consequential action, and again when a correction case re-evaluates. Fail-closed. Its arguments are `(actor_id, observation_record_id, requested_authority)`. It returns `ELIGIBLE` or an ineligibility reason.

Ineligibility reasons implemented:

- `PRIOR_OBSERVER_OF_RECORD`
- `PRIOR_CONFIRMER_OF_RECORD`
- `PRIOR_PROGRESSION_RECORDER_FOR_PARTICIPANT_DIMENSION`
- `PRIOR_ISSUER_OF_REPORT_CONTAINING_RECORD`
- `PRIOR_RECONSIDERER_OF_RECORD`
- `DECLARED_CONFLICT`
- `INSUFFICIENT_AUTHORIZATION`
- `CALIBRATION_LAPSED`
- `INVOLVEMENT_TEST_HARD_BLOCK` (fallback where no eligible actor exists — event escalates for assignment, per INS-011 instruction 028)

No role, interface, admin action, or configuration flag may override the test. This is enforced at the data layer via a `SECURITY DEFINER` function; every write on the six evidence tables calls it in `WITH CHECK`.

### 3.4 Separation of actions (Section D7)

Every consequential action writes to its own table. The service layer refuses a single "Confirm and Proceed" or "Determine and Confirm" write. Section D7.1's stage-dependent ordering is captured in `t3a_action_sequence_rule` seeded from Part D.

### 3.5 Progression decision service

Enum `t3a_progression_value`: `proceed | redirect | pause`. Per **FD-D1-05 interim** the domain is closed to three values. A fourth value is **NOT** implemented as a disabled enum — that is question 011 at Section 6 and must be answered before I widen the enum.

Section N3.1 clearing:

- `pause` clears only through a governed action of authority `record_progression` where the clearing actor passes the involvement test freshly for the record family that produced the pause.
- Clearing writes a new row on `t3a_progression_decision` referencing the paused row; the paused row is not edited.

### 3.6 Fail-closed routing

`t3a_reconsideration_assignment.status = 'HELD_OPEN'` when no eligible actor exists. The affected report does not issue. The event escalates via `t3a_assignment_escalation`; the record is not decided by an ineligible actor.

### 3.7 Correction case data model (INS-011 instruction 026)

One `t3a_correction_case` — one row.
Multiple `t3a_reconsideration_assignment` — one row per affected observation.

The eligibility evaluator is invoked once per assignment; the two assignments produced by a correction spanning two observations are evaluated independently and may resolve to different reconsiderers.

### 3.8 Refused to invent

- **Section D8 pilot exception** — is it active for the first build, and what is its expiry trigger? Question 012 at Section 6.
- **FD-D1-05 fourth value** — question 011 at Section 6.

---

## 4. INS-004 — Source Registry, Observation Gateway and Stage Entry Event

Build order position 3. Sections read: Part K in full; Part L Sections L1–L3; Part N Sections N2, N4, N4.1; Part J Sections J2, J4; CA-15 (Wave 7).

### 4.1 Two objects, not one (Section L1)

| Object | Cardinality | Purpose |
| --- | --- | --- |
| `t3a_observation_gateway` | Exactly one per participant per dimension | Written when the participant first enters a governed observation route for that dimension. Records dimension, participant, initial route, registration identity assurance ref, creation snapshot. |
| `t3a_stage_entry_event` | Exactly one per Stage instance, without exception | Written at Stage entry regardless of outcome. Carries stage_code, dimension, participant, source_version_id, presentation_variant_seed, randomization_seed, assistance_rules_version, administration_conditions_snapshot, gateway_id, entered_at. |

The two tables must never be collapsed to one. A Stage Entry Event that finds no gateway refuses at the service layer with `GATEWAY_MISSING`.

### 4.2 Registration and session identity (Part K)

- Registration identity: policy hook `t3a_registration_identity_policy` reads REC-11 configuration. At issue REC-11 is unset; the policy returns `IDENTITY_ASSURANCE_UNAVAILABLE`. All Stage entry attempts on real paths refuse with `IDENTITY_ASSURANCE_REQUIRED` and log a K4-conformant failure without exposing sensitive security detail to the participant.
- Session identity per Stage instance: the Stage Entry Event carries an opaque `session_identity_receipt_id` that references an out-of-band identity assurance transaction. In `design_only` and `synthetic_test_only` this receipt is a stub; in `pilot_active` and `production_active` it is refused unless REC-11 policy returns `AVAILABLE`.

### 4.3 Source registry and serving

`t3a_source` and `t3a_source_version`. Servable if and only if:

1. `t3a_content_object.approval_status = 'approved'` for the source object.
2. `t3a_content_version.operational_state = 'active'` for the specific version.
3. `t3a_source_approval.status = 'approved'` (per-source REC-07 record).
4. `t3a_source_name_clearance.status = 'cleared'` for every `(source_version, presentation_variant_seed)` combination it can render.
5. Prior-exposure check passes for the participant against the source's `interaction_pattern_family` (INS-004 instruction 034) — not just against the exact source_version.
6. Attempt and cooldown check passes per Section N4.

At issue **no source is servable** because REC-07 approvals and name clearances are not in place. This is the correct empty-registry state (Section 2.2 note) and my acceptance tests validate that the registry serves nothing today.

### 4.4 randomization_seed vs presentation_variant_seed (INS-004 instruction 033)

Two separate integer seeds on the Stage Entry Event, drawn from independent random streams:

- `randomization_seed` — selects WHICH source_version to serve, from the eligible pool for (dimension, Stage, participant, cooldown state, exposure state).
- `presentation_variant_seed` — varies names WITHIN a served source_version (per the source sheet's `presentation_variant_values` axis).

Every Stage Entry Event records both. The service layer refuses to record one without the other.

### 4.5 Prior-exposure exclusion (INS-004 instruction 034)

Enforced on `interaction_pattern_family`, not on `source_version_id`. Two source versions carrying the same interaction pattern are mutually excluding for a participant even at different Stages.

### 4.6 Attempts and cooldowns (Section N4)

`t3a_attempt` — one row per initiated Stage instance regardless of outcome (with the six attempt-exception events listed at Section N4, all currently failing closed pending REC-10 disposition — question 013 at Section 6).

Cooldowns computed by a `SECURITY DEFINER` function `t3a_cooldown_status(participant, dimension, stage)` returning `AVAILABLE | ON_COOLDOWN(until) | ATTEMPTS_EXCEEDED`. Values are specification-fixed per Section N4; the timer defends against gaming per Section N4.1.

### 4.7 Configuration loader — four governed statuses (INS-004 instruction 036)

Every configuration row carries one of:

- `APPROVED_ACTIVE`
- `APPROVED_DISABLED`
- `INTERIM_ACTIVE`
- `DISABLED_PENDING_DECISION`

An open item with an approved interim loads as `INTERIM_ACTIVE`. An absent row is `UNSPECIFIED` and the loader **fails the entire load** — no partial load, no silent default.

### 4.8 FD-D1-09 fail-closed interim (INS-004 instruction 078)

Q-D1-06 is not served at Stage 1. No Stage 1 statement may say the participant `used`, `took`, `followed`, `chose` or `acted through` a route. Enforced twice — the question serving service refuses to serve Q-D1-06 for a Stage 1 Entry Event, and the statement composition service refuses to compose a Stage 1 statement whose template contains any of those verbs. Both refusals write to audit with `reason_code = FD_D1_09_INTERIM`.

---

## 5. INS-002 + Mentor Cockpit — Controlled Determination Interface

Build order position 4 (cockpit is position 5).

### 5.1 Two-pane surface

The cockpit is the Stage 2 live-observation surface only. Stage 1 uses the AI administration surface (INS-012). Stages 3 and 4 are blocked at issue.

- **Pane 1 — Source and Script**: renders `source_version.canonical_body` (verbatim) plus `source_version.mentor_action_sequence`. All copy is read-only. The `VIEW SOURCE BRIEF` button opens the current source_version's brief in an audit-logged modal (`source_brief_opened_at`, `source_brief_version_id`).
- **Pane 2 — Determination Capture**: renders the question objects for `(source_version, Stage=S2)` from `t3a_determination_question` in the order fixed by the served source. One primary at a time; conditional children unfold beneath their parent on the parent's selection. `structured_selection` options for Q-D1-03b1, Q-D1-03b2 and Q-D1-06 are drawn from the source sheet's `material_items`, `assertion_reference_set` and `available_routes` fields — never hard-coded.
- **Participant Live View pane**: a peer-to-peer live video pane sourced from the T3A meeting infrastructure. The cockpit does not create rooms or hold links; it consumes a `session_link_ref` written by Schedule per Note 10 (Batch 4). Until Note 10 ships, the pane shows a placeholder saying so.

### 5.2 Session control strip

- `Pause Observation` — writes `t3a_stage_instance_pause` (start, resumed_at, reason). Refuses if the stage is already paused.
- `Pause Timer (S2)` — decouples the participant timer from the mentor's action timer where the source calls for it.
- `End Session (Safe End)` — writes `session_ended_at`; leaves the observation record open for finalization; refuses if any structured selection is required but not answered.
- `Commit Observation Record` — writes the observation record with its snapshot and version_set_id; refuses if any required determination is unanswered, if any child was orphaned, or if the involvement test fails at commit.
- `Confirm S1 Observation` — visible only if this session covers a Stage 1 record that requires the mentor's confirmation authority (INS-012). Refuses if the mentor lacks `confirm` authority for the dimension.
- `Progression Decision` — opens the progression decision surface (INS-011). Refuses if the mentor lacks `record_progression` authority. **Never fires the same click as Confirm** (spec locks these as two persisted actions).

### 5.3 Synchronization, version integrity, recovery, audit

- Every keystroke on Pane 2 is a local draft. `Commit Observation Record` is the only write to `t3a_observation_record`.
- The cockpit re-reads `source_version_id`, `question_set_version_id`, `statement_library_version_id`, `assistance_rules_version` and `administration_conditions_snapshot` from the Stage Entry Event on every mount. If any has changed since the mentor opened the session, the cockpit refuses to commit until the mentor reopens the session with the new version set (INS-002 addendum Section 6).
- On network loss the cockpit holds the draft in `sessionStorage` under a key namespaced to `(stage_entry_event_id, mentor_id)`. On re-connect it verifies the version set is unchanged before offering to resume.
- The audit log receives an event per: pane opened, script scrolled through, source brief opened, each answer selection (with previous value and new value), pause, resume, session ended, commit, refusal.

### 5.4 Required refusals on this screen (INS-002 addendum Section 11)

| Trigger | Refusal | UI copy |
| --- | --- | --- |
| Commit with any required determination unanswered | `DETERMINATION_INCOMPLETE` | "Every required question is answered before this record commits." |
| Commit while the involvement test fails | `INVOLVEMENT_FAILED` | "You may not commit this record. Route it to an eligible mentor." |
| Commit while any structured selection references an option the source no longer serves | `STRUCTURED_SELECTION_STALE` | "The source served here has been updated. Reopen the session before committing." |
| Commit while `env_state != observation_capable_active_or_pilot` | `ENV_CAPABILITY` | "This environment does not accept real observation records." |
| Attempt to write free-text statement | `NO_HANDWRITTEN_STATEMENT` (no field is rendered; this is a service-layer belt-and-braces check) | "Statements are composed by the resolution service. No statement text is authored by hand." |
| Attempt to serve Q-D1-06 at Stage 1 | `FD_D1_09_INTERIM` | "This question is not served at Stage 1." |

### 5.5 What must not be built on this screen (INS-002 addendum Section 10)

- No free-text statement field, anywhere.
- No score, rating, readiness label, badge or points.
- No recommendation copy about the person.
- No employer-facing rehearsal signal.
- No branching decision surface not present in the served question set — every branch is data-driven.
- No connection to Confirmations that fires a confirmation as a side effect of committing a determination. These are two persisted actions. Always.

---

## 6. Questions returned to the Academy

Each carries the instruction number from Part One that it belongs to. An unanswered question is not a design decision I may make.

| # | Belongs to | Question |
| --- | --- | --- |
| 001 | INS-001 instruction 008 | Which of the eight content families are in scope for the first build, and which remain as stubs? |
| 002 | INS-001 (REC-04) | Is there an approved retention rule for superseded versions? |
| 003 | INS-011 (Section D8) | Is the pilot exception active for the first build, and what is its expiry trigger? |
| 004 | INS-004 (REC-11) | What is the identity provider, and what is its service-level refusal behaviour? Please confirm which items in K2.1 are settled. |
| 005 | INS-004 (REC-10) | Confirm the six attempt-exception events all fail closed as I have built them. |
| 006 | INS-011 instruction 011 | FD-D1-05 interim is three values. Is a fourth value in scope as a disabled enum in the data model, or excluded entirely? |
| 007 | INS-002 (FD-D1-03) | Confirm the FD-D1-03 interim issuance floor so I can wire the gate. |
| 008 | Mentor Cockpit | Which meeting-room infrastructure feeds the `session_link_ref` before Batch 4 Note 10 (Schedule redesign) is built? The addendum specifies Google Meet under the T3A workspace; is that the identity used at issue, and what is the fallback if a room is unavailable? |
| 009 | INS-004 (Part J J4A) | Stage 4 activation dependencies (REC-12). Confirm the design_only refusal is sufficient for now and nothing on the Stage 4 path is expected in the first build. |
| 010 | INS-002 addendum Section 12 | The addendum requires a "developer return before implementation approval". This document is that return; please confirm receipt so implementation of the four packages above may proceed. |

---

## 7. What I do next, on approval

Per Part One Section 1.3 step 005: I wait on approval of this design return before touching code.

On approval I will produce, in this order:

1. A single migration `20260901_t3a_d1_content_registry.sql` implementing every entity in Section 2, with RLS scoped so that content object mutations require `activation_governance` authority and reads on unapproved / inactive rows are refused for the observation-capable routes.
2. A migration `20260902_t3a_d1_role_and_progression.sql` implementing Section 3, including the `SECURITY DEFINER` involvement-test function and the correction/reconsideration model with the one-assignment-per-record rule.
3. A migration `20260903_t3a_d1_gateway_and_source.sql` implementing Section 4, including the two-object gateway/stage-entry model, the four-status configuration loader, the FD-D1-09 fail-closed interim, and empty-registry acceptance tests.
4. The Mentor Cockpit UI (React) implementing Sections 5.1–5.5, including the required refusals and the version-integrity re-mount rule.

Each of the four ships as a separate PR that names the instruction number it satisfies and the acceptance evidence Part One requires.

---

## 8. What I have not started

- INS-003 (statement library and deterministic resolution) — waits on INS-002 committing determinations.
- INS-012 (Stage 1 AI administration) — waits on FD-D1-09 interim being wired into INS-002 first.
- INS-005, 006, 007, 008, 009, 010 — later waves.
- Batch 4 Notes 3, 4, 7, 10 — Batch 4 items pending. Note 7 (Begin Observation ignition point) is partially superseded by Section 4 above: once INS-004 lands, the ignition point moves onto the assignment detail page and the standalone `New Observation` button on the mentor Observations page is removed. Notes 3, 4 (BridgeFast) and Note 10 (Schedule redesign) remain as separate tracks.

---

*End of design return v0.1. On approval, please reply with either "approved as returned" or a marked-up copy naming each amendment by section number.*
