# PLC-005 Note 4 — Oversight Administrator Role: report and build

**Reference** T3A-DEV-PLC-005-A, Note 4
**Produced** 13 September 2026
**Status** Steps 1–5 complete and proved. Step 6 drafted and held.

---

## 1. Step 1 — what exists today

Note 4 says the answer to one question determines everything else:
*"State plainly whether any existing administrative account can alter
observation content, corrections or a report. That answer determines
whether this note is building a new capability or closing an open one."*

**It is closing an open one.**

### What administrative levels exist

There is one, and it is not a level. `public.is_admin()` is a single
boolean:

```sql
SELECT EXISTS (SELECT 1 FROM public.profiles
               WHERE id = auth.uid() AND role = 'admin');
```

There is no tiering, no named administrator role, no holder table, and no
record of appointment anywhere in the schema. Administrative standing is
one string in one column on `public.profiles`.

### Who holds one

**Nobody.** Live counts at the time of this report:

| role | accounts |
|---|---|
| candidate | 6 |
| employer | 1 |
| mentor | 1 |
| admin | **0** |

### How one would have been created

Until PLC-005 Note 1 landed, by the account itself. `profiles_update_own`
carried a NULL `WITH CHECK`, so PostgreSQL fell back to `USING` as the
write test and any authenticated session could set its own row to
`role = 'admin'`. Note 1 closed that. Appointment is now a service-context
act via `t3a_grant_role`, and it leaves a row in `t3a_role_grant_attempt`.

So the answer to *how each was created* is: none were, and the route by
which one could have appointed itself has already been shut.

### Can an administrative account alter observation content?

**Yes — it could.** 53 write policies in `public` name `is_admin()`. Most
concern account and profile rows and are not at issue here. Three concern
the record itself, and on each, administrative standing carried authority
with `is_admin()` in both `USING` and `WITH CHECK`:

| Table | Policy | Command |
|---|---|---|
| `t3a_observation_record` | `t3a_observation_record_write_admin` | ALL |
| `t3a_d1_ber_report` | `t3a_d1_ber_report_write_admin` | ALL |
| `t3a_correction_case` | `t3a_correction_case_update_admin` | UPDATE |

That is alteration, deletion and authorship of observation content,
corrections and Behavioral Evidence Reports — the three things item (c)
exists to make impossible. It was never exercised, because no account ever
held the role. It was nonetheless available, and the note is right that
its availability is the problem: the counter-question in a dispute is
whether an administrator *could* have altered the record.

**Conflict with this instruction, recorded as Step 1 requires:** what
existed conflicted with item (c) directly. The most restrictive behavior
available was taken — see §3.

## 2. What was built

| Item | Built |
|---|---|
| (a) named role, individual credentials | `t3a_oversight_holder`, one row per person, guarded |
| (b) full read, with exclusions | `t3a_oversight_read_observation`, `t3a_oversight_read_messages`, `t3a_oversight_read_exclusions` |
| (c) visibility without mutability | `t3a_oversight_protected_surface` + `t3a_oversight_refuse_mutation` on 25 tables |
| (d) enumerated, closed write authority | `t3a_oversight_action_catalogue`, 7 actions, one function each |
| (e) append-only log | `t3a_oversight_log`, hash-chained, `t3a_oversight_log_intact()` |
| (f) disclosure | `t3a_oversight_disclosure`, drafted, `counsel_cleared = false` |

**File order note.** Step 3 asks that the log come before the access it
records. In the migration the log is created before the role predicate is
usable and before any read route exists, and no holder row can exist until
the whole migration has applied — so no read under this role is possible
before the log that records it exists.

## 3. Step 2 — how mutability was closed

Two mechanisms, deliberately not one.

**The trigger is the enforcement.** `t3a_oversight_refuse_mutation` is
attached BEFORE INSERT OR UPDATE OR DELETE on all 25 registered tables. It
refuses when `t3a_has_administrative_standing()` is true — which is
`t3a_is_oversight_admin() OR is_admin()`, so the legacy standing is closed
at the same time as the new one, per Step 2's "no administrative route".
This is route-independent: it holds against a policy I might have missed,
a policy written next year, and a `SECURITY DEFINER` function that would
otherwise bypass RLS entirely.

