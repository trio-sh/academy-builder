# Decision Points, the Sequence Inventory and the REC-07 Carry-Forward

**Identifier** T3A-D1-EXEC-CORR-004  |  **Status: IMPLEMENT AS SPECIFIED**  |  The 3rd Academy Inc.

**Checked against** `T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1_0_REISSUED_T3A_CODEBASE.md`, identifier T3A-D1-EXEC-001.

**This closes AC-12 and the three items returned on PR 292.**

---

## Section 0A — Required baseline. Verify this first, then proceed.

This correction is an **increment on an existing build**. It is self-contained in its rules, but it operates on a repository where earlier corrections are already implemented. **Verify the four conditions below before executing anything.**

| # | Condition | How to verify |
| --- | --- | --- |
| **B1** | The source-sheet parser reads a **logical bullet** — a line matching ``^- `field` — `` plus every following line indented two or more spaces, joined with a single space | Re-parse `SRC-D1-S2-001`. `material_items` must yield **four** items ending "M4 the correct figure is materially higher." |
| **B2** | All forty production source versions have been **re-parsed and superseded**, and the forty REC-07 approvals were carried forward to the current rows | Query for any source whose `rec07_approval_ref` points at a superseded row. The count must be **zero** |
| **B3** | A `mentor_action_sequence` table exists holding `beat_code`, `beat_ordinal`, `action_type`, `content_verbatim`, `is_decision_point`, `pause_seconds_min`, `pause_seconds_max`, `role_label` | Three demonstration sequences are loaded: `DEMO-D1-S1-001`, `DEMO-D1-S2-001`, `DEMO-D1-S4-001` |
| **B4** | Field-boundary recovery is active: a bound family terminates at the first bare field-name token appearing inside its value, and the text after that token is captured as the named field | `SRC-D1-S2-001` `other_route_classification` reads "Permitted where the participant states the means aloud." and is **not** part of R-d |

**If any condition fails, do not execute this correction.** Record which condition failed, leave the affected routes disabled, log it, and continue building everything not dependent on that condition. **Executing Section 2 against an unparsed source library would load truncated sequences.**

---

## Section 0 — How to use this file

This correction is complete in itself. No external document is required and nothing is supplied separately. There is no design-return step and no approval cycle. The only instruction status is IMPLEMENT AS SPECIFIED.

Where this correction and any earlier correction differ on the same rule, **this correction governs**, and the divergence is recorded in the build log. **It amends two earlier instructions, and restates each in full before amending it, so this file can be executed without holding the earlier one:** the instruction that thirteen demonstration sources carry beat sequences (Section 2), and the instruction forbidding derivation of a decision point (Section 1).

Every value this correction needs is stated here. Where a value is absent at runtime the behavior is refuse and log, never proceed.

**Numbering continues an existing series.** Instructions run CS-I-32 to CS-I-48 and tests CS-25 to CS-37. Lower numbers belong to earlier corrections already implemented in the repository and verified by Section 0A. **A register starting at CS-I-32 is correct and is not a missing range.**

> **DEVELOPER JUDGMENT BOUNDARY — THE STANDING RULE ON THIS BUILD**
>
> Use reasonable technical judgment within the stated architecture and fail-closed rules.
> Where an issue would change T3A doctrine, evidence meaning, participant rights or authority, record it in the conflict register rather than deciding it, and take the most restrictive behavior available in the meantime.

---

## Section 1 — The decision point is already in the file. Three determinations, three different fields.

**CS-I-27 was drawn too wide and is amended. It correctly forbade deriving a decision point from a pause beat. It should not have forbidden the source-sheet fields that already carry one.**

There is no single decision point. There are **three timing determinations with three different reference points**, and BR-07 at line 967 already names the field that gates each.

| Determination | Reference point | Source-sheet field | Populated today |
| --- | --- | --- | --- |
| Q-D1-02 — when first raised | The direct question | `enquiry_point` | **Yes** — B3 on eighteen sources, R2 on nine, other values elsewhere |
| Q-D1-07 — what changed when tested | The account test | `account_test_point` | **Yes** |
| Q-D1-08a — disclosure timing | The **decision point** | Stated inside `bearing_interest` | **Yes, on all six sources that carry one** |

