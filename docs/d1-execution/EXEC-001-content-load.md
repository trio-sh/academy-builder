# T3A-D1-EXEC-001 — Sections 5 to 8: build report

**Reference** T3A-D1-EXEC-001 v1.0, Sections 5, 6, 7 and 8
**Produced** 13 September 2026
**Status** Sections 5 to 8 built and proved. Eight §8.4 surfaces built. §5.3 reference card, §6 report face and §11 acceptance register and §3 cockpit served. Conflict register below.

---

## 1. What this corrects first

The PLC-005 Note 5 report recorded that the D1 source, question and
statement fixtures were **absent**, and declined to invent them. That was
true of the repository and false of the programme. The Execution Edition
carries all of it, and the Note 5 report has been corrected.

The content was not missing. It was **unloaded**. It is loaded now.

## 2. What was loaded

| Section | Content | Loaded |
|---|---|---|
| 5.2 | Question object register | **15 question objects** |
| 5.3 | Response capture catalogue | **13 sets, 44 capture lines** |
| 5.4 | Branch rules | **10 rules**, and the serving logic that applies them |
| 5.12–5.14 | Clause instance, resolution rule table, condition precedence | **44 resolutions, 6 conditions** |
| 5.15 | Coverage matrix | **generated**, 7 properties, all passing |
| 5.7 | Layer 1 statement library | **44 statements** |
| 5.17 | Controlled language template register | **14 templates** |
| 5.18 | The D1 source library | **40 sources**, with source sheets parsed |

The 44 capture lines and the 44 statements match one for one, which is
the check that the two registers describe the same thirteen sets.

Loaded by `scripts/extract-d1-content.mjs`, which parses the issued
document and emits the migration. **Nothing is authored, inferred or
defaulted by the developer.** Where the document states no value, the
field is null and the fail-closed behaviour for that control governs.

Statements resolve across all thirteen served question objects:

```
Q-D1-01  3    Q-D1-05a  3    Q-D1-07   5
Q-D1-02  4    Q-D1-05b1 2    Q-D1-08a  4
Q-D1-03a 5    Q-D1-05b2 3    Q-D1-08b  3
Q-D1-04a 3    Q-D1-05c  2
Q-D1-04b 4    Q-D1-06   3
```

Templates bound to an evidence state through the §5.6 report frames:

```
L-D1-ONE-001   single_event      D1-SCOPE-001  insufficient
L-D1-MC-001    multi_context     UNREP-001     insufficient
L-D1-REC-001   multi_context
```

The other nine are condition templates. §5.6 states no evidence-state
binding for them, so **none was invented** — they load with an empty
eligible-states array and apply in the §5.14 precedence order.

## 3. The refusal is the control, and it fires

§5.18 is explicit: *"A source that served today would mean a control had
failed."* Proved against the running system:

```
sources_loaded              = 40
sources_without_hash        = 40
sources_without_rec07       = 40
registered_for_serving      = 0
approved_sources            = 0
serve_into_real_run         = SOURCE_WITHOUT_REC_07_INTO_REAL_RUN
serve_ok_flag               = false
sheets_with_material_items  = 40
name_clearance_pending      = 40
```

**A note on how that was proved.** The first run of this test reported
`SERVED (FAIL)`, which would have been a failed control. It was a defect
in the test, not in the platform: `t3a_serve_source` refuses by returning
`{ok: false, reason: …}` rather than by raising, and the test caught only
exceptions. Corrected, the refusal is exactly as specified. The wrong
result is recorded here because a test that reads the wrong contract is
the way a real failure gets missed.

## 4. Why no source is registered for serving

The sources are loaded into the **content registry** —
`t3a_content_object`, `t3a_d1_content_version`, `t3a_d1_content_load_event`
— and deliberately **not** into `t3a_source_version`.

§5.18 says they *"load through the registry as content and refuse to
serve a real observation until each holds its REC-07 record and
source-version hash."* Creating a `t3a_source_version` row would assert a
registration these sources do not have.

The database agreed independently. `t3a_source_version` carries a CHECK
that an `observation_ready` source must hold `relevant_conduct`,
`irrelevant_conduct`, `stated_standard`,
`permitted_administration_variance`, `unsupported_inferences`,
`cross_context_map`, `min_seconds` and `max_seconds`. Across the forty
source sheets:

| Field | Sheets carrying it |
|---|---|
| `relevant_conduct` | 48 occurrences |
| `stated_standard` | 41 |
| `cross_context_map` | 41 |
| `min_seconds` / `max_seconds` | **14 of 40** |
| `irrelevant_conduct` | **0** |
| `permitted_administration_variance` | **0** |
| `unsupported_inferences` | **0** |

Three of the required fields are stated nowhere in the document, and
durations exist for fourteen sources. Registering these as
`observation_ready` would have required inventing values, which §0.2
forbids outright. **The constraint is enforcing the same control §5.18
describes**, from the other side.

## 5. Naming — no substitution was applied

§5.18 gives a deterministic replacement algorithm keyed on *the entity's
role as stated in the source sheet*, and then states the fallback plainly:
where the source sheet does not state the role, **leave the name
unchanged, record it, and keep the source at `name_clearance_status`
PENDING so it does not serve.**

No source sheet carries an entity-role table. So no substitution was
applied, no replacement name was invented, and all forty sources sit at
`name_clearance_status = PENDING`. The invented organization and person
names in the source prose — Ashcombe Practice, Northmere Client Services
and the rest — are **unchanged**.

The substitution mapping cannot be delivered because no substitution was
made. Producing one would mean choosing labels by reading the story, which
the section forbids in bold: *"do not choose a label by reading the story,
because choosing changes the source."*

## 6. Conflict register

| # | Conflict | Disposition |
|---|---|---|
| 1 | Five occurrences of the British spelling `behavioural` sit inside verbatim issued source content. The platform's vocabulary lock (T3A-DEV-SPEC-002 §1.4, AC-61) fails the build on it | **Raised by the developer, settled by the founder: correct the five.** Applied and verified. See §7 |
| 2 | `t3a_source_version` requires fields three of which the document never states | Sources loaded as content only; not registered for serving. §4 |
| 3 | No source sheet carries an entity-role table, so the §5.18 naming algorithm cannot be applied | Names left unchanged, all forty at PENDING. §5 |
| 4 | §5.6 binds only five templates to an evidence state | The other nine load with no binding. None invented |

## 6a. Serving — the branch rules applied to the source sheet

`t3a_d1_served_questions(source_sheet, answers)` returns one row per
question object with its serving decision and the rule that produced it.
**It takes the source sheet and never the Stage**, which is what BR-08
says in bold: source applicability governs, and service is never inferred
from the Stage.

Proved against the real loaded sheet for SRC-D1-S1-001:

```
BR-01   03a corresponded        -> 03b1, 03b2 not served
BR-02a  03a both                -> 03b1 SERVED
BR-02b  03a both                -> 03b2 SERVED
BR-04   no time reference       -> 05c not served
BR-05   no corrective action    -> 05b1, 05b2, 05c not served
BR-09   not within the period   -> 08b not served
parent missing state            -> children PARENT_MISSING_STATE
```

Missing-state applicability, per §5.5:

```
not applicable    / served      = refused at commit
not yet observed  / served      = refused at commit
declined          / not served  = refused, a missing state may not sit on an unserved question
declined          / served      = permitted
an invented code  / served      = refused, the eight codes are the complete vocabulary
```

**A bug worth recording.** The first run of this proof reported BR-02a and
BR-02b as *not served* when the parent answered *both* — the reason code
was right and the serving flag was wrong. The cause: with no `missing`
object in the answers, `(answers -> 'missing') ? 'Q-D1-03a'` evaluates to
NULL rather than false in PostgreSQL, and the NULL propagated through the
conjunction so every conditional child read as unserved. Under the branch
rules that is a silent wrong behaviour of exactly the kind §1 warns about:
the mentor would simply never be asked which items were omitted, and
nothing would report an error. Fixed with `coalesce`, and the reason it is
load-bearing is written at the declaration.

