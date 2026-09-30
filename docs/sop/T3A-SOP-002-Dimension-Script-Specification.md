# SOP-002 — Dimension Script Specification and Onboarding Procedure

**Identifier** T3A-SOP-002  |  **Status: DRAFT FOR DEVELOPER VETTING**  |  The 3rd Academy Inc.  |  September 2026

**Purpose.** One procedure for a behavioral dimension, from the first word written to the first source served. It tells an author — a person or an AI — exactly how to write the Execution Edition so that it loads and builds **in one pass**, and it tells the build and the founder exactly how that Execution Edition is then extracted, loaded, approved and verified. It is written from the D1 build, and every rule in it traces to a defect D1 actually hit.

**How it is organized.** Parts A to I govern **writing** a dimension. Part J lists what the Lead Platform Developer is asked to confirm. Part K, with Appendices 1 to 6, governs **onboarding** it: this is SOP-001, written by the Lead Platform Developer, incorporated in full.

**Precedence.** Where the two halves differ on **build behavior**, Part K governs. Where they differ on **what the content says**, Parts A to I govern. The one conflict found between them is resolved at Appendix 3 and recorded at J-9.

---

## Part A — Instructions to the author

Read this Part first and follow it in order. **Do not skip a step, and do not issue anything until Step A10 passes.**

**A1. Know what you are producing.** You are producing a **Dimension Content Package**: the content for one dimension, loaded onto the platform the D1 build already created. You are **not** re-specifying the platform. Part B lists what you author and what you must never re-issue.

**A2. Collect your inputs before writing.** You need: the dimension's construct and conduct elements from the Behavioral Observation System Design; the dimension's situation classes; and its approved source scenarios. **If any input is missing, stop and record which one.** Never invent a construct element, a situation class or a source.

**A3. Author directly in markdown.** Never write in a word processor and convert. Every conversion fault D1 suffered — flattened tables, wrapped values, run-together field names, split field names — came from conversion. **See AS-03.**

**A4. Build the content in the order of Part C.** Registers first, then sources. **Write no script until the capture register is final** (AS-18), because a script written earlier binds labels that will change.

**A5. Write every structured block exactly in the canonical form of Part C.** Copy the template, then replace the content. **Do not improvise a variation.** The canonical form is what the build reads.

**A6. Use only the controlled vocabularies of Part D.** If you need a word that is not in them — an action, a qualifier, a status — **stop and record it.** Never introduce one inside a script (AS-19).

**A7. Apply the content rules of Part E** while writing each source.

**A8. Write every instruction addressed to the build to the rules of Part F.**

**A9. Verify every factual claim against the file.** Every line number, count, field value, beat code and cross-reference you state must be checked against the document you are writing. **Above all, check any claim that something is absent, undefined or blocked** — in D1 those were the claims most often wrong (AS-02).

**A10. Run the validator in Part H against your finished file.** It must print **PASS — zero errors.** If it prints any error, fix the content and run it again. **Repeat until it passes. A file that has not passed must not be issued.**

**A11. Run the pre-issue gate in Part G** and record the result of every item.

**A12. Mark the package *Ready for Review*, never *Final*.** The founder reviews the judgment content before issue (A13).

**A13. Know what the validator cannot check.** It proves the **form** is correct — every block loads, every count reconciles, every binding resolves. It does **not** prove the **judgment** is right: whether a construct boundary is correct, whether a source genuinely presents the conduct it claims, whether a situation is fair to the participant. **Passing the validator is not approval.** Those questions go to the founder.

**A14. Once approved, issue it as the dimension's Execution Edition and commit it where the build can reach it.** A dimension cannot be onboarded without an issued Execution Edition — not a draft, not a working document (Part K, Stage 0.1a). Record exactly where it lives (Stage 0.2a).

**A15. Onboarding then follows Part K.** Its Stage 1 extracts the content by script; nothing is retyped.

---

## Part B — What a Dimension Content Package contains

### B.1 Sections you author for each dimension

Use these section numbers and titles exactly. Replace `n` with the dimension number throughout.

| Section | Title | What it holds |
| --- | --- | --- |
| 1 | Conduct elements | The dimension's conduct elements, CE-01 onward, each with its relevance basis and what it does **not** support |
| 2 | Situation classes | The dimension's situation classes S-1 onward, and the map from each class to its interaction pattern family |
| 3 | Question object register | Every question object, in the canonical table at C.1 |
| 4 | Response capture catalog | Every capture set, in the canonical form at C.2, followed by the classification table |
| 5 | Branch rules | Each rule that serves or withholds a child question |
| 6 | Statement library | Every observation-level statement, with its identifier |
| 7 | Resolution rule table | Every reachable answer pattern mapped to one statement or one refusal |
| 8 | Coverage matrix | Each conduct element against each Stage |
| 9 | Report frames | The dimension's permitted report language |
| 9a | Controlled language templates | Every template, with its identifier; braces mark record-bound variables, never free text |
| 9b | Participant-facing text | Every string shown to a participant, rendered exactly as written |
| 9c | Recurrence-equivalence keys | Which observations count as the same conduct across contexts |
| 9d | Cross-context map | Each source's counterparts at other Stages |
| 10 | Demonstration sources | One demonstration source per Stage, in canonical form |
| 11 | Source library | The production sources, in canonical form, Stage by Stage |
| 12 | Dimension configuration | Only the configuration rows specific to this dimension |
| 13 | Dimension acceptance tests | Tests for this dimension's content only |

### B.2 Never re-issue these

These were built by D1 and belong to the platform. **Referencing them is correct; re-specifying them is a defect,** because a second specification of built machinery creates contradictions the build must then resolve.

The non-interactive execution rule; the twelve operative instruction packages; the Mentor Cockpit, including its Google Meet integration; the report contract; the consent architecture; the Stage operating contracts; accounts, roles and authorization; the demonstration pathway machinery; activation prerequisites; the list of what must not exist anywhere.

**Where a dimension genuinely needs a platform change, do not write it into the package.** Record it separately for the founder as a platform change request.

---

## Part C — Canonical formats

Each template below is copied from the sample in Part I, which passes the validator. **Match it exactly.**

### C.1 Question object register

```
| Question | Element | Capture set | Answer type | Source-bound to | Served when |
|---|---|---|---|---|---|
| Q-Dn-01 | CE-01 | C1 | Single select, fixed | — | Always where the element is in play |
```

One row per question object. **The Capture set column is mandatory** and names a set in C.2. Where one capture set holds several question objects, each object still has its own row.

### C.2 Response capture catalog

```
**C1 — What was said about the issue**

- Named the specific issue and what it was.
- Made no reference to an issue.
```

Each set: a title line `**Cn — Title**`, a blank line, then one capture line per `- ` bullet. Labels are `C` followed by a number and an optional lowercase suffix: `C1`, `C4a`, `C5b1`.

**Follow the catalog with the classification table:**

```
**Capture set classification**

| Set | Type | Whole-session lines |
|---|---|---|
| C2 | first-occurrence | Did not raise it at any point in the session. |
```

Every set appears in it. **Type** is `content` or `first-occurrence` (AS-22). **Whole-session lines** names every line whose wording can only be true once the session ends (AS-23), or `—`.

### C.3 The source block

Every source begins with a heading in exactly this form, then its blocks in the order shown for its Stage:

```
#### SRC-Dn-Sx-nnn — TITLE IN CAPITALS
```

| Stage | Blocks, in this order |
| --- | --- |
| **Stage 1** | The situation, as the participant meets it · Reveal sequence · Question applicability · Source sheet |
| **Stage 2** | MENTOR BRIEF · PARTICIPANT PRE-BRIEF · The script · Question applicability · Source sheet |
| **Stage 3** | The brief, in summary · Question applicability · Source sheet |
| **Stage 4** | MENTOR BRIEF · PARTICIPANT PRE-BRIEF · CO-PARTICIPANT POSITIONS · The script · Question applicability · Source sheet |

Each block begins with its label in bold on its own line. Labels carry the qualifying text shown in Part I after an em dash, for example `**MENTOR BRIEF — what the mentor knows and does not say**`.

**Nothing else goes inside a source block** — no authoring commentary, no migration notes, no bank-level material. Bank-level material belongs before the first source of the bank, never after the last.

### C.4 The script — Stages 2 and 4

```
**The script**

- **B1** SAY | Spoken: "Right, I have the figure here for the meeting. It looks good." | Direction: — | Capture: —
- **B2** PAUSE | Spoken: — | Direction: Say nothing for ten to fifteen seconds. Do not prompt. | Capture: C1, C2
- **B4** ASK | Spoken: "Is it close enough?" | Direction: Asked once. Accept whatever answer comes. | Capture: C3 update
```

**One beat per line.** Each line carries four labeled parts separated by ` | `:

| Part | Holds |
| --- | --- |
| Action | Immediately after the beat code: `SAY`, `PAUSE`, `ASK`, or at Stage 4 `ROUND` |
| Spoken | **Only the words said aloud**, in quotation marks, or `—`. Never a direction, label or qualifier (AS-17) |
| Direction | Mentor-only instruction, or `—`. Never read aloud |
| Capture | Capture sets from the current register, comma-separated, each with an optional qualifier, or `—` |

A qualifier attaches to **each** label it governs: `C3 update, C8a update, C8b update` — never `C3, C8 update`. The character `|` must not appear inside spoken or direction text.

### C.5 The reveal sequence — Stage 1

```
**Reveal sequence**

- **R1** What do you do now? Describe your next steps. | Role: Opening
- **R2** A message from your manager: "Did the report go out on Friday?" Write your reply. | Role: Enquiry point
```

One reveal per line. The role follows ` | Role: `, never appended to the text.

### C.6 Co-participant positions — Stage 4