Attachment is by loop over the registry, so a table added to
`t3a_oversight_protected_surface` later cannot be left unguarded by an
oversight in wiring.

**The policy withdrawal is the disclosure.** The three `is_admin()` write
policies above were reissued to demand `t3a_is_service_context()`. This
adds nothing the trigger does not already enforce; it exists so that the
capability is *absent from the policy catalogue* rather than merely
refused at execution time. Anyone auditing what an administrator may write
reads the catalogue, and it should not say the wrong thing.

The 25 protected tables span four categories: observation, determination,
correction, report.

## 4. Step 5 proof — attempting it directly

Per the acceptance criterion, confirmed by attempting each thing rather
than by the absence of a control. Run in a block ending in
`RAISE EXCEPTION`, so nothing committed.

```
generic_address         = OVERSIGHT_SHARED_CREDENTIAL_REFUSED        (a)
mismatched_credential   = OVERSIGHT_CREDENTIAL_NOT_OWNED_BY_NAMED_PERSON (a)
unnamed_holder          = REFUSED (name must identify a person)      (a)
is_oversight_admin      = true
is_service_context      = false

alter_observation       = OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE      (c)
delete_observation      = OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE      (c)
author_observation      = OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE      (c)
alter_report            = OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE      (c)
alter_correction        = OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE      (c)

read_without_basis      = OVERSIGHT_BASIS_REQUIRED                   (e)
read_before_notice      = OVERSIGHT_PRIVACY_NOTICE_NOT_EFFECTIVE     (d, f)
unenumerated_action     = OVERSIGHT_ACTION_NOT_ENUMERATED            (d)
action_without_basis    = OVERSIGHT_BASIS_REQUIRED                   (e)

suspend_applied         = true
suspend_logged_by_name  = Ada Oversight / account suspended pending identity confirmation
create_requests_direct  = 1 request row, 0 profiles written          (d)
create_grants_authority = false                                      (d)

alter_log               = OVERSIGHT_LOG_APPEND_ONLY                  (e)
delete_log              = OVERSIGHT_LOG_APPEND_ONLY                  (e)
truncate_log            = OVERSIGHT_LOG_APPEND_ONLY                  (e)
log_chain_intact        = true

enumerated_capabilities = account_create, account_reset_credential,
                          account_restore, account_suspend, assign_mentor,
                          employer_application_approve,
                          employer_application_refuse
```

Assignment prerequisites, proved separately:

```
assign_unauthorized_mentor = OVERSIGHT_MENTOR_NOT_AUTHORIZED
assign_authorized_mentor   = assigned
assignment_logged          = Bea Oversight | assign_mentor | subject … | basis: …
```

Post-test: log rows 0, holders 0, assignments 0, synthetic profiles 0 —
nothing committed. Catalogue holds the 7 enumerated actions and no more.

`enumerated_capabilities` is returned by `t3a_oversight_capabilities()`,
which answers the acceptance criterion asking for the list itself rather
than for selected examples.

### The two tests that are catalogue arguments rather than executions

The query gateway available to this session is itself `SECURITY DEFINER`
and owns these tables, so `SET ROLE` is refused and row level security is
bypassed. Two controls therefore could not be executed and are asserted
from the policy catalogue instead:

```
t3a_oversight_action_catalogue  -> t3a_is_service_context()
t3a_oversight_holder            -> t3a_is_service_context()
t3a_oversight_protected_surface -> t3a_is_service_context()
```

These are the only ALL-policies on the three governing tables, and the
holder session above returned `is_service_context = false`. So the role
cannot extend its own action list, appoint itself or anyone else, or
shorten the protected list. A declarative check read from the catalogue
is conclusive in a way an execution sample would not be, but it is a
different kind of evidence and is labelled as such.

## 5. Design decisions worth stating

**Account creation is a request, not a write.** The first draft of
`t3a_oversight_create_account` inserted a `profiles` row directly. That
was wrong and the database said so — `profiles.id` references
`auth.users`, so the function was fabricating a profile with no identity
behind it. Identity lives in Auth. The function now writes to
`t3a_oversight_account_request` and the governed invitation route
fulfils it, which is what item (d) actually asks for: *"may create the
base object or invoke the governed invitation or application route."*
Verification, invitation and authorization prerequisites continue to
apply because the role never reaches past them.

