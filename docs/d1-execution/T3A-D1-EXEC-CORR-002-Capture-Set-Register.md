# Capture-Set Register — the fifteen question objects and their capture sets

**Identifier** T3A-D1-EXEC-CORR-002  |  **Status: IMPLEMENT AS SPECIFIED**  |  The 3rd Academy Inc.

**The file this corrects**

| Field | Entry |
| --- | --- |
| **File name** | `T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1_0_REISSUED_T3A_CODEBASE.md` |
| **Identifier** | T3A-D1-EXEC-001 |
| **Version** | 1.0 — issued, reissued for the T3A codebase |
| **Sections corrected** | Section 5.2 Question object register (one column value). Section 5.3 is correct as written and is unchanged |

Every reference below cites that file by section, by the named block, and by the line number in the issued file. Where a line number and a section name disagree because the file has been reflowed, **the section name and the quoted text govern** — find the quoted text, not the line.

---

## Section 0 — How to use this file

This correction is complete in itself. It amends the Execution Edition and carries the same execution rules as that file.

No external document is required and nothing is supplied separately. There is no design-return step and no approval cycle. The only instruction status is IMPLEMENT AS SPECIFIED.

Where this correction and the Execution Edition differ on the same rule, **this correction governs**, and the divergence is recorded in the build log.

Where a numbered instruction in Section 2 of the Execution Edition restates a rule changed here, build to this correction, record the divergence, and continue. Do not fail a route closed over a restatement mismatch.

Every value this correction needs is stated here. Nothing defaults silently. Where a value is absent at runtime the behavior is refuse and log, never proceed.

> **DEVELOPER JUDGMENT BOUNDARY — THE STANDING RULE ON THIS BUILD**
>
> Use reasonable technical judgment within the stated architecture and fail-closed rules.
> Where an issue would change T3A doctrine, evidence meaning, participant rights or authority, record it in the conflict register rather than deciding it, and take the most restrictive behavior available in the meantime.
> That boundary is the control on this build. It is not a design-return cycle, and it does not make implementation conditional on an approval step.

---

## Section 1 — The three rulings

### 1.1 Q-D1-03b1 and Q-D1-03b2 DO take a capture set. Both take C3.

**Where this is already written in T3A-D1-EXEC-001:**

| Location | Line | What it says |
| --- | --- | --- |
| **Section 5.3**, opening paragraphs — *Response capture catalogue — the thirteen sets* | 828, rule at 836–838 | "Thirteen capture sets cover the fifteen question objects... Twelve map one-to-one to a single question object. **C3 is one visual group holding THREE separately persisted controls — Q-D1-03a, Q-D1-03b1 and Q-D1-03b2** — because the child selections belong to the same moment of capture. They persist as three determinations, not one." |
| **Section 2**, instruction **043** (package 4, DEV-INS-002) | 287 | Restates the same rule as a build instruction |
| **Section 5.3**, block **C3 — What the account contained** | 861 | The five C3 lines, including the two *select which* lines that are the 03b1 and 03b2 controls |

They are not unmapped. **C3 is one visual group holding three separately persisted controls — Q-D1-03a, Q-D1-03b1 and Q-D1-03b2.** They persist as three determinations, not one.

That is what reconciles the counts, and the arithmetic is not the one in the reading being tested:

- Twelve sets hold one question object each — twelve questions.
- C3 holds three question objects — three questions.
- Twelve plus three is fifteen questions, across thirteen sets.

**Being source-bound does not remove a question from a capture set.** C3 and C6 are both source-bound and both have capture sets. The binding supplies the **options**; the capture set supplies the **lines**. Those are different things and neither substitutes for the other.

There is also no "source-bound pair" to identify. **There are five source-bound consuming controls, not two** — stated at **Section 5.2**, source-bound families paragraph, lines 798–801, and again as instruction **047** at line 305. Any reconciliation that rests on finding two source-bound questions is reasoning from a premise that does not hold.

### 1.2 The Q-D1-04b bound child is served on TWO options, not one, and is bound to `attribution_support_set`.

**Where the two statements in T3A-D1-EXEC-001 disagree:**

| Location | Line | What it says | Standing |
| --- | --- | --- | --- |
| **Section 5.2**, question register table, Q-D1-04b row, answer-type column | 813 | "Single select, fixed, with a bound child selection **on one option**" | **WRONG — corrected by this file** |
| **Section 5.4**, branch rules table, **BR-06** | 966 | "Q-D1-04b returns *aligned to the support set* **or** *both aligned and non-aligned* → The bound child selection is served... **It is served in both states**, because the resolution table needs the aligned items in each" | **CORRECT — governs** |
| **Section 5.3**, block **C4b — What was attributed to another person** | 879 | The four C4b lines, two of which carry a *select which* / *select the aligned items* instruction | **CORRECT — governs** |

