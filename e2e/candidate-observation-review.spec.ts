/**
 * CORR-007 CR-06: the participant reviews a committed observation and raises a correction. The database calls are answered by the test, so nothing is
 * written to the live project; the rules are covered by src/test/db/cr06-cr10-cr27.db.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const OBS = "cccccccc-0000-4000-8000-000000000003";
const COMMIT = "We will acknowledge your correction within 5 business days and aim to give you the decision within 20 business days. If a case needs longer, we will tell you why and when to expect it.";
const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
const review = (over: Record<string, unknown> = {}) => ({
  outcome: "open", observation_record_id: OBS, dimension_id: "D2", stage_code: "S2", in_a_report: true, open_corrections: 0,
  statements: [{ composed_statement_id: "s1", stage_code: "S2", clauses: [{ clause_text: "Named the problem early." }, { clause_text: "Asked for help." }] }],
  correction_commitment: { rendered: true, value: COMMIT }, ...over,
});

async function mock(page: Page, rev: unknown, raiseResult: unknown = { outcome: "raised", correction_case_id: "k1", correction_commitment: { rendered: true, value: COMMIT } }) {
  const calls: any[] = [];
  await page.route("**/rest/v1/rpc/t3a_cr06_observation_review*", (r) => r.fulfill(json(rev)));
  await page.route("**/rest/v1/rpc/t3a_cr06_raise_correction*", (r) => { calls.push(r.request().postDataJSON()); return r.fulfill(json(raiseResult)); });
  return calls;
}

test.describe("Candidate - observation review and challenge", () => {
  test("shows the statements and the commitment word for word, with the six grounds", async ({ page }) => {
    await mock(page, review());
    await page.goto(`/dashboard/candidate/observation/${OBS}`);
    await expect(page.getByTestId("observation-review")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("obs-statements")).toContainText("Named the problem early.");
    await expect(page.getByTestId("obs-statements")).toContainText("Asked for help.");
    await expect(page.getByTestId("obs-commitment")).toHaveText(COMMIT);
    await expect(page.getByRole("radio")).toHaveCount(6);
  });

  test("a correction needs a ground, is sent with it, and shows the commitment back", async ({ page }) => {
    const calls = await mock(page, review());
    await page.goto(`/dashboard/candidate/observation/${OBS}`);
    const submit = page.getByRole("button", { name: "Raise correction" });
    await expect(submit).toBeDisabled({ timeout: 15000 });
    await page.getByLabel(/Factual error/).check();
    await page.getByLabel("Tell us more (optional)").fill("The date is wrong.");
    await submit.click();
    await expect(page.getByTestId("obs-raised")).toContainText(COMMIT);
    expect(calls).toEqual([{ p_observation_record: OBS, p_ground: "factual_error", p_narrative: "The date is wrong." }]);
  });

  test("when the commitment cannot render no correction can be raised", async ({ page }) => {
    await mock(page, review({ correction_commitment: { rendered: false } }));
    await page.goto(`/dashboard/candidate/observation/${OBS}`);
    await expect(page.getByTestId("obs-no-commitment")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Raise correction" })).toHaveCount(0);
  });

  test("an observation that is not the participant's shows nothing of it", async ({ page }) => {
    await mock(page, { outcome: "refused", reason: "OBSERVATION_NOT_AVAILABLE" });
    await page.goto(`/dashboard/candidate/observation/${OBS}`);
    await expect(page.getByTestId("obs-unavailable")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("obs-statements")).toHaveCount(0);
  });

  test("a refused save is not shown as raised", async ({ page }) => {
    await mock(page, review(), { outcome: "refused", reason: "correction_response_time_unloaded" });
    await page.goto(`/dashboard/candidate/observation/${OBS}`);
    await page.getByLabel(/Mistaken identity/).check();
    await page.getByRole("button", { name: "Raise correction" }).click();
    await expect(page.getByRole("alert")).toContainText("could not be taken");
    await expect(page.getByTestId("obs-raised")).toHaveCount(0);
  });
});
