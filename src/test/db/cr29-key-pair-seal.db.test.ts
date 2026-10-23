/** CORR-007 Rev 1.6 rule CR-29 part b: the seal becomes a signature made with a key pair; the private key is never in the database, the database checks every signature, and activation is allowed once a key pair is current. Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateKeyPairSync, sign as nodeSign, randomBytes, type KeyObject } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string; let v1 = "k1"; let ver = ""; let pair: { publicKey: KeyObject; privateKey: KeyObject };
const raw = (k: KeyObject) => Buffer.from((k.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
const current = async () => (await run(c, `select key_version v from t3a_commit_seal_key_version where status='current'`))[0].v as string;
const setCurrent = async (v: string) => { await run(c, `update t3a_commit_seal_key_version set status='retired' where status='current'`); await run(c, `update t3a_commit_seal_key_version set status='current' where key_version='${v}'`); };

async function composed(): Promise<string> {
  const sv = (await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-1", reviewer })).version;
  const p = await mkParticipant(c, `kp-p-${RUN}-${Math.random().toString(36).slice(2, 8)}`);
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try {
    const o = (await c.query(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${p}','D2','S2','${reviewer}', true) returning observation_record_id i`)).rows[0].i;
    const r = (await c.query(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions)
      values ('D2','${o}','${p}','S2','${sv}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb) returning composed_statement_id i`)).rows[0].i as string;
    await c.query("commit"); return r;
  } catch (e) { await c.query("rollback"); throw e; }
}
const request = (id: string) => asService(c, `select t3a_seal_composed('${id}', false)`);
const verify = (id: string) => asService(c, `select t3a_verify_commit_seal('${id}') r`).then((x) => x.r);
const payloadOf = async (id: string) => (await asService(c, `select t3a_commit_payload('${id}') p`)).rows[0].p as string;
const sign = (payload: string, key: KeyObject = pair.privateKey) => nodeSign(null, Buffer.from(payload, "utf8"), key).toString("hex");
const store = (id: string, sig: string, version = ver) => asService(c, `select t3a_commit_seal_store('${id}', '${sig}', '${version}') r`).then((x) => x.r);

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `kp-rev-${RUN}`);
  v1 = await current(); pair = generateKeyPairSync("ed25519"); ver = `kp_${String(RUN).slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
});
afterAll(async () => { await setCurrent(v1); await c.end(); });

describe("CR-29 the key pair seal", () => {
  it("rotation to a key pair needs a real public key; nothing is read from the vault for it", async () => {
    const rot = (v: string, mode: string, pub: string | null) => asService(c, `select t3a_commit_seal_rotate('${v}','none','${mode}',${pub ? `'${pub}'` : "null"}) r`).then((x) => x.r);
    expect((await rot(`${ver}_a`, "key_pair", null)).reason).toBe("key_mode_invalid");
    expect((await rot(`${ver}_a`, "key_pair", "ab".repeat(31))).reason).toBe("key_mode_invalid");               // 31 bytes
    expect((await rot(`${ver}_a`, "key_pair", "ff".repeat(32))).reason).toBe("key_mode_invalid");               // not a point
    expect(await current()).toBe(v1);
    const ok = await rot(ver, "key_pair", raw(pair.publicKey));
    expect(ok).toMatchObject({ outcome: "rotated", mode: "key_pair" });
    expect(await current()).toBe(ver);
  });

  it("T1: nobody in the database can read a signing key or make a valid seal: the private key is not stored, a forged signature is refused, and only the service stores", async () => {
    const id = await composed(); await request(id);
    expect((await verify(id)).reason).toBe("commit_seal_pending");
    const forged = randomBytes(64).toString("hex");
    expect((await store(id, forged)).reason).toBe("signature_invalid");
    const strangerKey = generateKeyPairSync("ed25519").privateKey;
    expect((await store(id, sign(await payloadOf(id), strangerKey))).reason).toBe("signature_invalid");           // a valid signature, by another key
    expect((await store(id, sign("some other payload"))).reason).toBe("signature_invalid");                      // right key, wrong content
    expect((await run(c, `select count(*)::int n from t3a_commit_seal where composed_statement_id='${id}'`))[0].n).toBe(0);
    for (const fn of [`t3a_commit_seal_store('${id}','${forged}','${ver}')`, `t3a_commit_seal_pending()`]) {
      for (const role of ["authenticated", "anon"] as const) expect((await asRole(c, role, reviewer, `select ${fn}`)).msg, `${role} ${fn}`).toMatch(/permission denied/i);
    }
    // the only place a private key could be is a stored value: none of the key tables or settings holds one
    const cols = await run(c, `select column_name from information_schema.columns where table_name in ('t3a_commit_seal_key_version','t3a_commit_seal','t3a_commit_seal_request') and column_name ~ 'private|secret_key|signing'`);
    expect(cols).toEqual([]);
  });

  it("a signature made with the private key is stored, verifies, and is bound to the key version and the content", async () => {
    const id = await composed(); await request(id);
    const pend = (await asService(c, `select t3a_commit_seal_pending() r`)).r;
    expect(pend.outcome).toBe("pending"); expect(pend.key_version).toBe(ver);
    const item = pend.items.find((i: { composed_statement_id: string }) => i.composed_statement_id === id);
    expect(item.payload).toBe(await payloadOf(id));
    expect((await store(id, sign(item.payload), "k1")).reason).toBe("seal_key_version_not_current");
    expect(await store(id, sign(item.payload))).toEqual({ outcome: "sealed", key_version: ver });
    expect(await verify(id)).toEqual({ valid: true, key_version: ver });
    expect((await store(id, sign(item.payload))).reason).toBe("seal_already_stored");                            // once only
    const stillPending = (await asService(c, `select t3a_commit_seal_pending() r`)).r.items.map((i: { composed_statement_id: string }) => i.composed_statement_id);
    expect(stillPending).not.toContain(id);
    expect((await store(randomUuid(), sign("x"))).reason).toBe("seal_request_unknown");
  });


  it("a seal row in a key pair version that does not carry a valid signature fails verification, and the store function checks the caller itself, not only the grant", async () => {
    await setCurrent(ver);
    const id = await composed(); await request(id);
    await c.query("begin"); await c.query("set local session_replication_role = replica");
    const o = (await c.query(`select observation_ref o, participant_id p from t3a_dimension_composed_statement where composed_statement_id='${id}'`)).rows[0];
    await c.query(`insert into t3a_commit_seal(composed_statement_id, observation_ref, participant_id, dimension_id, is_superseding, payload_hash, seal, key_version) values ('${id}','${o.o}','${o.p}','D2',false,'${"0".repeat(64)}','${randomBytes(64).toString("hex")}','${ver}')`);
    await c.query("commit");
    expect((await verify(id)).reason).toBe("commit_seal_invalid");
    // the caller check inside the function holds even if the grant were widened by mistake
    const id2 = await composed(); await request(id2);
    await run(c, `grant execute on function t3a_commit_seal_store(uuid,text,text) to authenticated`);
    try {
      const r = await asRole(c, "authenticated", reviewer, `select t3a_commit_seal_store('${id2}','${sign(await payloadOf(id2))}','${ver}') r`);
      expect(r.r.reason).toBe("service_route_only");
      expect((await run(c, `select count(*)::int n from t3a_commit_seal where composed_statement_id='${id2}'`))[0].n).toBe(0);
    } finally { await run(c, `revoke execute on function t3a_commit_seal_store(uuid,text,text) from authenticated`); }
  });

  it("T2: a seal made before the rotation (k1) and one made after both verify, each under its own version", async () => {
    await setCurrent(v1);
    await run(c, `select set_config('t3a.commit_seal_key', 'k1-key-${RUN}', false)`);
    const before = await composed(); await request(before);
    expect(await verify(before)).toEqual({ valid: true, key_version: v1 });
    await setCurrent(ver);
    const after = await composed(); await request(after); await store(after, sign(await payloadOf(after)));
    expect(await verify(after)).toEqual({ valid: true, key_version: ver });
    expect(await verify(before)).toEqual({ valid: true, key_version: v1 });
    await run(c, `select set_config('t3a.commit_seal_key', '', false)`);
  });

  it("T3: activation is refused while the shared key is current and allowed when the key pair is current", async () => {
    const on = `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('lsa_activation','on','1.0','${reviewer}')`;
    await setCurrent(v1);
    await c.query("begin");
    try { await c.query(on); expect((await c.query(`select t3a_lsa_flag('lsa_activation') f`)).rows[0].f).toBe(false); } finally { await c.query("rollback"); }
    await setCurrent(ver);
    await c.query("begin");
    try { await c.query(on); expect((await c.query(`select t3a_lsa_flag('lsa_activation') f`)).rows[0].f).toBe(true); } finally { await c.query("rollback"); }
  });
});

function randomUuid() { return "00000000-0000-4000-8000-" + randomBytes(6).toString("hex"); }
