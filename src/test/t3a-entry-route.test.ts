/** CR-26 caller: who the participant is, what is refused, what the browser is told. */
import { describe, expect, it, vi } from "vitest";
import { handleEntryRequest, type EntryDeps } from "../server/t3aEntryRoute";

const USER = "11111111-1111-4111-8111-111111111111";
function deps(over: Partial<EntryDeps> = {}) {
  const rpc = vi.fn(async () => ({ data: { outcome: "eligible", stage_entry_event_id: "E1", reservation_id: "R1", reason: "SECRET" }, error: null }));
  const d: EntryDeps = { verifyToken: async (t) => (t === "good" ? USER : null), rpc, newSeed: () => 42, ...over };
  return { d, rpc };
}
const ok = { method: "POST", authorization: "Bearer good", body: { dimension: "D2", stage: "S1", key: "entry-key-0001" } };

describe("entry route", () => {
  it("only POST", async () => { expect((await handleEntryRequest({ ...ok, method: "GET" }, deps().d)).status).toBe(405); });
  it.each([undefined, "", "Basic good", "Bearer bad", "Bearer"])("no valid sign-in (%s) is 401 and nothing is called", async (a) => {
    const { d, rpc } = deps();
    expect((await handleEntryRequest({ ...ok, authorization: a }, d)).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("a token check that throws is 401", async () => {
    const { d, rpc } = deps({ verifyToken: async () => { throw new Error("down"); } });
    expect((await handleEntryRequest(ok, d)).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it("the participant is the token's account, whatever the body says", async () => {
    const { d, rpc } = deps();
    await handleEntryRequest({ ...ok, body: { ...ok.body, participant: "someone-else", p_participant: "someone-else" } }, d);
    expect(rpc).toHaveBeenCalledWith("t3a_cr26_request_entry", { p_participant: USER, p_dimension: "D2", p_stage: "S1", p_key: "entry-key-0001", p_seed: 42 });
  });
  it.each([{}, null, "x", { dimension: "D15", stage: "S1", key: "entry-key-0001" }, { dimension: "D2", stage: "S5", key: "entry-key-0001" }, { dimension: "D2", stage: "S1", key: "short" }, { dimension: "D2'; drop", stage: "S1", key: "entry-key-0001" }])("a malformed body %j is 400 and nothing is called", async (body) => {
    const { d, rpc } = deps();
    expect((await handleEntryRequest({ ...ok, body }, d)).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it("an eligible answer carries the entry and the reservation and nothing else", async () => {
    expect(await handleEntryRequest(ok, deps().d)).toEqual({ status: 200, body: { outcome: "eligible", stage_entry_event_id: "E1", reservation_id: "R1" } });
  });
  it.each([{ data: { outcome: "refused", reason: "ENTRY_NOT_ELIGIBLE", detail: "cooldown" }, error: null }, { data: null, error: { message: "boom" } }, { data: "x", error: null }, { data: { outcome: "eligible", stage_entry_event_id: "E1", reservation_id: "R1" }, error: { message: "late failure" } }])("every refusal or failure is the same fixed answer: %j", async (r) => {
    const { d } = deps({ rpc: async () => r });
    expect(await handleEntryRequest(ok, d)).toEqual({ status: 200, body: { outcome: "not_eligible" } });
  });
});
