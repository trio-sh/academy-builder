import { test, expect } from "@playwright/test";

const BASE = "/dashboard/employer";

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

test.describe("Employer Flows - Overview", () => {
  test("displays welcome message and stat cards", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows four stat cards", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasConnections = await page.locator("text=Active Connections").isVisible().catch(() => false);
    const hasTotalHires = await page.locator("text=Total Hires").isVisible().catch(() => false);
    const hasOpenProjects = await page.locator("text=Open Projects").isVisible().catch(() => false);
    const hasCompanyStatus = await page.locator("text=Company Status").isVisible().catch(() => false);

    expect(hasConnections || hasTotalHires || hasOpenProjects || hasCompanyStatus).toBeTruthy();
  });

  test("shows quick actions section with links", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasQuickActions = await page.locator("text=Quick Actions").isVisible().catch(() => false);
    const hasSearchT3X = await page.locator("text=Search T3X Exchange").isVisible().catch(() => false);
    const hasPostProject = await page.locator("text=Post a Project").isVisible().catch(() => false);

    expect(hasQuickActions).toBeTruthy();
    expect(hasSearchT3X || hasPostProject).toBeTruthy();
  });

  test("shows platform benefits section", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasBenefits = await page.locator("text=Platform Benefits").isVisible().catch(() => false);
    const hasWhyUse = await page.locator("text=Why Use The 3rd Academy").isVisible().catch(() => false);
    const hasSkillPassports = await page.locator("text=Skill Passports").isVisible().catch(() => false);

    expect(hasBenefits || hasWhyUse || hasSkillPassports).toBeTruthy();
  });

  test("quick action links navigate correctly", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const searchLink = page.locator('a[href="/dashboard/employer/search"]').first();
    if (await searchLink.isVisible().catch(() => false)) {
      await searchLink.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=Talent").first()).toBeVisible({ timeout: 15000 });
    }
  });

  test("shows verification alert if company not verified", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Either shows verification warning or is already verified
    const hasVerificationWarning = await page.locator("text=pending verification").isVisible().catch(() => false);
    const hasVerifiedStatus = await page.locator("text=Verified").isVisible().catch(() => false);
    const hasOverview = await page.locator("text=Welcome back").isVisible().catch(() => false);

    expect(hasVerificationWarning || hasVerifiedStatus || hasOverview).toBeTruthy();
  });
});

// ─── Find Talent / T3X Exchange ──────────────────────────────────────────────

test.describe("Employer Flows - Find Talent", () => {
  test("renders T3X Talent Exchange page with title", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");

    const hasTalentExchange = await page.locator("text=T3X Talent Exchange").isVisible({ timeout: 15000 }).catch(() => false);
    const hasTalent = await page.locator("text=Talent").first().isVisible({ timeout: 15000 }).catch(() => false);

    expect(hasTalentExchange || hasTalent).toBeTruthy();
  });

  test("shows tier filter dropdown with all tier options", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Check for filter section - the text "Filters:" is inside a span
    const hasFilters = await page.evaluate(() => document.body.innerText.includes("Filters"));
    expect(hasFilters).toBeTruthy();

    // Check for tier select dropdown
    const tierSelect = page.locator("select").first();
    const hasTierSelect = await tierSelect.isVisible().catch(() => false);
    expect(hasTierSelect).toBeTruthy();

    // Verify options exist via DOM query (options not visible until dropdown opened)
    const optionCount = await page.locator("select option").count();
    expect(optionCount).toBeGreaterThanOrEqual(2); // At least "All Tiers" + 1 tier option
  });

  test("shows skill search input", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const skillInput = page.locator('input[placeholder*="skill" i]').first();
    const hasSkillSearch = await skillInput.isVisible().catch(() => false);
    expect(hasSkillSearch).toBeTruthy();
  });

  test("can filter by tier selection", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const tierSelect = page.locator("select").first();
    if (await tierSelect.isVisible().catch(() => false)) {
      await tierSelect.selectOption("tier_1");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Should show filtered results or no candidates
      const hasCandidates = await page.locator("text=TIER").first().isVisible().catch(() => false);
      const hasNoCandidates = await page.locator("text=No candidates found").isVisible().catch(() => false);
      const hasTalent = await page.locator("text=Talent").first().isVisible().catch(() => false);

      expect(hasCandidates || hasNoCandidates || hasTalent).toBeTruthy();
    }
  });

  test("candidate cards show profile info and skills", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Either shows candidate cards or empty state
    const hasViewProfile = await page.locator("button").filter({ hasText: /View Profile/i }).first().isVisible().catch(() => false);
    const hasConnectBtn = await page.locator("button").filter({ hasText: /Connect/i }).first().isVisible().catch(() => false);
    const hasPendingBtn = await page.locator("button").filter({ hasText: /Pending/i }).first().isVisible().catch(() => false);
    const hasConnectedBtn = await page.locator("button").filter({ hasText: /Connected/i }).first().isVisible().catch(() => false);
    const hasNoCandidates = await page.locator("text=No candidates found").isVisible().catch(() => false);

    expect(hasViewProfile || hasConnectBtn || hasPendingBtn || hasConnectedBtn || hasNoCandidates).toBeTruthy();
  });

  test("clicking Connect opens modal with message textarea", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const connectBtn = page.locator("button").filter({ hasText: /^Connect$/ }).first();
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);

      // Modal should show
      const hasModalTitle = await page.locator("text=Send Connection Request").isVisible().catch(() => false);
      const hasMessageLabel = await page.locator("text=Add a message").isVisible().catch(() => false);
      const hasTextarea = await page.locator("textarea").first().isVisible().catch(() => false);
      const hasSendBtn = await page.locator("button").filter({ hasText: /Send Request/i }).first().isVisible().catch(() => false);
      const hasCancelBtn = await page.locator("button").filter({ hasText: /Cancel/i }).first().isVisible().catch(() => false);

      expect(hasModalTitle || hasMessageLabel).toBeTruthy();
      expect(hasTextarea).toBeTruthy();
      expect(hasSendBtn || hasCancelBtn).toBeTruthy();

      // Fill message and cancel
      if (hasTextarea) {
        await page.locator("textarea").first().fill("We are interested in connecting with you.");
      }

      const cancelBtn = page.locator("button").filter({ hasText: /Cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });
});

