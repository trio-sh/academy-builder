# PLC-005 Note 6 — Mentor Desk Stage vocabulary, tier language, and the two inventories

**Reference** T3A-DEV-PLC-005-A, Note 6
**Produced** 13 September 2026
**Status** (a) and (c) built. (b) both lists returned. (d) reported, nothing changed.

---

## 1. What was corrected, and where

The 24 August retirement of L1–L4 in favour of S1–S4 was issued platform-wide.
The Individual Desk was reported as corrected. **It was not fully corrected** —
five L-forms survived there, plus two in the assessment component and five in
a shared constants file. This sweep covers all of them, not only the Mentor
Desk card the note was raised from.

Displayed text only. **No route, field, component, table or code identifier
was renamed** (Standing Rule 4, Note 6 Step 3).

## 2. LIST 1 — displayed text, corrected

Uppercase L-forms only. Every code identifier in this repository is lowercase
(`l1_dimensions_scored`, `feedback_level`, `observation_level`), so an
uppercase-bounded replacement cannot reach one. Verified after the edit: the
nine lowercase `l1_`/`l2_` identifiers in `MentorDashboard.tsx` are untouched.

| File | Lines changed |
|---|---|
| `src/pages/dashboard/MentorDashboard.tsx` | 27 |
| `src/pages/dashboard/CandidateDashboard.tsx` | 10 |
| `src/components/assessment/InteractiveSkillAssessment.tsx` | 5 |
| `src/lib/t3aConstants.ts` | 5 |
| `src/data/interactiveSkillAssessment.ts` | 3 |
| **Total** | **50** |

`L1`→`S1`, `L2`→`S2`, `L3`→`S3`, `L4`→`S4`, `Level 1–4`→`Stage 1–4`.

Representative corrections on the assignment card (Note 6 (a)):

| Current | Changed to |
|---|---|
| `L1 Not started` | `S1 Not started` |
| `0 L2 observations` | `0 S2 observations` |
| `Level 1 — AI Observation` | `Stage 1 — AI Observation` |
| `Level 2 — Mentor Live Observation` | `Stage 2 — Mentor Live Observation` |

**Confirmed:** no uppercase L-form and no `Level 1–4` remains in displayed text
anywhere in `src/`, across the Mentor Desk, the Individual Desk, the employer
surfaces and the public pages.

## 3. The tier line (Note 6 (c))

Two instances existed on the Mentor Desk, not one — the assignment card and
the assignment detail header.

| Element | Current | Changed to |
|---|---|---|
| Assignment card | `Tier: {current_tier} \|\| "Not assessed"` | `Observation record: No observation committed` / `Observation committed` |
| Assignment detail header | `Tier: {current_tier} \|\| "Not assessed"` | same |

The line **no longer reads `current_tier` at all.** Tier-based standing was
closed out under OD-10 and *assess* is a banned claim verb, so the display is
derived from the assignment-bounded operational state instead. The
`current_tier` column is **not renamed and not dropped** — it is simply no
longer displayed, which is what (c) instructs.

Confirmed: the words *tier*, *assessed* and every variant of *assess* appear
nowhere in Mentor Desk displayed text.

**One value not yet derivable.** (c) lists three operational values:
*No observation committed* / *Observation committed* / *Confirmation pending*.
The first two are derived honestly from committed-observation state. The third
requires a confirmation-state read the card does not currently carry. Rather
than fake it, the card shows only the two it can prove. Now that Note 7 has
landed `t3a_d1_s1_confirmation`, the third becomes derivable and is a
follow-on rather than an open question.

**As instructed, the card does not use the four evidence-state values.** An
observing mentor receives the minimum context the observation requires and is
not shown the participant's broader evidence pattern.

## 4. LIST 2 — code and data identifiers, with a migration plan

**Nothing in this list was renamed.** Per Note 6 Step 3 this is a plan, not a
completed rename.

| Identifier | Occurrences | Read outside its own component? |
|---|---|---|
| `tier` (bare, incl. object keys) | 106 | Yes — widely |
| `feedback_level` | 49 | Yes — DB column, read by mentor and individual surfaces |
| `level` | 43 | Yes — DB column and constants |
| `current_tier` | 36 | Yes — DB column on `candidate_profiles` |
| `skill_level` | 19 | Yes — DB column |
| `readiness_tier` | 12 | Yes — DB column |
| `tiers` | 11 | Constants |
| `observation_level` | 11 | Yes — DB column |
| `grade_level` | 10 | Yes — DB column (school data; unrelated to Stage vocabulary) |
| `subscription_tier` | 9 | Yes — commerce, unrelated to standing |
| `tier_change` | 7 | Yes |
| `l1_dimensions_scored` | 3 | Yes — `mentor_assignments` column |
| `l1_completed` | 3 | Yes |
| `l1_complete` / `l2_complete` | 4 | Yes |
| `tier_system` | 1 | Constants |
| `p_readiness_tier`, `p_observation_level` | 2 | RPC parameters |

