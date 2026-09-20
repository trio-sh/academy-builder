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

## Stage 0 — Before anything is loaded

**0.1 The issued document.** One document per dimension, carrying the
sources, the question objects, the capture sets and lines, the branch
rules, the statement library and the language templates. D1's was
`T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1.0`.

**0.2 Nothing is transcribed.** Content is parsed from the issued
document by a script, never retyped. Transcription introduces silent
drift that no test catches, because the test and the typo agree.

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
new version does **not** inherit the old approval. Re-approve it.

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
| `SOURCE_VERSION_ALREADY_APPROVED` | Already standing | Nothing |
| `SOURCE_WITHOUT_REC_07_INTO_REAL_RUN` | Serving an unapproved source | Stage 3 |

Every refusal is returned rather than raised where it must also be
logged — a raised refusal rolls back its own log row, so the log would be
empty exactly when it mattered.

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

A governance record that does not mean what it says is worse than a
missing one, because nobody goes looking for it.

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
