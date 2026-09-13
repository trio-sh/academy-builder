# T3A-D1-EXEC-001 — Section 5 content load: build report

**Reference** T3A-D1-EXEC-001 v1.0, Section 5
**Produced** 13 September 2026
**Status** §5.7, §5.17 and §5.18 loaded and proved. Conflict register below.

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
| 5.7 | Layer 1 statement library | **44 statements** |
| 5.17 | Controlled language template register | **14 templates** |
| 5.18 | The D1 source library | **40 sources**, with source sheets parsed |

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
| 5.3 | The thirteen capture sets as served interface objects |
| 5.4 | Branch rules BR-01 to BR-09 as serving logic |
| 5.13, 5.14 | Resolution rule table and condition precedence |
| 3 | Mentor Cockpit — partially built; the Stage 2 live surface is not complete |
| 6 | Report contract — block schedule and traceability |
| 7 | Consent architecture and the named-recipient model |
| 8 | Stage operating contracts for S1, S3 and S4 |
| 11 | The acceptance-test suite |

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
