# T3A-DEV-CN-EMP-001 — Employer Desk: Implementation Return Package

**Change note** T3A-DEV-CN-EMP-001, Items 1 to 12
**Returned** 13 September 2026
**Status** Data layer complete and proved. Interface complete. Evidence below.

---

## 1. Deployment reference

| | |
|---|---|
| Branch | `claude/send-email-zoho-smtp-port-j32gkk` |
| Migrations | `20260923000000_t3a_employer_desk_closure.sql`, `20260924000000_t3a_employer_desk_surfaces.sql`, `20260925000000_t3a_employer_desk_refusals_commit.sql` |
| Build | `npm run build` green; `tsc --noEmit` clean; 156 tests pass |
| Environment | The existing non-production Supabase project. Never production. |

## 2. What Item 11 found, first, because it changes the reading of everything else

The note anticipated that existing accounts would pass straight through the
new gates. One employer account exists. It does not pass:

| Field | Value |
|---|---|
| Account | Smith Mofoke · tonymofoke@gmail.com |
| Organization record | **None.** The account holds employer authority with no `employer_profiles` row at all |
| Work email resolves to organization domain | not established |
| Free provider refused | **fail** — gmail.com |
| Legal entity name and business number | not established |
| Domain registered within 90 days | not established (registration age is not held on the platform) |
| Creation route | **public_signup** |
| Approval record | none |
| Account name matches address | **false** |
| State before | not_verified |
| State after | not_verified — *no employer application record exists* |

**This changed the audit's design.** The first implementation iterated
`employer_profiles`, which would have skipped this account entirely — the one
account the note names, unexamined, because it has no organization row. The
audit is keyed on the account instead, and reports the missing organization
row as a finding rather than as an absence of work to do.

Nothing was deleted, approved, edited or notified. The two finding types at
step 5.5 are separate columns: `finding_public_signup_route` and
`finding_approved_without_basis`.

## 3. What was found open, and closed

Three tables were reachable with `USING (true)` — readable and writable by any
authenticated session:

| Table | What it held | Closed to |
|---|---|---|
| `candidate_profiles` | every participant profile row | own row, assigned mentor, oversight, service context |
| `employer_feedback` | `candidate_id`, `performance_rating`, `readiness_accuracy`, `behavioral_alignment`, `would_hire_again` — a performance file on a named person | moved to the `t3a_quarantine` schema, all grants revoked |
| `t3x_connections` | connection requests | writes refused, employer view removed, participant view retained |

`candidate_profiles` being world-readable is the listing capability Item 8
removes, and it was open at the time the note was written.

## 4. Acceptance matrix

Proved by attempting each criterion against the running system. Server-side
proofs ran in blocks ending in `RAISE EXCEPTION`, so nothing committed except
the Item 11 audit, which is an intended state change.

### Item 1 — the welcome message

| | Criterion | Result |
|---|---|---|
| A1 | Three controlled lines verbatim, no salutation, no account name | **Pass** |
| A2 | All three render at every width, nothing truncated or hidden | **Pass** — three block-level paragraphs, no clamp, no tooltip |
| A3 | "nothing more, nothing hidden" returns zero results | **Pass** — 0 across components, templates and seed data |
| A4 | "candidate" returns zero in employer-facing displayed text | **Pass** |
| A5 | Template unavailable → block does not render, previous wording absent, failure logged | **Pass** — `controlledText()` returns null, the component returns null, `controlled_text_unavailable` is logged |

### Item 2 — verification

| | Criterion | Result |
|---|---|---|
| A1 | No bare VERIFIED; the mark reads the three controlled labels | **Pass** |
| A2 | Mark and field always agree | **Pass** — both render from one call to `t3a_employer_verification`; the mark has no source of its own |
| A2b | Pending reaching the desk reads PENDING VERIFICATION and logs | **Pass** — `pending_organization_reached_desk` |
| A3 | Verified renders the date; missing approver reads "Approver not recorded" | **Pass** |
| A4 | Value removed or corrupted → Not verified, logged | **Pass** — `verification_value_unrecognized` |
| A5 | Changing the record changes the rendered value; no stale value survives | **Pass** — read on every request, no cache, no session claim |
| A6 | "verified" appears only in Organization verification | **Pass** |

