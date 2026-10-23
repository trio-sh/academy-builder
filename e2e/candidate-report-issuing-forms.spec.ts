/**
 * CORR-007 CR-10 and Directive D-07: every issued report renders through the multi page renderer; the single page form is kept for the specimen
 * only. The database calls are answered by the test, so nothing is read from or written to the live project; the rule itself is covered by
 * src/test/db/cr06-cr10-cr27.db.test.ts.
 */
import { test, expect } from "@playwright/test";

const REP = "eeeeeeee-0000-4000-8000-000000000005";
const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });

test.describe("Report forms - single page closed for real reports", () => {
  test("a real report asked for on one page is refused and pointed to the multi page form, and no face is drawn", async ({ page }) => {
    const calls: string[] = [];
    let gateBody: unknown = null;
    await page.route("**/rest/v1/rpc/*", (r) => {
      const name = new URL(r.request().url()).pathname.split("/").pop()!;
      calls.push(name);
      if (name === "t3a_report_render_gate") gateBody = r.request().postDataJSON();
      if (name === "t3a_report_render_gate") return r.fulfill(json({ outcome: "refused", reason: "format_mismatch", detail: "every issued report renders through the multi page renderer; the single page form is kept for the specimen only" }));
      return r.fulfill(json({}));
    });
    await page.goto(`/print/ber/${REP}`);
    const box = page.getByTestId("gate-refused");
    await expect(box).toContainText("format_mismatch", { timeout: 15000 });
    await expect(box).toContainText("kept for the specimen only");
    await expect(page.getByTestId("open-multi")).toHaveAttribute("href", `/print/ber-multi/${REP}`);
    expect(gateBody).toEqual({ p_ber_report_id: REP, p_form: "one_page" });
    expect(calls).not.toContain("t3a_d1_report_face");
    expect(calls).not.toContain("t3a_rce_render_check");
  });

  test("the specimen passes the gate and goes on to the render check", async ({ page }) => {
    const calls: string[] = [];
    await page.route("**/rest/v1/rpc/*", (r) => {
      const name = new URL(r.request().url()).pathname.split("/").pop()!;
      calls.push(name);
      if (name === "t3a_report_render_gate") return r.fulfill(json({ outcome: "renderable", form: "one_page", dimension_blocks: 1 }));
      if (name === "t3a_rce_render_check") return r.fulfill(json({ ok: false, refusal_code: "TEST_STOP", detail: "stopped by the test" }));
      return r.fulfill(json({}));
    });
    await page.goto(`/print/ber/${REP}`);
    await expect(page.getByText("TEST_STOP")).toBeVisible({ timeout: 15000 });
    expect(calls.indexOf("t3a_report_render_gate")).toBeLessThan(calls.indexOf("t3a_rce_render_check"));
    await expect(page.getByTestId("gate-refused")).toHaveCount(0);
  });

  test("the multi page form refuses with its code and draws no page when the server refuses", async ({ page }) => {
    await page.route("**/rest/v1/rpc/t3a_ber_multipage_claims*", (r) => r.fulfill(json({ outcome: "refused", reason: "REPORT_NOT_ISSUED", detail: "only an issued report renders" })));
    await page.goto(`/print/ber-multi/${REP}`);
    await expect(page.getByText("REPORT_NOT_ISSUED")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".mp-page")).toHaveCount(0);
  });
});