### 1.1 Build instructions — decision point resolution

**CS-I-32** **AMENDS CS-I-27.** Resolve the reference beat for a timing determination from its own governing field:

- Q-D1-02 resolves its reference from **`enquiry_point`**.
- Q-D1-07 resolves its reference from **`account_test_point`**.
- Q-D1-08a resolves its reference from the **decision point stated in `bearing_interest`**, per Section 1.2.

**CS-I-33** **The prohibition that stands.** Never derive a reference beat from the presence, position or duration of a pause. Never assume a beat code carries a fixed role across sources. Both remain true.

**The evidence is in the file.** `DEMO-D1-S1-001` at line 1292 places its pause at **B3**. `DEMO-D1-S2-001` at line 1354 places its pause at **B2**. Beat roles vary too: B4 is the corrective prompt in one demonstration source, while `SRC-D1-S2-001` places the corrective prompt at B5 and the timing question at B6. **A beat code means nothing without its loaded sequence.**

**CS-I-34** Where the governing field is absent or null, the determination is **not served at all** under BR-07 — not served and then refused. Absence of `enquiry_point`, `account_test_point` or `bearing_interest` means Q-D1-02, Q-D1-07 and Q-D1-08a respectively do not appear, and their absence is not a missing state.

**CS-I-35** Where the field is present but its beat reference cannot be resolved against a loaded sequence, **refuse the determination by name and log**. That is the existing behavior and it is correct.

### 1.2 The six sources carrying a bearing interest, and their decision points

Read verbatim from the `bearing_interest` field of each source in T3A-D1-EXEC-001. **These are transcriptions, not rulings.**

| Source | Decision point | Reference beat |
| --- | --- | --- |
| `SRC-D1-S1-009` | The Monday recommendation | The direct question at **R2** comes at that point |
| `SRC-D1-S2-005` | Accepting the panel seat | The direct question at **B3** comes at that point |
| `SRC-D1-S2-010` | Accepting the review | The direct question at **B3** comes at that point |
| `SRC-D1-S3-010` | The submission of the recommendation | The enquiry **follows** it |
| `SRC-D1-S4-001` | The agreement at **B4** | The enquiry at **B3** precedes it |
| `SRC-D1-S4-007` | The agreement at **B4** | — |

**CS-I-36** Parse `is_decision_point` for Q-D1-08a from the `bearing_interest` field of the served source version, using the table above as the expected result. **Do not hand-enter these values.** They must resolve from the loaded content so that a later source revision carries through.

**CS-I-37** Note that on `SRC-D1-S1-009`, `SRC-D1-S2-005` and `SRC-D1-S2-010` the decision point and the enquiry point **coincide**. That is deliberate and is why all four C8a lines are reachable on those sources. Do not treat coincidence as a parse error.

**CS-I-38** Note that on `SRC-D1-S3-010` the enquiry **follows** the decision point, and on `SRC-D1-S4-001` the enquiry **precedes** it. The ordering is per source. Do not assume a fixed relationship.

### 1.3 On DEMO-D1-S2-001

`DEMO-D1-S2-001` carries **no bearing interest**, so Q-D1-08a is not served on it and no decision point is required. The guess of B3 would have been a guess about a determination that does not run on that source. **Declining to make it was right.**

---

## Section 2 — The sequence inventory. CS-I-25 was wrong and is corrected.

**CS-I-25 said thirteen demonstration sources carry structured beat sequences. That was an error in the count, and the error was mine.** There are thirteen `Reveal sequence` blocks in the file, but they are not thirteen demonstration sources.

### 2.1 What the thirteen actually are

