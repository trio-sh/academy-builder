/**
 * CORR-007 CR-09: the participant's two release controls. The database calls are answered by the test (page.route), so nothing is written to the
 * live project; the rules themselves are covered by src/test/db/cr09-release-routes.db.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const REP = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NOTICE_TEXT = "### Sharing\n\n2.11. You can share an issued report in two ways, and each is a separate decision:\n\n(a) **Make it available to approved employers.** Every employer approved on our platform can then open and read your full report. Approved employers can include your current employer. If you make your report available to approved employers, your current employer may read it.\n\n(b) **Send it to a particular person you choose.** That person receives a secure link.\n\n2.12. Next paragraph.";
const INDEP = "These are two separate controls. Turning general availability off does not end a direct release, and ending a direct release does not turn general availability off.";

type World = { ga: boolean; releases: { direct_release_id: string; recipient_name: string; recipient_org: string | null; expires_at: string; revoked: boolean }[] };

async function mock(page: Page, w: World) {
  const calls: { name: string; body: any }[] = [];
  const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/rest/v1/rpc/*", (r) => {
    const name = new URL(r.request().url()).pathname.split("/").pop()!;
    const body = r.request().postDataJSON();
    if (name === "t3a_release_state") return r.fulfill(json({ outcome: "state", general_availability_on: w.ga, direct_releases: w.releases, independence_statement: INDEP }));
    if (name === "t3a_release_access_record") return r.fulfill(json([{ route: "direct_release", read_at: "2026-10-20T10:00:00Z", report_version: 1, reader: "Ana Cruz" }]));
    if (name === "t3a_consent_notice") return r.fulfill(json({ rendered: true, text: NOTICE_TEXT, notice_version: "1.2", notice_hash: "h" }));
    calls.push({ name, body });
    if (name === "t3a_ga_set") { w.ga = body.p_on; return r.fulfill(json({ outcome: "recorded" })); }
    if (name === "t3a_direct_release_create") {
      w.releases.push({ direct_release_id: "d1", recipient_name: body.p_recipient_name, recipient_org: body.p_recipient_org, expires_at: body.p_expires_at, revoked: false });
      return r.fulfill(json({ outcome: "released", direct_release_id: "d1", token: "tok123" }));
    }
    if (name === "t3a_direct_release_revoke") { w.releases[0].revoked = true; return r.fulfill(json({ outcome: "revoked", general_availability_unaffected: true })); }
    return r.continue();
  });
  return calls;
}

test.describe("Candidate - release controls", () => {
  test("shows both controls, says they are independent, and lists who has read it", async ({ page }) => {
    await mock(page, { ga: false, releases: [] });
    await page.goto(`/dashboard/candidate/release/${REP}`);
    await expect(page.getByTestId("release-controls")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("independence")).toContainText("two separate controls");
    await expect(page.getByTestId("ga-state")).toHaveText("Off");
    await expect(page.getByTestId("direct-control")).toBeVisible();
    await expect(page.getByTestId("access-record")).toContainText("Ana Cruz, version 1");
  });

  test("turning general availability on shows the employer warning first and sends the notice version", async ({ page }) => {
    const calls = await mock(page, { ga: false, releases: [] });
    await page.goto(`/dashboard/candidate/release/${REP}`);
    await page.getByRole("button", { name: "Turn on", exact: true }).click();
    const warn = page.getByTestId("ga-warning");
    await expect(warn).toContainText("your current employer may read it");
    expect(calls.filter((c) => c.name === "t3a_ga_set")).toHaveLength(0); // nothing sent before the warning is accepted
    await warn.getByRole("button", { name: "I understand, turn on" }).click();
    await expect(page.getByTestId("ga-state")).toHaveText("On");
    expect(calls.find((c) => c.name === "t3a_ga_set")!.body).toEqual({ p_ber_report_id: REP, p_on: true, p_warning_version: "1.2" });
    await expect(page.getByRole("status")).toContainText("Direct releases are not affected");
  });

  test("cancelling the warning turns nothing on", async ({ page }) => {
    const calls = await mock(page, { ga: false, releases: [] });
    await page.goto(`/dashboard/candidate/release/${REP}`);
    await page.getByRole("button", { name: "Turn on", exact: true }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(500);
    expect(calls.filter((c) => c.name === "t3a_ga_set")).toHaveLength(0);
    await expect(page.getByTestId("ga-state")).toHaveText("Off");
  });

  test("a direct release shows its link once, lists the person, and ending it leaves general availability alone", async ({ page }) => {
    const calls = await mock(page, { ga: true, releases: [] });
    await page.goto(`/dashboard/candidate/release/${REP}`);
    await page.getByLabel("Name").fill("Ana Cruz");
    await page.getByLabel("Email address").fill("ana@corp.example");
    await page.getByLabel("Link works until").fill("2027-01-31");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByTestId("release-link")).toContainText("/report#code=tok123");
    await expect(page.getByTestId("direct-list")).toContainText("Ana Cruz");
    expect(calls.find((c) => c.name === "t3a_direct_release_create")!.body).toMatchObject({ p_ber_report_id: REP, p_recipient_name: "Ana Cruz", p_recipient_address: "ana@corp.example" });
    await page.getByRole("button", { name: "End", exact: true }).click();
    await expect(page.getByTestId("direct-list")).toContainText("(ended)");
    await expect(page.getByTestId("ga-state")).toHaveText("On");
    await expect(page.getByRole("status")).toContainText("General availability is not affected");
  });
});