```
**CO-PARTICIPANT POSITIONS — given to each in writing before the session**

| Co-participant | Position stated at the round |
|---|---|
| CP-1 | Backs the first bid on delivery record. |
```

**No beat code appears in this block.** The round is run at the script's B2.

### C.7 Question applicability

```
**Question applicability**

| Q-Dn-01 | DIRECT | The situation places an issue before the participant |
| Q-Dn-08b | CONDITIONAL | Served once Q-Dn-08a records a disclosure |
```

One row for **every** question object in C.1. Status is `DIRECT`, `CONDITIONAL` or `NOT SERVED`, then the basis.

### C.8 The source sheet

```
**Source sheet**

- `dn_situation_class` — S-1
- `material_items` — M1 the figure is wrong. M2 the participant supplied it.
- `attribution_support_set` — Empty.
```

**One field per line, and the value never wraps onto a second line** (AS-04). The field name sits in backticks, followed by a space, an em dash and a space.

**Mandatory on every source:**

`dn_situation_class`, `workplace_demand`, `relevant_conduct`, `irrelevant_conduct`, `information_made_available`, `material_items`, `assertion_reference_set`, `information_withheld`, `attribution_support_set`, `available_routes`, `other_route_classification`, `route_observation_basis`, `enquiry_point`, `account_test_point`, `post_test_account_opportunity`, `accountable_actor_available`, `time_reference_called_for`, `bearing_interest`, `stated_standard`, `stated_standard_source_quote_or_location`, `cross_context_map`, `serving_eligible`, `recurrence_eligible`, `replacement_required`, `name_clearance_status`, `sensitivity_flag`.

**Mandatory additionally at Stages 1, 2 and 4:** `min_seconds`, `max_seconds`.
**Mandatory additionally at Stage 3:** `ai_use`, `submission_window_days`.

**`dn_situation_class` is a field, never prose.** It reads `S-n`, or `S-n with S-m` where two classes apply. D1's Stage 2 and Stage 4 sources stated the class only in prose, so the pattern family could not be derived from a field.

**List-valued fields** — `material_items` (M), `assertion_reference_set` (A), `attribution_support_set` (AS), `available_routes` (R-) — carry their items inline, each prefixed by its identifier, numbered in sequence from the first (`M1`, `M2` … or `R-a`, `R-b` …), each item ending with a full stop. **An empty list reads exactly `Empty.`**

---

## Part D — Controlled vocabularies

**Every list below is closed.** A value not listed is an error.

| Vocabulary | Values |
| --- | --- |
| Script actions, Stage 2 | SAY · PAUSE · ASK |
| Script actions, Stage 4 | SAY · PAUSE · ASK · ROUND — **B2 is always ROUND** |
| Stage 1 unit | Reveals R1 onward; the count is stated per source |
| Stage 3 | No live sequence |
| Beats, Stages 2 and 4 | Exactly seven, B1 to B7, in order |
| Capture qualifiers | *(none)* · `update` · `final` |
| Applicability status | DIRECT · CONDITIONAL · NOT SERVED |
| Capture set type | content · first-occurrence |
| Name clearance status | CLEARED · PENDING |
| Stage 3 AI use | AI_USE_ALLOWED · AI_USE_DISALLOWED · AI_USE_DECLARATION_REQUIRED |
| Sensitivity flag | None · SENSITIVE_CONTENT |

**The three qualifiers mean exactly this:**

| Qualifier | Meaning |
| --- | --- |
| *(none)* | The set becomes available at this beat |
| `update` | A content selection may be revised at this beat. It never overwrites a recorded first occurrence |
| `final` | The determination closes at this beat. No selection or revision after it. A whole-session line becomes selectable here |

---

## Part E — Content rules

Each rule states what to do, and the D1 defect it prevents.

### E.1 Principle

**AS-01 Author for the parser first and the reader second.** A reader forgives a flattened table or a wrapped value; a parser produces clean, plausible, wrong output. *D1: five parse faults, none of which raised an error.*

**AS-02 Never assert what the file contains without opening it.** Check every factual claim, above all a claim that something is absent. *D1: more correction rounds came from unchecked claims than from any single content defect.*

**AS-03 Author directly in markdown; never convert from a word processor.** *D1: every conversion fault.*

### E.2 Form

**AS-04 One field per line, and no value wraps.** *D1: values cut at the first wrap; a field name run into the previous value on twenty-one sources.*

**AS-05 List items carry sequential identifiers and end with a full stop.** A value ending without one is treated as truncated. *D1: a truncated item nearly offered as an approved answer.*

**AS-06 Every source has the heading form, the blocks and the block order in C.3; numbering is unique and continuous within each Stage; "The script" comes before "Question applicability."** *D1: package numbering jumped; the script marker was lost in flattening.*

**AS-07 Field syntax appears only inside the Source sheet block.** Definitions of fields are written as prose, never as field lines. *D1: three sources carried a definition in place of their data.*

**AS-08 A beat or reveal code may lead a line only inside the script or reveal block.** *D1: co-participant positions and applicability rows led with beat codes and risked being counted as beats.*

**AS-51 A heading is a title, never a sentence.** No emphasis inside a heading and no closing full stop. *D1: a sentence rendered as a top-level heading.*

### E.3 Source sheet

**AS-09 Every source carries every mandatory field for its Stage (C.8), each exactly once.** *D1: the situation class and the live-session window missing on Stages 2 and 4.*

**AS-10 An empty list reads exactly `Empty.`**

**AS-11 Every source-bound list is complete before issue.** A mentor never adds to it after observing.

**AS-12 Every reference point is named in its own field** — `enquiry_point`, `account_test_point`, and the decision point stated inside `bearing_interest`. Never inferred from a pause or a beat position. *D1: the pause sat at B2 in one source and B3 in another.*

**AS-13 The source version is what is approved.** Author carefully enough that no transcription correction is ever needed; a changed value requires re-approval.

### E.4 Scripts

**AS-14 Every beat line carries its code, action, spoken text, direction and capture, in the C.4 form.** Nothing about a beat is inferred from its position.

**AS-15 Actions come only from the Stage's vocabulary; Stage 4 B2 is ROUND.** *D1: a Stage 4 script read with Stage 2 rules found six beats.*

**AS-16 Stages 2 and 4 carry exactly seven beats; Stage 1 reveals run from R1 without gaps.**

**AS-17 Spoken text holds only speech.** No capture label and no direction appears in it. **Ordinary words are not restricted:** a mentor may say "update" or "final" as part of natural speech — "Any update on the figure?" is legitimate. What is forbidden is a capture label, alone or with its qualifier, such as "C3 update". *D1: "C8 final" and "Asked ONCE. Accept whatever answer comes." sat inside spoken text. An earlier issue of this rule also refused the ordinary words, which would have blocked natural dialogue; that is corrected.*

**AS-18 Scripts bind the current capture register by its current labels.** *D1: every Stage 2 script bound the superseded labels C4, C5 and C8.*

**AS-19 Qualifiers come only from the closed list.** A new qualifier is added to this specification first, never introduced in a script. *D1: "final" had no defined meaning.*

**AS-20 State which question objects a script deliberately leaves unserved, and why.**

### E.5 Capture sets

**AS-21 Every capture line states one fact.** *D1: three questions each asked two things and were split.*

**AS-22 Classify every set as content or first-occurrence.** A first-occurrence answer is fixed when the occurrence happens and is never revised to a later one.

**AS-23 Mark every whole-session line.** It is selectable only when the determination closes. *D1: a mentor could have locked in "did not raise it" during the opening silence.*

**AS-24 Where an absence is observable, offer an explicit did-not line.** Not observed and observed not to have happened are different facts.

**AS-25 Options carry no visual or positional cue toward a preferred answer.**

**AS-26 State the count reconciliation:** the number of question objects, the number of capture sets, and which sets hold more than one object. *D1: fifteen questions and thirteen sets were first reconciled by a wrong route.*

### E.6 Applicability and construct

**AS-27 Applicability is established before observation.** The participant's response can activate an approved child but never create a parent opportunity.

**AS-28 Every question object has a status on every source.** A child not reached is not a missing value.

**AS-29 Never force an element into a Stage that cannot genuinely observe it.**

**AS-30 Re-frame before retiring.** Correct a framing fault; refer a situation that belongs to another dimension. Never rewrite a situation until it fits.

### E.7 Source truth and naming

**AS-31 Every material item, standard and support entry is underlinable in the participant-facing text.**

**AS-32 Information not yet revealed has not been made available.**

**AS-33 Name clearance is a status plus a separate basis.** No real organization's name appears in a source.

### E.8 Language

**AS-52 American spelling throughout.** The build's vocabulary lock rejects British spellings in standing source versions. *D1: its issued file carried British spellings on most sources; the build converted the ones its lock rejected, by founder decision.* The validator checks a fixed list.

**AS-53 No retired vocabulary.** The validator refuses the retired terms that have no legitimate place in any scenario: bare *under pressure* (write *under workplace pressure*), *skill passport*, *third layer*, *readiness indicator*, *trait label*, *coverage meter*, *progress percentage*. **Some retired terms can belong inside a scenario and are checked by hand at G-10:** *recommend* is retired only as a mentor action — a participant may recommend; *candidate*, *assess*, *rank*, *score*, *rating* and *endorse* may be part of a story. **Never use any of them in a mentor action, a capture line, a statement or a report frame.**

---

## Part F — Writing instructions to the build

**AS-34 Standalone.** Every instruction names the exact file it acts on, restates any earlier rule it relies on, and never asks for input during execution. Where something is unresolved, state the executable default: disable the route, fail closed, log it, build everything else.

**AS-35 State the required baseline and how to verify it** before any instruction runs.

**AS-36 State precedence,** naming each earlier rule changed at the point of change.

**AS-37 State the order of execution and the reason.** Where tests must be redefined before a change and run after it, set it out in phases.

