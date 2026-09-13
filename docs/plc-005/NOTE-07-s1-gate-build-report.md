# PLC-005 Note 7 (T3A-D1-EXEC-CORR-001) — build report

**Reference** T3A-DEV-PLC-005-A Note 7 / T3A-D1-EXEC-CORR-001
**Produced** 13 September 2026
**Status** IMPLEMENT AS SPECIFIED — gate and refusals built, acceptance tests run.

---

## 1. What was corrected

The Execution Edition established that Stage 1 is administered by the AI
service and that a human confirmer afterwards turns the participant's
responses into determinations. It did not state that the Stage 1 outcome is
**routed** to the assigned mentor, nor that Stage 2 cannot begin until that
mentor has completed the confirmation.

Built to the correction. Where it and the Execution Edition differ, the
correction governs; the divergence is recorded here per Section 0.

## 2. Build order followed (Section 10)

The gate and its refusal were built **before** the happy path, per the
instruction that "a gate written after the route it guards is a gate that
has already been bypassed once in testing." Migration
`20260920000000_t3a_d1_s1_gate_before_s2.sql` is ordered gate-first.

## 3. The gate (Section 3)

`t3a_d1_stage_2_entry_eligible(participant, dimension)` returns eligible
only when **all four** hold. `t3a_d1_attempt_stage_2_entry(...)` refuses and
logs, or permits and logs. It does not queue, does not warn-and-allow, and
does not proceed with a placeholder.

One gate-level code, four required sub-reasons:

| Condition | Sub-reason |
|---|---|
| Stage 1 instance closed | `S1_NOT_CLOSED` |
| Confirmation exists, by the **assigned** mentor | `S1_CONFIRMATION_MISSING` |
| Observation record committed | `S1_OBSERVATION_NOT_COMMITTED` |
| Progression record permits continuation | `S1_PROGRESSION_NOT_PERMITTING_CONTINUATION` |

The participant-facing state stays neutral in every case — *Stage 2 is not
yet available* — and never states a reason about the mentor, the participant
or the Stage 1 content.

## 4. Acceptance tests run

Exercised directly against the database in a block ending in
`RAISE EXCEPTION`, so nothing committed.

```
CORR-01b/no-instance                  = S1_NOT_CLOSED
            active (open instance)    = S1_NOT_CLOSED
CORR-01     closed, unconfirmed       = S1_CONFIRMATION_MISSING
CORR-10     involved by assignment alone = false
CORR-05     confirmed, not committed  = S1_OBSERVATION_NOT_COMMITTED
            committed, no progression = S1_PROGRESSION_NOT_PERMITTING_CONTINUATION
```

Post-test: stage instances 0, routings 0, confirmations 0, involvements 0,
observation records 0 — all unchanged.

| Test | Result |
|---|---|
| CORR-01 | **Pass** |
| CORR-01b (all four sub-reasons provoked independently) | **Pass** |
| CORR-05 | **Pass** |
| CORR-10 | **Pass** — assignment alone leaves the mentor uninvolved |
| CORR-04 | **Structural** — capture and confirmation are two functions writing two tables; `t3a_d1_confirm_s1_observation` refuses with `DETERMINATIONS_MISSING` when capture has not run. No single control performs both. |
| CORR-11 / CORR-12 | **Structural** — `t3a_d1_check_evidence_review_eligibility` and `t3a_d1_check_issuer_eligibility` refuse with `NO_INDEPENDENT_REVIEWER_AVAILABLE` / `NO_INDEPENDENT_ISSUER_AVAILABLE`, neither falling back. |
| CORR-02, CORR-03, CORR-06 to CORR-09, CORR-13 | **Not run** — require the Mentor Desk workbench interface and the demonstration fixture, which are Note 5 and interface work. See §8. |

## 5. Involvement — the distinction that had to be implemented (Section 6)

Assignment is an allocation fact. By itself it does not make a mentor
involved and does not merge authorities. Involvement arises from a recorded
**act**.

`t3a_d1_involvement` is therefore the only source of involvement, and
`t3a_d1_is_involved()` reads that table and nothing else. **No code path
infers involvement from `mentor_assignments`.** CORR-10 proves it: after
routing, before any capture or confirmation, `t3a_d1_is_involved` returns
`false`.

Involvement is written at capture and again at confirmation, each emitting
`s1_involvement_recorded`. The table blocks UPDATE and DELETE — involvement
is a record of something that happened, not an editable property.

## 6. Reassignment — endpoint disabled, per the rule (Section 5)

Section 5 says reassignment "is authorized by the same existing server-side
capability that currently authorizes mentor assignment in the repository. Do
not create a new capability for it," and that if no such capability exists
the endpoint "stays disabled and logs
`S1_REASSIGNMENT_AUTHORITY_UNAVAILABLE`."

**Finding: no governed server-side mentor-assignment capability exists in
this repository.** The Note 1 Step 1 inventory established that assignment
has no administrator action and no approval record behind it.

`t3a_d1_reassign_s1_confirmation` therefore refuses with
`S1_REASSIGNMENT_AUTHORITY_UNAVAILABLE`, logs
`s1_confirmation_reassigned` with the refusal and the requested values, and
leaves the pending confirmation pending. No new capability was invented.
This also answers, from the build side, the Part B question about whether an
administrator action for mentor assignment exists: it does not.

## 7. A schema inconsistency found, reported not renamed

`dimension_id` is typed inconsistently across the existing schema:

| Table | Type |
|---|---|
| `t3a_stage_instance` | `t3a_dimension_code` (enum) |
| `t3a_observation_record` | `text` |
| `t3a_d1_progression_decision` | `text` |

This surfaced as `operator does not exist: t3a_dimension_code = text` during
the first acceptance run — the gate would otherwise have failed closed
against the stage-instance lookup for reasons unrelated to the gate
conditions.

Standing Rule 4 forbids renaming or retyping either side, so the gate casts
at the comparison instead. **Recorded here as a migration-plan item for Note
6 (b)**, which asks for exactly this kind of code-and-data identifier
inventory rather than a completed rename.

## 8. Assumption recorded under the Developer Judgment Boundary

"Permits continuation" is read as `decision = 'proceed'`. Under FD-D1-05 the
closed set is proceed / redirect / pause; redirect and pause do not continue
to Stage 2. This is a technical reading of an existing closed set, **not a
new doctrine value**, and no fourth value is introduced anywhere.

## 9. What is not built here

| Item | Position |
|---|---|
| Mentor Desk workbench interface (Section 4) | Interface work. The field restrictions — served instance and verbatim responses only, no AI suggestion, no free-text, no composed statement — are asserted by the absence of those columns in `t3a_d1_s1_determination`, but the screen itself ships separately. CORR-03 runs against that screen. |
| Pending action on the Mentor Desk (CORR-02) | Interface work. The routing record that drives it exists and is readable by the assigned mentor. |
| Demonstration fixture DEMO-D1-S1-001 (CORR-13) | Belongs to Note 5, which builds the demonstration property and isolation first. |
| Step 6 commit and step 7 progression writers | Existing surfaces (`t3a_observation_record`, `t3a_d1_progression_decision`) already carry these; the gate reads them rather than replacing them. |

## 10. Section 9 — what does not change

Confirmed untouched: the Stage 1 controlled script, the Stage-entry
authority matrix, REC-11, the three-lifetime-attempt rule, the separation of
Confirmations and Determinations as two sidebar entries and two records, and
every existing refusal path. Nothing renamed.

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
