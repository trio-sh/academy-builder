# PLC-005 Note 1 · Step 1 — Account creation and role assignment inventory

**Reference** T3A-DEV-PLC-005-A, Note 1, Step 1
**Produced** 13 September 2026
**Status** Report complete. Work continued to Step 2 without waiting, per Standing Rule 1.

---

## 1. Summary

Note 1 asked whether this note is "preventing a future exposure or closing a
present one."

**It is closing a present one.** Role assignment is client-supplied end to
end, and a defect in the `profiles` row-level security policy set makes the
`role` column self-writable by any authenticated account. The consequences
reach every administrator-gated surface on the platform, including the whole
D1 authority register.

No exploit was performed. Standing Rule 8 forbids production mutation, and
the PostgreSQL policy catalogue is conclusive on its own.

---

## 2. Every route by which an account is created

| # | Route | File | Creates |
|---|-------|------|---------|
| 1 | Public sign-up form | `src/pages/Join.tsx` | auth user + `profiles` row |
| 2 | Get-started entry | `src/pages/GetStarted.tsx` | auth user + `profiles` row |
| 3 | OAuth callback | `src/pages/AuthCallback.tsx` → `createProfile()` | `profiles` row for an OAuth identity |

All three converge on the same two functions in `src/lib/supabase.ts`:
`signUp()` and `createProfile()`.

There is **no database trigger on `auth.users`**. Profile creation is
entirely client-driven; nothing server-side reconciles the profile row
against the auth user.

```
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- []
```

## 3. Every endpoint at which a role is set

| # | Point | Mechanism | Client-supplied? |
|---|-------|-----------|------------------|
| 1 | `signUp()` | `supabase.auth.signUp({ options: { data: { role } } })` | **Yes** — raw user metadata |
| 2 | `createProfile()` | `supabase.from('profiles').insert({ role })` | **Yes** — direct column write |
| 3 | `profiles` UPDATE | RLS policy `profiles_update_own` | **Yes** — see §4 |

`src/lib/supabase.ts:18` accepts
`role: 'candidate' | 'mentor' | 'employer' | 'school_admin' | 'admin'`
as a parameter and writes it through unchanged. The TypeScript union is a
compile-time convenience in the client bundle; it is not a server-side
constraint and does not survive into the request.

**Answer to "does any client-supplied value reach that point": yes, by all
three routes, with no server-side derivation anywhere.**

## 4. The privilege-escalation defect

Three facts compose into a live escalation.

**Fact 1 — `is_admin()` reads the self-writable column.**

```sql
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$function$
```

**Fact 2 — the UPDATE policy has no `WITH CHECK`.**

```
polname               | polcmd | withcheck_is_null
----------------------+--------+------------------
profiles_update_own   | w      | true
```

`polcmd = 'w'` is UPDATE. When an UPDATE policy carries no `WITH CHECK`,
PostgreSQL applies the `USING` expression as the write check. The `USING`
expression here is `((id = auth.uid()) OR is_admin())`, which any account
satisfies for its own row.

**Fact 3 — nothing else guards the column.**

```
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
-- []
```

No trigger, no `CHECK` constraint, no column privilege restriction.

**Composed result.** Any authenticated account can execute
`UPDATE profiles SET role = 'admin' WHERE id = auth.uid()`, and from the
next statement onward `is_admin()` returns true for that session.

### What that reaches

`is_admin()` is the sole gate on, among others:

- `t3a_d1_authority_register` writes — an escalated account could flip
  FD-D1-04 (evidence-review authority) or any other locked decision to SET
- `t3a_d1_production_release_gate`, `t3a_d1_promote_to_production`,
  `t3a_d1_rollback_from_production`
- `t3a_d1_pilot_cohort` / `t3a_d1_pilot_enrollment` writes,
  `t3a_d1_pilot_record_event`
- `t3a_d1_close_calibration`, `t3a_d1_get_calibration_agreement`
- `t3a_d1_run_assurance_sweep`, `t3a_d1_assurance_status`
- `t3a_d1_assurance_check` and `t3a_d1_production_release` reads

The D1 fail-closed posture is built on the assumption that `is_admin()`
means something. Until §5 lands, it does not.

The `INSERT` policy is sound in shape — `profiles_insert_own` does carry
`WITH CHECK (id = auth.uid())` — but it constrains *which row*, never
*which role*, so a first-time account may still be created directly as
`mentor`, `employer` or `admin`.

## 5. Accounts that exist today, and how each came to exist

```
 role      | count
-----------+-------
 candidate |     6
 employer  |     1
 mentor    |     1
 admin     |     0
```

Eight accounts. **Zero administrators.**

On provenance: the platform holds no record of how any of these accounts
acquired its role. There is no invitation table, no application table, no
approval record and no role-grant audit. The only available inference is
route-based — every account predates this change, and every route available
before this change took the role from the client. The one mentor account and
the one employer account are therefore **self-asserted as far as the
platform can demonstrate**, whatever the real-world circumstances were.