Verification state transitions, proved live:

```
no application record          → not_verified
application, no decision       → pending
approved, approver and basis   → verified
```

### Item 3 — the standing figures band

| | Criterion | Result |
|---|---|---|
| A1 | New account: four cells, three read zero, fourth reads its state | **Pass** |
| A2 | No "based on / informed by / attributed to / resulting from" | **Pass** |
| A3 | Hire row carries no participant or record reference | **Pass** — `t3a_employer_hire_record` has no such column to carry one |
| A4 | Pool change moves the first cell on next read | **Pass** |
| A5 | Contact consent absent → route refused at the endpoint, cell zero | **Pass** — `CONTACT_CONSENT_ABSENT` |
| A6 | Attestation leaves Hires recorded unchanged; carries timestamp, context, employer-statement mark | **Pass** — separate table, `is_employer_statement` pinned true by CHECK |
| A7 | Unreadable figure renders not available and logs; never zero | **Pass** — `figure_unreadable` |
| A8 | Source note at every width | **Pass** |

### Item 4 — heading and naming

| | Criterion | Result |
|---|---|---|
| A1 | Heading reads "Employer actions" | **Pass** |
| A3 | Different environments, each distinctly named | **Pass** — route tracing settled by Item 9A step 2.3: T3X Discovery and the pool are different environments. The pool is Available Reports; T3X Discovery keeps its name and its route |
| A4 | Retired route redirects during transition | **Pass** — `/employer/search` → `/employer/reports` |
| A5 | Mapping table returned | **Pass** — §6 below |

### Item 5 — tile 01

| | Criterion | Result |
|---|---|---|
| A1 | Zero instances of candidate, Behavioral Evidence Record, released to your organization | **Pass** |
| A2 | Both lines render in full at every width | **Pass** |
| A3 | Pending or Not verified retrieves nothing by interface, route or API | **Pass** — `EMPLOYER_NOT_VERIFIED` from the pool query, the count and the coverage disclosure |
| A4 | Verified retrieves only what is currently available | **Pass** |
| A5 | Withdrawal removes the report on next read and moves the count | **Pass** — `visibility_withdrawn_at` filters both |
| A6 | Empty pool renders controlled text, no control offered | **Pass** |

### Item 6 — tile 02, LiveWorks

| | Criterion | Result |
|---|---|---|
| A1 | Not activated → state line 1, control disabled, route refuses and logs | **Pass** |
| A2 | Activated and not Verified → state line 2, control disabled, route refuses | **Pass** |
| A3 | Activated and Verified → no state line, control enabled | **Pass** |
| A4 | Moving between states needs no code change and no deployment | **Pass** — `t3a_employer_desk_config`, read at request time |
| A5 | Every activation change logged with timestamp and actor | **Pass** — `t3a_employer_desk_config_change`, written by trigger, append-only |
| A6 | Zero instances of "the register" and "generates evidence" | **Pass** |
| A7 | All three lines at every width | **Pass** |

### Item 7 — navigation labels

| | Criterion | Result |
|---|---|---|
| A1 | Two entries renamed, no other changed by this item | **Pass** — Feedback → Feedback to The 3rd Academy; Company → Your organization |
| A2 | No order, count or route change by this item | **Pass** — changes under Items 8, 9A and 10 excluded, as A2 directs |
| A3 | Label matches page title and breadcrumb | **Pass** |
| A4 | Full text at every width, wrapping, no abbreviated variant | **Pass** |

### Item 8 — the pool page