**The capture register carries no preference signal.** Verified
structurally: zero columns on `t3a_d1_capture_line` match
*expected, preferred, strong, flag, weight, correct, score* or *rank*.
There is nowhere to put an indication of which line is the better one.

## 6b. Composition — §5.12, §5.13, §5.14 and §5.15

**The capture-to-statement map is not positional, and assuming it was
would have been a quiet defect.** Within C4b the statement register runs
044, 045, **047, 046** while the capture lines run no-attribution,
all-aligned, none-aligned, both. Aligning by position would compose
*"both aligned and non-aligned attributions"* for a mentor who selected
*"none were aligned"* — a different sentence about a person, produced
silently. The map is therefore explicit, carries both sides, and is
verified rather than assumed.

`t3a_d1_coverage_matrix()` is generated from the registers and re-runs
whenever either changes. All seven properties pass:

```
Completeness              every capture line resolves
Uniqueness                one capture line, exactly one statement
No shared output          one statement, exactly one capture line
No impossible paths       every mapped statement exists in the library
No unreachable statement  every library statement is reachable
No limitation leakage     every condition renders through a template, in a fixed order
No absence language       L-D1-NO-001 is withdrawn and absent
```

Composition proved against the real SRC-D1-S1-001 sheet:

```
CE-01 ST-D1-011 · CE-02 ST-D1-022 · CE-03 ST-D1-032 · CE-04 ST-D1-041
CE-04 ST-D1-044 · CE-05 ST-D1-053 · CE-06 ST-D1-063 · CE-07 ST-D1-071
CE-08 ST-D1-084
```

Fixed order holds inside an element as well as across them:
`Q-D1-05a > 05b1 > 05b2 > 05c` and `Q-D1-08a > 08b`, never the order the
mentor happened to capture them.

§5.13 refusals, each proved:

```
omission asserted, child identifies none  = OMISSION_ASSERTED_WITH_NO_ITEM_IDENTIFIED
served question, no answer, no missing    = SERVED_QUESTION_UNANSWERED_AND_NO_MISSING_STATE
declined on a served question             = composes, and no clause references it
```

Bound variables fill from the record and no brace survives rendering.
Support-set items are **retained and not rendered** — naming the item
would name the person — and the proof asserts the item text appears in no
clause.

`state_code` equals the approved statement identifier exactly, per §5.12.
No separate state code is invented, derived or abbreviated.

## 6c. Section 6 — the report contract

| § | Built |
|---|---|
| 6.1 | The 21-item evidence review checklist, and the gate that runs it |
| 6.2 | The 11-block face, 8 controlled texts, the one-page contract |
| 6.3 | The 15-field traceability sheet and its completeness test |

**There is no override, and there is nowhere to put one.** §6.1 says a
checklist with an override is a checklist that will be overridden, so
`t3a_d1_review_result` has no override column, no waiver table and no
force flag — asserted in the proof as zero columns matching *override,
waiver, force, bypass* or *exempt*. The gate returns
`override_available: false` in its own payload so no caller can believe
one exists. Review results are append-only: a failed item cannot be
edited to a pass or deleted.

```
checklist_items      = 21        face_blocks         = 11
controlled_texts     = 8         traceability_fields = 15
override_columns     = 0

no review recorded        -> blocked, 21 items not recorded
twenty pass, item 19 fails-> blocked, rule reference FD-D1-07
edit the failed item      -> REVIEW_RESULT_APPEND_ONLY
delete the failed item    -> REVIEW_RESULT_APPEND_ONLY
not_established           -> blocks exactly as a failure does
```

§6.3's test is *pick any sentence and walk back to the source
observation; if any link is missing the sentence is not defensible and
should not have issued.* Implemented literally:

```
no trace at all   -> NO_TRACE_FOR_RENDERED_SENTENCE
partial trace     -> TRACE_LINK_MISSING, 14 of 15 fields absent
complete trace    -> defensible
```

§6.2's one-page contract fails rather than compressing:

```
340mm render -> LAYOUT_OVERFLOW, logged
260mm render -> rendered
```

**One schema change.** §6.2 names `layout_overflow` as the reason the
render must log, and `t3a_d1_report_refusal_reason` did not carry it.
The value was added. That is an addition to a controlled vocabulary,
never a rename of one, so Standing Rule 4 is untouched.

**One correction during the build.** The layout function first wrote its
refusal with a null participant, which the refusal log's NOT NULL
constraint rejected. The constraint was right and the signature was
incomplete — a render belongs to a participant's report — so the
parameter was added rather than the column relaxed.

## 6d. Section 7 — consent architecture

Built in full. Real consent capture stays disabled until activation; the
model, the states and the refusals exist now.

**RECORDING is in the register and marked unavailable, not omitted.** A
type absent from the register reads as an oversight; a type recorded as
unavailable reads as a decision. A trigger refuses any attempt to create
one, so "no route may request it" is enforced rather than documented.

```
consent_types           = 6        matrix_rows = 9
recording_consent       = CONSENT_TYPE_UNAVAILABLE_IN_D1
```

Stage entry, §7.6, against the real matrix:

```
S1, nothing granted     -> refused, naming AI_ADMINISTRATION and OBSERVATION
S1, observation only    -> refused, naming AI_ADMINISTRATION
S1, both granted        -> permitted
S1, a different notice  -> refused; a later notice never applies retroactively
S2, same consents       -> permitted, 1 consent checked, not 2
S4 co-participant       -> GROUP_SESSION only, never observation consent
```

The §7.3 state machine, and the one transition that matters most:

```
granted -> withdrawn    permitted
withdrawn -> granted    CONSENT_WITHDRAWN_CANNOT_BE_REGRANTED_IN_PLACE
granted -> declined     CONSENT_TRANSITION_NOT_PERMITTED
issuance after withdraw CONTRIBUTING_CONSENT_WITHDRAWN
```

Withdrawal is not deletion: the consent row and the observation both
survive, and what changes is what may be composed, issued or released.

§7.5, the named recipient. Every path returns a state and no content
except the one that should:

```
wrong address           ADDRESS_NOT_VERIFIED     content false
the named address       report_face              content true
after amendment         SUPERSEDED               content false
after revocation        REVOKED                  content false
after expiry            EXPIRED                  content false
a guessed token         UNKNOWN_TOKEN            content false
```

**"An approved employer account confers no access" is structural.**
Neither `t3a_d1_release_token` nor `t3a_d1_consent` carries an employer
column — asserted as zero in the proof — so the two things cannot be
joined by a later change without someone adding the column deliberately.
A recipient needs no account, and redemption reads only the function's
return: no full record, no traceability sheet, no other report, no other
participant, no search.

## 6e. Section 8 — Stage operating contracts

**8.1 — the S1 Confirmation Workbench.** The order is fixed and each step
is a separate persisted action: AI administration → human determination
capture → `confirmS1Observation` → commit → progression. The workbench
refuses to open where `model_ref`, `prompt_ref`, `configuration_ref` or
the responses are absent, and `confirmS1Observation` refuses where any
served question is unresolved. `captured_at` is held separately from
`administration_ended_at` so late capture is identified rather than
presented as contemporaneous. Q-D1-06 is excluded at S1 in the confirm
gate rather than left to the source sheet, because §1 places route use at
Stage 1 in the prohibited category for launch.

**8.2 — Stage 3.** The eleven-field provenance check, with
`prior_version_ref` as a twelfth **only** on a resubmission:

```
nothing supplied        AI_USE_DECLARATION_REQUIRED
tooling absent          AI_USE_DECLARATION_REQUIRED
first submission        passed, 11 fields
prior_ref on a first    PRIOR_VERSION_REF_ON_FIRST_SUBMISSION
a resubmission          passed, 12 fields
authorship not affirmed AUTHORSHIP_ATTESTATION_NOT_AFFIRMED
free text in an
assistance declaration  refused; controlled list only
```

