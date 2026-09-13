# PLC-005 Note 5 — Demonstration pathway: build report and run log

**Reference** T3A-DEV-PLC-005-A, Note 5
**Produced** 13 September 2026
**Status** Steps 1, 2, 3 and 5 complete. Step 4 partial, Step 6 returned below.

---

## 1. Step 1 — the report that had to come first

Note 5 Step 1 asks three questions and says plainly: *"If no such route can be
closed, say so before anything is built on the assumption that it can."*
Answering that honestly matters more than answering it favourably.

### How observation records are created today

`public.t3a_observation_record`, columns
`observation_record_id, participant_id, dimension_id, stage_code, observer_id,
confirmer_id, authority_snapshot_id, version_set, is_committed, committed_at,
created_at, updated_at`.

Two policies: `t3a_observation_record_read` (SELECT) and
`t3a_observation_record_write_admin` (ALL). **There is no demonstration
property on it today**, and no equivalent anywhere in the schema.

### Can a property be set at creation and made immutable?

Yes, against every ordinary route: a `CHECK` pinning the value, a
`BEFORE INSERT` trigger that overwrites whatever the caller supplied, and a
`BEFORE UPDATE` trigger that refuses any change. All three are now in place
and proved in §4.

### Is there a route by which it could later be changed?

**Yes, and it cannot be closed from inside the database.** A superuser or the
table owner can `ALTER TABLE … DISABLE TRIGGER` or drop a constraint. That is
true of every control in PostgreSQL, and no migration can prevent it. Saying
otherwise would be the kind of claim this note exists to prevent.

**This is why the property is not the primary guarantee.** Item (a) already
anticipates it: separation first, property as *"defense in depth on top of
that separation."* The architecture below leans on the half that survives
that caveat.

## 2. What separation actually means here

A demonstration record is **not a production record wearing a flag**. It is a
different row, in a different table, in a different schema — `t3a_demo`.

The consequence that matters: production observation, issuance, disclosure and
employer-facing foreign keys are declared against `public.*`. They **cannot
resolve into `t3a_demo.*`** — not because a rule forbids it, but because the
reference does not exist. Verified:

```
production FKs pointing into t3a_demo: 0
```

So flipping a property is not enough to convert a demonstration record into a
real one. Conversion would require a *fresh INSERT* into a production table —
a new write, not a mutation — and the trust boundary in §3 refuses exactly
that. **That is the guarantee that survives a superuser, because it is not a
permission check but the shape of the data.**

Exclusion from counts (item f) follows from the same fact. Any count,
statistic, register total, calibration measurement or evidence set written
over `public.*` excludes demonstration rows **by construction**. A surface
built next year inherits the exclusion without having to remember it — which
is precisely what item (f) asks for and what a maintained filter list cannot
deliver.

## 3. What was built

| Item | Built |
|---|---|
| (a) separation + immutable property | `t3a_demo` schema, 11 tables, each with `demonstration boolean` pinned by `CHECK`, set by server on INSERT, refused on UPDATE |
| (a) trust boundary | `t3a_reject_demonstration_identifier` on `t3a_observation_record` and `t3a_d1_report_issuance` |
| (a) attempt counters | `t3a_demo.attempt_event` — nothing in `public` reads it, so production counters cannot be touched |
| (b) source class, both directions | `t3a_serve_source(source_code, run_kind)` |
| (c) write-time inheritance | Every table carries the property; triggers attached by loop so a table added later cannot be forgotten |
| (d) specimen | `t3a_demo.render_specimen` — watermark is a `constant` in the function, not a caller argument |
| (e) refusals | `attempt_issuance`, `attempt_fourth_state`, `attempt_evidence_review` |
| (f) exclusion | Structural, per §2 |

**FD-D1-05 is enforced by the column itself**: `progression_decision.decision`
carries `CHECK (decision IN ('proceed','redirect','pause'))`. No fourth value
can be written anywhere in a run, and no operational status such as
*rescheduled* can sit among them.

## 4. Step 5 — proving the refusals

Run directly against the database in a block ending in `RAISE EXCEPTION`, so
nothing committed. Each line is a control the note requires:

