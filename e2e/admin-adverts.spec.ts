/**
 * The advertisements' staging page in the admin desk: the four advertisements as exported, their captions, alt text and links, and none of them published.
 */
import { test, expect } from "@playwright/test";
import { ADVERTS, altText, caption, advertLines } from "../src/content/adverts";

test.describe("Advertisements staging (administrator)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/admin/adverts");
    await expect(page.getByTestId("adverts-staging")).toBeVisible({ timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
  });

  test("is in the administrator's menu and shows four advertisements, all staged and none published", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Advertisements" }).first()).toBeVisible();
    for (const a of ADVERTS) {
      await expect(page.getByTestId(`staged-${a.id}`)).toBeVisible();
      await expect(page.getByTestId(`status-${a.id}`)).toHaveText("Staged · not published");
    }
    await expect(page.getByTestId("adverts-staging").getByText("Released", { exact: true })).toHaveCount(0);
  });

  for (const a of ADVERTS) {
    test(`${a.id}: both posters read exactly as the advertisement and fit their artboard`, async ({ page }) => {
      for (const [format, w, h] of [["portrait", 1080, 1350], ["landscape", 1200, 630]] as const) {
        const poster = page.getByTestId(`poster-${a.id}-${format}`);
        const m = await poster.evaluate((el) => {
          const inner = el.querySelector(".advert-inner") as HTMLElement;
          const lines = [...el.querySelectorAll(".advert-eyebrow, .advert-line, .advert-cta-main, .advert-cta-sub, .advert-fine")].map((n) => n.textContent);
          return { w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight, over: inner.scrollHeight - inner.clientHeight, lines };
        });
        expect([m.w, m.h], `${a.id} ${format} size`).toEqual([w, h]);
        expect(m.over, `${a.id} ${format} overflows its artboard`).toBeLessThanOrEqual(0);
        expect(m.lines, `${a.id} ${format} wording`).toEqual(advertLines(a));
      }
    });

    test(`${a.id}: the caption, the alt text and the link are there to paste`, async ({ page }) => {
      await expect(page.getByTestId(`caption-${a.id}`)).toHaveValue(caption(a));
      await expect(page.getByTestId(`alt-${a.id}`)).toHaveValue(altText(a));
      await expect(page.getByTestId(`href-${a.id}`)).toHaveText(a.cta.href);
      const cta = page.getByTestId(`advert-${a.id}-cta`);
      await expect(cta).toHaveAttribute("href", a.cta.href);
    });
  }

  test("the staging page is not part of any public page", async ({ page }) => {
    for (const path of ["/", "/employers", "/get-started"]) {
      await page.goto(path);
      const body = await page.locator("body").innerText();
      expect(body).not.toContain("Join the interest list");
      expect(body).not.toContain("Coming soon. Free");
    }
  });
});
