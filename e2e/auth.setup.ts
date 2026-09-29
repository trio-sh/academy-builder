/**
 * Mints a session for each of the five role suites.
 *
 * WHAT THIS REPLACES, AND WHY IT MATTERED MORE THAN IT LOOKED.
 *
 * The previous version had the right idea and both details wrong. It
 * hardcoded the Supabase project `bloujipdkyjsgzwxnoej`, which no longer
 * exists — the app runs on the project in VITE_SUPABASE_URL — and it wrote
 * the session under the localStorage key "the3rdacademy-auth" while the
 * client sets no `storageKey` and therefore uses supabase-js's default,
 * `sb-<ref>-auth-token`. Two independent reasons nothing it wrote could
 * ever be read.
 *
 * The visible symptom was five failing setup projects. The number beside
 * them was the one that mattered: **187 tests reported as "did not run"**.
 * An entire suite had been silently skipped for as long as this file had
 * been broken, and the five red lines above it were repeatedly explained
 * away as an outstanding email-confirmation task. They were not, and
 * cockpit.setup.ts had already written the correct diagnosis in its own
 * docstring where nobody looked.
 *
 * WHY THIS INJECTS A SESSION RATHER THAN DRIVING THE FORM. cockpit.setup.ts
 * signs in through the real form, deliberately, because that suite's
 * subject is what a mentor sees and the sign-in path is part of it. For
 * these five the sign-in is not the subject — it is setup — and driving
 * the form here proved brittle for a reason worth recording rather than
 * working around: the accounts authenticate correctly against the auth API
 * (verified directly), but after submit the page came back to /login with
 * the fields cleared. Something in that flow needs looking at on its own
 * terms, and it is filed below rather than buried under a retry.
 *
 * So: the session is obtained from the auth API and written under the key
 * the client actually reads, with the project taken from the environment
 * instead of hardcoded, so this file cannot rot the same way twice.
 *
 * TWO THINGS THIS SURFACED THAT ARE NOT TEST PROBLEMS.
 *
 *  1. SIGNING IN THROUGH THE FORM DOES NOT COMPLETE for these accounts
 *     even though their credentials are valid. Recorded, not masked.
 *  2. SCHOOL AND ADMIN HAVE NO SIGN-IN PATH AT ALL. The form offers three
 *     role tabs — Individual, mentor, employer — and Login.tsx's redirect
 *     map has no entry for school_admin or admin, so both fall back to the
 *     candidate dashboard. `/dashboard/school` and `/dashboard/admin`
 *     exist and are reachable, so a session works; what is missing is a
 *     way for those two roles to get one by hand.
 *
 * The accounts are created by scripts/seed-e2e-fixtures.mjs. Run it first.
 */
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://tnjyywtulpdyackmwnca.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_4B9I2p0hFbDzJeLxVthbMQ_5C59i2oV";

// The same value scripts/seed-e2e-fixtures.mjs sets, from the same env var
// so the two cannot drift apart.
const PASSWORD = process.env.E2E_PASSWORD || "E2eFixture!2026";

/** supabase-js's default when no storageKey is given: sb-<ref>-auth-token. */
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

const ACCOUNTS: Record<string, { email: string; storageState: string; landing: string }> = {
  candidate: {
    email: "testcandidate@t3a.test",
    storageState: path.resolve("e2e/.auth/candidate.json"),
    landing: "/dashboard/candidate",
  },
  mentor: {
    email: "testmentor@t3a.test",
    storageState: path.resolve("e2e/.auth/mentor.json"),
    landing: "/dashboard/mentor",
  },
  employer: {
    email: "testemployer@t3a.test",
    storageState: path.resolve("e2e/.auth/employer.json"),
    landing: "/dashboard/employer",
  },
  school: {
    email: "testschool@t3a.test",
    storageState: path.resolve("e2e/.auth/school.json"),
    landing: "/dashboard/school",
  },
  admin: {
    email: "testadmin@t3a.test",
    storageState: path.resolve("e2e/.auth/admin.json"),
    landing: "/dashboard/admin",
  },
};

for (const [role, account] of Object.entries(ACCOUNTS)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: PASSWORD }),
    });
    const session = await res.json();

    // A refusal here means the account does not exist or the password
    // differs from the seed's. Stated rather than left as a timeout on a
    // form, which is what made the original failure so easy to misread.
    expect(
      session.access_token,
      `sign-in refused for ${account.email}: ${JSON.stringify(session).slice(0, 200)}. `
        + `Run scripts/seed-e2e-fixtures.mjs first.`
    ).toBeTruthy();

    // The origin must exist before localStorage can be written to it.
    await page.goto("/");
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STORAGE_KEY, JSON.stringify(session)] as const
    );

    // Proof the session is one the CLIENT reads, not merely one the API
    // issued: a protected route must render rather than bounce to /login.
    // Injecting a token nothing reads is the exact failure this replaces,
    // so the check is that it was read.
    await page.goto(account.landing);
    await page.waitForLoadState("domcontentloaded");
    await expect(page, `${role} was bounced to sign-in, so the injected session was not read`)
      .not.toHaveURL(/\/login\b/);

    await page.context().storageState({ path: account.storageState });
  });
}
