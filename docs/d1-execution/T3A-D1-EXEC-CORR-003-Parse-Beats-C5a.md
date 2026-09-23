# Bound-Family Parse, Beat Sequences and the C5a Ruling

**Identifier** T3A-D1-EXEC-CORR-003  |  **Status: IMPLEMENT AS SPECIFIED**  |  The 3rd Academy Inc.

**The file this is checked against**

| Field | Entry |
| --- | --- |
| **File name** | `T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1_0_REISSUED_T3A_CODEBASE.md` |
| **Identifier** | T3A-D1-EXEC-001 |
| **Answers** | The two blocking items and the flagged reading raised on PR 292 |

---

## Section 0 — How to use this file

This correction is complete in itself. No external document is required and nothing is supplied separately. There is no design-return step and no approval cycle. The only instruction status is IMPLEMENT AS SPECIFIED.

Where this correction and the Execution Edition differ on the same rule, **this correction governs**, and the divergence is recorded in the build log.

Every value this correction needs is stated here. Where a value is absent at runtime the behavior is refuse and log, never proceed.

> **DEVELOPER JUDGMENT BOUNDARY — THE STANDING RULE ON THIS BUILD**
>
> Use reasonable technical judgment within the stated architecture and fail-closed rules.
> Where an issue would change T3A doctrine, evidence meaning, participant rights or authority, record it in the conflict register rather than deciding it, and take the most restrictive behavior available in the meantime.

---

## Section 1 — The bound families are NOT truncated in the issued file. The parse reads one physical line.

**This is a parser defect, not a content defect. The issued file is intact.**

### 1.1 What the issued file actually holds

`SRC-D1-S2-001` `material_items`, Section 5 source library, lines 3227–3228 — **four items, complete**:

> M1 the figure is wrong. M2 the participant supplied it. M3 the error is the wrong month's data. M4 the correct figure is materially higher.

`SRC-D1-S2-001` `available_routes`, lines 3237–3242 — **four routes, complete**:

> R-a tell the colleague directly. \[Q-D1-06 OBSERVABLE IN SESSION\] R-b send the corrected figure before the meeting. \[CE-05 PLANNING CONTEXT ONLY unless a retained verified send event exists\] R-c ask the colleague to hold the item. \[Q-D1-06 OBSERVABLE IN SESSION\] R-d raise it with the meeting chair. \[CE-05 PLANNING CONTEXT ONLY unless an authorised in-session channel is retained\]

`SRC-D1-S3-010` `available_routes`, lines 5768–5771 — **four routes, complete**, as stated in CORR-002 Section 4.

### 1.2 Why the parse stops where it does

The source library is **markdown soft-wrapped at approximately 95 characters**. A field is a list bullet whose value continues on following lines indented by two spaces, until the next bullet begins.

The reported stopping points fall exactly on wrap boundaries:

| Reported | Actual |
| --- | --- |
| `material_items` ends at "M3 the error is the" | End of physical line 3227. "wrong month's data. M4 the correct figure is materially higher." is on line 3228 |
| `available_routes` yields R-b as just "send" | End of physical line 3237. "the corrected figure before the meeting." is on line 3238 |

**The parse is taking the first physical line of each bullet and discarding the continuation.**

### 1.3 Build instructions — the parse fix

**CS-I-17** Parse a source-sheet field as a **logical bullet**, not a physical line. A bullet begins at a line matching `^- \`field_name\` — ` and **continues through every following line indented by two or more spaces** until the next line matching `^- \`` or the next markdown heading. Join continuation lines with a single space, collapsing the leading indent.

**CS-I-18** Re-run the content load for **all eighty-one content versions** after CS-I-17. Do not patch individual sources by hand.

**CS-I-19** Add a load-time assertion: **a bound-family value that ends without terminal punctuation is a parse failure, not a short list.** Refuse the load for that source version, name the field, and log. A truncated item must never reach a participant as an approved answer.

**CS-I-20** Add a load-time assertion on item counts where the source states them. `SRC-D1-S2-001` `material_items` must yield **four** items M1 to M4. `SRC-D1-S2-001` and `SRC-D1-S3-010` `available_routes` must each yield **four** routes R-a to R-d. A count below the stated maximum item label is a parse failure.

