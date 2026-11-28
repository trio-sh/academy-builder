/**
 * Nothing about the advertisements is public: a signed-out visitor cannot reach the staging page, and no public page carries an advertisement.
 */
import { test, expect } from "@playwright/test";

test.describe("advertisements are not public", () => {
  test("a signed-out visitor is sent to sign in, not shown the staging page", async ({ page }) => {
    await page.goto("/dashboard/admin/adverts");
    await expect(page).toHaveURL(/\/login\b/);
    await expect(page.getByTestId("adverts-staging")).toHaveCount(0);
  });

  test("no public page carries an advertisement", async ({ page }) => {
    for (const path of ["/", "/employers", "/get-started", "/platform", "/schools", "/about"]) {
      await page.goto(path);
      const body = await page.locator("body").innerText();
      expect(body, path).not.toContain("Join the interest list");
      expect(body, path).not.toContain("Coming soon. Free");
      expect(body, path).not.toContain("hello@the3rdacademy.com?subject=");
    }
  });
});
