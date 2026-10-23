/**
 * CORR-007 CR-25: the accessible equivalent of an issued report: a language, a title, a heading for each section, paragraphs, and a data table with a
 * caption and header cells, carrying the same approved content. The database call is answered by the test; the equivalence rule itself is covered by
 * src/test/db/cr25-accessible-copy.db.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const REP = "ffffffff-0000-4000-8000-000000000006";
const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
const tagged = {
  role: "document", lang: "en", title: "Behavioral Evidence Report",
  children: [
    { tag: "section", block_no: 1, heading: { tag: "h2", text: "What this report is" }, children: [{ tag: "p", text: "A record of what the participant did." }] },
    { tag: "section", block_no: 4, heading: { tag: "h2", text: "Observed conduct" }, children: [
      { tag: "table", caption: "Observed conduct", header: ["Dimension", "Stage", "Statement"], rows: [["D2", "S2", "Named the problem early."], ["D3", "S2", "Checked the plan with the team."]] },
    ] },
  ],
};
async function mock(page: Page, result: unknown) {
  const calls: any[] = [];
  await page.route("**/rest/v1/rpc/t3a_report_accessible_read*", (r) => { calls.push(r.request().postDataJSON()); return r.fulfill(json(result)); });
  return calls;
}

test.describe("Candidate - accessible report", () => {
  test("is a tagged document: language, title, headings, paragraph, and a captioned table with header cells", async ({ page }) => {
    const calls = await mock(page, { rendered: true, tagged });
    await page.goto(`/dashboard/candidate/report-accessible/${REP}`);
    const doc = page.getByTestId("accessible-report");
    await expect(doc).toBeVisible({ timeout: 15000 });
    await expect(doc).toHaveAttribute("lang", "en");
    await expect(doc.getByTestId("test-tag")).toHaveText("TEST");
    await expect(doc.getByRole("heading", { level: 1 })).toHaveText("Behavioral Evidence Report");
    await expect(doc.getByRole("heading", { level: 2 })).toHaveText(["What this report is", "Observed conduct"]);
    await expect(doc.getByText("A record of what the participant did.")).toBeVisible();
    const table = doc.getByRole("table", { name: "Observed conduct" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveText(["Dimension", "Stage", "Statement"]);
    await expect(table.getByRole("row")).toHaveCount(3);
    await expect(table.getByRole("cell").nth(2)).toHaveText("Named the problem early.");
    expect(calls).toEqual([{ p_report: REP }]);
  });

  test("each section is labelled by its heading", async ({ page }) => {
    await mock(page, { rendered: true, tagged });
    await page.goto(`/dashboard/candidate/report-accessible/${REP}`);
    await expect(page.getByRole("region", { name: "What this report is" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("region", { name: "Observed conduct" })).toBeVisible();
  });

  test("a missing equivalent says so and invents nothing", async ({ page }) => {
    await mock(page, { rendered: false, refusal_code: "ACCESSIBLE_COPY_MISSING" });
    await page.goto(`/dashboard/candidate/report-accessible/${REP}`);
    await expect(page.getByTestId("acc-refused")).toContainText("not available yet", { timeout: 15000 });
    await expect(page.getByTestId("accessible-report")).toHaveCount(0);
  });

  test("a report that is not the participant's shows nothing of it", async ({ page }) => {
    await mock(page, { rendered: false, refusal_code: "CALLER_NOT_ENTITLED_TO_THIS_REPORT" });
    await page.goto(`/dashboard/candidate/report-accessible/${REP}`);
    await expect(page.getByTestId("acc-refused")).toContainText("not available to you", { timeout: 15000 });
    await expect(page.getByTestId("accessible-report")).toHaveCount(0);
  });
});
