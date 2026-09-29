import { test, expect } from "@playwright/test";

const BASE = "/dashboard/mentor";

async function navigateTo(page: any, name: string) {
  const menuBtn = page.locator("button:has(svg.lucide-menu)");
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
}

// ─── Overview ────────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Overview", () => {
  test("displays welcome message and stat cards", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows four stat cards", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasActiveMentees = await page.locator("text=Active Mentees").isVisible().catch(() => false);
    const hasTotalObservations = await page.locator("text=Total Observations").isVisible().catch(() => false);
    const hasEndorsementsGiven = await page.locator("text=Endorsements Given").isVisible().catch(() => false);
    const hasMaxMentees = await page.locator("text=Max Mentees").isVisible().catch(() => false);

    expect(hasActiveMentees || hasTotalObservations || hasEndorsementsGiven || hasMaxMentees).toBeTruthy();
  });

  // RESTATED. The section is "Common entries" under "§ III · At a glance",
  // not "Quick Actions", and the three entries are named for the act rather
  // than the screen. The OR-chain is gone: all three entries are asserted,
  // so the test fails if one is dropped instead of passing on whichever
  // survives.
  test("shows the three common entries", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Common entries" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { name: "View assignments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record an observation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Manage schedule" })).toBeVisible();
  });

  // RESTATED. There is no "Pending Actions" heading; the desk states the
  // answer in words instead — "You are all caught up. / No pending actions."
  //
  // This asserts the empty state exactly, which is deterministic for the
  // fixture mentor because that account holds no assignments. If it is ever
  // given one, this test is SUPPOSED to fail and be restated against the
  // populated wording; a version written to pass either way would tell us
  // nothing about whether the desk reports pending work at all.
  test("the desk says whether anything awaits the mentor", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("You are all caught up.")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        "No pending actions. New assignments and observation tasks will appear here."
      )
    ).toBeVisible();
  });

  // RESTATED. The destination page is headed "My Assignments"; the route is
  // unchanged. The `if` guard is also gone — the entry is always rendered,
  // so a guard that skipped the assertion when it was missing was hiding
  // exactly the failure this test exists to catch.
  test("the View assignments entry navigates to My Assignments", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("link", { name: /View assignments/ })
      .first()
      .click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/mentor\/mentees$/);
    await expect(page.getByRole("heading", { name: "My Assignments" }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});

// ─── My Mentees ──────────────────────────────────────────────────────────────

test.describe("Mentor Flows - My Assignments", () => {
  // RESTATED. Title and description both changed. The new description says
  // where the observation work is continued from, which is the fact the
  // Observations surface now depends on.
  test("renders the assignments page with title and description", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "My Assignments" }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(
        "View the individuals currently assigned to you and continue their observation work."
      )
    ).toBeVisible();
  });

  // RESTATED. The empty state reads "No active assignments yet." and names
  // who fills it. Asserting the exact empty state for an account with no
  // assignments is a claim that can fail; the previous four-way OR could
  // be satisfied by any button anywhere containing "View".
  test("shows the empty assignments state and who fills it", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No active assignments yet.")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        "New assignments will appear here when The 3rd Academy assigns an individual to you."
      )
    ).toBeVisible();
  });

  test("mentee cards show loop progress and tier info", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasLoopInfo = await page.locator("text=Loop").first().isVisible().catch(() => false);
    const hasTierInfo = await page.locator("text=Tier").first().isVisible().catch(() => false);
    const hasStatus = await page.locator("text=active").first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No mentees assigned").isVisible().catch(() => false);

    expect(hasLoopInfo || hasTierInfo || hasStatus || hasEmpty).toBeTruthy();
  });

  test("clicking Observe button on mentee opens observation modal", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const observeBtn = page.locator("button").filter({ hasText: /Observe/i }).first();
    if (await observeBtn.isVisible().catch(() => false)) {
      await observeBtn.click();
      await page.waitForTimeout(500);

      // Modal should show with "Record Observation" title
      const hasModalTitle = await page.locator("text=Record Observation").isVisible().catch(() => false);
      const hasStepInfo = await page.locator("text=Step").isVisible().catch(() => false);

      expect(hasModalTitle || hasStepInfo).toBeTruthy();

      // Close modal
      const closeBtn = page.locator("button:has(svg.lucide-x)").first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test("Dimensions button links to assign-dimensions page", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const dimensionsLink = page.locator('a[href*="assign-dimensions"]').first();
    if (await dimensionsLink.isVisible().catch(() => false)) {
      await dimensionsLink.click();
      await page.waitForLoadState("networkidle");

      const hasTitle = await page.locator("text=Assign Observation Dimensions").isVisible().catch(() => false);
      const hasBackLink = await page.locator("text=Back to Mentees").isVisible().catch(() => false);

      expect(hasTitle || hasBackLink).toBeTruthy();
    }
  });
});

