/**
 * CR-340. The four named dual-role accounts on the live project, signed in as through the real client session, one screen per desk and one data-layer probe per privilege.
 * Run only when DUAL_CREDS names the file the account script wrote (passwords and ids); the project is not part of the default run.
 *   DUAL_CREDS=<file> npx playwright test --project=dual-role-tests
 */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://tnjyywtulpdyackmwnca.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_4B9I2p0hFbDzJeLxVthbMQ_5C59i2oV";
const STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
const SHOTS = process.env.DUAL_SHOTS ?? "test-results/dual-role";
const creds = JSON.parse(readFileSync(process.env.DUAL_CREDS!, "utf8"));
const ids = creds._ids;
mkdirSync(SHOTS, { recursive: true });

const DESKS = { mentor: "/dashboard/mentor", candidate: "/dashboard/candidate", employer: "/dashboard/employer", admin: "/dashboard/admin", school: "/dashboard/school" };

async function signIn(email: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: creds[email] }) });
  const session = await r.json();
  expect(session.access_token, `sign-in refused for ${email}`).toBeTruthy();
  return session;
}
async function open(page: Page, session: unknown, path: string) {
  await page.goto("/");
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(session)] as const);
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});
}
const api = (token: string, path: string, init: RequestInit = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
const rows = async (token: string, path: string) => { const r = await api(token, path); const j = await r.json(); return Array.isArray(j) ? j : []; };

const ACCOUNTS = [
  { key: "mentor_participant", email: "dual-mentor-participant@t3a.test", desk: "mentor" as const, other: ["candidate", "employer", "admin"] as const },
  { key: "mentor_employer", email: "dual-mentor-employer@t3a.test", desk: "mentor" as const, other: ["employer", "candidate", "admin"] as const },
  { key: "participant_employer", email: "dual-participant-employer@t3a.test", desk: "candidate" as const, other: ["employer", "mentor", "admin"] as const },
  { key: "admin_mentor", email: "dual-admin-mentor@t3a.test", desk: "mentor" as const, other: ["admin", "candidate", "employer"] as const },
];

for (const a of ACCOUNTS) {
  test.describe(a.key, () => {
    test(`signs in and reaches the ${a.desk} desk, and the other desks do not open`, async ({ page }) => {
      const session = await signIn(a.email);
      await open(page, session, DESKS[a.desk]);
      await expect(page).not.toHaveURL(/\/login\b/);
      await expect(page).toHaveURL(new RegExp(DESKS[a.desk].replace("/", "\\/")));
      await page.screenshot({ path: `${SHOTS}/${a.key}-${a.desk}-desk.png`, fullPage: true });
      for (const o of a.other) {
        if (o === a.desk) continue;
        await page.goto(DESKS[o]);
        await page.waitForLoadState("networkidle").catch(() => {});
        await expect(page, `${a.key} opened the ${o} desk`).not.toHaveURL(new RegExp(DESKS[o].replace("/", "\\/") + "(/|$)"));
        await page.screenshot({ path: `${SHOTS}/${a.key}-${o}-desk-refused.png` });
      }
    });
  });
}

test.describe("what each pair may do at the data layer", () => {
  const token = async (email: string) => (await signIn(email)).access_token as string;

  for (const k of ["mentor_participant", "mentor_employer", "admin_mentor"] as const) {
    const email = ACCOUNTS.find((x) => x.key === k)!.email;
    test(`${k}: reads their own mentee and not a stranger's, and not the mentee's private note`, async () => {
      const t = await token(email);
      expect((await rows(t, `candidate_profiles?id=eq.${ids.mentee_candidate_row}&select=id`)).length).toBe(1);
      expect((await rows(t, `candidate_profiles?id=eq.${ids.stranger_candidate_row}&select=id`)).length).toBe(k === "admin_mentor" ? 1 : 0); // oversight reads every profile by design
      expect((await rows(t, `t3a_growth_log_entry?entry_id=eq.${ids.mentee_note}&select=entry_id`)).length).toBe(0);
    });
    test(`${k}: a dimension on their own assignment is accepted and on a stranger's refused`, async () => {
      const t = await token(email);
      const mine = ids.mentee_assignment[k];
      const ok = await api(t, "mentor_assigned_dimensions?on_conflict=assignment_id,dimension_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ assignment_id: mine.id, mentor_id: ids.accounts[k], candidate_id: ids.accounts.mentee, dimension_id: "integrity_ethics", is_active: true }) });
      expect(ok.status, await ok.clone().text()).toBeLessThan(300);
      await api(t, `mentor_assigned_dimensions?assignment_id=eq.${mine.id}`, { method: "DELETE" });
      const other = ACCOUNTS.filter((x) => ["mentor_participant", "mentor_employer", "admin_mentor"].includes(x.key) && x.key !== k)[0].key as string;
      const foreign = await api(t, "mentor_assigned_dimensions", { method: "POST", body: JSON.stringify({ assignment_id: ids.mentee_assignment[other].id, mentor_id: ids.accounts[k], candidate_id: ids.accounts.mentee, dimension_id: "integrity_ethics", is_active: true }) });
      expect(foreign.status).toBeGreaterThanOrEqual(400);
    });
    test(`${k}: an observation is ${k === "admin_mentor" ? "refused (administrative standing)" : "accepted"}`, async () => {
      const t = await token(email);
      const mine = ids.mentee_assignment[k];
      const r = await api(t, "mentor_observations", { method: "POST", body: JSON.stringify({ assignment_id: mine.id, mentor_id: mine.mp, candidate_id: mine.cp }) });
      if (k === "admin_mentor") { expect(r.status).toBeGreaterThanOrEqual(400); expect(await r.text()).toContain("OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE"); }
      else { expect(r.status, await r.clone().text()).toBeLessThan(300); await api(t, `mentor_observations?assignment_id=eq.${mine.id}`, { method: "DELETE" }); }
    });
  }

  for (const k of ["mentor_participant", "participant_employer"] as const) {
    test(`${k}: keeps a private notebook that nobody else reads`, async () => {
      const email = ACCOUNTS.find((x) => x.key === k)!.email;
      const t = await token(email);
      const w = await api(t, "t3a_growth_log_entry", { method: "POST", body: JSON.stringify({ created_by: ids.accounts[k], entry_kind: "practice_note", text: "own note" }) });
      expect(w.status, await w.clone().text()).toBeLessThan(300);
      const rid = (await w.json())[0].entry_id;
      const seenByMentee = await rows(await token("dual-mentee@t3a.test"), `t3a_growth_log_entry?entry_id=eq.${rid}&select=entry_id`);
      expect(seenByMentee.length).toBe(0);
      await api(t, `t3a_growth_log_entry?entry_id=eq.${rid}`, { method: "DELETE" });
    });
  }

  for (const [k, expectOpen] of [["mentor_employer", true], ["participant_employer", true], ["mentor_participant", false], ["admin_mentor", false]] as const) {
    test(`${k}: the employer pool is ${expectOpen ? "reachable" : "refused"}`, async () => {
      const t = await token(ACCOUNTS.find((x) => x.key === k)!.email);
      const r = await api(t, "rpc/t3a_employer_pool_query", { method: "POST", body: "{}" });
      const body = await r.text();
      const refused = r.status >= 400 || /EMPLOYER_NOT_VERIFIED|NOT_VERIFIED/.test(body);
      expect(refused, `${k}: ${r.status} ${body.slice(0, 160)}`).toBe(!expectOpen);
    });
  }
});
