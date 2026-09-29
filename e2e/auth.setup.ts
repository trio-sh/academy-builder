/**
 * Signs the five role suites in, through the real login form.
 *
 * WHAT THIS REPLACES, AND WHY IT MATTERED MORE THAN IT LOOKED.
 *
 * The previous version hardcoded the Supabase project
 * `bloujipdkyjsgzwxnoej`, which no longer exists — the app runs on the
 * project in VITE_SUPABASE_URL — and it injected a session under the
 * localStorage key "the3rdacademy-auth" while the client sets no
 * storageKey and therefore uses supabase-js's default,
 * `sb-<ref>-auth-token`. Two independent reasons nothing it wrote could
 * ever have been read.
 *
 * The visible symptom was five failing setup projects and **187 tests
 * reported as "did not run"**. That second number is the one that
 * mattered: an entire suite had been silently skipped for as long as this
 * file had been broken, and the five red lines above it were repeatedly
 * explained away as an outstanding email-confirmation task. They were not.
 * cockpit.setup.ts had already written the correct diagnosis in its own
 * docstring, where nobody looked.
 *
 * So this signs in the ordinary way — slower than injecting a token, and
 * it exercises the path a real user takes, which for suites whose whole
 * subject is what each role sees is the right trade. It is the same
 * approach as cockpit.setup.ts, deliberately: one working pattern rather
 * than two, so the next person finds one answer.
 *
 * The accounts are created by scripts/seed-e2e-fixtures.mjs. Run it first.
 */
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

// The same value scripts/seed-e2e-fixtures.mjs sets, and read from the same
// env var so the two cannot drift apart.
const PASSWORD = process.env.E2E_PASSWORD || "E2eFixture!2026";

type Account = {
  email: string;
  storageState: string;
};

const ACCOUNTS: Record<string, Account> = {
  candidate: {
    email: "testcandidate@t3a.test",
    storageState: path.resolve("e2e/.auth/candidate.json"),
  },
  mentor: {
    email: "testmentor@t3a.test",
    storageState: path.resolve("e2e/.auth/mentor.json"),
  },
  employer: {
    email: "testemployer@t3a.test",
    storageState: path.resolve("e2e/.auth/employer.json"),
  },
  school: {
    email: "testschool@t3a.test",
    storageState: path.resolve("e2e/.auth/school.json"),
  },
  admin: {
    email: "testadmin@t3a.test",
    storageState: path.resolve("e2e/.auth/admin.json"),
  },
};

for (const [role, account] of Object.entries(ACCOUNTS)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto("/auth");

    await page.getByLabel(/email/i).first().fill(account.email);
    await page.getByLabel(/password/i).first().fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();

    // Signed in is proved by leaving /auth, not by the absence of an
    // error: a form that silently does nothing would otherwise pass.
    await expect(page).not.toHaveURL(/\/auth\b/, { timeout: 30000 });

    await page.context().storageState({ path: account.storageState });
  });
}