The Execution Edition Section 5.2 answer-type column reads *"Single select, fixed, with a bound child selection on one option."* **The words "on one option" are incorrect and are corrected here.** BR-06 in the same file already states the governing behavior, and BR-06 is right.

The bound child selection is served where Q-D1-04b returns **either** of these two C4b lines:

1. *Made one or more attributions and all were aligned to the source support set* — select which.
2. *Made both aligned and non-aligned attributions* — select the aligned items, and record the presence of non-aligned attribution.

**It is served in both states, because the resolution table needs the aligned items in each.** The other two C4b lines — *made no attribution* and *made one or more attributions and none were aligned* — carry no bound selection, because in neither case is there an aligned item to identify.

### 1.3 Q-D1-06: the three C6 lines are one bound slot plus two fixed options.

**Where this is already written in T3A-D1-EXEC-001:**

| Location | Line | What it says |
| --- | --- | --- |
| **Section 5.2**, question register table, Q-D1-06 row | 817 | "Structured selection, single, bound to `available_routes` **plus two fixed options**" |
| **Section 5.3**, block **C6 — Which route was used** | 909 | The three lines, the first carrying *select which* |
| **Section 5.2**, source-bound families paragraph | 798–801 | Names Q-D1-06 as one of two controls consuming `available_routes` |

The three lines resolve exactly against the stated answer type. The first line is the slot the source's routes expand into; the second and third are the two fixed options.

| C6 line | Kind | Bound to |
| --- | --- | --- |
| Used one of the routes the source provides **and verifiable in session** — select which | **Bound slot** | The served source version's `available_routes` |
| Used an observable means the source does not list | Fixed option | — |
| Used no route in the session | Fixed option | — |

One bound slot plus two fixed options is three lines. There is no fourth line and no missing line.

---

## Section 2 — The complete register: fifteen question objects, thirteen capture sets

This is the table to load. It is **source-independent**: the capture sets are identical across every source, which is why the platform renders them at the beat rather than repeating them in each source.

| Question | Element | Capture set | Answer type | Source-bound to | Served when |
| --- | --- | --- | --- | --- | --- |
| Q-D1-01 | CE-01 | **C1** | Single select, fixed | — | Always where the element is in play |
| Q-D1-02 | CE-02 | **C2** | Single select, fixed | — | Source carries `enquiry_point` |
| Q-D1-03a | CE-03 | **C3** *(control 1 of 3)* | Single select, fixed | — | Source carries `information_made_available` and `material_items` |
| Q-D1-03b1 | CE-03 | **C3** *(control 2 of 3)* | Structured selection, multi | `material_items` | Q-D1-03a returned an omission, or both |
| Q-D1-03b2 | CE-03 | **C3** *(control 3 of 3)* | Constrained selection | `assertion_reference_set` | Q-D1-03a returned an unsupported claim, or both |
| Q-D1-04a | CE-04 | **C4a** | Single select, fixed | — | Always where the element is in play |
| Q-D1-04b | CE-04 | **C4b** | Single select, fixed, with a bound child selection on **two** options | `attribution_support_set` | Source carries `attribution_support_set` |
| Q-D1-05a | CE-05 | **C5a** | Single select, fixed | — | Always where the element is in play |
| Q-D1-05b1 | CE-05 | **C5b1** | Single select, fixed | — | `accountable_actor_available = true` AND Q-D1-05a returned an action |
| Q-D1-05b2 | CE-05 | **C5b2** | Single select, fixed | `available_routes` | Source carries `available_routes` AND Q-D1-05a returned an action |
| Q-D1-05c | CE-05 | **C5c** | Single select, fixed | — | `time_reference_called_for = true` AND Q-D1-05a returned an action |
| Q-D1-06 | CE-06 | **C6** | Structured selection, single, bound plus two fixed options | `available_routes` | Source carries `available_routes` |
| Q-D1-07 | CE-07 | **C7** | Single select, fixed | — | Source carries `account_test_point` AND `post_test_account_opportunity` |
| Q-D1-08a | CE-08 | **C8a** | Single select, fixed — timing relative to the decision | — | Source carries `bearing_interest` |
| Q-D1-08b | CE-08 | **C8b** | Single select, fixed — prompt condition | — | Source carries `bearing_interest` AND Q-D1-08a returned a disclosure |

