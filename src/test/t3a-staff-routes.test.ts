/** CR-22 and CR-21 staff callers: who acts, what is refused, what the browser is told. */
import { describe, expect, it, vi } from "vitest";
import { handleInterruptRequest, handleSuspendRequest, type StaffDeps } from "../server/t3aStaffRoutes";

const USER = "11111111-1111-4111-8111-111111111111";
const GS = "22222222-2222-4222-8222-222222222222";
const SRC = "33333333-3333-4333-8333-333333333333";
function deps(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data, error }));
  return { d: { verifyToken: async (t: string) => (t === "good" ? USER : null), rpc } as StaffDeps, rpc };
}
const REC = { outcome: "recorded", interruption_id: "I1", attempt_ending: "withdrawal_participant_choice", attempt_counted: false, excludes_determinations: false, new_group_required: true, new_source_required: true, substitution_permitted: false, finding_recorded: false, internal: "x" };
const SUS = { outcome: "suspended", review_id: "R1", served_instances: 2, observations: 2, reports: 1, cancelled_automatically: false, internal: "x" };
const FIXED = { status: 200, body: { outcome: "refused", reason: "NOT_AVAILABLE" } };
const intr = { method: "POST", authorization: "Bearer good", body: { group_session_id: GS, kind: "observed_withdraws", actor: "other", p_actor: "other" } };
const susp = { method: "POST", authorization: "Bearer good", body: { source_version_id: SRC, reason: "wrong answer key found", actor: "other" } };

describe.each([["interrupt", handleInterruptRequest, intr, REC], ["suspend", handleSuspendRequest, susp, SUS]] as const)("%s route", (_n, h, ok, good) => {
  it("only POST", async () => { expect((await h({ ...ok, method: "GET" }, deps(good).d)).status).toBe(405); });
  it.each([undefined, "", "Basic good", "Bearer bad"])("no valid sign-in (%s) is 401 and nothing is called", async (a) => {
    const { d, rpc } = deps(good); expect((await h({ ...ok, authorization: a }, d)).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it("the actor is the token's account, whatever the body says", async () => {
    const { d, rpc } = deps(good); await h(ok, d);
    expect((rpc.mock.calls[0] as unknown[])[1]).toMatchObject({ p_actor: USER });
  });
  it("a success passes on only the listed fields", async () => {
    const r = await h(ok, deps(good).d); expect(r.status).toBe(200); expect(r.body).not.toHaveProperty("internal"); expect(r.body.outcome).toBe(good.outcome);
  });
  it.each([[{ outcome: "refused", reason: "NOT_AVAILABLE", detail: "x" }, null], [null, { message: "boom" }], ["x", null], [good, { message: "late" }]])("every refusal or failure is one fixed answer: %j", async (data, err) => {
    expect(await h(ok, deps(data, err).d)).toEqual(FIXED);
  });
});
describe("interrupt body", () => {
  it.each([{}, null, { group_session_id: "x", kind: "observed_withdraws" }, { group_session_id: GS, kind: "made_up" }, { group_session_id: GS, kind: "observed_withdraws", affected_participant_id: "x" }, { group_session_id: GS, kind: "observed_withdraws", content_revealed: "yes" }])("%j is 400 and nothing is called", async (body) => {
    const { d, rpc } = deps(REC); expect((await handleInterruptRequest({ ...intr, body }, d)).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it("optional flags default to false and the affected account to null", async () => {
    const { d, rpc } = deps(REC); await handleInterruptRequest({ ...intr, body: { group_session_id: GS, kind: "technical_disconnection" } }, d);
    expect(rpc).toHaveBeenCalledWith("t3a_cr22_interrupt_for", { p_actor: USER, p_group_session: GS, p_kind: "technical_disconnection", p_affected: null, p_first_decision_reached: false, p_content_revealed: false });
  });
});
describe("suspend body", () => {
  it.each([{}, null, { source_version_id: "x", reason: "wrong answer key" }, { source_version_id: SRC, reason: "no" }, { source_version_id: SRC, reason: 5 }, { source_version_id: SRC, reason: "x".repeat(2001) }])("%j is 400 and nothing is called", async (body) => {
    const { d, rpc } = deps(SUS); expect((await handleSuspendRequest({ ...susp, body }, d)).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
});