### 1.4 A second boundary the parse must handle

Several bound families run together with the **following field** because the source-to-markdown conversion dropped the separator. Example at line 5770:

> ...R-d the response to the enquiry.**other_route_classification**Permitted where the submission or responses evidence the means used.

**CS-I-21** Terminate a bound family at the first occurrence of a **known field-name token** appearing inside the value with no preceding separator. The tokens are: `other_route_classification`, `accountable_actor_available`, `time_reference_called_for`, `enquiry_point`, `account_test_point`, `bearing_interest`, `information_withheld`, `assertion_reference_set`, `attribution_support_set`, `material_items`, `available_routes`.

**CS-I-22** Where such a token is found inside a value, **capture the text after it as that named field** rather than discarding it. `other_route_classification` for `SRC-D1-S2-001` is "Permitted where the participant states the means aloud." It is a real value and is not part of R-d.

**CS-I-23** Log every field boundary recovered under CS-I-21 as a content-conversion note against the source version. The count of these is a quality signal on the issued file and is reported, not suppressed.

### 1.5 The "Empty." convention

**CS-I-24** A bound family whose value **begins with** `Empty.` is an empty family, whatever prose follows. `SRC-D1-S3-010` `attribution_support_set` reads "Empty. The interest is the participant's own and the pack provides no..." — that is empty with an explanation, not a one-item family. The existing `BOUND_FAMILY_ABSENT_OR_EMPTY` refusal is correct and applies.

---

## Section 2 — AC-12. The refusal is correct. Do not infer the beat.

**The judgment not to infer B2 was right, and the file proves it.**

### 2.1 The evidence

The demonstration sources at **Section 5.11** carry structured beat sequences. Two of them place the silence beat differently:

| Source | Line | Where the pause sits |
| --- | --- | --- |
| `DEMO-D1-S1-001` — The corrected figure | 1292 | **PAUSE at B3** |
| `DEMO-D1-S2-001` — the supplier source | 1354 | **PAUSE at B2** |

The role of a given beat code also varies. In the S2 demonstration source B4 is the corrective prompt and B5 the account test. In `SRC-D1-S2-001`, `information_made_available` places the corrective prompt at B5 and the timing question at B6.

**There is no uniform beat-to-role mapping, and inferring one would have produced a wrong timestamp against an approved script.** The refusal stands.

### 2.2 What can be built and claimed now

**CS-I-25** The **thirteen demonstration sources at Section 5.11 already carry structured beat sequences in a Reveal sequence table plus a Mentor script block.** Extract and load those thirteen now. Each `READ`, `ASK`, `PAUSE`, `SAY` line carries its beat code in parentheses.

**CS-I-26** Build the `mentor_action_sequence` schema now so that loading the remaining sources is a data operation and not a code change. Required per beat: `beat_code`, `beat_ordinal`, `action_type` in `{READ, ASK, PAUSE, SAY, BRIEF}`, `content_verbatim`, `is_decision_point` boolean, `pause_seconds_min`, `pause_seconds_max`, `role_label`.

**CS-I-27** Set `is_decision_point` **only from the loaded sequence**. Never derive it from the beat code, never from `enquiry_point`, and never from the presence of a pause. Where the field is absent, the dependent timing determination refuses by name, as it does today.

**CS-I-28** AC-12 may be claimed **for demonstration sources once CS-I-25 completes**, and is recorded as NOT YET CLAIMABLE for the forty-one production sources until their sequences load. Record it that way rather than as a single pass or fail.

**CS-I-29** The pause duration is **10 to 15 seconds** wherever a pause beat exists — `b2_pause_range_seconds` 10 to 15, and `between_turn_minimum_wait_seconds` 3. Those values are uniform and are not per-source. **The beat the pause sits on is per-source. The duration is not.**

### 2.3 What is outstanding, and on whom

Extraction of the mentor action sequence for the forty-one production source versions is **content authoring against approved scripts**. It is not a build task and is not attempted in this session. It is recorded in the conflict register as an open content dependency with AC-12 named against it.

