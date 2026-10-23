/** CORR-007 Rev 1.6 rule CR-29: the commit seal key carries a version on every seal; rotation keeps earlier seals valid; activation refuses while the shared Vault key is in use (CR-29-T1 to T3). Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string;
const setKey = (name: string, v: string) => run(c, `select set_config('t3a.${name}', '${v}', false)`);

/** A composed statement the seal can cover, written with triggers off (the seal does not depend on them). */
async function composed(): Promise<string> {
  const sv = (await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-1", reviewer })).version;
  const p = await mkParticipant(c, `cr29-p-${RUN}-${Math.random().toString(36).slice(2, 8)}`);
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try {
    const o = (await c.query(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${p}','D2','S2','${reviewer}', true) returning observation_record_id i`)).rows[0].i;
    const r = (await c.query(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions)
      values ('D2','${o}','${p}','S2', '${sv}', '{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb) returning composed_statement_id i`)).rows[0].i as string;
    await c.query("commit"); return r;
  } catch (e) { await c.query("rollback"); throw e; }
}
const seal = (id: string) => asService(c, `select t3a_seal_composed('${id}', false)`);
const verify = (id: string) => asService(c, `select t3a_verify_commit_seal('${id}') r`).then((x) => x.r);
const current = async () => (await run(c, `select key_version v from t3a_commit_seal_key_version where status='current'`))[0].v as string;

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `cr29-rev-${RUN}`); });
afterAll(async () => { await setKey("commit_seal_key", ""); await c.end(); });

describe("CR-29 the commit seal key", () => {
  it("T1: a participant, a mentor or any signed-in role cannot read the signing key or make a seal", async () => {
    await setKey("commit_seal_key", `k1-key-${RUN}`);
    const id = await composed();
    for (const fn of [`t3a_commit_seal_key()`, `t3a_commit_seal_key_for('k1')`, `t3a_seal_composed('${id}', false)`, `t3a_commit_seal_rotate('kx','t3a_commit_seal_key_kx')`]) {
      const a = await asRole(c, "authenticated", reviewer, `select ${fn}`);
      expect(a.msg, fn).toMatch(/permission denied|T3A_|not (allowed|found)/i);
      const n = await asRole(c, "anon", reviewer, `select ${fn}`);
      expect(n.msg, fn).toMatch(/permission denied|T3A_|not (allowed|found)/i);
    }
    expect((await run(c, `select count(*)::int n from t3a_commit_seal where composed_statement_id='${id}'`))[0].n).toBe(0);
    const tbl = await asRole(c, "authenticated", reviewer, `select * from t3a_commit_seal_key_version`);
    expect(tbl.msg).toMatch(/permission denied/i);
  });

  it("every seal records its key version", async () => {
    await setKey("commit_seal_key", `k1-key-${RUN}`);
    const id = await composed(); await seal(id);
    const row = (await run(c, `select key_version v from t3a_commit_seal where composed_statement_id='${id}'`))[0];
    expect(row.v).toBe(await current());
    expect((await verify(id)).valid).toBe(true);
  });

  it("T2: rotate the key; a seal made before and one made after both verify, each under its own key version", async () => {
    await setKey("commit_seal_key", `k1-key-${RUN}`);
    const before = await composed(); await seal(before);
    const v1 = await current();
    const v2 = `k_rot_${RUN.toString().slice(-6)}`;
    await setKey(`commit_seal_key_${v2}`, `rotated-key-${RUN}`);
    const rot = await asService(c, `select t3a_commit_seal_rotate('${v2}','t3a_commit_seal_key_${v2}') r`);
    expect(rot.r.outcome).toBe("rotated");
    expect(await current()).toBe(v2);
    const after = await composed(); await seal(after);
    const vb = await verify(before); const va = await verify(after);
    expect(vb).toEqual({ valid: true, key_version: v1 });
    expect(va).toEqual({ valid: true, key_version: v2 });
    // a version is never reused, and a rotation to a key that is not loaded is refused
    expect((await asService(c, `select t3a_commit_seal_rotate('${v2}','t3a_commit_seal_key_${v2}') r`)).r.reason).toBe("key_version_exists");
    expect((await asService(c, `select t3a_commit_seal_rotate('k_unloaded','t3a_commit_seal_key_k_unloaded') r`)).r.reason).toBe("new_key_unloaded");
    expect((await asService(c, `select t3a_commit_seal_rotate('bad-name','x') r`)).r.reason).toBe("key_mode_invalid");
    expect(await current()).toBe(v2);
    // the old key lost: the old seal fails closed, not open
    await setKey("commit_seal_key", "");
    expect((await verify(before)).valid).toBe(false);
    await setKey("commit_seal_key", `k1-key-${RUN}`);
    // restore the sandbox state for the other tests
    await run(c, `update t3a_commit_seal_key_version set status='retired' where status='current'`);
    await run(c, `update t3a_commit_seal_key_version set status='current' where key_version='${v1}'`);
  });

  it("T3: activation is refused while the shared Vault key is the current key, and allowed once a key pair version is current", async () => {
    const flag = async () => (await run(c, `select t3a_lsa_flag('lsa_activation') f`))[0].f as boolean;
    await c.query("begin");
    try {
      await c.query(`update t3a_commit_seal_key_version set status='retired' where status='current'`);
      await c.query(`insert into t3a_commit_seal_key_version(key_version,mode,secret_name,status) values ('shared-t3','vault_shared','t3a_commit_seal_key','current')`);
      await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('lsa_activation','on','1.0','${reviewer}')`);
      expect((await c.query(`select t3a_lsa_flag('lsa_activation') f`)).rows[0].f).toBe(false);
      const log = (await c.query(`select count(*)::int n from t3a_capture_refusal where reason_code='commit_seal_key_pair_not_in_place'`)).rows[0].n;
      expect(log).toBeGreaterThan(0);
      await c.query(`update t3a_commit_seal_key_version set status='retired' where status='current'`);
      await c.query(`insert into t3a_commit_seal_key_version(key_version,mode,secret_name,public_key,status) values ('pair-t3','key_pair','kp','pub','current')`);
      await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('lsa_activation','on','1.0','${reviewer}')`);
      expect((await c.query(`select t3a_lsa_flag('lsa_activation') f`)).rows[0].f).toBe(true);
    } finally { await c.query("rollback"); }
    expect(await flag()).toBe(false);
  });

  it("production default: the shared key is the only version and the activation flag reads off", async () => {
    expect((await run(c, `select count(*)::int n from t3a_commit_seal_key_version where mode='key_pair'`))[0].n).toBe(0);
    expect((await run(c, `select t3a_lsa_flag('lsa_activation') f`))[0].f).toBe(false);
  });
});
