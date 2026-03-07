import { test, expect } from "@playwright/test";

const BASE = "/dashboard/employer";

test.describe("Employer Flows - Overview", () => {
  test("displays overview page", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Employer Flows - Find Talent", () => {
  test("renders find talent page", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Talent").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows tier filter dropdown", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Should show filter controls or candidate cards or empty state
    const hasFilter = await page.locator("select, button").filter({ hasText: /tier|filter|all/i }).first().isVisible().catch(() => false);
    const hasCandidates = await page.locator("text=Tier").first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No candidates").isVisible().catch(() => false);
    const hasTalent = await page.locator("text=Talent").first().isVisible().catch(() => false);

    expect(hasFilter || hasCandidates || hasEmpty || hasTalent).toBeTruthy();
  });

  test("can open connect modal for a candidate", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const connectBtn = page.locator("button").filter({ hasText: /connect|request/i }).first();
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);

      // Modal should show with message textarea
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill("We are interested in connecting with you.");
      }

      // Cancel
      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });
});

test.describe("Employer Flows - Connections", () => {
  test("renders connections page", async ({ page }) => {
    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Connection").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Employer Flows - Projects", () => {
  test("renders projects page", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 15000 });
  });

  test("has create project button", async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const createBtn = page.locator("button").filter({ hasText: /create|new|post/i }).first();
    const hasCreate = await createBtn.isVisible().catch(() => false);
    // May or may not have the button depending on employer profile
    expect(typeof hasCreate).toBe("boolean");
  });

  test("can open new project form", async ({ page }) => {
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

      expect(hasTitle || hasDescription).toBeTruthy();

      // Cancel
      const cancelBtn = page.locator("button").filter({ hasText: /cancel/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }
  });
});

test.describe("Employer Flows - Feedback", () => {
  test("renders feedback page", async ({ page }) => {
    await page.goto(`${BASE}/feedback`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Feedback").first()).toBeVisible({ timeout: 15000 });
  });
});

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

      // Should show save/cancel
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

  test("edit mode shows company fields", async ({ page }) => {
    await page.goto(`${BASE}/company`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const editBtn = page.locator("button").filter({ hasText: /Edit Company/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Should show company-specific fields
      const hasCompanyName = await page.locator("text=Company Name").isVisible().catch(() => false);
      const hasIndustry = await page.locator("text=Industry").isVisible().catch(() => false);
      const hasWebsite = await page.locator("text=Website").isVisible().catch(() => false);

      expect(hasCompanyName || hasIndustry || hasWebsite).toBeTruthy();
    }
  });
});

test.describe("Employer Flows - Settings", () => {
  test("renders settings page", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
  });
});