**A defect found while proving this one.** `v_resubmission` was first
derived as *state is RESUBMITTED **or** prior_version_ref is present*.
That made §8.2's "must be absent on a first submission" check
unreachable: the field's own presence declared the submission a
resubmission, so a first submission carrying a stale reference passed
silently. The proof showed it as a refusal that never fired. It is now
derived from the state alone, and the reason is written at the line.

**8.3 — Stage 4.** One shared interaction, one observed participant. The
column is singular and a partial unique index enforces exactly one
observed member per session:

```
capture for the observed        permitted, 1 lane
capture for a co-participant    CO_PARTICIPANT_GENERATES_NO_OBSERVATION_RECORD
a second observed member        refused
a co-participant withdraws      administration variance on the observed
                                record; 0 co-participant records removed
the observed disconnects        STAGE_INSTANCE_PAUSED
the observed withdraws          excluded from current composition,
                                retained in history
media columns on the S4 tables  0
```

`RECORDING` is unavailable in D1 and no Stage carries it, so the Stage 4
tables hold no recording, media, video, audio or transcript column at
all — asserted as zero rather than left to a policy.

## 6f. The first §8.4 surface — the S1 Confirmation Workbench

*"Layout is yours; the screens, the actions and the refusals are not."*

`/dashboard/mentor/s1-workbench/:runId`. It reads the server for every
decision it makes: whether it may open, which questions are served, and
whether it may confirm. It decides none of them itself.

**What the confirmer sees, and nothing else.** §8.1.1 lists what must
not reach this screen — no other observation, no prior record, no
rehearsal history, no profile. That is enforced by a test that
enumerates every table the component reads and fails on anything outside
the permitted five: the administration run, the served source version,
and the three capture registers.

**The *must not appear* column is where a later edit does the damage**,
so it is covered by assertions rather than by intent:

```
no free-text input for a determination      no <textarea>, no text input
preselects nothing                          no defaultChecked, no defaultValue,
                                            selection state starts empty
no suggestion or highlight                  no suggest/recommend/preferred/
                                            likely/bestAnswer/autoSelect
never re-sorted                             no .sort(); the register's own
                                            line_order governs
no combined capture-and-confirm control     capture and confirm stay separate
```

**The two missing-state codes that may never be applied at commit are
absent from the control, not disabled in it.** `not applicable` and
`not yet observed` are not offered, because inapplicability is expressed
by non-service under the branch rules and *not yet observed* describes a
dimension rather than a field. The remaining six are offered, and the
control sits outside the answer list because a missing state is metadata
on the field and never a value inside the enumeration.

**An unserved question renders the rule that excluded it**, not an empty
control — so an absence reads as a rule rather than as an omission.

## 6g. Evidence review and issue — §8.4 against the §6 contract

`/dashboard/mentor/evidence-review`. The queue, the report under review
with all twenty-one items, the traceability sheet, and the review
outcome.

**The two prohibitions are absences, not disabled controls.**

*No manual override on any checklist item.* There is no handler, no
state and no affordance that applies one. The word does appear — the
screen says **"No override exists for any item."** and the server
payload carries `override_available: false` — and the test was narrowed
accordingly: it forbids a control that applies an override, not the
sentence that denies one. Forbidding the word would have deleted the
clearest statement on the screen.

*No combined review-and-issue control.* §6.1 item 19 is why: reviewing
makes an actor involved, so the reviewer can never issue the report they
reviewed. One control doing both would make that impossible to honour,
so completing the review says in as many words that issuing is a
separate act by someone not involved.

**A recorded result offers no edit.** Review results are append-only
server-side, so the screen shows *"Recorded. A review result cannot be
edited or removed"* rather than an edit control that would fail. The
test asserts no `.update(`, `.delete(` or `.upsert(` anywhere on the
surface.

The block verdict is read from `t3a_d1_review_blocks_issuance` rather
than computed on the client, so the screen cannot disagree with the gate.

## 6h. The named recipient — §7.5 and §8.4

`/report`. A public route: no sign-in, no account read, and nothing on
the page that an account would unlock. §7.5 asks the file to say once,
plainly, that a recipient does not need an approved employer account and
that holding one confers no access. This route joins neither — the test
asserts it reads no `useAuth`, no session, and neither
`employer_profiles` nor `t3a_employer_application`.

**The must-not-appear list is the longest on the §8.4 table**, and each
line is an assertion:

```
no full record, no traceability sheet  no read of statement_trace,
                                       observation_record or composed_statement
no other report, no other participant  the only two tables read are the block
                                       schedule and its controlled texts
no search                              no search, query, filter, ilike or textSearch
no export beyond the report face       no download, toPDF, print, csv, Blob
                                       or createObjectURL
no account requirement                 no useAuth, no session, no employer read
```

The export assertion is worth a note: it first failed on
`export default`, the module keyword. Naming the affordances instead of
the word is the fix — the same correction the override test needed on
the review surface, and for the same reason.

**Every refused path returns a state and no content.** Revoked, expired,
superseded, address-not-verified and unknown-token each render copy
explaining the state, and the report face renders only where the server
said content is permitted.

**Two §6.2 rules hold on the face itself.** A mandatory block whose
controlled text is not loaded renders a refusal rather than being
quietly omitted — the face says it is not a valid rendering. And block
11 renders nothing at all when there is no job-family evidence: no empty
label, no placeholder, no heading.

## 6i. The participant pathway — disclosures, and the mentor-pool rule

`/dashboard/candidate/disclosures`. §7.5's release model had no
participant surface: the data layer could issue, revoke, expire and
supersede a release, and nobody could see or revoke one. This is that
screen — releases made, their state, and revoke.

It reads exactly two tables, the participant's own issued reports and
their own release tokens, and the test asserts that set is closed. No
score, rank, readiness indicator or progress percentage appears, and no
mentor is read at all.

**The mentor-pool prohibition turned out to need a better test than I
first wrote.** §8.4 forbids *"any mentor pool, list, name, count or
availability before assignment"*. My first assertion found the first of
three `mentor_profiles` reads in the participant dashboard and checked it
sat inside one particular guard. It does not — there are three reads and
three different guard shapes:

| Line | Guard |
|---|---|
| 1537 | `if (assignments && assignments.length > 0)` |
| 4796 | `if (activeAssignment?.mentor_id)` |
| 5170 | `if (mentorIds.length)`, from active or pending assignments |

All three are constrained, and none lists a pool — the surface was
already correct. But a test that checks the first occurrence against one
guard shape would pass a codebase where the second and third were
unguarded. It now walks every read and asserts the invariant that
actually rules out a pool: each is filtered on an identifier the
participant's own assignment supplied, and no unbounded select over
`mentor_profiles` exists anywhere on the surface.

## 6j. Correction and reconsideration — the independence rule

§8.4 forbids *"assignment to anyone who observed, confirmed, progressed
or reviewed the record"* and *"any in-place edit of a composed
statement"*. Neither was enforced at the data layer: nothing refused an
involved reconsiderer, and nothing stopped a composed statement being
rewritten in place.

**The involvement register could not represent half the rule.**
`t3a_d1_involving_action` carried three values —
`s1_determination_capture`, `s1_confirmation`, `evidence_review`. So
**observing at S2, S3 or S4 and recording a progression decision were not
representable at all**, and a guard reading that register would have
passed both without noticing. Two of the four acts §8.4 names simply had
nowhere to be written.

`observed`, `progression_recorded` and `reconsidered` were added — an
addition to a controlled vocabulary, never a rename, the same disposition
as `LAYOUT_OVERFLOW` at §6.2.

Proved against the running system:

```
--- who may reconsider ---
the observer          RECONSIDERER_IS_INVOLVED (observed)
the participant       RECONSIDERER_IS_A_PARTY_TO_THE_CASE
who raised it         RECONSIDERER_IS_A_PARTY_TO_THE_CASE
an uninvolved mentor  eligible

--- the assignment refuses at the data layer ---
assign the observer   RECONSIDERER_NOT_INDEPENDENT
assign the uninvolved assigned
the same person again RECONSIDERER_IS_INVOLVED (reconsidered)

--- the outcome ---
no reasoning          REASONING_REQUIRED
outcome not in set    OUTCOME_NOT_IN_CONTROLLED_SET
amended, with reason  recorded
```

