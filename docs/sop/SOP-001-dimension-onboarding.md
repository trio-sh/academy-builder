# SOP-001 — Taking a dimension from issued scripts to serving

**Purpose.** One repeatable procedure for putting a dimension's sources
into the platform. Written from what was actually done for D1, so that
D2 and everything after it is a replication rather than a rediscovery.

**Who this is for.** The founder or an oversight administrator doing the
approvals, and whoever is running the load.

**The shape of it.** Content is loaded mechanically and refuses to serve.
A person with standing then approves it, one source at a time. Those two
halves never merge: a build can load and hash, and only a person can say
a text is fit to put in front of a participant.

---

## Revision note — read this first if you used the earlier version

The first version of this procedure was written when D1 reached 24 of 30
acceptance tests. Getting from there to 30 of 30 took four correction
instruments — CORR-002, CORR-003, CORR-004 and REAPP-001 — and a signed
ruling on how approvals are counted. **Almost every one of those
corrections fixed something the build had got confidently wrong, not
something the issued content had got wrong.** That is the single most
useful fact in this document.

The pattern, stated once because it recurs in every stage below: the
failure was never a missing check. It was a check that measured the wrong
thing and passed. A parser that read the wrong block and produced clean
output. A test that went green because the thing it pointed at was empty.
An index that enforced something stricter than its own note said it did.
A report that counted rows where it should have counted standing.

So the discipline this procedure asks for is not more checking. It is
**checking that each check can actually fail**, and measuring before
changing rather than after.

New in this revision: Stage 1.4 (the five parse faults), Stage 2A
(correcting loaded content), Stage 3's standing rules, Stage 4's test
discipline, Stage 5 (phase order), and Appendices E and F.

---

## Stage 0 — Before anything is loaded

**0.1 The issued document.** One document per dimension, carrying the
sources, the question objects, the capture sets and lines, the branch
rules, the statement library and the language templates. D1's was
`T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1.0`.

**0.1a A dimension cannot start without an issued Execution Edition.**
Not a draft, not a working document. D2 is blocked on exactly this and no
amount of build work changes that.

**0.2 Nothing is transcribed.** Content is parsed from the issued
document by a script, never retyped. Transcription introduces silent
drift that no test catches, because the test and the typo agree.

**0.2a Keep the issued document where the build can reach it, and keep
it.** D1's was an email attachment. By the time Section 6 needed to parse
the Stage 2 scripts it was no longer on disk, and the parse had to read
the *stored* text instead. That turned out to be the better input — see
Stage 1.5 — but it was luck, not design. Commit the issued document, or
record exactly where it lives.

**0.3 Check who holds standing before you start.**

```sql
select holder_name, holder_email, granted_at, revoked_at
from t3a_oversight_holder where revoked_at is null;
```

If the list is empty, nobody can approve anything and Stage 3 will fail.
See **Appendix A**.

---

## Stage 1 — Extract

**1.1** Adapt the extractor for the dimension. D1's is
`scripts/extract-d1-content.mjs`. It reads the issued document and emits
a migration.

**1.2 The extraction rules that were learned the hard way on D1** —
carry them forward, they are not D1-specific:

- **A field stated twice is normal.** Sources state some fields in their
  own sheet *and* again inside a question-applicability table. Taking the
  last match corrupted 2 of 40 sources; taking the first corrupted 25.
  The rule that works: discard values beginning with a question code, and
  among the rest take the fullest.
- **Measure the extraction, do not eyeball it.** Count how many values
  match the shape the sources themselves use (`M1 …`, `A1 …`, `AS1 …`,
  `R-a …`). D1 landed at 40/40, 40/40, 39/40, 39/40. Two fields no rule
  could recover were left alone and recorded, not guessed.
- **Spelling and house style are content decisions.** D1 had five British
  spellings that the build's vocabulary lock rejects. The developer did
  not silently rewrite them; the conflict was recorded and the founder
  decided. Apply the decision by name in the extractor so a regeneration
  cannot undo it.

