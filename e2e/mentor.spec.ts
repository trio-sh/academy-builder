import { test, expect } from "@playwright/test";

const BASE = "/dashboard/mentor";

async function navigateTo(page: any, name: string) {
  const menuBtn = page.locator('button:has(svg.lucide-menu)');
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("Mentor Dashboard - Full E2E", () => {
  test("loads overview page", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });

  test("navigates to My Mentees", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "My Mentees");
    await expect(page).toHaveURL(/\/mentees/);
    await expect(page.locator("text=Mentee").first()).toBeVisible();
  });

  test("navigates to Observations", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Observations");
    await expect(page).toHaveURL(/\/observations/);
    await expect(page.locator("text=Observation").first()).toBeVisible();
  });

  test("navigates to Endorsements", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Endorsements");
    await expect(page).toHaveURL(/\/endorsements/);
    await expect(page.locator("text=Endorsement").first()).toBeVisible();
  });

  test("navigates to Schedule", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Schedule");
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.locator("text=Schedule").first()).toBeVisible();
  });

  test("navigates to Profile", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Profile");
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator("text=Profile").first()).toBeVisible();
  });

  test("navigates to Settings", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("text=Settings").first()).toBeVisible();
  });

  test("no console errors on overview load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("realtime") &&
        !e.includes("WebSocket") &&
        !e.includes("ERR_BLOCKED_BY_CLIENT") &&
        !e.includes("ERR_TUNNEL_CONNECTION_FAILED") &&
        !e.includes("ERR_NAME_NOT_RESOLVED") &&
        !e.includes("407") &&
        !e.includes("Proxy") &&
        !e.includes("Failed to load resource") &&
        !e.includes("CORS") &&
        !e.includes("TypeError: Failed to fetch") &&
        !e.includes("net::ERR_FAILED")
    );
    expect(realErrors.length).toBe(0);
  });

  test("all sidebar links are functional", async ({ page }) => {
    const paths = [
      "",
      "/mentees",
      "/observations",
      "/endorsements",
      "/schedule",
      "/profile",
      "/settings",
    ];

    for (const path of paths) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState("networkidle");
      const url = page.url();
      expect(url).not.toContain("/login");
      await expect(page.locator("text=Page not found")).not.toBeVisible();
    }
  });
});