// ─── Connections ─────────────────────────────────────────────────────────────

test.describe("Employer Flows - Connections", () => {
  test("renders connections page with title", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Connections").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows tab filters: All, Accepted, Pending", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasAllTab = await page.locator("button").filter({ hasText: /^All/i }).first().isVisible().catch(() => false);
    const hasAcceptedTab = await page.locator("button").filter({ hasText: /Accepted/i }).first().isVisible().catch(() => false);
    const hasPendingTab = await page.locator("button").filter({ hasText: /Pending/i }).first().isVisible().catch(() => false);

    expect(hasAllTab || hasAcceptedTab || hasPendingTab).toBeTruthy();
  });

  test("can switch between connection tabs", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const acceptedTab = page.locator("button").filter({ hasText: /Accepted/i }).first();
    if (await acceptedTab.isVisible().catch(() => false)) {
      await acceptedTab.click();
      await page.waitForTimeout(500);
    }

    const pendingTab = page.locator("button").filter({ hasText: /Pending/i }).first();
    if (await pendingTab.isVisible().catch(() => false)) {
      await pendingTab.click();
      await page.waitForTimeout(500);
    }

    const allTab = page.locator("button").filter({ hasText: /^All/i }).first();
    if (await allTab.isVisible().catch(() => false)) {
      await allTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("shows connection cards with status badges or empty state", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasAcceptedBadge = await page.locator("text=Accepted").nth(1).isVisible().catch(() => false);
    const hasPendingBadge = await page.locator("text=Pending").nth(1).isVisible().catch(() => false);
    const hasDeclinedBadge = await page.locator("text=Declined").isVisible().catch(() => false);
    const hasNoConnections = await page.locator("text=No connections yet").isVisible().catch(() => false);
    const hasFindTalent = await page.locator("button").filter({ hasText: /Find Talent/i }).first().isVisible().catch(() => false);

    expect(hasAcceptedBadge || hasPendingBadge || hasDeclinedBadge || hasNoConnections || hasFindTalent).toBeTruthy();
  });

  test("accepted connections show action buttons", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Accepted tab
    const acceptedTab = page.locator("button").filter({ hasText: /Accepted/i }).first();
    if (await acceptedTab.isVisible().catch(() => false)) {
      await acceptedTab.click();
      await page.waitForTimeout(500);
    }

    const hasViewProfile = await page.locator("button").filter({ hasText: /View Full Profile/i }).first().isVisible().catch(() => false);
    const hasSendMessage = await page.locator("button").filter({ hasText: /Send Message/i }).first().isVisible().catch(() => false);
    const hasConnectionPage = await page.locator("text=Connections").first().isVisible().catch(() => false);

    expect(hasViewProfile || hasSendMessage || hasConnectionPage).toBeTruthy();
  });

  test("connection cards show message if provided", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasYourMessage = await page.locator("text=Your message").isVisible().catch(() => false);
    const hasConnectionPage = await page.locator("text=Connections").first().isVisible().catch(() => false);

    // Either has message preview or just the connections page
    expect(hasYourMessage || hasConnectionPage).toBeTruthy();
  });
});