**1.3** Regenerate and diff against the previous output before applying
anything. A regeneration that changes more than you expected is telling
you something.

### 1.4 The five parse faults, and how each one hides

Every one of these produced clean-looking output. None of them announced
itself. Four were reported to the founder as content faults before
turning out to be the parser's.

**1.4.1 `$` with the `/m` flag does not mean end of string.** It matches
the end of every *line*. A lookahead written to find the end of a value
matched the first line break instead and silently truncated. This was
sent to the founder as a content defect. It was not. **Fix:** parse
logical units — a bullet and its indented continuations are one item —
rather than matching across raw lines.

**1.4.2 "Take the fullest value" picks the wrong block.** The fullest run
of text near a source was a *definitional* section that describes fields
generically rather than populating them, so the parser confidently loaded
definitions as values. **Fix:** score candidate blocks on how many
*distinct* expected field names they contain, not on length.

**1.4.3 The last source in a bank has no terminator.** No following
heading closes it, so the next bank's common section runs on into it.
On D1 this hit exactly three sources — one per bank — and all three had
to be superseded and re-approved. **Fix:** a source's sheet is the
contiguous run carrying the most distinct sheet field names, terminating
before any following common section. And when three sources fail the same
way, check whether they share a *position* before assuming they share a
defect.

**1.4.4 Conversion splits field names across a boundary.** A value ends
with a short lowercase fragment that is actually the head of the *next*
field's name — `relevant_conduct` ending `".ir"` because `irrelevant_conduct`
followed. Seven occurrences in D1's file. **Fix:** where two adjacent
items carry the same field name and the first ends in a short lowercase
fragment that completes a known field name, move the fragment.

**1.4.5 A marker can be split by a soft wrap.** On one source the words
"The script" straddled a line break, so a search on raw text found
nothing and that source yielded zero beats — silently, as an empty
result rather than an error. **Fix: collapse all whitespace, line breaks
included, to single spaces BEFORE searching for any marker.** Then search.
This applies to end boundaries as well as start markers.

### 1.5 Four rules that would have prevented most of the above

**1.5.1 Measure the blast radius before implementing a fix, not after.**
Before applying the split-field repair, D1 scanned all forty live source
sheets for the pattern and found exactly one hit — on a source already
withdrawn. So one version was superseded instead of several, and no
standing approval was touched. Doing that scan afterwards is how you
discover you have voided thirty-seven approvals.

**1.5.2 Parse the approved text, not a copy of the document.** Section 6
parsed each source's *stored* verbatim — the text carrying a standing
approval — rather than a file. A parse against a file cannot tell you the
register has since superseded that text. This is Stage 4's stale-fixture
rule applied to the input.

**1.5.3 A block has a hard end boundary. Find it and stop.** D1's script
tables end at `**Question applicability**`, and the table *after* that
boundary also contains lines beginning with a beat code. A parser reading
past it counted nine beats instead of seven — and the resulting count
error described the symptom, not the cause.

**1.5.4 Keep the set of recognized tokens closed, and refuse outside it.**
Where a parser met a qualifier it did not know, it refused that source by
name rather than guessing. Guessing there truncates an approved line. A
refusal you can read beats output you cannot check.

### 1.6 Superseded label sets

Content authored before a register was split still uses the old labels.
D1's script tables bound eight capture sets; the register holds thirteen.
Three of the eight do not exist any more.

**Translate through a fixed table written down in the instrument, and
check the result against the register.** Two rules:

- **The translation is not a judgment call.** If you are inferring a
  mapping, stop and get it stated.
- **Make the register check structural where you can.** A foreign key to
  the register table means an untranslated label *cannot be stored*,
  which is stronger than a check that has to be remembered.

**Translation produces candidates. Applicability still governs what is
served.** Where a translated item is not served by that source, it is
dropped at serve time, not refused at load time — and its absence is not
a missing state.

---