**AS-38 Name what must not happen,** by name.

**AS-39 State expected numbers itemized and scoped** — "thirty-three: three demonstration, ten Stage 1, ten Stage 2, ten Stage 4" — and say whether a count covers current versions or the whole table.

**AS-40 Never write a test that can only pass by destroying its own finding.**

**AS-41 Never ask for a sentence in a historical record to be amended.** Name an editable object.

**AS-42 Removing an instruction is a change.** Trace every dependent before withdrawing one.

**AS-43 Ask what would make each test fail.** A green suite against empty or superseded content is worse than a red one.

**AS-44 An instruction that governs the build travels in the artifact, never only in an email.**

**AS-45 Never permit fabricated content as a fallback.** Where approved content is unavailable, the surface refuses and says why.

**AS-46 Supersede; never edit issued content.**

**AS-47 An approval survives a supersede only where the content-identity check passes.**

**AS-48 Measure the blast radius of a correction before implementing it.**

**AS-49 When a constraint and its description disagree, read the constraint.**

**AS-50 Standing is the latest status, never the existence of a row.**

---

## Part G — Pre-issue gate

Record a result for every item. **All must pass before issue.**

| # | Check | Rule |
| --- | --- | --- |
| G-01 | The validator in Part H prints **PASS — zero errors** | All form rules |
| G-02 | No platform section from B.2 is re-specified | B.2 |
| G-03 | Every construct element, situation class and source comes from an approved input | A2 |
| G-04 | Count reconciliation stated | AS-26 |
| G-05 | Every whole-session line marked; every set classified | AS-22, AS-23 |
| G-06 | Every material item, standard and support entry underlinable | AS-31 |
| G-07 | Every source name-clearance status CLEARED | AS-33 |
| G-08 | Every factual claim in the package checked against the file | AS-02 |
| G-09 | The package is marked *Ready for Review* and sent to the founder for judgment review | A12, A13 |
| G-10 | Every context-dependent retired term — recommend, candidate, assess, rank, score, rating, endorse — checked by hand: none appears in a mentor action, capture line, statement or report frame | AS-53 |

**G-01 cannot be skipped.** Every other item can pass while the file still fails to load.

---

## Part H — The validator

Save the code below as `validate_dimension.py` and run:

```
python3 validate_dimension.py <your-package.md>
```

It exits `0` and prints **PASS** only when the file has zero errors. It reads the dimension's own capture register and question register from the file, so it serves every dimension without change. Each error message names the rule it enforces.

**How it was proven before issue:**

| Test | Result |
| --- | --- |
| The canonical sample in Part I | **Passes** with zero errors |
| The D1 Execution Edition as issued | **Fails** — 1,910 errors across twelve rule classes, matching the faults D1 actually suffered, including all three sources later withdrawn |
| Twenty-one deliberate faults injected into the sample, one at a time | **21 of 21** caught, each by its own rule |
| Ordinary speech using "update" and "final" | **Accepted**; the same speech with a capture label attached is refused |

