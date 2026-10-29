/**
 * The Growth Log page (Domain J): the participant's own notebook, in the ledger style of the rest of the site. The database calls are answered by the test, so nothing is read from or
 * written to the live project. The page keeps its rules: nothing measured, nothing from the platform, only the participant's own notes.
 */
import { test, expect, type Page, type Route } from "@playwright/test";

type Note = { entry_id: string; entry_kind: string; text: string; module_reference: string | null; created_at: string; updated_at: string };
const json = (data: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(data) });

async function stub(page: Page, state: { notes: Note[]; posted: any[]; patched: any[]; deleted: string[]; observations?: any[] }) {
  await page.route("**/rest/v1/t3a_growth_log_observation_view*", (r) => r.fulfill(json(state.observations ?? [])));
  await page.route("**/rest/v1/t3a_growth_log_entry*", async (r: Route) => {
    const m = r.request().method();
    if (m === "GET") return r.fulfill(json(state.notes));
    if (m === "POST") {
      const body = r.request().postDataJSON();
      state.posted.push(body);
      state.notes.unshift({ entry_id: `n${state.notes.length + 1}`, entry_kind: body.entry_kind, text: body.text, module_reference: body.module_reference, created_at: "2026-10-28T09:00:00Z", updated_at: "2026-10-28T09:00:00Z" });
      return r.fulfill({ status: 201, body: "" });
    }
    if (m === "PATCH") {
      const body = r.request().postDataJSON(); state.patched.push(body);
      state.notes = state.notes.map((n) => (r.request().url().includes(n.entry_id) ? { ...n, ...body } : n));
      return r.fulfill({ status: 204, body: "" });
    }
    if (m === "DELETE") {
      const id = decodeURIComponent(r.request().url().split("entry_id=eq.")[1] ?? ""); state.deleted.push(id);
      state.notes = state.notes.filter((n) => n.entry_id !== id);
      return r.fulfill({ status: 204, body: "" });
    }
    return r.fulfill(json([]));
  });
}
const fresh = (over: Partial<Parameters<typeof stub>[1]> = {}) => ({ notes: [] as Note[], posted: [] as any[], patched: [] as any[], deleted: [] as string[], ...over });

test.describe("Candidate - Growth Log", () => {
  test("shows the page in the ledger style: a framed note form beside the record list", async ({ page }) => {
    await stub(page, fresh({ observations: [{ observation_id: "o1", stage_code: "S2", dimension_id: "D1", committed_at: "2026-10-20T09:00:00Z" }] }));
    await page.goto("/dashboard/candidate/growth");
    await expect(page.getByRole("heading", { name: "Your own notes." })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Only you can see this page.")).toBeVisible();
    const form = page.getByRole("heading", { name: "Write a note" });
    const record = page.getByRole("heading", { name: "Observations on file" });
    await expect(form).toBeVisible();
    await expect(record).toBeVisible();
    await expect(page.getByText("Stage 2 · D1")).toBeVisible();
    // two columns on a desktop screen: the record list sits to the right of the form
    const f = await form.boundingBox(); const r = await record.boundingBox();
    expect(r!.x).toBeGreaterThan(f!.x + f!.width / 2);
    await expect(page.getByRole("button", { name: "Practice note" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Nothing here yet.")).toBeVisible();
    // nothing is measured or compared
    await expect(page.locator("main")).not.toContainText(/score|rank|trend|progress/i);
    await page.screenshot({ path: "test-results/growth-log-ledger.png", fullPage: true });
  });

  test("writing a note saves it and lists it with its kind and date", async ({ page }) => {
    const s = fresh(); await stub(page, s);
    await page.goto("/dashboard/candidate/growth");
    await expect(page.getByRole("button", { name: "Save note" })).toBeDisabled({ timeout: 15000 });
    await page.getByRole("button", { name: "Rehearsal reference" }).click();
    await expect(page.getByRole("button", { name: "Rehearsal reference" })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Note text").fill("I spoke too fast when the client pushed back.");
    await expect(page.getByText("45 of 5000 characters")).toBeVisible();
    await page.getByLabel("Module reference").fill("BridgeFast 3");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByText("I spoke too fast when the client pushed back.")).toBeVisible();
    expect(s.posted).toEqual([{ entry_kind: "rehearsal_reference", text: "I spoke too fast when the client pushed back.", module_reference: "BridgeFast 3" }]);
    await expect(page.locator("article").first()).toContainText("Rehearsal reference");
    await expect(page.locator("article").first()).toContainText("BridgeFast 3");
    await expect(page.getByLabel("Note text")).toHaveValue("");
  });

  test("a note can be changed and deleted", async ({ page }) => {
    const s = fresh({ notes: [{ entry_id: "n1", entry_kind: "practice_note", text: "First thought.", module_reference: null, created_at: "2026-10-27T09:00:00Z", updated_at: "2026-10-27T09:00:00Z" }] });
    await stub(page, s);
    await page.goto("/dashboard/candidate/growth");
    await expect(page.getByText("First thought.")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Change your note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    await page.getByLabel("Note text").fill("Second thought.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Second thought.")).toBeVisible();
    expect(s.patched[0]).toMatchObject({ text: "Second thought." });
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Nothing here yet.")).toBeVisible();
    expect(s.deleted).toEqual(["n1"]);
  });

  test("on a phone-width screen the two columns stack and nothing runs off the side", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stub(page, fresh());
    await page.goto("/dashboard/candidate/growth");
    await expect(page.getByRole("heading", { name: "Your own notes." })).toBeVisible({ timeout: 15000 });
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(392);
  });
});