## Stage 2 — Load and hash

**2.1 Load as content.** Apply the generated migration. Every source
lands with `operational_state = not_loaded` and **refuses to serve**.
That refusal is the control, not a bug.

**2.2 Assign source-version hashes.**

```sql
-- sha256 over each version's own verbatim body
select * from t3a_d1_source_hash_integrity();
```

Expect `standing_versions = hash_matches_verbatim` and `mismatched = ''`.

**2.3 A loaded body is immutable.** Any correction — spelling, a
re-extracted field, anything — **supersedes** rather than edits. The
original stays in history. `t3a_d1_content_version_immutable` enforces
this; do not work around it.

**2.4 Confirm where it stands.**

```sql
select * from t3a_d1_serving_readiness();
```

You want: sources loaded = N, carrying a hash = N, approved = 0.

**2.5 Content that is not the source text does not go in the body.** A
mentor script, a beat sequence, a capture binding — these live in their
own tables keyed by source identifier. The body is immutable once
approved, so putting a script into it would mean superseding a version
every time a script loads, and superseding voids the approval. D1 got
this right structurally and then failed to *read* the table — see 4.5.

---

## Stage 2A — Correcting content that is already loaded

This stage did not exist in the first version of this procedure, and
three quarters of D1's correction work happened in it.

**2A.1 Supersede, never edit.** Restated here because it is the rule
everything else in this stage follows from.

**2A.2 An approval does not survive superseding.** It names an exact
version. Correct a source and its approval is attached to a version that
is no longer live, so nothing is servable until something is done about
it. Expect this; it is not a fault.

**2A.3 There are exactly two honest things to do about it, and they are
not equivalent.**

| | What it asserts | When it is available |
|---|---|---|
| **Carry the approval forward** | The approved *text* did not change; only its parse did | Only where that can be demonstrated |
| **Withdraw and re-approve** | The text changed, so the approval must be given again | Always |

**A carry-forward is a claim, and it must be checkable.** Record, per
carried approval: the version carried from, the stated basis, and the
result of an assertion that the new text contains the old. Where the
assertion fails, the approval is **not** carried — it is withdrawn, and
the source waits for a person.

**2A.4 A carry-forward is not a build decision.** It writes an approval
row for a version no human inspected. Put the alternatives to the
founder and record the ruling.

**2A.5 Provenance must be complete or it lies by omission.** D1 carried
forty approvals and wrote provenance for the thirty-seven that passed the
assertion. The three that failed were withdrawn and never annotated — so
the standing view read "not carried forward" for all three, which was
true of none of them. **A record that is present for the successes and
absent for the failures reads as a clean record.** Write the row for the
failures too, with the failure in it.

**2A.6 A withdrawal must survive superseding.** Otherwise superseding a
withdrawn source silently makes it servable again — a correction becoming
a back door to approval. D1 hit this exactly: a repair to a withdrawn
source made it servable, and the count was reported as clean before the
fault was found. Guard it on the *table*, not in the route: the route did
not refuse it and something reached the table anyway.

**2A.7 A signed re-approval goes somewhere a build cannot reach.** Once a
source is withdrawn, no route may approve it again until a row naming the
version, the basis, the approver as signed and the date exists. That
table ships empty. It is the mechanism that makes a signature a
precondition rather than a courtesy.

---

## Stage 3 — Approve (the founder act)

**3.1** Sign in as an account holding oversight standing.

**3.2** Go to `/dashboard/mentor/source-approval`.

**3.3** Read a source. Then approve that version.

**What an approval asserts.** That you, by name, hold *this exact text*
fit to put in front of a participant in a real observation. It is
recorded against the version hash.

**Why there is no approve-all button.** A control that approves forty at
once approves forty unread. This is deliberate and will not be added.

**3.4** You do not need to approve all of them. One approved source opens
the serving path.

**3.5 Withdrawing.** Withdrawal is a new record, never an erasure. The
history shows the source was once approved and by whom.