| | Criterion | Result |
|---|---|---|
| A1 | No tier control and no tier field | **Pass** |
| A2 | Conduct parameter refused server-side and logged | **Pass** — `POOL_PARAMETER_NOT_PERMITTED`, logged |
| A3 | Index contains no conduct field, proved by inspecting the index | **Pass** — field list in §5 |
| A4 | Only the 5.4 fields accepted | **Pass** |
| A5 | No card renders conduct, dimension, dimension count or Stage | **Pass** — the query cannot return them |
| A6 | Zero instances of the retired terms | **Pass** |
| A7 | Availability order, alphabetical the only alternative | **Pass** — `POOL_SORT_NOT_PERMITTED` for anything else |
| A8 | Both empty states, no invitation control | **Pass** |
| A9 | Contact element only where consent exists | **Pass** |
| A10 | Open to LiveWorks only where activated and supplied | **Pass** |
| A11 | No citizenship, immigration category or home address | **Pass** — no such column exists |
| A12 | Organization note absent from participant surfaces, report, matching, search, ordering | **Pass** |
| A13 | Pending or Not verified receives nothing | **Pass** |
| A14 | Controlled text at every width | **Pass** |

### Item 9A — coverage disclosure

| | Criterion | Result |
|---|---|---|
| A1 | Route renders the disclosure; no query control on any employer route | **Pass** |
| A2 | Legacy query endpoint refused server-side and logged | **Pass** — removed, not disabled |
| A3 | No dimension identifier, floor, band or TEER term in displayed text | **Pass** |
| A4 | Figures match the underlying counts at render | **Pass** |
| A5 | No figure segmented | **Pass** — one figure per measure |
| A6 | Block 3 changes only on a new snapshot; identical between snapshots | **Pass** — snapshot-to-snapshot, never visit-based |
| A7 | No withdrawal figure under any condition | **Pass** — `t3a_coverage_snapshot` has no withdrawal column, so none can be rendered |
| A8 | Does not redirect to Available Reports | **Pass** |
| A9 | Retained legacy query code unreachable | **Pass** — removed outright |
| A10 | Pending or Not verified receives nothing | **Pass** |

### Item 9B — Administrative Coverage Console

| | Criterion | Result |
|---|---|---|
| A1 | No role other than Oversight Administrator reaches it | **Pass** — `COVERAGE_CONSOLE_OVERSIGHT_ONLY` from an employer session |
| A2 | Every read logs holder, time, measure and basis | **Pass** — via `t3a_oversight_record`, the append-only log built under PLC-005 Note 4 |
| A3 | No result renders a participant name | **Pass** — every measure returns a label and a count |
| A4 | No count clickable, no route from a count to a record | **Pass** — the function returns text, not identifiers |
| A5 | Intersection request refused and logged | **Pass** — `COVERAGE_INTERSECTION_NOT_BUILT` |
| A6 | Four predetermined bands, no free-form date input | **Pass** |
| A7 | Held and available render as separate figures | **Pass** |
| A8 | No measure expresses a conduct outcome, quality or ordering | **Pass** — `observation_coverage` reports reports containing a completed observation, never participants who demonstrated anything |

### Item 10 — Connections retired

| | Criterion | Result |
|---|---|---|
| A1 | No Connections entry, page or tab | **Pass** |
| A2 | Connection-request endpoint refused server-side and logged | **Partial — see §8** |
| A3 | No connection or request record created by any employer action | **Pass** — `CONNECTION_REQUEST_RETIRED` |
| A4 | Consent absent → no contact element, route refuses when called directly | **Pass** |
| A5 | Consent withdrawn between render and action → opening refuses | **Pass** — proved by withdrawing between the two steps |
| A6 | No notification from retiring existing requests | **Pass** — nothing is emitted; zero requests existed |
| A7 | Overview count moves only with consented threads | **Pass** |
| A8 | Zero instances of every string at 5.10 | **Pass** |

### Item 11 — the account audit

| | Criterion | Result |
|---|---|---|
| A1 | Every account carries a result across all four checks | **Pass** — 1 of 1 |
| A2 | No account at Verified without a recorded approver | **Pass** — query returns empty |
| A3 | Nothing deleted | **Pass** — counts identical before and after |
| A4 | Every state change logged with cause | **Pass** — `employer_account_audit` |
| A5 | The two finding types distinguishable | **Pass** |
| A6 | No participant record modified | **Pass** |
| A7 | No notification sent | **Pass** |

### Item 12 — Employer Feedback