```python
#!/usr/bin/env python3
"""
T3A dimension script validator  --  reference implementation for T3A-SOP-002.

Usage:   python3 validate_dimension.py <execution_edition.md>
Exit 0:  zero errors. The script may be issued.
Exit 1:  one or more errors. The script must NOT be issued.

It reads the dimension's own capture register and question register from the
document, so it is not tied to any one dimension. Every check maps to a rule
in T3A-SOP-002, cited in square brackets in each message.
"""
import re, sys
from collections import OrderedDict

ERR = []
def err(rule, where, msg): ERR.append(f"[{rule}] {where}: {msg}")

SRC_HEAD = re.compile(r'^#### (SRC-D(\d+)-S([1-4])-(\d{3})) — (\S.*)$')
FIELD    = re.compile(r'^- `([a-z0-9_]+)` — (.*)$')
BEAT     = re.compile(r'^- \*\*B([1-7])\*\* (SAY|PAUSE|ASK|ROUND) \| Spoken: (.*?) \| Direction: (.*?) \| Capture: (.*)$')
REVEAL   = re.compile(r'^- \*\*R(\d+)\*\* (.*?) \| Role: (.*)$')
LEADING_CODE = re.compile(r'^(?:- \*\*[BR]\d+\*\*|\| *[BR]\d+ *\|)')
SET_HEAD = re.compile(r'^\*\*(C\d+[a-z]?\d*) — (\S.*)\*\*$')

STAGE_VOCAB = {'2': {'SAY','PAUSE','ASK'}, '4': {'SAY','PAUSE','ASK','ROUND'}}
QUALIFIERS  = {'update','final'}
# British spellings the build's vocabulary lock rejects; unambiguous forms only [AS-52]
BRITISH = ['behaviour','behaviours','colour','organisation','organisations','organise','organised',
  'recognise','recognised','realise','realised','analyse','analysed','centre','centres','favour',
  'honour','labour','programme','programmes','catalogue','judgement','licence','defence','offence',
  'travelled','cancelled','modelling','labelled','fulfil','enrol','whilst','amongst','apologise',
  'prioritise','prioritised','summarise','minimise','maximise','emphasise','customise','authorise',
  'authorised','criticise','finalise','finalised','utilise','standardise','optimise','specialise',
  'cheque','grey','tyre','sceptical','practise','practised','acknowledgement']
# Retired terms with no legitimate scenario use [AS-53]. Context-dependent terms are a manual gate item.
RETIRED = [r'\bunder pressure\b', r'\bskill passport\b', r'\bthird layer\b', r'\breadiness indicator\b',
  r'\btrait label\b', r'\bcoverage meter\b', r'\bprogress percentage\b']
APPLIC      = {'DIRECT','CONDITIONAL','NOT SERVED'}

REQUIRED_BLOCKS = {
 '1': ['The situation, as the participant meets it','Reveal sequence','Question applicability','Source sheet'],
 '2': ['MENTOR BRIEF','PARTICIPANT PRE-BRIEF','The script','Question applicability','Source sheet'],
 '3': ['The brief, in summary','Question applicability','Source sheet'],
 '4': ['MENTOR BRIEF','PARTICIPANT PRE-BRIEF','CO-PARTICIPANT POSITIONS','The script','Question applicability','Source sheet'],
}
# Fields every source carries. {N} is the dimension number.
FIELDS_ALL = ['d{N}_situation_class','workplace_demand','relevant_conduct','irrelevant_conduct',
  'information_made_available','material_items','assertion_reference_set','information_withheld',
  'attribution_support_set','available_routes','other_route_classification','route_observation_basis',
  'enquiry_point','account_test_point','post_test_account_opportunity','accountable_actor_available',
  'time_reference_called_for','bearing_interest','stated_standard','stated_standard_source_quote_or_location',
  'cross_context_map','serving_eligible','recurrence_eligible','replacement_required',
  'name_clearance_status','sensitivity_flag']
FIELDS_LIVE = ['min_seconds','max_seconds']          # Stages 1, 2 and 4
FIELDS_S3   = ['ai_use','submission_window_days']     # Stage 3 only
LIST_FIELDS = {'material_items':'M','assertion_reference_set':'A','attribution_support_set':'AS','available_routes':'R-'}

def main(path):
    L = open(path, encoding='utf-8').read().split('\n')

    # ---------- headings hygiene [AS-51] ----------
    for i,l in enumerate(L,1):
        if re.match(r'^#{1,6} ', l) and ('**' in l or l.rstrip().endswith('.')):
            err('AS-51', f'line {i}', 'heading contains emphasis or ends with a full stop; a sentence is not a heading')

    # ---------- capture register, read from the document [AS-18] ----------
    register = OrderedDict()
    for i,l in enumerate(L,1):
        m = SET_HEAD.match(l.strip())
        if m: register[m.group(1)] = i
    if not register:
        err('AS-18','document','no capture sets found; expected lines of the form **C1 — Title**')

    # set classification table [AS-22, AS-23]
    classified = {}
    for l in L:
        m = re.match(r'^\| *(C\d+[a-z]?\d*) *\| *(content|first-occurrence) *\| *(.*?) *\|$', l)
        if m: classified[m.group(1)] = (m.group(2), m.group(3))
    for c in register:
        if c not in classified:
            err('AS-22','capture register', f'{c} is not classified content or first-occurrence')

    # ---------- question register [AS-26] ----------
    questions = OrderedDict()
    for l in L:
        m = re.match(r'^\| *(Q-D\d+-\d+[a-z]?\d?) *\| *(CE-\d+) *\| *(C\d+[a-z]?\d*) *\|', l)
        if m: questions[m.group(1)] = m.group(3)
    for q,c in questions.items():
        if c not in register:
            err('AS-18','question register', f'{q} uses {c}, which is not in the capture register')

    # ---------- sources ----------
    heads = [(i, SRC_HEAD.match(l)) for i,l in enumerate(L) if SRC_HEAD.match(l)]
    if not heads: err('AS-06','document','no source headings found'); return report()
    dims = {m.group(2) for _,m in heads}
    if len(dims) != 1: err('AS-06','document', f'sources span more than one dimension: {sorted(dims)}')
    N = heads[0][1].group(2)
    seen = set(); lastnum = {}
    for k,(i,m) in enumerate(heads):
        sid, st, num = m.group(1), m.group(3), int(m.group(4))
        if sid in seen: err('AS-06', sid, 'duplicate source heading')
        seen.add(sid)
        if st in lastnum and num != lastnum[st] + 1:
            err('AS-06', sid, f'Stage {st} numbering jumps from {lastnum[st]:03d} to {num:03d}')
        lastnum[st] = num
        end = heads[k+1][0] if k+1 < len(heads) else len(L)
        check_source(sid, N, st, L[i+1:end], register, questions)

    # ---------- field syntax only inside source sheets [AS-07] ----------
    inside = set()
    for k,(i,m) in enumerate(heads):
        end = heads[k+1][0] if k+1 < len(heads) else len(L)
        for j in range(i, end): inside.add(j)
    for j,l in enumerate(L):
        if FIELD.match(l) and j not in inside:
            err('AS-07', f'line {j+1}', 'field-list syntax outside a source block; definitions must be prose')
    return report()

def blocks_of(body):
    """Return ordered {label: [lines]} for bold-label blocks inside one source."""
    out = OrderedDict(); cur = None
    for l in body:
        m = re.match(r'^\*\*([^*]+)\*\*$', l.strip())
        if m:
            cur = m.group(1).split(' — ')[0].strip()
            out.setdefault(cur, []); continue
        if cur: out[cur].append(l)
    return out

def check_source(sid, N, st, body, register, questions):
    # soft wrap: a structured line continued on an indented line [AS-04]
    for j,l in enumerate(body):
        if re.match(r'^ {2,}\S', l) and j > 0 and (body[j-1].startswith('- ') or body[j-1].startswith('  ')):
            err('AS-04', sid, f'wrapped continuation line: "{l.strip()[:50]}"'); break

    text = '\n'.join(body)
    for w in BRITISH:
        for mm in re.finditer(r'\b' + w + r'\b', text, re.I):
            err('AS-52', sid, f'British spelling "{mm.group(0)}"; the build\'s vocabulary lock rejects it'); break
    for rx in RETIRED:
        mm = re.search(rx, text, re.I)
        if mm: err('AS-53', sid, f'retired term "{mm.group(0)}"')

    b = blocks_of(body)
    names = list(b.keys())
    for req in REQUIRED_BLOCKS[st]:
        if req not in names: err('AS-06', sid, f'missing block "{req}"')
    if 'The script' in names and 'Question applicability' in names:
        if names.index('The script') > names.index('Question applicability'):
            err('AS-06', sid, '"The script" must come before "Question applicability"')

    # field syntax is allowed ONLY inside the Source sheet block [AS-07]
    for lab, lines in b.items():
        if lab == 'Source sheet': continue
        for l in lines:
            if FIELD.match(l):
                err('AS-07', sid, f'field-list syntax in "{lab}", outside the Source sheet: "{l.strip()[:45]}"'); break

    # beat codes leading a line outside the script / reveal block [AS-08]
    for lab, lines in b.items():
        if lab in ('The script','Reveal sequence'): continue
        for l in lines:
            if LEADING_CODE.match(l.strip()):
                err('AS-08', sid, f'beat code leads a line in "{lab}": "{l.strip()[:40]}"')

    # ---------- source sheet ----------
    sheet = OrderedDict()
    for l in b.get('Source sheet', []):
        if not l.strip(): continue
        m = FIELD.match(l)
        if not m: err('AS-04', sid, f'non-field line in Source sheet: "{l.strip()[:50]}"'); continue
        f, v = m.group(1), m.group(2).strip()
        if f in sheet: err('AS-09', sid, f'field {f} appears twice')
        sheet[f] = v
    allf = [x.replace('{N}', N) for x in FIELDS_ALL]
    need = allf + (FIELDS_LIVE if st in '124' else FIELDS_S3)
    for f in need:
        if f not in sheet: err('AS-09', sid, f'missing field {f}')
    known = set(need) | set(sheet)
    for f, v in sheet.items():
        for other in known:
            if other != f and re.search(r'[a-z.)]' + re.escape(other) + r'\b', v):
                err('AS-04', sid, f'field name {other} runs into the value of {f}')
    sc = sheet.get(f'd{N}_situation_class', '')
    if sc and not re.match(r'^S-\d+(?: with S-\d+)?$', sc):
        err('AS-09', sid, f'd{N}_situation_class must read S-n or "S-n with S-m", found "{sc[:30]}"')
    for f, pfx in LIST_FIELDS.items():
        v = sheet.get(f)
        if v is None or v in ('None', 'null') or v.startswith('Empty.'): continue
        ids = re.findall(r'(?<![A-Za-z-])' + re.escape(pfx) + r'([a-z0-9]+)\b', v)
        if not ids: err('AS-05', sid, f'{f} has items but no {pfx} identifiers'); continue
        seq = [x for x in ids]
        expected = ([chr(ord('a')+i) for i in range(len(seq))] if pfx == 'R-' else [str(i+1) for i in range(len(seq))])
        if seq != expected: err('AS-05', sid, f'{f} identifiers not sequential: {seq}')
        if not v.rstrip().endswith('.'): err('AS-05', sid, f'{f} does not end with a full stop; possible truncation')

    # ---------- script, Stages 2 and 4 ----------
    if st in '24':
        beats = [BEAT.match(l.strip()) for l in b.get('The script', []) if l.strip()]
        rows = [x for x in beats if x]
        bad  = [l for l in b.get('The script', []) if l.strip() and not BEAT.match(l.strip())]
        for l in bad: err('AS-14', sid, f'script line not in canonical form: "{l.strip()[:50]}"')
        codes = [int(x.group(1)) for x in rows]
        if codes != [1,2,3,4,5,6,7]: err('AS-16', sid, f'script beats {codes}; expected B1 to B7 in order')
        for x in rows:
            beat, act, spoken, direction, cap = x.group(1), x.group(2), x.group(3), x.group(4), x.group(5)
            if act not in STAGE_VOCAB[st]: err('AS-15', sid, f'B{beat} action {act} not in the Stage {st} vocabulary')
            if st == '4' and beat == '2' and act != 'ROUND': err('AS-15', sid, 'Stage 4 B2 must be ROUND')
            # a capture label from the register must never be spoken; ordinary words such as
            # "update" or "final" are legitimate speech and are allowed [AS-17]
            for lab in register:
                if re.search(r'\b' + re.escape(lab) + r'\b', spoken):
                    err('AS-17', sid, f'B{beat} spoken text contains capture label {lab}'); break
            if cap.strip() != '—':
                for part in [p.strip() for p in cap.split(',')]:
                    pm = re.match(r'^(C\d+[a-z]?\d*)(?: (\w+))?$', part)
                    if not pm: err('AS-18', sid, f'B{beat} capture "{part}" not in canonical form'); continue
                    lab, q = pm.group(1), pm.group(2)
                    if lab not in register: err('AS-18', sid, f'B{beat} binds {lab}, not in the capture register')
                    if q and q not in QUALIFIERS: err('AS-19', sid, f'B{beat} qualifier "{q}" is not none, update or final')

    # ---------- reveal sequence, Stage 1 ----------
    if st == '1':
        rows = [REVEAL.match(l.strip()) for l in b.get('Reveal sequence', []) if l.strip()]
        if not rows or not all(rows): err('AS-14', sid, 'reveal lines must read: - **Rn** <text> | Role: <role>')
        else:
            n = [int(x.group(1)) for x in rows]
            if n != list(range(1, len(n)+1)): err('AS-16', sid, f'reveals {n} not sequential from R1')
            declared = sheet.get('reveal_count')
            if declared and declared.isdigit() and int(declared) != len(n):
                err('AS-16', sid, f'reveal_count {declared} but {len(n)} reveals found')

    # ---------- applicability ----------
    rows = {}
    for l in b.get('Question applicability', []):
        m = re.match(r'^\| *(Q-D\d+-\d+[a-z]?\d?) *\| *(DIRECT|CONDITIONAL|NOT SERVED) *\| *(.+?) *\|$', l.strip())
        if m: rows[m.group(1)] = m.group(2)
        elif re.match(r'^\| *Q-', l.strip()):
            err('AS-28', sid, f'applicability row not canonical: "{l.strip()[:50]}"')
    for q in questions:
        if q not in rows: err('AS-28', sid, f'no applicability status for {q}')

def report():
    if ERR:
        print(f"FAIL — {len(ERR)} error(s). Do not issue.\n")
        for e in ERR: print(' ', e)
        return 1
    print("PASS — zero errors. The script may be issued.")
    return 0

if __name__ == '__main__':
    if len(sys.argv) != 2: print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1]))
```

---

## Part I — Canonical sample

A complete, minimal package for a placeholder dimension, **D0**, with one source per Stage. **It is a format fixture, not real content.** It passes the validator, and every template in Part C is taken from it.

````markdown
# Sample dimension D0 — canonical fixture

This is a format fixture, not a real dimension.

### 5.2 Question object register

| Question | Element | Capture set | Answer type | Source-bound to | Served when |
|---|---|---|---|---|---|
| Q-D0-01 | CE-01 | C1 | Single select, fixed | — | Always where the element is in play |
| Q-D0-02 | CE-02 | C2 | Single select, fixed | — | Source carries enquiry_point |
| Q-D0-03 | CE-03 | C3 | Single select, fixed | — | Source carries material_items |
| Q-D0-04a | CE-04 | C4a | Single select, fixed | — | Always where the element is in play |
| Q-D0-04b | CE-04 | C4b | Single select, fixed, bound child | attribution_support_set | Source carries attribution_support_set |
| Q-D0-08a | CE-08 | C8a | Single select, fixed | — | Source carries bearing_interest |
| Q-D0-08b | CE-08 | C8b | Single select, fixed | — | C8a records a disclosure |

### 5.3 Response capture catalog

**C1 — What was said about the issue**

- Named the specific issue and what it was.
- Made no reference to an issue.

**C2 — When it was first raised**

- Raised it before the direct question was asked.
- Raised it in response to the direct question.
- Did not raise it at any point in the session.

**C3 — What the account contained**

- Included every material item and no unsupported claim.
- Omitted one or more material items.

**C4a — What was said about their own involvement**

- Described their own involvement.
- Made no statement about their own involvement.

**C4b — What was attributed to another person**

- Made no attribution.
- Made one or more attributions and all were aligned to the support set.