### Proposed order of operations, and what breaks at each step

1. **Decide which identifiers are in scope.** `grade_level` and
   `subscription_tier` are unrelated to Stage vocabulary or standing and
   should be excluded, or the migration doubles in size for no doctrinal gain.
2. **Add the new column alongside the old. Do not drop.** e.g.
   `stage_code` beside `feedback_level`. Nothing breaks; both are readable.
3. **Dual-write.** Every writer populates both. Breaks nothing; a missed
   writer is visible as a divergence rather than as a blank screen.
4. **Migrate readers one surface at a time,** Mentor Desk last because it is
   the surface with the most instances. A reader migrated before its writer is
   the step that shows an empty card — which is the failure mode Note 6 (b)
   names.
5. **Backfill historical rows,** then verify old and new agree on every row.
6. **Only then stop writing the old column,** and only after that drop it.

**A schema inconsistency to resolve in the same migration.** `dimension_id` is
typed three different ways today:

| Table | Type |
|---|---|
| `t3a_stage_instance` | `t3a_dimension_code` (enum) |
| `t3a_observation_record` | `text` |
| `t3a_d1_progression_decision` | `text` |

This surfaced during Note 7 as `operator does not exist: t3a_dimension_code =
text`. The Note 7 gate casts at the comparison rather than retyping a column.
Any Stage-vocabulary migration should settle this at the same time, because
both touch the same tables.

## 5. Third category — retired vocabulary in code comments

Neither displayed text nor an identifier, so outside both lists, but recorded
so the sweep is complete:

| File | Nature |
|---|---|
| `src/lib/observationIntegrity.ts` | JSDoc comments referencing "L1 feedback" and "L1 cycle" |
| `src/types/database.types.ts` | Trailing comment on `FeedbackLevel`: `// L1=AI auto, L2=Mentor…` |

`database.types.ts` is generated, so an edit there is overwritten on the next
generation. Both are left as-is and listed rather than changed.

## 6. (d) What the Recommend control opens and writes

**Nothing about this control was changed**, per Note 6 Step 4.

**It opens** a modal titled *Recommend BridgeFast Modules*, listing BridgeFast
modules as checkboxes, plus a free-text note field.

**It writes two rows:**

| Target | Content |
|---|---|
| `notifications` | title *Mentor Recommended BridgeFast Modules*; message naming the selected modules **and the mentor's free-text note** |
| `growth_log_entries` | title *Mentor Recommended BridgeFast Modules*; description naming the module count and names; metadata `{ module_ids, mentor_note }` |

**Where it lands in the record:** `growth_log_entries` — part of the
participant's record.

### Three things worth the founder's attention

1. **It does not open the progression decision.** The concern that the label
   might be sitting on the proceed / redirect / pause control is unfounded;
   this is a different act entirely.

2. **But a mentor recommendation is being persisted into the participant's
   record.** The note anticipated exactly this: *"if it is being written, it
   will eventually be read, by an employer or by a participant raising a
   correction about something no observation supports."* It is being written.

3. **It writes mentor free text into the record.** `mentor_note` is an
   unbounded narrative field authored by the mentor and stored on
   `growth_log_entries`. That is the same hazard the determination
   architecture exists to prevent — Note 7 Section 4 prohibits any free-text
   field for the mentor's own narrative in the Stage 1 workbench, and
   T3A-DEV-SPEC-002 §7.3 prohibits hand-authored statement text. This is a
   different surface and so not a breach of either rule as written, but it is
   the one place a mentor can currently type prose that lands in a
   participant's record.

Reported rather than decided: whether that field should exist at all is a
doctrine question, not a technical one (Standing Rule 3).

## 7. Answering the Note 6 questions from the build side

- **What happened to the 24 August inventory?** No inventory artifact exists in
  the repository. The sweep it asked for was applied to the Individual Desk
  only in part — five L-forms remained there. Both lists are now returned
  above.
- **What field feeds the tier line?** `candidate_profiles.current_tier`. It is
  a stored value, so this was a data-model item as well as a copy item. It is
  read in 36 places; the line no longer reads it.
- **What does the Recommend control open and write?** §6.
- The mentor account name/email question is account provenance and belongs to
  Part B; the Note 1 Step 1 report records that the platform holds no
  provenance for that account.

## 8. Acceptance criteria

| Criterion | Status |
|---|---|
| No L-form in displayed text on the Mentor Desk | **Met** |
| Same confirmed across Individual Desk, employer surfaces, public pages | **Met** — and five instances were found on the Individual Desk |
| *tier* / *assessed* / *assess* absent from Mentor Desk | **Met** |
| Card status line reads Stage vocabulary and operational values only | **Met**, with the third value noted in §3 |
| Both inventory lists returned; second accompanied by a migration plan | **Met** |
| No route, field, component or code identifier renamed | **Met** |
| Desktop / tablet / mobile | Layout unchanged — text substitution only, no structural edit |

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