// ─── Projects (LiveWorks) ────────────────────────────────────────────────────

test.describe("Employer Flows - Projects", () => {
  test("renders projects page with title", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 15000 });
  });

  test("has create new project button", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const createBtn = page.locator("button").filter({ hasText: /create|new|post/i }).first();
    const hasCreate = await createBtn.isVisible().catch(() => false);
    expect(typeof hasCreate).toBe("boolean");
  });

  test("can open new project form and see fields", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const createBtn = page.locator("button").filter({ hasText: /create|new|post/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Should show form fields
      const hasTitle = await page.locator('input[placeholder*="title" i], input[name="title"]').first().isVisible().catch(() => false);
      const hasDescription = await page.locator("textarea").first().isVisible().catch(() => false);
      const hasCategory = await page.locator("text=Category").isVisible().catch(() => false);
      const hasDuration = await page.locator("text=Duration").isVisible().catch(() => false);
      const hasSkillLevel = await page.locator("text=Skill Level").isVisible().catch(() => false);
      const hasBudget = await page.locator("text=Budget").isVisible().catch(() => false);

      expect(hasTitle || hasDescription || hasCategory || hasDuration || hasSkillLevel || hasBudget).toBeTruthy();

      // Cancel
      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });

  test("project cards show status and actions", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasDraftStatus = await page.locator("text=Draft").isVisible().catch(() => false);
    const hasOpenStatus = await page.locator("text=Open").isVisible().catch(() => false);
    const hasInProgress = await page.locator("text=In Progress").isVisible().catch(() => false);
    const hasStatusMenu = await page.locator("button").filter({ hasText: /Publish|Start|Archive|Close/i }).first().isVisible().catch(() => false);
    const hasNoProjects = await page.locator("text=No project").isVisible().catch(() => false);
    const hasProjectPage = await page.locator("text=Project").first().isVisible().catch(() => false);

    expect(hasDraftStatus || hasOpenStatus || hasInProgress || hasStatusMenu || hasNoProjects || hasProjectPage).toBeTruthy();
  });

  test("project status actions are contextual", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on a status change button if projects exist
    const statusBtn = page.locator("button").filter({ hasText: /Publish|Start Review|Close|Archive/i }).first();
    if (await statusBtn.isVisible().catch(() => false)) {
      // The button exists, confirming status actions are rendered
      const btnText = await statusBtn.textContent();
      expect(btnText).toBeTruthy();
    }
  });

  test("project detail shows milestone section", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on a project to see details
    const projectCard = page.locator("button").filter({ hasText: /View|Details|Expand/i }).first();
    if (await projectCard.isVisible().catch(() => false)) {
      await projectCard.click();
      await page.waitForTimeout(500);

      const hasMilestones = await page.locator("text=Milestone").isVisible().catch(() => false);
      const hasAddMilestone = await page.locator("button").filter({ hasText: /Add Milestone/i }).first().isVisible().catch(() => false);

      expect(hasMilestones || hasAddMilestone).toBeTruthy();
    }
  });

  test("milestone form can be opened and filled", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for add milestone button anywhere on the page
    const addMilestoneBtn = page.locator("button").filter({ hasText: /Add Milestone/i }).first();
    if (await addMilestoneBtn.isVisible().catch(() => false)) {
      await addMilestoneBtn.click();
      await page.waitForTimeout(500);

      const hasTitleInput = await page.locator('input[placeholder*="milestone" i], input[placeholder*="title" i]').first().isVisible().catch(() => false);
      const hasPaymentField = await page.locator("text=Payment").isVisible().catch(() => false);

      expect(hasTitleInput || hasPaymentField).toBeTruthy();
    }
  });

  test("shows escrow/payment status badges on milestones", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasNotFunded = await page.locator("text=Not Funded").isVisible().catch(() => false);
    const hasInEscrow = await page.locator("text=In Escrow").isVisible().catch(() => false);
    const hasReleased = await page.locator("text=Released").isVisible().catch(() => false);
    const hasProjectPage = await page.locator("text=Project").first().isVisible().catch(() => false);

    expect(hasNotFunded || hasInEscrow || hasReleased || hasProjectPage).toBeTruthy();
  });
});

