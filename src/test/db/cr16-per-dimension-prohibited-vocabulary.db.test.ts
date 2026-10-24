/** CORR-007 Rev 1.6 rule CR-16: the renderer reads each dimension's prohibited vocabulary from that dimension's package (CR-16-T1). Synthetic D9 list and people; throwaway database only. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let seq = 0;
const SRC = "SYNTHETIC TEST ONLY D9 list";
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
/** An issued report on a dimension with one committed, production entry whose composed body is `body`. */
async function entry(dimension: string, body: string) {
  const p = await mkParticipant(c, `cr16-p-${++seq}-${RUN}`);
  const lib = randomUUID(); const cs = randomUUID(); const rec = randomUUID(); const ber = randomUUID();
  await fx(`insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, status, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, represented_dimension_ids, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${ber}','${p}','${dimension}','issued', '1.0', '1.0', '1.0', 'M5', array['D1']::text[], '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
  await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${rec}','${p}','${dimension}','S2', true, now())`);
  await fx(`insert into t3a_d1_statement_library(statement_library_id, content_version_id, dimension_id, question_set_version, stage_code, statement_key, statement_body, use_disposition) values ('${lib}','${randomUUID()}','${dimension}','q1','S2','ST-${dimension}-${seq}-${RUN}','x','production')`);
  await fx(`insert into t3a_d1_composed_statement(composed_statement_id, observation_record_id, statement_library_id, resolution_rule_id, composed_body, answer_pattern_snapshot) values ('${cs}','${rec}','${lib}','${randomUUID()}', $b$${body}$b$, '{}'::jsonb)`);
  return ber as string;
}
const render = (ber: string, version?: string) => run(c, version ? `select t3a_rce_render_check('${ber}','issued',null,'CTR-1.0','${version}') r` : `select t3a_rce_render_check('${ber}','issued') r`).then((r) => r[0].r);
const load = (dim: string, version: string, words: unknown, ref = SRC) => asService(c, `select t3a_rce_prohibited_vocabulary_load('${dim}','${version}','${JSON.stringify(words)}'::jsonb,'${ref}') r`).then((x) => x.r);
const count = async (dim: string) => (await run(c, `select count(*)::int n from t3a_rce_prohibited_vocabulary where dimension_id='${dim}'`))[0].n;
const cleanup = () => run(c, `delete from t3a_rce_prohibited_vocabulary where reason like 'SYNTHETIC TEST ONLY%'`);

beforeAll(async () => { c = await connect(); await cleanup(); });
afterAll(async () => { await cleanup(); await c.end(); });

describe("CR-16 each dimension's own list", () => {
  it("a D2 entry carrying a word on the D2 list is refused under the default version, which is not D2's", async () => {
    const hit = await render(await entry("D2", "The person deflected the question at the second step."));
    expect(hit).toMatchObject({ ok: false, refusal_code: "prohibited_vocabulary_hit" }); expect(hit.hit_words).toContain("deflected");
    expect(await render(await entry("D2", "The person asked a question at the second step."))).toMatchObject({ ok: true });
  });
  it("D1, D3 and D4 each use their own list under the default version too", async () => {
    for (const d of ["D1", "D3", "D4"]) {
      const word = (await run(c, `select word from t3a_rce_prohibited_vocabulary where dimension_id='${d}' order by word limit 1`))[0].word;
      expect(await render(await entry(d, `The record says ${word} here.`)), d).toMatchObject({ ok: false, refusal_code: "prohibited_vocabulary_hit" });
    }
  });
  it("a version that is the dimension's own is used as given: a word only on the later closed list does not hit under the earlier version", async () => {
    const only42 = (await run(c, `select word from t3a_rce_prohibited_vocabulary where dimension_id='D2' and version='PV-D2-4.2' and word not in (select word from t3a_rce_prohibited_vocabulary where dimension_id='D2' and version='PV-D2-1.0') order by word limit 1`))[0].word;
    const scan = (v: string) => run(c, `select t3a_rce_prohibited_vocabulary_scan('the record says ${only42} here','D2','${v}') s`).then((r) => r[0].s);
    expect(await scan("PV-D2-1.0")).toEqual([]);
    expect(await scan("PV-D2-4.2")).toEqual([only42]);
    expect(await scan("PV-D1-1.0")).toEqual([only42]);                              // a version this dimension never had: all its lists
  });
});

