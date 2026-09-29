import { test, expect } from "@playwright/test";

const BASE = "/dashboard/employer";

async function navigateTo(page: any, name: string) {
  const menuBtn = page.locator('button:has(svg.lucide-menu)');
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("Employer Dashboard - Full E2E", () => {
  test("loads overview page", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Overview").first()).toBeVisible({ timeout: 15000 });
  });

  // RESTATED, AND THIS ONE IS NOT A WORDING CHANGE. "Find Talent" named a
  // talent-search surface an employer drove. That surface is gone: /search
  // now REDIRECTS to /reports, where an employer reads the Behavioral
  // Evidence Reports participants chose to make available. Asserting
  // toHaveURL(/\/search/) could not have passed, because the app no longer
  // stays there — and it should not.
  test("navigates to Available Reports", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Available Reports");
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole("banner")).toContainText("§ Available Reports");
    await expect(page.getByRole("heading", { name: "Available Reports" }).first()).toBeVisible();
  });

  // The two retired paths, kept as a test of their own rather than deleted:
  // an old bookmark must land somewhere correct, not on a blank route.
  test("the retired search and connections paths redirect", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/employer\/reports$/);

    await page.goto(`${BASE}/connections`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/employer\/messages$/);
  });

  // RESTATED. An employer holds no connection list. What exists is
  // Messages, and /connections redirects to it.
  test("navigates to Messages", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Messages");
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByRole("banner")).toContainText("§ Messages");
    await expect(page.getByRole("heading", { name: "Messages" }).first()).toBeVisible();
  });

  test("navigates to Projects", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Projects");
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator("text=Project").first()).toBeVisible();
  });

  // RESTATED. The label names who the feedback goes to, which is the point
  // of the surface: it is feedback about the product, not about a person.
  test("navigates to Feedback to The 3rd Academy", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Feedback to The 3rd Academy");
    await expect(page).toHaveURL(/\/feedback/);
    await expect(page.getByRole("banner")).toContainText("§ Feedback to The 3rd Academy");
    await expect(page.getByRole("heading", { name: "Employer Feedback" }).first()).toBeVisible();
  });

  // RESTATED. The nav label is "Your organization"; the page it opens is
  // still headed "Company Profile" and the route is still /company.
  test("navigates to Your organization", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Your organization");
    await expect(page).toHaveURL(/\/company/);
    await expect(page.getByRole("banner")).toContainText("§ Your organization");
    await expect(page.getByRole("heading", { name: "Company Profile" }).first()).toBeVisible();
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
    // Every path the sidebar actually offers, plus the two retired ones,
    // which must still resolve rather than dead-end.
    const paths = [
      "",
      "/reports",
      "/t3x",
      "/projects",
      "/feedback",
      "/messages",
      "/company",
      "/agent",
      "/settings",
      "/search",
      "/connections",
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