// ─── Assign Dimensions ──────────────────────────────────────────────────────

test.describe("Mentor Flows - Assign Dimensions", () => {
  test("shows MVP and additional dimension sections", async ({ page }) => {
    // Navigate to mentees first to find a link
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const dimensionsLink = page.locator('a[href*="assign-dimensions"]').first();
    if (await dimensionsLink.isVisible().catch(() => false)) {
      await dimensionsLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const hasMVP = await page.locator("text=MVP Dimensions").isVisible().catch(() => false);
      const hasAdditional = await page.locator("text=Additional Dimensions").isVisible().catch(() => false);
      const hasSaveBtn = await page.locator("button").filter({ hasText: /Save Assigned Dimensions/i }).first().isVisible().catch(() => false);

      expect(hasMVP || hasAdditional || hasSaveBtn).toBeTruthy();
    }
  });

  test("can toggle dimensions and shows selection count", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const dimensionsLink = page.locator('a[href*="assign-dimensions"]').first();
    if (await dimensionsLink.isVisible().catch(() => false)) {
      await dimensionsLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Should show behavioral dimension names
      const hasIntegrity = await page.locator("text=Integrity & Ethics").isVisible().catch(() => false);
      const hasAccountability = await page.locator("text=Accountability & Ownership").isVisible().catch(() => false);
      const hasDimensionSelected = await page.locator("text=dimension").isVisible().catch(() => false);

      expect(hasIntegrity || hasAccountability || hasDimensionSelected).toBeTruthy();
    }
  });
});

// ─── Observations ────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Observations", () => {
  // RESTATED, AND THIS IS A DOCTRINE CHANGE RATHER THAN A WORDING ONE.
  //
  // There is no "New Observation" button any more, and there should not be.
  // An observation begins from the assignment it belongs to — the page says
  // so — so a mentor can no longer start one from nowhere and attach it to
  // a candidate afterwards. The surface is also marked a legacy one, with
  // Determinations named as its replacement.
  //
  // So this test now asserts the ABSENCE of the button as well as the
  // instruction that replaced it. Asserting an absence is the only way to
  // notice if a route back to hand-started observations is reintroduced.
  test("observations begin from the assignment, not from this page", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Observations" }).first()).toBeVisible({
      timeout: 15000,
    });

    await expect(
      page.getByText(
        /An observation begins from the assignment it belongs to — open the assignment from My Assignments and use Begin Observation there\./
      )
    ).toBeVisible();

    await expect(page.getByRole("button", { name: /New Observation/i })).toHaveCount(0);

    // And the surface names its own replacement, so a mentor is not left on
    // a legacy screen with no way forward.
    await expect(page.getByText("§ Legacy surface")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open the new Determinations surface/ })
    ).toBeVisible();
  });

  test("shows observation records or empty state", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasObsRecords = await page.locator("text=Session Date").first().isVisible().catch(() => false);
    const hasLocked = await page.locator("text=Locked").first().isVisible().catch(() => false);
    const hasDraft = await page.locator("text=Draft").first().isVisible().catch(() => false);
    const hasStrengths = await page.locator("text=Strengths").first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No observations recorded yet").isVisible().catch(() => false);

    expect(hasObsRecords || hasLocked || hasDraft || hasStrengths || hasEmpty).toBeTruthy();
  });

  // REMOVED, NOT REWRITTEN: "New Observation button opens modal with step 1"
  // and "observation modal shows progress bar with 3 steps".
  //
  // Both tested a three-step "Record Observation" modal opened from a button
  // that no longer exists, on a surface whose own text now says an
  // observation begins from the assignment. The subject of these two tests
  // is gone, and a test whose subject is empty passes for free — so making
  // them green by finding some other modal would have been worse than
  // leaving them red. What they were guarding, that a mentor cannot start an
  // observation from nowhere, is now asserted as an absence in the test
  // above.
});