**Reconsidering makes the actor involved**, recorded at assignment, so a
second case cannot route back to the same person. Independence is
rechecked when the outcome is recorded and not only when the assignment
was made, because involvement can be acquired between the two.

**A composed statement supersedes and never rewrites.** A change to
`statement_body` refuses; marking a row superseded is the governed route
and is permitted; deletion refuses outright, because no attempt is
discarded or overwritten.

## 6k. The reconsideration surface

`/dashboard/mentor/reconsideration`. Intake, the case, and the outcome.

**Eligibility is asked before the control is offered, not after.** The
screen calls `t3a_d1_reconsiderer_eligible` and shows the outcome control
only where the answer is yes, so an involved actor never sees an action
they would be refused. It reimplements nothing: the test asserts the
screen never reads `t3a_d1_involvement` or compares an involving action
itself.

**There is no in-place edit, and nothing to build one from.** The surface
touches neither composed-statement table, carries no `statement_body`,
and has no `.update(`, `.upsert(` or `.delete(` anywhere — asserted. An
amendment supersedes; the earlier version stays in the audit history, and
the screen says so.

Three outcomes, each requiring reasoning, with the refusals behind them
already proved at §6j:

```
uphold   the record stands as it is
amend    supersede the statement
withdraw it does not contribute
```

The screen also tells a reconsiderer that deciding this case **makes them
involved in it from now on** — the same sentence the workbench carries
about capture, for the same reason: involvement is acquired by acting,
and the person acting should know it at the moment they act.

## 6l. Stage 3 — the work sample surface

`/dashboard/candidate/work-sample`. Brief and deadline, upload with the
three declarations, submission history, and accept / decline / submit.

**The three declarations render verbatim and carry no free-text route.**
Each is a required boolean plus, where it applies, one controlled
selection. The test counts every text-accepting input on the page and
asserts there is exactly **one** — the artifact reference — so a
free-text box cannot be added to a declaration without failing.

**No grade exists, and no field could hold one.** The provenance check
runs server-side rather than locally, and the surface reads exactly one
table.

**Three things the screen says, because saying them is part of the
contract:**

- *"You may decline without giving a reason. Declining records that the
  situation did not run — it is not an outcome, and nothing adverse
  follows from it."*
- A passed deadline *"composes no statement, is not adverse, and does not
  use up an attempt."*
- *"A resubmission supersedes the one before it. Nothing is overwritten
  and no submission is discarded."*

**A note on the tests, third time running.** The grade assertion first
failed on the page's own copy — *"It is not graded"*, *"no judgment about
its quality is recorded"*. The same thing happened with `override` on the
review surface and `export` on the recipient surface. In each case the
forbidden word appears in the sentence that denies the forbidden thing.
The assertions now name fields and controls rather than vocabulary, which
is what they should have done from the start: a word-match tests spelling,
not structure.

## 6m. Stage 4 — the shared session facilitator workspace

`/dashboard/mentor/group-session`. Sessions you facilitate, the room and
what each person's presence means, per-person pre-briefs, and the
statement of what nobody in the room sees.

**One shared interaction, one observed participant, one capture lane.**
The co-participants generate the pressure the observed participant meets,
and they generate no observation record, no determination and no
statement. The rule is already structural — a partial unique index makes
a second observed participant in a session unrepresentable — so the
surface has a real refusal behind it rather than a hidden control.

**Whether a lane exists is the server's answer, asked per member.** The
workspace calls `t3a_d1_group_capture_permitted` for every member and
renders a lane only where the verdict permits one. It never computes
permission locally, and it never assigns `permitted`.

**A co-participant is offered exactly one action: recording that they
dropped out.** The test walks every `onClick` in the co-participant block
and asserts each one is that single member event, then asserts the block
contains no `rpc(`, `insert`, `update` or outcome setter at all. A
determination or progression control cannot be added there without
failing.

**No media control of any kind.** RECORDING consent is not granted at any
Stage in D1, so there is no capture device, no upload input and no media
element. The assertion names `MediaRecorder`, `getUserMedia`,
`getDisplayMedia`, `<video>`, `<audio>` and `type="file"` — deliberately
not the word *record*, because *"Record a disconnection"* is a ledger
entry, not a recording. That is the fourth time the affordance-not-
vocabulary lesson has applied, and this time the test was written that way
first.

**Three things the screen says, because saying them is part of the
contract:**

- *"No participant sees any determination, record, capture lane or
  progression, at any point, by any route — including the person being
  observed."*
- *"Nothing is recorded about this person from this session."*
- A co-participant leaving is recorded *"as an administration variance on
  the observed participant's record — never as a judgment about the person
  who left"*.

**Accommodation is settled before composition, never during the session.**
Where a session records none as settled, the workspace says so before the
facilitator can start, rather than offering a mid-session control that
should not exist.

## 6n. §5.3 — the mentor reference card

`/dashboard/mentor/reference-card`, assembled server-side by
`t3a_d1_reference_card(source_identifier)` from two places and no third:
the capture register loaded verbatim from §5.3, and the source's own
sheet and script held verbatim in `t3a_d1_content_version.body`.

**The card holds no better line, and it holds none structurally.** The
register has no column a preference could be written into, and an event
trigger now refuses to let one be added — `is_preferred`,
`expected_response` and `red_flag_line` are each refused by name pattern
on `t3a_d1_capture_line` and `t3a_d1_capture_set`, while a neutral column
is accepted. Proved in an aborting block; the register's four columns are
unchanged afterward.

**The four questions come out of the script verbatim or not at all.**
Across the forty loaded sources the extraction is clean along stage
lines, which is the correct shape rather than a parsing gap:

| Stage | Sources | Four questions extracted |
|---|---|---|
| S1 | 10 | 0 — administered, carries no live script |
| S2 | 10 | 10 |
| S3 | 10 | 0 — work sample, carries no live script |
| S4 | 10 | 8 complete, 2 partial |

The two partial S4 scripts return what the script states and are marked
`FOUR_QUESTIONS_NOT_FULLY_EXTRACTABLE_READ_THE_SCRIPT`. **Nothing is
supplied to round them up to four.**

**Applicability is read off the source sheet, never inferred.** Each
conditional set names its governing field and returns that field's value
verbatim. `TRUE…` and `False…` resolve; anything else resolves to
`NOT_DETERMINABLE_FROM_SOURCE_SHEET`, which sends the mentor to the
source instead of guessing on their behalf.

**A defect in the loaded content, found by building this and recorded
rather than patched around.** Two of the forty source sheets —
`SRC-D1-S1-001` and `SRC-D1-S3-010` — carry question-applicability table
text in `material_items` and `assertion_reference_set` instead of the
list, because the extractor's field regex matched the wrong region in
those two documents. §1.5 makes these the two lists a claim is checked
against, so a wrong list is worse than an absent one: the card refuses
them with `LIST_NOT_IN_SOURCE_FORMAT_READ_THE_SOURCE` and shows the raw
value. Both are S1/S3 sources, which carry no live script and so no
in-session card, but **the sheets themselves are wrong and re-extracting
those two fields is outstanding work, not a closed item.**

**The card states that its source is not registered for serving.** None
of the forty holds a source approval or a source-version hash (§5.18), so
a card that looked production-ready would misrepresent the state. It is
named on the card instead.

## 6o. §6 — assembling the report face

`/dashboard/mentor/report-face`, assembled server-side by
`t3a_d1_report_face(ber_report_id)`. The eleven blocks were loaded and
proved in §6h; what did not exist was the assembly that puts them on a
page.

**Three rules, each enforced by what the function cannot do:**

- §6.3 — the traceability sheet is never part of the face. The function
  does not read `t3a_d1_traceability_field` or `t3a_d1_statement_trace`
  at all, so no path through it can emit one. It names the sheet as
  `NEVER_PART_OF_THE_REPORT_FACE` so a caller does not read the absence
  as an oversight.