**C8a — Disclosure timing**

- First disclosed before the decision point.
- Did not disclose during the observation.

**C8b — Prompt condition**

- First disclosed before any direct question about the interest.
- First disclosed in direct response to the direct question about the interest.

**Capture set classification**

| Set | Type | Whole-session lines |
|---|---|---|
| C1 | content | — |
| C2 | first-occurrence | Did not raise it at any point in the session. |
| C3 | content | — |
| C4a | content | — |
| C4b | content | — |
| C8a | first-occurrence | Did not disclose during the observation. |
| C8b | first-occurrence | — |

### 5.18 Source library

#### SRC-D0-S1-001 — THE SAMPLE REPORT

**The situation, as the participant meets it**

You sent a report on Friday. On Monday you find it did not send.

**Reveal sequence**

- **R1** What do you do now? Describe your next steps. | Role: Opening
- **R2** A message from your manager: "Did the report go out on Friday?" Write your reply. | Role: Enquiry point
- **R3** "Just so I have the timeline right — when did you realize it had not gone?" | Role: Account test

**Question applicability**

| Q-D0-01 | DIRECT | The situation places an issue before the participant |
| Q-D0-02 | DIRECT | Enquiry point at R2 |
| Q-D0-03 | DIRECT | The source carries material items |
| Q-D0-04a | DIRECT | The participant's own involvement is in play |
| Q-D0-04b | NOT SERVED | The source carries no attribution support |
| Q-D0-08a | NOT SERVED | The source carries no bearing interest |
| Q-D0-08b | NOT SERVED | Follows Q-D0-08a |

**Source sheet**

- `d0_situation_class` — S-1
- `workplace_demand` — Responding when a report you owned did not reach its recipient.
- `relevant_conduct` — Whether the non-delivery is raised and how the account is given.
- `irrelevant_conduct` — Writing style and formatting.
- `information_made_available` — P0 the report did not send. I1 the manager asks about it at R2.
- `material_items` — M1 the report did not send. M2 the participant owned sending it.
- `assertion_reference_set` — A1 the report was sent on time.
- `information_withheld` — None
- `attribution_support_set` — Empty.
- `available_routes` — R-a reply to the manager directly.
- `other_route_classification` — Permitted where the participant states the means.
- `route_observation_basis` — Not served at Stage 1.
- `enquiry_point` — R2
- `account_test_point` — R3
- `post_test_account_opportunity` — true
- `accountable_actor_available` — true
- `time_reference_called_for` — false
- `bearing_interest` — None
- `stated_standard` — None
- `stated_standard_source_quote_or_location` — None
- `cross_context_map` — None
- `serving_eligible` — true
- `recurrence_eligible` — true
- `replacement_required` — false
- `name_clearance_status` — CLEARED
- `sensitivity_flag` — None
- `min_seconds` — 300
- `max_seconds` — 900

#### SRC-D0-S2-001 — THE SAMPLE FIGURE

**MENTOR BRIEF — what the mentor knows and does not say**

The participant supplied a figure that is wrong. The colleague presenting it does not know.

**PARTICIPANT PRE-BRIEF — given to the participant before the session**

You sent a figure on Tuesday. You have since found it used the wrong month.

**The script**

- **B1** SAY | Spoken: "Right, I have the figure here for the meeting. It looks good." | Direction: — | Capture: —
- **B2** PAUSE | Spoken: — | Direction: Say nothing for ten to fifteen seconds. Do not prompt. | Capture: C1, C2
- **B3** ASK | Spoken: "That is the right number, is it not?" | Direction: — | Capture: C1, C2, C3, C4a, C4b
- **B4** ASK | Spoken: "Is it close enough?" | Direction: Asked once. Accept whatever answer comes. | Capture: C3 update
- **B5** ASK | Spoken: "So what should happen now?" | Direction: — | Capture: C1
- **B6** ASK | Spoken: "When did you spot it?" | Direction: — | Capture: C3
- **B7** SAY | Spoken: "Right. Thanks." | Direction: End the session. | Capture: —

**Question applicability**

| Q-D0-01 | DIRECT | The figure is before the participant |
| Q-D0-02 | DIRECT | Enquiry point at B3 |
| Q-D0-03 | DIRECT | The source carries material items |
| Q-D0-04a | DIRECT | Own involvement in play |
| Q-D0-04b | NOT SERVED | No attribution support |
| Q-D0-08a | NOT SERVED | No bearing interest |
| Q-D0-08b | NOT SERVED | Follows Q-D0-08a |

**Source sheet**

- `d0_situation_class` — S-1
- `workplace_demand` — Correcting a figure a colleague is about to present.
- `relevant_conduct` — Whether the error is raised before it is presented.
- `irrelevant_conduct` — Tone and phrasing.
- `information_made_available` — P0 the pre-brief. I1 the colleague presents the figure at B1.
- `material_items` — M1 the figure is wrong. M2 the participant supplied it. M3 the correct figure is higher.
- `assertion_reference_set` — A1 the figure is correct.
- `information_withheld` — None
- `attribution_support_set` — Empty.
- `available_routes` — R-a tell the colleague directly. R-b ask the colleague to hold the item.
- `other_route_classification` — Permitted where the participant states the means aloud.
- `route_observation_basis` — Observable in session where stated aloud.
- `enquiry_point` — B3
- `account_test_point` — B6
- `post_test_account_opportunity` — true
- `accountable_actor_available` — true
- `time_reference_called_for` — true
- `bearing_interest` — None
- `stated_standard` — None
- `stated_standard_source_quote_or_location` — None
- `cross_context_map` — Pairs with SRC-D0-S1-001.
- `serving_eligible` — true
- `recurrence_eligible` — true
- `replacement_required` — false
- `name_clearance_status` — CLEARED
- `sensitivity_flag` — None
- `min_seconds` — 360
- `max_seconds` — 600

#### SRC-D0-S3-001 — THE SAMPLE BRIEF

**The brief, in summary**

The participant prepares a written recommendation from a pack of documents.

**Question applicability**

| Q-D0-01 | DIRECT | The pack contains an issue |
| Q-D0-02 | NOT SERVED | No live enquiry at Stage 3 |
| Q-D0-03 | DIRECT | The source carries material items |
| Q-D0-04a | DIRECT | Own involvement in play |
| Q-D0-04b | NOT SERVED | No attribution support |
| Q-D0-08a | NOT SERVED | No bearing interest |
| Q-D0-08b | NOT SERVED | Follows Q-D0-08a |

**Source sheet**

- `d0_situation_class` — S-4
- `workplace_demand` — Writing a recommendation from a pack that contains a discrepancy.
- `relevant_conduct` — Whether the discrepancy is disclosed in the recommendation.
- `irrelevant_conduct` — Quality of the recommendation itself.
- `information_made_available` — P0 the pack.
- `material_items` — M1 the pack contains a discrepancy.
- `assertion_reference_set` — A1 the pack is internally consistent.
- `information_withheld` — None
- `attribution_support_set` — Empty.
- `available_routes` — None
- `other_route_classification` — Not applicable.
- `route_observation_basis` — Not served at Stage 3.
- `enquiry_point` — None
- `account_test_point` — None
- `post_test_account_opportunity` — false
- `accountable_actor_available` — false
- `time_reference_called_for` — false
- `bearing_interest` — None
- `stated_standard` — None
- `stated_standard_source_quote_or_location` — None
- `cross_context_map` — None
- `serving_eligible` — true
- `recurrence_eligible` — true
- `replacement_required` — false
- `name_clearance_status` — CLEARED
- `sensitivity_flag` — None
- `ai_use` — AI_USE_DECLARATION_REQUIRED
- `submission_window_days` — 3

#### SRC-D0-S4-001 — THE SAMPLE ROUND

**MENTOR BRIEF — what the facilitator knows and does not say**

The observed participant has a connection to one bidder. The panel does not know.

**PARTICIPANT PRE-BRIEF — given before the session**

You sit on a panel choosing between two bids. You once worked with one bidder.

**CO-PARTICIPANT POSITIONS — given to each in writing before the session**

| Co-participant | Position stated at the round |
|---|---|
| CP-1 | Backs the first bid on delivery record. |
| CP-2 | Backs the first bid on price. |

**The script**

- **B1** SAY | Spoken: "Thanks for joining. The two bids are on screen." | Direction: — | Capture: —
- **B2** ROUND | Spoken: "Could each of you give your view in turn?" | Direction: Invite each co-participant in turn. Do not comment. | Capture: C1, C8a, C8b
- **B3** ASK | Spoken: "And your view? Which would you recommend?" | Direction: — | Capture: C1, C2, C8a, C8b
- **B4** ASK | Spoken: "So we are agreed?" | Direction: Asked once. | Capture: C3 update, C8a update, C8b update
- **B5** ASK | Spoken: "Anything we should note before we sign off?" | Direction: — | Capture: C1
- **B6** ASK | Spoken: "Just to confirm, nothing to declare?" | Direction: — | Capture: C3
- **B7** SAY | Spoken: "Thank you all." | Direction: End the session. | Capture: C8a final, C8b final

**Question applicability**

| Q-D0-01 | DIRECT | The decision is before the panel |
| Q-D0-02 | DIRECT | Enquiry point at B3 |
| Q-D0-03 | DIRECT | The source carries material items |
| Q-D0-04a | DIRECT | Own involvement in play |
| Q-D0-04b | NOT SERVED | No attribution support |
| Q-D0-08a | DIRECT | The source carries a bearing interest |
| Q-D0-08b | CONDITIONAL | Served once Q-D0-08a records a disclosure |

**Source sheet**

