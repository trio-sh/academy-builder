/** The commit service's signing step against the real database: it signs what is waiting, the database checks each signature against the registered public key, and a service holding the wrong key stores nothing. Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrivateKey, createPublicKey, randomBytes } from "node:crypto";
import type pg from "pg";
import { signPending, signerFromSeed, type SealDeps } from "../../server/t3aSealRoute";
import { RUN, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string; let v1 = "k1"; let ver = ""; const seed = randomBytes(32);
const PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const pubHex = (s: Buffer) => Buffer.from((createPublicKey(createPrivateKey({ key: Buffer.concat([PREFIX, s]), format: "der", type: "pkcs8" })).export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
const current = async () => (await run(c, `select key_version v from t3a_commit_seal_key_version where status='current'`))[0].v as string;
const setCurrent = async (v: string) => { await run(c, `update t3a_commit_seal_key_version set status='retired' where status='current'`); await run(c, `update t3a_commit_seal_key_version set status='current' where key_version='${v}'`); };
const rpc: SealDeps["rpc"] = async (name, a) => {
  try {
    const vals = Object.values(a); const args = vals.map((v) => `$sq$${v}$sq$`).join(",");
    return { data: (await asService(c, `select ${name}(${args}) r`)).r, error: null };
  } catch (e) { return { data: null, error: { message: String(e) } }; }
};
async function composed(): Promise<string> {
  const sv = (await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-1", reviewer })).version;
  const p = await mkParticipant(c, `sr-p-${RUN}-${Math.random().toString(36).slice(2, 8)}`);
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try {
    const o = (await c.query(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${p}','D2','S2','${reviewer}', true) returning observation_record_id i`)).rows[0].i;
    const r = (await c.query(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions)
      values ('D2','${o}','${p}','S2','${sv}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb) returning composed_statement_id i`)).rows[0].i as string;
    await c.query("commit"); return r;
  } catch (e) { await c.query("rollback"); throw e; }
}
const sealed = async (id: string) => (await run(c, `select count(*)::int n from t3a_commit_seal where composed_statement_id='${id}'`))[0].n as number;

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `sr-rev-${RUN}`); v1 = await current();
  ver = `sr_${String(RUN).slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
  const r = (await asService(c, `select t3a_commit_seal_rotate('${ver}','none','key_pair','${pubHex(seed)}') r`)).r;
  expect(r.outcome).toBe("rotated");
});
afterAll(async () => { await setCurrent(v1); await c.end(); });

describe("the signing step against the database", () => {
  it("signs every waiting statement; each seal verifies; a second run finds nothing", async () => {
    const ids = [await composed(), await composed()];
    for (const id of ids) await asService(c, `select t3a_seal_composed('${id}', false)`);
    const r = await signPending({ rpc, sign: signerFromSeed(seed.toString("base64")) });
    expect(r.signed).toBeGreaterThanOrEqual(2); expect(r.refused).toBe(0); expect(r.failed).toBe(0); expect(r.key_version).toBe(ver);
    for (const id of ids) expect((await asService(c, `select t3a_verify_commit_seal('${id}') r`)).r).toEqual({ valid: true, key_version: ver });
    const again = await signPending({ rpc, sign: signerFromSeed(seed.toString("base64")) });
    expect(again.signed).toBe(0);
  });

  it("a service holding a different key stores nothing: the database refuses each signature and the statement stays unsealed", async () => {
    const id = await composed(); await asService(c, `select t3a_seal_composed('${id}', false)`);
    const wrong = await signPending({ rpc, sign: signerFromSeed(randomBytes(32).toString("base64")) });
    expect(wrong.signed).toBe(0); expect(wrong.refused).toBeGreaterThanOrEqual(1);
    expect(await sealed(id)).toBe(0);
    expect((await asService(c, `select t3a_verify_commit_seal('${id}') r`)).r.reason).toBe("commit_seal_pending");
    const right = await signPending({ rpc, sign: signerFromSeed(seed.toString("base64")) });
    expect(right.signed).toBeGreaterThanOrEqual(1);
    expect(await sealed(id)).toBe(1);
  });

  it("when the current key is the shared key, the service has nothing to do", async () => {
    await setCurrent(v1);
    try { const r = await signPending({ rpc, sign: signerFromSeed(seed.toString("base64")) }); expect(r).toEqual({ signed: 0, refused: 0, failed: 0, key_version: null }); }
    finally { await setCurrent(ver); }
  });
});
