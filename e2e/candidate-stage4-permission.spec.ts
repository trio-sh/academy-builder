/**
 * CORR-007 CR-30: the Stage 4 group session permission screen. One question, the approved text word for word, Yes and No.
 * The two database calls are answered by the test (page.route), so nothing is written to the live project; the server rule itself is
 * covered by src/test/db/cr30-stage4-permission.db.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const GS = "11111111-2222-4333-8444-555555555555";
const TEXT = "In this session you will take part in a live discussion on Google Meet with a mentor and three people who play set roles. Only you are observed. The session is not recorded. The other people will see and hear what you say, and each has agreed to keep the session confidential. You can stop at any time by saying so; stopping is not held against you and records no finding.\nDo you agree to take part in this group session?";

async function mockRpc(page: Page, answer: { outcome: string }) {
  const calls: { name: string; body: unknown }[] = [];
  await page.route("**/rest/v1/rpc/t3a_group_participation_notice*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rendered: true, text: TEXT, notice_version: "1.0" }) }));
  await page.route("**/rest/v1/rpc/t3a_cr30_answer*", (r) => {
    calls.push({ name: "t3a_cr30_answer", body: r.request().postDataJSON() });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer) });
  });
  return calls;
}

test.describe("Candidate - Stage 4 group session permission", () => {
  test("shows the approved text word for word with one question and two answers", async ({ page }) => {
    await mockRpc(page, { outcome: "recorded" });
    await page.goto(`/dashboard/candidate/group-session/${GS}`);
    const box = page.getByTestId("group-participation-permission");
    await expect(box).toBeVisible({ timeout: 15000 });
    await expect(box).toContainText("In this session you will take part in a live discussion on Google Meet with a mentor and three people who play set roles.");
    await expect(box).toContainText("Do you agree to take part in this group session?");
    await expect(box.getByRole("button", { name: "Yes", exact: true })).toBeVisible();
    await expect(box.getByRole("button", { name: "No", exact: true })).toBeVisible();
    await expect(box.getByRole("checkbox")).toHaveCount(0);
  });

  test("Yes sends one answer for this session and confirms it", async ({ page }) => {
    const calls = await mockRpc(page, { outcome: "recorded" });
    await page.goto(`/dashboard/candidate/group-session/${GS}`);
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Your permission is recorded");
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ p_group_session: GS, p_answer: "yes" });
  });

  test("No sends nothing and offers no session", async ({ page }) => {
    const calls = await mockRpc(page, { outcome: "recorded" });
    await page.goto(`/dashboard/candidate/group-session/${GS}`);
    await page.getByRole("button", { name: "No", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Nothing has been recorded");
    await page.waitForTimeout(750); // a stray request would have been sent by now
    expect(calls).toHaveLength(0);
  });

  test("a refused save is not shown as agreement", async ({ page }) => {
    await mockRpc(page, { outcome: "refused" });
    await page.goto(`/dashboard/candidate/group-session/${GS}`);
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("could not be saved");
    await expect(page.getByRole("status")).not.toContainText("recorded");
  });
});