### 2.1 The count reconciliation, stated once

**Thirteen sets. Fifteen question objects. Twelve sets hold one question object each; C3 holds three.** No other set spans more than one question object, and no capture line spans two.

### 2.2 Four source-bound list families feed five consuming controls

Source: **T3A-D1-EXEC-001 Section 5.2**, lines 798–801, and instruction **047** at line 305.

| Family | Consuming control |
| --- | --- |
| `material_items` | Q-D1-03b1 |
| `assertion_reference_set` | Q-D1-03b2 |
| `attribution_support_set` | The bound child on Q-D1-04b |
| `available_routes` | Q-D1-05b2 |
| `available_routes` | Q-D1-06 |

**Two controls consume the same family, which is why the counts differ. Use this wording everywhere.** An item drawn from another source version is refused.

---

## Section 3 — Build instructions

Numbered for citation. Instruction numbers in this file are prefixed **CS** and do not collide with the 008–133 series in T3A-D1-EXEC-001.

### 3.1 Load the register

**CS-I-01** Load the Section 2 table as a register keyed on `question_object_id`, holding `capture_set_id`, `element_id`, `answer_type`, `source_bound_family` and `applicability_rule`. It is reference data read at serve time. **Do not hard-code the mapping in the serving code and do not compile it in.**

**CS-I-02** Key the capture-set lines from **Section 5.3 of T3A-D1-EXEC-001** (line 828 onward) on `capture_set_id` plus `line_id`. Load all thirteen sets: C1, C2, C3, C4a, C4b, C5a, C5b1, C5b2, C5c, C6, C7, C8a, C8b.

**CS-I-03** Render C3 as **one visual group** containing three controls, and persist **three determination records** — one each for Q-D1-03a, Q-D1-03b1 and Q-D1-03b2 — each with its own identifier. A single persisted record covering the group is prohibited.

**CS-I-04** Where a served question's capture set cannot be resolved from the register, **refuse the determination and log**. Do not render a partial set, do not substitute a neighbouring set, and do not fall back to free text.

### 3.2 Serve the source-bound controls

**CS-I-05** For each of the five source-bound consuming controls in Section 2.2, read the bound options from the **served source version's** field. Options never come from the register and never from another source version.

**CS-I-06** Reject any submitted item whose `source_version_id` differs from the served source version. **Refuse and log.**

**CS-I-07** Where a source-bound control is served and the source version's bound family is **absent or empty**, refuse that control and log. Do not render a bound slot with no options, and do not degrade it to a fixed-option control.

**CS-I-08** Build Q-D1-06 as **one bound slot plus two fixed options**, per Section 1.3. With *n* routes on the served source, C6 renders *n* + 2 selectable lines. The two fixed lines are always present and are never expanded from the source.

### 3.3 Serve the Q-D1-04b bound child

**CS-I-09** Serve the Q-D1-04b bound child where the recorded answer is **either** *all aligned* **or** *both aligned and non-aligned*. Implement **BR-06 at Section 5.4, line 966** — not the Section 5.2 column, which this file corrects.

**CS-I-10** Do **not** serve the bound child where the answer is *made no attribution* or *none aligned*. In neither case is there an aligned item to identify, and no empty selection is recorded.

**CS-I-11** Where the answer is *both aligned and non-aligned*, persist **both** the aligned support-set item identifiers **and** the flag that non-aligned attribution was present. One without the other is an incomplete record.

**CS-I-12** **Retain the support-set item identifier and do not render it.** Naming the item names the person. This is the existing rule in T3A-D1-EXEC-001 and this file does not change it.

### 3.4 Applicability and absence

**CS-I-13** Serve a question only where its own **source applicability table** says DIRECT or CONDITIONAL. The Section 2 register states which capture set a question uses; **it never states whether a question is served.** Never infer service from the Stage and never infer it from this register.

**CS-I-14** Implement the child-not-reached rule: where a parent returns a value that does not trigger a child, the child is not served and **no row exists** — not a null, not a missing-state code.

**CS-I-15** Implement **BR-09 at Section 5.4, line 969**: where Q-D1-08a returns *did not disclose during the observation*, Q-D1-08b is not served and no row exists. **C8b has no not-applicable line** — see the note at Section 5.3, line 938.

**CS-I-16** Where a question object is requested that is not in the Section 2 register, **refuse and log**. Render no substitute set.

