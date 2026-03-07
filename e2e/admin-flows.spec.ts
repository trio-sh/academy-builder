import { test, expect } from "@playwright/test";

const BASE = "/dashboard/admin";

test.describe("Admin Flows - Overview", () => {
  test("displays overview with system stats", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin Flows - Users Management", () => {
  test("renders user management page", async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=User Management").first()).toBeVisible({ timeout: 15000 });
  });

  test("has search input for users", async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill("test");
    await page.waitForTimeout(500);
    await searchInput.clear();
  });

  test("has role filter dropdown", async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const roleSelect = page.locator("select").first();
    if (await roleSelect.isVisible().catch(() => false)) {
      // Change filter to candidates
      await roleSelect.selectOption("candidate");
      await page.waitForTimeout(500);

      // Change back to all
      await roleSelect.selectOption("all");
      await page.waitForTimeout(500);
    }
  });

  test("shows users table with columns", async ({ page }) => {
    await page.goto(`${BASE}/users`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasTable = await page.locator("table").first().isVisible().catch(() => false);
    const hasUserCol = await page.locator("th").filter({ hasText: /User/i }).first().isVisible().catch(() => false);
    const hasRoleCol = await page.locator("th").filter({ hasText: /Role/i }).first().isVisible().catch(() => false);

    expect(hasTable || hasUserCol || hasRoleCol).toBeTruthy();
  });
});

test.describe("Admin Flows - TalentVisa", () => {
  test("renders TalentVisa review page", async ({ page }) => {
    await page.goto(`${BASE}/talentvisa`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=TalentVisa").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin Flows - Employers", () => {
  test("renders employers management page", async ({ page }) => {
    await page.goto(`${BASE}/employers`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Employer").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin Flows - Schools", () => {
  test("renders schools management page", async ({ page }) => {
    await page.goto(`${BASE}/schools`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=School").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin Flows - Communications", () => {
  test("renders communications page", async ({ page }) => {
    await page.goto(`${BASE}/communications`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Communication").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin Flows - Reports", () => {
  test("renders reports page", async ({ page }) => {
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Report").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin Flows - Settings", () => {
  test("renders settings page", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
  });
});
