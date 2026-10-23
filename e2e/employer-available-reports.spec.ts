/**
 * CORR-007 CR-09 route 1: the Available Reports surface and the reader. The database calls are answered by the test (page.route), so nothing is
 * read from or written to the live project; the rules themselves are covered by src/test/db/cr09-release-routes.db.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });

async function mockList(page: Page, result: unknown) {
  const calls: any[] = [];
  await page.route("**/rest/v1/rpc/t3a_available_reports_list*", (r) => { calls.push(r.request().postDataJSON()); return r.fulfill(json(result)); });
  return calls;
}

test.describe("Employer - Available Reports", () => {
  test("lists reports by stated name with a page and nothing else to search, sort or filter", async ({ page }) => {
    const calls = await mockList(page, { outcome: "listed", page: 1, page_size: 25, items: [{ ber_report_id: A, stated_name: "Ana Cruz" }, { ber_report_id: B, stated_name: "Ben Ortiz" }] });
    await page.goto("/dashboard/employer/reports");
    await expect(page.getByRole("heading", { name: "Available Reports" }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("ar-item")).toHaveCount(2);
    await expect(page.getByTestId("ar-list")).toContainText("Ana Cruz");
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    expect(calls[0]).toEqual({ p_params: { page: 1, page_size: 25 } });
  });

  test("an organization that is not approved is told the list is not open yet", async ({ page }) => {
    await mockList(page, { outcome: "refused", reason: "EMPLOYER_NOT_APPROVED" });
    await page.goto("/dashboard/employer/reports");
    await expect(page.getByTestId("ar-refused")).toContainText("not available to this organization yet", { timeout: 15000 });
    await expect(page.getByTestId("ar-item")).toHaveCount(0);
  });

  test("an empty list says so", async ({ page }) => {
    await mockList(page, { outcome: "listed", page: 1, page_size: 25, items: [] });
    await page.goto("/dashboard/employer/reports");
    await expect(page.getByTestId("ar-empty")).toBeVisible({ timeout: 15000 });
  });

  test("Read report opens the full report face, and says when the corrected version is shown", async ({ page }) => {
    await mockList(page, { outcome: "listed", page: 1, page_size: 25, items: [{ ber_report_id: A, stated_name: "Ana Cruz" }] });
    const reads: any[] = [];
    await page.route("**/rest/v1/rpc/t3a_ga_read*", (r) => {
      reads.push(r.request().postDataJSON());
      return r.fulfill(json({ outcome: "read", superseded_version_requested: true, face: { rendered: true, blocks: [
        { block_no: 1, block_name: "What this report is", renders: true, controlled_text: "A record of what the participant did.", rows: null },
        { block_no: 2, block_name: "Conditional block", renders: false, controlled_text: "must not show", rows: null },
        { block_no: 4, block_name: "Observed conduct", renders: true, controlled_text: null, rows: [{ dimension_id: "D2", stage_code: "S2", statement: "Named the problem early." }] },
      ] } }));
    });
    await page.goto("/dashboard/employer/reports");
    await page.getByRole("link", { name: "Read report" }).click();
    await expect(page.getByTestId("reader")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("reader").getByTestId("test-tag")).toHaveText("TEST");
    await expect(page.getByTestId("reader")).toContainText("A record of what the participant did.");
    await expect(page.getByTestId("reader")).toContainText("Named the problem early.");
    await expect(page.getByTestId("reader")).not.toContainText("must not show");
    await expect(page.getByTestId("reader-superseded")).toContainText("corrected version");
    expect(reads).toEqual([{ p_ber_report_id: A }]);
  });

  test("a report that is no longer available, or whose face is incomplete, shows nothing of it", async ({ page }) => {
    await page.route("**/rest/v1/rpc/t3a_ga_read*", (r) => r.fulfill(json({ outcome: "refused", reason: "REPORT_NOT_AVAILABLE" })));
    await page.goto(`/dashboard/employer/report/${A}`);
    await expect(page.getByTestId("reader-unavailable")).toBeVisible({ timeout: 15000 });
    await page.unroute("**/rest/v1/rpc/t3a_ga_read*");
    await page.route("**/rest/v1/rpc/t3a_ga_read*", (r) => r.fulfill(json({ outcome: "read", face: { rendered: false, refusal_code: "CONTROLLED_TEXT_NOT_LOADED", blocks: [{ block_no: 1, block_name: "x", renders: true, controlled_text: "partial text", rows: null }] } })));
    await page.goto(`/dashboard/employer/report/${B}`);
    await expect(page.getByTestId("reader-incomplete")).toContainText("CONTROLLED_TEXT_NOT_LOADED");
    await expect(page.getByText("partial text")).toHaveCount(0);
  });
});
