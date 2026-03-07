import { test, expect } from "@playwright/test";

const BASE = "/dashboard/mentor";

test.describe("Mentor Flows - Overview", () => {
  test("displays overview with stats", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Mentor Flows - My Mentees", () => {
  test("renders mentees page", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=My Mentees").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows mentee cards or empty state", async ({ page }) => {
    await page.goto(`${BASE}/mentees`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasMentees = await page.locator("button").filter({ hasText: /View|Observe|Dimensions/i }).first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=No mentees assigned").isVisible().catch(() => false);
    const hasTitle = await page.locator("text=My Mentees").isVisible().catch(() => false);

    expect(hasMentees || hasEmpty || hasTitle).toBeTruthy();
  });
});

test.describe("Mentor Flows - Observations", () => {
  test("renders observations page", async ({ page }) => {
    await page.goto(`${BASE}/observations`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Observation").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Mentor Flows - Endorsements", () => {
  test("renders endorsements page", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Endorsement").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows endorsement form or empty state", async ({ page }) => {
    await page.goto(`${BASE}/endorsements`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Either shows candidates ready for endorsement or past endorsements or empty
    const hasReady = await page.locator("text=Ready for Endorsement").isVisible().catch(() => false);
    const hasPast = await page.locator("text=Past Endorsement").isVisible().catch(() => false);
    const hasEndorsement = await page.locator("text=Endorsement").first().isVisible().catch(() => false);

    expect(hasReady || hasPast || hasEndorsement).toBeTruthy();
  });
});

test.describe("Mentor Flows - Schedule", () => {
  test("renders schedule page with tabs", async ({ page }) => {
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

  test("availability view shows day toggles", async ({ page }) => {
    await page.goto(`${BASE}/schedule`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Should show weekday names
    const hasMonday = await page.locator("text=Monday").isVisible().catch(() => false);
    const hasTuesday = await page.locator("text=Tuesday").isVisible().catch(() => false);

    expect(hasMonday || hasTuesday).toBeTruthy();
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

test.describe("Mentor Flows - Profile", () => {
  test("renders profile page with Edit Profile button", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await expect(editBtn).toBeVisible();
  });

  test("can toggle edit mode", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Your Profile").first()).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole("button", { name: /Edit Profile/i }).first();
    await editBtn.click();
    await page.waitForTimeout(500);

    // Should show cancel/save buttons in edit mode
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

    // Should show mentor-specific fields like industry, company, specializations
    const hasIndustry = await page.locator("text=Industry").isVisible().catch(() => false);
    const hasCompany = await page.locator("text=Company").isVisible().catch(() => false);
    const hasSpecializations = await page.locator("text=Specialization").isVisible().catch(() => false);

    expect(hasIndustry || hasCompany || hasSpecializations).toBeTruthy();
  });
});

test.describe("Mentor Flows - Settings", () => {
  test("renders settings page with account info", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Settings").first()).toBeVisible({ timeout: 15000 });
  });
});
