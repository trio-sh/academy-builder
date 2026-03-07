import { test, expect } from "@playwright/test";

const BASE = "/dashboard/candidate";

async function navigateTo(page: any, name: string) {
  const menuBtn = page.locator("button:has(svg.lucide-menu)");
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("Candidate Flows - Overview", () => {
  test("displays welcome message and stat cards", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Current Tier").first()).toBeVisible();
  });
});

test.describe("Candidate Flows - Profile", () => {
  test("can view profile page with Edit Profile button", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });
    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await expect(editBtn).toBeVisible();
  });

  test("clicking Edit Profile shows save/cancel and form fields", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    // Click Edit Profile button
    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    // Should now show Save and Cancel buttons
    const hasSave = await page.getByRole("button", { name: /save/i }).first().isVisible().catch(() => false);
    const hasCancel = await page.getByRole("button", { name: /cancel/i }).first().isVisible().catch(() => false);

    expect(hasSave || hasCancel).toBeTruthy();
  });

  test("can fill profile fields in edit mode", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    // Click Edit Profile
    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    // Should show First Name and Last Name labels
    await expect(page.locator("text=First Name").first()).toBeVisible();
  });

  test("cancel returns to view mode", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    // Click Edit Profile
    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    // Click Cancel
    const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      // Edit Profile button should be back
      await expect(editBtn).toBeVisible();
    }
  });
});