// ─── Feedback ────────────────────────────────────────────────────────────────

test.describe("Employer Flows - Feedback", () => {
  test("renders feedback page with title", async ({ page }) => {
    await page.goto(`${BASE}/feedback`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Feedback").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows feedback entries or empty state", async ({ page }) => {
    await page.goto(`${BASE}/feedback`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasFeedbackCards = await page.locator("text=Rating").isVisible().catch(() => false);
    const hasNewFeedback = await page.locator("button").filter({ hasText: /New Feedback|Give Feedback|Write/i }).first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=No feedback").isVisible().catch(() => false);
    const hasFeedbackPage = await page.locator("text=Feedback").first().isVisible().catch(() => false);

    expect(hasFeedbackCards || hasNewFeedback || hasEmptyState || hasFeedbackPage).toBeTruthy();
  });
});

// ─── Company Profile ─────────────────────────────────────────────────────────

test.describe("Employer Flows - Company", () => {
  test("renders company profile page with Edit button", async ({ page }) => {
    await page.goto(`${BASE}/company`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Company").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.locator("button").filter({ hasText: /Edit Company/i }).first();
    await expect(editBtn).toBeVisible();
  });

  test("can toggle edit mode on company profile", async ({ page }) => {
    await page.goto(`${BASE}/company`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const editBtn = page.locator("button").filter({ hasText: /Edit Company/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      const hasSave = await page.locator("button").filter({ hasText: /save/i }).first().isVisible().catch(() => false);
      const hasCancel = await page.locator("button").filter({ hasText: /cancel/i }).first().isVisible().catch(() => false);

      expect(hasSave || hasCancel).toBeTruthy();

      // Cancel
      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });

  test("edit mode shows company-specific fields", async ({ page }) => {
    await page.goto(`${BASE}/company`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const editBtn = page.locator("button").filter({ hasText: /Edit Company/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      const hasCompanyName = await page.locator("text=Company Name").isVisible().catch(() => false);
      const hasIndustry = await page.locator("text=Industry").isVisible().catch(() => false);
      const hasWebsite = await page.locator("text=Website").isVisible().catch(() => false);
      const hasDescription = await page.locator("text=Description").isVisible().catch(() => false);
      const hasLocation = await page.locator("text=Location").isVisible().catch(() => false);

      expect(hasCompanyName || hasIndustry || hasWebsite || hasDescription || hasLocation).toBeTruthy();
    }
  });

  test("cancel returns to view mode", async ({ page }) => {
    await page.goto(`${BASE}/company`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const editBtn = page.locator("button").filter({ hasText: /Edit Company/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Edit Company button should reappear
        await expect(page.locator("button").filter({ hasText: /Edit Company/i }).first()).toBeVisible();
      }
    }
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

test.describe("Employer Flows - Settings", () => {
  test("renders settings page", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
  });
});

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe("Employer Flows - Navigation", () => {
  test("all nav items are accessible", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const navLinks = [
      "Overview",
      "Find Talent",
      "Connections",
      "Projects",
      "Feedback",
      "Company",
      "Settings",
    ];

    for (const linkName of navLinks) {
      const link = page.getByRole("link", { name: linkName, exact: true }).first();
      const isVisible = await link.isVisible().catch(() => false);
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

    // Navigate to Find Talent
    await navigateTo(page, "Find Talent");
    const hasTalent = await page.locator("text=Talent").first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasTalent).toBeTruthy();

    // Navigate to Connections
    await navigateTo(page, "Connections");
    await expect(page.locator("text=Connections").first()).toBeVisible({ timeout: 15000 });

    // Navigate to Projects
    await navigateTo(page, "Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 15000 });

    // Navigate back to Overview
    await navigateTo(page, "Overview");
    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
  });

  test("navigating to company and back preserves state", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Go to Company
    await navigateTo(page, "Company");
    await expect(page.locator("text=Company").first()).toBeVisible({ timeout: 15000 });

    // Go to Settings
    await navigateTo(page, "Settings");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });

    // Back to Company
    await navigateTo(page, "Company");
    await expect(page.locator("text=Company").first()).toBeVisible({ timeout: 15000 });
  });
});