## Section 4 — The two source fields, and why they do not block this work

The two fields raised as outstanding — `attribution_support_set` on SRC-D1-S1-010 and `available_routes` on SRC-D1-S3-010 — **are already present in the Execution Edition and are not outstanding.**

| Source | Field | Where it is in T3A-D1-EXEC-001 | Value as loaded |
| --- | --- | --- | --- |
| SRC-D1-S1-010 | `attribution_support_set` | **Section 5**, source library, SRC-D1-S1-010 source sheet, line 2760 | AS1 Victor told the client the participant could handle it. AS2 the client specifically asked for advanced Tableau with predictive modelling. |
| SRC-D1-S3-010 | `available_routes` | **Section 5**, source library, SRC-D1-S3-010 source sheet, line 5768 | R-a the declarations form in the pack. R-b a note in the recommendation itself. R-c a separate message to the requesting manager before submitting. R-d the response to the enquiry. |

**More importantly, neither field was ever a dependency of this register.**

The capture-set register is source-independent. Which capture set a question uses is fixed for every source. What a source supplies is the **options inside a bound control**, and the applicability rule already handles a source that supplies none: where a source does not carry `attribution_support_set`, **Q-D1-04b is not served at all**, so the question of which option carries its bound child never arises for that source. The same holds for `available_routes`, Q-D1-05b2 and Q-D1-06.

**Load the register and run the six tests. Neither source field is on the critical path for this work.**

---

## Section 5 — Acceptance tests for this correction

| Test | Fixture | Expected result |
| --- | --- | --- |
| **CS-01** | Serve a source carrying `material_items` and `information_made_available` | Q-D1-03a, 03b1 and 03b2 all resolve to C3 and render as one visual group |
| **CS-02** | Answer Q-D1-03a with *included every material item and no unsupported claim* | Neither child is served. **Two** determination records do not exist; only Q-D1-03a persists |
| **CS-03** | Answer Q-D1-03a with *both omitted and unsupported* | Both children are served. **Three separate determination records** persist, each with its own identifier |
| **CS-04** | Answer Q-D1-04b with *all aligned* | The bound child is served, options drawn from `attribution_support_set` |
| **CS-05** | Answer Q-D1-04b with *both aligned and non-aligned* | The bound child **is served**, and the record carries the aligned identifiers plus the non-aligned-present flag |
| **CS-06** | Answer Q-D1-04b with *none aligned* | The bound child is **not** served. No empty selection is recorded |
| **CS-07** | Serve Q-D1-06 on a source carrying three routes | C6 renders **five** selectable lines: three expanded routes, plus *used an observable means the source does not list*, plus *used no route in the session* |
| **CS-08** | Serve Q-D1-06 on a source whose `available_routes` is empty or absent | Q-D1-06 is **not served** under applicability. Where it is nonetheless requested, the control **refuses and logs** |
| **CS-09** | Submit a `material_items` identifier from a different source version into Q-D1-03b1 | **Refused** and logged |
| **CS-10** | Answer Q-D1-08a with *did not disclose during the observation* | Q-D1-08b is not served and **no row exists** — no null, no missing-state code |
| **CS-11** | Request a capture set for a question object not in the Section 2 register | **Refused** and logged. No substitute set is rendered |
| **CS-12** | Count check | The loaded register holds **fifteen** question objects across **thirteen** capture sets, with C3 carrying three |

---

## Section 6 — What this correction changes in the Execution Edition

All locations are in `T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1_0_REISSUED_T3A_CODEBASE.md`, identifier T3A-D1-EXEC-001.

| Location | Line | Change |
| --- | --- | --- |
| **Section 5.2**, question register table, Q-D1-04b row, answer-type column | 813 | Replace *"with a bound child selection on one option"* with **"with a bound child selection on two options"** |
| **Section 5.2**, question register table | 803–818 | Add a **Capture set** column carrying the values in Section 2 of this file |
| **Section 5.3** | 828–954 | **Unchanged.** The thirteen sets and the C3 grouping rule are already correct as written |
| **Section 5.4**, BR-06 | 966 | **Unchanged and governing.** It already states the two-state behavior correctly |
| **Section 2**, instructions 043 and 047 | 287, 305 | **Unchanged.** Both already restate the rules correctly |

**No route, field, component, table or code identifier is renamed under this correction.** No element is removed from any screen.

---

**END OF CORRECTION. This file is complete. Nothing further is required from anyone to begin.**