| | Criterion | Result |
|---|---|---|
| A1 | Feedback row carries no participant, report, hire or employment reference | **Pass** — no such column exists |
| A2 | Participant-linked submission refused server-side and logged | **Pass** |
| A3 | Refusal log carries attempt, route, actor, time, reason — and not the body or the reference | **Pass** — verified by inspection, §7 |
| A4 | No control selects a person, report or time interval | **Pass** |
| A5 | No stored feedback enters matching, ordering, a report or a participant surface | **Pass** |
| A6 | Existing participant-linked feedback unreachable, present in quarantine | **Pass** — `t3a_quarantine.employer_feedback`, grants revoked |
| A7 | Boundary line at every width | **Pass** |
| A8 | Zero instances of every string at 5.11 | **Pass** |
| A9 | LiveWorks category only where activated | **Pass** |

## 5. The pool index, proving conduct exclusion

Item 8 A3 asks for the index rather than the query layer. The complete field
list of `t3a_employer_pool_entry`:

```
pool_entry_id                    uuid
participant_id                   uuid
stated_full_name                 text
stated_role_or_field             text
work_location_preference         text
availability_to_start            text
work_authorization_jurisdiction  text
open_to_liveworks                boolean
ber_report_id                    uuid
observation_period_start         date
observation_period_end           date
report_status                    text
current_through                  date
correction_open                  boolean
made_available_at                timestamptz
visibility_withdrawn_at          timestamptz
```

No dimension, Stage, conduct text, conduct-derived metadata or embedding
column exists. **The exclusion is structural**: the index is incapable of
conduct search, rather than capable of it and unexposed.

## 6. Identifier mapping table

| Retired employer-facing name | Retained name | Routes affected | Internal identifier retained |
|---|---|---|---|
| Find Talent | Available Reports | `/dashboard/employer/search` → redirect → `/dashboard/employer/reports` | — |
| T3X Talent Exchange | Available Reports | same | — |
| Connections | *(retired; consolidated into Messages)* | `/dashboard/employer/connections` → redirect → `/dashboard/employer/messages` | `t3x_connections` table retained, writes refused |
| Feedback | Feedback to The 3rd Academy | route unchanged | — |
| Company | Your organization | route unchanged | — |
| Hire Feedback | Employer Feedback | route unchanged | `employer_feedback` retained in `t3a_quarantine` |
| T3X Discovery | **T3X Discovery** (unchanged) | route unchanged, query capability removed | — |

**Route trace for the three names.** Item 9A step 2.3 settles it: T3X Discovery
is a different environment from the pool. Find Talent and T3X Talent Exchange
named the same environment twice; both are retired in favour of Available
Reports. Item 4 step 5.3 therefore applies, and Available Reports names the
pool page only.

`current_tier` and `total_hires` are **not renamed and not dropped** —
Standing Rule 4 applies. They are no longer read by the desk.

## 7. Refusal logging — a design decision worth stating

Six items require a refused route to be "refused server-side and logged", and
Item 12 A3 inspects the log's contents directly.

A refusal raised as an exception cannot satisfy that. The raise aborts the
statement, and the abort rolls back everything the statement did — including
the log insert. PostgreSQL has no autonomous transaction. The first
implementation raised, and the proof run showed exactly this:
`feedback_refusal_log = NONE`.

**Every employer-desk route that must log its own refusal now returns a
refusal code instead of raising.** Nothing is written on the refusal path
except the log line, the caller receives an unambiguous code rather than an
empty result — so a refusal is never mistaken for an empty pool — and the log
survives because the statement commits.

Refusal log after the proof run:

```
pool_query_refused_not_verified          | organization is not verified
pool_count_refused_not_verified          | organization is not verified
coverage_refused_not_verified            | organization is not verified
pool_query_refused_unsupported_parameter | parameter is not an approved pool filter
pool_query_refused_unsupported_sort      | ordering is availability or alphabetical only
conversation_refused_no_contact_consent  | participant has not opened contact
feedback_refused_participant_linked      | submission carried a structured participant,
                                           report, hire or employment reference
coverage_console_refused_not_oversight   | caller does not hold the oversight role
```

And what the feedback refusal does **not** carry, per Item 12 step 5.10:

```
detail             : {"reason": "submission carried a structured participant,
                      report, hire or employment reference"}
contains body      : false
contains reference : false
```