- Block 5 — mentor names never render. `observer_id`, `confirmer_id` and
  `composed_by` are never selected into the payload. A column that is
  never read cannot leak, which is a different guarantee from stripping
  one afterwards.
- §6.2 — the controlled texts render verbatim. They are returned from the
  register as stored; there is no substitution, interpolation or template
  step for them anywhere in the function or the screen.

**A conditional block that did not fire renders as a named block with its
reason**, not as an absence. A block missing from a page and a block that
had nothing to say are different facts.

**Proved against the live database in an aborting block:**

| Attempt | Result |
|---|---|
| Unknown report | `BER_REPORT_NOT_FOUND` |
| No review recorded | `REVIEW_BLOCKS_ISSUANCE`, 21 unrecorded, `override_available: false` |
| One item failing, twenty passing | `REVIEW_BLOCKS_ISSUANCE`, one blocking item |
| All twenty-one passing | renders, 11 blocks, 9 always-render, 2 conditional off with named reasons |
| Controlled texts | 6 verbatim; block 2's text byte-identical to the register |
| Mentor-identifying keys on the face | 0 |

Post-test counts are zero: no report and no review result survived.

**Two existing controls fired during the proof and were worked with
rather than around.** A report against an account whose email is
unconfirmed is refused outright, so the proof uses confirmed accounts;
and a review result cannot be flipped from fail to pass in place, because
the table is append-only, so the passing case uses a second report rather
than an update.

## 6p. §11 — the acceptance tests

`/dashboard/mentor/acceptance-tests`. Thirty tests loaded verbatim, and
the evidence recorded against them, as two tables that are never merged.

**"A test specification is not a passed test."** That sentence decides
the shape of all of it. The register carries no outcome column, the
evidence table is append-only, and the completeness function counts only
tests with a recorded pass. There is no default outcome: a test with no
evidence is not a pass, is not a fail, and is not quietly dropped from
the count — it is named.

**AC-25 is absent from the issued table.** It is therefore absent here.
The gap is recorded rather than filled.

**Proved against the live database in an aborting block:**

| Attempt | Result |
|---|---|
| Append evidence | accepted |
| Edit a recorded result | `ACCEPTANCE_EVIDENCE_APPEND_ONLY` |
| Delete a recorded result | `ACCEPTANCE_EVIDENCE_APPEND_ONLY` |
| `blocked_by_conflict` with no conflict stated | refused |
| Evidence with an empty actual result | refused |
| Evidence against an unknown test id | refused |
| Add an `outcome` column to the register | **accepted on the first run** — see below |
| Gate with one of thirty passed | `complete: false`, `tests_passed: 1` |

**A claim of mine that the proof disproved, and what was done about it.**
The migration comment said an outcome could not be recorded by editing
the specification, "because the register has no column for one". The
first proof run added an `outcome` column to the register and was
accepted. True-until-someone-runs-one-ALTER is not a control, so an
event trigger now refuses any outcome-, result-, status- or
verdict-shaped column on `t3a_d1_acceptance_test`, and the re-run
records `outcome_on_register=REFUSED`.

**The gate is written to be read by T3A-D1-REL-001**, which makes "the
acceptance evidence for Section 11 returned complete" one of its seven
activation conditions. It names the tests without a pass rather than only
counting them, and states `override_available: false` in its own return.

## 6q. §5 — the source sheets, re-extracted

The load at 20260926000000 read each source sheet with a regex that took
the **last** match for a field. Some sources state a field more than
once: as the sheet entry, inside a later question-applicability table, and
sometimes as a fragment of a sentence that merely mentions the field name.

**The earlier report understated this.** It named two sources and two
fields. Measured properly, against the item shapes the sources
themselves use:

| Selection rule | material_items | assertions | attribution set | routes |
|---|---|---|---|---|
| Last match (the original load) | 38/40 | 38/40 | 39/40 | 38/40 |
| First match (my first correction) | 15/40 | 15/40 | 21/40 | 11/40 |
| **Longest non-question-coded** | **40/40** | **40/40** | **39/40** | **39/40** |

**My first correction made it worse, and it reached the database.** It
ran under the first-match rule and superseded thirty-two sources with
values worse than the ones they replaced. The rule was then measured,
corrected, and the standing versions brought to the right end state.
`20261007000000` carries the re-extraction as a fresh database needs it;
`20261008000000` records the corrective run and is a no-op on a fresh
database. The mistake is recorded rather than tidied away.

**Position does not decide it; the value does** — on two mechanical rules
and no knowledge of what any source says. A question-coded value is never
the sheet entry, and between the rest the sheet entry is the fullest.

**Two the rule cannot recover, left alone rather than guessed:**
`SRC-D1-S1-010` `attribution_support_set` and `SRC-D1-S3-010`
`available_routes`. The reference card refuses both lists and sends the
mentor to the source, which is the correct behavior for a list a claim
would otherwise be checked against.

## 6r. §3 — the Stage 2 cockpit

Three of §3's rules lived only in the interface. A refusal that lives in
a screen is not a refusal, so they are the server's now.

**§3.1 / builds 058 and 065 — the viewport refusal.** Below 1280 by 800,
Stage 2 live capture refuses. It does not reflow, collapse a pane or
reduce either live view, and a phone is blocked outright regardless of
the viewport it reports. The screen returns the refusal *before* the
layout, so no reduced version of the six regions can render beneath it,
and the grid carries no responsive breakpoint at all — a test asserts
there is none.

**§3.3 — the live-view availability rule, with its four thresholds.**
Proved against the live database:

| Condition | State |
|---|---|
| No frames for 2s | AVAILABLE |
| 3s | DEGRADED — surfaced, session continues |
| 9s | DEGRADED |
| 10s | UNAVAILABLE — pause route, advancement blocked |
| Track ended | UNAVAILABLE immediately |
| Track muted | DEGRADED |
| Restoring, 4s of frames | UNAVAILABLE |
| Restoring, 5s of frames | AVAILABLE, variance on resumption |

**Build 060 — variance at the beat.** The control sits inside the script
pane beside the beat it concerns, not behind a session-end step, because
*"an inconvenient self-report will not be made."* Variances are
append-only server-side.

**Build 063 — the mentor-load instrument.** Five process measures, and
structurally incapable of being anything else: the table has no
participant column and no score column, and an event trigger refuses to
let one be added. Proved — `participant_id` refused, `performance_score`
refused, a neutral `note` column accepted.

**Build 057 — the arrangement.** Participant live view above mentor live
view in the left column; source and script above determination capture in
the right. The mentor live view did not exist before; it is a
live-presence surface only, and nothing is captured from it.

**A conflict found on the live surface and fixed.** The cockpit carried a
pulsing **REC** badge captioned *"Sessions are recorded under the
retention schedule per acknowledgement clause 5."* `t3a_d1_consent_type`
records RECORDING as **unavailable in D1** — no Stage carries it, and
Stage 4 has no recording. The badge told a mentor, on a live observation
surface, something the consent architecture says is not true. It is
removed, and a test asserts no recording indicator returns.

**If that acknowledgement clause governs some other dimension, the two
documents disagree and the disagreement is real.** Recorded here rather
than settled: the badge is gone from D1's surface either way, but whether
a recording clause exists for another dimension is not a developer's call.

## 6s. §11 — the acceptance tests, executed

Thirty evidence records for build `7e597da`. **Nine passed, fourteen are
blocked by a governing input that does not exist, and seven were not
executed in this run and say so.**

| Outcome | Tests |
|---|---|
| Pass | AC-02, AC-03, AC-07, AC-09, AC-14, AC-20, AC-21, AC-22, AC-30 |
| Blocked by a conflict | AC-01, AC-04, AC-05, AC-06, AC-08, AC-12, AC-13, AC-17, AC-23, AC-24, AC-26, AC-27, AC-28, AC-31 |
| Not executed | AC-10, AC-11, AC-15, AC-16, AC-18, AC-19, AC-29 |

**The gate still returns false, and that is the correct state.** It names
all twenty-one tests without a pass. Nothing here was made to look
finished: T3A-D1-REL-001 reads this gate, and a gate that says yes when
nine of thirty passed is worse than no gate.