// ─── Endorsements ────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Confirmations", () => {
  // RESTATED THROUGHOUT. A mentor does not "issue an endorsement"; they
  // confirm an observation. The page is headed "Confirmations", its two
  // sections are "Awaiting confirmation" and "Confirmation history", and
  // nothing on it reads "Ready for Endorsement". The route keeps its
  // /endorsements path and is not renamed.
  test("renders the confirmations page with title and description", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Confirmations" }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText("Review and confirm observations that require your confirmation.")
    ).toBeVisible();
  });

  // The three overlapping OR-chains that followed asked the same question
  // five different ways and would have passed on any one of them. They are
  // now two tests, one per section, each naming the section and its empty
  // state exactly.
  test("shows the awaiting-confirmation section and its empty state", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Awaiting confirmation" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("No observations are waiting for confirmation.")).toBeVisible();
    await expect(
      page.getByText(
        "Observations assigned to you that require confirmation will appear here."
      )
    ).toBeVisible();
  });

  test("shows the confirmation history section and its empty state", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Confirmation history" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("No confirmations recorded yet.")).toBeVisible();
  });

  // KEPT AS IT WAS, AND IT IS WEAK: the whole body sits behind an `if` on a
  // button that does not exist for an account with nothing to confirm, so it
  // asserts nothing today. It was passing before this pass and is left alone
  // rather than deleted, because the decision options it names (Proceed,
  // Redirect, Pause) are real and this is the only test that mentions them.
  // It needs a fixture with an observation awaiting confirmation to become a
  // test rather than a placeholder.
  test("confirmation form shows decision options when one is selected", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Endorse button if available
    const endorseBtn = page.locator("button").filter({ hasText: /Endorse|Review/i }).first();
    if (await endorseBtn.isVisible().catch(() => false)) {
      await endorseBtn.click();
      await page.waitForTimeout(500);

      // Should show decision options: Proceed, Redirect, Pause
      const hasProceed = await page.locator("text=Proceed").isVisible().catch(() => false);
      const hasRedirect = await page.locator("text=Redirect").isVisible().catch(() => false);
      const hasPause = await page.locator("text=Pause").isVisible().catch(() => false);
      const hasJustification = await page.locator("text=Justification").isVisible().catch(() => false);

      expect(hasProceed || hasRedirect || hasPause || hasJustification).toBeTruthy();
    }
  });

  // REMOVED: "shows past endorsements section". There is no "Past
  // Endorsements" section, and its final fallback — that the word
  // "Endorsements" appears somewhere on the page — meant the test could not
  // fail while the page loaded at all. What it was reaching for is covered
  // by the confirmation-history test above, which names the section.
});