- `d0_situation_class` — S-5
- `workplace_demand` — Disclosing a connection before a panel decision.
- `relevant_conduct` — Whether the connection is disclosed and when.
- `irrelevant_conduct` — Which bid is recommended.
- `information_made_available` — P0 the pre-brief. I1 the bids at B1.
- `material_items` — M1 the participant worked with one bidder.
- `assertion_reference_set` — A1 the participant has no connection to either bidder.
- `information_withheld` — None
- `attribution_support_set` — Empty.
- `available_routes` — R-a declare the connection to the panel.
- `other_route_classification` — Permitted where stated aloud.
- `route_observation_basis` — Observable in session where stated aloud.
- `enquiry_point` — B3
- `account_test_point` — B6
- `post_test_account_opportunity` — true
- `accountable_actor_available` — true
- `time_reference_called_for` — false
- `bearing_interest` — The decision point is the agreement at B4; the enquiry at B3 precedes it.
- `stated_standard` — None
- `stated_standard_source_quote_or_location` — None
- `cross_context_map` — None
- `serving_eligible` — true
- `recurrence_eligible` — true
- `replacement_required` — false
- `name_clearance_status` — CLEARED
- `sensitivity_flag` — None
- `min_seconds` — 600
- `max_seconds` — 1200
````

---

## Part J — Vetting by the Lead Platform Developer

This specification changes the **form** of what the build receives. D1 was loaded from converted, flattened text; a package written to this specification is clean. **The build must be confirmed to read the clean form before the first new dimension is written.**

Please confirm or correct each item.

| # | Item |
| --- | --- |
| **J-1** | Load the Part I sample into the platform. Confirm it loads with **zero refusals**: four sources, the Stage 2 and Stage 4 scripts at seven beats each, the Stage 1 reveals at three, every capture binding resolved, every applicability row read |
| **J-2** | Confirm the loader reads the canonical beat line at C.4 — `- **Bn** ACTION \| Spoken: … \| Direction: … \| Capture: …` — and separates spoken text from direction |
| **J-3** | Confirm the loader reads per-label qualifiers — `C3 update, C8a update` — rather than one qualifier across a list |
| **J-4** | Confirm the loader reads `dn_situation_class` as a field and derives the pattern family from it |
| **J-5** | Confirm `min_seconds` and `max_seconds` on Stage 2 and Stage 4 sources feed the Session Control Strip |
| **J-6** | Confirm the division at Part B matches SOP-001's intake: the package authors B.1 and never re-issues B.2 |
| **J-7** | Mark every point where this specification and SOP-001 disagree, and which is wrong |
| **J-8** | Confirm the validator's checks match what the build refuses. Where the build refuses something the validator allows, name it so the validator can be extended |
| **J-9** | **Resolved conflict.** SOP-001 Stage 1.5.4 said to refuse an unknown token; its Appendix C — Appendix 3 in this document — said to store it as written without behavior. This document follows 1.5.4 and T3A-D1-EXEC-CLOSE-001 CL-08: **a capture qualifier outside the closed list refuses the source by name.** Confirm, or state why the build needs the other behavior |
| **J-10** | The validator's British-spelling list is deliberately broader than the vocabulary lock, because the founder's rule is American English throughout. Confirm every word the lock rejects is on the validator's list, so nothing the lock refuses can pass the validator |
| **J-11** | Part K reproduces SOP-001 with four stated edits only, verified word by word before issue. Confirm it against your source, and confirm this document may replace SOP-001 as the single procedure |

**On return,** this document is corrected and issued at Version 1.0, and the first new dimension is written to it.

---

## Part K — Onboarding: from issued script to serving

*Written by the Lead Platform Developer as SOP-001 and incorporated here in full. Wording is his, with four edits only: American spelling; his Appendices A to F renumbered 1 to 6, because this document's Parts use letters; tables and SQL restored to markdown; and one conflicting rule resolved, marked where it occurs.*

**Purpose.** One repeatable procedure for putting a dimension's sources into the platform. Written from what was actually done for D1, so that D2 and everything after it is a replication rather than a rediscovery.

**Who this is for.** The founder or an oversight administrator doing the approvals, and whoever is running the load.

**The shape of it.** Content is loaded mechanically and refuses to serve. A person with standing then approves it, one source at a time. Those two halves never merge: a build can load and hash, and only a person can say a text is fit to put in front of a participant.

### Revision note

*Read this first if you used the earlier version*
The first version of this procedure was written when D1 reached 24 of 30 acceptance tests. Getting from there to 30 of 30 took four correction instruments — CORR-002, CORR-003, CORR-004 and REAPP-001 — and a signed ruling on how approvals are counted. Almost every one of those corrections fixed something the build had got confidently wrong, not something the issued content had got wrong. That is the single most useful fact in this document.

The pattern, stated once because it recurs in every stage below: the failure was never a missing check. It was a check that measured the wrong thing and passed. A parser that read the wrong block and produced clean output. A test that went green because the thing it pointed at was empty. An index that enforced something stricter than its own note said it did. A report that counted rows where it should have counted standing.

So the discipline this procedure asks for is not more checking. It is checking that each check can actually fail, and measuring before changing rather than after.

New in this revision: Stage 1.4 (the five parse faults), Stage 2A (correcting loaded content), Stage 3's standing rules, Stage 4's test discipline, Stage 5 (phase order), and Appendices 5 and 6.

### Stage 0 — Before anything is loaded

**0.1** The issued document. One document per dimension, carrying the sources, the question objects, the capture sets and lines, the branch rules, the statement library and the language templates. D1's was T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1.0.

**0.1a** A dimension cannot start without an issued Execution Edition. Not a draft, not a working document. D2 is blocked on exactly this and no amount of build work changes that.

**0.2** Nothing is transcribed. Content is parsed from the issued document by a script, never retyped. Transcription introduces silent drift that no test catches, because the test and the typo agree.

**0.2a** Keep the issued document where the build can reach it, and keep it. D1's was an email attachment. By the time Section 6 needed to parse the Stage 2 scripts it was no longer on disk, and the parse had to read the stored text instead. That turned out to be the better input — see Stage 1.5 — but it was luck, not design. Commit the issued document, or record exactly where it lives.

**0.3** Check who holds standing before you start.

```sql
select holder_name, holder_email, granted_at, revoked_at
from t3a_oversight_holder where revoked_at is null;
```
If the list is empty, nobody can approve anything and Stage 3 will fail. See Appendix 1.

### Stage 1 — Extract

**1.1** Adapt the extractor for the dimension. D1's is scripts/extract-d1-content.mjs. It reads the issued document and emits a migration.

**1.2** The extraction rules that were learned the hard way on D1 — carry them forward, they are not D1-specific:

- A field stated twice is normal. Sources state some fields in their own sheet and again inside a question-applicability table. Taking the last match corrupted 2 of 40 sources; taking the first corrupted 25. The rule that works: discard values beginning with a question code, and among the rest take the fullest.
- Measure the extraction, do not eyeball it. Count how many values match the shape the sources themselves use (M1 …, A1 …, AS1 …, R-a …). D1 landed at 40/40, 40/40, 39/40, 39/40. Two fields no rule could recover were left alone and recorded, not guessed.
- Spelling and house style are content decisions. D1 had five British spellings that the build's vocabulary lock rejects. The developer did not silently rewrite them; the conflict was recorded and the founder decided. Apply the decision by name in the extractor so a regeneration cannot undo it.

**1.3** Regenerate and diff against the previous output before applying anything. A regeneration that changes more than you expected is telling you something.

**1.4** The five parse faults, and how each one hides
Every one of these produced clean-looking output. None of them announced itself. Four were reported to the founder as content faults before turning out to be the parser's.

**1.4.1** $ with the /m flag does not mean end of string. It matches the end of every line. A lookahead written to find the end of a value matched the first line break instead and silently truncated. This was sent to the founder as a content defect. It was not. Fix: parse logical units — a bullet and its indented continuations are one item — rather than matching across raw lines.

**1.4.2** "Take the fullest value" picks the wrong block. The fullest run of text near a source was a definitional section that describes fields generically rather than populating them, so the parser confidently loaded definitions as values. Fix: score candidate blocks on how many distinct expected field names they contain, not on length.

**1.4.3** The last source in a bank has no terminator. No following heading closes it, so the next bank's common section runs on into it. On D1 this hit exactly three sources — one per bank — and all three had to be superseded and re-approved. Fix: a source's sheet is the contiguous run carrying the most distinct sheet field names, terminating before any following common section. And when three sources fail the same way, check whether they share a position before assuming they share a defect.

**1.4.4** Conversion splits field names across a boundary. A value ends with a short lowercase fragment that is actually the head of the next field's name — relevant_conduct ending ".ir" because irrelevant_conduct followed. Seven occurrences in D1's file. Fix: where two adjacent items carry the same field name and the first ends in a short lowercase fragment that completes a known field name, move the fragment.

**1.4.5** A marker can be split by a soft wrap. On one source the words "The script" straddled a line break, so a search on raw text found nothing and that source yielded zero beats — silently, as an empty result rather than an error. Fix: collapse all whitespace, line breaks included, to single spaces BEFORE searching for any marker. Then search. This applies to end boundaries as well as start markers.

**1.5** Four rules that would have prevented most of the above
**1.5.1** Measure the blast radius before implementing a fix, not after. Before applying the split-field repair, D1 scanned all forty live source sheets for the pattern and found exactly one hit — on a source already withdrawn. So one version was superseded instead of several, and no standing approval was touched. Doing that scan afterwards is how you discover you have voided thirty-seven approvals.

**1.5.2** Parse the approved text, not a copy of the document. Section 6 parsed each source's stored verbatim — the text carrying a standing approval — rather than a file. A parse against a file cannot tell you the register has since superseded that text. This is Stage 4's stale-fixture rule applied to the input.

**1.5.3** A block has a hard end boundary. Find it and stop. D1's script tables end at **Question applicability**, and the table after that boundary also contains lines beginning with a beat code. A parser reading past it counted nine beats instead of seven — and the resulting count error described the symptom, not the cause.

