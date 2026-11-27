/**
 * The public home page: a live, three-dimensional page that still works for people who ask for less motion. No sign-in.
 */
import { test, expect } from "@playwright/test";

test.describe("home page, live", () => {
  test("the hero has a background video, a globe that is drawn, and a clock that ticks", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/");
    const video = page.locator("video[data-ambient=video]").first();
    await expect(video).toBeAttached();
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.loop && v.getAttribute("aria-hidden") === "true")).toBe(true);
    const drawn = await page.getByTestId("globe").first().locator("canvas").evaluate((c: HTMLCanvasElement) => {
      const g = c.getContext("2d")!; const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 20) n++;
      return n;
    });
    expect(drawn).toBeGreaterThan(500);                       // the canvas is not blank
    const clock = page.getByTestId("live-clock");
    const a = await clock.textContent(); await page.waitForTimeout(2200); const b = await clock.textContent();
    expect(b).not.toBe(a);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Credentials");
    expect(errors).toEqual([]);
  });

  test("the year-end block counts down second by second", async ({ page }) => {
    await page.goto("/");
    const secs = page.getByTestId("year-end-seconds");
    await secs.scrollIntoViewIfNeeded();
    const a = Number(await secs.textContent()); await page.waitForTimeout(2100); const b = Number(await secs.textContent());
    expect(b).not.toBe(a);
    await expect(page.getByTestId("year-end")).toContainText(/Year-end · 20\d\d/);
  });

  test("the year in the record shows days open, live, and no counts of people", async ({ page }) => {
    await page.goto("/");
    const band = page.getByTestId("year-in-record");
    await band.scrollIntoViewIfNeeded();
    await expect(band).toContainText("registration since 20 September 2026");
    const days = Number(await page.getByTestId("ledger-0").textContent());
    expect(days).toBeGreaterThanOrEqual(68);
    expect(await band.textContent()).not.toMatch(/people|participants/i);
  });

  test("a card tips toward the mouse in 3D", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("tilt-card").first();
    await card.scrollIntoViewIfNeeded();
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await page.waitForTimeout(400);
    const t = await card.evaluate((el) => getComputedStyle(el).transform);
    expect(t).not.toBe("none");
  });

  test("the video files are served and small enough for a page", async ({ request }) => {
    for (const f of ["hero", "winter", "globe-wide"]) {
      const r = await request.get(`/video/${f}.mp4`);
      expect(r.status(), f).toBe(200);
      expect(r.headers()["content-type"], f).toContain("video/mp4");
      expect((await r.body()).length, f).toBeLessThan(4_000_000);
      expect((await request.get(`/video/${f}.jpg`)).status(), `${f} poster`).toBe(200);
    }
  });

  test("on a phone nothing overflows and the first words are readable", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const clock = (await page.getByTestId("live-clock").boundingBox())!;
    expect(clock.x + clock.width).toBeLessThanOrEqual(390);
    await ctx.close();
  });
});

test.describe("home page, reduced motion", () => {
  test("no video plays, the ribbon holds still and cards stay flat", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);   // the emulation took hold before the page drew
    await expect(page.locator("video[data-ambient=video]")).toHaveCount(0);
    await expect(page.locator("img[data-ambient=still]").first()).toBeAttached();
    expect(await page.getByTestId("record-ticker").locator(".ticker-track").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    const card = page.getByTestId("tilt-card").first();
    await card.scrollIntoViewIfNeeded();
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await page.waitForTimeout(300);
    expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Credentials");
  });
});