// ─── Schedule ────────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Schedule", () => {
  test("renders schedule page", async ({ page }) => {
    await page.goto(`${BASE}/schedule`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Schedule").first()).toBeVisible({ timeout: 15000 });
  });

  test("can toggle between availability and sessions tabs", async ({ page }) => {
    await page.goto(`${BASE}/schedule`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const availTab = page.locator("button").filter({ hasText: /availability/i }).first();
    const sessionsTab = page.locator("button").filter({ hasText: /session/i }).first();

    if (await availTab.isVisible().catch(() => false)) {
      await availTab.click();
      await page.waitForTimeout(500);
    }

    if (await sessionsTab.isVisible().catch(() => false)) {
      await sessionsTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("availability view shows weekday toggles", async ({ page }) => {
    await page.goto(`${BASE}/schedule`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasMonday = await page.locator("text=Monday").isVisible().catch(() => false);
    const hasTuesday = await page.locator("text=Tuesday").isVisible().catch(() => false);
    const hasWednesday = await page.locator("text=Wednesday").isVisible().catch(() => false);

    expect(hasMonday || hasTuesday || hasWednesday).toBeTruthy();
  });

  test("has save availability button", async ({ page }) => {
    await page.goto(`${BASE}/schedule`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const saveBtn = page.locator("button").filter({ hasText: /save/i }).first();
    const hasSave = await saveBtn.isVisible().catch(() => false);
    expect(typeof hasSave).toBe("boolean");
  });
});

// ─── Profile ─────────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Profile", () => {
  test("renders profile page with Edit Profile button", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await expect(editBtn).toBeVisible();
  });

  test("can toggle edit mode and see save/cancel buttons", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    const hasCancel = await page.getByRole("button", { name: /cancel/i }).first().isVisible().catch(() => false);
    const hasSave = await page.getByRole("button", { name: /save/i }).first().isVisible().catch(() => false);

    expect(hasCancel || hasSave).toBeTruthy();
  });

  test("edit mode shows mentor-specific fields", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    const hasIndustry = await page.locator("text=Industry").isVisible().catch(() => false);
    const hasCompany = await page.locator("text=Company").isVisible().catch(() => false);
    const hasSpecializations = await page.locator("text=Specialization").isVisible().catch(() => false);
    const hasMaxMentees = await page.locator("text=Max Mentees").isVisible().catch(() => false);

    expect(hasIndustry || hasCompany || hasSpecializations || hasMaxMentees).toBeTruthy();
  });

  test("cancel in edit mode returns to view mode", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);

      // Edit Profile button should reappear
      await expect(page.getByRole("button", { name: /Edit Profile/i }).first()).toBeVisible();
    }
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Settings", () => {
  test("renders settings page", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
  });
});

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Navigation", () => {
  test("all nav items are accessible", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Check that nav links exist for all sections
    // The labels the Mentor Desk actually offers. "My Mentees" and
    // "Endorsements" are retired; Determinations is new and is included
    // because it is now the surface Observations points at.
    const navLinks = [
      "Overview",
      "My Assignments",
      "Observations",
      "Determinations",
      "Confirmations",
      "Schedule",
      "Profile",
      "Settings",
    ];

    for (const linkName of navLinks) {
      const link = page.getByRole("link", { name: linkName, exact: true }).first();
      const isVisible = await link.isVisible().catch(() => false);
      // On mobile the nav may be hidden, so also check after opening menu
      if (!isVisible) {
        const menuBtn = page.locator("button:has(svg.lucide-menu)");
        if (await menuBtn.isVisible().catch(() => false)) {
          await menuBtn.click();
          await page.waitForTimeout(300);
        }
      }
      expect(await link.isVisible().catch(() => false)).toBeTruthy();

      // Close mobile menu if open
      const closeBtn = page.locator("button:has(svg.lucide-x)").first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("can navigate between pages using sidebar links", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Each hop checks the banner, which reads "§ " + the active nav item.
    // A `text=` locator for the label would also match the sidebar link that
    // was just clicked, so it passed whether or not the page changed.
    await navigateTo(page, "Observations");
    await expect(page.getByRole("banner")).toContainText("§ Observations");

    await navigateTo(page, "Determinations");
    await expect(page.getByRole("banner")).toContainText("§ Determinations");

    await navigateTo(page, "Confirmations");
    await expect(page.getByRole("banner")).toContainText("§ Confirmations");

    await navigateTo(page, "Overview");
    await expect(page.getByRole("banner")).toContainText("§ Overview");
    await expect(page.getByText(/Welcome back,/).first()).toBeVisible({ timeout: 15000 });
  });
});