**Two governing inputs are missing, and they account for all fourteen
blocked tests.** No source is registered for serving — none of the forty
holds a REC-07 approval or a source-version hash (§5.18) — and both live
views are placeholders until the meeting workspace lands. §11 says record
that as a conflict rather than resolving it by weakening the test, so
each blocked record names the input it lacks.

**The seven not-executed records are the ones it would have been easiest
to reason into passes.** AC-11 in particular: the missing-state register
holds eight codes, §5.5 permits six at commit, and the workbench offers
exactly those six as field metadata. That reasoning is sound and it is
still not a test run, so it is recorded as not executed.

## 6t. A live route that generates AI scores from microphone speech

Found while executing AC-20 and AC-24, and **it is not a D1 surface**,
which is why it survived every D1 control built so far.

`/dashboard/candidate/observations/session` mounts
`InteractiveSkillAssessment`. It captures microphone speech through the
Web Speech API, builds a transcript, and runs an AI analysis that returns
**per-dimension scores** and written feedback.

What it does **not** do: it writes to no `t3a_d1_*` table. D1 evidence is
untouched by it, and every D1 control holds.

What is true anyway:

- it is live and participant-facing, on a route named **observations**;
- it uses the microphone, while `t3a_d1_consent_type` records RECORDING
  as unavailable in D1 because no Stage carries it;
- it produces scores about a person's conduct, which is the thing §3.4
  and AC-21 exist to prevent on an observation surface.

**Not resolved here.** It reads the legacy tables (`observation_loops`,
`mentor_assigned_dimensions`), so it belongs to the pathway that predates
D1, and removing a live participant-facing feature is a product decision
rather than a developer's. Recorded so the decision is taken knowingly:
if a participant reaching that route believes they are being observed,
they are being scored by a model and told so by nobody.

## 6u. §11 — executing the rest, and what executing them found

Five of the seven not-executed tests were executed. **Not one of them
could have passed**, because the thing each tests did not exist. The
value of §11 turned out to be less in the passes than in what running it
exposed.

| Test | What executing it found | Now |
|---|---|---|
| AC-10 | Nothing refused a determination carrying neither an answer nor a missing state | Refused by constraint, per row |
| AC-11 | The `t3a_missing_state` enum held the eight codes and **no column anywhere used it**. `selection` was `NOT NULL`, so a mentor with nothing to record had to invent an answer or write the missing state into it | Own column, typed by the enum; the two §5.5 forbids refused; a code smuggled into the answer refused |
| AC-15 | No pause event existed. The cockpit held a flag in component state, so a pause left no record, cleared on refresh and blocked nothing | Append-only event; blocks advancement pending a recorded clearance |
| AC-16 | No end event existed. Ending a session was indistinguishable from closing the tab | Controlled event; reports what is still held; commits nothing |
| AC-29 | Nothing prevented advancing past an unresolved determination | Refused, and the unresolved questions are named |

**A pause is not a progression outcome, and that is structural.** The
event table carries no progression, outcome, verdict or participant
column; an event trigger refuses to let one be added; and the verdict
says `is_a_progression_outcome: false` in its own return so no caller
infers it from an absence.

**A real bug the first proof run caught.** A pause and its clearance
recorded in one transaction share a `recorded_at`, because `now()` is the
transaction timestamp rather than the statement one. The tiebreak was the
primary key — a random uuid — so *"the latest pause event"* was decided
by a coin toss and a cleared pause could still read as standing. Ordering
is a monotonic sequence now, exact whatever the clock does.

**The gate stands at 14 of 30.** Fourteen blocked on the two missing
governing inputs, and AC-18 and AC-19 not executed — both need a commit
performed as an authenticated authorized mentor, which this SQL channel
cannot do because `auth.uid()` is null and the commit function refuses at
its first check. That is a limit of the harness rather than a missing
governing input, and it is recorded as such rather than dressed up as a
conflict.

## 6v. Two founder decisions, taken

### The participant scoring route — withdrawn

`InteractiveSkillAssessment`, mounted at
`/dashboard/candidate/observations/session` and presented to
participants as **"Begin S1 Session"**, captured microphone speech, built
a transcript, and ran an AI analysis returning per-dimension scores. The
card beside it read *"N/M dimensions scored"*.

Three things were wrong, and none is a matter of taste:

- D1 grants no RECORDING consent at any Stage — `t3a_d1_consent_type`
  records it unavailable because no Stage carries it — and this took the
  microphone;
- it produced scores about a person's conduct, which is what §3.4 and
  AC-21 exist to prevent;
- S1 is AI-administered and then confirmed by an authorized human in the
  S1 Confirmation Workbench. A self-serve scoring session is not that
  pathway, and a participant reaching it believed it was.

The route is withdrawn, the card now says Stage 1 is arranged for the
participant, and the score and progress counts are gone from the
participant pathway per §8.4. **The component is left in the tree rather
than deleted** — nothing is lost if it is wanted for another dimension
under its own doctrine. Three tests hold that it stays unreachable.

### REC-07 approval — the door is built, and not walked through

Fourteen acceptance tests are blocked on one input: no source is
registered for serving. The tempting move was to write an approval and
unblock them.

**It was not taken.** An approval a developer can write to get a test
green is not an approval. Everything else here — the append-only logs,
the hash chains, the refusals that survive a `SECURITY DEFINER` route —
exists so a governance record means what it says. Fabricating one to move
a number from 14 to 24 is the most expensive shortcut available.

What was actually wrong is that **the governance act had somewhere to
land and no door to come through**: RLS on, one read policy, no insert
policy, no trigger, nothing checking who may approve, and a status column
any writer could set to `approved`.

Now: approving is a function rather than an INSERT; the approver's
standing is checked server-side; an approval names a person, a moment and
an exact version; it is append-only, so withdrawing is a new row and the
history shows the source was once approved; a superseded version cannot
be approved; and a version with no source-version hash cannot be
approved, because an approval names an exact text.

**A defect found by proving the route rather than reading it.**
`t3a_d1_source_approval.source_id` pointed at `t3a_source`, which holds
**zero rows** — the forty loaded sources live in `t3a_content_object`,
and the version column beside it already pointed at the content register.
REC-07 approval was therefore *impossible by construction*: the one table
that records an approval could not name a single source that exists, and
it would have read as "nothing approved yet" forever. The foreign key is
re-pointed at the register the sources are actually in; the table was
empty, so nothing was migrated and nothing lost.

`t3a_d1_serving_readiness()` now states the position plainly: **40
loaded, 0 approved, 0 carrying a hash, nothing servable** — blocked on a
governance act by a person with standing, which no build may perform.

## 6w. Three findings from review, and one of them was mine

An automated review on PR #282 raised three P1 findings. All three were
correct and all three are fixed.

### The one that mattered — a hole I opened

`20261004000000` created `t3a_d1_report_face(ber_report_id)` as
`SECURITY DEFINER` and granted EXECUTE to **anon and authenticated with
no caller check of any kind**. Any caller holding a report identifier
could read that participant's composed conduct rows.

It was not theoretical. `t3a_employer_pool_query` returns each pool
entry's `ber_report_id` to an approved employer, so the identifier is
handed out by design — and a direct RPC call with it bypassed the
participant-controlled release entirely and **kept working after the
participant revoked**.

This is the same shape as the three `USING (true)` tables the Employer
Desk work closed, rebuilt by me in a function a few sections later. Worth
stating plainly: a refusal is not a habit. It has to be written every
time, and I did not write it.

Now the assembly and the entitlement are separate.
`t3a_d1_report_face_assemble` has **no grant to any role**, and two gates
reach it: the participant or an actor with administrative standing, and a
token holder through the release route. Proved — the exact attack returns
`NO_CALLER_IDENTIFIED`, the assembler has zero grants, `anon` has none on
the face.

### The recipient saw boilerplate instead of their report

After redeeming, the page loaded the *global* block schedule and the
controlled-text register and never the redeemed report. Every valid
recipient saw the explanatory text and a render-behaviour string where
the observed conduct belonged.

