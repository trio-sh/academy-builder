/**
 * CORR-007 notices: the Participant Consent and Privacy Notice shown word for word with its version, and the amendment notice that tells the participant
 * a report they made available was corrected, with a way to their release controls. The database calls are answered by the test, so nothing is read from or written to
 * the live project; the notice text rules are covered by the database tests.
 */
import { test, expect } from "@playwright/test";

const REP = "99999999-0000-4000-8000-000000000009";
const json = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
const NOTICE = "### What this is\n\n2.1. The 3rd Academy runs structured workplace pressure moments. We do not collect observations from your past or current employment.\n\n2.11. You can share an issued report in two ways:\n\n(a) **Make it available to approved employers.** Approved employers can include your current employer.\n\n### Your choices\n\n3.1. You can change a choice at any time.";

test.describe("Candidate - notices", () => {
  test("the privacy notice shows its version, headings and paragraphs word for word", async ({ page }) => {
    await page.route("**/rest/v1/rpc/t3a_consent_notice*", (r) => r.fulfill(json({ rendered: true, notice_version: "1.2", notice_hash: "h", text: NOTICE })));
    await page.goto("/dashboard/candidate/notice");
    const doc = page.getByTestId("privacy-notice");
    await expect(doc).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("notice-version")).toHaveText("Version 1.2");
    await expect(doc.getByRole("heading", { level: 2 })).toHaveText(["What this is", "Your choices"]);
    await expect(doc).toContainText("We do not collect observations from your past or current employment.");
    await expect(doc).toContainText("Approved employers can include your current employer.");
    await expect(doc.locator("strong")).toHaveText("Make it available to approved employers.");
    await expect(doc).not.toContainText("###");
    await expect(doc).not.toContainText("**");
  });

  test("when the notice is not loaded nothing stands in its place", async ({ page }) => {
    await page.route("**/rest/v1/rpc/t3a_consent_notice*", (r) => r.fulfill(json({ rendered: false, reason: "consent_notice_unloaded" })));
    await page.goto("/dashboard/candidate/notice");
    await expect(page.getByTestId("notice-unavailable")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("privacy-notice")).toHaveCount(0);
  });

  test("an amendment notice shows its message and leads to the release controls of that report", async ({ page }) => {
    await page.route("**/rest/v1/notifications*", (r) => {
      if (r.request().method() !== "GET") return r.fulfill(json([]));
      return r.fulfill(json([
        { id: "n1", user_id: "u", type: "report_amended_general_availability", title: "Your report was amended", is_read: false, created_at: "2026-10-23T09:00:00Z",
          message: "Your report was amended while it is available to approved employers. Approved employers now see the new version; the earlier version is marked superseded. A report you released directly stays bound to the version you released.",
          metadata: { ber_report_id: REP, supersedes: "x" } },
        { id: "n2", user_id: "u", type: "endorsement", title: "Something else", is_read: true, created_at: "2026-10-22T09:00:00Z", message: "Other.", metadata: null },
      ]));
    });
    await page.goto("/dashboard/candidate/notifications");
    await expect(page.getByText("Your report was amended", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("stays bound to the version you released")).toBeVisible();
    const links = page.getByTestId("amend-link");
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute("href", `/dashboard/candidate/release/${REP}`);
  });

  test("the release warning links to the full notice", async ({ page }) => {
    await page.route("**/rest/v1/rpc/*", (r) => {
      const name = new URL(r.request().url()).pathname.split("/").pop()!;
      if (name === "t3a_release_state") return r.fulfill(json({ outcome: "state", general_availability_on: false, direct_releases: [], independence_statement: "x" }));
      if (name === "t3a_consent_notice") return r.fulfill(json({ rendered: true, notice_version: "1.2", notice_hash: "h", text: NOTICE }));
      return r.fulfill(json([]));
    });
    await page.goto(`/dashboard/candidate/release/${REP}`);
    await page.getByRole("button", { name: "Turn on", exact: true }).click();
    await expect(page.getByTestId("read-notice")).toHaveAttribute("href", "/dashboard/candidate/notice");
  });
});
