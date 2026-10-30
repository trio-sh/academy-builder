/**
 * The mentor's "assign dimensions" page: what it writes must be accepted by the table's keys (profile ids, not the desk ids), and a refusal must be shown, not hidden (CR-338).
 * The database calls for this table are answered by the test, so nothing is written to the live project.
 */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const ASSIGNMENT = "11111111-0000-4000-8000-000000000001";
const CANDIDATE_DESK_ID = "22222222-0000-4000-8000-000000000002";
const CANDIDATE_USER = "33333333-0000-4000-8000-000000000003";
const json = (data: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(data) });
const mentorUser = () => {
  const d = JSON.parse(readFileSync("e2e/.auth/mentor.json", "utf8"));
  const raw = d.origins[0].localStorage.find((i: { name: string }) => /auth-token$/.test(i.name)).value;
  return JSON.parse(raw).user.id as string;
};

async function stub(page: Page, o: { fail?: boolean; existing?: Array<{ dimension_id: string }> } = {}) {
  const writes: Array<{ method: string; url: string; body: any }> = [];
  const asRows = (route: any, row: unknown) => route.request().headers()["accept"]?.includes("vnd.pgrst.object") ? json(row) : json([row]);
  await page.route("**/rest/v1/candidate_profiles*", (r) => r.request().method() === "GET" ? r.fulfill(asRows(r, { profile_id: CANDIDATE_USER })) : r.fulfill(json([])));
  await page.route(`**/rest/v1/profiles?*id=eq.${CANDIDATE_USER}*`, (r) => r.fulfill(asRows(r, { first_name: "Austine", last_name: "Gakehmi" })));
  await page.route("**/rest/v1/mentor_assigned_dimensions*", (r) => {
    const m = r.request().method();
    if (m === "GET") return r.fulfill(json(o.existing ?? []));
    writes.push({ method: m, url: r.request().url(), body: r.request().postDataJSON() });
    if (o.fail) return r.fulfill(json({ code: "23503", message: 'insert or update on table "mentor_assigned_dimensions" violates foreign key constraint "mentor_assigned_dimensions_mentor_id_fkey"' }, 409));
    return r.fulfill({ status: 201, body: "" });
  });
  return writes;
}
const url = `/dashboard/mentor/assign-dimensions/${ASSIGNMENT}/${CANDIDATE_DESK_ID}`;

test.describe("Mentor - assign dimensions", () => {
  test("saves with the mentor's and the candidate's profile ids, and says so", async ({ page }) => {
    const writes = await stub(page);
    await page.goto(url);
    await expect(page.getByRole("button", { name: /Integrity & Ethics/ })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /Integrity & Ethics/ }).click();
    await page.getByRole("button", { name: /Accountability & Ownership/ }).click();
    await expect(page.getByText("2 dimensions selected")).toBeVisible();
    await page.getByRole("button", { name: /Save Assigned Dimensions/ }).click();
    await expect(page.getByText("Dimensions saved", { exact: true })).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0].method).toBe("POST");
    expect(writes[0].url).toContain("on_conflict=assignment_id%2Cdimension_id");
    const rows = writes[0].body as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.dimension_id)).toEqual(["integrity_ethics", "accountability_ownership"]);
    for (const row of rows) {
      expect(row).toMatchObject({ assignment_id: ASSIGNMENT, mentor_id: mentorUser(), candidate_id: CANDIDATE_USER, is_active: true });
      expect(row.candidate_id).not.toBe(CANDIDATE_DESK_ID);
    }
  });

  test("a refusal from the database is shown to the mentor and the page does not claim it saved", async ({ page }) => {
    await stub(page, { fail: true });
    await page.goto(url);
    await page.getByRole("button", { name: /Integrity & Ethics/ }).click({ timeout: 20000 });
    await page.getByRole("button", { name: /Save Assigned Dimensions/ }).click();
    await expect(page.getByText("The dimensions were not saved")).toBeVisible();
    await expect(page.getByText("violates foreign key constraint").first()).toBeVisible();
    await expect(page.getByText("Dimensions saved", { exact: true })).toHaveCount(0);
  });

  test("a dimension taken off is switched off with an update, and one added is written", async ({ page }) => {
    const writes = await stub(page, { existing: [{ dimension_id: "integrity_ethics" }] });
    await page.goto(url);
    await expect(page.getByText("1 dimension selected")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /Integrity & Ethics/ }).click();
    await page.getByRole("button", { name: /Learning Agility/ }).click();
    await page.getByRole("button", { name: /Save Assigned Dimensions/ }).click();
    await expect(page.getByText("Dimensions saved", { exact: true })).toBeVisible();
    expect(writes.map((w) => w.method)).toEqual(["PATCH", "POST"]);
    expect(writes[0].body).toMatchObject({ is_active: false });
    expect(writes[0].url).toContain("dimension_id=in.");
    expect((writes[1].body as Array<{ dimension_id: string }>).map((r) => r.dimension_id)).toEqual(["learning_agility"]);
  });
});