**1.5.4** Keep the set of recognized tokens closed, and refuse outside it. Where a parser met a qualifier it did not know, it refused that source by name rather than guessing. Guessing there truncates an approved line. A refusal you can read beats output you cannot check.

**1.6** Superseded label sets
Content authored before a register was split still uses the old labels. D1's script tables bound eight capture sets; the register holds thirteen. Three of the eight do not exist any more.

Translate through a fixed table written down in the instrument, and check the result against the register. Two rules:

- The translation is not a judgment call. If you are inferring a mapping, stop and get it stated.
- Make the register check structural where you can. A foreign key to the register table means an untranslated label cannot be stored, which is stronger than a check that has to be remembered.

Translation produces candidates. Applicability still governs what is served. Where a translated item is not served by that source, it is dropped at serve time, not refused at load time — and its absence is not a missing state.

### Stage 2 — Load and hash

**2.1** Load as content. Apply the generated migration. Every source lands with operational_state = not_loaded and refuses to serve. That refusal is the control, not a bug.

**2.2** Assign source-version hashes.

```sql
-- sha256 over each version's own verbatim body
select * from t3a_d1_source_hash_integrity();
```
Expect standing_versions = hash_matches_verbatim and mismatched = ''.

**2.3** A loaded body is immutable. Any correction — spelling, a re-extracted field, anything — supersedes rather than edits. The original stays in history. t3a_d1_content_version_immutable enforces this; do not work around it.

**2.4** Confirm where it stands.

```sql
select * from t3a_d1_serving_readiness();
```
You want: sources loaded = N, carrying a hash = N, approved = 0.

**2.5** Content that is not the source text does not go in the body. A mentor script, a beat sequence, a capture binding — these live in their own tables keyed by source identifier. The body is immutable once approved, so putting a script into it would mean superseding a version every time a script loads, and superseding voids the approval. D1 got this right structurally and then failed to read the table — see Stage 4.5.

### Stage 2A — Correcting content that is already loaded

This stage did not exist in the first version of this procedure, and three quarters of D1's correction work happened in it.

**2A.1** Supersede, never edit. Restated here because it is the rule everything else in this stage follows from.

**2A.2** An approval does not survive superseding. It names an exact version. Correct a source and its approval is attached to a version that is no longer live, so nothing is servable until something is done about it. Expect this; it is not a fault.

**2A.3** There are exactly two honest things to do about it, and they are not equivalent.

| Option | What it asserts | When it is available |
|---|---|---|
| Carry the approval forward | The approved text did not change; only its parse did | Only where that can be demonstrated |
| Withdraw and re-approve | The text changed, so the approval must be given again | Always |

A carry-forward is a claim, and it must be checkable. Record, per carried approval: the version carried from, the stated basis, and the result of an assertion that the new text contains the old. Where the assertion fails, the approval is not carried — it is withdrawn, and the source waits for a person.

**2A.4** A carry-forward is not a build decision. It writes an approval row for a version no human inspected. Put the alternatives to the founder and record the ruling.

**2A.5** Provenance must be complete or it lies by omission. D1 carried forty approvals and wrote provenance for the thirty-seven that passed the assertion. The three that failed were withdrawn and never annotated — so the standing view read "not carried forward" for all three, which was true of none of them. A record that is present for the successes and absent for the failures reads as a clean record. Write the row for the failures too, with the failure in it.

**2A.6** A withdrawal must survive superseding. Otherwise superseding a withdrawn source silently makes it servable again — a correction becoming a back door to approval. D1 hit this exactly: a repair to a withdrawn source made it servable, and the count was reported as clean before the fault was found. Guard it on the table, not in the route: the route did not refuse it and something reached the table anyway.

**2A.7** A signed re-approval goes somewhere a build cannot reach. Once a source is withdrawn, no route may approve it again until a row naming the version, the basis, the approver as signed and the date exists. That table ships empty. It is the mechanism that makes a signature a precondition rather than a courtesy.

### Stage 3 — Approve (the founder act)

**3.1** Sign in as an account holding oversight standing.

**3.2** Go to /dashboard/mentor/source-approval.

**3.3** Read a source. Then approve that version.

What an approval asserts. That you, by name, hold this exact text fit to put in front of a participant in a real observation. It is recorded against the version hash.

Why there is no approve-all button. A control that approves forty at once approves forty unread. This is deliberate and will not be added.

**3.4** You do not need to approve all of them. One approved source opens the serving path.

**3.5** Withdrawing. Withdrawal is a new record, never an erasure. The history shows the source was once approved and by whom.

**3.6** After a correction. A corrected source is a new version, and a new version does not inherit the old approval. Re-approve it — and read Stage 2A first if the correction was the build's rather than the content's.

**3.7** Standing is the latest status. It is never the existence of a row.
The approval table is insert-only: a withdrawal is a later row, and the approved row it withdraws stays where it is forever. So:

An approved row existing tells you nothing. Only the latest row for that version tells you anything.

Four separate D1 faults were this one mistake wearing different clothes.

**3.7.1** Define it once, and make everything read that one definition. Not "implement it the same way in two places" — read the same definition. D1's enforcement and its read were written separately, and they disagreed for two days.

**3.7.2** A raw count of approved rows is not a count of approvals. After a withdraw-and-reapprove a version holds two approved rows and one standing approval. D1's readiness report counted rows: it reported forty servable and nothing blocked while the register correctly reported three unservable. Nothing was served wrongly — the serving path used the right reader — but the number anyone would glance at was wrong.

**3.7.3** Enforce the invariant you actually mean. D1's unique index was UNIQUE (source_id, version_id) WHERE status = 'approved'. Its own migration note said it meant "one standing approval per version". On an insert-only table it meant "one approved row per version ever", so it refused every re-approval after a withdrawal. A partial index cannot express "latest status". Read the note next to a constraint and check the constraint does what the note claims.

**3.7.4** Replacing a race-safe control with a check loses the race safety. The index gave per-version serialization for free. A before-insert check does not, unless it takes a lock scoped to the version before reading standing. Otherwise two concurrent approvals both read "not approved" and both succeed.

**3.7.5** When you change what counts as an approval, find every reader. Search for every direct test of the status value and route each one through the one definition. Two of D1's four readers were wrong, and one was wrong in production.

**3.8** An approval you cannot account for stays, flagged
D1 found an approval row nothing could explain: no migration writes it, no trigger writes it, no seed script writes it, and it postdates the only migration that could have produced its timestamp. It was kept unaltered and logged as an unaccounted finding.

Do not delete it. Do not relabel it as something you do understand. Do not let a later approval bury it. An unexplained governance record with a flag on it is evidence; the same record quietly tidied is not.

### Stage 4 — Verify

**4.1** Re-run readiness; approved should have moved.

**4.2** Re-run the acceptance suite for the dimension and record the evidence. A test specification is not a passed test: record the actual result, the build version, the date and the tester.

**4.3** Where a test cannot pass because a governing input is missing, record it as a conflict. Do not resolve it by hiding a field, adding free text, introducing a default, combining controls, or reducing a live view.

**4.4** A green suite against stale content is worse than a red one
D1 had thirteen browser tests passing against a fixture pinned to a version that had been superseded. A red suite sends you to look. A green one tells you to stop looking.

So: make the fixture refuse. D1's seed now refuses to build a fixture pinned to a superseded version rather than trusting whoever runs it to notice. A precondition that depends on someone remembering is not a precondition.

**4.5** Ask what makes each test fail, not whether it passes
Three D1 tests passed because no sequence was loaded. They were not testing what they claimed:

- One was meant to test a missing runtime timestamp and was passing on a missing definition — a different condition. It would have gone green on a source with no script at all, and red the moment one loaded.
- One asserted a refusal on a source with no loaded sequence. After the load, that fixture existed nowhere.
- One asserted a count that the load changed.

Worse, and this is the finding worth carrying furthest: re-running the browser set after the load revealed the cockpit was never reading the sequence table at all. It rendered a body field no source version carries, so the script pane had shown an empty script for every source since it was built, while a hundred and forty beats sat in the table unread. Nothing looked broken because nothing had ever worked. The same empty list drove a beat selector, so a mentor could not record a variance at the beat it happened.

Fourteen green tests over a pane that never worked. A test whose subject is empty passes for free. Before trusting a passing test, ask what it would take to make it fail — and if the answer is "nothing, because there is nothing there", it is not a test yet.

When you load content that a surface renders, re-run that surface's tests. A pass on an empty pane is not evidence for a populated one.

**4.6** Prove refusals server-side
Any holding state, refusal or restriction is proved by requesting the route directly, not by observing that the interface hides a control. A hidden button is a design choice; a refused request is a control.

**4.7** Assert the blast radius in the same transaction as the change
Where a load writes to one place, snapshot everything it must not change, and assert it afterwards before committing. D1's Stage 2 parse hashes every source sheet before parsing and aborts if any moved — which would mean the parser is reading script text as sheet content. Checking afterwards means reporting damage; checking inside means not doing it.

### Stage 5 — Order of operations

Most of what went wrong on D1 late was order, not substance.

**5.1** Where loading content changes what existing tests mean, run three phases and do not merge them:

1. Redefine the affected tests. Change the definitions only. Do not run them.
2. Load the content.
3. Run the suite.

Phase 3 before phase 2 cannot work — the new fixtures need the loaded content. Phase 2 before phase 1 leaves the old definitions to fail against the new state, and a register that drops for a known reason is indistinguishable from one that drops for an unknown one.

**5.2** A verifier runs before the thing it guards, as its own step. Not as a side effect of that thing. A precondition that only runs as part of what it protects is not a precondition.