**3.6 After a correction.** A corrected source is a new version, and a
new version does **not** inherit the old approval. Re-approve it — and
read Stage 2A first if the correction was the build's rather than the
content's.

### 3.7 Standing is the latest status. It is never the existence of a row.

The approval table is insert-only: a withdrawal is a later row, and the
approved row it withdraws stays where it is forever. So:

> **An approved row existing tells you nothing. Only the latest row for
> that version tells you anything.**

Four separate D1 faults were this one mistake wearing different clothes.

**3.7.1 Define it once, and make everything read that one definition.**
Not "implement it the same way in two places" — *read the same
definition*. D1's enforcement and its read were written separately, and
they disagreed for two days.

**3.7.2 A raw count of approved rows is not a count of approvals.** After
a withdraw-and-reapprove a version holds two approved rows and one
standing approval. D1's readiness report counted rows: it reported forty
servable and nothing blocked while the register correctly reported three
unservable. Nothing was served wrongly — the serving path used the right
reader — but the number anyone would glance at was wrong.

**3.7.3 Enforce the invariant you actually mean.** D1's unique index was
`UNIQUE (source_id, version_id) WHERE status = 'approved'`. Its own
migration note said it meant "one *standing* approval per version". On an
insert-only table it meant "one approved row per version **ever**", so it
refused every re-approval after a withdrawal. A partial index cannot
express "latest status". **Read the note next to a constraint and check
the constraint does what the note claims.**

**3.7.4 Replacing a race-safe control with a check loses the race
safety.** The index gave per-version serialization for free. A
before-insert check does not, unless it takes a lock scoped to the version
*before* reading standing. Otherwise two concurrent approvals both read
"not approved" and both succeed.

**3.7.5 When you change what counts as an approval, find every reader.**
Search for every direct test of the status value and route each one
through the one definition. Two of D1's four readers were wrong, and one
was wrong in production.

### 3.8 An approval you cannot account for stays, flagged

D1 found an approval row nothing could explain: no migration writes it,
no trigger writes it, no seed script writes it, and it postdates the only
migration that could have produced its timestamp. It was **kept
unaltered** and logged as an unaccounted finding.

Do not delete it. Do not relabel it as something you do understand. Do
not let a later approval bury it. An unexplained governance record with a
flag on it is evidence; the same record quietly tidied is not.

---

## Stage 4 — Verify

**4.1** Re-run readiness; `approved` should have moved.

**4.2** Re-run the acceptance suite for the dimension and record the
evidence. A test specification is not a passed test: record the actual
result, the build version, the date and the tester.

**4.3** Where a test cannot pass because a governing input is missing,
**record it as a conflict**. Do not resolve it by hiding a field, adding
free text, introducing a default, combining controls, or reducing a live
view.

### 4.4 A green suite against stale content is worse than a red one

D1 had thirteen browser tests passing against a fixture pinned to a
version that had been superseded. A red suite sends you to look. A green
one tells you to stop looking.

**So: make the fixture refuse.** D1's seed now refuses to build a fixture
pinned to a superseded version rather than trusting whoever runs it to
notice. A precondition that depends on someone remembering is not a
precondition.

### 4.5 Ask what makes each test fail, not whether it passes

Three D1 tests passed *because* no sequence was loaded. They were not
testing what they claimed:

- One was meant to test a missing runtime **timestamp** and was passing on
  a missing **definition** — a different condition. It would have gone
  green on a source with no script at all, and red the moment one loaded.
- One asserted a refusal on a source with no loaded sequence. After the
  load, that fixture existed nowhere.
- One asserted a count that the load changed.

**Worse, and this is the finding worth carrying furthest:** re-running
the browser set after the load revealed the cockpit **was never reading
the sequence table at all**. It rendered a body field no source version
carries, so the script pane had shown an empty script for every source
since it was built, while a hundred and forty beats sat in the table
unread. Nothing looked broken because nothing had ever worked. The same
empty list drove a beat selector, so a mentor could not record a variance
at the beat it happened.

