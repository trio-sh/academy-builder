/** CR-21 caller: who commits, what is refused, what the browser is told. */
import { describe, expect, it, vi } from "vitest";
import { handleCommitRequest, type CommitDeps } from "../server/t3aCommitRoute";

const USER = "11111111-1111-4111-8111-111111111111";
const INST = "22222222-2222-4222-8222-222222222222";
const REC = "33333333-3333-4333-8333-333333333333";
function deps(data: unknown = { outcome: "committed", observation_record_id: REC, secret: "x" }, error: { message: string } | null = null, over: Partial<CommitDeps> = {}) {
  const rpc = vi.fn(async () => ({ data, error }));
  return { d: { verifyToken: async (t: string) => (t === "good" ? USER : null), rpc, ...over } as CommitDeps, rpc };
}
const ok = { method: "POST", authorization: "Bearer good", body: { stage_instance_id: INST, observation_record_id: REC, key: "commit-key-0001", p_actor: "someone-else", actor: "someone-else" } };
const FIXED = { status: 200, body: { outcome: "refused", reason: "SESSION_NOT_AVAILABLE" } };

describe("commit route", () => {
  it("only POST", async () => { expect((await handleCommitRequest({ ...ok, method: "PUT" }, deps().d)).status).toBe(405); });
  it.each([undefined, "", "Basic good", "Bearer bad"])("no valid sign-in (%s) is 401 and nothing is called", async (a) => {
    const { d, rpc } = deps(); expect((await handleCommitRequest({ ...ok, authorization: a }, d)).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it("the actor is the token's account, whatever the body says", async () => {
    const { d, rpc } = deps(); await handleCommitRequest(ok, d);
    expect(rpc).toHaveBeenCalledWith("t3a_cr21_commit_for", { p_actor: USER, p_stage_instance: INST, p_key: "commit-key-0001", p_observation_record: REC });
  });
  it.each([{}, null, { ...ok.body, stage_instance_id: "x" }, { ...ok.body, observation_record_id: "1; drop" }, { ...ok.body, key: "short" }])("a malformed body %j is 400 and nothing is called", async (body) => {
    const { d, rpc } = deps(); expect((await handleCommitRequest({ ...ok, body }, d)).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it("a commit and a repeat of it carry the record and nothing else", async () => {
    expect(await handleCommitRequest(ok, deps().d)).toEqual({ status: 200, body: { outcome: "committed", observation_record_id: REC } });
    expect(await handleCommitRequest(ok, deps({ outcome: "already_committed", observation_record_id: REC }).d)).toEqual({ status: 200, body: { outcome: "already_committed", observation_record_id: REC } });
  });
  it("a second commit of the session says so", async () => {
    expect(await handleCommitRequest(ok, deps({ outcome: "refused", reason: "SESSION_ALREADY_COMMITTED", observation_record_id: REC, detail: "x" }).d)).toEqual({ status: 200, body: { outcome: "refused", reason: "SESSION_ALREADY_COMMITTED", observation_record_id: REC } });
  });
  it.each([[{ outcome: "refused", reason: "RECORD_NOT_THIS_SESSIONS" }, null], [{ outcome: "refused", reason: "STAGE_INSTANCE_NOT_FOUND" }, null], [null, { message: "boom" }], ["x", null], [{ outcome: "committed", observation_record_id: REC }, { message: "late" }]])("every other refusal or failure is one fixed answer: %j", async (data, err) => {
    expect(await handleCommitRequest(ok, deps(data, err).d)).toEqual(FIXED);
  });
});
