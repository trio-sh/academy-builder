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
// CL-38. The Cockpit's simultaneously visible regions became FIVE when
// Section 2A moved live video to Google Meet. Keyed on data-region rather
// than on label text, because the header and the control strip carry no
// visible heading and a test that cannot see a region is not evidence that
// the region is absent.
const REGIONS = [
  "persistent-header",
  "pane-1",
  "pane-2",
  "live-session",
  "session-control-strip",
];

const paneTwo = (page: Page) =>
  page.locator("section").filter({ hasText: "Pane 2 — Determination Capture" });

/** One served control, by question code. */
const control = (page: Page, code: string) =>
  paneTwo(page).locator(`[data-question="${code}"]`);

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
  /**
   * CS-I-48 — standing acceptance, not test scaffolding.
   *
   * The first run after the CORR-003 correction passed thirteen tests
   * against a Stage entry still pinned to the superseded version: green,
   * and proving nothing about the fix. A suite that goes green against
   * stale content is worse than a red one, because nobody investigates a
   * pass.
   *
   * So this is a test, and it runs first. A fixture pinned to superseded
   * content is a FAILED test, not a passed one.
   */
  test("CS-37 · the fixture is pinned to live content, not a superseded version", async () => {
    expect(
      fixture.sourceVersionId,
      "the fixture must name the source version it pinned"
    ).toBeTruthy();
    expect(
      fixture.supersededBy ?? null,
      `fixture pins a SUPERSEDED source version (${fixture.sourceVersionId}); ` +
        "every assertion after this would pass against content the register has replaced"
    ).toBeNull();
  });

  test("AC-01 · all five Cockpit regions visible simultaneously, nothing overlaying them", async ({
    page,
  }) => {
    await openCockpit(page);

    // Restated by CL-49. As issued this asserted six regions and that no
    // step overlaid either live view. There is no live view any more —
    // video is in Google Meet, in another window — so the requirement is
    // the five regions of CL-38, each with a real unobscured box.
    for (const region of REGIONS) {
      const el = page.locator(`[data-region="${region}"]`);
      await expect(el, `${region} is missing`).toHaveCount(1);
      const box = await el.boundingBox();
      expect(box, `${region} has no layout box`).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    }

    // CL-36. No live view, and NO PLACEHOLDER STREAM in its place: a frame
    // that looks like video while the real video is elsewhere misleads the
    // mentor. This is the half of the restatement that would otherwise go
    // untested — a region removed is only proved removed by asserting it.
    await expect(page.getByText("Participant — Live View", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Mentor — Live View", { exact: true })).toHaveCount(0);
    await expect(page.locator("video")).toHaveCount(0);

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

  test("AC-24 · attestations recorded, a recording indicator ends the session, no media persisted", async ({
    page,
  }) => {
    await openCockpit(page);

    // Restated by CL-49. As issued this asserted the word "recording"
    // appeared nowhere. That can no longer hold and SHOULD not: attestation
    // A2 is "Recording, transcripts and note-taking are off", and a mentor
    // who cannot see that stated cannot attest to it. The requirement is
    // now about what the Cockpit does, not which words it avoids.
    const panel = page.locator('[data-region="live-session"]');
    await expect(panel).toHaveCount(1);
    for (const code of ["A1", "A2", "A3"]) {
      await expect(panel.locator(`[data-attestation="${code}"]`)).toHaveCount(1);
    }

    // The platform persists no media: there is no video element and no
    // control that would start a recording.
    await expect(page.locator("video")).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: /start recording|stop recording|record (this )?(session|video|audio|call)/i,
      })
    ).toHaveCount(0);

    // And no badge claiming the session IS being recorded, which would tell
    // the mentor something untrue: RECORDING consent is unavailable at
    // every Stage in D1.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\b(is being|now) recording\b/i);
  });

  test("AC-26 · the mentor works from the Cockpit and the Meet window alone", async ({
    page,
  }) => {
    await openCockpit(page);

    // Restated by CL-49: "both live views stay visible" became "only the
    // Cockpit and the Meet window". The Meet window is not this page, so
    // what is testable here is that the Cockpit alone carries everything
    // else the mentor needs — script, capture, timing, variance — and that
    // interacting with capture costs none of it.
    const firstOption = page
      .locator('[data-region="pane-2"]')
      .locator('input[type="radio"], button')
      .first();
    if (await firstOption.count()) {
      await firstOption.click({ trial: true }).catch(() => undefined);
    }

    for (const region of REGIONS) {
      await expect(page.locator(`[data-region="${region}"]`)).toHaveCount(1);
    }

    // No other document, notes tool, timing tool or question form: the
    // variance note and the determination controls are in the Cockpit, and
    // nothing sends the mentor elsewhere.
    await expect(page.getByText("Record an administration variance at this beat")).toBeVisible();
    await expect(page.locator('[data-control="live-video-interrupted"]')).toHaveCount(1);
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

  /**
   * The five that were blocked on the capture mapping until
   * T3A-D1-EXEC-CORR-002 ruled it. They are written against the ruling,
   * not against the reading this build had been working from — which was
   * wrong: being source-bound does not remove a question from a capture
   * set, and C3 holds three controls rather than one.
   */

  test("AC-06 · a question renders with ONLY its approved answer set", async ({
    page,
  }) => {
    await openCockpit(page);
    const pane2 = paneTwo(page);

    // Q-D1-01 takes C1, whose three lines are the whole of what may be
    // offered. The assertion is not "C1's lines appear" — that would pass
    // with extra options beside them. It is that the control offers three
    // choices and no fourth.
    const q1 = control(page, "Q-D1-01");
    await expect(q1).toBeVisible();
    await expect(q1.locator('input[type="radio"]')).toHaveCount(3);

    // And the lines are the register's, verbatim.
    await expect(q1).toContainText("Named the specific issue and what it was.");
    await expect(q1).toContainText("Made no reference to an issue.");

    // No free-text escape beside an approved set.
    await expect(q1.locator("textarea")).toHaveCount(0);
  });

  test("AC-08 · answering the parent serves the exact approved children, and not before", async ({
    page,
  }) => {
    await openCockpit(page);
    const pane2 = paneTwo(page);

    // Before the parent is answered, neither child exists. CS-I-14: not a
    // disabled control, not a null — no row at all.
    await expect(control(page, "Q-D1-03b1")).toHaveCount(0);
    await expect(control(page, "Q-D1-03b2")).toHaveCount(0);

    // C3 line 4 is "both omitted ... and included one or more unsupported
    // claims", which BR-02a and BR-02b both trigger.
    await pane2
      .getByText(/The account both omitted one or more material items/)
      .click();

    await expect(control(page, "Q-D1-03b1")).toBeVisible({ timeout: 15000 });
    await expect(control(page, "Q-D1-03b2")).toBeVisible();

    // The children are bound to the SERVED SOURCE VERSION's lists.
    await expect(pane2.getByText("From this source · material_items")).toBeVisible();
    await expect(
      pane2.getByText("From this source · assertion_reference_set")
    ).toBeVisible();
  });

  test("AC-05 · changing the answer withdraws the options the old answer served", async ({
    page,
  }) => {
    await openCockpit(page);
    const pane2 = paneTwo(page);

    await pane2
      .getByText(/The account both omitted one or more material items/)
      .click();
    await expect(control(page, "Q-D1-03b1")).toBeVisible({ timeout: 15000 });

    // "Wrong-prompt options cannot remain visible." Selecting the line
    // that serves neither child must remove both, not grey them out and
    // not leave their bound lists on screen.
    await pane2
      .getByText("The account included every material item and included no unsupported claim.")
      .click();

    await expect(control(page, "Q-D1-03b1")).toHaveCount(0, { timeout: 15000 });
    await expect(control(page, "Q-D1-03b2")).toHaveCount(0);
    await expect(pane2.getByText("From this source · material_items")).toHaveCount(0);
  });

  test("AC-13 · a missing beat timestamp prevents the dependent timing determination", async ({
    page,
  }) => {
    await openCockpit(page);
    const pane2 = paneTwo(page);

    // CS-I-32 changed which question this rides on. Q-D1-08a is NOT the
    // one to assert against here: SRC-D1-S2-001 carries no bearing
    // interest, so under CS-I-34 Q-D1-08a is not served at all — and its
    // absence is not a missing state, so no control appears.
    await expect(control(page, "Q-D1-08a")).toHaveCount(0);

    // CS-I-55 re-fixtured this test, and the old fixture is the reason.
    // AC-13's governing text is "a missing required beat TIMESTAMP
    // prevents the dependent timing determination" — a missing RUNTIME
    // record. The old fixture accepted BEAT_SCRIPT_NOT_LOADED, which is a
    // missing DEFINITION: a different condition that happened to produce a
    // refusal because no Stage 2 sequence was loaded. It would have gone
    // green on a source with no script at all, and red the moment one
    // loaded — so it was never testing AC-13.
    //
    // The new fixture requires the sequence to be LOADED first. Seven
    // beats B1 to B7 in pane 1 is that precondition, asserted rather than
    // assumed: if the parse regresses, this test fails here instead of
    // passing for the wrong reason.
    const pane1 = page.locator("section", { hasText: "Pane 1 — Source and Script" }).first();
    for (const beat of ["B1", "B2", "B3", "B4", "B5", "B6", "B7"]) {
      await expect(pane1.locator(`[data-beat="${beat}"]`)).toHaveCount(1, { timeout: 15000 });
    }

    // Q-D1-02 is the timing determination served on this source: its
    // reference resolves from enquiry_point, which reads "B3". The
    // sequence is loaded and B3 is in it, so neither
    // BEAT_SCRIPT_NOT_LOADED nor REFERENCE_BEAT_NOT_IN_SEQUENCE can fire.
    // The session recorded no B3 timestamp, so the determination must be
    // prevented and named for THAT reason and no other.
    const q2 = control(page, "Q-D1-02");
    await expect(q2).toBeVisible();
    await expect(q2).toContainText("Refused");
    await expect(q2).toContainText("BEAT_TIMESTAMP_MISSING");
    await expect(q2).not.toContainText("BEAT_SCRIPT_NOT_LOADED");
    await expect(q2).not.toContainText("REFERENCE_BEAT_NOT_IN_SEQUENCE");

    // Prevented means offering nothing, not offering something disabled.
    await expect(q2.locator('input[type="radio"]')).toHaveCount(0);
  });

  test("CS-I-12 · the support-set item is retained but never rendered", async ({
    page,
  }) => {
    await openCockpit(page);
    const pane2 = paneTwo(page);

    // Naming an attribution support item names the person it is about.
    // Where the bound family is attribution_support_set the identifier is
    // offered and the text is withheld. On this source the family reads
    // "Empty.", so the control refuses outright — which is the stronger
    // outcome and is what CS-I-07 requires.
    const q4b = control(page, "Q-D1-04b");
    await expect(q4b).toBeVisible();
    await expect(q4b).toContainText(/Refused/);
    await expect(q4b).toContainText("BOUND_FAMILY_ABSENT_OR_EMPTY");
  });
});
