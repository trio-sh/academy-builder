/**
 * Signs the Stage 2 cockpit suite in, through the real login form.
 *
 * The existing auth.setup.ts does not work and cannot: it hardcodes a
 * Supabase project (bloujipdkyjsgzwxnoej) that is unreachable and is not
 * on this account, and it injects a session under the localStorage key
 * "the3rdacademy-auth" while the client sets no storageKey and therefore
 * uses supabase-js's default, sb-<ref>-auth-token. Two independent
 * reasons nothing it wrote could ever have been read.
 *
 * This signs in the ordinary way instead. Slower than injecting a token,
 * and it exercises the path a mentor actually takes — which for a suite
 * whose whole subject is what a mentor sees is the right trade.
 *
 * Credentials come from e2e/.fixture.json, written by
 * scripts/seed-e2e-fixtures.mjs. Run that first.
 */
import { test as setup, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const FIXTURE = path.resolve("e2e/.fixture.json");

setup("authenticate the cockpit mentor", async ({ page }) => {
  if (!existsSync(FIXTURE)) {
    throw new Error(
      "e2e/.fixture.json is missing. Run:\n"
      + "  SBP=<token> PROJECT_REF=<ref> node scripts/seed-e2e-fixtures.mjs"
    );
  }
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // "I am signing in as" decides where the form sends you: the redirect
  // is built from the selected tab, not from the account's role, and it
  // defaults to Individual. Signing in without choosing Mentor lands a
  // mentor on the candidate dashboard, which refuses them, and they end
  // up at /get-started looking like an account with no profile.
  // Matched case-insensitively: the tab's DOM text is "mentor" and the
  // capital comes from CSS text-transform, which the accessible name does
  // not see.
  await page.getByRole("button", { name: /^mentor$/i }).click();

  await page.locator("#email").fill(fixture.mentorEmail);
  await page.locator("#password").fill(fixture.password);
  await page.locator('button[type="submit"]').click();

  // Landing on a mentor dashboard is the proof that the sign-in took AND
  // that the account carries the mentor role. Waiting for a spinner to
  // vanish would prove neither.
  await page.waitForURL(/\/dashboard\/mentor/, { timeout: 30000 });
  await expect(page).toHaveURL(/\/dashboard\/mentor/);

  await page.context().storageState({ path: "e2e/.auth/cockpit-mentor.json" });
});