Fourteen green tests over a pane that never worked. **A test whose
subject is empty passes for free.** Before trusting a passing test, ask
what it would take to make it fail — and if the answer is "nothing,
because there is nothing there", it is not a test yet.

**When you load content that a surface renders, re-run that surface's
tests.** A pass on an empty pane is not evidence for a populated one.

### 4.6 Prove refusals server-side

Any holding state, refusal or restriction is proved by requesting the
route directly, not by observing that the interface hides a control. A
hidden button is a design choice; a refused request is a control.

### 4.7 Assert the blast radius in the same transaction as the change

Where a load writes to one place, snapshot everything it must *not*
change, and assert it afterwards **before committing**. D1's Stage 2 parse
hashes every source sheet before parsing and aborts if any moved — which
would mean the parser is reading script text as sheet content. Checking
afterwards means reporting damage; checking inside means not doing it.

---

## Stage 5 — Order of operations

Most of what went wrong on D1 late was order, not substance.

**5.1 Where loading content changes what existing tests mean, run three
phases and do not merge them:**

1. **Redefine** the affected tests. Change the definitions only. Do not
   run them.
2. **Load** the content.
3. **Run** the suite.

Phase 3 before phase 2 cannot work — the new fixtures need the loaded
content. Phase 2 before phase 1 leaves the old definitions to fail
against the new state, and a register that drops for a known reason is
indistinguishable from one that drops for an unknown one.

**5.2 A verifier runs before the thing it guards, as its own step.** Not
as a side effect of that thing. A precondition that only runs as part of
what it protects is not a precondition.

**5.3 Withdraw an instruction per scope, not in bulk.** D1 had one
instruction covering three stages, and each stage had a different true
position. Withdrawing it wholesale would have misstated two of them.

### 5.4 A register that is not data cannot be amended

Four D1 instructions asked for a test to be redefined or a register entry
amended. None of those four existed as anything editable — they were
sentences in old migration comments and inside a note attached to a past
test result. **The only way to amend a sentence in a historical record is
to rewrite history, which you must not do.**

So: **anything an instrument will later amend must be a row, not prose.**
Test definitions, conflict-register entries, per-scope claims. Each row
records what it used to say, what it says now, and why it changed. Hold
outcomes in a separate table from definitions, so a passing test can
never be recorded by editing the specification of the test.

---

## Appendix A — Granting oversight standing

Standing is a **named person**, not a flag on an account.

```sql
insert into t3a_oversight_holder
  (holder_id, holder_name, holder_email, granted_by, granted_at)
select p.id, btrim(p.first_name||' '||p.last_name), p.email, <granter>, now()
from profiles p where p.email = '<the account they actually sign in with>';
```

**Three things that went wrong doing this for D1. All three are avoidable.**

1. **Grant it to the account the person actually signs in with.** Not the
   one whose name you recognize. The first grant went to an unused
   account and the person hit `APPROVER_LACKS_STANDING` on a live screen.
2. **Take the name from the account's own profile, never from a
   conversation.** A name typed by hand can be the right name on the
   wrong record.
3. **Check the profile has a name at all.** The guard verifies the email
   belongs to the account; it does **not** verify the name, so an account
   with no recorded name will accept any name you type.

**Revoking** requires a stated basis and preserves the row:

```sql
update t3a_oversight_holder
   set revoked_at = now(), revocation_basis = '<why>'
 where holder_id = '<id>' and revoked_at is null;
```

---

## Appendix B — Refusal codes you will meet