**Reset touches no credential.** `account_reset_credential` records the
act and initiates nothing inside the database. An administrator can
neither view nor set another person's password, because there is no route
from this role to credential material at all — not a disabled control, an
absent one.

**Content read is off until the notice is effective.**
`t3a_oversight_assert_read` refuses with
`OVERSIGHT_PRIVACY_NOTICE_NOT_EFFECTIVE` unless a
`t3a_oversight_disclosure` row is counsel-cleared and in force. The row
inserted by this migration is `counsel_cleared = false`, so the capability
is built, testable and currently refused — which is the state item (d)'s
closing paragraph asks for.

**Every content read is logged before it returns.** The read functions
write the log entry and then return the content. A read cannot happen
unlogged, because the content is not reachable except through them.

**No generic administrator account can be created.** Enforced three ways:
a unique index on the address, a refusal of 20 generic local-parts
(`admin@`, `support@`, `oversight@`, …), and a check that the address on
the holder row is the address on that person's own profile. A name with
no space in it is refused by constraint.

## 6. One thing that could not be built, reported rather than worked around

**A refused mutation cannot log itself.** The obvious design is for the
refusal trigger to write a log line and then raise. It does not work:
the raise aborts the statement, and the abort rolls back everything the
statement did, including the log insert. PostgreSQL has no autonomous
transaction, so there is no data-layer route to a self-recording refusal.

The alternative is to log refusals from the application layer. That would
put the record of an attempt on the same side of the boundary the log
exists to be independent of, and a log written by the thing it is
watching is the kind of assurance item (e) warns about — *"a log the role
can edit is worse than none, because it looks like assurance."* So it was
not done quietly, and the call was removed from the trigger rather than
left in as code that never commits.

This does not affect what item (e) asks for. Item (e) requires logging
*every action and every read of content*; both are logged, and both are
proved above. A refused attempt is neither. It is recorded here because a
future reader may reasonably expect refusals to appear in the log and
should know why they do not.

## 7. Step 6 — the disclosure, drafted and held

`t3a_oversight_disclosure` holds the draft with `counsel_cleared = false`
and `effective_from = NULL`. **It is not published and not effective**,
and the content-read route is refused while that is true, so the notice
and the capability cannot drift apart.

The draft covers what an administrator can see, what they cannot see, what
they cannot do, what they can do, that every look is recorded by name, and
why the access exists. Its closing line carries `[SECTION REFERENCE —
counsel to place]` rather than an invented cross-reference.

The full text is in the migration and can be read with:

```sql
SELECT draft_text FROM public.t3a_oversight_disclosure;
```

## 8. Acceptance criteria

| Criterion | Status |
|---|---|
| Role can read every record and state, including observation content and messages | **Built**, refused until the notice is effective, per item (d) |
| Cannot alter, delete or author observation, corrections, outcomes or a report, by any route, confirmed by attempting it | **Met** — five attempts, five refusals, §4 |
| Every action and every content read logs holder, time, subject | **Met** |
| Log not alterable by the role that generated it or any other | **Met** — UPDATE, DELETE and TRUNCATE all refused; chain intact |
| Every credential belongs to one named person; no shared credential can be created | **Met** — three refusals, §5 |
| Assignment, employer approval and refusal, account actions each an explicit action with recorded basis | **Met** |
| No capability outside the list, confirmed by listing | **Met** — `t3a_oversight_capabilities()` returns exactly 7 |
| Draft privacy notice exists and is held pending counsel | **Met** — not published |
| Nothing renamed | **Met** |

**Not built here:** the interface half. Every action above is reachable
only as a named function with a required basis; the administrative screens
that call them are separate work, and the note's requirement that each be
*"an explicit action in the interface, never an operation performed
directly on the database"* is half-satisfied — the database route is
closed and the enumerated route exists, but the screens do not yet.

---

**No T3A doctrine, evidence meaning, participant right or authority was
decided by developer assumption.**

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
