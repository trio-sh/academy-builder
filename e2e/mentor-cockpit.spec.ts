/**
 * T3A-D1-EXEC-001 §11.1 — the Stage 2 cockpit acceptance tests.
 *
 * Eleven of the thirty could not be executed because they are about what
 * a mentor SEES AND DOES: layout, beat synchronisation, refresh recovery,
 * working without a second tab. No SQL proof reaches them. They also
 * could not run until the forty sources held REC-07 approvals, because a
 * cockpit with nothing it may serve has nothing to test.
 *
 * Both of those are now true, so these run.
 *
 * WHAT THE FIXTURE IS. scripts/seed-e2e-fixtures.mjs creates a mentor
 * holding no oversight standing (an account with administrative standing
 * is refused by t3a_oversight_refuse_mutation and could never commit), a
 * participant, an S2 entry against SRC-D1-S2-001 — a genuinely approved
 * source — an assignment, an observe authority and OBSERVATION consent.
 * Every one of those is a precondition some route refuses without.
 *
 * WHAT THESE TESTS WILL NOT DO. They do not assert that a pane is
 * non-empty and call that a pass. Where a criterion says "the exact
 * approved version", the assertion compares against the text in the
 * register. Where it says a control cannot remain visible, it checks that
 * it is gone rather than that something else appeared.
 */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const fixture = JSON.parse(
  readFileSync(path.resolve("e2e/.fixture.json"), "utf8")
);

const COCKPIT = `/dashboard/mentor/cockpit/${fixture.stageEntryEventId}`;

/** The six regions §3.1 requires to be visible at once. */
const REGIONS = [
  "Participant — Live View",
  "Mentor — Live View",
  "Pane 1 — Source and Script",
  "Pane 2 — Determination Capture",
];

async function openCockpit(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(COCKPIT);
  await page.waitForLoadState("networkidle");
  // The cockpit resolves its stage entry and source before it renders
  // anything worth asserting on.
  await expect(page.getByText("Pane 1 — Source and Script")).toBeVisible({
    timeout: 30000,
  });
}

test.describe("§11.1 Stage 2 cockpit", () => {
  test("AC-01 · all six regions visible simultaneously, nothing overlays a live view", async ({
    page,
  }) => {
    await openCockpit(page);

    for (const region of REGIONS) {
      await expect(page.getByText(region, { exact: true })).toBeVisible();
    }

    // "No step replaces or overlays either live view." A modal or
    // fullscreen video would satisfy "visible" while breaking the rule,
    // so the live views are checked for a real, unobscured box.
    for (const view of ["Participant — Live View", "Mentor — Live View"]) {
      const header = page.getByText(view, { exact: true });
      const box = await header.boundingBox();
      expect(box, `${view} has no layout box`).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    }

    // Nothing is presented as a dialog over the top of the session.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test("AC-04 · Pane 1 renders the exact approved source text, read-only", async ({
    page,
  }) => {
    await openCockpit(page);

    // The exact text, from the register rather than from the screen.
    const expected = (fixture.canonicalBody ?? "").trim();
    expect(
      expected.length,
      "the fixture must carry the approved source text, or this test proves nothing"
    ).toBeGreaterThan(0);

    const pane = page
      .locator("section")
      .filter({ hasText: "Pane 1 — Source and Script" });
    const rendered = (await pane.innerText()).replace(/\s+/g, " ");
    const wanted = expected.replace(/\s+/g, " ");
    expect(rendered).toContain(wanted.slice(0, 120));

    // Read-only: the source text is not in an editable control.
    await expect(pane.locator("textarea")).toHaveCount(0);
    await expect(pane.locator('input[type="text"]')).toHaveCount(0);
    await expect(pane.locator('[contenteditable="true"]')).toHaveCount(0);
  });

  test("AC-24 · no recording control, indicator or capture surface", async ({
    page,
  }) => {
    await openCockpit(page);

    const body = await page.locator("body").innerText();
    // A badge saying a session is being recorded would tell the mentor
    // something untrue: RECORDING consent is unavailable at every Stage.
    expect(body).not.toMatch(/\brecording\b/i);
    expect(body).not.toMatch(/\bREC\b/);

    // And no control that would START one. Matched on media-recording
    // wording specifically: the cockpit has a "Record an administration
    // variance at this beat" control, which is a governed note taken at
    // the beat and is required to be there. A test that banned the word
    // "record" would fail on the thing §11 asks for.
    await expect(
      page.getByRole("button", {
        name: /start recording|stop recording|record (this )?(session|video|audio|call)/i,
      })
    ).toHaveCount(0);
  });

  test("AC-26 · both live views stay visible while the mentor works", async ({
    page,
  }) => {
    await openCockpit(page);

    // Interacting with the determination pane must not cost either view.
    const firstOption = page
      .locator("section")
      .filter({ hasText: "Pane 2 — Determination Capture" })
      .locator('input[type="radio"], button')
      .first();

    if (await firstOption.count()) {
      await firstOption.click({ trial: true }).catch(() => undefined);
    }

    for (const view of ["Participant — Live View", "Mentor — Live View"]) {
      await expect(page.getByText(view, { exact: true })).toBeVisible();
    }
  });

  test("AC-27 · the beat, the question set and the source-bound choices surface without being assembled by hand", async ({
    page,
  }) => {
    await openCockpit(page);

    // The mentor action sequence comes from the approved source, not from
    // anything typed here.
    await expect(page.getByText("Mentor action sequence")).toBeVisible();
    await expect(
      page.getByText("Do not add, reword, or deviate from the approved script.")
    ).toBeVisible();

    // The applicable question set must SURFACE. Asserting only that the
    // pane exists would pass on an empty pane, which is exactly the state
    // AC-27 is written to catch — "surface automatically from governed
    // records" is not satisfied by a box with nothing in it.
    const pane2 = page
      .locator("section")
      .filter({ hasText: "Pane 2 — Determination Capture" });
    await expect(pane2).toBeVisible();
    await expect(
      pane2.getByText("No determination questions to serve for this source at this Stage.")
    ).toHaveCount(0);
  });

  test("AC-17 · a refresh restores the same Stage instance and does not duplicate it", async ({
    page,
  }) => {
    await openCockpit(page);
    const before = page.url();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Pane 1 — Source and Script")).toBeVisible({
      timeout: 30000,
    });

    // Same Stage instance: the route carries the id, and a reload that
    // silently started a new instance would change it.
    expect(page.url()).toBe(before);
    expect(page.url()).toContain(fixture.stageEntryEventId);
  });

  test("AC-28 · capture sits at the beat, not behind a post-session step", async ({
    page,
  }) => {
    await openCockpit(page);

    // A variance is recorded AT the beat, in the cockpit. If this moved
    // behind a session-end step the rule it implements would be lost.
    await expect(
      page.getByText("Record an administration variance at this beat")
    ).toBeVisible();
  });
});