| Code | Means | Do |
|---|---|---|
| `APPROVER_LACKS_STANDING` | Signed-in account holds no oversight record | Appendix A, against **this** account |
| `NO_APPROVER_IDENTIFIED` | No authenticated session | Sign in |
| `SOURCE_VERSION_CARRIES_NO_HASH` | Stage 2.2 not done | Assign hashes |
| `SOURCE_VERSION_SUPERSEDED` | Approving an old version | Approve the standing one |
| `VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE` | Mismatched pair | Check the ids |
| `SOURCE_VERSION_ALREADY_APPROVED` | The version's **standing** approval is already `approved` | Nothing. To replace it, withdraw first — the withdrawal stays in history |
| `SOURCE_WITHOUT_REC_07_INTO_REAL_RUN` | Serving an unapproved source | Stage 3 |
| `SOURCE_APPROVAL_APPEND_ONLY` | An update or delete on an approval | Record a withdrawal instead |
| `WITHDRAWAL_SURVIVES_SUPERSEDE` | Approving a source withdrawn under a correction | Stage 2A.7 — a signed re-approval must be recorded first |
| `BEAT_SCRIPT_NOT_LOADED` | The source has no loaded sequence | Load it. This is a missing **definition** |
| `BEAT_TIMESTAMP_MISSING` | The sequence is loaded; the session recorded no timestamp for that beat | Nothing to fix. This is a missing **runtime record**, and the refusal is correct |
| `REFERENCE_BEAT_NOT_STATED_AS_BEAT` | The decision point is stated in words, not as a beat code | Nothing. Permanent property of that source |

**The last three are three different conditions and must never be
accepted interchangeably.** A test that accepts any of them passes on all
of them, which is how D1's timing test spent weeks not testing timing.

Every refusal is returned rather than raised where it must also be
logged — a raised refusal rolls back its own log row, so the log would be
empty exactly when it mattered. Where a refusal must both abort and be
recorded, split it: the route returns a code and logs, and a table guard
raises as the backstop for anything that bypasses the route.

---

## Appendix C — What a build may never do

Carried from the standing rules, and worth restating because the
pressure to cross these lines is highest when a deadline is close.

- Record a REC-07 approval. It is a signature.
- Grant itself standing, or approve as someone else.
- Rewrite issued content to make a check pass.
- Mark an unexecuted test as passed.
- Delete or alter live records, or authorize a real mentor, to unblock
  itself.
- **Decide the meaning of an instruction it was not given.** Where the
  content uses a token no instrument defines, store it as written, give it
  no behaviour, and put it to the founder.
- **Rename anything** to make a load or a test fit.
- **Delete an unexplained governance record**, or relabel it as something
  understood.

A governance record that does not mean what it says is worse than a
missing one, because nobody goes looking for it.

**And one thing to report rather than decide:** where a fix would change
doctrine, evidence meaning, participant rights or authority, record it
and keep building everything that does not depend on it. A report never
blocks a build, and a build never rules on a question that is not its.

---

## Appendix D — Rebuilding the database from the migrations

Done for real on 2026-09-20, when the hosting provider took the original
project down and it became unreachable. Written from that, not from
theory.

**What survives a lost project and what does not.**

| Survives | Does not |
|---|---|
| Every table, function, policy and trigger | Every `auth.users` account |
| The forty sources, their versions and hashes | Every profile row keyed to one |
| The registers, the acceptance register and its evidence | Oversight standing grants |

The migrations are the schema *and* the content — the load is itself a
migration. So a rebuild restores the content without anyone re-extracting
it. What it cannot restore is anyone's ability to sign in.

**Check what was in there before assuming the worst.** For D1 the
evidence tables were empty — no observation records, no determinations,
no reports, no approvals — so nothing a participant did was lost. Find
that out before telling anyone what was lost.

**The replay.** Apply every migration in filename order, each one as a
single transaction, and stop on the first failure rather than pressing on.
A migration that fails leaves a cascade behind it, and a list of thirty-six
failures is one problem wearing thirty-six masks.

**Four things that will stop a replay, all of them met on the first run.**

1. **pgcrypto is not installed by any migration.** The original had it
   out-of-band. `digest()` is called unqualified from files that set
   `search_path = public`, so `create extension pgcrypto with schema
   extensions` is not enough on its own — check where it landed and what
   the calling code can see.