```
pinned_despite_false      = true                                  (a)
mutate                    = DEMONSTRATION_PROPERTY_IMMUTABLE      (a)
demo_src_into_real        = DEMONSTRATION_SOURCE_INTO_REAL_RUN    (b)
no_rec07_into_real        = SOURCE_WITHOUT_REC_07_INTO_REAL_RUN   (b, REC-07)
demo_src_into_demo_ok     = true                                  (b, permitted direction)
issuance_refusals         = 4                                     (e)
fourth_state              = FD_D1_08_CONDITIONS_NOT_MET           (e)
involved_reviewer         = FD_D1_04_INVOLVED_ACTOR               (FD-D1-04)
specimen_issuable         = false, watermark_ok = true            (d)
demo_id_into_production   = DEMONSTRATION_IDENTIFIER_REJECTED     (a)
```

`pinned_despite_false` is the one worth reading twice. The INSERT
**deliberately supplied `demonstration = false`**, and the row came back
`true`. The caller's value is overwritten rather than trusted, which is what
"set by the server at creation" has to mean if it is to mean anything.

`issuance_refusals = 4` — the refusal names demonstration mode *and*,
separately, the FD-D1-03 floor, the FD-D1-04 evidence-review authority, and
the count of still-UNSET rows in the authority register. The point of the
exercise is to watch the controls hold, so each one states itself rather than
hiding behind the first.

Post-test: demo runs 0, demo sources 0, specimens 0, production observations 0
— nothing committed.

## 5. Step 6 — the run log

`t3a_demo.audit` is the run log the note asks for: every step, every object
written, every refusal, and for each refusal the row or gate it traces to
(`traces_to`). It is written by the same functions that perform the steps, so
a refusal cannot occur without a log line.

The specimen is returned through `render_specimen`, which records its own
`specimen_report_id` in the audit and returns `issuable: false,
releasable: false` alongside the watermark.

## 6. Synthetic fixtures

**Correction, 13 September 2026.** This section previously recorded that the
D1 source, question and statement fixtures were *absent* and that none could
be loaded without inventing them. That was true of the repository and false
of the programme: the Execution Edition v1.0 carries all of it — the forty
production sources SRC-D1-S1-001 to SRC-D1-S4-010 at §5.18, the fifteen
question objects at §5.2, the thirteen capture sets, the Layer 1 statement
library at §5.7 and the fourteen controlled language templates at §5.17.

So the correct statement is that the content **exists and is unloaded**, not
that it is missing. Loading it is outstanding work, tracked against the
Execution Edition rather than against this note.

What this section records about the demonstration run is unchanged: no
production D1 content was reconstructed or invented here. `t3a_demo.source`
carries `synthetic_test_only boolean default true`, and the fixture used in
testing is named `SYNTHETIC_TEST_ONLY-D1-01`.

Structurally barred from production loading: the table lives in `t3a_demo`,
and `t3a_serve_source` refuses any source from it into a real run.

## 7. What is not built here

| Item | Position |
|---|---|
| (g) role labelling | The column is `provisional_calibration_participant` — nothing in the schema calls anyone an authorized D1 mentor. The *interface* wording is UI work and ships separately. |
| (h) the verbatim on-screen statement | Interface work. The statement must sit in body copy at every breakpoint, which is a screen concern; the data layer cannot enforce it. |
| Step 4 full end-to-end wiring | The pathway's persistence, registry and refusals are built and proved. Driving a complete run through the Mentor Desk requires the Stage 1 workbench screen (Note 7's interface half) and the test accounts from Part B Note 3, which is a human task. |
| Cooldown durations | Not loaded in governed configuration. Per the note, no production cooldown duration was invented or persisted. |

## 8. Two doctrine cautions carried into the code

Both doctrine boxes in Note 5 are about how a demonstration can mislead, so
they are recorded here rather than only in the instruction:

- **A clean demonstration proves the machine runs, not that the method is
  sound.** It does not test whether two mentors observing the same conduct
  would produce the same statement (that is the calibration study), nor
  whether a source elicits the conduct it claims to (drafting tests and
  pilot). A rendered specimen is persuasive, and that is the danger in it.
- **A demonstration shows the controls working, not the controls removed.**
  Nothing was switched off to make the pathway run. Every refusal above fires
  in demonstration exactly as it would in a real run — the FD-D1-04
  involvement test included, which item (e) explicitly says is not waivable
  even here.

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
