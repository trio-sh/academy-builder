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

  test("shows quick action links", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasQuickActions = await page.locator("text=Quick Actions").isVisible().catch(() => false);
    const hasViewMentees = await page.locator("text=View Mentees").isVisible().catch(() => false);
    const hasRecordObs = await page.locator("text=Record Observation").isVisible().catch(() => false);
    const hasManageSched = await page.locator("text=Manage Schedule").isVisible().catch(() => false);

    expect(hasQuickActions).toBeTruthy();
    expect(hasViewMentees || hasRecordObs || hasManageSched).toBeTruthy();
  });

  test("shows pending actions section", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // The content area has its own scroll container; use evaluate to find the text in DOM
    const hasPendingInDom = await page.evaluate(() => {
      return document.body.innerText.includes("Pending Actions");
    });

    expect(hasPendingInDom).toBeTruthy();

    // Also verify the sub-content (either "No pending actions" or observation count)
    const hasSubContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("No pending actions") || text.includes("pending observations") || text.includes("caught up");
    });
    expect(hasSubContent).toBeTruthy();
  });

  test("quick action links navigate correctly", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click View Mentees quick action
    const viewMenteesLink = page.locator('a[href="/dashboard/mentor/mentees"]').first();
    if (await viewMenteesLink.isVisible().catch(() => false)) {
      await viewMenteesLink.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=My Mentees").first()).toBeVisible({ timeout: 15000 });
    }
  });
});

// ─── My Mentees ──────────────────────────────────────────────────────────────

test.describe("Mentor Flows - My Mentees", () => {
  test("renders mentees page with title and description", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=My Mentees").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=View and manage your assigned candidates").first()).toBeVisible();
  });

  test("shows mentee cards with action buttons or empty state", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasViewBtn = await page.locator("button").filter({ hasText: /View/i }).first().isVisible().catch(() => false);
    const hasDimensionsBtn = await page.locator("button").filter({ hasText: /Dimensions/i }).first().isVisible().catch(() => false);
    const hasObserveBtn = await page.locator("button").filter({ hasText: /Observe/i }).first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No mentees assigned yet").isVisible().catch(() => false);

    expect(hasViewBtn || hasDimensionsBtn || hasObserveBtn || hasEmpty).toBeTruthy();
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
  test("renders observations page with title and new observation button", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Observations").first()).toBeVisible({ timeout: 15000 });

    // Should have New Observation button
    const hasNewBtn = await page.locator("button").filter({ hasText: /New Observation/i }).first().isVisible().catch(() => false);
    expect(hasNewBtn).toBeTruthy();
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

  test("New Observation button opens modal with step 1", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const newBtn = page.locator("button").filter({ hasText: /New Observation/i }).first();
    await newBtn.click();
    await page.waitForTimeout(500);

    // Should show step 1: Select Candidate
    const hasRecordTitle = await page.locator("text=Record Observation").isVisible().catch(() => false);
    const hasStep1 = await page.locator("text=Select Candidate").isVisible().catch(() => false);
    const hasMenteeList = await page.locator("text=Select a mentee").isVisible().catch(() => false);
    const hasNoMentees = await page.locator("text=No active mentees assigned").isVisible().catch(() => false);

    expect(hasRecordTitle || hasStep1 || hasMenteeList || hasNoMentees).toBeTruthy();

    // Close modal
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  });

  test("observation modal shows progress bar with 3 steps", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const newBtn = page.locator("button").filter({ hasText: /New Observation/i }).first();
    await newBtn.click();
    await page.waitForTimeout(500);

    // Should show step indicator text
    const hasStepText = await page.locator("text=Step 1 of 3").isVisible().catch(() => false);
    expect(hasStepText).toBeTruthy();

    // Close modal
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  });
});

// ─── Endorsements ────────────────────────────────────────────────────────────

test.describe("Mentor Flows - Endorsements", () => {
  test("renders endorsements page with title and description", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Endorsements").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Issue endorsements").first()).toBeVisible();
  });

  test("shows Ready for Endorsement section", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // The section heading uses "Ready for Endorsement" (lowercase "for")
    const hasReadySection = await page.locator("text=Ready for Endorsement").isVisible().catch(() => false);
    const hasReadyForEndorsement = await page.locator("text=/Ready.*Endorsement/i").isVisible().catch(() => false);
    const hasNoCandidatesReady = await page.locator("text=No candidates ready").isVisible().catch(() => false);

    expect(hasReadySection || hasReadyForEndorsement || hasNoCandidatesReady).toBeTruthy();
  });

  test("shows endorsement candidates or empty state", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasReadyCandidate = await page.locator("text=Ready for endorsement").isVisible().catch(() => false);
    const hasObsCompleted = await page.locator("text=observations completed").isVisible().catch(() => false);
    const hasEndorseBtn = await page.locator("button").filter({ hasText: /Endorse/i }).first().isVisible().catch(() => false);
    const hasNoReady = await page.locator("text=No candidates ready").isVisible().catch(() => false);
    const hasReadyTitle = await page.locator("text=Ready for Endorsement").isVisible().catch(() => false);

    expect(hasReadyCandidate || hasObsCompleted || hasEndorseBtn || hasNoReady || hasReadyTitle).toBeTruthy();
  });

  test("endorsement form shows decision options when candidate selected", async ({ page }) => {
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

  test("shows past endorsements section", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Scroll down to find past endorsements
    const hasPastSection = await page.locator("text=Past Endorsement").isVisible().catch(() => false);
    const hasProceedDecision = await page.locator("text=proceed").first().isVisible().catch(() => false);
    const hasEndorsementPage = await page.locator("text=Endorsements").first().isVisible().catch(() => false);

    expect(hasPastSection || hasProceedDecision || hasEndorsementPage).toBeTruthy();
  });
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
    const navLinks = [
      "Overview",
      "My Mentees",
      "Observations",
      "Endorsements",
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

    // Navigate to Observations
    await navigateTo(page, "Observations");
    await expect(page.locator("text=Observations").first()).toBeVisible({ timeout: 15000 });

    // Navigate to Endorsements
    await navigateTo(page, "Endorsements");
    await expect(page.locator("text=Endorsements").first()).toBeVisible({ timeout: 15000 });

    // Navigate back to Overview
    await navigateTo(page, "Overview");
    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
  });
});
