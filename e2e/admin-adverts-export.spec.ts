/**
 * Exports the staged advertisements for production: eight PNGs at their real size and a manifest of caption, alt text and link per ad.
 * Runs only when ADVERT_OUT names a folder (outside public/, so nothing is served):
 *   ADVERT_OUT=marketing/adverts npx playwright test --project=setup --project=admin-tests -g "export the advertisements"
 * It also checks what it wrote: PNG dimensions, and that the manifest text equals the source of truth.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ADVERTS, altText, caption } from "../src/content/adverts";

const OUT = process.env.ADVERT_OUT;
const SIZES = { portrait: [1080, 1350], landscape: [1200, 630] } as const;

test.skip(!OUT, "ADVERT_OUT not set");

test("export the advertisements", async ({ page }) => {
  mkdirSync(OUT!, { recursive: true });
  await page.setViewportSize({ width: 1400, height: 1500 });
  await page.goto("/dashboard/admin/adverts");
  await expect(page.getByTestId("adverts-staging")).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  const manifest: unknown[] = [];
  for (const a of ADVERTS) {
    const files: Record<string, string> = {};
    for (const f of ["portrait", "landscape"] as const) {
      // the preview is scaled down for the page: pull a clone out of it and shoot that at the artboard's own size
      await page.evaluate(([id, fm]) => {
        const el = document.querySelector(`[data-testid="poster-${id}-${fm}"]`)!;
        const holder = document.createElement("div");
        holder.id = "export-holder";
        holder.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#000";
        holder.appendChild(el.cloneNode(true));
        document.body.appendChild(holder);
      }, [a.id, f]);
      const name = `${a.id}-${f}.png`;
      await page.locator(`#export-holder [data-testid="poster-${a.id}-${f}"]`).screenshot({ path: join(OUT!, name) });
      await page.evaluate(() => document.getElementById("export-holder")!.remove());
      files[f] = name;
    }
    manifest.push({ id: a.id, audience: a.audience, status: "staged, not published", files, link: a.cta.href, caption: caption(a), altText: altText(a) });
  }
  writeFileSync(join(OUT!, "manifest.json"), JSON.stringify(manifest, null, 2));

  // verify what was written
  for (const a of ADVERTS) for (const f of ["portrait", "landscape"] as const) {
    const buf = readFileSync(join(OUT!, `${a.id}-${f}.png`));
    expect(buf.readUInt32BE(16), `${a.id} ${f} width`).toBe(SIZES[f][0]);
    expect(buf.readUInt32BE(20), `${a.id} ${f} height`).toBe(SIZES[f][1]);
  }
  const m = JSON.parse(readFileSync(join(OUT!, "manifest.json"), "utf8"));
  expect(m.map((x: { caption: string }) => x.caption)).toEqual(ADVERTS.map(caption));
  expect(existsSync(join(OUT!, "manifest.json"))).toBe(true);
});