| Group | Count | Sources | Beat codes |
| --- | --- | --- | --- |
| Demonstration sources | **3** | `DEMO-D1-S1-001` line 1275, `DEMO-D1-S2-001` line 1334, `DEMO-D1-S4-001` line 1465 | B-codes |
| **Stage 1 production sources** | **10** | `SRC-D1-S1-001` to `SRC-D1-S1-010`, lines 1800 to 2710 | **R-codes** |

**`DEMO-D1-S3-001` has no Reveal sequence and needs none** — Stage 3 is a written submission with `enquiry_point` null and `account_test_point` null. The observation is the submitted artifact, not a live sequence. **That reading was correct.**

### 2.2 The ten Stage 1 production sequences are loadable now

This is the material finding. The position that *no loaded source carries a mentor action sequence* holds for Stage 2, 3 and 4 production sources. **It does not hold for Stage 1.** All ten Stage 1 production sources carry a structured reveal sequence with role labels already attached.

`SRC-D1-S1-001` at lines 1800 to 1808 reads:

> **R1** What do you do now? Describe your next steps. **Opening**
> **R2** A message from your manager... Write your reply. **Enquiry point**
> **R3** Your manager replies... **Corrective prompt**
> **R4** "Just so I have the timeline right — when did you realise it hadn't gone?" **Account test — authored**

**CS-I-39** Load the **ten Stage 1 production reveal sequences** into `mentor_action_sequence`. Stage 1 is AI-administered, so `action_type` is `REVEAL` for each and there is no `PAUSE`, `READ`, `ASK` or `SAY`.

**CS-I-40** Map the role label at the end of each reveal line to `role_label`: Opening, Enquiry point, Corrective prompt, Account test. **Set `is_decision_point` from `enquiry_point` and `account_test_point` per CS-I-32 — not from the role label.** The label is descriptive; the source-sheet field governs.

**CS-I-41** The **three** demonstration sequences already loaded remain loaded. Total loaded sequences after this correction: **thirteen** — three demonstration plus ten Stage 1 production.

**CS-I-42** Stage 2, 3 and 4 **production** sources carry no structured sequence. That extraction remains outstanding and is content authoring, not a build task. Record it in the conflict register.

### 2.3 AC-12 status after this correction

**CS-I-43** Record AC-12 per Stage rather than as a single claim:

| Scope | Status after this correction |
| --- | --- |
| Demonstration sources | **CLAIMABLE** — sequences loaded, decision points resolve |
| Stage 1 production sources | **CLAIMABLE** — ten sequences loaded under CS-I-39 |
| Stage 2 production sources | NOT YET CLAIMABLE — sequence extraction outstanding |
| Stage 3 production sources | **NOT APPLICABLE** — written submission, no live sequence |
| Stage 4 production sources | NOT APPLICABLE while Stage 4 is disabled |

**The line at line 4678 is not a Mentor script.** It is run-together prose inside the Stage 2 bank register — the source-to-markdown conversion dropped a separator, so a field name appears bare inside a neighbouring value. **That reading was correct. Do not load it.**

The same fault affects twenty-one sources where `available_routes` runs straight into `other_route_classification`. Baseline condition B4 covers it.

---

## Section 3 — The REC-07 carry-forward. Ruling: it stands, with one condition.

**The instinct to escalate rather than decide was right. Writing an approval row against a version no human has inspected does touch authority.**

### 3.1 The ruling, and the reasoning

**The carry-forward is correct and stands.** The reasoning matters more than the outcome:

**REC-07 approved the source version as written in the issued Execution Edition. It did not approve a database row.** The row was a defective transcription of an approved source. Fixing the parse brought the row **into conformity** with what was approved, rather than changing it away from it.

**No approved content changed.** The approved artifact — the source sheet in T3A-D1-EXEC-001 — is byte-identical before and after. What changed is the fidelity of the copy. An approval does not lapse because a transcription error in a downstream system was corrected.

**Re-approval would have been the wrong control.** It would have asked a named person to re-attest to content they already approved, on the basis that a parser had been wrong. That devalues the attestation.

### 3.2 The condition

