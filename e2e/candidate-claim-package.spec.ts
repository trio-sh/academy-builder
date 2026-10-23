/**
 * CORR-007 CR-28: the participant sees, before issue, the entry chosen for each dimension and every other entry. The database call is answered by the
 * test; the selection rule itself is covered by src/test/db/cr28-claim-package-selection.db.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const REP = "dddddddd-0000-4000-8000-000000000004";
const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
const review = {
  outcome: "review", ber_report_id: REP, rule_version: "1.0", issued_rule_version: null,
  dimensions: [
    { dimension_id: "D2", rule_version: "1.0", selected: { clause_text: "Named the problem early.", rec: true }, other_entries: [{ clause_text: "Asked for help." }, { clause_text: "Kept notes." }] },
    { dimension_id: "D3", rule_version: "1.0", selected: { clause_text: "Checked the plan with the team.", rec: false }, other_entries: [] },
  ],
};
async function mock(page: Page, result: unknown) {
  const calls: any[] = [];
  await page.route("**/rest/v1/rpc/t3a_cr28_review*", (r) => { calls.push(r.request().postDataJSON()); return r.fulfill(json(result)); });
  return calls;
}

test.describe("Candidate - claim package review", () => {
  test("shows the chosen entry per dimension, the rule version, and every other entry", async ({ page }) => {
    const calls = await mock(page, review);
    await page.goto(`/dashboard/candidate/claim-package/${REP}`);
    await expect(page.getByTestId("claim-package-review")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("cp-rule")).toContainText("version 1.0");
    await expect(page.getByTestId("cp-rule")).toContainText("does not look at whether the conduct appears favourable");
    const dims = page.getByTestId("cp-dimension");
    await expect(dims).toHaveCount(2);
    await expect(dims.nth(0).getByTestId("cp-selected")).toContainText("Named the problem early.");
    await expect(dims.nth(0).getByTestId("cp-selected")).toContainText("recurs across observations");
    await expect(dims.nth(0).getByTestId("cp-others")).toContainText("Asked for help.");
    await expect(dims.nth(0).getByTestId("cp-others")).toContainText("Kept notes.");
    await expect(dims.nth(1).getByTestId("cp-selected")).not.toContainText("recurs");
    await expect(dims.nth(1).getByTestId("cp-others")).toContainText("No other entries.");
    expect(calls).toEqual([{ p_ber_report_id: REP }]);
  });

  test("the page has nothing to change the choice", async ({ page }) => {
    await mock(page, review);
    await page.goto(`/dashboard/candidate/claim-package/${REP}`);
    await expect(page.getByTestId("claim-package-review")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("claim-package-review").getByRole("button")).toHaveCount(0);
    await expect(page.getByTestId("claim-package-review").getByRole("radio")).toHaveCount(0);
    await expect(page.getByTestId("claim-package-review").getByRole("checkbox")).toHaveCount(0);
  });

  test("when the selection rule is not loaded the page says nothing was issued and shows no entries", async ({ page }) => {
    await mock(page, { outcome: "refused", reason: "claim_package_rule_unloaded" });
    await page.goto(`/dashboard/candidate/claim-package/${REP}`);
    await expect(page.getByTestId("cp-refused")).toContainText("selection rule is not loaded", { timeout: 15000 });
    await expect(page.getByTestId("cp-dimension")).toHaveCount(0);
  });

  test("a report that is not the participant's shows nothing of it", async ({ page }) => {
    await mock(page, { outcome: "refused", reason: "REPORT_NOT_AVAILABLE" });
    await page.goto(`/dashboard/candidate/claim-package/${REP}`);
    await expect(page.getByTestId("cp-refused")).toContainText("not available to you", { timeout: 15000 });
    await expect(page.getByTestId("cp-dimension")).toHaveCount(0);
  });
});
