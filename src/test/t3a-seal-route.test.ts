import { describe, expect, it } from "vitest";
import { generateKeyPairSync, verify as edVerify } from "node:crypto";
import { handleSealRequest, signPending, signerFromSeed, type SealRouteDeps } from "../server/t3aSealRoute";

type Rpc = SealRouteDeps["rpc"];
const ok = (data: unknown) => ({ data, error: null });

function world(items: { composed_statement_id: string; payload: string }[], store: (a: Record<string, unknown>) => unknown = () => ({ outcome: "sealed" })) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc: Rpc = async (name, args) => {
    calls.push({ name, args });
    if (name === "t3a_commit_seal_pending") return ok({ outcome: "pending", key_version: "kv1", items });
    if (name === "t3a_commit_seal_store") return ok(store(args));
    if (name === "t3a_actor_is_staff") return ok(args.p_actor === "staff");
    return ok(null);
  };
  return { calls, rpc };
}
const seed = Buffer.alloc(32, 9).toString("base64");

describe("signerFromSeed", () => {
  it("makes Ed25519 signatures that verify under the matching public key and under no other", async () => {
    const sign = signerFromSeed(seed);
    const sig = await sign("payload one");
    expect(sig).toMatch(/^[0-9a-f]{128}$/);
    const pubDer = (await import("node:crypto")).createPublicKey((await import("node:crypto")).createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.alloc(32, 9)]), format: "der", type: "pkcs8" }));
    expect(edVerify(null, Buffer.from("payload one"), pubDer, Buffer.from(sig, "hex"))).toBe(true);
    expect(edVerify(null, Buffer.from("payload two"), pubDer, Buffer.from(sig, "hex"))).toBe(false);
    expect(edVerify(null, Buffer.from("payload one"), generateKeyPairSync("ed25519").publicKey, Buffer.from(sig, "hex"))).toBe(false);
  });
  it("refuses a seed that is not 32 bytes", () => {
    expect(() => signerFromSeed(Buffer.alloc(31).toString("base64"))).toThrow();
    expect(() => signerFromSeed("")).toThrow();
  });
});

describe("signPending", () => {
  it("signs each waiting item and stores it with the key version the database named; the key never goes to the database", async () => {
    const w = world([{ composed_statement_id: "a", payload: "pa" }, { composed_statement_id: "b", payload: "pb" }]);
    const r = await signPending({ rpc: w.rpc, sign: signerFromSeed(seed) });
    expect(r).toEqual({ signed: 2, refused: 0, failed: 0, key_version: "kv1" });
    const stores = w.calls.filter((c) => c.name === "t3a_commit_seal_store");
    expect(stores.map((c) => c.args.p_composed)).toEqual(["a", "b"]);
    for (const s of stores) { expect(s.args.p_key_version).toBe("kv1"); expect(Object.keys(s.args).sort()).toEqual(["p_composed", "p_key_version", "p_signature"]); expect(String(s.args.p_signature)).toMatch(/^[0-9a-f]{128}$/); }
    expect(JSON.stringify(w.calls)).not.toContain(seed);
  });
  it("counts a refusal by the database and a signing failure separately, and goes on with the rest", async () => {
    const w = world([{ composed_statement_id: "a", payload: "pa" }, { composed_statement_id: "b", payload: "pb" }, { composed_statement_id: "c", payload: "pc" }],
      (a) => (a.p_composed === "a" ? { outcome: "refused", reason: "signature_invalid" } : { outcome: "sealed" }));
    const sign = signerFromSeed(seed);
    const r = await signPending({ rpc: w.rpc, sign: async (p) => { if (p === "pb") throw new Error("boom"); return sign(p); } });
    expect(r).toEqual({ signed: 1, refused: 1, failed: 1, key_version: "kv1" });
  });
  it("does nothing when the database has nothing pending or the current key is not a key pair", async () => {
    for (const data of [{ outcome: "none", reason: "current_key_is_not_a_key_pair" }, { outcome: "refused", reason: "service_route_only" }, null]) {
      const calls: string[] = [];
      const r = await signPending({ rpc: async (n) => { calls.push(n); return { data, error: null }; }, sign: signerFromSeed(seed) });
      expect(r).toEqual({ signed: 0, refused: 0, failed: 0, key_version: null }); expect(calls).toEqual(["t3a_commit_seal_pending"]);
    }
    const e = await signPending({ rpc: async () => ({ data: null, error: { message: "down" } }), sign: signerFromSeed(seed) });
    expect(e.signed).toBe(0);
  });
});

describe("handleSealRequest", () => {
  const deps = (rpc: Rpc, cron: string | null = "cron-secret"): SealRouteDeps => ({ rpc, sign: signerFromSeed(seed), cronSecret: cron, verifyToken: async (t) => (t === "staff-token" ? "staff" : t === "user-token" ? "user" : null) });
  it("needs a bearer token; anything else is 401 and signs nothing", async () => {
    const w = world([{ composed_statement_id: "a", payload: "pa" }]);
    for (const authorization of [undefined, null, "", "Basic abc", "Bearer nonsense"]) {
      expect((await handleSealRequest({ method: "POST", authorization }, deps(w.rpc))).status).toBe(401);
    }
    expect(w.calls.filter((c) => c.name === "t3a_commit_seal_store")).toEqual([]);
  });
  it("accepts the scheduled job secret and a staff member, and refuses an ordinary signed-in user", async () => {
    const w = world([{ composed_statement_id: "a", payload: "pa" }]);
    expect(await handleSealRequest({ method: "GET", authorization: "Bearer cron-secret" }, deps(w.rpc))).toEqual({ status: 200, body: { signed: 1, refused: 0, failed: 0 } });
    expect((await handleSealRequest({ method: "POST", authorization: "Bearer staff-token" }, deps(w.rpc))).status).toBe(200);
    const before = w.calls.length;
    expect((await handleSealRequest({ method: "POST", authorization: "Bearer user-token" }, deps(w.rpc))).status).toBe(401);
    expect(w.calls.slice(before).filter((c) => c.name === "t3a_commit_seal_store")).toEqual([]);
  });
  it("with no secret set, the secret is not a way in; an empty token never matches", async () => {
    const w = world([]);
    expect((await handleSealRequest({ method: "POST", authorization: "Bearer cron-secret" }, deps(w.rpc, null))).status).toBe(401);
    expect((await handleSealRequest({ method: "POST", authorization: "Bearer cron-secret" }, deps(w.rpc, ""))).status).toBe(401);
  });
  it("only POST and GET are allowed, and the answer carries counts only", async () => {
    const w = world([{ composed_statement_id: "a", payload: "SECRET PAYLOAD" }]);
    expect((await handleSealRequest({ method: "DELETE", authorization: "Bearer cron-secret" }, deps(w.rpc))).status).toBe(405);
    const r = await handleSealRequest({ method: "POST", authorization: "Bearer cron-secret" }, deps(w.rpc));
    expect(Object.keys(r.body).sort()).toEqual(["failed", "refused", "signed"]);
    expect(JSON.stringify(r)).not.toContain("SECRET PAYLOAD");
  });
});