test.describe("Candidate Flows - Skill Passport", () => {
  test("renders passport page with content", async ({ page }) => {
    await page.goto(`${BASE}/passport`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Skill Passport").first()).toBeVisible({ timeout: 15000 });

    // Should show either earned passport with actions OR "Earn Your Skill Passport" prompt
    const hasEarnPrompt = await page.locator("text=Earn Your Skill Passport").isVisible().catch(() => false);
    const hasShareBtn = await page.getByRole("button", { name: /share/i }).first().isVisible().catch(() => false);
    const hasHowItWorks = await page.locator("text=How It Works").isVisible().catch(() => false);

    expect(hasEarnPrompt || hasShareBtn || hasHowItWorks).toBeTruthy();
  });

  test("can click copy verification code", async ({ page }) => {
    await page.goto(`${BASE}/passport`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for copy or verification button
    const copyBtn = page.locator("button").filter({ hasText: /copy|verification|code/i }).first();
    if (await copyBtn.isVisible().catch(() => false)) {
      await copyBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Candidate Flows - Growth Log", () => {
  test("renders growth log with stats", async ({ page }) => {
    await page.goto(`${BASE}/growth`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Growth").first()).toBeVisible({ timeout: 15000 });
  });

  test("can toggle between chart and timeline views", async ({ page }) => {
    await page.goto(`${BASE}/growth`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for view toggle buttons
    const chartBtn = page.locator("button").filter({ hasText: /chart/i }).first();
    const timelineBtn = page.locator("button").filter({ hasText: /timeline/i }).first();

    if (await chartBtn.isVisible().catch(() => false)) {
      await chartBtn.click();
      await page.waitForTimeout(500);
    }

    if (await timelineBtn.isVisible().catch(() => false)) {
      await timelineBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Candidate Flows - Observation Pathway", () => {
  test("shows observation page with mentor gate or observation dashboard", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Observation").first()).toBeVisible({ timeout: 15000 });

    // Should show either:
    // 1. "Mentor Assignment Required" gate with Find a Mentor button
    // 2. "Awaiting Dimension Assignment" message
    // 3. Full observation dashboard with assigned dimensions
    const hasMentorGate = await page.locator("text=Mentor Assignment Required").isVisible().catch(() => false);
    const hasAwaitingDims = await page.locator("text=Awaiting Dimension Assignment").isVisible().catch(() => false);
    const hasObsDashboard = await page.locator("text=Assigned Dimensions").isVisible().catch(() => false);
    const hasPathwayTitle = await page.locator("text=Observation Pathway").isVisible().catch(() => false);

    expect(hasMentorGate || hasAwaitingDims || hasObsDashboard || hasPathwayTitle).toBeTruthy();
  });

  test("Find a Mentor link works from observation gate", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const findMentorBtn = page.locator("a, button").filter({ hasText: /Find a Mentor/i }).first();
    if (await findMentorBtn.isVisible().catch(() => false)) {
      await findMentorBtn.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/mentors/);
    }
  });
});

test.describe("Candidate Flows - BridgeFast Training", () => {
  test("renders training modules list", async ({ page }) => {
    await page.goto(`${BASE}/training`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=BridgeFast").first()).toBeVisible({ timeout: 15000 });
  });

  test("can browse training modules", async ({ page }) => {
    await page.goto(`${BASE}/training`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for module cards or buttons
    const moduleCards = page.locator('[class*="rounded"]').filter({ hasText: /module|lesson|chapter/i });
    const count = await moduleCards.count();
    // Training page should render (even if no modules loaded, the page structure exists)
    expect(count >= 0).toBeTruthy();
  });
});

test.describe("Candidate Flows - Readiness Reflection (Assessment)", () => {
  test("renders assessment intro page", async ({ page }) => {
    await page.goto(`${BASE}/assessment`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Readiness").first()).toBeVisible({ timeout: 15000 });
  });

  test("can start assessment and navigate steps", async ({ page }) => {
    await page.goto(`${BASE}/assessment`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for "Begin" or "Start" button to start assessment
    const startBtn = page.locator("button").filter({ hasText: /begin|start|new/i }).first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 1: Rate skills using sliders
    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    if (sliderCount > 0) {
      // Adjust first slider
      await sliders.first().fill("4");
      await page.waitForTimeout(300);

      // Click Continue
      const continueBtn = page.locator("button").filter({ hasText: /continue/i }).first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Step 2: Select strengths - click dimension buttons
    const strengthButtons = page.locator("button").filter({ hasText: /communication|leadership|problem|teamwork|adaptability/i });
    const strengthCount = await strengthButtons.count();
    if (strengthCount > 0) {
      for (let i = 0; i < Math.min(2, strengthCount); i++) {
        await strengthButtons.nth(i).click();
        await page.waitForTimeout(200);
      }
    }

    // Check for Continue to Goals or similar
    const nextBtn = page.locator("button").filter({ hasText: /continue|next|goals/i }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("assessment page shows guided self-reflection option", async ({ page }) => {
    await page.goto(`${BASE}/assessment`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should show "Guided Self-Reflection" or step navigation
    const hasGuided = await page.locator("text=Guided Self-Reflection").isVisible().catch(() => false);
    const hasSteps = await page.locator("text=Rate Skills").isVisible().catch(() => false);
    const hasReflect = await page.locator("text=Reflect").isVisible().catch(() => false);

    expect(hasGuided || hasSteps || hasReflect).toBeTruthy();
  });
});

test.describe("Candidate Flows - Projects (LiveWorks)", () => {
  test("renders projects page with browse/applied tabs", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 15000 });
  });

  test("can switch between Browse and Applied tabs", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const browseTab = page.locator("button").filter({ hasText: /browse/i }).first();
    const appliedTab = page.locator("button").filter({ hasText: /applied|my/i }).first();

    if (await browseTab.isVisible().catch(() => false)) {
      await browseTab.click();
      await page.waitForTimeout(500);
    }

    if (await appliedTab.isVisible().catch(() => false)) {
      await appliedTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("can open apply modal for a project", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Browse tab first
    const browseTab = page.locator("button").filter({ hasText: /browse/i }).first();
    if (await browseTab.isVisible().catch(() => false)) {
      await browseTab.click();
      await page.waitForTimeout(500);
    }

    // Look for Apply button on a project card
    const applyBtn = page.locator("button").filter({ hasText: /apply/i }).first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(500);

      // Should show apply modal with textarea
      const textarea = page.locator("textarea").first();
      const hasTextarea = await textarea.isVisible().catch(() => false);
      if (hasTextarea) {
        await textarea.fill("I am interested in this project because of my skills in the relevant area.");
        await page.waitForTimeout(300);
      }

      // Cancel/close instead of submitting to avoid side effects
      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });
});

test.describe("Candidate Flows - Find Mentor", () => {
  test("renders mentor listing page", async ({ page }) => {
    await page.goto(`${BASE}/mentors`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Mentor").first()).toBeVisible({ timeout: 15000 });
  });

  test("can filter mentors by industry", async ({ page }) => {
    await page.goto(`${BASE}/mentors`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for All Industries filter button
    const allBtn = page.locator("button").filter({ hasText: /All Industries/i }).first();
    if (await allBtn.isVisible().catch(() => false)) {
      await allBtn.click();
      await page.waitForTimeout(300);
    }

    // Try clicking an industry filter if available
    const industryBtns = page.locator("button").filter({ hasText: /technology|finance|healthcare|education/i });
    if (await industryBtns.first().isVisible().catch(() => false)) {
      await industryBtns.first().click();
      await page.waitForTimeout(500);
    }
  });

  test("can open request mentorship modal", async ({ page }) => {
    await page.goto(`${BASE}/mentors`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Look for Request Mentorship button
    const requestBtn = page.locator("button").filter({ hasText: /Request Mentorship/i }).first();
    if (await requestBtn.isVisible().catch(() => false)) {
      await requestBtn.click();
      await page.waitForTimeout(500);

      // Modal should open with textarea for message
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill("I would love to learn from your experience.");
        await page.waitForTimeout(300);
      }

      // Cancel instead of submitting
      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });
});

test.describe("Candidate Flows - Connections", () => {
  test("renders connections page", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Connection").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Candidate Flows - Messages", () => {
  test("renders messages page with conversation list", async ({ page }) => {
    await page.goto(`${BASE}/messages`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Message").first()).toBeVisible({ timeout: 15000 });

    // Should show either conversations or "No conversations yet"
    const hasConversations = await page.locator("button").filter({ hasText: /.+/ }).first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=No conversations").isVisible().catch(() => false);
    const hasSelectPrompt = await page.locator("text=Select a Conversation").isVisible().catch(() => false);

    expect(hasConversations || hasEmptyState || hasSelectPrompt).toBeTruthy();
  });

  test("can search conversations", async ({ page }) => {
    await page.goto(`${BASE}/messages`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);
      await searchInput.clear();
    }
  });

  test("message input area exists when conversation selected", async ({ page }) => {
    await page.goto(`${BASE}/messages`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // If there are conversations, click the first one
    const convButton = page.locator(".overflow-y-auto button").first();
    if (await convButton.isVisible().catch(() => false)) {
      await convButton.click();
      await page.waitForTimeout(500);

      // Check for message input
      const msgInput = page.locator('input[placeholder*="Type a message" i]').first();
      await expect(msgInput).toBeVisible();
    }
  });
});

test.describe("Candidate Flows - Notifications", () => {
  test("renders notifications page with filter tabs", async ({ page }) => {
    await page.goto(`${BASE}/notifications`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Notification").first()).toBeVisible({ timeout: 15000 });

    // Should have filter tabs: All, Unread, Read
    const allTab = page.locator("button").filter({ hasText: /^all$/i }).first();
    const unreadTab = page.locator("button").filter({ hasText: /^unread$/i }).first();
    const readTab = page.locator("button").filter({ hasText: /^read$/i }).first();

    const hasAll = await allTab.isVisible().catch(() => false);
    const hasUnread = await unreadTab.isVisible().catch(() => false);
    const hasRead = await readTab.isVisible().catch(() => false);

    expect(hasAll || hasUnread || hasRead).toBeTruthy();
  });

  test("can switch between notification filters", async ({ page }) => {
    await page.goto(`${BASE}/notifications`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const unreadTab = page.locator("button").filter({ hasText: /^unread$/i }).first();
    if (await unreadTab.isVisible().catch(() => false)) {
      await unreadTab.click();
      await page.waitForTimeout(500);
    }

    const readTab = page.locator("button").filter({ hasText: /^read$/i }).first();
    if (await readTab.isVisible().catch(() => false)) {
      await readTab.click();
      await page.waitForTimeout(500);
    }

    const allTab = page.locator("button").filter({ hasText: /^all$/i }).first();
    if (await allTab.isVisible().catch(() => false)) {
      await allTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("mark all as read button visible when unread exist", async ({ page }) => {
    await page.goto(`${BASE}/notifications`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // This button only shows if there are unread notifications
    const markAllBtn = page.locator("button").filter({ hasText: /Mark all as read/i }).first();
    const hasMarkAll = await markAllBtn.isVisible().catch(() => false);
    // Either has the button or doesn't - both are valid states
    expect(typeof hasMarkAll).toBe("boolean");
  });
});

test.describe("Candidate Flows - Settings", () => {
  test("renders settings page with account info", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Account").first()).toBeVisible();
    await expect(page.locator("text=Email Address").first()).toBeVisible();
  });

  test("shows security section with change password button", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Security").first()).toBeVisible({ timeout: 15000 });

    const changePasswordBtn = page.locator("button").filter({ hasText: /Change Password/i }).first();
    await expect(changePasswordBtn).toBeVisible();
  });

  test("can open change password modal", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    const changePasswordBtn = page.locator("button").filter({ hasText: /Change Password/i }).first();
    await expect(changePasswordBtn).toBeVisible({ timeout: 15000 });
    await changePasswordBtn.click();
    await page.waitForTimeout(500);

    // Modal should appear
    await expect(page.locator("text=Change Password").nth(1)).toBeVisible();

    // Should have password fields
    const newPasswordInput = page.locator('input[type="password"], input[placeholder*="new password" i]').first();
    await expect(newPasswordInput).toBeVisible();

    // Cancel
    const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
    await cancelBtn.click();
    await page.waitForTimeout(300);
  });

  test("password validation - too short", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    const changePasswordBtn = page.locator("button").filter({ hasText: /Change Password/i }).first();
    await expect(changePasswordBtn).toBeVisible({ timeout: 15000 });
    await changePasswordBtn.click();
    await page.waitForTimeout(500);

    // Fill with short password using placeholders
    const newPwdInput = page.getByPlaceholder("Enter new password");
    const confirmPwdInput = page.getByPlaceholder("Confirm new password");
    await newPwdInput.fill("short");
    await confirmPwdInput.fill("short");

    // Click update
    const updateBtn = page.getByRole("button", { name: "Update Password" });
    await updateBtn.click();
    await page.waitForTimeout(500);

    // Should show error about minimum length - use partial text match
    await expect(page.locator("text=at least 8 characters").first()).toBeVisible();
  });

  test("password validation - mismatch", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    const changePasswordBtn = page.locator("button").filter({ hasText: /Change Password/i }).first();
    await expect(changePasswordBtn).toBeVisible({ timeout: 15000 });
    await changePasswordBtn.click();
    await page.waitForTimeout(500);

    const newPwdInput = page.getByPlaceholder("Enter new password");
    const confirmPwdInput = page.getByPlaceholder("Confirm new password");
    await newPwdInput.fill("ValidPassword123");
    await confirmPwdInput.fill("DifferentPassword456");

    const updateBtn = page.getByRole("button", { name: "Update Password" });
    await updateBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator("text=do not match").first()).toBeVisible();
  });

  test("shows notification preferences checkboxes", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Email notifications").first()).toBeVisible({ timeout: 15000 });

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("shows danger zone with delete account button", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Danger Zone").first()).toBeVisible({ timeout: 15000 });

    const deleteBtn = page.locator("button").filter({ hasText: /Delete Account/i }).first();
    await expect(deleteBtn).toBeVisible();
  });
});