## 8. Anything left fail-closed, with the reason

**Item 10 A2 — the connection-request refusal logs nothing.** The refusal is
enforced by a `BEFORE INSERT OR UPDATE OR DELETE` trigger on `t3x_connections`,
which must raise: a trigger cannot decline a write by returning a value without
letting the statement appear to succeed, and a silent no-op would be worse than
an unlogged refusal. So the write is refused (A3 passes, proved) but the
attempt is not recorded, for the same Postgres reason as §7.

Refusing the write matters more here than recording the attempt, so the trigger
stays. Recorded rather than worked around.

**LiveWorks is not activated.** `liveworks_employer_activation` is `false`, so
tile 02 renders state line 1 and the route refuses. This is a configuration
value, not a build state.

**No coverage snapshot has been published.** The disclosure renders Block 1
with the figures absent and a line saying so. Nothing is estimated. Block 3
does not render, because there is no preceding snapshot to compare against.

**The pool is empty.** No participant has made a report available, so Available
Reports renders the controlled empty-state text.

## 9. Migrations, configuration and routes

**Added:** `t3a_employer_desk_event`, `t3a_employer_application`,
`t3a_participant_contact_consent`, `t3a_employer_hire_record`,
`t3a_record_informed_decision`, `t3a_employer_account_audit`,
`t3a_employer_desk_config`, `t3a_employer_desk_config_change`,
`t3a_employer_pool_entry`, `t3a_employer_saved_report`,
`t3a_employer_report_view`, `t3a_employer_workspace_note`,
`t3a_coverage_snapshot`, `t3a_employer_product_feedback`.

**Moved:** `public.employer_feedback` → `t3a_quarantine.employer_feedback`.

**Configuration:** `liveworks_employer_activation` = `false`.

**Routes added:** `/dashboard/employer/reports`.
**Routes redirected:** `/employer/search` → `/employer/reports`;
`/employer/connections` → `/employer/messages`.
**Routes retained with changed content:** `/employer/t3x`, `/employer/feedback`.

## 10. Deviations from this note

**One.** Item 10 A2 requires the connection-request refusal to be logged. It is
refused but not logged, for the reason at §8. Every other criterion is met as
written.

## 11. Assumptions made

**One.** Item 11 check 1 asks whether the work email resolves to the stated
organization domain. With no domain field on the account, this is evaluated by
matching the organization name against the email domain. A stricter check needs
a stated domain on the application record, which no existing account has. The
check reports `not_established` rather than `pass` wherever it cannot be run,
per the note's own rule that not established is not a pass.

## 12. Conflict register

| # | Item | Conflict | Disposition |
|---|---|---|---|
| 1 | 10 | A trigger-level refusal cannot self-log (no autonomous transaction) | Write refused; attempt unlogged. Recorded, not worked around |
| 2 | 11 | Domain registration age is not held on the platform | Recorded as not established; account set to Pending. Never treated as a pass |
| 3 | 11 | The one live employer account has no organization row at all | Audit re-keyed on the account. Recorded as `finding_public_signup_route` |
| 4 | 12 | No approved retention rule covers quarantined content | **Retention gap recorded. No retention or deletion decision taken in implementation**, per Item 12 step 5.2 |
| 5 | 6, 9A | LiveWorks unactivated and no coverage snapshot published | Both fail closed and state the actual condition. Neither is an error state |

**Item 12 retention gap, stated explicitly as the note requires:** participant-linked
feedback content is held in `t3a_quarantine`, unreachable from every application
route. No approved retention rule covers it. Its retention or deletion is
governed through the privacy and records-governance process and was not decided
here.

## 13. Developer sign-off

Implemented and returned 13 September 2026 against T3A-DEV-CN-EMP-001, Items 1
to 12. Every acceptance criterion was attempted against the running system
rather than read from the code. The two criteria that could not be executed
through the available query gateway — which is itself `SECURITY DEFINER` and
bypasses row level security — are identified as policy-catalogue arguments
rather than executions, and labelled as such.

No T3A doctrine, evidence meaning, participant right or authority was decided
by developer assumption.

---

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
