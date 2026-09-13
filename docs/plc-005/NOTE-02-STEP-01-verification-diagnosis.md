# PLC-005 Note 2 · Step 1 — Verification email diagnosis

**Reference** T3A-DEV-PLC-005-A, Note 2, Step 1
**Produced** 13 September 2026
**Status** Report complete. Work continued to Step 3 without waiting, per Standing Rule 1.

---

## 1. Summary

The founder's report described two faults and judged the second the more
serious. The evidence confirms that judgement and sharpens it.

| Fault | Founder's reading | What the evidence shows |
|---|---|---|
| Email did not arrive | An outage | A send **was** attempted for the reported account. Delivery, not dispatch, is where it failed. |
| Account usable while unverified | A design fault | Confirmed, and broader than reported. **Supabase Auth did hold the account unverified.** The application simply never asks. |

The second fault is not that the auth layer let the account through. It is
that **nothing in the application has ever read the answer.** A full-text
search of `src/` and `supabase/functions/` for `email_confirmed`,
`email_confirmed_at`, `email_verified` and `emailConfirmed` returns **zero
matches**. The screen announced a control that no line of code consulted.

## 2. Was a send attempted, and what came back

```
 total | send_attempted (confirmation_sent_at NOT NULL)
-------+------------------------------------------------
     9 |                                              1
```

One account in nine has ever had a confirmation send recorded — and it is
the account from the 8 September report. So for **that** account the answer
to the founder's three-way question is the third: a send was attempted and
did not arrive. Not "no send attempted", and not a rejection recorded at
dispatch.

What the provider returned is **not inspectable from here.** Supabase Auth's
SMTP response is not written to any table this session can read; it lives in
project-level Auth logs. Recorded as `LIVE_EMAIL_DELIVERY_NOT_VERIFIED` per
the note's own executable default. No live-delivery acceptance is claimed.

## 3. Why the other eight accounts never got one

```
 send_attempted | confirmed | provider | count
----------------+-----------+----------+-------
 false          | true      | email    |     6
 false          | true      | google   |     3
 true           | false      | email   |     1
```

```
confirmed within 1 second of creation: 8
```

Every confirmed account was confirmed **instantly** — inside one second of
creation, with no send attempted.

The three `google` rows are expected: OAuth confirms inherently, and no
confirmation email is appropriate.

The six `email` rows are the finding. They were created while Supabase Auth
email confirmation was **off**, so they auto-confirmed on creation. The
single 8 September account behaves differently — a send attempted, and
`email_confirmed_at` still NULL — which means confirmation had been switched
**on** by then.

So the setting changed between those two cohorts. The consequence is that
**six accounts carry `email_confirmed_at` without anyone ever having proved
control of the address.** They are confirmed in the data and unverified in
fact. Note 2 Step 5 asks for every pre-existing account to be verified or
held; these six are the real subject of that step, and they are invisible to
a query that only looks for `email_confirmed_at IS NULL`.

Recorded as a finding for the founder rather than acted on: re-holding six
live accounts is a production data decision, not a build decision
(Standing Rule 8, and Standing Rule 3's doctrine boundary).

## 4. Two separate mail paths — directly relevant to Note 1

Part B asks whether the same sending path serves password reset, connection
notifications and the mentor invitation mechanism. **It does not.**

| Path | Used for | Configured |
|---|---|---|
| `supabase/functions/send-email` | Application mail. Custom SMTP, Gmail transport, `support@the3rdacademy.com`, STARTTLS on 587 | Via function secrets `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` |
| Supabase Auth built-in | Confirmation, password reset, magic link | Project Auth settings — **separate**, and not inspectable from this session |

These are independent. The application's own SMTP function working tells you
nothing about whether Auth mail is being delivered, which is exactly how
this fault stayed invisible.

**This matters for Note 1.** The invitation-only mentor route depends
entirely on an email arriving, and it would depend on the Auth path or on a
deliberate choice to route it through the application path instead. Building
mentor invitation on an unverified mail path would reproduce this same
fault, one role higher. Recorded here so that choice is made deliberately
when Note 1 Step 3 ships.

## 5. How many accounts are unverified today

```
 total | confirmed | unverified
-------+-----------+------------
     9 |         8 |          1
```

The single unverified account has **no `profiles` row at all** — it exists
in `auth.users` and nowhere else. It is in a half-created state: the auth
user was created, the profile bootstrap did not complete.

Counting honestly, the number of accounts whose address has actually been
proved is **three** — the OAuth accounts. Six are confirmed-without-proof
(§3) and one is openly unverified.

## 6. What Step 3 builds

Migration `20260919000000_t3a_enforce_email_verification.sql`. Enforcement is
at the database, because Note 2 Step 3 says the gate is proved by requesting
the route directly and "do not implement this by hiding links."

Two predicates, because two different questions are being asked:

- `t3a_is_email_verified(uuid)` / `t3a_current_user_email_verified()`
- **Actor-verified** — the acting session must be verified. Guards
  requesting a mentor, accepting a connection, opening a conversation, and
  sending a message.
- **Subject-verified** — the participant the record is *about* must be
  verified. Guards observation records and BER reports. This is a different
  test: there the actor is the mentor, who is a different person from the
  subject, so an actor check would have enforced nothing.

Routes gated:

| Route | Table | Guard |
|---|---|---|
| Request a mentor | `t3a_mentor_request` | actor |
| Accept a connection | `t3x_connections` | actor |
| Open a conversation | `conversations`, `conversation_participants` | actor |
| Send a message | `messages` | actor |
| Record an observation | `t3a_observation_record` | subject |
| Create a BER report | `t3a_d1_ber_report` | subject |

Service context passes through: system and administrative operations are
governed by their own authority rules, not by the acting person's mailbox.

## 7. Verification — server-side, per Standing Rule 6

Attempted directly against the database under a simulated client session
belonging to the unverified account, in a block ending in `RAISE EXCEPTION`
so nothing could commit.

```
predicate(unverified/verified)      = false / true
conversation_as_unverified          = REFUSED / EMAIL_VERIFICATION_REQUIRED
observation_against_unverified      = REFUSED / EMAIL_VERIFICATION_REQUIRED_SUBJECT
```

Post-test state: `conversations` 2, `t3a_observation_record` 0,
`auth.users` 9 — all unchanged. No production record was altered.

## 8. What is NOT done, and why

| Item | Position |
|---|---|
| Note 2 (a) restore delivery | Requires Supabase Auth SMTP project configuration, which is not code and not reachable from this session. `LIVE_EMAIL_DELIVERY_NOT_VERIFIED` recorded. No delivery acceptance claimed. |
| Note 2 (c) verification-pending screen | Interface work. Ships separately; the server-side gate does not depend on it and is live now. |
| Note 2 (e) sending-domain authentication (SPF/DKIM/DMARC) | DNS and provider configuration. Not a code change. |
| Note 2 Step 5 remediate existing accounts | The six confirmed-without-proof accounts in §3 are a production data decision. Migration not written; finding returned instead, per Standing Rules 3 and 8. |

## 9. Nothing renamed

No route, field, component, table or code identifier was renamed, per
Standing Rule 4.

---

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
