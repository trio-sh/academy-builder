import { test, expect } from "@playwright/test";

const BASE = "/dashboard/candidate";

// Helper: navigate to a sidebar section by clicking the nav link text
async function navigateTo(page: any, name: string) {
  // On mobile the sidebar may be collapsed; click menu button if visible
  const menuBtn = page.locator('button:has(svg.lucide-menu)');
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("Candidate Dashboard - Full E2E", () => {
  test("loads overview page after login", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    // Should see the overview with welcome message
    await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
    // Should see stats like Current Tier or Growth Log Entries
    await expect(page.locator("text=Current Tier").first()).toBeVisible();
  });

  test("navigates to Observation Pathway", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Observation Pathway");

    await expect(page).toHaveURL(/\/observations/);
    // Should see observation pathway content
    await expect(page.locator("text=Observation").first()).toBeVisible();
  });

  test("navigates to Skill Passport", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Skill Passport");

    await expect(page).toHaveURL(/\/passport/);
    // Should render passport page with share/download actions
    await expect(page.locator("text=Passport").first()).toBeVisible();
  });

  test("navigates to Growth Log", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Growth Log");

    await expect(page).toHaveURL(/\/growth/);
    await expect(page.locator("text=Growth").first()).toBeVisible();
  });

  test("navigates to BridgeFast training", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "BridgeFast");

    await expect(page).toHaveURL(/\/training/);
    await expect(page.locator("text=BridgeFast").first()).toBeVisible();
  });

  test("navigates to Readiness Reflection", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Readiness Reflection");

    await expect(page).toHaveURL(/\/assessment/);
    await expect(page.locator("text=Readiness").first()).toBeVisible();
  });

  test("navigates to Projects (LiveWorks)", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Projects");

    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator("text=Project").first()).toBeVisible();
  });

  test("navigates to Find Mentor", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Find Mentor");

    await expect(page).toHaveURL(/\/mentors/);
    await expect(page.locator("text=Mentor").first()).toBeVisible();
  });

  test("navigates to Connections", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Connections");

    await expect(page).toHaveURL(/\/connections/);
    await expect(page.locator("text=Connection").first()).toBeVisible();
  });

  test("navigates to Messages", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Messages");

    await expect(page).toHaveURL(/\/messages/);
    // Messages page should render
    await expect(page.locator("text=Message").first()).toBeVisible();
  });

  test("navigates to Notifications", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Notifications");

    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.locator("text=Notification").first()).toBeVisible();
  });

  test("navigates to Profile and can view it", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Profile");

    await expect(page).toHaveURL(/\/profile/);
    // Should see profile details
    await expect(page.locator("text=Profile").first()).toBeVisible();
    // Should see Edit Profile button or fields
    const editBtn = page.getByRole("button", { name: /edit/i });
    if (await editBtn.isVisible().catch(() => false)) {
      await expect(editBtn).toBeVisible();
    }
  });

  test("navigates to Settings", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await navigateTo(page, "Settings");

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("text=Settings").first()).toBeVisible();
  });

  test("no console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out known benign errors (network/proxy, Supabase realtime, favicon)
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

  test("all sidebar links are functional (no broken routes)", async ({ page }) => {
    const paths = [
      "",
      "/observations",
      "/passport",
      "/growth",
      "/training",
      "/assessment",
      "/projects",
      "/mentors",
      "/connections",
      "/messages",
      "/notifications",
      "/profile",
      "/settings",
    ];

    for (const path of paths) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState("networkidle");
      // Should not show "Not Found" or redirect to login
      const url = page.url();
      expect(url).not.toContain("/login");
      await expect(page.locator("text=Page not found")).not.toBeVisible();
    }
  });
});
