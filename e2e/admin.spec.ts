import { test, expect } from "@playwright/test";

const BASE = "/dashboard/admin";

async function navigateTo(page: any, name: string) {
  const menuBtn = page.locator('button:has(svg.lucide-menu)');
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("Admin Dashboard - Full E2E", () => {
  test("loads overview page with system stats", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });

  test("navigates to Users", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Users");
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator("text=User").first()).toBeVisible();
  });

  test("navigates to TalentVisa", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "TalentVisa");
    await expect(page).toHaveURL(/\/talentvisa/);
    await expect(page.locator("text=TalentVisa").first()).toBeVisible();
  });

  test("navigates to Employers", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Employers");
    await expect(page).toHaveURL(/\/employers/);
    await expect(page.locator("text=Employer").first()).toBeVisible();
  });

  test("navigates to Schools", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Schools");
    await expect(page).toHaveURL(/\/schools/);
    await expect(page.locator("text=School").first()).toBeVisible();
  });

  test("navigates to Communications", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Communications");
    await expect(page).toHaveURL(/\/communications/);
    await expect(page.locator("text=Communication").first()).toBeVisible();
  });

  test("navigates to Reports", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Reports");
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.locator("text=Report").first()).toBeVisible();
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
      "/users",
      "/talentvisa",
      "/employers",
      "/schools",
      "/communications",
      "/reports",
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