That gap is itself a finding. Note 1 Step 6 asks for existing accounts to be
audited against the new checks; the honest position is that there is nothing
recorded to audit them against, so each will need a first-time grant record
written deliberately rather than reconstructed. Part B carries the founder
question about the origin of the mentor account; this report does not guess
at it.

**Consequence of zero administrators:** every `is_admin()`-gated surface is
currently unreachable by legitimate means. That is correct fail-closed
behaviour and is not a defect. It does mean the first administrator must be
created through a governed service-role path rather than through the
interface — see §6.

## 6. What Step 2 builds, and the bootstrap consequence

Migration `20260918000000_t3a_close_role_self_assertion.sql`:

1. `t3a_role_grant_attempt` — append-only log. Every role INSERT and every
   role-changing UPDATE is recorded, permitted or refused, so Note 1
   Step 2's requirement to "log the rejection with enough detail to see
   whether it is being attempted" is satisfied.
2. `t3a_profiles_role_guard()` BEFORE INSERT OR UPDATE trigger on
   `profiles`. Refuses any client-session attempt to insert a non-`candidate`
   role, and any client-session attempt to change `role` at all. Runs
   regardless of RLS, so it holds even if a policy is loosened later.
3. `profiles_update_own` reissued **with an explicit `WITH CHECK`**, closing
   the NULL-fallback. Defence in depth beneath the trigger.
4. `t3a_grant_role(target, role, basis)` — the governed path. Service-role
   only for now. Writes the grant to the log with the granter, the time and
   the basis.

**Bootstrap.** With zero administrators and role changes closed to client
sessions, the first administrator can only be created by calling
`t3a_grant_role` under the service role. This is deliberate: it means the
first administrative account on this platform will be the first role grant
that has a record behind it. The operational step is left to the authorised
deployment process per Standing Rule 8 and is not executed here.

**What fails closed as a result.** Mentor and employer self-sign-up now
refuse at the database. That is the intent of Note 1 (a) and (b), which
replace both paths. The replacement routes are Steps 3 and 4 and ship
separately; until then those two paths refuse rather than create an account,
which is the correct interim position and not a regression.

## 7. Executable defaults recorded

| Code | Condition |
|------|-----------|
| `ROLE_SELF_ASSERTION_REFUSED` | A client session attempted to set or change `role` |
| `ROLE_GRANT_REQUIRES_SERVICE_CONTEXT` | `t3a_grant_role` called outside the service role |
| `NO_ADMINISTRATOR_EXISTS` | Recorded standing condition — zero admin accounts |

## 8. Step 2 verification — server-side, per Standing Rule 6

The refusal was proved by attempting the operation directly against the
database under a simulated client session, not by observing that a control
is absent from a screen.

Method: a `DO` block that sets `request.jwt.claims` to
`{"role":"authenticated"}` for the transaction, attempts both the INSERT and
the UPDATE, captures each outcome, and then **ends in `RAISE EXCEPTION`** so
the whole block aborts. Nothing could commit — not the attempted rows, and
not the guard's own log writes.

```
TESTRESULT
  service_context   = false
  insert_admin      = REFUSED / ROLE_SELF_ASSERTION_REFUSED:
                      a role other than candidate cannot be self-assigned.
                      Mentor is by invitation; employer is by application.
  update_to_admin   = REFUSED / ROLE_SELF_ASSERTION_REFUSED:
                      role is granted by The 3rd Academy and cannot be
                      changed from a client session.
```

Post-test state confirmed unchanged:

| Check | Result |
|-------|--------|
| `profiles` by role | candidate 6, employer 1, mentor 1 — identical to §5 |
| `t3a_role_grant_attempt` rows | 0 |
| Synthetic rows left behind | 0 |
| `profiles_update_own` `polwithcheck IS NULL` | **false** (was `true`) |
| Trigger on `public.profiles` | `t3a_profiles_role_guard_trg` present (was none) |

No production record was altered at any point, per Standing Rule 8.

### Client half

`src/contexts/AuthContext.tsx` bootstrapped the profile from
`userObj.user_metadata.role`. That field originates in the sign-up request
and is therefore attacker-controlled; trusting it was the client half of the
same defect. The bootstrap now creates `candidate` unconditionally.

`signUp()` still writes `role` into auth user metadata. That write is now
**inert** — nothing reads it for authorization, and the database refuses any
non-candidate role from a client session regardless. It is left in place
under Standing Rule 5 and recorded here so no future reader mistakes it for
an authoritative value.

## 9. Nothing renamed

No route, field, component, table or code identifier was renamed under this
note, per Standing Rule 4. `profiles.role` keeps its name; only its write
path changes.

---

_Generated by [Claude Code](https://claude.ai/code/session_01HsSQ1TEzdCLan4rGpsqE4A)_