2. **`ALTER TYPE … ADD VALUE` then using that value in the same
   transaction.** PostgreSQL refuses. Commit the `ALTER TYPE` statements
   first, then the rest of the file.
3. **Superseded drafts that never ran anywhere.** Two files in this repo
   are competing versions of a migration that a later file replaced
   (`002_complete_schema.sql`, `20260130_platform_updates.sql`). They fail
   because they never applied originally either. Skip them, and write down
   which and why — a silent skip is indistinguishable from a bug.
4. **Files ordered by name, not by dependency.** The content load sorted
   before the migration creating the tables it loads into. Because a
   migration is one transaction, that took the forty sources down with it.
   Split the dependent sections into a file that sorts later rather than
   renaming anything.

**Then verify against numbers you decided in advance**, not against
whatever came out:

```sql
select public.t3a_d1_serving_readiness();
select * from public.t3a_d1_source_hash_integrity();
```

For D1: 40 sources loaded, 40 carrying a hash, 0 approved,
`hash_matches_verbatim = 40`, `mismatched = ''`, and zero British
spellings among standing versions. `sources_approved = 0` is the correct
answer, not a shortfall — see Stage 3.

**Afterwards, and this is the part that looks finished but is not:**

- Repoint the application (`.env`, `supabase/config.toml`) and search the
  repo for the old project reference. A script here had it hardcoded as a
  fallback and would have gone on querying a host that no longer answers.
- Re-create the accounts. They are gone, including the founder's.
- **Re-grant oversight standing.** Until that is done every approval
  screen returns `APPROVER_LACKS_STANDING`, and Appendix A applies in
  full — including granting it to the account the person actually signs
  in with.

---

## Appendix E — Writing a correction instrument

For whoever issues the next one. D1 took four, and the later ones were
markedly easier to execute than the earlier ones for reasons worth
copying.

**What made an instruction executable:**

- **Say what is withdrawn, per scope.** Not "this no longer applies".
- **State the order, and say why the order matters.** "Redefine, then
  load, then run — because the new fixture needs loaded content" was
  worth more than any single instruction in it.
- **Give the fixed translation table.** Any mapping the build would
  otherwise infer.
- **Name the expected numbers, itemized.** "Twenty-three: three
  demonstration, ten Stage 1, ten Stage 2" catches a wrong mix that a
  bare total passes.
- **Say which counts are scoped to current versions**, because a
  whole-table count will be larger and that is not a failure.
- **State precedence.** "Where this differs from an earlier correction,
  this governs."
- **Say what must NOT happen**, by name. The instruction not to run the
  Stage 2 parser on Stage 4, and not to search one particular source for a
  script, each prevented a specific wrong outcome.

**What made an instruction unexecutable:**

- **A test that cannot pass as written.** D1 had one asking for zero
  failures across all forty sources, where three had to fail because
  failing was the finding. The build recorded it as unachievable and
  proposed the claim underneath it, and the founder restated it. That is
  the right loop, and it costs a round trip — so check a test against the
  live state before signing it.
- **Asking for prose to be amended.** See 5.4.
- **A signature block left blank.** Everything else can be built; that
  cannot be worked around, and should not be.

---

## Appendix F — The eight questions worth asking before declaring done

Each one comes from something that was declared done on D1 and was not.

1. **What would make this test fail?** If the answer is "nothing, the
   subject is empty", it is not a test.
2. **Is the fixture pinned to a version that is still current?**
3. **Does anything read this fact a second way?** Two readers of one fact
   will disagree eventually, and the wrong one will be the one someone
   reads.
4. **Does this constraint do what the note beside it says?**
5. **If I fixed this, what else moved?** Measured, before committing.
6. **Is this record complete, or only complete for the successes?**
7. **Was this proved against the route, or against the interface?**
8. **Did I report a content fault that is actually mine?** On D1 the
   answer was yes four times out of five.
