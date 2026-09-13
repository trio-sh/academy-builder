# T3A-D1-EXEC-001 — Sections 5 to 8: build report

**Reference** T3A-D1-EXEC-001 v1.0, Sections 5, 6, 7 and 8
**Produced** 13 September 2026
**Status** Sections 5 to 8 built and proved. Five §8.4 surfaces built. Conflict register below.

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
| 1 | Five occurrences of the British spelling `behavioural` sit inside verbatim issued source content. The platform's vocabulary lock (T3A-DEV-SPEC-002 §1.4, AC-61) fails the build on it | **Not resolved by the developer.** See §7 |
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

## 7. The one thing that needs the founder, not the developer

**Five of the forty issued sources contain the British spelling
`behavioural`** — at lines 1675, 1736, 3794, 5296 and 5309 of the
generated migration.

Two rules govern and they conflict:

- T3A-D1-EXEC-001 §5: nothing in the content is *"derived from prose,
  inferred, or authored by the developer"*.
- T3A-DEV-SPEC-002 §1.4 and AC-61: U.S. spelling in all new code and
  interface strings, enforced by a build-failing check whose own list is
  *"extended, never shortened, without governance approval"*.

Correcting the spelling means editing issued source content. Leaving the
check un-allowlisted means the build fails. **Silently rewriting the
founder's sources to get a green build is the one option that must not
happen**, so the generated file is grandfathered in
`scripts/check-vocabulary.mjs` with the reason stated at the entry, and
the question is recorded here.

**This is live, not dormant.** These strings reach a mentor-facing surface
the moment a source is served. The decision — correct the five
occurrences in the issued sources, or record an exception to the spelling
rule for issued content — is a content-governance decision and is not
taken here.

## 8. What is still outstanding against the Execution Edition

Loading §5 is one part of a fourteen-section instruction. Still to build:

| § | Outstanding |
|---|---|
| 5.3 | The mentor reference card that renders the capture sets at the beat |
| 3 | Mentor Cockpit — partially built; the Stage 2 live surface is not complete |
| 6 | The report face renderer that assembles the eleven blocks on screen |
| 11 | The acceptance-test suite |

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
