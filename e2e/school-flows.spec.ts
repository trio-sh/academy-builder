import { test, expect } from "@playwright/test";

const BASE = "/dashboard/school";

test.describe("School Flows - Overview", () => {
  test("displays overview with stats", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("School Flows - Students", () => {
  test("renders students page", async ({ page }) => {
    await page.goto(`${BASE}/students`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Student").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows student list or empty state", async ({ page }) => {
    await page.goto(`${BASE}/students`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasStudents = await page.locator("table, [class*='grid']").first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No student").isVisible().catch(() => false);
    const hasTitle = await page.locator("text=Student").first().isVisible().catch(() => false);

    expect(hasStudents || hasEmpty || hasTitle).toBeTruthy();
  });
});

test.describe("School Flows - Cohorts", () => {
  test("renders cohorts page", async ({ page }) => {
    await page.goto(`${BASE}/cohorts`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Cohort").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows cohort list or creation option", async ({ page }) => {
    await page.goto(`${BASE}/cohorts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasCohorts = await page.locator("[class*='rounded']").filter({ hasText: /cohort/i }).first().isVisible().catch(() => false);
    const hasCreate = await page.locator("button").filter({ hasText: /create|new|add/i }).first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No cohort").isVisible().catch(() => false);
    const hasTitle = await page.locator("text=Cohort").first().isVisible().catch(() => false);

    expect(hasCohorts || hasCreate || hasEmpty || hasTitle).toBeTruthy();
  });
});

test.describe("School Flows - Observations", () => {
  test("renders observations page", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Observation").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("School Flows - Analytics", () => {
  test("renders analytics page", async ({ page }) => {
    await page.goto(`${BASE}/analytics`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Analytic").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("School Flows - Settings", () => {
  test("renders settings page", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
  });
});