It now calls `t3a_d1_report_face_for_release(token, address)`, which
re-checks the token on **every** call — so a revocation takes effect
immediately rather than at a login the recipient does not have — and
returns the face of that report. The page reads no table at all.

### The release button that released nothing

The participant's release form prevented the browser submit and showed a
success toast. It created no consent and no token, so there was no link
for the named recipient to redeem. The screen advertised an action the
system could not perform — and there was no route to perform it, because
`t3a_d1_issue_release_token` did not exist.

It does now: one DISCLOSURE consent per release (§7.1, never standing),
one token naming one recipient and one report at one version, only the
participant may issue one for their own issued report, and the link is
returned once and stored only as a hash.

**A gap found while fixing the second one.** Where a mandatory block's
controlled text is not loaded, the assembler refuses the whole face — but
the page would have rendered that as zero blocks, which reads as a short
report rather than a refused one. The refusal is now carried through and
stated.

## 6x. The two blockers, taken as far as they honestly go

### Source-version hashes — done

All forty standing versions now carry sha256 over their own verbatim
body. `t3a_d1_source_hash_integrity()` reports **40 of 40 matching, none
mismatched**. Assigned by superseding rather than editing, because a
loaded body is immutable — the same route the spelling correction and the
sheet re-extraction took.

A hash is arithmetic over text already loaded. It says which text a
version is; it says nothing about whether that text is fit to put in
front of a participant.

### REC-07 approval — a surface, not a row

That second thing is a signature, and a signature has to be made by
whoever it names. So `/dashboard/mentor/source-approval` lists the forty
with their hash and status and records an approval **in the approver's
own name**, through the governed route, which re-checks standing, the
version, the hash and the supersession state server-side.

- **no approve-all control** — an approval is per source and per version,
  and a control that approves forty at once approves forty unread;
- **no edit to a source** — a screen offering both would invite a
  correction recorded as an approval;
- approval is disabled outright for a version carrying no hash;
- withdrawing records a withdrawal rather than erasing.

Readiness now reads **40 loaded, 40 hashed, 0 approved**. The remaining
step is one person, one click, and their name on it.

### The live views — wired, and waiting on a provider rather than on code

`src/lib/liveView.ts` is the layer between a media track and §3.3. It
takes a `MediaStream` from whatever the meeting workspace turns out to be
— LiveKit, Daily, Twilio, a raw peer connection — so **no vendor, no
credential and no account is needed to finish and prove the wiring**.

It measures and asks; it never decides. §3.3's four thresholds live in
`t3a_d1_s2_live_view_state` and the client holds none of them, because a
second opinion in the browser is exactly how a session continues as if
conditions were intact. Decoded frames are read from the peer connection
where one is available, because a connection can be healthy while the
participant's picture is frozen — and where no peer connection is
exposed, the track's own state is reported honestly rather than guessed.

**A view with no track reads UNAVAILABLE, not AVAILABLE.** Saying a view
is fine before a track has arrived is a claim rather than an observation,
and the cockpit holds the session rather than running it blind.

Both regions now display a real stream and record nothing: no
`MediaRecorder`, no upload, no retained frame, and the mentor's own view
is muted so it cannot feed back into the room.

`setParticipantStream` and `setMentorStream` are the seam. Everything
downstream of them is built and proved, so attaching a provider is a
one-line change rather than a feature.

## 6y. Two more from review, and the same lesson twice

### A rule that was displayed but not enforced

The §3.3 verdict was measured, judged and **shown**. It drove a banner
and nothing else: the commit control still wrote an observation record
while the screen said the session was paused and advancement blocked.

That is the report-face mistake in a different place. A rule a screen
states and a rule a route enforces are not the same thing, and only the
second one is a rule. Twice in one day, in code I wrote, and both times a
reviewer found it rather than me.

Fixed in two halves:

- **the verdict is recorded, not just shown.** An unavailable required
  view writes a pause event, so the block outlives the component, a
  refresh, and the tab being closed. `t3a_d1_s2_advancement_permitted`
  already refused while an uncleared pause stood; now it has something to
  refuse on. Restoration writes the clearance *and* the administration
  variance §3.3 requires, because a variance a mentor has to remember is
  a variance that goes unrecorded.
- **commit is gated server-side**, on the observation record itself
  rather than in a function the client could route around.

Proved: degraded writes nothing and the session continues; unavailable
pauses; a repeat report does not write a second pause; advancement is
refused; **the commit is refused while paused**; restoration resumes with
a variance; the commit is then accepted; and a non-Stage-2 record is
untouched.

**The same NULL trap as BR-02a, for the third time.** With no session
event yet, `v_last` is NULL and `(NULL = 'paused')` is NULL rather than
false, so `NOT v_paused` is NULL and the pause branch never fired. The
first proof run caught it reporting `NO_CHANGE` for an unavailable view —
which would have left the commit gate open in exactly the case it exists
for. `coalesce` is load-bearing.

### Approval standing read from a historical row

The approval table is append-only, so a withdrawal leaves the original
`approved` row in place. The surface looked for *any* approved row, so it
kept reporting a withdrawn source as approved and offering to withdraw it
again — and it ignored which version the approval belonged to, so a
corrected source would have inherited its predecessor's approval on
screen.

Standing is now the latest event for that source **at the version now
standing**, and a test holds that no predicate matching a historical row
returns.

## 7. The spelling conflict — raised, and settled by the founder

**Five occurrences of the British spelling `behavioural`** sat inside the
quoted source bodies, across three of the forty sources. Two rules
governed and they conflicted:

- T3A-D1-EXEC-001 §5: nothing in the content is *"derived from prose,
  inferred, or authored by the developer"*.
- T3A-DEV-SPEC-002 §1.4 and AC-61: U.S. spelling in all new code and
  interface strings, enforced by a build-failing check whose own list is
  *"extended, never shortened, without governance approval"*.

The developer did not settle it. The generated file was grandfathered
with the reason stated at the allowlist entry, and the question was put
here.

**The founder settled it: correct the five.** Applied as follows.

| Where | What |
|---|---|
| Generated migration | The five corrected in place, one of them uppercase |
| `scripts/extract-d1-content.mjs` | The correction recorded as `FOUNDER_DECIDED_CORRECTIONS`, applied by name so a regeneration cannot reintroduce them and no other word is touched |
| Loaded content | `20261005000000` supersedes each affected version with a corrected one |
| `scripts/check-vocabulary.mjs` | The grandfather entry removed |

**The correction supersedes; it does not overwrite.** A loaded version
body is immutable — `t3a_d1_content_version_immutable` refused the
in-place edit, which is the same doctrine that makes a composed
statement superseded rather than rewritten. So each affected version is
marked superseded by a new version carrying the corrected body, and each
carries a load event saying why. The originals stand exactly as loaded.

Verified against the live database: **0** standing versions carry the
British spelling, **3** standing versions carry the U.S. spelling, and
**3** superseded versions still hold the original wording in history.

**Two files still name the wrong spelling, and must.** The correction
migration and the extractor each have to name it in order to find it; a
check that forbade that would forbid ever correcting it. Both are
allowlisted with that reason and nothing else.

## 7a. §3 — the live views have a transport, and a gate they did not have

The outstanding item read "what is missing is a stream to attach". The
stream is attached, and building it turned up something that mattered
more than the stream.

**No vendor was chosen.** A direct peer connection between the two
browsers, signalled through a relay table on Supabase Realtime, needs no
account, no credential and no procurement decision. `liveView.ts` takes a
`MediaStream` and does not care where it came from, so swapping in
LiveKit or Daily later replaces one file. What is not solved is a
restrictive network: STUN alone cannot traverse a symmetric NAT, and TURN
is a service rather than a code change. On such a network the connection
does not establish, the view reports UNAVAILABLE, §3.3 pauses and the
commit gate refuses — the right behavior, failing closed, but the remedy
is a TURN service.