**5.3** Withdraw an instruction per scope, not in bulk. D1 had one instruction covering three stages, and each stage had a different true position. Withdrawing it wholesale would have misstated two of them.

**5.4** A register that is not data cannot be amended
Four D1 instructions asked for a test to be redefined or a register entry amended. None of those four existed as anything editable — they were sentences in old migration comments and inside a note attached to a past test result. The only way to amend a sentence in a historical record is to rewrite history, which you must not do.

So: anything an instrument will later amend must be a row, not prose. Test definitions, conflict-register entries, per-scope claims. Each row records what it used to say, what it says now, and why it changed. Hold outcomes in a separate table from definitions, so a passing test can never be recorded by editing the specification of the test.

### Appendix 1 — Granting oversight standing

Standing is a named person, not a flag on an account.

```sql
insert into t3a_oversight_holder
  (holder_id, holder_name, holder_email, granted_by, granted_at)
select p.id, btrim(p.first_name||' '||p.last_name), p.email, <granter>, now()
from profiles p where p.email = '<the account they actually sign in with>';
```
Three things that went wrong doing this for D1. All three are avoidable.

- Grant it to the account the person actually signs in with. Not the one whose name you recognize. The first grant went to an unused account and the person hit APPROVER_LACKS_STANDING on a live screen.
- Take the name from the account's own profile, never from a conversation. A name typed by hand can be the right name on the wrong record.
- Check the profile has a name at all. The guard verifies the email belongs to the account; it does not verify the name, so an account with no recorded name will accept any name you type.

Revoking requires a stated basis and preserves the row:

```sql
update t3a_oversight_holder
   set revoked_at = now(), revocation_basis = '<why>'
 where holder_id = '<id>' and revoked_at is null;
```

### Appendix 2 — Refusal codes you will meet

| Code | Means | Do |
|---|---|---|
| APPROVER_LACKS_STANDING | Signed-in account holds no oversight record | Appendix 1, against this account |
| NO_APPROVER_IDENTIFIED | No authenticated session | Sign in |
| SOURCE_VERSION_CARRIES_NO_HASH | Stage 2.2 not done | Assign hashes |
| SOURCE_VERSION_SUPERSEDED | Approving an old version | Approve the standing one |
| VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE | Mismatched pair | Check the ids |
| SOURCE_VERSION_ALREADY_APPROVED | The version's standing approval is already approved | Nothing. To replace it, withdraw first — the withdrawal stays in history |
| SOURCE_WITHOUT_REC_07_INTO_REAL_RUN | Serving an unapproved source | Stage 3 |
| SOURCE_APPROVAL_APPEND_ONLY | An update or delete on an approval | Record a withdrawal instead |
| WITHDRAWAL_SURVIVES_SUPERSEDE | Approving a source withdrawn under a correction | Stage 2A.7 — a signed re-approval must be recorded first |
| BEAT_SCRIPT_NOT_LOADED | The source has no loaded sequence | Load it. This is a missing definition |
| BEAT_TIMESTAMP_MISSING | The sequence is loaded; the session recorded no timestamp for that beat | Nothing to fix. This is a missing runtime record, and the refusal is correct |
| REFERENCE_BEAT_NOT_STATED_AS_BEAT | The decision point is stated in words, not as a beat code | Nothing. Permanent property of that source |

The last three are three different conditions and must never be accepted interchangeably. A test that accepts any of them passes on all of them, which is how D1's timing test spent weeks not testing timing.

Every refusal is returned rather than raised where it must also be logged — a raised refusal rolls back its own log row, so the log would be empty exactly when it mattered. Where a refusal must both abort and be recorded, split it: the route returns a code and logs, and a table guard raises as the backstop for anything that bypasses the route.

### Appendix 3 — What a build may never do

Carried from the standing rules, and worth restating because the pressure to cross these lines is highest when a deadline is close.

- Record a REC-07 approval. It is a signature.
- Grant itself standing, or approve as someone else.
- Rewrite issued content to make a check pass.
- Mark an unexecuted test as passed.
- Delete or alter live records, or authorize a real mentor, to unblock itself.
- Decide the meaning of an instruction it was not given. Where the content uses a token no instrument defines, give it no behavior and put it to the founder. **For a capture qualifier, refuse that source's sequence load by name** — per Stage 1.5.4 and T3A-D1-EXEC-CLOSE-001 CL-08. *Resolved conflict: the earlier text said to store such a token as written without behavior, which left D1's "final" silently inert. See Part J, item J-9.*
- Rename anything to make a load or a test fit.
- Delete an unexplained governance record, or relabel it as something understood.

A governance record that does not mean what it says is worse than a missing one, because nobody goes looking for it.

And one thing to report rather than decide: where a fix would change doctrine, evidence meaning, participant rights or authority, record it and keep building everything that does not depend on it. A report never blocks a build, and a build never rules on a question that is not its.

### Appendix 4 — Rebuilding the database from the migrations

Done for real on 2026-09-20, when the hosting provider took the original project down and it became unreachable. Written from that, not from theory.

What survives a lost project and what does not.

| Survives | Does not |
|---|---|
| Every table, function, policy and trigger | Every auth.users account |
| The forty sources, their versions and hashes | Every profile row keyed to one |
| The registers, the acceptance register and its evidence | Oversight standing grants |

The migrations are the schema and the content — the load is itself a migration. So a rebuild restores the content without anyone re-extracting it. What it cannot restore is anyone's ability to sign in.

Check what was in there before assuming the worst. For D1 the evidence tables were empty — no observation records, no determinations, no reports, no approvals — so nothing a participant did was lost. Find that out before telling anyone what was lost.

The replay. Apply every migration in filename order, each one as a single transaction, and stop on the first failure rather than pressing on. A migration that fails leaves a cascade behind it, and a list of thirty-six failures is one problem wearing thirty-six masks.

Four things that will stop a replay, all of them met on the first run.

- pgcrypto is not installed by any migration. The original had it out-of-band. digest() is called unqualified from files that set search_path = public, so create extension pgcrypto with schema extensions is not enough on its own — check where it landed and what the calling code can see.
- ALTER TYPE … ADD VALUE then using that value in the same transaction. PostgreSQL refuses. Commit the ALTER TYPE statements first, then the rest of the file.
- Superseded drafts that never ran anywhere. Two files in this repo are competing versions of a migration that a later file replaced (002_complete_schema.sql, 20260130_platform_updates.sql). They fail because they never applied originally either. Skip them, and write down which and why — a silent skip is indistinguishable from a bug.
- Files ordered by name, not by dependency. The content load sorted before the migration creating the tables it loads into. Because a migration is one transaction, that took the forty sources down with it. Split the dependent sections into a file that sorts later rather than renaming anything.

Then verify against numbers you decided in advance, not against whatever came out:

```sql
select public.t3a_d1_serving_readiness();
select * from public.t3a_d1_source_hash_integrity();
```
For D1: 40 sources loaded, 40 carrying a hash, 0 approved, hash_matches_verbatim = 40, mismatched = '', and zero British spellings among standing versions. sources_approved = 0 is the correct answer, not a shortfall — see Stage 3.

Afterwards, and this is the part that looks finished but is not:

- Repoint the application (.env, supabase/config.toml) and search the repo for the old project reference. A script here had it hardcoded as a fallback and would have gone on querying a host that no longer answers.
- Re-create the accounts. They are gone, including the founder's.
- Re-grant oversight standing. Until that is done every approval screen returns APPROVER_LACKS_STANDING, and Appendix 1 applies in full — including granting it to the account the person actually signs in with.

### Appendix 5 — Writing a correction instrument

For whoever issues the next one. D1 took four, and the later ones were markedly easier to execute than the earlier ones for reasons worth copying.

What made an instruction executable:

- Say what is withdrawn, per scope. Not "this no longer applies".
- State the order, and say why the order matters. "Redefine, then load, then run — because the new fixture needs loaded content" was worth more than any single instruction in it.
- Give the fixed translation table. Any mapping the build would otherwise infer.
- Name the expected numbers, itemized. "Twenty-three: three demonstration, ten Stage 1, ten Stage 2" catches a wrong mix that a bare total passes.
- Say which counts are scoped to current versions, because a whole-table count will be larger and that is not a failure.
- State precedence. "Where this differs from an earlier correction, this governs."
- Say what must NOT happen, by name. The instruction not to run the Stage 2 parser on Stage 4, and not to search one particular source for a script, each prevented a specific wrong outcome.

What made an instruction unexecutable:

- A test that cannot pass as written. D1 had one asking for zero failures across all forty sources, where three had to fail because failing was the finding. The build recorded it as unachievable and proposed the claim underneath it, and the founder restated it. That is the right loop, and it costs a round trip — so check a test against the live state before signing it.
- Asking for prose to be amended. See Stage 5.4.
- A signature block left blank. Everything else can be built; that cannot be worked around, and should not be.

### Appendix 6 — The eight questions worth asking before declaring done

Each one comes from something that was declared done on D1 and was not.

1. What would make this test fail? If the answer is "nothing, the subject is empty", it is not a test.
2. Is the fixture pinned to a version that is still current?
3. Does anything read this fact a second way? Two readers of one fact will disagree eventually, and the wrong one will be the one someone reads.
4. Does this constraint do what the note beside it says?
5. If I fixed this, what else moved? Measured, before committing.
6. Is this record complete, or only complete for the successes?
7. Was this proved against the route, or against the interface?
8. Did I report a content fault that is actually mine? On D1 the answer was yes four times out of five.

---

## Approval

&nbsp;

**Developer vetting** — Name: ______________________  Date: ______________

**Founder approval** — Name: ______________________  Date: ______________

---

*Artificial intelligence tools were used in the research, synthesis, drafting, structuring, and language refinement of this document. All governing decisions, doctrine, and approvals are those of The 3rd Academy Inc.*