---

## Section 3 — C5a line 2. The implementation stands. Serve the children.

**The reading is correct and is confirmed as the governing position.**

### 3.1 The reasoning

**BR-05 at Section 5.4, line 965** withholds Q-D1-05b1, 05b2 and 05c only where Q-D1-05a returns *Did not refer to any corrective action* — which is **C5a line 3**, "Named no corrective action."

**C5a line 2** is "Said action was needed without naming a specific action." Its composed statement **ST-D1-052 at line 1066** reads: *the participant indicated that action should be taken without identifying what.* That **is** a reference to corrective action. BR-05 does not reach it.

**CS-I-30** Serve Q-D1-05b1, 05b2 and 05c on **both** C5a line 1 and C5a line 2, subject to the source offering an actor, a route and a time reference respectively. Withhold all three only on C5a line 3.

**CS-I-31** C5a lines 1 and 2 persist as **different determinations** resolving to different statements — ST-D1-051 and ST-D1-052. That is already correct and does not change.

### 3.2 The one thing to watch, recorded not settled

C5b2 line 1 reads "Identified an available route **for the corrective action**." Where C5a returned line 2, no specific action was named, so "the corrective action" has no antecedent in the record.

This does not block. A participant can name a route or an actor for an unspecified action — "this should go to compliance" identifies a route without identifying the action. **Serve it and record it.** The wording sits in the statement library and any revision is a founder decision, not a build decision.

---

## Section 4 — Acceptance tests for this correction

| Test | Fixture | Expected result |
| --- | --- | --- |
| **CS-13** | Re-load `SRC-D1-S2-001` after CS-I-17 | `material_items` yields **four** items, M4 ending "materially higher." |
| **CS-14** | Same source, `available_routes` | Yields **four** routes R-a to R-d, R-b reading "send the corrected figure before the meeting." in full |
| **CS-15** | Re-load `SRC-D1-S3-010` | `available_routes` yields **four** routes R-a to R-d |
| **CS-16** | Same source, `other_route_classification` | Captured as its own field, **not** appended to R-d |
| **CS-17** | Any source whose bound family ends without terminal punctuation | Load **refuses** for that source version and names the field |
| **CS-18** | `SRC-D1-S3-010` `attribution_support_set` reading "Empty. The interest is..." | Treated as **empty**. Q-D1-04b refuses with `BOUND_FAMILY_ABSENT_OR_EMPTY` |
| **CS-19** | Load the thirteen Section 5.11 demonstration sources | Each yields a `mentor_action_sequence` with beat codes, action types and verbatim content |
| **CS-20** | `DEMO-D1-S1-001` | Pause resolves to **B3**, not B2, read from the loaded sequence |
| **CS-21** | A production source with no loaded sequence | Timing determination **refuses by name**. No beat is inferred from `enquiry_point` or from a pause |
| **CS-22** | C5a line 2 on a source offering an actor, a route and a time reference | Q-D1-05b1, 05b2 and 05c are **all served** |
| **CS-23** | C5a line 3 | All three children **withheld**, and their absence is not a missing state |
| **CS-24** | C5a lines 1 and 2 | Resolve to **ST-D1-051 and ST-D1-052** respectively, as separate determinations |

---

## Section 5 — What this correction changes

| Location | Change |
| --- | --- |
| Content load parser | Logical-bullet parse, field-boundary recovery, count and punctuation assertions. CS-I-17 to CS-I-24 |
| `mentor_action_sequence` | New schema, loaded for the thirteen demonstration sources. CS-I-25 to CS-I-29 |
| AC-12 register entry | Split: claimable for demonstration sources, NOT YET CLAIMABLE for production sources |
| BR-05 handling | **Unchanged.** The existing implementation is correct |
| T3A-D1-EXEC-001 | **No change.** The issued file is intact; the defect was in the load |

**No route, field, component, table or code identifier is renamed under this correction.** No element is removed from any screen.

---

**END OF CORRECTION. This file is complete. Nothing further is required from anyone to begin.**