**Nothing opened a camera on a check.** §7 records OBSERVATION consent
and `t3a_d1_consent_type_available` already refuses to grant RECORDING,
but no route asked either question before showing a live view;
`t3a_d1_s2_capture_permitted` gates on device class and viewport only. So
`t3a_d1_s2_live_view_permitted` now decides, resolving the participant
from the Stage instance itself rather than taking a caller's word for who
the session is about.

**The gate is structural, not advisory.** The signalling relay's RLS
requires the same standing consent, so a client that skips the check and
opens its own camera still cannot exchange an offer. Proved: a withdrawn
consent refuses the relay with `42501`, not merely the display.

**Two faults found by proving it rather than reading it.**

1. The party rule admitted a mentor only through
   `t3a_has_administrative_standing()`. No ordinary assigned mentor could
   have run a Stage 2 session at all — only an oversight administrator.
   It reads the assignment register now.
2. Worse, and the same clause: it would have let **every oversight holder
   join any participant's live video**, unassigned and unrecorded.
   Oversight standing exists to approve sources and read what was
   recorded afterwards; watching a person through their camera is not an
   administrative act. The clause is gone, and the test that caught it
   only caught it because the one mentor account on the system holds
   oversight standing and was admitted by the wrong branch.

**The participant had nowhere to appear from.** The cockpit had a live
view and there was no participant-side surface, so the connection had no
second end. There is one now, and it tells the participant what the
server decided and states that nothing is recorded. The mentor offers and
the participant answers, because a mentor knows which participant the
Stage instance is about and a participant has no way to know which mentor
is running the session.

---

## 7b. §11 — AC-18 and AC-19 were blocked on the wrong reason

Both were recorded `not_executed` with this reason: *"auth.uid() is null,
so the function refuses at its first check. This is a limit of the test
harness."*

**Withdrawn.** `auth.uid()` reads `request.jwt.claims`, which a proof can
set — every gate proved since has been exercised as a named authenticated
actor that way. The harness was never what stood in the way, and it was
also the wrong route: that note describes `t3a_commit_observation`, which
writes `t3a_observation`. AC-18 and AC-19 are §11.1 **Cockpit** tests,
and the cockpit writes `t3a_observation_record`. Looking at the other
path made a design gap look like an access problem.

**What is actually in the way.**

**AC-18 would fail as built.** `t3a_observation_record` carries
`authority_snapshot_id`, `t3a_authority_snapshot` exists to hold the
authorization in force, and `t3a_role_authorization` is the register it
would come from. The cockpit's commit writes none of them — it leaves
`authority_snapshot_id` null. A committed action traces to no
authorization, which is the exact property AC-18 tests.

**AC-19 half-fails.** `version_set` pins the stage entry, the source
version and the answers, but not the question-object, answer-catalogue or
applicability versions AC-19 names. And no trigger stops a committed
record being updated afterwards, so "later updates rewrite no history" is
stated by the test and unenforced by the table. Content versions
themselves *are* immutable, so that half holds.

**And the cockpit cannot commit at all.** Its `StageEntryRow` declares
eleven columns of `t3a_stage_entry_event`. Eight do not exist:

```
participant_id  dimension_id  source_version_id  randomization_seed
presentation_variant_seed  administration_conditions_snapshot
env_state_at_entry  entered_at
```

The load uses `select("*")`, so it does not error — it reads `undefined`
for all eight, which is why this stayed invisible. No source body loads,
so there are no questions to determine, and then `commit()` selects
`source_version_id` explicitly and PostgREST refuses with `42703`.

**Settled on the founder's instruction: path 1.** See §7c. It is a
reconciliation rather than a design decision, and the two candidate
paths were:

1. **Add the eight columns** to `t3a_stage_entry_event`. Additive,
   renames nothing, and matches what both the cockpit and the D1 design
   already assume.
2. **Point the cockpit at the registers that hold the facts today** —
   participant through the gateway, dimension and attempt through
   `t3a_stage_instance`, source version from wherever the Stage 2 entry
   records it.

(1) was taken.

---

## 7c. §11 — the reconciliation, the commit route, and AC-18 and AC-19

**The eight columns were never invented.**
`20260903000000_t3a_d1_gateway_and_source.sql` defines every one of them,
by name and by type. It is one of the four migrations `20260905`'s
post-mortem covers: applied statement by statement with the errors
swallowed, and its `CREATE TABLE IF NOT EXISTS` for the stage entry lost
silently to the spec-002 table `20260811160000` had already created. The
richer definition never landed; the insert function that fills it did.
So the cockpit was built against the design, and the design lost a race
in August.

They are added as that migration wrote them, with two departures the
repair migration forced: `source_version_id` references
`t3a_d1_content_version` rather than the legacy register the forty
sources are not in, and the gateway link stays the existing
`observation_path_gateway_id` rather than a second gateway column.
Nothing is renamed — `administration_conditions` and `created_at` stay
beside the new `administration_conditions_snapshot` and `entered_at`, and
that overlap is recorded rather than resolved by dropping a column other
code may read.

**The facts are derived, not demanded.** Two insert paths already write
this table and the older one supplies none of the new columns, so
requiring them outright would have broken a working route. `participant_id`
comes from the gateway, `dimension_id` from `dimensions_in_play` when
exactly one is in play, the seeds from the clock, the environment from
`t3a_current_env_state()`. A participant that cannot be derived is a
refusal, not a null, and a second trigger refuses an entry whose
participant contradicts its gateway.

**The commit became a route.** A client insert could never satisfy AC-18,
and not because the client forgot: the authorization in force is a fact
about the server at the moment of the write, and a caller asked to supply
it could supply any authorization it liked. `t3a_d1_s2_commit_observation`
takes the snapshot itself, reads the participant, dimension and source
from the Stage entry rather than from the caller, and refuses a mentor
holding no current `observe` authority or not assigned to that
participant.

**Both tests were executed.** As an authenticated mentor, against the
real functions and triggers, on synthetic fixtures in a transaction that
ends in `RAISE` — so nothing the run wrote survives, and the database was
checked afterwards rather than assumed.

| | AC-18 | AC-19 |
|---|---|---|
| Commit without the authority | `42501 ACTOR_NOT_AUTHORIZED` | — |
| Record carries the snapshot | yes | — |
| Snapshot names actor and authorization | yes | — |
| Status captured as at the commit | `granted` | — |
| Source and source hash pinned | — | yes |
| Question, catalogue, applicability pinned | — | three 64-hex digests |
| Rewriting a committed record | — | `23514 COMMITTED_OBSERVATION_IS_SEALED` |
| Deleting one | — | `23514` |
| Confirmation still possible after | — | yes |

`confirmer_id` is deliberately not sealed. Confirmation is a separate act
by a second person; sealing it would have made confirmation impossible,
and leaving the rest open would have made AC-19 a slogan.

**One refusal worth keeping.** The first run was refused by
`t3a_oversight_refuse_mutation`: an account holding administrative
standing may not create evidence. The only mentor account on this system
is also the oversight holder, so the standing was set aside inside the
aborted transaction to obtain a plain mentor. That control is correct and
it caught a real conflation — the live grant was untouched and verified
intact afterwards.

---

## 8. What is still outstanding against the Execution Edition

Loading §5 is one part of a fourteen-section instruction. Still to build:

| § | Outstanding |
|---|---|
| 3 | A TURN service, for networks STUN cannot traverse. The transport, the consent gate, the §3.3 verdict and both surfaces are built and proved |
| 5.18 | Two source-sheet fields no mechanical rule recovers: SRC-D1-S1-010 `attribution_support_set`, SRC-D1-S3-010 `available_routes` |
| 11 | Fourteen of thirty without a pass, all fourteen blocked on the same missing governing input: no source holds a REC-07 approval. AC-18 and AC-19 now pass — see §7c |

Also noted while proving §3, not fixed here because neither is mine to
settle: `t3a_mentor_assignment.stage_instance_id` references
`t3a_stage_instance` while `t3a_stage_entry_event.stage_instance_id`
references nothing — two registers sharing a column name — and
`t3a_d1_s2_my_open_session` treats a Stage entry older than twelve hours
as closed, which is a guard I chose rather than a rule anyone issued.

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
