# D1 · Question → capture set mapping

**Status: DRAFT FOR CONFIRMATION. Nothing here is loaded into any register.**

This is the one governing input D1 is missing. Six acceptance tests block
on it: AC-05, AC-06, AC-08, AC-12, AC-13 and AC-27.

Everything else is built. The register holds fifteen question objects,
thirteen capture sets, forty-four capture lines and ten branch rules, and
`t3a_d1_served_questions(source_sheet, answers)` already decides which
questions a given source serves. What no register records is **which
capture set answers which question** — so a cockpit that knows a question
applies still has no approved answer set to offer, and Pane 2 shows
nothing.

## Why this is not being inferred

The codes are nearly positional and not reliably so. `Q-D1-03a` pairs
with `C3`, not with a `C3a`, which does not exist. Two questions appear
to take no capture set at all. The capture sets' `applicability_note`
carries conditions, not question codes.

Which approved answers a participant is offered for a given question is a
decision about evidence meaning, not a build detail. It is recorded as a
conflict rather than guessed.

**What follows is a reading of the registers, offered so there is
something to correct rather than something to compose. It is not a
proposal to adopt as it stands.** Each row carries the evidence it was
read from, so it can be checked rather than waved through.

## The mapping

| # | Question | Conduct element | Proposed set | Set title | Lines | Read from |
|---|---|---|---|---|---|---|
| 1 | `Q-D1-01` | CE-01 | `C1` | What was said about the issue | 3 | Single select, fixed. Always in play, as C1 is unconditional. |
| 2 | `Q-D1-02` | CE-02 | `C2` | When it was first raised | 4 | Question is gated on `enquiry_point`; C2's lines are all about when the issue was raised relative to the direct question. |
| 3 | `Q-D1-03a` | CE-03 | `C3` | What the account contained | 5 | **The known counter-example.** Question gated on `information_made_available` + `material_items`; C3's five lines are exactly the omission / unsupported-claim / both / neither / no-account matrix. |
| 4 | `Q-D1-03b1` | CE-03 | **none** | — | — | Answer type is *"Structured selection, multi, bound to the source version's `material_items`"*. The answer set comes from the source, not from a catalogue. C3 line 2 already says "select which omitted items". |
| 5 | `Q-D1-03b2` | CE-03 | **none** | — | — | Answer type is *"Constrained selection from the source version's `assertion_reference_set`"*, plus the fixed `UNLISTED_UNSUPPORTED_ASSERTION` escape named in C3 lines 3 and 4. Again source-bound, not catalogued. |
| 6 | `Q-D1-04a` | CE-04 | `C4a` | What was said about the participant's own part | 3 | Single select, fixed, always in play. |
| 7 | `Q-D1-04b` | CE-04 | `C4b` | What was attributed to another person | 4 | Question is *"with a bound child selection on one option"* and is gated on `attribution_support_set` — see the open item below. |
| 8 | `Q-D1-05a` | CE-05 | `C5a` | Corrective action | 3 | Single select, fixed, always in play. The three downstream questions are all gated on this one "returning an action". |
| 9 | `Q-D1-05b1` | CE-05 | `C5b1` | Accountable actor | 2 | Question gated on `accountable_actor_available = true`; set note reads *"only where the source offers one"*. Same condition, stated twice. |
| 10 | `Q-D1-05b2` | CE-05 | `C5b2` | Corrective route | 3 | Question gated on `available_routes`; set note *"only where the source offers one"*. |
| 11 | `Q-D1-05c` | CE-05 | `C5c` | Time reference | 2 | Question gated on `time_reference_called_for = true`; set note *"only where the source calls for one"*. |
| 12 | `Q-D1-06` | CE-06 | `C6` | Which route was used | 3 | Question is *"bound to `available_routes` plus two fixed options"*; C6 carries 3 lines, which reads as those fixed options — **see the open item below.** |
| 13 | `Q-D1-07` | CE-07 | `C7` | What changed when the account was tested | 5 | Question gated on `account_test_point` + `post_test_account_opportunity`. |
| 14 | `Q-D1-08a` | CE-08 | `C8a` | Disclosure timing relative to the decision point | 4 | Question is *"timing relative to the decision"*; the set title is the same phrase. Both gated on `bearing_interest`. |
| 15 | `Q-D1-08b` | CE-08 | `C8b` | Prompt condition | 3 | Question is *"prompt condition"*; set title is the same phrase. Set note *"only where a disclosure occurred"* matches the question's gate on Q-D1-08a returning a disclosure. |

Fifteen questions, thirteen sets, two questions taking none: the counts
reconcile. That is corroboration, not proof — it would also reconcile if
two different questions were the source-bound pair.

## Open items — please rule on these specifically

**1. Do `Q-D1-03b1` and `Q-D1-03b2` genuinely take no capture set?**
This is the load-bearing assumption. It is what makes fifteen questions
and thirteen sets reconcile. If either of them does take a set, the
reading above is wrong somewhere else too, because the count no longer
works.

**2. `Q-D1-04b` has "a bound child selection on one option" — which
option, and bound to what?** It is gated on `attribution_support_set`,
which is one of the two source-sheet fields still outstanding
(`SRC-D1-S1-010`). C4b's four lines do not say which of them opens the
child.

**3. `Q-D1-06` is "bound to `available_routes` plus two fixed options",
but `C6` holds three lines.** Either C6's three lines are not the two
fixed options, or one of them is the slot the source's routes expand
into. `available_routes` is the other outstanding source-sheet field
(`SRC-D1-S3-010`), so this one may resolve with it.

## What to send back

The middle column, confirmed or corrected — fifteen rows, question code
to capture set code, with `none` where a question's answers come from the
source rather than a catalogue. Plus a ruling on the three items above.

Once that arrives, the mapping is loaded as a register in its own right
(not inferred at read time), the cockpit serves questions, and AC-05,
AC-06, AC-08, AC-12, AC-13 and AC-27 can be executed against it. The
register goes from 24 of 30 to 30 of 30.

If any row above is wrong, say so plainly rather than adjusting around
it. A wrong pairing here would offer a participant the wrong approved
answers for a question, which is worse than the current state of offering
none.