**CS-I-44** The carry-forward holds **only where the diff is provably confined to parse recovery**. For each of the forty sources, the migration must record a **content-identity assertion**: that the corrected value, with whitespace normalized, is a **superset** of the previous value, and that every character of the previous value appears in the corrected value in the same order.

**CS-I-45** Where that assertion **fails for any source**, the carry-forward is **void for that source**. Mark it `rec07_approval_ref` null, leave it unservable, and log it for re-approval. A value that changed rather than extended is not a recovered transcription.

**CS-I-46** Record on every carried-forward approval: the original approver name, the original timestamp, `carry_forward_basis = PARSE_RECOVERY_CORR_003`, the content-identity assertion result, and the superseded and current version identifiers. **The approval record must show on its face that it was carried, not freshly given.**

**CS-I-47** Run CS-I-44 as a **reportable output**, not a silent check. The count of sources passing the identity assertion is stated in the migration log.

### 3.3 On the test fixture

**The first run passing thirteen tests against a Stage entry pinned to the superseded version — green and proving nothing — is the most important thing in the return.** Catching it unprompted is the behavior the whole acceptance model depends on.

**CS-I-48** The fixture guard now refusing to reuse an entry pinned to a superseded version is **retained permanently and is not test-only scaffolding**. Add it to the standing acceptance set: **a test that runs against superseded content is a failed test, not a passed one.**

---

## Section 4 — Acceptance tests

| Test | Fixture | Expected result |
| --- | --- | --- |
| **CS-25** | `SRC-D1-S2-005`, participant discloses before accepting the panel seat | Q-D1-08a resolves its decision point from `bearing_interest` and records *before the decision point* |
| **CS-26** | `SRC-D1-S4-001` | Decision point resolves to **B4**, enquiry to **B3**, and the two are distinct |
| **CS-27** | `SRC-D1-S3-010` | Decision point resolves to the submission, with the enquiry **following** it |
| **CS-28** | `DEMO-D1-S2-001` | Q-D1-08a **not served** — no bearing interest. No decision point required and none inferred |
| **CS-29** | Any source, Q-D1-02 | Reference resolves from `enquiry_point`, **never** from a pause beat |
| **CS-30** | A source with `enquiry_point` null | Q-D1-02 **not served** under BR-07. Absence is not a missing state |
| **CS-31** | Load the ten Stage 1 reveal sequences | Each yields R1 to R4 with `action_type` REVEAL and role labels mapped |
| **CS-32** | Sequence count after load | **Thirteen** — three demonstration, ten Stage 1 production |
| **CS-33** | Line 4678 | **Not** loaded as a sequence. Recognized as run-together prose |
| **CS-34** | Content-identity assertion across all forty sources | Every corrected value is a superset of its predecessor, character order preserved. Count reported |
| **CS-35** | A source failing the identity assertion | `rec07_approval_ref` null, source unservable, logged for re-approval |
| **CS-36** | Any carried-forward approval row | Shows original approver, original timestamp, `carry_forward_basis`, assertion result, both version identifiers |
| **CS-37** | A test attempting to run against a superseded content version | **Refused.** The test fails rather than passing green |

---

## Section 5 — What this correction changes

| Location | Change |
| --- | --- |
| CS-I-25 | **Corrected.** Three demonstration sequences, not thirteen. Ten Stage 1 production sequences added |
| CS-I-27 | **Amended by CS-I-32.** Source-sheet fields resolve the reference beat. The pause prohibition stands |
| AC-12 register entry | Split per Stage: claimable for demonstration and Stage 1 production; outstanding for Stage 2; not applicable for Stage 3 and 4 |
| REC-07 carry-forward | **Upheld**, conditional on the content-identity assertion |
| Fixture guard | Promoted from scaffolding to standing acceptance |
| T3A-D1-EXEC-001 | **No change.** The issued file is intact throughout |

**No route, field, component, table or code identifier is renamed under this correction.**

---

**END OF CORRECTION. This file is complete. Nothing further is required from anyone to begin.**