describe("CR-16-T1 a D9 entry carrying a word on the D9 list is refused by the renderer", () => {
  it("the D9 list of Section 5.7a is loaded from the package: 88 words, and a D9 entry carrying one is refused; a clean entry renders", async () => {
    expect((await run(c, `select count(*)::int n from t3a_rce_prohibited_vocabulary where dimension_id='D9' and version='PV-D9-1.0'`))[0].n).toBe(88);   // the D9 build adds PV-D9-4.2, the closed retired list of Section 4.2 (39 words), beside it
    expect((await run(c, `select distinct version, reason from t3a_rce_prohibited_vocabulary where dimension_id='D9' and version='PV-D9-1.0' order by reason collate "C"`))).toEqual([{ version: "PV-D9-1.0", reason: "T3A-D9 Execution Edition v1.1 Section 5.7a prohibited vocabulary" }, { version: "PV-D9-1.0", reason: "cross_dimension_assertion" }]);   // the D9 build marks the eleven words other dimensions own (owned to persuaded, D9 Section 3.2) as cross_dimension_assertion; the words themselves are unchanged
    expect((await run(c, `select count(*)::int n from t3a_rce_prohibited_vocabulary where dimension_id='D9' and version='PV-D9-1.0' and reason='cross_dimension_assertion'`))[0].n).toBe(11);
    expect(await render(await entry("D9", "The person stated the step they kept."))).toMatchObject({ ok: true });
    for (const [text, word] of [["The person learned the step.", "learned"], ["The person tends to ask first.", "tends to"], ["She carried out the step and stated it.", "carried out"], ["He will ask again.", "will"], ["The note says OPEN-MINDED.", "open-minded"]] as const) {
      expect(await render(await entry("D9", text)), text).toMatchObject({ ok: false, refusal_code: "prohibited_vocabulary_hit", hit_words: [word] });
    }
    expect(await render(await entry("D9", "The person stated a willingness."))).toMatchObject({ ok: true });    // whole words only, at the end of a word
    expect(await render(await entry("D9", "The record names an unlearned step."))).toMatchObject({ ok: true });   // and at the start
  });
  it("D9 words are not D2 words: each dimension has its own list", async () => {
    expect(await render(await entry("D2", "The person stated the step they kept and took notes."))).toMatchObject({ ok: true });
    expect(await render(await entry("D9", "The person stated the step they kept and took notes."))).toMatchObject({ ok: false, hit_words: ["took"] });
  });
  it("a dimension with no list loaded refuses to render; once its list is loaded a clean entry renders and a listed word is refused", async () => {
    expect(await count("D14")).toBe(0);
    expect(await render(await entry("D14", "The person asked a question."))).toMatchObject({ ok: false, refusal_code: "prohibited_vocabulary_not_loaded" });
    expect(await load("D14", "PV-D14-1.0", ["Syntheticbanned", " other banned phrase "])).toEqual({ outcome: "loaded", dimension_id: "D14", version: "PV-D14-1.0", words: 2 });
    expect(await render(await entry("D14", "The person asked a question."))).toMatchObject({ ok: true });
    expect(await render(await entry("D14", "The record shows other banned phrase and more."))).toMatchObject({ ok: false, refusal_code: "prohibited_vocabulary_hit", hit_words: ["other banned phrase"] });
    expect(await render(await entry("D14", "The record shows SYNTHETICBANNED."))).toMatchObject({ ok: false, hit_words: ["syntheticbanned"] });
    expect(await render(await entry("D14", "The record shows syntheticbannedish."))).toMatchObject({ ok: true });
  });
});

describe("CR-16 loading a dimension's list", () => {
  it("a list that is invalid in any way loads nothing", async () => {
    const before = await count("D11");
    for (const [d, v, w, ref] of [["D11", "PV-D11-1.0", [], SRC], ["D11", "PV-D11-1.0", ["ok", " "], SRC], ["D11", "PV-D1-1.0", ["ok"], SRC], ["D11", "v1", ["ok"], SRC], ["Dx", "PV-Dx-1.0", ["ok"], SRC], ["D11", "PV-D11-1.0", ["ok"], ""], ["D11", "PV-D11-1.0", "ok", SRC]] as const) {
      expect((await load(d, v, w, ref)).reason, JSON.stringify([d, v, w, ref])).toBe("VOCABULARY_LIST_INVALID");
    }
    expect(await count("D11")).toBe(before);
  });
  it("a loaded list is never overwritten; a change is a new version", async () => {
    expect((await load("D12", "PV-D12-1.0", ["first"])).outcome).toBe("loaded");
    expect((await load("D12", "PV-D12-1.0", ["second"])).reason).toBe("VOCABULARY_LIST_ALREADY_LOADED");
    expect((await run(c, `select word from t3a_rce_prohibited_vocabulary where dimension_id='D12'`)).map((r) => r.word)).toEqual(["first"]);
    expect((await load("D12", "PV-D12-2.0", ["second"])).outcome).toBe("loaded");
  });
  it("only the service route loads a list", async () => {
    const u = await mkParticipant(c, `cr16-u-${RUN}`);
    expect((await asRole(c, "authenticated", u, `select t3a_rce_prohibited_vocabulary_load('D13','PV-D13-1.0','["x"]'::jsonb,'${SRC}')`)).msg).toMatch(/permission denied/i);
    expect(await count("D13")).toBe(0);
  });
});
